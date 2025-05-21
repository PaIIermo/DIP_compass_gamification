import { Prisma } from '@prisma/client'

/**
 * ----------------------------------------------------------------
 * getNextMondayAtMidnightUTC()
 * ----------------------------------------------------------------
 * Returns a Date object set to the next Monday at 00:00 UTC.
 * If today is Monday, returns the next Monday (7 days later).
 */
export function getNextMondayAtMidnightUTC(): Date {
  const now = new Date()
  const next = new Date(now)

  // Adjust day to the next Monday (UTC-based)
  // 1 = Monday in JS Date
  const daysUntilMonday = (1 + 7 - now.getUTCDay()) % 7
  // If today is Monday (daysUntilMonday would be 0), set to 7 days from now
  next.setUTCDate(now.getUTCDate() + (daysUntilMonday || 7))

  // Set time to midnight UTC (00:00:00)
  next.setUTCHours(0, 0, 0, 0)

  return next
}

/**
 * Ensures consistent date handling for database operations
 * Returns a Prisma SQL fragment that ensures the date is set to
 * midnight UTC on the first day of the month
 */
export function getConsistentDateForDB(date: Date): Prisma.Sql {
  // Create a new date object for the first day of the month at midnight UTC
  const normalizedDate = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1, // Always use day 1 (first of month)
      0,
      0,
      0,
      0 // Set to midnight UTC (00:00:00.000)
    )
  )

  // Explicitly set timestamp to midnight UTC using timestamptz
  return Prisma.sql`${normalizedDate}::timestamptz`
}

/**
 * Normalizes a date to midnight UTC on the first day of its month
 */
export function normalizeToMidnightUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(), // PRESERVE the original day instead of always using 1
      0,
      0,
      0,
      0
    )
  )
}

/**
 * Generate a sequence of dates on the first day of each month
 */
export function generateMonthlySequence(
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = []

  // Create a new date for the first day of the start date's month at midnight UTC
  const currentDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      1, // Always first day of month
      0,
      0,
      0,
      0 // Midnight UTC
    )
  )

  while (currentDate <= endDate) {
    // Add a copy of the current date to our array
    dates.push(new Date(currentDate.getTime()))

    // Move to the first day of the next month
    currentDate.setUTCMonth(currentDate.getUTCMonth() + 1)
  }

  return dates
}

/**
 * Generate a sequence of dates on the first day of each quarter
 */
export function generateQuarterlySequence(
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = []

  // Calculate the first month of the quarter (0, 3, 6, or 9)
  const quarterMonth = Math.floor(startDate.getUTCMonth() / 3) * 3

  // Create a date for the first day of the quarter at midnight UTC
  const currentDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      quarterMonth,
      1, // Always first day of month
      0,
      0,
      0,
      0 // Midnight UTC
    )
  )

  while (currentDate <= endDate) {
    // Add a copy of the current date to our array
    dates.push(new Date(currentDate.getTime()))

    // Move to the first day of the next quarter
    currentDate.setUTCMonth(currentDate.getUTCMonth() + 3)
  }

  return dates
}

/**
 * Generate a sequence of Monday dates
 */
export function generateMondaySequence(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []

  // Start with the given date
  const currentDate = new Date(startDate.getTime())

  // Set to midnight UTC
  currentDate.setUTCHours(0, 0, 0, 0)

  // Adjust to the next Monday if not already a Monday
  const day = currentDate.getUTCDay()
  if (day !== 1) {
    // 1 is Monday in JavaScript
    currentDate.setUTCDate(currentDate.getUTCDate() + (day === 0 ? 1 : 8 - day))
  }

  while (currentDate <= endDate) {
    // Add a copy of the current date to our array
    dates.push(new Date(currentDate.getTime()))

    // Move to next Monday
    currentDate.setUTCDate(currentDate.getUTCDate() + 7)
  }

  return dates
}

/**
 * Get the appropriate date sequence based on the specified frequency
 */
export function getDateSequence(
  snapshotFrequency: 'weekly' | 'monthly' | 'quarterly',
  startDate: Date,
  endDate: Date
): Date[] {
  switch (snapshotFrequency) {
    case 'monthly':
      return generateMonthlySequence(startDate, endDate)
    case 'quarterly':
      return generateQuarterlySequence(startDate, endDate)
    case 'weekly':
    default:
      return generateMondaySequence(startDate, endDate)
  }
}
