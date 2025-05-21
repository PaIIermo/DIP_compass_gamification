import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import { gql } from 'graphql-tag'
import type {
  TrendingResearchersQuery,
  TrendingResearchersQueryVariables,
} from 'types/graphql'

import type {
  CellSuccessProps,
  CellFailureProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

// Import the same components and helpers used for publications
import { enhanceWithTrends, prepareChartData } from '../dataHelpers'
import ResearcherTable from '../ResearcherTable/ResearcherTable'
import TrendingChart, {
  PUBLICATION_COLORS,
} from '../TrendingChart/TrendingChart'
import { ChartDataPoint } from '../types'

// Define props for the cell component
export interface TrendingResearchersCellProps {
  topicId?: number | null
  lisperatorId: number
}

// Update the interfaces to match what GraphQL actually returns
interface ResearcherSnapshotPoint {
  snapshotDate: string
  meanValue: number
}

interface TrendingResearcher {
  id: number
  email: string | null // Changed from email?: string | null to email: string | null
  aliasName: string | null // Changed from aliasName?: string | null to aliasName: string | null
  meanValue: number
  isCurrentUser: boolean
  snapshots: ResearcherSnapshotPoint[]
}

/**
 * GraphQL query to fetch trending researchers with their snapshots
 */
export const QUERY: TypedDocumentNode<
  TrendingResearchersQuery,
  TrendingResearchersQueryVariables
> = gql`
  query TrendingResearchersQuery($topicId: Int, $lisperatorId: Int!) {
    trendingResearchers(topicId: $topicId, lisperatorId: $lisperatorId) {
      id
      email
      aliasName
      meanValue
      isCurrentUser
      snapshots {
        snapshotDate
        meanValue
      }
    }
  }
`

export const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="border-b-3 border-t-3 h-12 w-12 animate-spin rounded-full border-[#3d8bfd]"></div>
    <span className="ml-4 text-lg text-gray-600">
      Loading researchers data...
    </span>
  </div>
)

export const Empty = () => (
  <div className="rounded-lg bg-gray-50 p-10 text-center">
    <p className="text-lg text-gray-600">
      No researchers found for this topic.
    </p>
    <p className="mt-2 text-gray-500">
      Try selecting a different topic or check back later.
    </p>
  </div>
)

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rounded-md bg-red-50 p-6 text-center text-red-700">
    <p className="text-lg font-medium">Error loading researchers</p>
    <p className="mt-2">{error?.message}</p>
  </div>
)

// Transform the researcher data to match the structure expected by our components
const adaptResearchersForChart = (researchers: TrendingResearcher[]) => {
  return researchers.map((researcher) => ({
    id: researcher.id,
    title:
      researcher.aliasName || researcher.email || `Researcher ${researcher.id}`,
    overallScore: researcher.meanValue,
    isCurrentUser: researcher.isCurrentUser,
    snapshots: researcher.snapshots.map((snapshot) => ({
      snapshot_date: snapshot.snapshotDate,
      value: snapshot.meanValue,
    })),
  }))
}

export const Success = ({
  trendingResearchers,
}: CellSuccessProps<
  TrendingResearchersQuery,
  TrendingResearchersQueryVariables
>) => {
  // Track if user has interacted with the chart
  const userInteractedRef = useRef(false)

  // State for selected researcher
  const [selectedResearcherId, setSelectedResearcherId] = useState<
    number | null
  >(null)

  // Cast the GraphQL results to the TrendingResearcher type
  const typedResearchers = trendingResearchers as TrendingResearcher[]

  // Adapt the researchers data to match the format expected by our chart components
  const adaptedResearchers = useMemo(() => {
    return adaptResearchersForChart(typedResearchers)
  }, [typedResearchers])

  // Memoize the processed researchers to avoid reprocessing on each render
  const researchersWithTrend = useMemo(() => {
    return enhanceWithTrends(adaptedResearchers)
  }, [adaptedResearchers])

  // Memoize the chart data to avoid recalculating on each render
  const chartData = useMemo(() => {
    return prepareChartData(researchersWithTrend)
  }, [researchersWithTrend])

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

  // Find the top score among researchers
  const topScore = useMemo(() => {
    if (!typedResearchers.length) return 0
    return Math.max(...typedResearchers.map((r) => r.meanValue))
  }, [typedResearchers])

  // Create a lookup for researcher colors to ensure consistency
  const researcherColorMap = useMemo(() => {
    const colorMap = new Map<number | string, string | number>()

    // Helper function to create a snapshot fingerprint for researchers
    const getResearcherFingerprint = (
      researcher: TrendingResearcher
    ): string => {
      return researcher.snapshots
        .map((snapshot) => `${snapshot.snapshotDate}:${snapshot.meanValue}`)
        .join('|')
    }

    // Group researchers by their full historical data fingerprint
    const dataHistoryGroups = new Map<string, TrendingResearcher[]>()
    typedResearchers.forEach((researcher) => {
      const fingerprint = getResearcherFingerprint(researcher)
      if (!dataHistoryGroups.has(fingerprint)) {
        dataHistoryGroups.set(fingerprint, [])
      }
      dataHistoryGroups.get(fingerprint)?.push(researcher)
    })

    // Find the current user
    const currentUserResearcher = typedResearchers.find(
      (researcher) => researcher.isCurrentUser
    )

    // Find if current user is a top researcher
    const isCurrentUserTopResearcher =
      currentUserResearcher && currentUserResearcher.meanValue === topScore

    // Assign colors to the groups
    const sortedGroups = Array.from(dataHistoryGroups.entries()).sort(
      (a, b) => {
        // Sort by score (descending)
        return b[1][0].meanValue - a[1][0].meanValue
      }
    )

    sortedGroups.forEach(([_, researchers], groupIndex) => {
      // Skip if there's only one researcher in the group (no need for special coloring)
      if (researchers.length <= 1) return

      // Determine if this is a top score group
      const isTopScoreGroup = researchers[0].meanValue === topScore

      // Choose color based on group type
      let colorToUse
      if (isTopScoreGroup) {
        // All top researchers (including current user) get green
        colorToUse = PUBLICATION_COLORS[2] // Green
      } else {
        // Other groups get different colors
        const colorOptions = [1, 3, 4, 5, 6, 7, 8, 9] // Indices to choose from
        const colorIndex = colorOptions[groupIndex % colorOptions.length]
        colorToUse = PUBLICATION_COLORS[colorIndex]
      }

      // Apply the same color to all researchers in this group
      researchers.forEach((researcher) => {
        colorMap.set(researcher.id, colorToUse)
      })
    })

    // Handle individual researchers (those not in any group)

    // Assign top researchers without a group the green color
    typedResearchers.forEach((researcher) => {
      if (researcher.meanValue === topScore && !colorMap.has(researcher.id)) {
        colorMap.set(researcher.id, PUBLICATION_COLORS[2]) // Green for top researchers
      }
    })

    // ONLY NOW, if current user isn't a top researcher, give them blue
    if (
      currentUserResearcher &&
      !isCurrentUserTopResearcher &&
      !colorMap.has(currentUserResearcher.id)
    ) {
      colorMap.set(currentUserResearcher.id, PUBLICATION_COLORS[0]) // Blue for current user
    }

    // Assign remaining researchers unique colors
    let colorIndex = 1
    typedResearchers.forEach((researcher) => {
      if (!colorMap.has(researcher.id)) {
        // Skip colors already used for groups
        // Also skip blue (0) and green (2)
        while (colorIndex === 0 || colorIndex === 2) {
          colorIndex = (colorIndex + 1) % PUBLICATION_COLORS.length
        }
        colorMap.set(researcher.id, PUBLICATION_COLORS[colorIndex])
        colorIndex = (colorIndex + 1) % PUBLICATION_COLORS.length
      }
    })

    return colorMap
  }, [typedResearchers, topScore])

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

  // Stable callback for researcher selection
  const handleResearcherSelect = useCallback((id: number | null) => {
    setSelectedResearcherId((prevId) => (prevId === id ? null : id))
  }, [])

  // If no researchers, show empty state
  if (!typedResearchers.length) {
    return <div className="py-8 text-center text-gray-500">No data found.</div>
  }

  return (
    <div className="mx-auto">
      {/* Unified container for both chart and table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Line Chart */}
        <TrendingChart
          data={chartData}
          publications={researchersWithTrend}
          onCursorMove={handleCursorMove}
          title="Researcher Scores Over Time"
          selectedPublicationId={selectedResearcherId}
          publicationColorMap={researcherColorMap}
        />

        {/* Thin separator instead of full borders */}
        <div className="mx-4 h-px bg-gray-200"></div>

        {/* Data Table */}
        <ResearcherTable
          researchers={typedResearchers}
          adaptedResearchers={researchersWithTrend}
          chartData={chartData}
          activeIndex={activeDataIndex}
          currentDataPoint={currentDataPoint}
          onResearcherSelect={handleResearcherSelect}
          selectedResearcherId={selectedResearcherId}
          researcherColorMap={researcherColorMap}
        />
      </div>
    </div>
  )
}
