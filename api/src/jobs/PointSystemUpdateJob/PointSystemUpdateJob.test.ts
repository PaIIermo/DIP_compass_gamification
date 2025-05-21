jest.mock('src/lib/db', () => ({
  db: {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn((fn) => Promise.resolve()),
    publication: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, doi: '10.1234/test', citation_count: 5 },
        { id: 2, doi: '10.9999/mock-123', citation_count: 0 },
      ]),
      update: jest.fn(),
    },
    citation: {
      createMany: jest.fn(),
    },
  },
}))

jest.mock('src/lib/dbOperations', () => ({
  buildUserMap: jest.fn().mockResolvedValue({}),
  recalculateAllMetrics: jest.fn().mockResolvedValue(new Date()),
  insertAuthors: jest.fn(),
  insertTopics: jest.fn(),
}))

jest.mock('src/lib/jobs', () => ({
  jobs: {
    createJob: jest.fn((config) => config),
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  },
  later: jest.fn(),
}))

jest.mock(
  '../PointSystemInitializationJob/PointSystemInitializationJob',
  () => ({
    schedulePointSystemUpdate: jest.fn(),
  })
)

jest.mock('src/lib/utils', () => ({
  extractDoi: jest.fn((doi) => doi),
  fetchCitationsListWithRetriesAndVerification: jest.fn().mockResolvedValue([]),
  createRateLimiter: jest.fn(() => ({
    limiter: {
      schedule: jest.fn((fn) => Promise.resolve(fn())),
      stop: jest.fn(),
    },
    trackResult: jest.fn(),
    shouldAbort: jest.fn().mockReturnValue(false),
    abort: jest.fn(),
  })),
}))

// Import the job under test

// Import the mocked dependencies AFTER they've been mocked
const { db } = require('src/lib/db')
const {
  recalculateAllMetrics,
  insertAuthors,
  insertTopics,
} = require('src/lib/dbOperations')
const { jobs, later } = require('src/lib/jobs')
const {
  fetchCitationsListWithRetriesAndVerification,
  extractDoi,
  createRateLimiter,
} = require('src/lib/utils')

const {
  schedulePointSystemUpdate,
} = require('../PointSystemInitializationJob/PointSystemInitializationJob')

const { PointSystemUpdateJob } = require('./PointSystemUpdateJob')

describe('PointSystemUpdateJob', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have the expected structure', () => {
    expect(PointSystemUpdateJob).toBeDefined()
    expect(PointSystemUpdateJob.queue).toBe('default')
    expect(typeof PointSystemUpdateJob.perform).toBe('function')
  })

  it('should process publications and call recalculateAllMetrics', async () => {
    await PointSystemUpdateJob.perform({})

    // Verify buildUserMap and recalculateAllMetrics were called
    expect(recalculateAllMetrics).toHaveBeenCalled()
    expect(schedulePointSystemUpdate).toHaveBeenCalled()
  })

  it('should skip mock publications', async () => {
    await PointSystemUpdateJob.perform({})

    // Verify fetchCitations was not called with the mock DOI
    expect(
      fetchCitationsListWithRetriesAndVerification
    ).not.toHaveBeenCalledWith('10.9999/mock-123')
  })

  it('should include current snapshot when updateScheduleMode is immediate', async () => {
    await PointSystemUpdateJob.perform({ updateScheduleMode: 'immediate' })

    // Verify recalculateAllMetrics was called with includeCurrentSnapshot: true
    expect(recalculateAllMetrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeCurrentSnapshot: true })
    )
  })

  it('should handle errors gracefully', async () => {
    // Force an error
    db.publication.findMany.mockRejectedValueOnce(new Error('Test error'))

    await PointSystemUpdateJob.perform({})

    // Error should be logged and retry scheduled
    expect(jobs.logger.error).toHaveBeenCalled()
    expect(later).toHaveBeenCalled()
  })

  // =================== NEW TESTS TO ADD ======================

  it('should process new publications correctly', async () => {
    // Mock finding no existing publications for cleaner test
    db.publication.findMany.mockResolvedValueOnce([])

    // Mock new publications found in the database
    const newPub = {
      submission_id: 999,
      doi: '10.1234/new',
      title: 'New Paper',
      conference: 'TestConf',
      author_userids: ['1', '2'],
      review_score: 4.5,
      date_published: new Date(),
    }

    db.$queryRaw.mockResolvedValueOnce([newPub])

    // Mock citation fetching to return 1 citation
    const mockCitation = {
      oci: 'oci1',
      citing: 'doi1',
      creation: '2023-01-01',
      author_sc: 'no',
    }
    fetchCitationsListWithRetriesAndVerification.mockResolvedValueOnce([
      mockCitation,
    ])

    // Mock transaction to simulate insertion
    db.$transaction.mockImplementationOnce(async (callback) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 3 }]), // New publication ID
        citation: { createMany: jest.fn() },
        publication: { update: jest.fn() },
      }
      return callback(tx)
    })

    // Run the update job
    await PointSystemUpdateJob.perform({})

    // Verify citation fetch was called for the new publication
    expect(fetchCitationsListWithRetriesAndVerification).toHaveBeenCalledWith(
      '10.1234/new'
    )

    // Verify metrics were recalculated after processing
    expect(recalculateAllMetrics).toHaveBeenCalled()
  })

  it('should update citation counts for existing publications', async () => {
    // Create a single existing publication to simplify test
    const mockExistingPub = { id: 1, doi: '10.1234/test', citation_count: 5 }
    db.publication.findMany.mockResolvedValueOnce([mockExistingPub])

    // Mock that no new publications are found
    db.$queryRaw.mockResolvedValueOnce([])

    // Mock finding 3 citations (including new ones)
    const mockCitations = [
      { oci: 'oci1', citing: 'doi1', creation: '2023-01-01', author_sc: 'no' },
      { oci: 'oci2', citing: 'doi2', creation: '2023-02-01', author_sc: 'no' },
      { oci: 'oci3', citing: 'doi3', creation: '2023-03-01', author_sc: 'no' },
    ]
    fetchCitationsListWithRetriesAndVerification.mockResolvedValueOnce(
      mockCitations
    )

    // Mock the transaction to update citation count
    let capturedUpdateData = null

    db.$transaction.mockImplementationOnce(async (callback) => {
      const tx = {
        $executeRaw: jest.fn(), // For inserting citations
        $queryRaw: jest.fn().mockResolvedValueOnce([{ new_count: 8 }]), // 3 new citations found
        publication: {
          update: jest.fn().mockImplementation(({ data }) => {
            capturedUpdateData = data
            return { ...mockExistingPub, ...data }
          }),
        },
      }
      return callback(tx)
    })

    // Run the update job
    await PointSystemUpdateJob.perform({})

    // Verify transaction was used to update citations
    expect(db.$transaction).toHaveBeenCalled()

    // And recalculate was called after updates
    expect(recalculateAllMetrics).toHaveBeenCalled()
  })

  it('should handle consecutive API failures', async () => {
    // Setup two real publications
    const realPubs = [
      { id: 1, doi: '10.1234/test1', citation_count: 5 },
      { id: 2, doi: '10.1234/test2', citation_count: 3 },
    ]
    db.publication.findMany.mockResolvedValueOnce(realPubs)

    // Mock that no new publications are found
    db.$queryRaw.mockResolvedValueOnce([])

    // Set up mock for createRateLimiter to simulate maximum failures
    const mockLimiter = {
      schedule: jest.fn().mockImplementation(async (fn) => {
        // Simulate a failure at the processing level
        throw new Error('Too many failures – aborting batch')
      }),
      stop: jest.fn().mockResolvedValue(undefined),
    }

    createRateLimiter.mockReturnValueOnce({
      limiter: mockLimiter,
      trackResult: jest.fn(),
      shouldAbort: jest.fn().mockReturnValue(true), // Force shouldAbort to return true
      abort: jest.fn(),
    })

    // Run the update job
    await PointSystemUpdateJob.perform({})

    // Verify error handling with the correct error message that occurs in the catch block
    expect(jobs.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[UpdateJob]: Stopped early')
    )

    // Verify retry was scheduled after error
    expect(later).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'PointSystemUpdateJob' }),
      expect.any(Array),
      expect.objectContaining({ wait: 3600 }) // 1-hour retry
    )
  })

  it('should correctly handle different snapshot frequencies', async () => {
    // Short-circuit findMany and $queryRaw for simplicity
    db.publication.findMany.mockResolvedValueOnce([])
    db.$queryRaw.mockResolvedValueOnce([])

    // Test with quarterly frequency
    await PointSystemUpdateJob.perform({
      snapshotFrequency: 'quarterly',
    })

    // Verify recalculateAllMetrics was called with right parameters
    expect(recalculateAllMetrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        snapshotFrequency: 'quarterly',
      })
    )

    // Verify update was scheduled with same frequency
    expect(schedulePointSystemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotFrequency: 'quarterly',
      })
    )
  })
})
