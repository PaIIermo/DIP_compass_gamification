/* eslint-disable prettier/prettier */
// ----------------------------------------------------------------
// 0) Dependencies & Types
// ----------------------------------------------------------------
import { getNextMondayAtMidnightUTC } from 'src/lib/dateUtils'
import { db } from 'src/lib/db'
import { insertAuthors, insertTopics, buildUserMap, truncatePublications, recalculateAllMetrics} from 'src/lib/dbOperations'
import { jobs, later } from 'src/lib/jobs'
import { runMockDataGeneration } from 'src/lib/mockDataGenerator'
import { InitJobInput, UpdateJobInput, PublicationRow, OCitRecord } from 'src/lib/types'
import { extractDoi, fetchCitationsListWithRetriesAndVerification } from 'src/lib/utils'
import { processInChunks, createRateLimiter } from 'src/lib/utils'
// Import validation utilities (to be created)
import { setupValidationEnvironment } from 'src/lib/validation/setupValidationData'
import { validateFirstStretch } from 'src/lib/validation/validateFirstStretch'
import { validateSnapshots } from 'src/lib/validation/validateSnapshots'

// We'll create these files shortly
import { PointSystemUpdateJob } from '../PointSystemUpdateJob/PointSystemUpdateJob'

export async function schedulePointSystemUpdate({
  updateScheduleMode = 'immediate',
  delaySeconds = 300,
  snapshotFrequency = 'weekly'
}: UpdateJobInput) {
  if (updateScheduleMode === 'period') {
    // For 'period' mode, we'll schedule based on snapshot frequency
    let nextRunDate = new Date();

    // Calculate the appropriate next run date based on frequency
    switch (snapshotFrequency) {
      case 'monthly': {
        // First day of next month
        nextRunDate = new Date(nextRunDate.getFullYear(), nextRunDate.getMonth() + 1, 1);
        break;
      }
      case 'quarterly': {
        // First day of next quarter
        const currentQuarter = Math.floor(nextRunDate.getMonth() / 3);
        nextRunDate = new Date(nextRunDate.getFullYear(), (currentQuarter + 1) * 3, 1);
        break;
      }
      case 'weekly':
      default: {
        // Next Monday
        nextRunDate = getNextMondayAtMidnightUTC();
        break;
      }
    }

    jobs.logger.info(`[LogJob]: Scheduling update job for ${nextRunDate.toISOString()} based on ${snapshotFrequency} frequency`)

    await later(
      {
        ...PointSystemUpdateJob,
        name: 'PointSystemUpdateJob',
        path: 'PointSystemUpdateJob/PointSystemUpdateJob',
      },
      [{
        updateScheduleMode,
        delaySeconds,
        snapshotFrequency,
      }],
      {
        waitUntil: nextRunDate,
      }
    )
  } else {
    // For 'immediate' mode, run after the specified delay
    jobs.logger.info(`[LogJob]: Scheduling update job after ${delaySeconds}s`)

    await later(
      {
        ...PointSystemUpdateJob,
        name: 'PointSystemUpdateJob',
        path: 'PointSystemUpdateJob/PointSystemUpdateJob',
      },
      [{
        updateScheduleMode,
        delaySeconds,
        snapshotFrequency,
      }],
      {
        wait: delaySeconds,
      }
    )
  }
}

/**
 * ----------------------------------------------------------------
 * PointSystemInitializationJob
 * ----------------------------------------------------------------
 * This is the main "one-off" job that initializes our publication database.
 * The idea is:
 *
 * 1. Clear out existing records in `Publication` (and dependent tables).
 * 2. Read data from the eudl+confy schemas to gather:
 *    - Submissions
 *    - DOIs
 *    - Conferences
 *    - Review scores
 *    - Authors
 * 3. Insert new rows into `compass."Publication"` with initial scores.
 * 4. Fetch citations from the OpenCitations API for each publication that has a DOI.
 * 5. Insert bridging rows in `compass."PublicationUser"`, linking each publication to its authors.
 * 6. Compute user h-indexes based on citation counts (classic approach).
 * 7. Compute each conference's "conference_value" based on the average of its authors' h-indexes.
 * 8. Compute `overall_score`, blending base score with decayed citations, and store it in `Publication`.
 * 9. Finally, schedule a follow-up job that updates points incrementally (`PointSystemUpdateJob`).
 */
export const PointSystemInitializationJob = jobs.createJob({
  queue: 'default',
  perform: async ({
    updateScheduleMode = 'immediate',
    delaySeconds = 300,
    useMock = false,
    mockCount = 2000,
    snapshotFrequency = 'weekly',
    validationMode = false // New parameter
  }: InitJobInput = {}) => {
    /*if (!(await acquireInitLock())) {
      jobs.logger.warn('[Init] another initialisation already running – exiting.')
      return
    }*/

    // ----------------------------------------------------------------
    // Step 0) Optionally clear out `Publication` (and dependent tables) for a clean slate.
    // ----------------------------------------------------------------
    await truncatePublications()

    // Add validation data tracking
    let validationData = null;

    jobs.logger.info(`[LogJob]: Task started at ${new Date().toISOString()}`)

    if (validationMode) {
      jobs.logger.info("[Validation] Running in validation mode with controlled test data")
      try {
        // Set up validation data and execute the first stretch validation
        validationData = await setupValidationEnvironment();

        // Process validation
        jobs.logger.info("[Validation] Starting validation process")

        // Update citation counts FIRST
        jobs.logger.info("[Validation] Updating citation counts...")
        await db.$executeRaw`
          UPDATE compass."Publication" p
          SET citation_count = (
            SELECT COUNT(*)
            FROM compass."Citation" c
            WHERE c.publication_id = p.id
            AND c.author_sc = false
          )
        `

        // Execute the pipeline calculations with snapshot creation ENABLED
        jobs.logger.info("[Validation] Step 1: Calculating values and generating snapshots")
        await recalculateAllMetrics(jobs.logger, {
          includeCurrentSnapshot: true, // Set to true to generate snapshots
          isInitialization: true,
          snapshotFrequency,
          validationOnly: true,
          validationData
        })

        // Validate first stretch results
        jobs.logger.info("[Validation] Validating first stretch calculations")
        const firstStretchValid = await validateFirstStretch(validationData);

        // Now validate snapshot creation
        jobs.logger.info("[Validation] Validating snapshot creation")
        const snapshotsValid = await validateSnapshots(validationData);

        const overallValid = firstStretchValid && snapshotsValid;

        if (overallValid) {
          jobs.logger.info("[Validation] All validations PASSED ✓")
        } else {
          jobs.logger.error("[Validation] Validation FAILED ✗")
          if (!firstStretchValid) jobs.logger.error("[Validation] - First stretch validation failed")
          if (!snapshotsValid) jobs.logger.error("[Validation] - Snapshot validation failed")
        }

        jobs.logger.info("[Validation] Validation process completed")

        // Skip the normal update scheduling in validation mode
        return;
      } catch (error) {
        jobs.logger.error(`[Validation] Validation failed with error: ${error.message}`)
        jobs.logger.error(error.stack)
        return;
      }
    }

    jobs.logger.info(`[LogJob]: Task started at ${new Date().toISOString()}`)

    if (validationMode) {
      return;
    }

    try {
      // ----------------------------------------------------------------
      // 1) Check existence/emptiness of Publication
      // ----------------------------------------------------------------
      const tableExists = await db.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'compass' AND table_name = 'Publication'
        ) AS "exists"
      `

       // ----------------------------------------------------------------
      // 2) Check if the Publication table exists and whether it's empty.
      // ----------------------------------------------------------------
      if (!tableExists[0]?.exists) {
        jobs.logger.error(
          `[LogJob]: The Publication table does NOT exist! Terminating...`
        )
        return
      }

      const rowCountResult = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM compass."Publication"
      `
      const publicationCount = rowCountResult[0]?.count ?? 0n

      // If table is not empty, skip re-initialization logic:
      if (publicationCount !== 0n) {
        jobs.logger.info(
          '[LogJob]: Publication table is filled. Skipping the initialization logic...'
        )

        // Schedule the update job instead.
        await schedulePointSystemUpdate({ updateScheduleMode, delaySeconds })
        return
      }
      jobs.logger.info(
        '[LogJob]: Publication table exists but is empty. Proceeding with initialization...'
      )

      // ----------------------------------------------------------------
      // Step 3) Map "lisperator_id" -> real user.id from compass."User"
      // ----------------------------------------------------------------
      /**
       * Because the external confy or EUDL schemas might track authors with a "lisperator_id",
       * we need to map them to the actual internal user.id in `compass."User"`.
       */
      jobs.logger.info('[LogJob]: Building user map (lisperator_id -> user.id)')
      const userMap = await buildUserMap();

      // ----------------------------------------------------------------
      // Step 4) Fetch data from eudl.content & confy.
      // ----------------------------------------------------------------
      /**
       * We gather the essential publication data. The joined result is filtered
       * for items:
       *  - that belong to a real conference
       *  - are not under embargo
       *  - have a valid (non-null) average review score
       *  - have at least one author
       *  - have a known publication date
       */
      // ----------------------------------------------------------------
      jobs.logger.info('[LogJob]: Fetching valid publication entries...')

      await db.$executeRaw`
        WITH ranked_topics AS (
          SELECT
            ROW_NUMBER() OVER (ORDER BY id) AS id,
            label
          FROM borg.topic
          WHERE version = 2 AND new_topic_id IS NULL
        )
        INSERT INTO compass."Topic"(id, name)
        SELECT id, label FROM ranked_topics
        UNION ALL
        SELECT 9, 'Other';
      `
      const topics = await db.$queryRaw<{ id: number, name: string }[]>`
        SELECT id, name FROM compass."Topic" ORDER BY id
      `

      jobs.logger.info('[Init]: Inserted canonical topics:')
      topics.forEach(t => {
        jobs.logger.info(`  - [${t.id}] ${t.name}`)
      })

      // ----------------------------------------------------------------
      // Step 5) Data generation - either mock or real data
      // ----------------------------------------------------------------
      let usedMockData = false;

      if (useMock) {
        jobs.logger.info(`[LogJob]: Mock data generation enabled. Generating ${mockCount} publications...`);

        try {
          await runMockDataGeneration(mockCount);
          jobs.logger.info(`[LogJob]: Mock data generation completed successfully.`);
          usedMockData = true;
        } catch (error) {
          jobs.logger.error(`[LogJob]: Mock data generation failed: ${error.message}`);
          jobs.logger.info(`[LogJob]: Continuing with normal initialization process.`);
        }
      }

      // Only proceed with real data initialization if mock data wasn't used or failed
      if (!usedMockData) {
        const result = await db.$queryRaw<PublicationRow[]>`
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
          WHERE c.confy_id IS NOT NULL
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
            AVG(rf."index") IS NOT NULL AND
            ARRAY_LENGTH(ARRAY_AGG(DISTINCT sa.userid) FILTER (WHERE sa.userid IS NOT NULL), 1) > 0
        `

        if (result.length === 0) {
          jobs.logger.info('[LogJob]: No entries found.')
        } else {
          jobs.logger.info(`[LogJob]: Number of entries: ${result.length}`)
        }

        // ----------------------------------------------------------------
        // Step 6) Insert Publications & bridging rows + fetch citations
        // ----------------------------------------------------------------
        /**
         * We now iterate over the raw rows we fetched. For each row:
         *  1) Create a new record in `compass."Publication"`.
         *  2) If the row has a DOI, fetch its citation data from OpenCitations.
         *  3) Insert bridging rows into `compass."PublicationUser"` linking users to the publication.
         *
         * Bottleneck is used to control concurrency (maxConcurrent = 5) and
         * ensure we don't overload the external API with too many parallel requests.
         */
        const {
          limiter,
          trackResult,
          shouldAbort,
          abort
        } = createRateLimiter({
          minTime: 500,
          maxConcurrent: 5
        });

        await Promise.all(
          result.map((entry) =>
            limiter.schedule(async () => {
              if (shouldAbort()) {
                await abort();
                throw new Error('Too many failures – aborting batch');
              }

              // Existing code to fetch citations
              let citationRecords: OCitRecord[] = [];
              let citationCount = 0;

              if (entry.doi) {
                try {
                  const raw = await fetchCitationsListWithRetriesAndVerification(entry.doi);
                  citationRecords = raw.filter((r) => r.author_sc !== 'yes');
                  citationCount = citationRecords.length;
                  trackResult(true); // Track success
                } catch (e) {
                  trackResult(false); // Track failure
                  jobs.logger.error(
                    `[Init]: DOI ${entry.doi} – citation fetch FAILED (${e}). Falling back to 0 citations.`
                  );
                }
              }

              // ------------------------------------------------------------
              // Single‑shot DB transaction for this entry
              // ------------------------------------------------------------
              await db.$transaction(async (tx) => {
                const [pub] = await tx.$queryRaw<{ id: number }[]>`
                  INSERT INTO compass."Publication" (
                    submission_id, doi, title, conference,
                    review_score, overall_score,
                    citation_count, date_published
                  )
                  VALUES (
                    ${entry.submission_id}, ${entry.doi}, ${entry.title}, ${entry.conference},
                    ${entry.review_score}, 0,
                    ${citationCount}, ${entry.date_published}
                  )
                  ON CONFLICT (submission_id) DO NOTHING
                  RETURNING id
                `

                // ----------------------------------------------------------
                // 1) Row already existed → nothing else to do
                // ----------------------------------------------------------
                if (!pub?.id) {
                  jobs.logger.info(
                    `[Init]: SKIPPED – submission_id=${entry.submission_id} already present.`
                  )
                  return
                }
                const pubId = pub.id

                // ----------------------------------------------------------
                // 2) Bridging author and topic rows
                // ----------------------------------------------------------
                await insertAuthors(tx, pubId, entry.author_userids ?? [], userMap)

                await insertTopics(tx, pubId, entry.conference)

                // ----------------------------------------------------------
                // 3) Citation rows (may be zero)
                // ----------------------------------------------------------
                if (citationRecords.length) {
                  // • Build plain JS objects once
                  const rows = citationRecords.map((rec) => ({
                    publication_id: pubId,
                    oci           : rec.oci,
                    citing        : extractDoi(rec.citing),
                    creation_date : rec.creation ? new Date(rec.creation) : null,
                    author_sc     : rec.author_sc === 'yes',
                  }))

                  // • Use processInChunks utility
                  const CHUNK_SIZE = 1000
                  await processInChunks(rows, CHUNK_SIZE, async (rowChunk) => {
                    return await tx.citation.createMany({
                      data: rowChunk,
                      skipDuplicates: true, // translates to ON CONFLICT DO NOTHING
                    })
                  })
                }

                // ----------------------------------------------------------
                // 4) Success‑log tailored to DOI / no‑DOI case
                // ----------------------------------------------------------
                if (entry.doi) {
                  jobs.logger.info(
                    `[Init]: INSERTED – DOI=${entry.doi}, newPubId=${pubId}, citations=${citationCount}`
                  )
                } else {
                  jobs.logger.info(
                    `[Init]: INSERTED publication WITHOUT DOI – newPubId=${pubId}`
                  )
                }
              }) // <- commit
            })
          )
        )
      }

      // ----------------------------------------------------------------
      // Step 7) Calculate all metrics - MOVED HERE to ensure it only runs once
      // ----------------------------------------------------------------
      jobs.logger.info('[LogJob]: Calculating all metrics...');

      await recalculateAllMetrics(jobs.logger, {
        includeCurrentSnapshot: false,
        isInitialization: true,
        snapshotFrequency
      });

      // ----------------------------------------------------------------
      // Step 8) Schedule the follow-up PointSystemUpdateJob.
      // ----------------------------------------------------------------
      /**
       * The update job is responsible for ongoing recalculations (e.g. daily or weekly),
       * so after our initialization, we queue it to run automatically.
       */
      await schedulePointSystemUpdate({
        updateScheduleMode,
        delaySeconds,
        snapshotFrequency
      })

    } catch (error) {
      jobs.logger.error(`[LogJob]: Job failed. Reason: ${error.message}`)

      // await truncatePublications()

      // Retry logic
      await later({
        ...PointSystemInitializationJob,
        name: 'PointSystemInitializationJob',
        path: 'PointSystemInitializationJob/PointSystemInitializationJob',
      }, [{
        updateScheduleMode,
        delaySeconds,
        snapshotFrequency,
      }], {
        wait: 300 * 100,
      })
    } /*finally {
      await releaseInitLock()
    }*/
  },
})