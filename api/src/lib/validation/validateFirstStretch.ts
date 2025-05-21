// src/lib/validation/validateFirstStretch.ts
import { db } from 'src/lib/db'
import { jobs } from 'src/lib/jobs'

export async function validateFirstStretch(validationData) {
  // Validate h-index calculations
  jobs.logger.info('[Validation] Validating h-index calculations...')

  let hIndexCorrect = true
  for (let i = 0; i < validationData.authors.length; i++) {
    const user = await db.user.findUnique({
      where: { id: validationData.authors[i] },
    })

    const expectedHindex = validationData.expectedHindexes[i]
    const actualHindex = user.h_index

    const isCorrect = expectedHindex === actualHindex
    hIndexCorrect = hIndexCorrect && isCorrect

    jobs.logger.info(
      `[Validation] Author ${i + 1}: expected h-index=${expectedHindex}, actual=${actualHindex}, ${isCorrect ? '✓' : '✗'}`
    )

    if (!isCorrect) {
      jobs.logger.error(
        `[Validation] H-index calculation error for author ${i + 1}`
      )

      // Debug: Get publication counts for this author
      const authorPublications = await db.publicationUser.findMany({
        where: { user_id: user.id },
        include: {
          Publication: {
            include: {
              Citations: true,
            },
          },
        },
      })

      // Log publications and their citation counts
      authorPublications.forEach((pub, idx) => {
        jobs.logger.info(
          `[Validation] Publication ${idx + 1}: id=${pub.Publication.id}, citations=${pub.Publication.Citations.length}`
        )
      })
    }
  }

  // Validate conference value calculation
  jobs.logger.info('[Validation] Validating conference value calculation...')

  const conference = await db.event.findUnique({
    where: { lisperator_id: validationData.conference },
  })

  // Expected conference value: average of author h-indexes
  // [2, 1, 0] => (2 + 1 + 0) / 3 = 1
  const expectedConferenceValue = 1
  const actualConferenceValue = Number(conference.conference_value)

  const conferenceValueCorrect =
    Math.abs(actualConferenceValue - expectedConferenceValue) < 0.001

  jobs.logger.info(
    `[Validation] Conference value: expected=${expectedConferenceValue}, actual=${actualConferenceValue}, ${conferenceValueCorrect ? '✓' : '✗'}`
  )

  if (!conferenceValueCorrect) {
    jobs.logger.error('[Validation] Conference value calculation error')

    // Debug: Get all authors for this conference
    const conferenceAuthors = await db.publicationUser.findMany({
      where: {
        Publication: {
          conference: validationData.conference,
        },
      },
      include: {
        User: true,
      },
      distinct: ['user_id'],
    })

    // Log authors and their h-indexes
    conferenceAuthors.forEach((author, idx) => {
      jobs.logger.info(
        `[Validation] Conference author ${idx + 1}: id=${author.User.id}, h_index=${author.User.h_index}`
      )
    })
  }

  // Publication citation counts should be updated
  jobs.logger.info('[Validation] Validating publication citation counts...')

  let citationCountsCorrect = true
  for (let i = 0; i < validationData.publications.length; i++) {
    const pub = await db.publication.findUnique({
      where: { id: validationData.publications[i] },
      include: {
        Citations: {
          where: {
            author_sc: false,
          },
        },
      },
    })

    const expectedCitationIndex = i % validationData.publicationData.length
    const expectedCitationCount =
      validationData.publicationData[expectedCitationIndex].citationCount
    const actualCitationCount = pub.citation_count

    const isCorrect = expectedCitationCount === actualCitationCount
    citationCountsCorrect = citationCountsCorrect && isCorrect

    jobs.logger.info(
      `[Validation] Publication ${i + 1}: expected citations=${expectedCitationCount}, actual=${actualCitationCount}, ${isCorrect ? '✓' : '✗'}`
    )

    if (!isCorrect) {
      jobs.logger.error(
        `[Validation] Citation count error for publication ${i + 1}`
      )
      jobs.logger.info(`[Validation] Citations in DB: ${pub.Citations.length}`)
    }
  }

  // Report overall validation results for this stretch
  const firstStretchValid =
    hIndexCorrect && conferenceValueCorrect && citationCountsCorrect

  jobs.logger.info(
    `[Validation] First stretch validation result: ${firstStretchValid ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] H-index calculations: ${hIndexCorrect ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] Conference value: ${conferenceValueCorrect ? 'PASSED ✓' : 'FAILED ✗'}`
  )
  jobs.logger.info(
    `[Validation] Citation counts: ${citationCountsCorrect ? 'PASSED ✓' : 'FAILED ✗'}`
  )

  return firstStretchValid
}
