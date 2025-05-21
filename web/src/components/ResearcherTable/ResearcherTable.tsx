import { useMemo } from 'react'

import { PUBLICATION_COLORS } from '../TrendingChart/TrendingChart'
import { ChartDataPoint, EnhancedPublication } from '../types'

// Interface for the researcher snapshot data from GraphQL
interface ResearcherSnapshotPoint {
  snapshotDate: string
  meanValue: number
}

// Interface for the trending researcher data from GraphQL
interface TrendingResearcher {
  id: number
  email: string | null
  aliasName: string | null
  meanValue: number
  isCurrentUser: boolean
  snapshots: ResearcherSnapshotPoint[]
}

// The adapted researchers have been transformed to match the EnhancedPublication structure
// They are essentially publications with researcher data
type AdaptedResearcher = EnhancedPublication

// Interface for the table row data - specific to this component
interface ResearcherTableRow {
  id: number
  email: string | null
  aliasName: string | null
  meanValue: number
  isCurrentUser: boolean
  pointValue?: number | null
  changeValue?: number | null
  percentChangeValue?: number | null
  trendDirection?: 'up' | 'down' | 'same' | null
  overallTrend?: 'up' | 'down' | 'same' | null
  isTopResearcher?: boolean
  existsAtCurrentTime?: boolean
  isBeforeFirstAppearance?: boolean
}

// Props for the researcher table component
interface ResearcherTableProps {
  researchers: TrendingResearcher[]
  adaptedResearchers: AdaptedResearcher[] // Now properly typed as EnhancedPublication[]
  chartData: ChartDataPoint[]
  activeIndex: number
  currentDataPoint: ChartDataPoint | null
  onResearcherSelect: (id: number | null) => void
  selectedResearcherId: number | null
  researcherColorMap?: Map<string | number, string | number>
}

const ResearcherTable = ({
  researchers = [],
  adaptedResearchers = [],
  chartData = [],
  activeIndex = 0,
  currentDataPoint = null,
  onResearcherSelect,
  selectedResearcherId,
  researcherColorMap,
}: ResearcherTableProps) => {
  // Prepare data for the table based on cursor position
  const tableData = useMemo<ResearcherTableRow[]>(() => {
    // If we have a specific data point, use that directly
    if (currentDataPoint) {
      // For each researcher, extract relevant data from the current point
      return researchers.map((researcher) => {
        const id = researcher.id
        const currentKey = `pub${id}` // Using pub prefix to match chart data format
        const pointValue =
          currentDataPoint[currentKey] !== undefined
            ? Number(currentDataPoint[currentKey])
            : null

        // Find the first appearance of this researcher in the dataset
        let firstValue = null
        let firstValueDate = null
        let previousValue = null

        if (chartData && chartData.length > 0) {
          // Find the first point that has data for this researcher
          for (const point of chartData) {
            if (point[currentKey] !== undefined && point[currentKey] !== null) {
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

        // Check if researcher exists at current time
        const existsAtCurrentTime = pointValue !== null

        // Check if current time is before first appearance
        const isBeforeFirstAppearance =
          firstValueDate && currentDataPoint.date < firstValueDate

        // Calculate change and trend
        let changeValue = null
        let trendDirection = null
        let percentChangeValue = null

        if (existsAtCurrentTime) {
          // Calculate trend based on previous point (for up/down arrow)
          if (previousValue !== null) {
            const shortTermChange = pointValue - previousValue
            trendDirection =
              shortTermChange > 0 ? 'up' : shortTermChange < 0 ? 'down' : 'same'
          } else {
            // If no previous value, this might be the first appearance
            trendDirection = 'same'
          }

          // Calculate total change based on first value
          if (firstValue !== null && firstValue !== pointValue) {
            changeValue = pointValue - firstValue

            // Calculate percentage change from first value
            if (firstValue !== 0) {
              percentChangeValue = (changeValue / Math.abs(firstValue)) * 100

              // Cap the percentage change at -100% for decreases
              if (percentChangeValue < -100) {
                percentChangeValue = -100
              }
            }
          } else {
            // If current value is the first value, or we're at the first appearance
            changeValue = 0
            percentChangeValue = 0
          }
        } else if (isBeforeFirstAppearance) {
          // Special handling for time before researcher exists
          changeValue = null
          trendDirection = null
          percentChangeValue = null
        } else {
          // Researcher should exist but has no value at this point
          changeValue = null
          trendDirection = null
          percentChangeValue = null
        }

        // Find the adapted researcher with trend info
        const adaptedResearcher = adaptedResearchers.find(
          (r) => r.id === researcher.id
        )

        return {
          id,
          email: researcher.email,
          aliasName: researcher.aliasName,
          meanValue: researcher.meanValue,
          isCurrentUser: researcher.isCurrentUser,
          pointValue,
          changeValue,
          percentChangeValue,
          trendDirection,
          overallTrend: adaptedResearcher?.trend,
          existsAtCurrentTime,
          isBeforeFirstAppearance,
        }
      })
    }

    // Fallback to using activeIndex with chartData
    if (!chartData || chartData.length === 0) {
      return researchers.map((researcher) => ({
        id: researcher.id,
        email: researcher.email,
        aliasName: researcher.aliasName,
        meanValue: researcher.meanValue,
        isCurrentUser: researcher.isCurrentUser,
        overallTrend: adaptedResearchers.find((r) => r.id === researcher.id)
          ?.trend,
      }))
    }

    // Make sure activeIndex is within bounds
    const validIndex = Math.min(Math.max(0, activeIndex), chartData.length - 1)

    // Get current data point based on cursor position
    const currentPoint = chartData[validIndex]
    if (!currentPoint) {
      return researchers.map((researcher) => ({
        id: researcher.id,
        email: researcher.email,
        aliasName: researcher.aliasName,
        meanValue: researcher.meanValue,
        isCurrentUser: researcher.isCurrentUser,
        overallTrend: adaptedResearchers.find((r) => r.id === researcher.id)
          ?.trend,
      }))
    }

    // Get previous data point for calculating changes
    const previousPoint = validIndex > 0 ? chartData[validIndex - 1] : null

    // For each researcher, extract relevant data
    return researchers.map((researcher) => {
      const id = researcher.id
      const currentKey = `pub${id}`
      const pointValue =
        currentPoint[currentKey] !== undefined
          ? Number(currentPoint[currentKey])
          : null

      // Find the first appearance of this researcher in the dataset
      let firstValue = null
      let firstValueDate = null
      if (chartData && chartData.length > 0) {
        // Find the first point that has data for this researcher
        for (const point of chartData) {
          if (point[currentKey] !== undefined && point[currentKey] !== null) {
            firstValue = Number(point[currentKey])
            firstValueDate = point.date
            break
          }
        }
      }

      // Check if researcher exists at current time
      const existsAtCurrentTime = pointValue !== null

      // Check if current time is before first appearance
      const isBeforeFirstAppearance =
        firstValueDate && currentPoint.date < firstValueDate

      // Get previous value for trend calculation
      const previousValue =
        previousPoint && previousPoint[currentKey] !== undefined
          ? Number(previousPoint[currentKey])
          : null

      // Calculate change and trend
      let changeValue = null
      let trendDirection = null
      let percentChangeValue = null

      if (existsAtCurrentTime) {
        // Calculate trend based on previous point (for up/down arrow)
        if (previousValue !== null) {
          const shortTermChange = pointValue - previousValue
          trendDirection =
            shortTermChange > 0 ? 'up' : shortTermChange < 0 ? 'down' : 'same'
        } else {
          // If no previous value, this is the first appearance
          trendDirection = 'same'
        }

        // Calculate total change based on first value
        if (firstValue !== null && firstValue !== pointValue) {
          changeValue = pointValue - firstValue

          // Calculate percentage change from first value
          if (firstValue !== 0) {
            percentChangeValue = (changeValue / Math.abs(firstValue)) * 100

            // Cap the percentage change at -100% for decreases
            if (percentChangeValue < -100) {
              percentChangeValue = -100
            }
          }
        } else {
          // If current value is the first value, change is 0
          changeValue = 0
          percentChangeValue = 0
        }
      } else if (isBeforeFirstAppearance) {
        // Special handling for time before researcher exists
        changeValue = null
        trendDirection = null
        percentChangeValue = null
      } else {
        // Researcher should exist but has no value at this point
        changeValue = null
        trendDirection = null
        percentChangeValue = null
      }

      // Find the adapted researcher with trend info
      const adaptedResearcher = adaptedResearchers.find(
        (r) => r.id === researcher.id
      )

      return {
        id,
        email: researcher.email,
        aliasName: researcher.aliasName,
        meanValue: researcher.meanValue,
        isCurrentUser: researcher.isCurrentUser,
        pointValue,
        changeValue,
        percentChangeValue,
        trendDirection,
        overallTrend: adaptedResearcher?.trend,
        existsAtCurrentTime,
        isBeforeFirstAppearance,
      }
    })
  }, [
    researchers,
    adaptedResearchers,
    chartData,
    activeIndex,
    currentDataPoint,
  ])

  // Find the top score value at the current cursor position (highest current value)
  const topScore = useMemo(() => {
    if (!tableData.length) return 0
    // Only consider researchers that have a current value (exist at this time point)
    const researchersWithValues = tableData.filter(
      (r) => r.pointValue !== null && r.pointValue !== undefined
    )
    if (researchersWithValues.length === 0) return 0
    return Math.max(...researchersWithValues.map((r) => r.pointValue || 0))
  }, [tableData])

  // Mark top researchers based on current cursor position
  const tableDataWithTopResearchers = useMemo(() => {
    return tableData.map((researcher) => ({
      ...researcher,
      isTopResearcher:
        researcher.pointValue !== null &&
        researcher.pointValue !== undefined &&
        researcher.pointValue === topScore &&
        topScore > 0,
    }))
  }, [tableData, topScore])

  // Handle empty data
  if (!researchers.length || (!chartData.length && !currentDataPoint)) {
    return (
      <div className="p-4 text-center text-gray-500">
        No researcher data available
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
                Researcher
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
            {tableDataWithTopResearchers.length > 0 ? (
              // Sort table data by meanValue for stable ordering
              [...tableDataWithTopResearchers]
                .sort((a, b) => b.meanValue - a.meanValue)
                .map((researcher) => {
                  // Get the color from the color map
                  const color =
                    researcherColorMap?.get(researcher.id) ||
                    (researcher.isCurrentUser
                      ? PUBLICATION_COLORS[0]
                      : researcher.isTopResearcher
                        ? PUBLICATION_COLORS[2]
                        : PUBLICATION_COLORS[1])

                  const isSelected = selectedResearcherId === researcher.id

                  // Style differently if researcher doesn't exist yet
                  const rowOpacity = researcher.isBeforeFirstAppearance
                    ? 'opacity-50'
                    : ''

                  return (
                    <tr
                      key={researcher.id}
                      data-researcher-id={researcher.id}
                      className={`cursor-pointer hover:bg-gray-50 ${rowOpacity} ${
                        isSelected
                          ? 'bg-gray-200'
                          : researcher.isTopResearcher &&
                              researcher.isCurrentUser
                            ? 'bg-gradient-to-r from-green-100 to-blue-50'
                            : researcher.isTopResearcher
                              ? 'bg-green-100'
                              : researcher.isCurrentUser
                                ? 'bg-blue-50'
                                : ''
                      }`}
                      onClick={() =>
                        onResearcherSelect(isSelected ? null : researcher.id)
                      }
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <div
                            className="mr-3 h-4 w-4 rounded-full"
                            style={{ backgroundColor: String(color) }}
                          ></div>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {researcher.aliasName ||
                                researcher.email ||
                                `Researcher ${researcher.id}`}
                            </span>
                            {researcher.isCurrentUser &&
                              !researcher.isTopResearcher &&
                              !researcher.isBeforeFirstAppearance && (
                                <span className="mt-1 inline-block rounded py-0.5 text-xs text-blue-800">
                                  You
                                </span>
                              )}
                            {researcher.isTopResearcher &&
                              !researcher.isCurrentUser &&
                              !researcher.isBeforeFirstAppearance && (
                                <span className="mt-1 inline-block rounded px-2 py-0.5 text-xs text-green-800">
                                  Top Researcher
                                </span>
                              )}
                            {researcher.isTopResearcher &&
                              researcher.isCurrentUser &&
                              !researcher.isBeforeFirstAppearance && (
                                <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                                  Top Researcher (You)
                                </span>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">
                        {researcher.isBeforeFirstAppearance
                          ? '-'
                          : researcher.pointValue !== null &&
                              researcher.pointValue !== undefined
                            ? researcher.pointValue.toFixed(3)
                            : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-xl">
                        {researcher.isBeforeFirstAppearance ? (
                          <span className="text-gray-400">-</span>
                        ) : researcher.existsAtCurrentTime ? (
                          <span
                            className={`${
                              researcher.trendDirection === 'up'
                                ? 'text-green-600'
                                : researcher.trendDirection === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                            }`}
                          >
                            {researcher.trendDirection === 'up'
                              ? '↑'
                              : researcher.trendDirection === 'down'
                                ? '↓'
                                : '–'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-medium ${
                          researcher.isBeforeFirstAppearance
                            ? 'text-gray-400'
                            : researcher.changeValue &&
                                researcher.changeValue > 0
                              ? 'text-green-600'
                              : researcher.changeValue &&
                                  researcher.changeValue < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                        }`}
                      >
                        {researcher.isBeforeFirstAppearance
                          ? '-'
                          : researcher.existsAtCurrentTime &&
                              researcher.changeValue !== null
                            ? (researcher.changeValue > 0 ? '+' : '') +
                              researcher.changeValue.toFixed(3)
                            : '-'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-medium ${
                          researcher.isBeforeFirstAppearance
                            ? 'text-gray-400'
                            : researcher.percentChangeValue &&
                                researcher.percentChangeValue > 0
                              ? 'text-green-600'
                              : researcher.percentChangeValue &&
                                  researcher.percentChangeValue < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                        }`}
                      >
                        {researcher.isBeforeFirstAppearance
                          ? '-'
                          : researcher.existsAtCurrentTime &&
                              researcher.percentChangeValue !== null
                            ? (researcher.percentChangeValue > 0 ? '+' : '') +
                              Math.min(
                                Math.max(researcher.percentChangeValue, -100),
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

export default ResearcherTable
