import { useMemo } from 'react'

import { PUBLICATION_COLORS } from '../TrendingChart/TrendingChart'
import { EnhancedTopic, TopicSnapshotPoint } from '../TrendingTopicsCell'
import { ChartDataPoint } from '../types'

interface TopicTrend {
  id: number
  name: string
  meanValue: number
  isBest: boolean
  snapshots: TopicSnapshotPoint[]
}

// Interface for the table row data - specific to this component
interface TopicTableRow {
  id: number
  name: string
  meanValue: number
  isBest: boolean
  pointValue?: number | null
  changeValue?: number | null
  percentChangeValue?: number | null
  trendDirection?: 'up' | 'down' | 'same' | null
  overallTrend?: 'up' | 'down' | 'same' | null
  isTopTopic?: boolean
  existsAtCurrentTime?: boolean
  isBeforeFirstAppearance?: boolean
}

// Props for the topic table component
interface TopicTableProps {
  topics: TopicTrend[]
  adaptedTopics: EnhancedTopic[] // Now properly typed
  chartData: ChartDataPoint[]
  activeIndex: number
  currentDataPoint: ChartDataPoint | null
  onTopicSelect: (id: number | null) => void
  selectedTopicId: number | null
  topicColorMap?: Map<string | number, string | number>
}

const TopicTable = ({
  topics = [],
  adaptedTopics = [],
  chartData = [],
  activeIndex = 0,
  currentDataPoint = null,
  onTopicSelect,
  selectedTopicId,
  topicColorMap,
}: TopicTableProps) => {
  // Prepare data for the table based on cursor position
  const tableData = useMemo<TopicTableRow[]>(() => {
    // If we have a specific data point, use that directly
    if (currentDataPoint) {
      // For each topic, extract relevant data from the current point
      return topics.map((topic) => {
        const id = topic.id
        const currentKey = `pub${id}` // Using pub prefix to match chart data format
        const pointValue =
          currentDataPoint[currentKey] !== undefined
            ? Number(currentDataPoint[currentKey])
            : null

        // Find the first appearance of this topic in the dataset
        let firstValue = null
        let firstValueDate = null
        let previousValue = null

        if (chartData && chartData.length > 0) {
          // Find the first point that has data for this topic
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

        // Check if topic exists at current time
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
          // Special handling for time before topic exists
          changeValue = null
          trendDirection = null
          percentChangeValue = null
        } else {
          // Topic should exist but has no value at this point
          changeValue = null
          trendDirection = null
          percentChangeValue = null
        }

        // Find the adapted topic with trend info
        const adaptedTopic = adaptedTopics.find((t) => t.id === topic.id)

        return {
          id,
          name: topic.name,
          meanValue: topic.meanValue,
          isBest: topic.isBest,
          pointValue,
          changeValue,
          percentChangeValue,
          trendDirection,
          overallTrend: adaptedTopic?.trend,
          existsAtCurrentTime,
          isBeforeFirstAppearance,
        }
      })
    }

    // Fallback to using activeIndex with chartData
    if (!chartData || chartData.length === 0) {
      return topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        meanValue: topic.meanValue,
        isBest: topic.isBest,
        overallTrend: adaptedTopics.find((t) => t.id === topic.id)?.trend,
      }))
    }

    // Make sure activeIndex is within bounds
    const validIndex = Math.min(Math.max(0, activeIndex), chartData.length - 1)

    // Get current data point based on cursor position
    const currentPoint = chartData[validIndex]
    if (!currentPoint) {
      return topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        meanValue: topic.meanValue,
        isBest: topic.isBest,
        overallTrend: adaptedTopics.find((t) => t.id === topic.id)?.trend,
      }))
    }

    // Get previous data point for calculating changes
    const previousPoint = validIndex > 0 ? chartData[validIndex - 1] : null

    // For each topic, extract relevant data
    return topics.map((topic) => {
      const id = topic.id
      const currentKey = `pub${id}`
      const pointValue =
        currentPoint[currentKey] !== undefined
          ? Number(currentPoint[currentKey])
          : null

      // Find the first appearance of this topic in the dataset
      let firstValue = null
      let firstValueDate = null
      if (chartData && chartData.length > 0) {
        // Find the first point that has data for this topic
        for (const point of chartData) {
          if (point[currentKey] !== undefined && point[currentKey] !== null) {
            firstValue = Number(point[currentKey])
            firstValueDate = point.date
            break
          }
        }
      }

      // Check if topic exists at current time
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
        // Special handling for time before topic exists
        changeValue = null
        trendDirection = null
        percentChangeValue = null
      } else {
        // Topic should exist but has no value at this point
        changeValue = null
        trendDirection = null
        percentChangeValue = null
      }

      // Find the adapted topic with trend info
      const adaptedTopic = adaptedTopics.find((t) => t.id === topic.id)

      return {
        id,
        name: topic.name,
        meanValue: topic.meanValue,
        isBest: topic.isBest,
        pointValue,
        changeValue,
        percentChangeValue,
        trendDirection,
        overallTrend: adaptedTopic?.trend,
        existsAtCurrentTime,
        isBeforeFirstAppearance,
      }
    })
  }, [topics, adaptedTopics, chartData, activeIndex, currentDataPoint])

  // Find the top score value at the current cursor position (highest current value)
  const topScore = useMemo(() => {
    if (!tableData.length) return 0
    // Only consider topics that have a current value (exist at this time point)
    const topicsWithValues = tableData.filter(
      (t) => t.pointValue !== null && t.pointValue !== undefined
    )
    if (topicsWithValues.length === 0) return 0
    return Math.max(...topicsWithValues.map((t) => t.pointValue || 0))
  }, [tableData])

  // Mark top topics based on current cursor position
  const tableDataWithTopTopics = useMemo(() => {
    return tableData.map((topic) => ({
      ...topic,
      isTopTopic:
        topic.pointValue !== null &&
        topic.pointValue !== undefined &&
        topic.pointValue === topScore &&
        topScore > 0,
    }))
  }, [tableData, topScore])

  // Handle empty data
  if (!topics.length || (!chartData.length && !currentDataPoint)) {
    return (
      <div className="p-4 text-center text-gray-500">
        No topic data available
      </div>
    )
  }

  // Rest of the component remains the same...
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
                Topic
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
            {tableDataWithTopTopics.length > 0 ? (
              // Sort table data by meanValue for stable ordering
              [...tableDataWithTopTopics]
                .sort((a, b) => b.meanValue - a.meanValue)
                .map((topic) => {
                  // Determine row color and styling
                  const color =
                    topicColorMap?.get(topic.id) || PUBLICATION_COLORS[0]
                  const isSelected = selectedTopicId === topic.id

                  // Style differently if topic doesn't exist yet
                  const rowOpacity = topic.isBeforeFirstAppearance
                    ? 'opacity-50'
                    : ''

                  return (
                    <tr
                      key={topic.id}
                      data-topic-id={topic.id}
                      className={`cursor-pointer hover:bg-gray-50 ${rowOpacity} ${
                        isSelected
                          ? 'bg-gray-200'
                          : topic.isTopTopic
                            ? 'bg-green-100'
                            : ''
                      }`}
                      onClick={() =>
                        onTopicSelect(isSelected ? null : topic.id)
                      }
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <div
                            className="mr-3 h-4 w-4 rounded-full"
                            style={{ backgroundColor: String(color) }}
                          ></div>
                          <div className="flex flex-col">
                            <span className="font-medium">{topic.name}</span>
                            {topic.isTopTopic &&
                              !topic.isBeforeFirstAppearance && (
                                <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                                  Top Topic
                                </span>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">
                        {topic.isBeforeFirstAppearance
                          ? '-'
                          : topic.pointValue !== null &&
                              topic.pointValue !== undefined
                            ? topic.pointValue.toFixed(3)
                            : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-xl">
                        {topic.isBeforeFirstAppearance ? (
                          <span className="text-gray-400">-</span>
                        ) : topic.existsAtCurrentTime ? (
                          <span
                            className={`${
                              topic.trendDirection === 'up'
                                ? 'text-green-600'
                                : topic.trendDirection === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                            }`}
                          >
                            {topic.trendDirection === 'up'
                              ? '↑'
                              : topic.trendDirection === 'down'
                                ? '↓'
                                : '–'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-medium ${
                          topic.isBeforeFirstAppearance
                            ? 'text-gray-400'
                            : topic.changeValue && topic.changeValue > 0
                              ? 'text-green-600'
                              : topic.changeValue && topic.changeValue < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                        }`}
                      >
                        {topic.isBeforeFirstAppearance
                          ? '-'
                          : topic.existsAtCurrentTime &&
                              topic.changeValue !== null
                            ? (topic.changeValue > 0 ? '+' : '') +
                              topic.changeValue.toFixed(3)
                            : '-'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-medium ${
                          topic.isBeforeFirstAppearance
                            ? 'text-gray-400'
                            : topic.percentChangeValue &&
                                topic.percentChangeValue > 0
                              ? 'text-green-600'
                              : topic.percentChangeValue &&
                                  topic.percentChangeValue < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                        }`}
                      >
                        {topic.isBeforeFirstAppearance
                          ? '-'
                          : topic.existsAtCurrentTime &&
                              topic.percentChangeValue !== null
                            ? (topic.percentChangeValue > 0 ? '+' : '') +
                              Math.min(
                                Math.max(topic.percentChangeValue, -100),
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

export default TopicTable
