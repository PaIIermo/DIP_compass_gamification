import { PublicationSnapshot, ChartDataPoint } from './types'

// Define a type for the time period
export type TimePeriod = 'all' | '2y' | '5y' | '6m' | '1y' | 'ytd'

/**
 * Define a more generic base type for items with snapshots
 * This allows the function to work with publications, topics, and researchers
 */
interface ItemWithSnapshots {
  id: number
  snapshots?: Array<{
    snapshot_date: string | Date
    value: number
  }>
}

/**
 * Define a generic enhanced type
 */
interface EnhancedItem {
  trend?: 'up' | 'down' | 'same' | null
  sortedSnapshots?: Array<{
    snapshot_date: string | Date
    value: number
  }>
}

/**
 * Safely convert any snapshot date to timestamp
 */
function getDateTimestamp(dateValue: string | Date | unknown): number {
  if (!dateValue) return 0

  try {
    if (typeof dateValue === 'string') {
      return new Date(dateValue).getTime()
    } else if (dateValue instanceof Date) {
      return dateValue.getTime()
    } else {
      // For other cases, try to convert to string first
      return new Date(String(dateValue)).getTime()
    }
  } catch (err) {
    console.error('Error parsing date:', dateValue, err)
    return 0
  }
}

/**
 * Enhance items with trend data and sorted snapshots
 * This can be reused for publications, researchers, or topics data
 * Now accepts any item with id and snapshots properties
 */
export function enhanceWithTrends<T extends ItemWithSnapshots>(
  items: T[]
): (T & EnhancedItem)[] {
  if (!items || items.length === 0) {
    return []
  }

  return items.map((item) => {
    if (!item || !item.snapshots) {
      return {
        ...item,
        trend: null,
        sortedSnapshots: [],
      }
    }

    // Sort snapshots by date (newest first) to get the latest two
    const sortedSnapshots = [...(item.snapshots || [])].sort(
      (a, b) =>
        getDateTimestamp(b.snapshot_date) - getDateTimestamp(a.snapshot_date)
    )

    // Get the two most recent snapshots
    const latestSnapshot = sortedSnapshots[0]
    const previousSnapshot = sortedSnapshots[1]

    // Calculate trend direction
    let trend = null
    if (latestSnapshot && previousSnapshot) {
      if (latestSnapshot.value > previousSnapshot.value) {
        trend = 'up'
      } else if (latestSnapshot.value < previousSnapshot.value) {
        trend = 'down'
      } else {
        trend = 'same'
      }
    }

    return {
      ...item,
      trend,
      // Include chronologically ordered snapshots for charts
      sortedSnapshots: [...(item.snapshots || [])].sort(
        (a, b) =>
          getDateTimestamp(a.snapshot_date) - getDateTimestamp(b.snapshot_date)
      ),
    }
  })
}

/**
 * Extract date portion from a snapshot date
 */
function getDatePart(dateValue: string | Date | unknown): string {
  if (!dateValue) return ''

  try {
    if (typeof dateValue === 'string') {
      return dateValue.split('T')[0]
    } else if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0]
    } else {
      // For other cases, try to convert to string first
      return new Date(String(dateValue)).toISOString().split('T')[0]
    }
  } catch (err) {
    console.error('Error extracting date part:', dateValue, err)
    return ''
  }
}

/**
 * Prepare chart data for any collection of items with snapshots
 * This works for publications, researchers, or topics
 */
export function prepareChartData<
  T extends {
    id: number
    title: string
    sortedSnapshots?: PublicationSnapshot[]
  },
>(items: T[]): ChartDataPoint[] {
  if (!items || !items.length) return []

  // Find all unique dates across all items
  const allDates = new Set<string>()
  items.forEach((item) => {
    if (item && item.sortedSnapshots) {
      item.sortedSnapshots.forEach((snap) => {
        if (snap && snap.snapshot_date) {
          // Ensure we extract just the date part from ISO string format
          const datePart = getDatePart(snap.snapshot_date)
          if (datePart) {
            allDates.add(datePart)
          }
        }
      })
    }
  })

  // If no dates found, return empty array
  if (allDates.size === 0) return []

  // Create an array of date strings in chronological order
  const dateArray = Array.from(allDates).sort()

  // Create chart data points for each date
  return dateArray.map((date) => {
    // Start with the date as the basis for this data point
    const dataPoint: ChartDataPoint = { date }

    // Add a value for each item that has data for this date
    items.forEach((item) => {
      if (item && item.sortedSnapshots && item.id) {
        const snapshot = item.sortedSnapshots.find((snap) => {
          if (!snap || !snap.snapshot_date) return false
          return getDatePart(snap.snapshot_date) === date
        })
        // Use the item's ID as the property name
        dataPoint[`pub${item.id}`] =
          snapshot && snapshot.value !== undefined ? snapshot.value : null
        // Also store the item title for tooltips
        dataPoint[`pub${item.id}Title`] = item.title || `Item ${item.id}`
      }
    })

    return dataPoint
  })
}

/**
 * Filter chart data by time period
 * This is useful for any chart that needs time period filtering
 */
export function filterChartDataByTimePeriod(
  data: ChartDataPoint[],
  timePeriod: TimePeriod = 'all'
): ChartDataPoint[] {
  if (!data || data.length === 0) {
    return []
  }

  const now = new Date()

  switch (timePeriod) {
    case '2y': {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(now.getFullYear() - 2)
      return data.filter((item) => new Date(item.date) >= twoYearsAgo)
    }
    case '5y': {
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(now.getFullYear() - 5)
      return data.filter((item) => new Date(item.date) >= fiveYearsAgo)
    }
    case '6m': {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 6)
      return data.filter((item) => new Date(item.date) >= sixMonthsAgo)
    }
    case '1y': {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      return data.filter((item) => new Date(item.date) >= oneYearAgo)
    }
    case 'ytd': {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return data.filter((item) => new Date(item.date) >= startOfYear)
    }
    default:
      return data
  }
}
