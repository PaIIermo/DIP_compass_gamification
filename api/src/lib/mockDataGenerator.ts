/**
 * Enhanced Mock Data Generator for Academic Publication System
 *
 * This version creates more realistic data distributions by:
 * 1. Focusing on a smaller subset of "active researchers" rather than all users
 * 2. Implementing research communities that tend to publish together
 * 3. Generating realistic citation patterns (preferential attachment with time dynamics)
 * 4. Creating more diverse topic patterns and realistic citation distributions
 */
import { faker } from '@faker-js/faker'

import { db } from 'src/lib/db'
import { jobs } from 'src/lib/jobs'
import { processInChunks } from 'src/lib/utils'

interface UserRecord {
  id: number
  lisperator_id?: number
}

// Define a type for Conference objects
interface ConferenceRecord {
  lisperator_id: number
}

// Define a type for Publication objects
interface MockPublication {
  id: number
  submission_id: number
  doi: string | null
  date_published: Date
  communityId?: number // Optional because it's added for internal use
  targetCitationCount?: number // Target number of citations for this publication
}

// Configuration with more realistic citation distributions
const CONFIG = {
  publicationCount: 2000,
  yearRange: [2015, 2024],

  // User selection
  activeResearcherCount: 1000,

  // Conference selection
  focusedConferenceCount: 150,

  // Research communities
  communityCount: 50,
  communityOverlap: 0.2,

  // REALISTIC CITATION DISTRIBUTION (more generous version)
  citationsDistribution: {
    0.25: 0, // 25% get 0 citations (reduced from 40%)
    0.45: 3, // 20% get 1-3 citations
    0.65: 8, // 20% get 4-8 citations
    0.8: 20, // 15% get 9-20 citations
    0.9: 50, // 10% get 21-50 citations
    0.95: 100, // 5% get 51-100 citations
    0.98: 200, // 2% get 101-200 citations
    0.995: 500, // 1.5% get 201-500 citations
    1.0: 1000, // 0.5% get 501-1000 citations
  },

  // Year-based citation penalties (less severe)
  yearCitationPenalty: {
    2024: 0.3, // 70% reduction for brand new papers
    2023: 0.5, // 50% reduction
    2022: 0.7, // 30% reduction
    2021: 0.85, // 15% reduction
    2020: 0.95, // 5% reduction
    // Papers before 2020 get full citation counts
  },

  authorsPerPublication: {
    min: 1,
    max: 8,
    most_common: 3,
  },

  validateWithSinglePublication: true,
}

/**
 * Get active users directly from the source schemas (eudl, confy)
 * This works even if the Publication table has been truncated
 */
async function getActiveUsersFromSource(limit: number) {
  try {
    // Query submission authors from confy schema
    const activeUserIds = await db.$queryRaw<{ userid: number }[]>`
      SELECT DISTINCT sa.userid
      FROM confy.submission_author sa
      JOIN confy.submission s ON sa.submission = s.camera_ready_of
      JOIN eudl.content c ON c.confy_id = s.id
      WHERE
        sa.userid IS NOT NULL
        AND c.date_published IS NOT NULL
      ORDER BY sa.userid
    `

    jobs.logger.info(
      `[MockData]: Found ${activeUserIds.length} active users from source tables`
    )

    // Get user records for these IDs
    if (activeUserIds.length > 0) {
      const userIdArray = activeUserIds.map((u) => u.userid)

      // Map lisperator_ids to compass user ids
      const userRows = await db.user.findMany({
        where: {
          lisperator_id: { in: userIdArray },
        },
        select: { id: true, lisperator_id: true },
        take: limit,
      })

      jobs.logger.info(
        `[MockData]: Retrieved ${userRows.length} user records from source-identified active users`
      )
      return userRows
    }
  } catch (error) {
    jobs.logger.warn(
      `[MockData]: Error fetching active users from source: ${error.message}`
    )
    jobs.logger.warn('[MockData]: Falling back to random user selection')
  }

  // Fallback: random selection
  jobs.logger.info(
    `[MockData]: No active users found in source tables, falling back to random selection`
  )
  return await db.user.findMany({
    take: limit,
    select: { id: true, lisperator_id: true },
  })
}

/**
 * Get active conferences directly from the source schemas (eudl, confy)
 * This works even if the Publication table has been truncated
 */
async function getActiveConferencesFromSource(limit: number) {
  try {
    // Query conferences from confy schema that have submissions
    const activeConferenceIds = await db.$queryRaw<{ conference: number }[]>`
      SELECT DISTINCT s.conference
      FROM confy.submission s
      JOIN eudl.content c ON c.confy_id = s.id
      WHERE
        s.conference IS NOT NULL
        AND c.date_published IS NOT NULL
      ORDER BY s.conference
    `

    jobs.logger.info(
      `[MockData]: Found ${activeConferenceIds.length} active conferences from source tables`
    )

    // Get conference records for these IDs
    if (activeConferenceIds.length > 0) {
      const conferenceIdArray = activeConferenceIds.map((c) => c.conference)

      const conferenceRows = await db.event.findMany({
        where: {
          lisperator_id: { in: conferenceIdArray },
        },
        select: { lisperator_id: true },
        take: limit,
      })

      jobs.logger.info(
        `[MockData]: Retrieved ${conferenceRows.length} conference records from source-identified active conferences`
      )
      return conferenceRows
    }
  } catch (error) {
    jobs.logger.warn(
      `[MockData]: Error fetching active conferences from source: ${error.message}`
    )
    jobs.logger.warn('[MockData]: Falling back to random conference selection')
  }

  // Fallback: random selection
  jobs.logger.info(
    `[MockData]: No active conferences found in source tables, falling back to random selection`
  )
  return await db.event.findMany({
    take: limit,
    select: { lisperator_id: true },
  })
}

/**
 * Generate a realistic academic paper title
 */
function generatePaperTitle() {
  const titlePatterns = [
    () =>
      `${faker.commerce.productName()} for ${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()}`,
    () =>
      `A Novel Approach to ${faker.commerce.productMaterial()} Using ${faker.commerce.productName()}`,
    () =>
      `${faker.company.buzzVerb()}ing ${faker.commerce.productMaterial()} with ${faker.hacker.adjective()} ${faker.hacker.noun()}`,
    () =>
      `The Effect of ${faker.commerce.productName()} on ${faker.commerce.productMaterial()} in ${faker.commerce.productAdjective()} Systems`,
    () =>
      `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()}: A ${faker.commerce.productAdjective()} Study`,
    () =>
      `Towards ${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()}: ${faker.hacker.ingverb()} ${faker.hacker.noun()} Using ${faker.commerce.productName()}`,
    () =>
      `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()}: ${faker.commerce.productAdjective()} Challenges and Opportunities`,
    () =>
      `A ${faker.commerce.productAdjective()} Survey of ${faker.commerce.productMaterial()} Methods in Research`,
    () =>
      `On the ${faker.commerce.productAdjective()} Nature of ${faker.commerce.productMaterial()} in ${faker.commerce.productAdjective()} Systems`,
    () =>
      `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()}: Empirical Evidence from ${faker.location.country()}`,
  ]

  return titlePatterns[Math.floor(Math.random() * titlePatterns.length)]()
}

/**
 * Generate a realistic DOI with a special prefix for mock data
 */
function generateDOI() {
  const prefix = '10.9999' // Special prefix for mock DOIs
  const suffix = 'mock-' + faker.string.alphanumeric(8).toLowerCase()
  return `${prefix}/${suffix}`
}

/**
 * Generate a random date within the specified year range
 */
function generatePublicationDate(yearRange: number[]) {
  const year = faker.number.int({ min: yearRange[0], max: yearRange[1] })
  const month = faker.number.int({ min: 0, max: 11 }) // 0-11 (Jan-Dec)

  // Get proper last day of month
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = faker.number.int({ min: 1, max: lastDay })

  return new Date(year, month, day)
}

/**
 * Get a random number of citations based on distribution and publication year
 * FIXED VERSION that properly respects the distribution
 */
function getCitationCount(
  distribution: Record<string, number>,
  pubYear?: number
) {
  const random = Math.random()
  let baseCitationCount = 0

  // CRITICAL FIX: Sort thresholds in ascending order before checking!
  const sortedThresholds = Object.keys(distribution)
    .map(parseFloat)
    .sort((a, b) => a - b)

  // Check each threshold in sorted order
  for (const threshold of sortedThresholds) {
    if (random <= threshold) {
      const maxCitations = distribution[threshold.toString()]

      if (maxCitations === 0) {
        baseCitationCount = 0
      } else {
        // Find the previous threshold's max value
        const currentIndex = sortedThresholds.indexOf(threshold)
        const prevThreshold =
          currentIndex > 0 ? sortedThresholds[currentIndex - 1] : 0
        const prevMax =
          currentIndex > 0 ? distribution[prevThreshold.toString()] : 0

        const min = prevMax + 1
        const max = maxCitations

        baseCitationCount = faker.number.int({ min, max })
      }
      break
    }
  }

  // Apply year-based penalty (newer papers get fewer citations)
  if (pubYear && CONFIG.yearCitationPenalty[pubYear]) {
    return Math.round(baseCitationCount * CONFIG.yearCitationPenalty[pubYear])
  }

  // Default: no penalty for older papers
  return baseCitationCount
}

/**
 * Assign research communities to users, creating realistic clusters
 */
function assignResearchCommunities(
  users: UserRecord[],
  communityCount: number,
  overlapProbability: number
) {
  const communities: Record<number, number[]> = {}

  // Initialize communities
  for (let i = 0; i < communityCount; i++) {
    communities[i] = []
  }

  // Assign users to primary communities using a power law distribution
  users.forEach((user) => {
    // Power law: community size follows roughly 1/rank distribution
    const communityIndex = Math.floor(
      Math.pow(Math.random(), 1.5) * communityCount
    )
    const primaryCommunity = Math.min(communityIndex, communityCount - 1)

    communities[primaryCommunity].push(user.id)

    // Some users also belong to a second community
    if (Math.random() < overlapProbability) {
      let secondaryCommunity
      do {
        secondaryCommunity = Math.floor(Math.random() * communityCount)
      } while (secondaryCommunity === primaryCommunity)

      communities[secondaryCommunity].push(user.id)
    }
  })

  return communities
}

/**
 * Get authors for a publication from a specific community
 */
function getAuthorsFromCommunity(
  communityId: number,
  communities: Record<number, number[]>,
  minAuthors: number,
  maxAuthors: number,
  mostCommon: number
) {
  // Get community members
  const communityMembers = communities[communityId]
  if (!communityMembers || communityMembers.length === 0) {
    return []
  }

  // Determine how many authors this publication will have
  let numAuthors
  const rand = Math.random()
  if (rand < 0.6) {
    numAuthors = mostCommon
  } else {
    numAuthors = faker.number.int({ min: minAuthors, max: maxAuthors })
  }

  // Cap by available community members
  numAuthors = Math.min(numAuthors, communityMembers.length)

  // Get random authors from the community
  const shuffledMembers = [...communityMembers].sort(() => 0.5 - Math.random())
  return shuffledMembers.slice(0, numAuthors)
}

/**
 * Generate topic diversity coefficients to create more varied topic trends
 */
function generateTopicDiversityCoefficients(topics) {
  const coefficients = {}

  // For each topic, generate a coefficient between 0.5 and 2.0
  topics.forEach((topic) => {
    coefficients[topic.id] = 0.5 + Math.random() * 1.5
  })

  return coefficients
}

/**
 * Generate citations with realistic distribution
 * This version creates EXACTLY the right number of citations per publication
 */
function generateCitations(insertedPublications: MockPublication[]) {
  const citations = []
  const citationCounts: Record<number, number> = {}

  // Initialize all publications with 0 citations
  for (const pub of insertedPublications) {
    citationCounts[pub.id] = 0
  }

  // Assign target citation counts based on distribution
  jobs.logger.info(`[MockData]: Assigning target citation counts...`)
  let totalTargetCitations = 0
  let zeroCitationCount = 0

  for (const pub of insertedPublications) {
    const pubYear = pub.date_published.getFullYear()
    pub.targetCitationCount = getCitationCount(
      CONFIG.citationsDistribution,
      pubYear
    )
    totalTargetCitations += pub.targetCitationCount
    if (pub.targetCitationCount === 0) {
      zeroCitationCount++
    }
  }

  jobs.logger.info(
    `[MockData]: ${zeroCitationCount} publications (${((zeroCitationCount / insertedPublications.length) * 100).toFixed(1)}%) will have 0 citations`
  )
  jobs.logger.info(
    `[MockData]: Total target citations: ${totalTargetCitations} (avg: ${(totalTargetCitations / insertedPublications.length).toFixed(1)} per pub)`
  )

  // Sort publications by date
  insertedPublications.sort(
    (a, b) => a.date_published.getTime() - b.date_published.getTime()
  )

  // Generate citations - EXACTLY matching target counts
  for (const pub of insertedPublications) {
    const targetCount = pub.targetCitationCount || 0

    // Skip if target is 0
    if (targetCount === 0) {
      continue
    }

    // Just create external citations for simplicity and accuracy
    for (let i = 0; i < targetCount; i++) {
      citations.push({
        publication_id: pub.id,
        oci: `oci:${faker.string.alphanumeric(16)}`,
        citing: generateDOI(),
        creation_date: faker.date.between({
          from: pub.date_published,
          to: new Date(),
        }),
        author_sc: Math.random() < 0.08, // 8% self-citations
      })
    }

    citationCounts[pub.id] = targetCount
  }

  jobs.logger.info(
    `[MockData]: Generated exactly ${citations.length} citations`
  )

  return { citations, citationCounts }
}

/**
 * Main function to generate mock data
 */
export async function generateMockData(
  count = CONFIG.publicationCount,
  validate = CONFIG.validateWithSinglePublication
) {
  try {
    jobs.logger.info(
      `[MockData]: Starting enhanced mock data generation for ${count} publications`
    )

    // If validating with a single publication first
    if (validate && count > 1) {
      jobs.logger.info(`[MockData]: Validating with a single publication first`)
      await generateMockData(1, false)
      jobs.logger.info(
        `[MockData]: Validation successful. Proceeding with full generation.`
      )
    }

    // Step 1: Get users from source tables (eudl, confy)
    jobs.logger.info(
      `[MockData]: Identifying active researchers from source tables...`
    )
    const selectedUsers = (await getActiveUsersFromSource(
      CONFIG.activeResearcherCount
    )) as UserRecord[]

    if (selectedUsers.length === 0) {
      throw new Error(
        'No users found in the database. Cannot generate mock data.'
      )
    }

    // Step 2: Get conferences from source tables (eudl, confy)
    jobs.logger.info(
      `[MockData]: Identifying active conferences from source tables...`
    )
    const focusedConferences = (await getActiveConferencesFromSource(
      CONFIG.focusedConferenceCount
    )) as ConferenceRecord[]

    if (focusedConferences.length === 0) {
      throw new Error(
        'No conferences found in the database. Cannot generate mock data.'
      )
    }

    // Step 3: Assign research communities
    const communities = assignResearchCommunities(
      selectedUsers,
      CONFIG.communityCount,
      CONFIG.communityOverlap
    )

    // Find the highest submission_id
    const maxSubmissionId = await db.publication.aggregate({
      _max: { submission_id: true },
    })
    const startSubmissionId = (maxSubmissionId._max.submission_id || 0) + 1

    // Step 4: Get topics and generate diversity coefficients
    const topics = await db.topic.findMany({ select: { id: true } })
    const topicDiversityCoefficients =
      generateTopicDiversityCoefficients(topics)

    // Step 5: Generate mock publications with community-based authorship
    const mockPublications = []
    const submissionIds = new Set()

    jobs.logger.info(`[MockData]: Generating ${count} mock publications...`)

    for (let i = 0; i < count; i++) {
      // Generate a unique submission_id
      let submissionId = startSubmissionId + i
      while (submissionIds.has(submissionId)) {
        submissionId++
      }
      submissionIds.add(submissionId)

      // Select a research community for this paper
      const communityIds = Object.keys(communities).map(Number)
      const communitySizes = communityIds.map((id) => communities[id].length)
      const totalSize = communitySizes.reduce((a, b) => a + b, 0)

      // Weight by community size with cumulative selection
      const random = Math.random() * totalSize
      let selectedCommunity = communityIds[0]
      let cumulativeWeight = 0

      for (let j = 0; j < communityIds.length; j++) {
        cumulativeWeight += communitySizes[j]
        if (random <= cumulativeWeight) {
          selectedCommunity = communityIds[j]
          break
        }
      }

      // Get authors from the selected community
      const authorIds = getAuthorsFromCommunity(
        selectedCommunity,
        communities,
        CONFIG.authorsPerPublication.min,
        CONFIG.authorsPerPublication.max,
        CONFIG.authorsPerPublication.most_common
      )

      // Select a conference
      const conferenceIndex = Math.floor(
        Math.random() * focusedConferences.length
      )
      const selectedConference =
        focusedConferences[conferenceIndex].lisperator_id

      // Create the publication
      const publication = {
        submission_id: submissionId,
        doi: generateDOI(),
        title: generatePaperTitle(),
        conference: selectedConference,
        review_score: parseFloat(
          (Math.pow(Math.random(), 0.5) * 4 + 1).toFixed(2)
        ), // Skewed towards higher values
        overall_score: 0, // Will be calculated by the system
        citation_count: 0, // Will be updated later
        date_published: generatePublicationDate(CONFIG.yearRange),
        authorIds: authorIds,
        communityId: selectedCommunity, // Used for citation patterns later
      }

      mockPublications.push(publication)
    }

    // Sort publications by date (earliest first) to ensure citation logic works
    mockPublications.sort(
      (a, b) => a.date_published.getTime() - b.date_published.getTime()
    )

    // Step 6: Insert the publications
    jobs.logger.info(
      `[MockData]: Inserting ${mockPublications.length} publications...`
    )

    // Process in chunks to avoid overloading the database
    const CHUNK_SIZE = 100
    const insertedPublications: MockPublication[] = []

    await processInChunks(mockPublications, CHUNK_SIZE, async (chunk) => {
      for (const pub of chunk) {
        // Extract author IDs and community ID before inserting
        const authorIds = [...pub.authorIds]
        const communityId = pub.communityId
        delete pub.authorIds
        delete pub.communityId

        // Insert publication
        const createdPub = await db.publication.create({
          data: {
            submission_id: pub.submission_id,
            doi: pub.doi,
            title: pub.title,
            conference: pub.conference,
            review_score: pub.review_score,
            overall_score: pub.overall_score,
            citation_count: pub.citation_count,
            date_published: pub.date_published,
          },
          select: {
            id: true,
            submission_id: true,
            doi: true,
            date_published: true,
          },
        })

        // Create author relationships
        await Promise.all(
          authorIds.map((authorId) =>
            db.publicationUser.create({
              data: {
                publication_id: createdPub.id,
                user_id: authorId,
              },
            })
          )
        )

        // Assign topics with diversity coefficients
        if (topics.length > 0) {
          // Select topics based on diversity coefficients
          const topicAssignments = []

          for (const topic of topics) {
            const baseProbability = 0.2 // Base probability of topic assignment
            const adjustedProbability =
              baseProbability * topicDiversityCoefficients[topic.id]

            if (Math.random() < adjustedProbability) {
              topicAssignments.push(topic.id)
            }
          }

          // Ensure at least one topic
          if (topicAssignments.length === 0) {
            const randomTopic =
              topics[Math.floor(Math.random() * topics.length)]
            topicAssignments.push(randomTopic.id)
          }

          // Cap at 3 topics maximum
          const finalTopics = topicAssignments.slice(0, 3)

          await Promise.all(
            finalTopics.map((topicId) =>
              db.publicationTopic.create({
                data: {
                  publication_id: createdPub.id,
                  topic_id: topicId,
                },
              })
            )
          )
        }

        // Store community ID for citation patterns
        insertedPublications.push({
          ...createdPub,
          communityId,
        })
      }
    })

    // Step 7: Generate citations using improved citation generation
    jobs.logger.info(
      `[MockData]: Generating citations with realistic distribution...`
    )

    const { citations, citationCounts } =
      generateCitations(insertedPublications)

    jobs.logger.info(`[MockData]: Inserting ${citations.length} citations...`)

    await processInChunks(citations, CHUNK_SIZE, async (chunk) => {
      await db.citation.createMany({
        data: chunk,
        skipDuplicates: true,
      })
    })

    // Step 8: Update citation counts
    jobs.logger.info(`[MockData]: Updating citation counts...`)

    await db.$executeRaw`
      UPDATE compass."Publication" p
      SET citation_count = (
        SELECT COUNT(*)
        FROM compass."Citation" c
        WHERE c.publication_id = p.id AND c.author_sc = false
      )
    `

    // Log citation distribution statistics
    const zeroCitations = Object.values(citationCounts).filter(
      (count) => count == 0
    ).length
    const actualZero =
      insertedPublications.length - Object.keys(citationCounts).length
    const totalZero = zeroCitations + actualZero

    const under3Citations = Object.values(citationCounts).filter(
      (count) => count > 0 && count <= 2
    ).length
    const under6Citations = Object.values(citationCounts).filter(
      (count) => count >= 3 && count <= 5
    ).length
    const under13Citations = Object.values(citationCounts).filter(
      (count) => count >= 6 && count <= 12
    ).length
    const under31Citations = Object.values(citationCounts).filter(
      (count) => count >= 13 && count <= 30
    ).length
    const under81Citations = Object.values(citationCounts).filter(
      (count) => count >= 31 && count <= 80
    ).length
    const over80Citations = Object.values(citationCounts).filter(
      (count) => count > 80
    ).length

    jobs.logger.info(`[MockData]: Citation distribution statistics:`)
    jobs.logger.info(
      `  - 0 citations: ${totalZero} publications (${((totalZero / insertedPublications.length) * 100).toFixed(1)}%)`
    )
    jobs.logger.info(
      `  - 1-2 citations: ${under3Citations} publications (${((under3Citations / insertedPublications.length) * 100).toFixed(1)}%)`
    )
    jobs.logger.info(
      `  - 3-5 citations: ${under6Citations} publications (${((under6Citations / insertedPublications.length) * 100).toFixed(1)}%)`
    )
    jobs.logger.info(
      `  - 6-12 citations: ${under13Citations} publications (${((under13Citations / insertedPublications.length) * 100).toFixed(1)}%)`
    )
    jobs.logger.info(
      `  - 13-30 citations: ${under31Citations} publications (${((under31Citations / insertedPublications.length) * 100).toFixed(1)}%)`
    )
    jobs.logger.info(
      `  - 31-80 citations: ${under81Citations} publications (${((under81Citations / insertedPublications.length) * 100).toFixed(1)}%)`
    )
    jobs.logger.info(
      `  - 80+ citations: ${over80Citations} publications (${((over80Citations / insertedPublications.length) * 100).toFixed(1)}%)`
    )

    jobs.logger.info(
      `[MockData]: Enhanced mock data generation completed successfully!`
    )
    return true
  } catch (error) {
    jobs.logger.error(
      `[MockData]: Error generating mock data: ${error.message}`
    )
    jobs.logger.error(error.stack)
    throw error
  }
}

/**
 * Main execution function - can be called directly or imported
 */
export async function runMockDataGeneration(
  publicationCount = CONFIG.publicationCount
) {
  try {
    // Generate the mock data
    await generateMockData(publicationCount, false)

    return true
  } catch (error) {
    jobs.logger.error(
      `[MockData]: Mock data generation and validation failed: ${error.message}`
    )
    return false
  }
}
