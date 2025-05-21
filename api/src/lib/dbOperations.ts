import { Prisma } from '@prisma/client'

import { jobs } from 'src/lib/jobs'
import {
  calculateUserHIndex,
  calculateConferenceValue,
  calculateCitationScoresAndDecay,
} from 'src/lib/pointSystemCalculations'
import { smartSnapshotGenerator } from 'src/lib/snapshotGeneration'

import { db } from './db'
import { processInChunks } from './utils'

export async function buildUserMap() {
  const userRows = await db.user.findMany({
    select: { id: true, lisperator_id: true },
  })

  const userMap = new Map<number, number>()
  for (const row of userRows) {
    userMap.set(row.lisperator_id, row.id)
  }

  return userMap
}

export async function insertAuthors(
  tx: Prisma.TransactionClient,
  pubId: number,
  authorUserIds: number[],
  userMap: Map<number, number>
) {
  const rows = authorUserIds
    .map((lisperatorId) => userMap.get(lisperatorId))
    .filter((id): id is number => id !== undefined)
    .map((realUserId) => ({
      publication_id: pubId,
      user_id: realUserId,
    }))

  if (rows.length) {
    const CHUNK_SIZE = 100 // Adjust based on DB limits

    await processInChunks(rows, CHUNK_SIZE, async (rowChunk) => {
      return await tx.publicationUser.createMany({
        data: rowChunk,
        skipDuplicates: true,
      })
    })
  }
}

export async function insertTopics(
  tx: Prisma.TransactionClient,
  publicationId: number,
  conferenceId: number
) {
  // Fetch the canonical topic ids for the conference
  const topicRows = await tx.$queryRaw<{ topic_id: number }[]>`
    SELECT DISTINCT
      CASE
        -- Match current canonical topics (IDs 1044–1051)
        WHEN t.id = 1044 THEN 1
        WHEN t.id = 1045 THEN 2
        WHEN t.id = 1046 THEN 3
        WHEN t.id = 1047 THEN 4
        WHEN t.id = 1048 THEN 5
        WHEN t.id = 1049 THEN 6
        WHEN t.id = 1050 THEN 7
        WHEN t.id = 1051 THEN 8

        -- Match legacy topics via new_topic_id
        WHEN t.new_topic_id = 1 THEN 1
        WHEN t.new_topic_id = 2 THEN 2
        WHEN t.new_topic_id = 3 THEN 3
        WHEN t.new_topic_id = 4 THEN 4
        WHEN t.new_topic_id = 5 THEN 5
        WHEN t.new_topic_id = 6 THEN 6
        WHEN t.new_topic_id = 7 THEN 7
        WHEN t.new_topic_id = 8 THEN 8

        ELSE NULL
      END AS topic_id
    FROM borg.event e
    JOIN borg.map_event_topic met ON e.id = met.event
    JOIN borg.topic t ON met.topic = t.id
    WHERE e.id = ${conferenceId}
  `

  // Normalise / fallback to topic 9 ("Other")
  const topicIds = topicRows
    .map((row) => row.topic_id)
    .filter((id): id is number => id !== null)

  const finalTopicIds = topicIds.length > 0 ? topicIds : [9]

  const rows = finalTopicIds.map((id) => ({
    publication_id: publicationId,
    topic_id: id,
  }))

  if (!rows.length) return

  const CHUNK_SIZE = 100 // Adjust based on DB limits

  await processInChunks(rows, CHUNK_SIZE, async (rowChunk) => {
    return await tx.publicationTopic.createMany({
      data: rowChunk,
      skipDuplicates: true,
    })
  })
}

/**
 * ----------------------------------------------------------------
 * updateEAIMembershipStatus()
 * ----------------------------------------------------------------
 * Updates the is_eai_member field for users based on the borg.user.registered field
 */
export async function updateEAIMembershipStatus(): Promise<void> {
  await db.$executeRaw`
      UPDATE compass."User" u
      SET is_eai_member = bu.registered
      FROM borg."user" bu
      WHERE u.lisperator_id = bu.id
    `
}

/**
 * ----------------------------------------------------------------
 * truncatePublications()
 * ----------------------------------------------------------------
 * Utility that completely clears out all data in the `compass."Publication"`
 * table and cascades to any dependent tables (like `compass."Citation"`).
 * Used in "initialization" scenarios where we want a fresh start.
 */
export async function truncatePublications(): Promise<void> {
  try {
    jobs.logger.info('[CleanupJob]: Dropping Publication table if it exists...')
    await db.$executeRaw`
      TRUNCATE TABLE compass."Publication" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."Citation" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."PublicationUser" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."Topic" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."PublicationTopic" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."PublicationSnapshot" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."UserOverallSnapshot" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."UserTopicSnapshot" RESTART IDENTITY CASCADE
    `
    await db.$executeRaw`
      TRUNCATE TABLE compass."TopicSnapshot" RESTART IDENTITY CASCADE
    `
    await db.user.updateMany({ data: { h_index: 0 } })
    await db.event.updateMany({ data: { conference_value: 0 } })
  } catch (error) {
    jobs.logger.error('[CleanupJob]: An error occurred during cleanup:', error)
    process.exit(1)
  }
}

export interface MetricsLogger {
  info: (message: string) => void
  error?: (message: string) => void
}

/**
 * Recalculates all metrics in the point system in the correct order
 * and generates a new snapshot.
 *
 * @param logger Logger object with at least an info method
 * @param options Options for metric calculation
 * @returns The snapshot date
 */
// In src/lib/dbOperations.ts
export async function recalculateAllMetrics(
  logger: MetricsLogger,
  options: {
    includeCurrentSnapshot?: boolean;
    isInitialization?: boolean;
    snapshotFrequency?: 'weekly' | 'monthly' | 'quarterly';
    validationOnly?: boolean; // Add this parameter
    validationData?: any; // And this one
  } = {}
): Promise<Date> {
  // 1. Calculate h-index for each user
  logger.info('Calculating h-index for each user...');
  await calculateUserHIndex();

  // 2. Update EAI membership status
  if (options.isInitialization) {
    logger.info('Updating EAI membership status...');
    await updateEAIMembershipStatus();
  }

  // 3. Calculate conference value based on author h-indexes
  logger.info('Calculating conference value...');
  await calculateConferenceValue();

  // 4. Calculate citation scores with decay
  await calculateCitationScoresAndDecay();

  // 5. Generate snapshot
  const now = new Date();
  await smartSnapshotGenerator(
    now,
    options.includeCurrentSnapshot,
    options.snapshotFrequency || 'weekly',
    /*options.validationOnly, // Pass this parameter
    options.validationData  // And this one*/
  );

  return now;
}
