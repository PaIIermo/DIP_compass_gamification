import { useMemo } from 'react'

import { PUBLICATION_COLORS } from '../TrendingChart/TrendingChart'
import { ChartDataPoint, EnhancedPublication, TableRowData } from '../types'

interface PublicationTableProps {
  publications: EnhancedPublication[]
  chartData: ChartDataPoint[]
  activeIndex: number
  currentDataPoint: ChartDataPoint | null
  title?: string
  currentUserId?: number | null
  onPublicationSelect: (id: number | null) => void
  selectedPublicationId: number | null
  publicationColorMap?: Map<string | number, string | number>
}

const PublicationTable = ({
  publications = [],
  chartData = [],
  activeIndex = 0,
  currentDataPoint = null,
  title = 'Publication Scores',
  currentUserId = null,
  onPublicationSelect,
  selectedPublicationId,
  publicationColorMap,
}: PublicationTableProps) => {
  // Prepare data for the table based on cursor position
  const tableData = useMemo<TableRowData[]>(() => {
    // If we have a specific data point, use that directly
    if (currentDataPoint) {
      // For each publication, extract relevant data from the current point
      return publications
        .map((pub) => {
          const id = pub.id
          const currentKey = `pub${id}`
          const currentValue =
            currentDataPoint[currentKey] !== undefined
              ? Number(currentDataPoint[currentKey])
              : null

          // Find the first appearance of this publication in the dataset
          let firstValue = null
          let firstValueDate = null
          let previousValue = null

          if (chartData && chartData.length > 0) {
            // Find the first point that has data for this publication
            for (const point of chartData) {
              if (
                point[currentKey] !== undefined &&
                point[currentKey] !== null
              ) {
                firstValue = Number(point[currentKey])
                firstValueDate = point.date
                break
              }
            }

            // Also get previous point for trend calculation
            const currentPointIndex = chartData.findIndex(
              (p) => p.date === currentDataPoint.date
            )
            if (currentPointIndex > 0) {
              const prevPoint = chartData[currentPointIndex - 1]
              previousValue =
                prevPoint[currentKey] !== undefined
                  ? Number(prevPoint[currentKey])
                  : null
            }
          }

          // Check if publication exists at current time
          const existsAtCurrentTime = currentValue !== null

          // Check if current time is before first appearance
          const isBeforeFirstAppearance =
            firstValueDate && currentDataPoint.date < firstValueDate

          // Calculate change and trend
          let change = null
          let trend = null
          let percentChange = null

          if (existsAtCurrentTime) {
            // Normal calculation when publication exists

            // Calculate trend based on previous point (for up/down arrow)
            if (previousValue !== null) {
              const shortTermChange = currentValue - previousValue
              trend =
                shortTermChange > 0
                  ? 'up'
                  : shortTermChange < 0
                    ? 'down'
                    : 'same'
            } else {
              // If no previous value, this might be the first appearance
              trend = 'same'
            }

            // Calculate total change based on first value
            if (firstValue !== null && firstValue !== currentValue) {
              change = currentValue - firstValue

              // Calculate percentage change from first value
              if (firstValue !== 0) {
                percentChange = (change / Math.abs(firstValue)) * 100

                // Cap the percentage change at -100% for decreases
                if (percentChange < -100) {
                  percentChange = -100
                }
              }
            } else {
              // If current value is the first value, or we're at the first appearance
              change = 0
              percentChange = 0
            }
          } else if (isBeforeFirstAppearance) {
            // Special handling for time before publication exists
            // Show neutral/empty values
            change = null
            trend = null
            percentChange = null
          } else {
            // Publication should exist but has no value at this point
            // Keep null values
            change = null
            trend = null
            percentChange = null
          }

          // Check if this publication belongs to the current user
          let isCurrentUser = pub.isCurrentUser || false

          // If isCurrentUser flag isn't set directly, check the authors array
          if (!isCurrentUser && pub.authors && currentUserId) {
            isCurrentUser = pub.authors.some(
              (author) =>
                author.userId === currentUserId ||
                author.user_id === currentUserId
            )
          }

          return {
            id,
            title: pub.title,
            doi: pub.doi,
            currentValue,
            change,
            percentChange,
            trend,
            overallScore: pub.overallScore,
            isCurrentUser,
            existsAtCurrentTime, // Add this flag for rendering
            isBeforeFirstAppearance, // Add this flag for rendering
          }
        })
        .sort((a, b) => b.overallScore - a.overallScore) // Sort by overall score for stable ordering
    }

    // Fallback to using activeIndex with chartData
    if (!chartData || chartData.length === 0) return []

    // Make sure activeIndex is within bounds
    const validIndex = Math.min(Math.max(0, activeIndex), chartData.length - 1)

    // Get current data point based on cursor position
    const currentPoint = chartData[validIndex]
    if (!currentPoint) return []

    // Get previous data point for calculating changes
    const previousPoint = validIndex > 0 ? chartData[validIndex - 1] : null

    // For each publication, extract relevant data
    return publications
      .map((pub) => {
        const id = pub.id
        const currentKey = `pub${id}`
        const currentValue =
          currentPoint[currentKey] !== undefined
            ? Number(currentPoint[currentKey])
            : null
        // Get previous value for trend calculation
        const previousValue =
          previousPoint && previousPoint[currentKey] !== undefined
            ? Number(previousPoint[currentKey])
            : null

        // Find the first appearance of this publication in the dataset
        let firstValue = null
        let firstValueDate = null
        if (chartData && chartData.length > 0) {
          // Find the first point that has data for this publication
          for (const point of chartData) {
            if (point[currentKey] !== undefined && point[currentKey] !== null) {
              firstValue = Number(point[currentKey])
              firstValueDate = point.date
              break
            }
          }
        }

        // Check if publication exists at current time
        const existsAtCurrentTime = currentValue !== null

        // Check if current time is before first appearance
        const isBeforeFirstAppearance =
          firstValueDate && currentPoint.date < firstValueDate

        // Calculate change, trend, and percentage change
        let change = null
        let trend = null
        let percentChange = null

        // Only calculate values if publication exists at current point
        if (existsAtCurrentTime) {
          // Calculate trend based on previous point (for up/down arrow)
          if (previousValue !== null) {
            const shortTermChange = currentValue - previousValue
            trend =
              shortTermChange > 0 ? 'up' : shortTermChange < 0 ? 'down' : 'same'
          } else {
            // If no previous value but we have current value, this is the first appearance
            trend = 'same' // Neutral trend for first appearance
          }

          // Calculate total change based on first value
          if (firstValue !== null && firstValue !== currentValue) {
            change = currentValue - firstValue

            // Calculate percentage change from first value
            if (firstValue !== 0) {
              percentChange = (change / Math.abs(firstValue)) * 100

              // Cap the percentage change at -100% for decreases
              if (percentChange < -100) {
                percentChange = -100
              }
            }
          } else {
            // If current value is the first value, change is 0
            change = 0
            percentChange = 0
          }
        } else if (isBeforeFirstAppearance) {
          // Special handling for time before publication exists
          change = null
          trend = null
          percentChange = null
        } else {
          // If publication doesn't exist at this time point, all values should be null
          change = null
          trend = null
          percentChange = null
        }

        // Check if this publication belongs to the current user
        // First check the explicit isCurrentUser flag
        let isCurrentUser = pub.isCurrentUser || false

        // If that's not set, check authors array
        if (!isCurrentUser && pub.authors && currentUserId) {
          isCurrentUser = pub.authors.some(
            (author) =>
              author.userId === currentUserId ||
              author.user_id === currentUserId
          )
        }

        return {
          id,
          title: pub.title,
          doi: pub.doi,
          currentValue,
          change,
          percentChange,
          trend,
          overallScore: pub.overallScore,
          isCurrentUser,
          existsAtCurrentTime,
          isBeforeFirstAppearance,
        }
      })
      .sort((a, b) => b.overallScore - a.overallScore) // Sort by overall score for stable ordering
  }, [publications, chartData, activeIndex, currentDataPoint, currentUserId])

  // Find the top score value (highest current value)
  const topScore = useMemo(() => {
    if (!tableData.length) return 0
    // Only consider publications that have a current value (exist at this time point)
    const publicationsWithValues = tableData.filter(
      (pub) => pub.currentValue !== null && pub.currentValue !== undefined
    )
    if (publicationsWithValues.length === 0) return 0
    return Math.max(
      ...publicationsWithValues.map((pub) => pub.currentValue || 0)
    )
  }, [tableData])

  // Handle empty data
  if (
    !publications ||
    publications.length === 0 ||
    ((!chartData || chartData.length === 0) && !currentDataPoint)
  ) {
    return (
      <div className="mt-1 rounded-lg border border-gray-200 bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">{title}</h2>
        <div className="py-8 text-center text-gray-500">
          No publication data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Publication
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Score
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Trend
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Change
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                %Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {tableData.length > 0 ? (
              // Maintain stable sorting by overallScore, but highlight special cases
              tableData.map((pub) => {
                // Check if this publication is a top publication at current time
                // Only consider it "top" if it actually has a value at this time
                const isTopPublication =
                  pub.currentValue !== null &&
                  pub.currentValue !== undefined &&
                  pub.currentValue === topScore &&
                  topScore > 0

                // Use the color map if provided, otherwise fallback to index-based color
                const pubIndex = tableData.findIndex((p) => p.id === pub.id)
                const color =
                  publicationColorMap?.get(pub.id) ||
                  PUBLICATION_COLORS[pubIndex % PUBLICATION_COLORS.length]

                const isSelected = selectedPublicationId === pub.id

                // Style differently if publication doesn't exist yet
                const rowOpacity = pub.isBeforeFirstAppearance
                  ? 'opacity-50'
                  : ''

                return (
                  <tr
                    key={pub.id}
                    data-publication-id={pub.id}
                    className={`cursor-pointer hover:bg-gray-50 ${rowOpacity} ${
                      isSelected
                        ? 'bg-gray-200'
                        : isTopPublication && pub.isCurrentUser
                          ? 'bg-gradient-to-r from-green-100 to-blue-50'
                          : isTopPublication
                            ? 'bg-green-100'
                            : pub.isCurrentUser
                              ? 'bg-blue-50'
                              : ''
                    }`}
                    onClick={() =>
                      onPublicationSelect(isSelected ? null : pub.id)
                    }
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center">
                        <div
                          className="mr-3 h-4 w-4 rounded-full"
                          style={{ backgroundColor: String(color) }}
                          data-color-for={`pub-${pub.id}`}
                        ></div>
                        <div className="flex flex-col">
                          <a
                            href={pub.doi ? `https://doi.org/${pub.doi}` : '#'}
                            className="font-medium text-blue-600 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {pub.title || `Publication ${pub.id}`}
                          </a>
                          {isTopPublication &&
                            pub.isCurrentUser &&
                            !pub.isBeforeFirstAppearance && (
                              <span className="mt-1 inline-block rounded px-2 py-0.5 text-xs text-green-800">
                                Top Publication (Yours)
                              </span>
                            )}
                          {isTopPublication &&
                            !pub.isCurrentUser &&
                            !pub.isBeforeFirstAppearance && (
                              <span className="mt-1 inline-block rounded px-2 py-0.5 text-xs text-green-800">
                                Top Publication
                              </span>
                            )}
                          {pub.isCurrentUser &&
                            !isTopPublication &&
                            !pub.isBeforeFirstAppearance && (
                              <span className="mt-1 inline-block rounded px-2 py-0.5 text-xs text-blue-800">
                                Your Publication
                              </span>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {pub.isBeforeFirstAppearance
                        ? '-'
                        : pub.currentValue !== null &&
                            pub.currentValue !== undefined
                          ? pub.currentValue.toFixed(3)
                          : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-xl">
                      {pub.isBeforeFirstAppearance ? (
                        <span className="text-gray-400">-</span>
                      ) : pub.currentValue !== null ? (
                        <span
                          className={`${
                            pub.trend === 'up'
                              ? 'text-green-600'
                              : pub.trend === 'down'
                                ? 'text-red-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {pub.trend === 'up'
                            ? '↑'
                            : pub.trend === 'down'
                              ? '↓'
                              : '–'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${
                        pub.isBeforeFirstAppearance
                          ? 'text-gray-400'
                          : pub.change > 0
                            ? 'text-green-600'
                            : pub.change < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                      }`}
                    >
                      {pub.isBeforeFirstAppearance
                        ? '-'
                        : pub.currentValue !== null && pub.change !== null
                          ? (pub.change > 0 ? '+' : '') + pub.change.toFixed(3)
                          : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${
                        pub.isBeforeFirstAppearance
                          ? 'text-gray-400'
                          : pub.percentChange > 0
                            ? 'text-green-600'
                            : pub.percentChange < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                      }`}
                    >
                      {pub.isBeforeFirstAppearance
                        ? '-'
                        : pub.currentValue !== null &&
                            pub.percentChange !== null
                          ? (pub.percentChange > 0 ? '+' : '') +
                            Math.min(
                              Math.max(pub.percentChange, -100),
                              9999
                            ).toFixed(2) +
                            '%'
                          : '-'}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No data available for this time period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PublicationTable
