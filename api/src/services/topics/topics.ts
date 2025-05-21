import { db } from 'src/lib/db'

/**
 * trendingTopics resolver
 *
 * Returns all topics ranked by their current mean value,
 * including historical snapshot data for trend visualization.
 *
 * This data can be used to:
 * 1. Show the current ranking of topics
 * 2. Identify the best-performing topic
 * 3. Visualize how topic scores have changed over time
 */
export const trendingTopics = async () => {
  // Step 1: Get latest snapshot date for topic scores
  const snapshotDateRow = await db.topicSnapshot.findFirst({
    orderBy: { snapshot_date: 'desc' },
    select: { snapshot_date: true },
  })

  if (!snapshotDateRow) return []

  const snapshotDate = snapshotDateRow.snapshot_date

  // Step 2: Fetch all topics and their values for this snapshot date
  const rows = await db.topicSnapshot.findMany({
    where: { snapshot_date: snapshotDate },
    include: {
      Topic: true,
    },
    orderBy: { mean_value: 'desc' },
  })

  // Find the highest value to mark the "best" topic
  const bestValue = rows[0]?.mean_value ?? 0

  // Step 3: Get all topic IDs for fetching historical data
  const topicIds = rows.map((row) => row.topic_id)

  // Step 4: Fetch historical snapshots for all topics
  const snapshots = await db.topicSnapshot.findMany({
    where: {
      topic_id: { in: topicIds },
    },
    orderBy: {
      snapshot_date: 'asc', // Chronological order for charts
    },
    select: {
      topic_id: true,
      snapshot_date: true,
      mean_value: true,
    },
  })

  // Organize snapshots by topic for easier access
  const snapshotsByTopic: Record<
    number,
    { snapshot_date: Date; value: number }[]
  > = {}
  for (const snap of snapshots) {
    if (!snapshotsByTopic[snap.topic_id]) {
      snapshotsByTopic[snap.topic_id] = []
    }

    snapshotsByTopic[snap.topic_id].push({
      snapshot_date: snap.snapshot_date,
      value: Number(snap.mean_value), // Explicitly convert Decimal to number
    })
  }

  // Step 5: Return the complete trend data
  return rows.map((row) => ({
    id: row.topic_id,
    name: row.Topic.name,
    meanValue: row.mean_value,
    isBest: row.mean_value === bestValue,
    snapshots: snapshotsByTopic[row.topic_id] ?? [],
  }))
}
