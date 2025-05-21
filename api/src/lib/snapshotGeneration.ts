/**
 * ----------------------------------------------------------------
 * Historically Accurate Snapshot System
 * ----------------------------------------------------------------
 * This module provides a comprehensive approach to generating snapshots
 * that accurately represent historical values at each point in time.
 *
 * Rather than using current values for metrics like h-index, conference_value,
 * and base_score when generating historical snapshots, this system reconstructs
 * those values as they would have been at each historical date.
 *
 * Key components:
 * 1. Historical h-index calculation using only citations that existed at a given date
 * 2. Historical conference value calculation using those point-in-time h-indexes
 * 3. Historical base scores calculated from historical conference values
 * 4. Snapshots generated using these accurate historical values
 */

import { Prisma } from '@prisma/client'

import { jobs } from 'src/lib/jobs'

import {
  getDateSequence,
  normalizeToMidnightUTC,
  getConsistentDateForDB,
} from './dateUtils'
import { db } from './db'
import { checkDatabaseHealth } from './dbUtils'

/**
 * Smart unified snapshot generator that handles both initialization and updates
 * with true historical accuracy
 * @param currentDate The current date to use for the final snapshot
 * @param includeCurrentSnapshot Whether to generate a snapshot for the current date (default: false)
 */
/**
 * Smart unified snapshot generator with improved historical accuracy
 */
export async function smartSnapshotGenerator(
  currentDate: Date,
  includeCurrentSnapshot: boolean = false,
  snapshotFrequency: 'weekly' | 'monthly' | 'quarterly' = 'weekly'
): Promise<void> {
  try {
    // Normalize currentDate to midnight UTC on the first day of the month
    const normalizedDate = normalizeToMidnightUTC(currentDate)

    jobs.logger.info(
      `[LogJob]: Starting smart snapshot generation process using ${snapshotFrequency} frequency...`
    )

    // Use normalized date throughout
    const publicationsNeedingHistory =
      await getPublicationsNeedingHistory(normalizedDate)

    jobs.logger.info(
      `[LogJob]: Found ${publicationsNeedingHistory.length} publications needing historical snapshots`
    )

    // Process historical snapshots if needed
    if (publicationsNeedingHistory.length > 0) {
      jobs.logger.info(
        `[LogJob]: Generating historically accurate ${snapshotFrequency} snapshots...`
      )
      await processHistoricalSnapshots(
        publicationsNeedingHistory,
        normalizedDate,
        snapshotFrequency
      )
    }

    if (includeCurrentSnapshot) {
      await createSnapshots(normalizedDate)
    } else {
      jobs.logger.info(
        '[LogJob]: Skipping current snapshot generation as requested'
      )
    }

    jobs.logger.info('[LogJob]: Smart snapshot generation process completed')
  } catch (error) {
    jobs.logger.error(
      `[LogJob]: Error in smart snapshot generation: ${error.message}`
    )
    throw error
  }
}

/**
 * Get publications needing historical snapshots
 */
async function getPublicationsNeedingHistory(
  currentDate: Date
): Promise<{ id: number; date_published: Date }[]> {
  const allPublications = await db.$queryRaw<
    Array<{
      id: number
      date_published: Date
      has_snapshots: boolean
    }>
  >`
    SELECT
      p.id,
      p.date_published,
      EXISTS (
        SELECT 1 FROM compass."PublicationSnapshot" ps
        WHERE ps.publication_id = p.id
        LIMIT 1
      ) as has_snapshots
    FROM compass."Publication" p
    WHERE p.date_published IS NOT NULL
    ORDER BY p.date_published ASC
  `

  // Filter publications that need historical snapshots
  return allPublications
    .filter((pub) => !pub.has_snapshots && pub.date_published < currentDate)
    .map(({ id, date_published }) => ({ id, date_published }))
}

/**
 * Process historical snapshots for publications with true historical accuracy
 */
async function processHistoricalSnapshots(
  publications: { id: number; date_published: Date }[],
  endDate: Date,
  snapshotFrequency: 'weekly' | 'monthly' | 'quarterly' = 'weekly'
): Promise<void> {
  try {
    // Find the earliest publication date
    let earliestDate = endDate
    for (const pub of publications) {
      if (pub.date_published < earliestDate) {
        earliestDate = pub.date_published
      }
    }

    // Generate sequence of dates based on the selected frequency
    const snapshotDates = getDateSequence(
      snapshotFrequency,
      earliestDate,
      endDate
    )

    jobs.logger.info(
      `[LogJob]: Generated ${snapshotDates.length} ${snapshotFrequency} dates for historical processing`
    )

    // Get existing snapshots for all publications
    const existingSnapshots = await db.$queryRaw<
      Array<{
        publication_id: number
        snapshot_date: Date
      }>
    >`
      SELECT publication_id, snapshot_date
      FROM compass."PublicationSnapshot"
      WHERE publication_id IN (${Prisma.join(publications.map((p) => p.id))})
    `

    // Build a map of publication IDs to their existing snapshot dates
    const pubToSnapshotDates = new Map<number, Set<string>>()
    for (const snapshot of existingSnapshots) {
      if (!pubToSnapshotDates.has(snapshot.publication_id)) {
        pubToSnapshotDates.set(snapshot.publication_id, new Set())
      }
      pubToSnapshotDates.get(snapshot.publication_id)?.add(
        snapshot.snapshot_date.toISOString().split('T')[0] // Get date part only
      )
    }

    // Process each date chronologically
    for (const [index, historicalDate] of snapshotDates.entries()) {
      const dateString = historicalDate.toISOString().split('T')[0]

      // Filter publications that need a snapshot for this date
      // This is only used to determine if we need to process this date
      const pubsNeedingThisDate = publications.filter((pub) => {
        // Only include publications that were published before this snapshot date
        if (pub.date_published > historicalDate) {
          return false
        }

        // Check if the publication already has a snapshot for this date
        const existingDates = pubToSnapshotDates.get(pub.id)
        return !existingDates || !existingDates.has(dateString)
      })

      if (pubsNeedingThisDate.length === 0) {
        jobs.logger.info(
          `[LogJob]: No publications need snapshots for ${dateString}, skipping`
        )
        continue
      }

      try {
        if (await checkDatabaseHealth()) {
          // *** HISTORICAL ACCURACY ENHANCEMENT ***
          // First, calculate historical h-indexes as they would have been at this date
          await calculateHistoricalHIndexes(historicalDate)

          // Next, calculate historical conference values based on those h-indexes
          await calculateHistoricalConferenceValues(historicalDate)

          // Then, calculate historical base scores using historical conference values
          await calculateHistoricalBaseScores(historicalDate)

          // Finally, create snapshots using these historical metrics
          // NOTE: We're passing the publications that need snapshots, but our updated
          // functions will process ALL topics and users that existed at this time
          await createHistoricalSnapshots(historicalDate, pubsNeedingThisDate)

          // Update our tracking of which publications have snapshots
          for (const pub of pubsNeedingThisDate) {
            if (!pubToSnapshotDates.has(pub.id)) {
              pubToSnapshotDates.set(pub.id, new Set())
            }
            pubToSnapshotDates.get(pub.id)?.add(dateString)
          }
        } else {
          jobs.logger.warn(
            `[LogJob]: Skipping date ${dateString} due to database health issues`
          )
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      } catch (error) {
        jobs.logger.error(
          `[LogJob]: Failed processing date ${dateString}: ${error.message}`
        )
        continue
      }
    }
  } catch (error) {
    jobs.logger.error(
      `[LogJob]: Error processing historical snapshots: ${error.message}`
    )
    throw error
  }
}

/**
 * Calculate historical h-indexes as they would have been at a specific point in time
 * This creates a temporary table 'historical_h_index' with user_id and h_index columns
 */
async function calculateHistoricalHIndexes(
  historicalDate: Date
): Promise<void> {
  // Normalize the date for the query
  const normalizedDate = Prisma.sql`DATE_TRUNC('day', ${historicalDate})::timestamptz`

  await db.$executeRaw`DROP TABLE IF EXISTS historical_h_index;`

  await db.$executeRaw`
    CREATE TEMP TABLE historical_h_index AS
    WITH HistoricalCitationCounts AS (
      SELECT
        p.id AS publication_id,
        COUNT(c.id) AS citation_count
      FROM compass."Publication" p
      LEFT JOIN compass."Citation" c ON p.id = c.publication_id
      WHERE
        c.creation_date <= ${normalizedDate}
        AND c.author_sc = false
      GROUP BY p.id
    ),
    RankedPublications AS (
      SELECT
        pu.user_id AS userid,
        COALESCE(hcc.citation_count, 0) AS citation_count,
        ROW_NUMBER() OVER (
          PARTITION BY pu.user_id
          ORDER BY COALESCE(hcc.citation_count, 0) DESC
        ) AS rank
      FROM compass."Publication" p
      JOIN compass."PublicationUser" pu ON p.id = pu.publication_id
      LEFT JOIN HistoricalCitationCounts hcc ON p.id = hcc.publication_id
      WHERE p.date_published <= ${historicalDate} -- Only include publications that existed at this date
    ),
    HIndexPerUser AS (
      SELECT
        userid,
        MAX(rank) AS h_index
      FROM RankedPublications
      WHERE citation_count >= rank
      GROUP BY userid
    )
    SELECT
      userid AS user_id,
      LEAST(COALESCE(h_index, 0), 100) AS h_index -- Apply the cap of 100
    FROM HIndexPerUser
  `
}

/**
 * Calculate historical conference values based on historical h-indexes
 * This creates a temporary table 'historical_conference_value' with conference_id and value columns
 */
async function calculateHistoricalConferenceValues(
  historicalDate: Date
): Promise<void> {
  // Create a temporary table to store historical conference values
  await db.$executeRaw`DROP TABLE IF EXISTS historical_conference_value;`

  // Calculate conference values using historical h-indexes
  await db.$executeRaw`
    CREATE TEMP TABLE historical_conference_value AS
    WITH historical_user_confs AS (
      SELECT DISTINCT
        p.conference,
        pu.user_id
      FROM compass."Publication" p
      JOIN compass."PublicationUser" pu ON p.id = pu.publication_id
      WHERE
        p.conference IS NOT NULL
        AND p.date_published <= ${historicalDate} -- Only include publications that existed at this date
      GROUP BY p.conference, pu.user_id
    ),
    historical_averages AS (
      SELECT
        huc.conference,
        AVG(COALESCE(hhi.h_index, 0)) AS avg_h_index
      FROM historical_user_confs huc
      LEFT JOIN historical_h_index hhi ON huc.user_id = hhi.user_id
      GROUP BY huc.conference
    )
    SELECT
      ha.conference AS conference_id,
      LEAST(GREATEST(1, ha.avg_h_index), 100) AS conference_value -- Ensure value is between 1 and 100
    FROM historical_averages ha
  `
}

/**
 * Calculate historical base scores using historical conference values
 * This creates a temporary table 'historical_base_score' with publication_id and base_score columns
 */
async function calculateHistoricalBaseScores(
  historicalDate: Date
): Promise<void> {
  // Create a temporary table to store historical base scores
  await db.$executeRaw`DROP TABLE IF EXISTS historical_base_score;`

  // Calculate base scores using historical conference values
  await db.$executeRaw`
    CREATE TEMP TABLE historical_base_score AS
    SELECT
      p.id AS publication_id,
      GREATEST(1, LEAST(COALESCE(p.review_score, 1), 5)) * COALESCE(hcv.conference_value, 1) AS base_score
    FROM compass."Publication" p
    LEFT JOIN historical_conference_value hcv ON p.conference = hcv.conference_id
    WHERE p.date_published <= ${historicalDate} -- Only include publications that existed at this date
  `
}

/**
 * Create snapshots using historically accurate metrics
 * @param historicalDate The historical date to create snapshots for
 * @param publications Publications to create snapshots for
 */
/**
 * Create snapshots using historically accurate metrics
 * @param historicalDate The historical date to create snapshots for
 * @param publications Publications to create snapshots for
 */
async function createHistoricalSnapshots(
  historicalDate: Date,
  publications: { id: number; date_published: Date }[]
): Promise<void> {
  // Get consistent date representation
  const consistentDate = getConsistentDateForDB(historicalDate)
  const normalizedDate = normalizeToMidnightUTC(historicalDate)

  const logPrefix = '[Historical]'
  const timeout = 5000
  const MAX_RETRIES = 3

  jobs.logger.info(
    `${logPrefix} Starting historically accurate snapshot creation for ${normalizedDate.toISOString()}`
  )

  let attempts = 0
  while (attempts < MAX_RETRIES) {
    attempts++
    try {
      // Create citation scores and publication snapshots
      await db.$transaction(
        async (tx) => {
          // Step 1: Calculate historical h-indexes as they would have been at this date
          // This uses citations that existed at this historical date
          await calculateHistoricalHIndexes(historicalDate)

          // Step 2: Calculate historical conference values based on those h-indexes
          // This reflects the true conference value at that time
          await calculateHistoricalConferenceValues(historicalDate)

          // Step 3: Calculate historical base scores using historical conference values
          // Base score = review_score * historical_conference_value
          await calculateHistoricalBaseScores(historicalDate)

          // Step 4: Calculate historical citation scores
          // This uses only citations that existed at this date with their appropriate decay
          await calculateHistoricalCitationScores(
            tx,
            historicalDate,
            publications
          )

          // Step 5: Calculate overall scores by combining base scores and citation scores
          // This produces the final historical score
          await calculateHistoricalOverallScores(
            tx,
            historicalDate,
            publications
          )

          // Step 6: Insert publication snapshots with consistent date
          // This creates the actual snapshot records
          await tx.$executeRaw`
            INSERT INTO compass."PublicationSnapshot"(publication_id, snapshot_date, value)
            SELECT publication_id, ${consistentDate}, overall_score
            FROM historical_overall_scores
            WHERE publication_id IN (${Prisma.join(publications.map((p) => p.id))})
            ON CONFLICT (publication_id, snapshot_date)
            DO UPDATE SET value = EXCLUDED.value
          `
        },
        { timeout }
      )

      // Process other snapshots for topics and users
      await db.$transaction(
        async (tx) => {
          await processHistoricalTopicSnapshots(
            tx,
            historicalDate,
            publications
          )
        },
        { timeout }
      )

      await db.$transaction(
        async (tx) => {
          await processHistoricalUserSnapshots(tx, historicalDate, publications)
        },
        { timeout }
      )

      return // Success, exit the function
    } catch (error) {
      jobs.logger.warn(
        `${logPrefix} Attempt ${attempts}/${MAX_RETRIES} failed for date ${normalizedDate.toISOString()}: ${error.message}`
      )

      if (attempts >= MAX_RETRIES) {
        jobs.logger.error(
          `${logPrefix} All attempts failed for date ${normalizedDate.toISOString()}`
        )
        throw error
      }

      // Exponential backoff between retries
      const delayMs = 1000 * Math.pow(2, attempts - 1)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

/**
 * Calculate historical citation scores for a specific point in time
 * Uses only citations that existed at that time
 */
async function calculateHistoricalCitationScores(
  tx: Prisma.TransactionClient,
  historicalDate: Date,
  publications: { id: number; date_published: Date }[]
): Promise<void> {
  // Get consistent date representation
  const consistentDate = getConsistentDateForDB(historicalDate)

  // Drop table if it exists
  await tx.$executeRaw`DROP TABLE IF EXISTS historical_citation_scores;`

  // Create empty table
  await tx.$executeRaw`
    CREATE TEMP TABLE historical_citation_scores (
      publication_id INTEGER,
      decayed_citations NUMERIC
    )
  `

  // Process in chunks to avoid parameter limits
  const CHUNK_SIZE = 1000
  for (let i = 0; i < publications.length; i += CHUNK_SIZE) {
    const chunk = publications.slice(i, i + CHUNK_SIZE)
    const pubIds = chunk.map((pub) => pub.id)

    await tx.$executeRaw`
      INSERT INTO historical_citation_scores
      SELECT
        p.id AS publication_id,
        SUM(
          CASE
            WHEN c.author_sc = false
              AND dl_c.decay_factor IS NOT NULL
              AND c.creation_date <= ${consistentDate} -- CRITICAL: Only use citations that existed at this historical date
            THEN ((hcv.conference_value / 5.0) * dl_c.decay_factor) -- Calculate citation bonus using historical conference value
            ELSE 0
          END
        ) AS decayed_citations
      FROM compass."Publication" p
      LEFT JOIN historical_conference_value hcv
        ON p.conference = hcv.conference_id -- Use historical conference values, not current ones
      LEFT JOIN compass."Citation" c
        ON p.id = c.publication_id
      LEFT JOIN compass."DecayLookup" dl_c
        ON DATE_PART(
          'day',
          ${historicalDate}::timestamp - GREATEST(c.creation_date, COALESCE(p.date_published, ${historicalDate}))::timestamp
        )::INT = dl_c.days -- Calculate decay based on citation age FROM THE HISTORICAL DATE perspective
      WHERE p.date_published <= ${consistentDate} -- Only include publications that existed at this time
        AND p.id IN (${Prisma.join(pubIds)})
      GROUP BY p.id
    `
  }
}

/**
 * Calculate overall scores using historical base scores and citation scores
 */
async function calculateHistoricalOverallScores(
  tx: Prisma.TransactionClient,
  historicalDate: Date,
  publications: { id: number; date_published: Date }[]
): Promise<void> {
  // Drop overall scores table if it exists
  await tx.$executeRaw`DROP TABLE IF EXISTS historical_overall_scores;`

  // Create empty table
  await tx.$executeRaw`
    CREATE TEMP TABLE historical_overall_scores (
      publication_id INTEGER,
      overall_score NUMERIC
    )
  `

  // Process in chunks to avoid parameter limits
  const CHUNK_SIZE = 1000
  for (let i = 0; i < publications.length; i += CHUNK_SIZE) {
    const chunk = publications.slice(i, i + CHUNK_SIZE)
    const pubIds = chunk.map((pub) => pub.id)

    await tx.$executeRaw`
      INSERT INTO historical_overall_scores
      SELECT
        p.id AS publication_id,
        (
          (hbs.base_score * dl_p.decay_factor) + COALESCE(hcs.decayed_citations, 0)
          -- Formula: base_score * decay_factor + citation_bonus
        ) AS overall_score
      FROM compass."Publication" p
      LEFT JOIN historical_base_score hbs
        ON p.id = hbs.publication_id -- Use historical base scores reflecting conference values at that time
      LEFT JOIN historical_citation_scores hcs
        ON p.id = hcs.publication_id -- Use historical citation scores
      LEFT JOIN compass."DecayLookup" dl_p
        ON DATE_PART(
          'day',
          ${historicalDate}::timestamp - COALESCE(p.date_published, ${historicalDate})::timestamp
        )::INT = dl_p.days -- Calculate publication age decay from the historical date
      WHERE p.date_published <= ${historicalDate}
        AND p.id IN (${Prisma.join(pubIds)})
    `
  }
}

/**
 * Unified function to calculate and save snapshots for the current date
 * This uses current values already in the database
 * @param currentDate The current date to create snapshots for
 */
export async function createSnapshots(currentDate: Date): Promise<void> {
  const logPrefix = '[Snapshot]'
  const tempTablePrefix = 'temp'
  const timeout = 30000
  const MAX_RETRIES = 1

  jobs.logger.info(
    `${logPrefix} Starting snapshot creation for ${currentDate.toISOString()}`
  )

  const normalizedDate = new Date(currentDate)
  normalizedDate.setUTCHours(0, 0, 0, 0)

  let attempts = 0
  while (attempts < MAX_RETRIES) {
    attempts++
    try {
      // Create citation scores and publication snapshots
      await db.$transaction(
        async (tx) => {
          // Process citation scores
          await processCitationScores(tx, normalizedDate, tempTablePrefix)

          // Process publication snapshots
          await processPublicationSnapshots(tx, normalizedDate, tempTablePrefix)
        },
        { timeout }
      )

      // Create topic snapshots
      await db.$transaction(
        async (tx) => {
          await processTopicSnapshots(tx, normalizedDate)
        },
        { timeout }
      )

      // Create user snapshots
      await db.$transaction(
        async (tx) => {
          await processUserSnapshots(tx, normalizedDate)
        },
        { timeout }
      )

      return // Success, exit the function
    } catch (error) {
      // For current snapshots, just throw immediately
      jobs.logger.error(
        `${logPrefix} Failed to create snapshots: ${error.message}`
      )
      throw error
    }
  }
}

/**
 * Process citation scores for current snapshots
 */
async function processCitationScores(
  tx: Prisma.TransactionClient,
  snapshotDate: Date,
  tablePrefix: string
): Promise<void> {
  const tableName = `${tablePrefix}_citation_scores`

  // Drop table if it exists
  await tx.$executeRaw`DROP TABLE IF EXISTS ${Prisma.raw(tableName)};`

  // Process all publications using current values
  await tx.$executeRaw`
    CREATE TEMP TABLE ${Prisma.raw(tableName)} AS
    SELECT
      p.id AS publication_id,
      SUM(
        CASE
          WHEN c.author_sc = false
            AND dl_c.decay_factor IS NOT NULL
          THEN ((e.conference_value / 5.0) * dl_c.decay_factor)
          ELSE 0
        END
      ) AS decayed_citations
    FROM compass."Publication" p
    LEFT JOIN compass."Event" e
      ON p.conference = e.lisperator_id
    LEFT JOIN compass."Citation" c
      ON p.id = c.publication_id
    LEFT JOIN compass."DecayLookup" dl_c
      ON DATE_PART(
        'day',
        ${snapshotDate}::timestamp - GREATEST(c.creation_date, COALESCE(p.date_published, ${snapshotDate}))::timestamp
      )::INT = dl_c.days
    WHERE p.date_published <= ${snapshotDate}
    GROUP BY p.id
  `
}

/**
 * Process publication snapshots for current date
 */
async function processPublicationSnapshots(
  tx: Prisma.TransactionClient,
  snapshotDate: Date,
  tablePrefix: string
): Promise<void> {
  // Get consistent date representation
  const consistentDate = getConsistentDateForDB(snapshotDate)

  const citationTableName = `${tablePrefix}_citation_scores`
  const overallTableName = `${tablePrefix}_overall_scores`

  // Drop overall scores table if it exists
  await tx.$executeRaw`DROP TABLE IF EXISTS ${Prisma.raw(overallTableName)};`

  // Process all publications using current values
  await tx.$executeRaw`
    CREATE TEMP TABLE ${Prisma.raw(overallTableName)} AS
    SELECT
      p.id AS publication_id,
      (
        ((GREATEST(1, LEAST(COALESCE(p.review_score, 1), 5)) * COALESCE(e.conference_value, 1)) * dl_p.decay_factor) + COALESCE(cs.decayed_citations, 0)
      ) AS overall_score
    FROM compass."Publication" p
    LEFT JOIN compass."Event" e
      ON p.conference = e.lisperator_id
    LEFT JOIN ${Prisma.raw(citationTableName)} cs
      ON p.id = cs.publication_id
    LEFT JOIN compass."DecayLookup" dl_p
      ON DATE_PART(
        'day',
        ${snapshotDate}::timestamp - COALESCE(p.date_published, ${snapshotDate})::timestamp
      )::INT = dl_p.days
    WHERE p.date_published <= ${snapshotDate}
  `

  // Insert into publication snapshots using consistent date
  await tx.$executeRaw`
    INSERT INTO compass."PublicationSnapshot"(publication_id, snapshot_date, value)
    SELECT publication_id, ${consistentDate}, overall_score
    FROM ${Prisma.raw(overallTableName)}
    ON CONFLICT (publication_id, snapshot_date)
    DO UPDATE SET value = EXCLUDED.value
  `
}

/**
 * Replace the existing processTopicSnapshots function with this improved version
 */
async function processTopicSnapshots(
  tx: Prisma.TransactionClient,
  snapshotDate: Date
): Promise<void> {
  // Simply call our enhanced function
  await calculateSimpleTopicAverages(tx, snapshotDate)
}

async function calculateSimpleTopicAverages(
  tx: Prisma.TransactionClient,
  snapshotDate: Date
): Promise<void> {
  try {
    // Get consistent date representation for database operations
    const consistentDate = getConsistentDateForDB(snapshotDate)
    const normalizedDate = normalizeToMidnightUTC(snapshotDate)

    jobs.logger.info(
      `Calculating enhanced topic averages for date: ${normalizedDate.toISOString()}`
    )

    // First get the latest snapshot date that exists before our current date
    const latestSnapshotDate = await tx.$queryRaw<{ latest_date: Date }[]>`
      SELECT MAX(snapshot_date) as latest_date
      FROM compass."PublicationSnapshot"
      WHERE snapshot_date <= ${consistentDate}
    `

    if (!latestSnapshotDate[0]?.latest_date) {
      jobs.logger.info(
        'No publication snapshots found for this date, skipping topic averages'
      )
      return
    }

    // Fixed: Rename to avoid variable shadowing
    const pubSnapshotDate = latestSnapshotDate[0].latest_date

    jobs.logger.info(
      `Using publication snapshot date: ${pubSnapshotDate.toISOString()}`
    )

    // Define age ranges and bonuses - simplified from the complex version
    const RECENT_YEARS = 2 // Publications within 2 years are "recent"
    const RECENT_BONUS = 1.5 // Recent publications get 50% more weight
    const HIGH_SCORE_THRESHOLD = 5.0 // Publications with score >= 5 get bonus
    const HIGH_SCORE_BONUS = 2 // 30% bonus for high-scoring publications

    // Create a query to calculate topic scores with weighting factors
    await tx.$executeRaw`
      WITH weighted_publications AS (
        SELECT
          p.id AS publication_id,
          pt.topic_id,
          ps.value AS score,
          p.date_published,
          -- Calculate age-based weight
          CASE
            WHEN p.date_published >= (${consistentDate} - INTERVAL '${RECENT_YEARS} years')
            THEN ${RECENT_BONUS}
            ELSE 0.2
          END AS recency_weight,
          -- Add weight for high-scoring publications
          CASE
            WHEN ps.value >= ${HIGH_SCORE_THRESHOLD} THEN ${HIGH_SCORE_BONUS}
            ELSE 0.5
          END AS quality_weight
        FROM compass."Publication" p
        JOIN compass."PublicationSnapshot" ps ON p.id = ps.publication_id
        JOIN compass."PublicationTopic" pt ON p.id = pt.publication_id
        WHERE ps.snapshot_date = ${pubSnapshotDate}
      ),
      publication_counts AS (
        -- Count publications per topic for volume-based bonuses
        SELECT
          topic_id,
          COUNT(*) as pub_count,
          -- Volume bonuses at different thresholds
          CASE
            WHEN COUNT(*) > 100 THEN 1.5
            WHEN COUNT(*) > 50 THEN 1.3
            WHEN COUNT(*) > 10 THEN 1.1
            ELSE 1.0
          END AS volume_bonus
        FROM weighted_publications
        GROUP BY topic_id
      ),
      topic_scores AS (
        -- Calculate weighted average by topic
        SELECT
          wp.topic_id,
          -- Apply all weight factors to the score
          SUM(wp.score * wp.recency_weight * wp.quality_weight) /
          SUM(wp.recency_weight * wp.quality_weight) AS weighted_average,
          pc.pub_count,
          pc.volume_bonus
        FROM weighted_publications wp
        JOIN publication_counts pc ON wp.topic_id = pc.topic_id
        GROUP BY wp.topic_id, pc.pub_count, pc.volume_bonus
      )
      -- Insert final values with volume bonus applied
      INSERT INTO compass."TopicSnapshot"(topic_id, snapshot_date, mean_value)
      SELECT
        topic_id,
        ${consistentDate} AS snapshot_date,
        -- Apply volume bonus to the weighted average
        weighted_average * volume_bonus AS final_score
      FROM topic_scores
      WHERE pub_count >= 1
      ON CONFLICT (topic_id, snapshot_date)
      DO UPDATE SET mean_value = EXCLUDED.mean_value
    `

    // Log results for verification
    const topicSnapshots = await tx.$queryRaw`
      SELECT
        t.name,
        ts.mean_value,
        ts.snapshot_date
      FROM compass."TopicSnapshot" ts
      JOIN compass."Topic" t ON ts.topic_id = t.id
      WHERE ts.snapshot_date = ${consistentDate}
      ORDER BY ts.mean_value DESC
      LIMIT 5
    `

    jobs.logger.info(`Top 5 topics by enhanced score:`)
    for (const snapshot of topicSnapshots) {
      jobs.logger.info(`- ${snapshot.name}: ${snapshot.mean_value}`)
    }

    jobs.logger.info(`Enhanced topic averages calculation completed`)
  } catch (error) {
    jobs.logger.error(
      `Error calculating enhanced topic averages: ${error.message}`
    )
    throw error
  }
}

/**
 * Smart weighted average calculation that includes both maturity ramp-up and age decay
 * This replaces the aggressive time-weighting that was causing issues
 */
async function calculateSmartWeightedAverages(
  tx: Prisma.TransactionClient,
  snapshotDate: Date,
  tableName: string,
  scoreSource: 'PublicationSnapshot' | 'historical_overall_scores',
  publicationIds?: number[]
): Promise<void> {
  // Constants for the weighting system
  const MATURITY_MONTHS = 24
  const PEAK_YEARS = 3
  const DECAY_HALF_LIFE = 5
  const MIN_WEIGHT = 0.2
  const OLD_PAPER_MIN_WEIGHT = 0.1
  const CITATION_BOOST_FACTOR = 0.3
  const EXPECTED_CITATIONS_PER_YEAR = 2

  // First, drop the table if it exists
  await tx.$executeRaw`DROP TABLE IF EXISTS ${Prisma.raw(tableName)}`

  // Build the publication filter clause
  const pubFilter =
    publicationIds && publicationIds.length > 0
      ? Prisma.sql`AND p.id IN (${Prisma.join(publicationIds)})`
      : Prisma.empty

  jobs.logger.info(
    `calculateSmartWeightedAverages using date: ${snapshotDate.toISOString()}`
  )

  // Build the score source-specific parts
  const scoreJoin =
    scoreSource === 'PublicationSnapshot'
      ? Prisma.sql`JOIN compass."PublicationSnapshot" ps ON p.id = ps.publication_id AND ps.snapshot_date = ${snapshotDate}`
      : Prisma.sql`JOIN historical_overall_scores hos ON p.id = hos.publication_id`

  const scoreField =
    scoreSource === 'PublicationSnapshot'
      ? Prisma.sql`ps.value`
      : Prisma.sql`hos.overall_score`

  // Now create the table as a separate query
  await tx.$executeRaw`
    CREATE TEMP TABLE ${Prisma.raw(tableName)} AS
    WITH publication_metrics AS (
      SELECT
        p.id,
        p.date_published,
        ${scoreField} AS score,
        -- Calculate age in months and years
        EXTRACT(YEAR FROM AGE(${snapshotDate}::DATE, p.date_published::DATE)) * 12 +
        EXTRACT(MONTH FROM AGE(${snapshotDate}::DATE, p.date_published::DATE)) AS age_months,
        EXTRACT(YEAR FROM AGE(${snapshotDate}::DATE, p.date_published::DATE)) +
        EXTRACT(MONTH FROM AGE(${snapshotDate}::DATE, p.date_published::DATE)) / 12.0 AS age_years,
        -- Count citations
        COUNT(c.id) FILTER (WHERE c.author_sc = false) AS citation_count
      FROM compass."Publication" p
      ${scoreJoin}
      LEFT JOIN compass."Citation" c ON p.id = c.publication_id
        AND c.creation_date <= ${snapshotDate}
      WHERE p.date_published IS NOT NULL
        AND p.date_published <= ${snapshotDate}
        ${pubFilter}
      GROUP BY p.id, p.date_published, ${scoreField}
    ),
    weighted_publications AS (
      SELECT
        id,
        date_published,
        score,
        age_months,
        age_years,
        citation_count,
        -- Calculate base weight with both maturity ramp-up and age decay
        CASE
          -- Phase 1: Maturity ramp-up (0-2 years)
          WHEN age_months <= ${MATURITY_MONTHS} THEN
            ${MIN_WEIGHT} + (1.0 - ${MIN_WEIGHT}) * (age_months::FLOAT / ${MATURITY_MONTHS})

          -- Phase 2: Peak period (2-3 years)
          WHEN age_years <= ${PEAK_YEARS} THEN
            1.0

          -- Phase 3: Gradual decay (3+ years)
          ELSE
            GREATEST(
              ${OLD_PAPER_MIN_WEIGHT},
              POWER(0.5, (age_years - ${PEAK_YEARS}) / ${DECAY_HALF_LIFE})
            )
        END AS base_weight,

        -- Calculate citation performance relative to age
        CASE
          WHEN age_months = 0 THEN 0
          ELSE LEAST(
            1.0,
            citation_count::FLOAT / (age_years * ${EXPECTED_CITATIONS_PER_YEAR})
          )
        END AS citation_performance
      FROM publication_metrics
    )
    SELECT
      id,
      date_published,
      score AS original_value,
      age_years,
      citation_count,
      base_weight,
      citation_performance,
      -- Calculate final weight
      LEAST(
        1.0,
        base_weight + (${CITATION_BOOST_FACTOR} * citation_performance * base_weight)
      ) AS weight
    FROM weighted_publications
  `
}

/**
 * Replace the existing processHistoricalTopicSnapshots function
 */
async function processHistoricalTopicSnapshots(
  tx: Prisma.TransactionClient,
  historicalDate: Date,
  publications: { id: number; date_published: Date }[]
): Promise<void> {
  // Call our new enhanced historical function
  await calculateEnhancedHistoricalTopicAverages(tx, historicalDate)
}

/**
 * Enhanced historical topic averages calculation that includes weighting factors
 */
async function calculateEnhancedHistoricalTopicAverages(
  tx: Prisma.TransactionClient,
  historicalDate: Date
): Promise<void> {
  try {
    // Get consistent date representation
    const consistentDate = getConsistentDateForDB(historicalDate)
    const normalizedDate = normalizeToMidnightUTC(historicalDate)

    jobs.logger.info(
      `Calculating enhanced historical topic averages for date: ${normalizedDate.toISOString()}`
    )

    // Find the snapshot date closest to but not after our historical date
    const snapshotDateResult = await tx.$queryRaw<{ latest_date: Date }[]>`
      SELECT MAX(snapshot_date) as latest_date
      FROM compass."PublicationSnapshot"
      WHERE snapshot_date <= ${consistentDate}
    `

    if (!snapshotDateResult[0]?.latest_date) {
      jobs.logger.info(
        `No publication snapshots found before ${historicalDate.toISOString()}, skipping topic averages`
      )
      return
    }

    const pubSnapshotDate = snapshotDateResult[0].latest_date

    jobs.logger.info(
      `Using historical publication snapshot date: ${pubSnapshotDate.toISOString()}`
    )

    // Define age ranges and bonuses - same values as the current version
    const RECENT_YEARS = 2 // Publications within 2 years are "recent"
    const RECENT_BONUS = 1.5 // Recent publications get 50% more weight
    const HIGH_SCORE_THRESHOLD = 5.0 // Publications with score >= 5 get bonus
    const HIGH_SCORE_BONUS = 2.0 // 30% bonus for high-scoring publications

    // Create query with the same weighting approach for historical data
    await tx.$executeRaw`
      WITH historical_weighted_publications AS (
        SELECT
          p.id AS publication_id,
          pt.topic_id,
          ps.value AS score,
          p.date_published,
          -- Calculate age-based weight relative to the historical date
          CASE
            WHEN p.date_published >= (${historicalDate} - INTERVAL '${RECENT_YEARS} years')
            THEN ${RECENT_BONUS}
            ELSE 0.2
          END AS recency_weight,
          -- Add weight for high-scoring publications
          CASE
            WHEN ps.value >= ${HIGH_SCORE_THRESHOLD} THEN ${HIGH_SCORE_BONUS}
            ELSE 0.5
          END AS quality_weight
        FROM compass."Publication" p
        JOIN compass."PublicationSnapshot" ps ON p.id = ps.publication_id
        JOIN compass."PublicationTopic" pt ON p.id = pt.publication_id
        WHERE
          ps.snapshot_date = ${pubSnapshotDate}
          AND p.date_published <= ${historicalDate} -- Only include publications that existed at this date
      ),
      publication_counts AS (
        -- Count publications per topic for volume-based bonuses
        SELECT
          topic_id,
          COUNT(*) as pub_count,
          -- Volume bonuses at different thresholds
          CASE
            WHEN COUNT(*) > 100 THEN 1.5
            WHEN COUNT(*) > 50 THEN 1.3
            WHEN COUNT(*) > 10 THEN 1.1
            ELSE 1.0
          END AS volume_bonus
        FROM historical_weighted_publications
        GROUP BY topic_id
      ),
      topic_scores AS (
        -- Calculate weighted average by topic
        SELECT
          hwp.topic_id,
          -- Apply all weight factors to the score
          SUM(hwp.score * hwp.recency_weight * hwp.quality_weight) /
          NULLIF(SUM(hwp.recency_weight * hwp.quality_weight), 0) AS weighted_average,
          pc.pub_count,
          pc.volume_bonus
        FROM historical_weighted_publications hwp
        JOIN publication_counts pc ON hwp.topic_id = pc.topic_id
        GROUP BY hwp.topic_id, pc.pub_count, pc.volume_bonus
      )
      -- Insert final values with volume bonus applied
      INSERT INTO compass."TopicSnapshot"(topic_id, snapshot_date, mean_value)
      SELECT
        topic_id,
        ${consistentDate} AS snapshot_date,
        -- Apply volume bonus to the weighted average
        weighted_average * volume_bonus AS final_score
      FROM topic_scores
      WHERE pub_count >= 1
      ON CONFLICT (topic_id, snapshot_date)
      DO UPDATE SET mean_value = EXCLUDED.mean_value
    `

    jobs.logger.info(
      `Enhanced historical topic averages calculated for ${normalizedDate.toISOString()}`
    )
  } catch (error) {
    jobs.logger.error(
      `Error calculating enhanced historical topic averages: ${error.message}`
    )
    throw error
  }
}

/**
 * Replace the existing processUserSnapshots function
 */
async function processUserSnapshots(
  tx: Prisma.TransactionClient,
  snapshotDate: Date
): Promise<void> {
  // Get consistent date representation
  const consistentDate = getConsistentDateForDB(snapshotDate)

  // This ensures we use the same reference date as topic snapshots
  const latestSnapshotDate = await tx.$queryRaw<{ latest_date: Date }[]>`
    SELECT MAX(snapshot_date) as latest_date
    FROM compass."PublicationSnapshot"
    WHERE snapshot_date <= ${consistentDate}
  `

  if (!latestSnapshotDate[0]?.latest_date) {
    jobs.logger.info(
      'No publication snapshots found for this date, skipping user snapshots'
    )
    return
  }

  const pubSnapshotDate = latestSnapshotDate[0].latest_date

  jobs.logger.info(
    `Using publication snapshot date for user snapshots: ${pubSnapshotDate.toISOString()}`
  )

  // MODIFY THIS: Pass the publication snapshot date to ensure consistent data source
  await calculateSmartWeightedAverages(
    tx,
    pubSnapshotDate, // Use same date as topics
    'smart_weighted_publications',
    'PublicationSnapshot'
  )

  // Calculate and insert topic-specific snapshots with consistent date
  await tx.$executeRaw`
    INSERT INTO compass."UserTopicSnapshot"(user_id, topic_id, snapshot_date, mean_value)
    SELECT
      pu.user_id,
      pt.topic_id,
      ${consistentDate},
      SUM(swp.original_value * swp.weight) / NULLIF(SUM(swp.weight), 0) AS mean_value
    FROM smart_weighted_publications swp
    JOIN compass."PublicationUser" pu ON swp.id = pu.publication_id
    JOIN compass."PublicationTopic" pt ON swp.id = pt.publication_id
    GROUP BY pu.user_id, pt.topic_id
    ON CONFLICT (user_id, topic_id, snapshot_date)
    DO UPDATE SET mean_value = EXCLUDED.mean_value
  `

  // Calculate and insert overall user snapshots with consistent date
  await tx.$executeRaw`
    INSERT INTO compass."UserOverallSnapshot"(user_id, snapshot_date, mean_value)
    SELECT
      pu.user_id,
      ${consistentDate},
      SUM(swp.original_value * swp.weight) / NULLIF(SUM(swp.weight), 0) AS mean_value
    FROM smart_weighted_publications swp
    JOIN compass."PublicationUser" pu ON swp.id = pu.publication_id
    GROUP BY pu.user_id
    ON CONFLICT (user_id, snapshot_date)
    DO UPDATE SET mean_value = EXCLUDED.mean_value
  `
}

async function processHistoricalUserSnapshots(
  tx: Prisma.TransactionClient,
  historicalDate: Date,
  publications: { id: number; date_published: Date }[]
): Promise<void> {
  // Get consistent date representation
  const consistentDate = getConsistentDateForDB(historicalDate)
  const normalizedDate = normalizeToMidnightUTC(historicalDate)

  jobs.logger.info(
    `Processing enhanced historical user snapshots for ${normalizedDate.toISOString()}`
  )

  // Find the snapshot date closest to but not after our historical date - SAME AS TOPICS
  const snapshotDateResult = await tx.$queryRaw<{ latest_date: Date }[]>`
    SELECT MAX(snapshot_date) as latest_date
    FROM compass."PublicationSnapshot"
    WHERE snapshot_date <= ${consistentDate}
  `

  if (!snapshotDateResult[0]?.latest_date) {
    jobs.logger.info(
      `No publication snapshots found before ${historicalDate.toISOString()}, skipping user snapshots`
    )
    return
  }

  const pubSnapshotDate = snapshotDateResult[0].latest_date

  jobs.logger.info(
    `Using historical publication snapshot date: ${pubSnapshotDate.toISOString()}`
  )

  // Define age ranges and bonuses - SAME AS TOPICS
  const RECENT_YEARS = 2 // Publications within 2 years are "recent"
  const RECENT_BONUS = 1.5 // Recent publications get 50% more weight
  const HIGH_SCORE_THRESHOLD = 5.0 // Publications with score >= 5 get bonus
  const HIGH_SCORE_BONUS = 1.3 // 30% bonus for high-scoring publications

  // Create a temporary table with weighted publications - SAME APPROACH AS TOPICS
  await tx.$executeRaw`DROP TABLE IF EXISTS historical_user_weighted_publications`

  // Second statement: Create the new table
  await tx.$executeRaw`
    CREATE TEMP TABLE historical_user_weighted_publications AS
    SELECT
      p.id,
      p.date_published,
      ps.value AS score,
      pu.user_id,
      pt.topic_id,
      -- Calculate age-based weight relative to the historical date
      CASE
        WHEN p.date_published >= (${historicalDate} - INTERVAL '${RECENT_YEARS} years')
        THEN ${RECENT_BONUS}
        ELSE 1.0
      END AS recency_weight,
      -- Add weight for high-scoring publications
      CASE
        WHEN ps.value >= ${HIGH_SCORE_THRESHOLD} THEN ${HIGH_SCORE_BONUS}
        ELSE 1.0
      END AS quality_weight
    FROM compass."Publication" p
    JOIN compass."PublicationSnapshot" ps ON p.id = ps.publication_id
    JOIN compass."PublicationUser" pu ON p.id = pu.publication_id
    JOIN compass."PublicationTopic" pt ON p.id = pt.publication_id
    WHERE
      ps.snapshot_date = ${pubSnapshotDate}
      AND p.date_published <= ${historicalDate}
`

  // Calculate weighted average for user-topic combinations
  await tx.$executeRaw`
    INSERT INTO compass."UserTopicSnapshot"(user_id, topic_id, snapshot_date, mean_value)
    WITH user_topic_scores AS (
      SELECT
        user_id,
        topic_id,
        SUM(score * recency_weight * quality_weight) /
        NULLIF(SUM(recency_weight * quality_weight), 0) AS weighted_average
      FROM historical_user_weighted_publications
      GROUP BY user_id, topic_id
    )
    SELECT
      user_id,
      topic_id,
      ${consistentDate} AS snapshot_date,
      weighted_average AS mean_value
    FROM user_topic_scores
    WHERE weighted_average IS NOT NULL
    ON CONFLICT (user_id, topic_id, snapshot_date)
    DO UPDATE SET mean_value = EXCLUDED.mean_value
  `

  // Calculate overall user snapshots
  await tx.$executeRaw`
    INSERT INTO compass."UserOverallSnapshot"(user_id, snapshot_date, mean_value)
    WITH user_overall_scores AS (
      SELECT
        user_id,
        SUM(score * recency_weight * quality_weight) /
        NULLIF(SUM(recency_weight * quality_weight), 0) AS weighted_average
      FROM historical_user_weighted_publications
      GROUP BY user_id
    )
    SELECT
      user_id,
      ${consistentDate} AS snapshot_date,
      weighted_average AS mean_value
    FROM user_overall_scores
    WHERE weighted_average IS NOT NULL
    ON CONFLICT (user_id, snapshot_date)
    DO UPDATE SET mean_value = EXCLUDED.mean_value
  `

  // Log results for verification
  const userSampleData = await tx.$queryRaw`
    SELECT
      u.id AS user_id,
      u.lisperator_id,
      s.mean_value,
      s.snapshot_date
    FROM compass."UserOverallSnapshot" s
    JOIN compass."User" u ON s.user_id = u.id
    WHERE s.snapshot_date = ${consistentDate}
    ORDER BY s.mean_value DESC
    LIMIT 5
  `

  jobs.logger.info(`Top 5 users by enhanced score:`)
  for (const user of userSampleData) {
    jobs.logger.info(`- User ${user.user_id}: ${user.mean_value}`)
  }

  jobs.logger.info(`Enhanced historical user snapshots completed`)
}

/**
 * New function to calculate weighted averages for ALL publications that existed at a historical date
 */
async function calculateHistoricalWeightedAveragesForAll(
  tx: Prisma.TransactionClient,
  historicalDate: Date,
  tableName: string
): Promise<void> {
  // Constants for the weighting system (same as original)
  const MATURITY_MONTHS = 24
  const PEAK_YEARS = 3
  const DECAY_HALF_LIFE = 5
  const MIN_WEIGHT = 0.2
  const OLD_PAPER_MIN_WEIGHT = 0.1
  const CITATION_BOOST_FACTOR = 0.3
  const EXPECTED_CITATIONS_PER_YEAR = 2

  // First, drop the table if it exists
  await tx.$executeRaw`DROP TABLE IF EXISTS ${Prisma.raw(tableName)}`

  // Get consistent date representation
  const consistentDate = getConsistentDateForDB(historicalDate)

  // Now create the weighted publications table for ALL publications that existed at this date
  await tx.$executeRaw`
    CREATE TEMP TABLE ${Prisma.raw(tableName)} AS
    WITH publication_metrics AS (
      SELECT
        p.id,
        p.date_published,
        hos.overall_score AS score,
        -- Calculate age in months and years
        EXTRACT(YEAR FROM AGE(${historicalDate}::DATE, p.date_published::DATE)) * 12 +
        EXTRACT(MONTH FROM AGE(${historicalDate}::DATE, p.date_published::DATE)) AS age_months,
        EXTRACT(YEAR FROM AGE(${historicalDate}::DATE, p.date_published::DATE)) +
        EXTRACT(MONTH FROM AGE(${historicalDate}::DATE, p.date_published::DATE)) / 12.0 AS age_years,
        -- Count citations that existed at this historical date
        COUNT(c.id) FILTER (WHERE c.author_sc = false AND c.creation_date <= ${consistentDate}) AS citation_count
      FROM compass."Publication" p
      JOIN historical_overall_scores hos ON p.id = hos.publication_id
      LEFT JOIN compass."Citation" c ON p.id = c.publication_id
      WHERE p.date_published IS NOT NULL
        AND p.date_published <= ${historicalDate}
      GROUP BY p.id, p.date_published, hos.overall_score
    ),
    weighted_publications AS (
      SELECT
        id,
        date_published,
        score,
        age_months,
        age_years,
        citation_count,
        -- Calculate base weight with both maturity ramp-up and age decay
        CASE
          -- Phase 1: Maturity ramp-up (0-2 years)
          WHEN age_months <= ${MATURITY_MONTHS} THEN
            ${MIN_WEIGHT} + (1.0 - ${MIN_WEIGHT}) * (age_months::FLOAT / ${MATURITY_MONTHS})

          -- Phase 2: Peak period (2-3 years)
          WHEN age_years <= ${PEAK_YEARS} THEN
            1.0

          -- Phase 3: Gradual decay (3+ years)
          ELSE
            GREATEST(
              ${OLD_PAPER_MIN_WEIGHT},
              POWER(0.5, (age_years - ${PEAK_YEARS}) / ${DECAY_HALF_LIFE})
            )
        END AS base_weight,

        -- Calculate citation performance relative to age
        CASE
          WHEN age_months = 0 THEN 0
          ELSE LEAST(
            1.0,
            citation_count::FLOAT / (age_years * ${EXPECTED_CITATIONS_PER_YEAR})
          )
        END AS citation_performance
      FROM publication_metrics
    )
    SELECT
      id,
      date_published,
      score AS original_value,
      age_years,
      citation_count,
      base_weight,
      citation_performance,
      -- Calculate final weight
      LEAST(
        1.0,
        base_weight + (${CITATION_BOOST_FACTOR} * citation_performance * base_weight)
      ) AS weight
    FROM weighted_publications
  `
}
