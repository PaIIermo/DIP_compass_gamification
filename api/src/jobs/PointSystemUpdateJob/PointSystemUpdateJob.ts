import { db } from 'src/lib/db'
import {
  insertAuthors,
  insertTopics,
  buildUserMap,
  recalculateAllMetrics,
} from 'src/lib/dbOperations'
import { jobs, later } from 'src/lib/jobs'
/*import {acquireInitLock, releaseInitLock} from 'src/lib/dbUtils'*/
import { PublicationRow, UpdateJobInput, OCitRecord } from 'src/lib/types'
import {
  extractDoi,
  fetchCitationsListWithRetriesAndVerification,
  createRateLimiter,
} from 'src/lib/utils'

import { schedulePointSystemUpdate } from '../PointSystemInitializationJob/PointSystemInitializationJob'

export const PointSystemUpdateJob = jobs.createJob({
  queue: 'default',
  perform: async ({
    updateScheduleMode = 'immediate',
    delaySeconds = 300,
    snapshotFrequency = 'weekly',
  }: UpdateJobInput = {}) => {
    /*if (!(await acquireInitLock())) {
      jobs.logger.warn(
        '[Init] another initialisation already running – exiting.'
      )
      return
    }*/

    jobs.logger.info('[UpdateJob]: Started...')

    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 20

    try {
      const existingPublications = await db.publication.findMany({
        select: {
          id: true,
          doi: true,
          citation_count: true,
        },
      })

      const realPublications = existingPublications.filter(
        (pub) => pub.doi && !pub.doi.includes('10.9999/mock-')
      )
      const mockPublications = existingPublications.filter(
        (pub) => pub.doi && pub.doi.includes('10.9999/mock-')
      )

      // Log once for all mock publications
      if (mockPublications.length > 0) {
        jobs.logger.info(
          `Preventing data mixing between mocked and real data. Important problem with overridding`
        )
      }

      // ----------------------------------------------------------------
      // 0) Build a userMap if submission_author.userid is a "lisperator_id"
      //    (Same approach as in the initialization script)
      // ----------------------------------------------------------------
      const userMap = await buildUserMap()

      // ----------------------------------------------------------------
      // 1) Identify brand-new conference papers that are not in Publication
      //    We do the same checks as the init script: same joins, same filters,
      //    but only pick those missing from compass."Publication".
      // ----------------------------------------------------------------
      const newPublications = await db.$queryRaw<PublicationRow[]>`
        SELECT
          MIN(s.id) AS submission_id,
          MIN(c.doi) AS doi,
          MIN(c.title) AS title,
          MIN(s.conference) AS conference,
          ARRAY_AGG(DISTINCT sa.userid) FILTER (WHERE sa.userid IS NOT NULL) AS author_userids,
          AVG(rf."index") AS review_score,
          MIN(c.date_published) AS date_published
        FROM eudl.content c
        JOIN confy.submission s
          ON c.confy_id = s.id
        JOIN compass."Event" e
          ON s.conference = e.lisperator_id
        LEFT JOIN eudl.content_metadata cm
          ON c.id = cm.content
          AND cm.key = 'copyright_embargo_ends'
        LEFT JOIN confy.review r
          ON s.camera_ready_of = r.submission
          AND r.reviewer_state = 'reviewer-submitted'
        LEFT JOIN confy.review_field rf
          ON r.id = rf.review
          AND rf.meta_key = 'overall-recommendation'
        LEFT JOIN confy.submission_author sa
          ON sa.submission = s.camera_ready_of
        WHERE
          c.confy_id IS NOT NULL
          AND s.id IS NOT NULL
          AND s.camera_ready_of IS NOT NULL
          AND c.date_published IS NOT NULL
          AND s.conference IS NOT NULL
          AND (
            cm.value IS NULL
            OR TO_DATE(cm.value, 'YYYY-MM-DD') < CURRENT_DATE
          )
        GROUP BY s.camera_ready_of
        HAVING
          AVG(rf."index") IS NOT NULL
          AND ARRAY_LENGTH(ARRAY_AGG(DISTINCT sa.userid) FILTER (WHERE sa.userid IS NOT NULL), 1) > 0
          AND MIN(s.id) NOT IN (
            SELECT submission_id
            FROM compass."Publication"
          );
      `

      const publicationsAdded = newPublications.length
      jobs.logger.info(
        `[UpdateJob]: Found ${publicationsAdded} new publications to insert...`
      )

      // ----------------------------------------------------------------
      // 2) Insert brand-new publications + bridging + citations
      //    - Similar logic to the initialization script, but only for new ones.
      // ----------------------------------------------------------------
      const { limiter, trackResult, shouldAbort, abort } = createRateLimiter({
        minTime: 500,
        maxConcurrent: 5,
      })

      await Promise.all(
        newPublications.map((pub) =>
          limiter.schedule(async () => {
            if (shouldAbort()) {
              await abort()
              throw new Error('Too many failures – aborting batch')
            }

            // Fetch citations if DOI exists
            let citationRecords: OCitRecord[] = []
            let citationCount = 0

            if (!pub.doi || pub.doi.includes('10.9999/mock-')) {
              jobs.logger.info(
                `[UpdateJob]: Nothing to update / Skipping mock DOI ${pub.doi}`
              )
              return
            }

            try {
              const raw = await fetchCitationsListWithRetriesAndVerification(
                pub.doi
              )
              citationRecords = raw.filter((r) => r.author_sc !== 'yes')
              citationCount = citationRecords.length
              trackResult(true) // Track success
            } catch (e) {
              trackResult(false) // Track failure
              jobs.logger.error(
                `[UpdateJob]: DOI ${pub.doi} – citation fetch FAILED (${e}). Using 0 citations.`
              )
            }

            //---------------------------------------------------------------
            // 1) Atomic DB work
            //---------------------------------------------------------------
            await db.$transaction(async (tx) => {
              // 1a) Upsert the Publication row
              const [row] = await tx.$queryRaw<{ id: number }[]>`
                INSERT INTO compass."Publication" (
                  submission_id, doi, title, conference,
                  review_score, overall_score,
                  citation_count, date_published
                )
                VALUES (
                  ${pub.submission_id}, ${pub.doi}, ${pub.title}, ${pub.conference},
                  ${pub.review_score}, 0,
                  ${citationCount}, ${pub.date_published}
                )
                ON CONFLICT (submission_id) DO NOTHING
                RETURNING id
              `

              if (!row?.id) {
                jobs.logger.info(
                  `[UpdateJob]: SKIPPED – submission_id=${pub.submission_id} already stored.`
                )
                return
              }
              const pubId = row.id

              // 1b) Author and topics bridging rows (delegate to helper)
              await insertAuthors(tx, pubId, pub.author_userids ?? [], userMap)

              await insertTopics(tx, pubId, pub.conference)

              // 1c) Citation rows

              if (citationRecords.length) {
                // • Build plain JS objects once
                const rows = citationRecords.map((rec) => ({
                  publication_id: pubId,
                  oci: rec.oci,
                  citing: extractDoi(rec.citing),
                  creation_date: rec.creation ? new Date(rec.creation) : null,
                  author_sc: rec.author_sc === 'yes',
                }))

                // • Chunk to stay under Postgres’ 65 535-param limit.
                const CHUNK_SIZE = 1000

                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                  await tx.citation.createMany({
                    data: rows.slice(i, i + CHUNK_SIZE),
                    skipDuplicates: true, // translates to ON CONFLICT DO NOTHING
                  })
                }
              }

              // 1d) Success log
              jobs.logger.info(
                pub.doi
                  ? `[UpdateJob]: INSERTED new pub – DOI=${pub.doi}, id=${pubId}, citations=${citationCount}`
                  : `[UpdateJob]: INSERTED new pub WITHOUT DOI – id=${pubId}`
              )
            }) // end transaction
          })
        )
      )

      // ----------------------------------------------------------------
      // 3) Update citations for *existing* publications
      //    - We re-fetch from OpenCitations & insert any newly discovered references.
      //    - Also update publication.citation_count if there's a change.
      // ----------------------------------------------------------------

      // Only process real publications with the rate limiter
      await Promise.all(
        realPublications.map((pub) =>
          limiter.schedule(async () => {
            if (!pub.doi || pub.doi.includes('10.9999/mock-')) {
              jobs.logger.info(
                `[UpdateJob]: Nothing to update / Skipping mock DOI ${pub.doi}`
              )
              return
            }

            if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
              await limiter.stop({ dropWaitingJobs: true })
              throw new Error('Too many failures – aborting batch')
            }

            //----------------------------------------------------------------
            // 0) Fetch citations first (network I/O outside the TX)
            //----------------------------------------------------------------
            let citationRecords: OCitRecord[] = []

            try {
              // Use new function with verification
              citationRecords =
                await fetchCitationsListWithRetriesAndVerification(pub.doi)
              consecutiveFailures = 0
            } catch (e) {
              consecutiveFailures++
              jobs.logger.error(
                `[UpdateJob]: DOI ${pub.doi} – citation fetch FAILED (${e}).`
              )
              if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) throw e
              return
            }

            // Still need to filter self-citations
            const validCitations = citationRecords.filter(
              (r) => r.author_sc !== 'yes'
            )

            //----------------------------------------------------------------
            // 1) Atomic write block
            //----------------------------------------------------------------
            await db.$transaction(async (tx) => {
              // 1a) Insert new citation rows (dedup via ON CONFLICT)
              for (const rec of validCitations) {
                await tx.$executeRaw`
                  INSERT INTO compass."Citation" (
                    publication_id, oci, citing, creation_date, author_sc
                  )
                  VALUES (
                    ${pub.id}, ${rec.oci}, ${extractDoi(rec.citing)},
                    ${rec.creation ? new Date(rec.creation) : null},
                    ${rec.author_sc === 'yes'}
                  )
                  ON CONFLICT (oci) DO NOTHING
                `
              }

              // 1b) Re‑compute citation_count from DB to avoid race conditions
              const [{ new_count: newCount }] = await tx.$queryRaw<
                { new_count: number }[]
              >`
                SELECT COUNT(*)::int AS new_count
                FROM compass."Citation"
                WHERE publication_id = ${pub.id}
              `

              if (newCount === pub.citation_count) {
                return
              }

              // 1c) Update Publication row
              await tx.publication.update({
                where: { id: pub.id },
                data: {
                  citation_count: newCount,
                  last_edited_at: new Date(),
                },
              })

              jobs.logger.info(
                `[UpdateJob]: Updated pub id=${pub.id}, ` +
                  `old_cit=${pub.citation_count}, new_cit=${newCount}`
              )
            })
          })
        )
      )

      // ----------------------------------------------------------------
      // 4) Recalculate h-index, conference_value, overall_score
      //    for *all* publications (including newly inserted).
      // ----------------------------------------------------------------

      await recalculateAllMetrics(jobs.logger, {
        includeCurrentSnapshot: updateScheduleMode === 'immediate',
        isInitialization: false,
        snapshotFrequency,
      })

      // Pass snapshot frequency when scheduling next update
      await schedulePointSystemUpdate({
        updateScheduleMode,
        delaySeconds,
        snapshotFrequency,
      })

      jobs.logger.info('[UpdateJob]: Finished successfully.')
    } catch (error) {
      jobs.logger.error(`[UpdateJob]: Stopped early. Reason: ${error.message}`)
      // Retry in 1 hour if something went wrong
      await later(
        {
          ...PointSystemUpdateJob,
          name: 'PointSystemUpdateJob',
          path: 'PointSystemUpdateJob/PointSystemUpdateJob',
        },
        [
          {
            updateScheduleMode,
            delaySeconds,
          },
        ],
        {
          wait: 3600,
        }
      )
      return
    } /*finally {
      await releaseInitLock()
    }*/
  },
})
