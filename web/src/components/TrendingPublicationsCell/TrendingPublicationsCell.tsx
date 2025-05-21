import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import { gql } from 'graphql-tag'
import type {
  TrendingPublicationsQuery,
  TrendingPublicationsQueryVariables,
} from 'types/graphql'

import type {
  CellSuccessProps,
  CellFailureProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

// Import our custom components
import { enhanceWithTrends, prepareChartData } from '../dataHelpers'
import PublicationTable from '../PublicationTable/PublicationTable'
import TrendingChart, {
  PUBLICATION_COLORS,
} from '../TrendingChart/TrendingChart'
import { ChartDataPoint, EnhancedPublication } from '../types'

// Define props for the cell component
export interface TrendingPublicationsCellProps {
  topicId?: number | null
  userId?: number | null
}

/**
 * GraphQL query to fetch trending publications with their snapshots
 */
export const QUERY: TypedDocumentNode<
  TrendingPublicationsQuery,
  TrendingPublicationsQueryVariables
> = gql`
  query TrendingPublicationsQuery($topicId: Int, $userId: Int) {
    trendingPublications(topicId: $topicId, userId: $userId) {
      id
      title
      doi
      overallScore
      isCurrentUser
      authors {
        userId
        name
      }
      snapshots {
        snapshot_date
        value
      }
    }
  }
`

/**
 * Set up query variables before making the request
 * This ensures we always pass the userId to the resolver
 */
export const beforeQuery = (props: TrendingPublicationsCellProps) => {
  // Get userId from localStorage if not provided in props
  const userId = props.userId || Number(localStorage.getItem('userId')) || null

  return {
    variables: {
      topicId: props.topicId || null,
      userId,
    },
  }
}

export const Loading = () => (
  <div className="py-8 text-center text-gray-500">Loading publications...</div>
)

export const Empty = () => (
  <div className="py-8 text-center text-gray-500">No publications found.</div>
)

export const Failure = ({
  error,
}: CellFailureProps<TrendingPublicationsQueryVariables>) => (
  <div className="py-8 text-center text-red-500">Error: {error?.message}</div>
)

// This is the main component that gets data from GraphQL and coordinates the chart and table
export const Success = ({
  trendingPublications,
  userId: propUserId,
}: CellSuccessProps<
  TrendingPublicationsQuery,
  TrendingPublicationsQueryVariables
> &
  TrendingPublicationsCellProps) => {
  // Track if user has interacted with the chart
  const userInteractedRef = useRef(false)

  // State for selected publication
  const [selectedPublicationId, setSelectedPublicationId] = useState<
    number | null
  >(null)

  // Get current user ID from localStorage if not provided through props
  const [currentUserId, setCurrentUserId] = useState<number | null>(
    propUserId || null
  )

  // Memoize the processed publications to avoid reprocessing on each render
  const publicationsWithTrend = useMemo(() => {
    return enhanceWithTrends(trendingPublications)
  }, [trendingPublications])

  // Get the current user ID on component mount if not provided in props
  useEffect(() => {
    if (propUserId !== undefined) {
      console.log('Using propUserId:', propUserId)
      setCurrentUserId(propUserId)
    } else {
      const storedId = localStorage.getItem('userId')
      console.log('Found userId in localStorage:', storedId)
      if (storedId) {
        const parsedId = Number(storedId)
        console.log('Parsed userId from localStorage:', parsedId)
        setCurrentUserId(parsedId)
      } else {
        console.log('No userId found in localStorage')
      }
    }
  }, [propUserId])

  // Memoize the chart data to avoid recalculating on each render
  const chartData = useMemo(() => {
    return prepareChartData(publicationsWithTrend)
  }, [publicationsWithTrend])

  // State to track cursor position on chart (for table interaction)
  const [activeDataIndex, setActiveDataIndex] = useState(0)

  // State to track the current data point (from chart to table)
  const [currentDataPoint, setCurrentDataPoint] =
    useState<ChartDataPoint | null>(null)

  // Initialize the currentDataPoint to the latest data on first render - use a ref to ensure it only runs once
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

  // Create a lookup for publication colors to ensure consistency
  const publicationColorMap = useMemo(() => {
    const colorMap = new Map<number | string, string | number>()

    // Store current user ID for reference - explicitly store as a number
    if (currentUserId !== null) {
      colorMap.set('currentUserId', currentUserId)
    }

    // Helper function to create a snapshot fingerprint for publications
    const getPublicationFingerprint = (
      publication: EnhancedPublication
    ): string => {
      if (!publication.snapshots || publication.snapshots.length === 0) {
        return `single-${publication.id}`
      }
      return publication.snapshots
        .map((snapshot) => `${snapshot.snapshot_date}:${snapshot.value}`)
        .join('|')
    }

    // Group publications by their historical data fingerprint
    const dataHistoryGroups = new Map<string, EnhancedPublication[]>()
    publicationsWithTrend.forEach((pub) => {
      const fingerprint = getPublicationFingerprint(pub)
      if (!dataHistoryGroups.has(fingerprint)) {
        dataHistoryGroups.set(fingerprint, [])
      }
      dataHistoryGroups.get(fingerprint)?.push(pub)
    })

    // Find user publications
    const userPublications = publicationsWithTrend.filter(
      (pub) =>
        pub.isCurrentUser ||
        pub.authors?.some((author) => author.userId === currentUserId)
    )

    // Special case: if the user has publications, assign them the blue color
    userPublications.forEach((pub) => {
      colorMap.set(pub.id, PUBLICATION_COLORS[0]) // Blue for user publications
    })

    // Sort groups by overall score (descending)
    const sortedGroups = Array.from(dataHistoryGroups.entries()).sort(
      (a, b) => {
        // Sort by score (descending)
        return b[1][0].overallScore - a[1][0].overallScore
      }
    )

    // Assign colors to groups with multiple publications (identical histories)
    sortedGroups.forEach(([_, publications], groupIndex) => {
      // Skip if there's only one publication in the group
      if (publications.length <= 1) return

      // Choose a consistent color for this group (excluding blue which is for user publications)
      const colorOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9] // Skip blue (0)
      const colorIndex = colorOptions[groupIndex % colorOptions.length]
      const colorToUse = PUBLICATION_COLORS[colorIndex]

      // Apply the same color to all publications in this group (except user publications)
      publications.forEach((pub) => {
        // Don't override user publication colors
        if (!userPublications.some((userPub) => userPub.id === pub.id)) {
          colorMap.set(pub.id, colorToUse)
        }
      })
    })

    // Assign colors to remaining publications
    let nextColorIndex = 1 // Start at 1 to avoid blue (0)
    publicationsWithTrend.forEach((pub) => {
      if (!colorMap.has(pub.id)) {
        // Skip blue (0) which is reserved for user publications
        if (nextColorIndex === 0) nextColorIndex = 1

        colorMap.set(
          pub.id,
          PUBLICATION_COLORS[nextColorIndex % PUBLICATION_COLORS.length]
        )
        nextColorIndex++
      }
    })

    return colorMap
  }, [publicationsWithTrend, currentUserId])

  // Stable callback for cursor movement using useCallback to prevent unnecessary re-renders
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

  // Stable callback for publication selection
  const handlePublicationSelect = useCallback((id: number | null) => {
    setSelectedPublicationId((prevId) => (prevId === id ? null : id))
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      {/* Unified container for both chart and table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow">
        {/* Line Chart */}
        <TrendingChart
          data={chartData}
          publications={publicationsWithTrend}
          onCursorMove={handleCursorMove}
          title="Publication Scores Over Time"
          selectedPublicationId={selectedPublicationId}
          publicationColorMap={publicationColorMap}
        />

        {/* Thin separator instead of full borders */}
        <div className="mx-4 h-px bg-gray-200"></div>

        {/* Data Table */}
        <PublicationTable
          publications={publicationsWithTrend}
          chartData={chartData}
          activeIndex={activeDataIndex}
          currentDataPoint={currentDataPoint}
          currentUserId={currentUserId}
          onPublicationSelect={handlePublicationSelect}
          selectedPublicationId={selectedPublicationId}
          publicationColorMap={publicationColorMap}
        />
      </div>
    </div>
  )
}
