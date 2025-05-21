import { Prisma } from '@prisma/client'
import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'
import { jobs } from 'src/lib/jobs'

/**
 * Type definition for the raw database row format returned by our custom SQL query
 */
type PublicationResult = {
  id: number
  title: string | null
  doi: string | null
  overall_score: number
  previous_score: number | null
}

/**
 * Type definition for the snapshot format
 */
type FormattedSnapshot = {
  publication_id: number
  snapshot_date: string
  value: number
}

/**
 * Type definition for a user from the database
 */
type UserRecord = {
  id: number
  lisperator_id: number
  first_name: string | null
  last_name: string | null
  alias_name: string | null
  // Include other necessary user fields
}

/**
 * Type definition for an author entry
 */
type AuthorInfo = {
  userId: number
  user_id: number
  name: string
}

export const publications: QueryResolvers['publications'] = () => {
  return db.publication.findMany({
    orderBy: { id: 'asc' },
  })
}

export const publication: QueryResolvers['publication'] = ({ id }) => {
  return db.publication.findUnique({
    where: { id },
  })
}

/**
 * Resolver for myPublications query
 * Returns publications authored by a specific user with enhanced data
 */
export const myPublications: QueryResolvers['myPublications'] = async ({
  userId,
}) => {
  try {
    // Find the user by lisperator_id (which is what's stored in localStorage)
    const user = await db.user.findUnique({
      where: { lisperator_id: userId },
      select: { id: true }, // Only select what we need
    })

    if (!user) {
      throw new Error(`User not found`)
    }

    // Get all publications by this user with optimized query
    // Use Prisma's built-in relations to reduce the number of database calls
    const publications = await db.publication.findMany({
      where: {
        Authors: {
          some: {
            user_id: user.id,
          },
        },
      },
      include: {
        // Include necessary related data in one query
        Snapshots: {
          orderBy: { snapshot_date: 'desc' },
          take: 2, // Only need the two most recent for trend calculation
        },
      },
      orderBy: { date_published: 'desc' },
    })

    // Extract conference IDs for a single batch lookup
    const conferenceIds = publications
      .map((p) => p.conference)
      .filter(Boolean)
      .map((id) => Number(id))

    // Fetch conference information in a single query if we have conferences
    let conferenceMap = {}
    if (conferenceIds.length > 0) {
      const events = await db.$queryRaw`
        SELECT e.lisperator_id, e.title
        FROM "Event" e
        WHERE e.lisperator_id = ANY(ARRAY[${Prisma.join(conferenceIds)}]::integer[])
      `

      // Create a map for O(1) lookups
      conferenceMap = events.reduce((map, event) => {
        map[event.lisperator_id] = event.title
        return map
      }, {})
    }

    // Process and return publications with enhanced data
    return publications.map((pub) => {
      // Calculate trend using the already-included snapshots
      let trend = 0
      const snapshots = pub.Snapshots || []

      if (snapshots.length >= 2) {
        const latest = snapshots[0]
        const previous = snapshots[1]

        // Safe number conversion with fallback
        const latestValue = convertDecimalToNumber(latest.value)
        const previousValue = convertDecimalToNumber(previous.value)

        trend = latestValue - previousValue
      }

      // Return the enhanced publication
      return {
        ...pub,
        conference_name: conferenceMap[pub.conference] || null,
        trend,
        // Safely convert decimal fields to numbers
        review_score: convertDecimalToNumber(pub.review_score),
        overall_score: convertDecimalToNumber(pub.overall_score),
        // Remove the Snapshots field as it's not in the return type
        Snapshots: undefined,
      }
    })
  } catch (error) {
    console.error('Error in myPublications resolver:', error)
    throw new Error('Failed to fetch publications. Please try again.')
  }
}

/**
 * Helper function to safely convert Decimal values to numbers
 */
function convertDecimalToNumber(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber()
  }

  return Number(value)
}

/**
 * Resolver for trendingPublications query
 *
 * Returns the top 10 publications either by specific topic or across all topics.
 * Includes the current score and historical snapshots for trend visualization.
 *
 * @param topicId - Optional topic ID to filter by, if null returns overall rankings
 * @param userId - Optional user ID to identify current user's publications
 */
export const trendingPublications = async ({
  topicId = null,
  userId = null,
}: {
  topicId?: number | null
  userId?: number | null
}) => {
  jobs.logger.info('trendingPublications resolver called with:', {
    topicId,
    userId,
  })

  let publications: PublicationResult[] = []

  // Get top publications (either by topic or overall)
  if (topicId === null) {
    // Get top publications across ALL topics
    publications = await db.$queryRaw<PublicationResult[]>`
      SELECT
        p.id,
        p.title,
        p.doi,
        p.overall_score
      FROM compass."Publication" p
      ORDER BY p.overall_score DESC
      LIMIT 10
    `
  } else {
    // Get top publications in a SPECIFIC topic
    publications = await db.$queryRaw<PublicationResult[]>`
      SELECT
        p.id,
        p.title,
        p.doi,
        p.overall_score
      FROM compass."Publication" p
      JOIN compass."PublicationTopic" pt ON pt.publication_id = p.id
      WHERE pt.topic_id = ${topicId}
      ORDER BY p.overall_score DESC
      LIMIT 10
    `
  }

  // Extract publication IDs
  const publicationIds = publications.map((p) => p.id)

  // Fetch all historical snapshots for these publications
  const snapshots = await db.publicationSnapshot.findMany({
    where: {
      publication_id: { in: publicationIds },
    },
    orderBy: {
      snapshot_date: 'asc', // Chronological order for charting
    },
  })

  // Format the snapshots to ensure proper date handling
  const formattedSnapshots: FormattedSnapshot[] = snapshots.map((snap) => ({
    ...snap,
    // Convert DateTime to ISO string format for consistent handling
    snapshot_date: snap.snapshot_date.toISOString(),
    // Ensure the value is converted to number for calculations
    value:
      typeof snap.value === 'object' &&
      snap.value !== null &&
      'toNumber' in snap.value
        ? snap.value.toNumber()
        : Number(snap.value),
  }))

  // Find the current user if userId is provided
  let currentUser: UserRecord | null = null
  // Track which publications are authored by the current user
  const userPublications = new Set<number>()

  if (userId) {
    try {
      currentUser = (await db.user.findUnique({
        where: { lisperator_id: userId },
      })) as UserRecord | null

      if (currentUser) {
        jobs.logger.info('Found current user:', {
          id: currentUser.id,
          lisperator_id: currentUser.lisperator_id,
        })

        // Now use the INTERNAL ID (user.id) to find publications
        const userPubLinks = await db.publicationUser.findMany({
          where: { user_id: currentUser.id },
          select: { publication_id: true },
        })

        userPubLinks.forEach((link) =>
          userPublications.add(link.publication_id)
        )

        jobs.logger.info(`Found ${userPublications.size} publications for user`)
      } else {
        jobs.logger.warn(`No user found with lisperator_id: ${userId}`)
      }
    } catch (error) {
      jobs.logger.error('Error finding current user:', error)
    }
  }

  // Fetch authors for each publication - include complete user data
  const authorsData = await db.publicationUser.findMany({
    where: {
      publication_id: { in: publicationIds },
    },
    include: {
      User: true,
    },
  })

  // Organize snapshots by publication
  const snapshotsByPub: Record<number, FormattedSnapshot[]> = {}
  for (const snap of formattedSnapshots) {
    if (!snapshotsByPub[snap.publication_id]) {
      snapshotsByPub[snap.publication_id] = []
    }
    snapshotsByPub[snap.publication_id].push(snap)
  }

  // Organize authors by publication
  const authorsByPub: Record<number, AuthorInfo[]> = {}

  for (const author of authorsData) {
    if (!authorsByPub[author.publication_id]) {
      authorsByPub[author.publication_id] = []
    }

    // Check if this author is the current user
    if (currentUser && author.user_id === currentUser.id) {
      userPublications.add(author.publication_id)
    }

    // Combine first_name and last_name to create a full name
    const firstName = author.User.first_name || ''
    const lastName = author.User.last_name || ''
    const fullName =
      [firstName, lastName].filter(Boolean).join(' ') ||
      author.User.alias_name ||
      'Anonymous'

    // Include both userId and user_id for compatibility
    authorsByPub[author.publication_id].push({
      userId: author.User.lisperator_id,
      user_id: author.User.lisperator_id,
      name: fullName,
    })
  }

  // Return the result in the expected format
  return publications.map((pub) => {
    // Check if this publication is authored by the current user
    const isCurrentUserPublication = userPublications.has(pub.id)

    if (isCurrentUserPublication) {
      jobs.logger.info(`Publication ${pub.id} is authored by current user`)
    }

    return {
      id: pub.id,
      title: pub.title || `Publication ID: ${pub.id}`,
      doi: pub.doi,
      overallScore: pub.overall_score,
      // Include authors for each publication
      authors: authorsByPub[pub.id] || [],
      // Let the frontend calculate previousScore and trend from snapshots
      snapshots: snapshotsByPub[pub.id] ?? [],
      // Flag if this publication belongs to the current user
      isCurrentUser: isCurrentUserPublication,
    }
  })
}
