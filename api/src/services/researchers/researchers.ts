import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

// Type definition for the raw database row format
type TrendingResearcherRow = {
  user_id: number
  email: string | null
  mean_value: number
  aliasName: string | null
}

/**
 * Resolver for the trendingResearchers GraphQL query
 * Implements a 5-year rolling window with exponential decay weighting
 *
 * This function is the heart of our trending researchers feature. It:
 * 1. Retrieves the top 10 researchers for a given topic (or overall if topicId is null)
 * 2. Ensures the current user is included in the results (even if not in top 10)
 * 3. Adds historical data for trend visualization
 *
 * @param {number|null} params.topicId - Topic ID to filter by (null for overall)
 * @param {number} params.lisperatorId - Current user's ID
 * @returns {Array} Array of trending researchers with weighted scores
 */
export const trendingResearchers = async ({ topicId = null, lisperatorId }) => {
  // Step 1: Find the current user's internal ID from their lisperator_id
  // ----------------------------------------------------------------------
  const user = await db.user.findUnique({
    where: { lisperator_id: lisperatorId },
  })

  if (!user) {
    throw new Error(`User with lisperator_id ${lisperatorId} not found`)
  }

  logger.info('Found current user:', { id: user.id })

  // Step 2: Determine which snapshot table to use and find the most recent snapshot date
  // ----------------------------------------------------------------------
  let snapshotDate

  if (topicId === null) {
    // For overall metrics, use UserOverallSnapshot
    const snapshotDateRow = await db.userOverallSnapshot.findFirst({
      orderBy: { snapshot_date: 'desc' },
      select: { snapshot_date: true },
    })

    if (!snapshotDateRow) return [] // If no snapshots exist yet, return empty array
    snapshotDate = snapshotDateRow.snapshot_date
  } else {
    // For topic-specific metrics, use UserTopicSnapshot
    const snapshotDateRow = await db.userTopicSnapshot.findFirst({
      where: { topic_id: topicId },
      orderBy: { snapshot_date: 'desc' },
      select: { snapshot_date: true },
    })

    if (!snapshotDateRow) return [] // If no snapshots exist yet, return empty array
    snapshotDate = snapshotDateRow.snapshot_date
  }

  // Step 3: Get the top 10 researchers
  // ----------------------------------------------------------------------
  let topResearchers: TrendingResearcherRow[]

  if (topicId === null) {
    // Use UserOverallSnapshot for overall rankings
    topResearchers = await db.$queryRaw<TrendingResearcherRow[]>`
      SELECT us.user_id, us.mean_value, u.email, u.alias_name as "aliasName"
      FROM compass."UserOverallSnapshot" us
      JOIN compass."User" u ON us.user_id = u.id
      WHERE us.snapshot_date = ${snapshotDate}
      ORDER BY us.mean_value DESC, u.alias_name ASC NULLS LAST, u.email ASC NULLS LAST
      LIMIT 10
    `
  } else {
    // Use UserTopicSnapshot for topic-specific rankings
    topResearchers = await db.$queryRaw<TrendingResearcherRow[]>`
      SELECT us.user_id, us.mean_value, u.email, u.alias_name as "aliasName"
      FROM compass."UserTopicSnapshot" us
      JOIN compass."User" u ON us.user_id = u.id
      WHERE us.topic_id = ${topicId}
        AND us.snapshot_date = ${snapshotDate}
      ORDER BY us.mean_value DESC, u.alias_name ASC NULLS LAST, u.email ASC NULLS LAST
      LIMIT 10
    `
  }

  // Step 4: Check if current user is already in the top 10
  // ----------------------------------------------------------------------
  const userIncluded = topResearchers.some((r) => r.user_id === user.id)

  // Step 5: If user is not in top 10, fetch their data separately
  // ----------------------------------------------------------------------
  let currentUser: TrendingResearcherRow | null = null

  if (!userIncluded) {
    if (topicId === null) {
      // For overall rankings using UserOverallSnapshot
      const [row] = await db.$queryRaw<TrendingResearcherRow[]>`
        SELECT us.user_id, us.mean_value, u.email, u.alias_name as "aliasName"
        FROM compass."UserOverallSnapshot" us
        JOIN compass."User" u ON us.user_id = u.id
        WHERE us.snapshot_date = ${snapshotDate}
          AND us.user_id = ${user.id}
      `
      currentUser = row
    } else {
      // For topic-specific rankings using UserTopicSnapshot
      const [row] = await db.$queryRaw<TrendingResearcherRow[]>`
        SELECT us.user_id, us.mean_value, u.email, u.alias_name as "aliasName"
        FROM compass."UserTopicSnapshot" us
        JOIN compass."User" u ON us.user_id = u.id
        WHERE us.topic_id = ${topicId}
          AND us.snapshot_date = ${snapshotDate}
          AND us.user_id = ${user.id}
      `
      currentUser = row
    }
  }

  // Step 6: Add current user to the list (if they're not already there)
  // ----------------------------------------------------------------------
  if (currentUser) {
    // Replace the last (10th) researcher with current user
    topResearchers = [...topResearchers.slice(0, 9), currentUser]
  }

  // Step 7: Enrich each researcher with historical data for trend visualization
  // ----------------------------------------------------------------------
  return await Promise.all(
    topResearchers.map(async (r) => {
      // Get all historical snapshots for this researcher based on topic type
      let snapshots

      if (topicId === null) {
        // Use UserOverallSnapshot for historical data
        snapshots = await db.userOverallSnapshot.findMany({
          where: {
            user_id: r.user_id,
          },
          orderBy: { snapshot_date: 'asc' },
          select: {
            snapshot_date: true,
            mean_value: true,
          },
        })
      } else {
        // Use UserTopicSnapshot for historical data
        snapshots = await db.userTopicSnapshot.findMany({
          where: {
            user_id: r.user_id,
            topic_id: topicId,
          },
          orderBy: { snapshot_date: 'asc' },
          select: {
            snapshot_date: true,
            mean_value: true,
          },
        })
      }

      // Return the final enriched researcher object
      return {
        id: r.user_id,
        email: r.email,
        aliasName: r.aliasName,
        meanValue: r.mean_value,
        isCurrentUser: r.user_id === user.id,
        snapshots: snapshots.map((s) => ({
          snapshotDate: s.snapshot_date,
          meanValue: s.mean_value,
        })),
      }
    })
  )
}
