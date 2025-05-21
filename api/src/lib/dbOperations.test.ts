// dbOperations.test.ts
import { db } from 'src/lib/db'
import {
  buildUserMap,
  insertAuthors,
  insertTopics,
  recalculateAllMetrics,
} from 'src/lib/dbOperations'
import {
  calculateUserHIndex,
  calculateConferenceValue,
  calculateCitationScoresAndDecay,
} from 'src/lib/pointSystemCalculations'
import { smartSnapshotGenerator } from 'src/lib/snapshotGeneration'

// Mock dependencies
jest.mock('src/lib/db', () => ({
  db: {
    user: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    event: {
      updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}))

jest.mock('src/lib/jobs', () => ({
  jobs: {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
    },
  },
}))

jest.mock('src/lib/pointSystemCalculations', () => ({
  calculateUserHIndex: jest.fn(),
  calculateConferenceValue: jest.fn(),
  calculateCitationScoresAndDecay: jest.fn(),
}))

jest.mock('src/lib/snapshotGeneration', () => ({
  smartSnapshotGenerator: jest.fn(),
}))

jest.mock('src/lib/utils', () => ({
  processInChunks: jest.fn((data, chunkSize, callback) =>
    Promise.resolve(callback(data))
  ),
}))

describe('dbOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('buildUserMap', () => {
    it('should create a map of lisperator_id to real user id', async () => {
      // Mock findMany to return sample data
      const mockUsers = [
        { id: 101, lisperator_id: 1 },
        { id: 102, lisperator_id: 2 },
        { id: 103, lisperator_id: 3 },
      ]
      ;(db.user.findMany as jest.Mock).mockResolvedValue(mockUsers)

      const result = await buildUserMap()

      // Verify the map contains the expected mappings
      expect(result.size).toBe(3)
      expect(result.get(1)).toBe(101)
      expect(result.get(2)).toBe(102)
      expect(result.get(3)).toBe(103)

      // Verify the db was called correctly
      expect(db.user.findMany).toHaveBeenCalledWith({
        select: { id: true, lisperator_id: true },
      })
    })

    it('should handle empty results', async () => {
      ;(db.user.findMany as jest.Mock).mockResolvedValue([])

      const result = await buildUserMap()

      expect(result.size).toBe(0)
    })
  })

  describe('insertAuthors', () => {
    it('should insert authors with mapped user IDs', async () => {
      // Mock transaction client
      const mockTx = {
        publicationUser: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      }

      // Mock user map
      const userMap = new Map([
        [1, 101], // lisperator_id 1 -> real ID 101
        [2, 102],
        [3, 103],
      ])

      await insertAuthors(mockTx as any, 999, [1, 2, 4], userMap)

      // Should only insert mapped users (1->101, 2->102), not 4 (no mapping)
      expect(mockTx.publicationUser.createMany).toHaveBeenCalledWith({
        data: [
          { publication_id: 999, user_id: 101 },
          { publication_id: 999, user_id: 102 },
        ],
        skipDuplicates: true,
      })
    })

    it('should not call createMany if no valid authors', async () => {
      const mockTx = {
        publicationUser: {
          createMany: jest.fn(),
        },
      }

      const userMap = new Map([
        [1, 101],
        [2, 102],
      ])

      // No valid author IDs (3 is not in userMap)
      await insertAuthors(mockTx as any, 999, [3], userMap)

      // Should not attempt to create rows
      expect(mockTx.publicationUser.createMany).not.toHaveBeenCalled()
    })
  })

  describe('recalculateAllMetrics', () => {
    it('should call calculation functions in the correct order', async () => {
      const mockLogger = { info: jest.fn() }

      await recalculateAllMetrics(mockLogger)

      // Verify functions called in correct order
      const calculateHIndexCall = (calculateUserHIndex as jest.Mock).mock
        .invocationCallOrder[0]
      const calculateConferenceValueCall = (
        calculateConferenceValue as jest.Mock
      ).mock.invocationCallOrder[0]
      const calculateCitationScoresCall = (
        calculateCitationScoresAndDecay as jest.Mock
      ).mock.invocationCallOrder[0]
      const smartSnapshotCall = (smartSnapshotGenerator as jest.Mock).mock
        .invocationCallOrder[0]

      expect(calculateHIndexCall).toBeLessThan(calculateConferenceValueCall)
      expect(calculateConferenceValueCall).toBeLessThan(
        calculateCitationScoresCall
      )
      expect(calculateCitationScoresCall).toBeLessThan(smartSnapshotCall)

      // Verify logger was used
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calculating h-index for each user...'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calculating conference value...'
      )
    })

    it('should update EAI membership when isInitialization is true', async () => {
      const mockLogger = { info: jest.fn() }

      await recalculateAllMetrics(mockLogger, { isInitialization: true })

      // Check EAI membership update was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Updating EAI membership status...'
      )
    })

    it('should pass snapshot options correctly', async () => {
      const mockLogger = { info: jest.fn() }

      await recalculateAllMetrics(mockLogger, {
        includeCurrentSnapshot: true,
        snapshotFrequency: 'quarterly',
      })

      // Verify snapshot options were passed correctly
      expect(smartSnapshotGenerator).toHaveBeenCalledWith(
        expect.any(Date),
        true,
        'quarterly'
      )
    })
  })
})
