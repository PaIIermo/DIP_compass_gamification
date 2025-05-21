/**
 * TrendingTopicsCell.tsx
 *
 * This cell handles fetching and displaying trending topics.
 * Enhanced with a chart visualization similar to publications and researchers.
 */
import { useMemo, useState, useCallback, useRef, useEffect } from 'react'

import { gql } from 'graphql-tag'
import type {
  TrendingTopicsQuery,
  TrendingTopicsQueryVariables,
} from 'types/graphql'

import type {
  CellSuccessProps,
  CellFailureProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

// Import the same components and helpers used for publications
import { enhanceWithTrends, prepareChartData } from '../dataHelpers'
import TopicTable from '../TopicTable/TopicTable'
import TrendingChart, {
  PUBLICATION_COLORS,
} from '../TrendingChart/TrendingChart'
import { ChartDataPoint } from '../types'

// Define proper interfaces for topics
interface TopicSnapshot {
  snapshot_date: string
  value: number
}

interface TopicTrend {
  id: number
  name: string
  meanValue: number
  isBest: boolean
  snapshots: TopicSnapshot[]
}

// Interface for the topic data from GraphQL
export interface TopicSnapshotPoint {
  snapshot_date: string
  value: number
}

// Enhanced topic type after processing with enhanceWithTrends
export interface EnhancedTopic extends TopicTrend {
  trend?: 'up' | 'down' | 'same' | null
  sortedSnapshots?: TopicSnapshotPoint[]
}

/**
 * GraphQL query to fetch trending topics
 * Now includes snapshots array for historical data
 */
export const QUERY: TypedDocumentNode<
  TrendingTopicsQuery,
  TrendingTopicsQueryVariables
> = gql`
  query TrendingTopicsQuery {
    trendingTopics {
      id
      name
      meanValue
      isBest
      snapshots {
        snapshot_date
        value
      }
    }
  }
`

export const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="border-t-3 border-b-3 h-12 w-12 animate-spin rounded-full border-[#3d8bfd]"></div>
    <span className="ml-4 text-lg text-gray-600">Loading topics data...</span>
  </div>
)

export const Empty = () => (
  <div className="rounded-lg bg-gray-50 p-10 text-center">
    <p className="text-lg text-gray-600">No trending topics found.</p>
    <p className="mt-2 text-gray-500">Check back later for topic trends.</p>
  </div>
)

export const Failure = ({
  error,
}: CellFailureProps<TrendingTopicsQueryVariables>) => (
  <div className="rounded-md bg-red-50 p-6 text-center text-red-700">
    <p className="text-lg font-medium">Error loading topics</p>
    <p className="mt-2">{error?.message}</p>
  </div>
)

export const Success = ({
  trendingTopics,
}: CellSuccessProps<TrendingTopicsQuery, TrendingTopicsQueryVariables>) => {
  // Track if user has interacted with the chart
  const userInteractedRef = useRef(false)

  // State for selected topic
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)

  // Memoize the processed topics to avoid reprocessing on each render
  const topicsWithTrend = useMemo(() => {
    // Now enhanceWithTrends accepts any item with id and snapshots
    const enhanced = enhanceWithTrends(trendingTopics)
    // Map the enhanced items to EnhancedTopic type
    return enhanced.map((item) => ({
      ...item,
      id: item.id,
      name: item.name,
      meanValue: item.meanValue,
      isBest: item.isBest,
      snapshots: item.snapshots,
      trend: item.trend,
      sortedSnapshots: item.sortedSnapshots,
    })) as EnhancedTopic[]
  }, [trendingTopics])

  // Adapt the topics data to match the format expected by our chart components
  const adaptedTopicsForChart = useMemo(() => {
    // Map enhanced topics to the format expected by the chart
    return topicsWithTrend.map((topic) => ({
      id: topic.id,
      title: topic.name, // Map name to title for chart
      overallScore: topic.meanValue, // Map meanValue to overallScore for chart
      snapshots: topic.snapshots,
      sortedSnapshots: topic.sortedSnapshots, // Include sortedSnapshots!
    }))
  }, [topicsWithTrend])

  // Memoize the chart data to avoid recalculating on each render
  const chartData = useMemo(() => {
    // Use the adapted data for the chart which has sortedSnapshots
    return prepareChartData(adaptedTopicsForChart)
  }, [adaptedTopicsForChart])

  // State to track cursor position on chart (for table interaction)
  const [activeDataIndex, setActiveDataIndex] = useState(0)

  // State to track the current data point (from chart to table)
  const [currentDataPoint, setCurrentDataPoint] =
    useState<ChartDataPoint | null>(null)

  // Initialize the currentDataPoint to the latest data on first render
  const initializedRef = useRef(false)

  useEffect(() => {
    if (
      chartData &&
      chartData.length > 0 &&
      !initializedRef.current &&
      !userInteractedRef.current
    ) {
      initializedRef.current = true
      const latestIndex = chartData.length - 1
      setActiveDataIndex(latestIndex)
      setCurrentDataPoint(chartData[latestIndex])
    }
  }, [chartData])

  // Create a lookup for topic colors to ensure consistency
  const topicColorMap = useMemo(() => {
    const colorMap = new Map<number | string, string | number>()

    // First identify the best topic for highlighting
    const bestTopic = topicsWithTrend.find((topic) => topic.isBest)

    // Ensure best topic gets a prominent color
    if (bestTopic) {
      colorMap.set(bestTopic.id, PUBLICATION_COLORS[0]) // Blue for best topic
    }

    // Then assign colors to remaining topics
    topicsWithTrend.forEach((topic, index) => {
      if (!colorMap.has(topic.id)) {
        const colorIndex = topic.isBest
          ? 0
          : (index % (PUBLICATION_COLORS.length - 1)) + 1
        colorMap.set(topic.id, PUBLICATION_COLORS[colorIndex])
      }
    })

    return colorMap
  }, [topicsWithTrend])

  // Stable callback for cursor movement
  const handleCursorMove = useCallback(
    (index: number, dataPoint: ChartDataPoint | null) => {
      // Mark that user has interacted with the chart
      if (dataPoint) {
        userInteractedRef.current = true
      }

      setActiveDataIndex(index)
      setCurrentDataPoint(dataPoint)
    },
    []
  )

  // Stable callback for topic selection
  const handleTopicSelect = useCallback((id: number | null) => {
    setSelectedTopicId((prevId) => (prevId === id ? null : id))
  }, [])

  // If no topics, show empty state
  if (!trendingTopics.length) {
    return (
      <div className="py-8 text-center text-gray-500">No topics found.</div>
    )
  }

  return (
    <div className="mx-auto">
      {/* Unified container for both chart and table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Line Chart */}
        <TrendingChart
          data={chartData}
          publications={adaptedTopicsForChart} // Use adapted data for chart
          onCursorMove={handleCursorMove}
          title="Topic Scores Over Time"
          selectedPublicationId={selectedTopicId}
          publicationColorMap={topicColorMap}
        />

        {/* Thin separator instead of full borders */}
        <div className="mx-4 h-px bg-gray-200"></div>

        {/* Data Table */}
        <TopicTable
          topics={trendingTopics} // Original topic data
          adaptedTopics={topicsWithTrend} // Enhanced topics with trends
          chartData={chartData}
          activeIndex={activeDataIndex}
          currentDataPoint={currentDataPoint}
          onTopicSelect={handleTopicSelect}
          selectedTopicId={selectedTopicId}
          topicColorMap={topicColorMap}
        />
      </div>
    </div>
  )
}
