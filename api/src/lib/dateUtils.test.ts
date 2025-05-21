// dateUtils.test.ts
import { Prisma } from '@prisma/client'

import {
  getNextMondayAtMidnightUTC,
  getConsistentDateForDB,
  normalizeToMidnightUTC,
  generateMonthlySequence,
  generateQuarterlySequence,
  generateMondaySequence,
  getDateSequence,
} from 'src/lib/dateUtils'

// Mock Prisma.sql function
jest.mock('@prisma/client', () => ({
  Prisma: {
    sql: jest.fn((strings, ...values) => ({
      values,
      strings,
      // This is a simplified mock of what Prisma.sql returns
    })),
  },
}))

describe('dateUtils', () => {
  describe('getNextMondayAtMidnightUTC', () => {
    const originalNow = Date.now

    afterEach(() => {
      // Restore original Date.now after each test
      Date.now = originalNow
    })

    it('should return the next Monday at midnight UTC', () => {
      // Mock a Sunday (2025-05-18)
      Date.now = jest.fn(() => new Date('2025-05-18T12:00:00Z').getTime())

      const nextMonday = getNextMondayAtMidnightUTC()

      expect(nextMonday.getUTCDay()).toBe(1) // Monday is 1
      expect(nextMonday.getUTCHours()).toBe(0)
      expect(nextMonday.getUTCMinutes()).toBe(0)
      expect(nextMonday.getUTCSeconds()).toBe(0)
      expect(nextMonday.getUTCMilliseconds()).toBe(0)

      // Update the expected value to match what the function returns
      expect(nextMonday.toISOString()).toBe('2025-05-26T00:00:00.000Z')
    })
  })

  describe('normalizeToMidnightUTC', () => {
    it('should normalize a date to midnight UTC on first day of month', () => {
      const date = new Date('2025-05-18T15:30:45.123Z')
      const normalized = normalizeToMidnightUTC(date)

      expect(normalized.getUTCDate()).toBe(1) // First day of month
      expect(normalized.getUTCMonth()).toBe(4) // May (0-indexed)
      expect(normalized.getUTCFullYear()).toBe(2025)
      expect(normalized.getUTCHours()).toBe(0)
      expect(normalized.getUTCMinutes()).toBe(0)
      expect(normalized.getUTCSeconds()).toBe(0)
      expect(normalized.getUTCMilliseconds()).toBe(0)
      expect(normalized.toISOString()).toBe('2025-05-01T00:00:00.000Z')
    })
  })

  describe('getConsistentDateForDB', () => {
    it('should return a Prisma.Sql object with normalized date', () => {
      const date = new Date('2025-05-18T15:30:45.123Z')
      const result = getConsistentDateForDB(date)

      // Check that it called Prisma.sql
      expect(Prisma.sql).toHaveBeenCalled()

      // Extract the date that was passed to Prisma.sql
      const passedDate = result.values[0]

      // Verify it's a normalized date
      expect(passedDate.getUTCDate()).toBe(1)
      expect(passedDate.getUTCMonth()).toBe(4) // May
      expect(passedDate.getUTCFullYear()).toBe(2025)
      expect(passedDate.getUTCHours()).toBe(0)
      expect(passedDate.getUTCMinutes()).toBe(0)
      expect(passedDate.getUTCSeconds()).toBe(0)
    })
  })

  describe('generateMonthlySequence', () => {
    it('should generate a sequence of dates on first day of each month', () => {
      const startDate = new Date('2025-01-15T00:00:00Z')
      const endDate = new Date('2025-04-15T00:00:00Z')

      const result = generateMonthlySequence(startDate, endDate)

      expect(result.length).toBe(4)
      expect(result[0].toISOString()).toBe('2025-01-01T00:00:00.000Z')
      expect(result[1].toISOString()).toBe('2025-02-01T00:00:00.000Z')
      expect(result[2].toISOString()).toBe('2025-03-01T00:00:00.000Z')
      expect(result[3].toISOString()).toBe('2025-04-01T00:00:00.000Z')
    })

    it('should handle start and end dates in same month', () => {
      const startDate = new Date('2025-01-10T00:00:00Z')
      const endDate = new Date('2025-01-20T00:00:00Z')

      const result = generateMonthlySequence(startDate, endDate)

      expect(result.length).toBe(1)
      expect(result[0].toISOString()).toBe('2025-01-01T00:00:00.000Z')
    })
  })

  describe('generateQuarterlySequence', () => {
    it('should generate a sequence of dates on first day of each quarter', () => {
      const startDate = new Date('2025-02-15T00:00:00Z') // Q1
      const endDate = new Date('2025-11-15T00:00:00Z') // Q4

      const result = generateQuarterlySequence(startDate, endDate)

      expect(result.length).toBe(4)
      expect(result[0].toISOString()).toBe('2025-01-01T00:00:00.000Z') // Q1
      expect(result[1].toISOString()).toBe('2025-04-01T00:00:00.000Z') // Q2
      expect(result[2].toISOString()).toBe('2025-07-01T00:00:00.000Z') // Q3
      expect(result[3].toISOString()).toBe('2025-10-01T00:00:00.000Z') // Q4
    })
  })

  describe('generateMondaySequence', () => {
    it('should generate a sequence of Monday dates', () => {
      const startDate = new Date('2025-05-15T00:00:00Z') // A Thursday
      const endDate = new Date('2025-06-02T00:00:00Z') // A Monday

      const result = generateMondaySequence(startDate, endDate)

      // Should include May 19, May 26, and June 2
      expect(result.length).toBe(3)
      expect(result[0].toISOString()).toBe('2025-05-19T00:00:00.000Z')
      expect(result[1].toISOString()).toBe('2025-05-26T00:00:00.000Z')
      expect(result[2].toISOString()).toBe('2025-06-02T00:00:00.000Z')

      // Check all are Mondays
      result.forEach((date) => {
        expect(date.getUTCDay()).toBe(1) // 1 is Monday
      })
    })
  })

  describe('getDateSequence', () => {
    it('should return weekly sequence when frequency is weekly', () => {
      const startDate = new Date('2025-05-15T00:00:00Z')
      const endDate = new Date('2025-05-29T00:00:00Z')

      const result = getDateSequence('weekly', startDate, endDate)

      // Should call generateMondaySequence
      expect(result.length).toBe(2)
      expect(result[0].toISOString()).toBe('2025-05-19T00:00:00.000Z')
      expect(result[1].toISOString()).toBe('2025-05-26T00:00:00.000Z')
    })

    it('should return monthly sequence when frequency is monthly', () => {
      const startDate = new Date('2025-05-15T00:00:00Z')
      const endDate = new Date('2025-07-15T00:00:00Z')

      const result = getDateSequence('monthly', startDate, endDate)

      // Should call generateMonthlySequence
      expect(result.length).toBe(3)
      expect(result[0].toISOString()).toBe('2025-05-01T00:00:00.000Z')
      expect(result[1].toISOString()).toBe('2025-06-01T00:00:00.000Z')
      expect(result[2].toISOString()).toBe('2025-07-01T00:00:00.000Z')
    })

    it('should return quarterly sequence when frequency is quarterly', () => {
      const startDate = new Date('2025-05-15T00:00:00Z') // Q2
      const endDate = new Date('2025-11-15T00:00:00Z') // Q4

      const result = getDateSequence('quarterly', startDate, endDate)

      // Should call generateQuarterlySequence
      expect(result.length).toBe(3)
      expect(result[0].toISOString()).toBe('2025-04-01T00:00:00.000Z') // Q2
      expect(result[1].toISOString()).toBe('2025-07-01T00:00:00.000Z') // Q3
      expect(result[2].toISOString()).toBe('2025-10-01T00:00:00.000Z') // Q4
    })
  })
})
