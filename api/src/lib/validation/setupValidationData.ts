// src/lib/validation/setupValidationData.ts - with conference values preserved

import { db } from 'src/lib/db'
import { jobs } from 'src/lib/jobs'

export async function setupValidationEnvironment() {
  jobs.logger.info('[Validation] Setting up expanded validation environment...')

  // Record initial state for comparison
  const initialState = {
    users: await db.user.count(),
    publications: await db.publication.count(),
    citations: await db.citation.count(),
    events: await db.event.count(),
    topics: await db.topic.count(),
  }

  jobs.logger.info(
    `[Validation] Initial state: ${JSON.stringify(initialState)}`
  )

  // Create topics if none exist
  const topicsExist = (await db.topic.count()) > 0
  let topicIds = [1]

  if (!topicsExist) {
    jobs.logger.info(
      '[Validation] No topics found. Creating validation topics...'
    )

    // Create basic topics for validation
    await db.$executeRaw`
      INSERT INTO compass."Topic"(id, name)
      VALUES
        (1, 'Machine Learning'),
        (2, 'Networking'),
        (3, 'Security'),
        (9, 'Other')
      ON CONFLICT (id) DO NOTHING
    `

    jobs.logger.info('[Validation] Created basic topics for validation')
    topicIds = [1, 2] // Use two topics
  } else {
    // Find two valid topic IDs
    const topics = await db.topic.findMany({
      take: 2,
      orderBy: { id: 'asc' },
    })

    if (topics.length >= 2) {
      topicIds = [topics[0].id, topics[1].id]
      jobs.logger.info(
        `[Validation] Using existing topics with ids: ${topicIds.join(', ')}`
      )
    } else if (topics.length === 1) {
      topicIds = [topics[0].id, 9] // Use topic 9 (Other) as fallback
      jobs.logger.info(
        `[Validation] Using existing topic with id: ${topicIds[0]} and 'Other' (9)`
      )
    } else {
      throw new Error(
        '[Validation] Topic count is > 0 but no topics could be found'
      )
    }
  }

  // Create a unique test namespace for this validation run
  const testNamespace = `validation_${Date.now()}`
  jobs.logger.info(`[Validation] Using test namespace: ${testNamespace}`)

  // Select existing users - INCREASED from 3 to 10
  const existingUsers = await db.user.findMany({
    take: 10,
    orderBy: { id: 'asc' },
    select: { id: true, lisperator_id: true },
  })

  if (existingUsers.length < 10) {
    jobs.logger.warn(
      `[Validation] Found only ${existingUsers.length} users, proceeding with available users.`
    )
  }

  const authorIds = existingUsers.map((u) => u.id)
  jobs.logger.info(
    `[Validation] Selected ${authorIds.length} existing users: ${authorIds.join(', ')}`
  )

  // SPECIFIC CONFERENCE SELECTION
  // We need to find conference with lisperator_id 21 exactly for compatibility
  // and two other conferences for the expanded dataset
  const conferenceId21 = await db.event.findUnique({
    where: { lisperator_id: 21 },
    select: { id: true, lisperator_id: true },
  })

  if (!conferenceId21) {
    throw new Error(
      '[Validation] Could not find conference with lisperator_id 21, which is required for validation'
    )
  }

  // Find two other conferences that are not the one with lisperator_id 21
  const otherConferences = await db.event.findMany({
    where: { lisperator_id: { not: 21 } },
    take: 2,
    orderBy: { id: 'asc' },
    select: { id: true, lisperator_id: true },
  })

  if (otherConferences.length < 2) {
    jobs.logger.warn(
      `[Validation] Could only find ${otherConferences.length} additional conferences, proceeding with available conferences.`
    )
  }

  // Combine conferences, with the special one first
  const allConferences = [conferenceId21, ...otherConferences]
  jobs.logger.info(
    `[Validation] Selected conferences with lisperator_ids: ${allConferences.map((c) => c.lisperator_id).join(', ')}`
  )

  // Reset h-index values for our test users
  for (const userId of authorIds) {
    await db.user.update({
      where: { id: userId },
      data: { h_index: 0 },
    })
    jobs.logger.info(`[Validation] Reset h_index to 0 for user: ${userId}`)
  }

  // Reset conference values
  for (const conference of allConferences) {
    await db.event.update({
      where: { id: conference.id },
      data: { conference_value: 0 },
    })
    jobs.logger.info(
      `[Validation] Reset conference_value to 0 for conference: ${conference.lisperator_id}`
    )
  }

  // Map conference lisperator_ids for easy reference
  const conferenceIds = allConferences.map((c) => c.lisperator_id)

  // Store the special conference ID separately (this will be used in validation)
  const mainConferenceId = conferenceId21.lisperator_id

  // EXPANDED DATASET: Create test publications with precisely controlled citation patterns
  // CRITICAL: All original publications (first 6) must use the special conference with lisperator_id 21
  //          to ensure its value remains exactly 1.0
  const publicationData = [
    // ORIGINAL DATA SET - All using the FIRST conference (with lisperator_id 21)
    { authorIndex: 0, citationCount: 3, conferenceIndex: 0, topicIndex: 0 },
    { authorIndex: 0, citationCount: 2, conferenceIndex: 0, topicIndex: 0 },
    { authorIndex: 0, citationCount: 0, conferenceIndex: 0, topicIndex: 0 },
    { authorIndex: 1, citationCount: 1, conferenceIndex: 0, topicIndex: 0 },
    { authorIndex: 1, citationCount: 0, conferenceIndex: 0, topicIndex: 0 },
    { authorIndex: 2, citationCount: 0, conferenceIndex: 0, topicIndex: 0 },

    // ADDITIONAL DATA - All using SECOND and THIRD conferences (NOT lisperator_id 21)
    // User with h-index 4 (user at index 3 if available)
    { authorIndex: 3, citationCount: 4, conferenceIndex: 1, topicIndex: 1 },
    { authorIndex: 3, citationCount: 4, conferenceIndex: 1, topicIndex: 1 },
    { authorIndex: 3, citationCount: 4, conferenceIndex: 1, topicIndex: 1 },
    { authorIndex: 3, citationCount: 4, conferenceIndex: 1, topicIndex: 1 },
    { authorIndex: 3, citationCount: 2, conferenceIndex: 1, topicIndex: 1 }, // 5th paper with fewer citations

    // Additional publications distributed across users and topics (but NOT using conference with lisperator_id 21)
    { authorIndex: 4, citationCount: 3, conferenceIndex: 1, topicIndex: 0 },
    { authorIndex: 4, citationCount: 2, conferenceIndex: 1, topicIndex: 0 },
    { authorIndex: 5, citationCount: 3, conferenceIndex: 2, topicIndex: 1 },
    { authorIndex: 5, citationCount: 1, conferenceIndex: 2, topicIndex: 1 },
    { authorIndex: 6, citationCount: 2, conferenceIndex: 2, topicIndex: 0 },
    { authorIndex: 7, citationCount: 1, conferenceIndex: 2, topicIndex: 1 },
    { authorIndex: 8, citationCount: 1, conferenceIndex: 2, topicIndex: 0 },
    { authorIndex: 9, citationCount: 0, conferenceIndex: 2, topicIndex: 1 },
    { authorIndex: 3, citationCount: 0, conferenceIndex: 2, topicIndex: 0 },
  ]

  // Handle the case where we don't have all conferences or users
  const actualPublicationData = publicationData.filter(
    (pub) =>
      pub.authorIndex < authorIds.length &&
      pub.conferenceIndex < conferenceIds.length &&
      pub.topicIndex < topicIds.length
  )

  const testPublications = []
  let submissionIdCounter = 7000001

  // Find max submission_id to avoid conflicts
  const maxSubmissionResult = await db.publication.aggregate({
    _max: { submission_id: true },
  })
  if (maxSubmissionResult._max && maxSubmissionResult._max.submission_id) {
    submissionIdCounter = maxSubmissionResult._max.submission_id + 1000
  }

  // UNCHANGED: Use recent dates for our test publications
  // Calculate recent dates for our test publications
  const now = new Date()

  // Create publications with staggered recent dates - EXPANDED for more publications
  const publicationDates = [
    // Original dates for the first 6 publications - DO NOT CHANGE
    new Date(
      now.getTime() - 15 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 15 months ago
    new Date(
      now.getTime() - 13 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 13 months ago
    new Date(
      now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 12 months ago (1 year)
    new Date(
      now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 11 months ago
    new Date(
      now.getTime() - 10 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 10 months ago
    new Date(
      now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 9 months ago

    // Additional dates for the new publications
    new Date(
      now.getTime() - 8 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 8 months ago
    new Date(
      now.getTime() - 7 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 7 months ago
    new Date(
      now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 6 months ago
    new Date(
      now.getTime() - 5 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 5 months ago
    new Date(
      now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 4 months ago
    new Date(
      now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 3 months ago
    new Date(
      now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 2 months ago
    new Date(
      now.getTime() - 1 * 30 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
    ), // 1 month ago
    new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  ]

  for (const [index, data] of actualPublicationData.entries()) {
    // Use the appropriate date for this publication
    const pubDate = publicationDates[index % publicationDates.length]

    // Map the conference index to the actual conference ID from our list
    const conferenceId =
      conferenceIds[data.conferenceIndex % conferenceIds.length]

    // Select the topic based on the provided index
    const topicId = topicIds[data.topicIndex % topicIds.length]

    const pub = await db.publication.create({
      data: {
        submission_id: submissionIdCounter++,
        doi: `10.9999/${testNamespace}-pub-${index + 1}`,
        title: `${testNamespace} Publication ${index + 1}`,
        conference: conferenceId,
        review_score: 4.0, // Fixed value for predictability
        overall_score: 0, // Will be calculated
        citation_count: 0, // Will be updated based on citations
        date_published: pubDate,
      },
    })

    // Link to author
    await db.publicationUser.create({
      data: {
        publication_id: pub.id,
        user_id: authorIds[data.authorIndex % authorIds.length],
      },
    })

    // Add to topics
    await db.publicationTopic.create({
      data: {
        publication_id: pub.id,
        topic_id: topicId,
      },
    })

    testPublications.push(pub)

    // Generate citations
    for (let i = 0; i < data.citationCount; i++) {
      let citationDate

      // KEEP ORIGINAL CITATION DATES for the first 6 publications
      if (index === 0) {
        // First publication (id 1)
        if (i === 0) citationDate = new Date('2024-11-30T12:17:02.754Z')
        else if (i === 1) citationDate = new Date('2024-08-26T19:54:44.806Z')
        else if (i === 2) citationDate = new Date('2024-10-02T05:36:25.673Z')
        else
          citationDate = new Date(pubDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (index === 1) {
        // Second publication (id 2)
        if (i === 0) citationDate = new Date('2024-09-25T03:42:25.978Z')
        else if (i === 1) citationDate = new Date('2024-06-25T05:51:06.145Z')
        else
          citationDate = new Date(pubDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (index === 3 && i === 0) {
        // Fourth publication (id 4) - single citation
        citationDate = new Date('2025-01-22T04:02:57.224Z')
      } else {
        // For new publications, use more recent dates for citations to ensure they count
        const minCitationTime = pubDate.getTime() + 7 * 24 * 60 * 60 * 1000 // Min 1 week after publication
        const maxCitationTime = now.getTime() - 2 * 24 * 60 * 60 * 1000 // Max 2 days ago

        // Ensure max is actually after min
        const actualMaxTime = Math.max(minCitationTime, maxCitationTime)

        // For newer publications, use more recent citation dates
        citationDate = new Date(
          minCitationTime + Math.random() * (actualMaxTime - minCitationTime)
        )
      }

      await db.citation.create({
        data: {
          publication_id: pub.id,
          oci: `${testNamespace}-citation-${pub.id}-${i}`,
          citing: `10.9999/${testNamespace}-citing-${i}`,
          creation_date: citationDate,
          author_sc: false, // Not a self-citation
        },
      })
    }

    jobs.logger.info(
      `[Validation] Created test publication: id=${pub.id}, author=${authorIds[data.authorIndex % authorIds.length]}, expected_citations=${data.citationCount}, date=${pubDate.toISOString()}, conference=${conferenceId}, topic=${topicId}`
    )
  }

  // Log conference distribution
  const conferencePublicationCounts = {}
  for (const confId of conferenceIds) {
    conferencePublicationCounts[confId] = testPublications.filter(
      (pub) => pub.conference === confId
    ).length
  }

  jobs.logger.info(
    `[Validation] Conference publication distribution: ${JSON.stringify(conferencePublicationCounts)}`
  )

  // Calculate expected h-indexes for our test dataset
  const expectedHindexes = []

  // Calculate for each author
  for (let authorIdx = 0; authorIdx < authorIds.length; authorIdx++) {
    // Get all publications for this author with their citation counts
    const authorPubs = actualPublicationData
      .filter((pub) => pub.authorIndex === authorIdx)
      .map((pub) => pub.citationCount)
      .sort((a, b) => b - a) // Sort in descending order

    // Calculate h-index
    let hIndex = 0
    for (let i = 0; i < authorPubs.length; i++) {
      if (authorPubs[i] >= i + 1) {
        hIndex = i + 1
      } else {
        break
      }
    }

    expectedHindexes.push(hIndex)
  }

  jobs.logger.info(
    `[Validation] Expected h-indexes: ${expectedHindexes.join(', ')}`
  )

  // Record identifiers for validation
  const validationData = {
    namespace: testNamespace,
    authors: authorIds,
    conference: mainConferenceId, // IMPORTANT: Use the special conference with lisperator_id 21
    conferences: conferenceIds,
    publications: testPublications.map((p) => p.id),
    topicIds: topicIds,
    topicId: topicIds[0], // For backward compatibility
    expectedHindexes: expectedHindexes,
    initialState,
    publicationData: actualPublicationData,
  }

  jobs.logger.info(
    `[Validation] Expanded test environment setup complete with ${testPublications.length} publications, ${authorIds.length} users, ${conferenceIds.length} conferences, and ${topicIds.length} topics`
  )
  jobs.logger.info(
    `[Validation] The validation will use conference with lisperator_id=${mainConferenceId} which should maintain its value of 1.0`
  )

  return validationData
}
