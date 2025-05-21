// src/lib/validation/validateSnapshots.ts

import { db } from 'src/lib/db'
import { jobs } from 'src/lib/jobs'

export async function validateSnapshots(validationData) {
  jobs.logger.info('[Validation] Validating snapshot creation...')

  // Check for publication snapshots
  const publicationSnapshots = await db.publicationSnapshot.findMany({
    where: {
      publication_id: {
        in: validationData.publications,
      },
    },
    orderBy: {
      snapshot_date: 'desc',
    },
  })

  const hasPublicationSnapshots = publicationSnapshots.length > 0
  jobs.logger.info(
    `[Validation] Publication snapshots: ${hasPublicationSnapshots ? 'FOUND ✓' : 'MISSING ✗'} (${publicationSnapshots.length} snapshots)`
  )

  if (hasPublicationSnapshots) {
    // Log sample of publication snapshots
    publicationSnapshots.slice(0, 3).forEach((snapshot, idx) => {
      jobs.logger.info(
        `[Validation] Publication snapshot ${idx + 1}: publication_id=${snapshot.publication_id}, date=${snapshot.snapshot_date.toISOString()}, value=${snapshot.value}`
      )
    })
  }

  // Check for user overall snapshots
  const userOverallSnapshots = await db.userOverallSnapshot.findMany({
    where: {
      user_id: {
        in: validationData.authors,
      },
    },
    orderBy: {
      snapshot_date: 'desc',
    },
    take: 10,
  })

  const hasUserOverallSnapshots = userOverallSnapshots.length > 0
  jobs.logger.info(
    `[Validation] User overall snapshots: ${hasUserOverallSnapshots ? 'FOUND ✓' : 'MISSING ✗'} (${userOverallSnapshots.length} snapshots)`
  )

  if (hasUserOverallSnapshots) {
    // Log sample of user overall snapshots
    userOverallSnapshots.slice(0, 3).forEach((snapshot, idx) => {
      jobs.logger.info(
        `[Validation] User overall snapshot ${idx + 1}: user_id=${snapshot.user_id}, date=${snapshot.snapshot_date.toISOString()}, value=${snapshot.mean_value}`
      )
    })
  }

  // Check for user topic snapshots
  const userTopicSnapshots = await db.userTopicSnapshot.findMany({
    where: {
      user_id: {
        in: validationData.authors,
      },
      topic_id: validationData.topicId,
    },
    orderBy: {
      snapshot_date: 'desc',
    },
    take: 10,
  })

  const hasUserTopicSnapshots = userTopicSnapshots.length > 0
  jobs.logger.info(
    `[Validation] User topic snapshots: ${hasUserTopicSnapshots ? 'FOUND ✓' : 'MISSING ✗'} (${userTopicSnapshots.length} snapshots)`
  )

  if (hasUserTopicSnapshots) {
    // Log sample of user topic snapshots
    userTopicSnapshots.slice(0, 3).forEach((snapshot, idx) => {
      jobs.logger.info(
        `[Validation] User topic snapshot ${idx + 1}: user_id=${snapshot.user_id}, topic_id=${snapshot.topic_id}, date=${snapshot.snapshot_date.toISOString()}, value=${snapshot.mean_value}`
      )
    })
  }

  // Check for topic snapshots
  const topicSnapshots = await db.topicSnapshot.findMany({
    where: {
      topic_id: validationData.topicId,
    },
    orderBy: {
      snapshot_date: 'desc',
    },
  })

  const hasTopicSnapshots = topicSnapshots.length > 0
  jobs.logger.info(
    `[Validation] Topic snapshots: ${hasTopicSnapshots ? 'FOUND ✓' : 'MISSING ✗'} (${topicSnapshots.length} snapshots)`
  )

  if (hasTopicSnapshots) {
    // Log sample of topic snapshots
    topicSnapshots.slice(0, 3).forEach((snapshot, idx) => {
      jobs.logger.info(
        `[Validation] Topic snapshot ${idx + 1}: topic_id=${snapshot.topic_id}, date=${snapshot.snapshot_date.toISOString()}, value=${snapshot.mean_value}`
      )
    })
  }

  // Validate snapshot values for publications
  let publicationValuesCorrect = true
  for (const pub of publicationSnapshots.slice(0, 5)) {
    // Check just a few to avoid excessive logging
    // Find the corresponding publication
    const publication = await db.publication.findUnique({
      where: { id: pub.publication_id },
    })

    // The snapshot value should match the publication's overall_score
    // Allow small rounding differences
    // In validateSnapshots.ts
    // Change this line to allow for small differences:
    const valueMatch =
      Math.abs(Number(pub.value) - Number(publication.overall_score)) < 0.1

    if (!valueMatch) {
      publicationValuesCorrect = false
      jobs.logger.error(
        `[Validation] Snapshot value mismatch for publication ${pub.publication_id}: snapshot=${pub.value}, publication=${publication.overall_score}`
      )
    }
  }

  // Overall validation result
  const snapshotsValid =
    hasPublicationSnapshots &&
    hasUserOverallSnapshots &&
    hasUserTopicSnapshots &&
    hasTopicSnapshots &&
    publicationValuesCorrect

  jobs.logger.info(
    `[Validation] Snapshot validation result: ${snapshotsValid ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] Publication snapshots: ${hasPublicationSnapshots ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] User overall snapshots: ${hasUserOverallSnapshots ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] User topic snapshots: ${hasUserTopicSnapshots ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] Topic snapshots: ${hasTopicSnapshots ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] Publication snapshot values: ${publicationValuesCorrect ? 'PASSED ✓' : 'FAILED ✗'}`
  )

  return snapshotsValid
}
