import { useState, useEffect, useCallback, useRef } from 'react'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

import { filterChartDataByTimePeriod, TimePeriod } from '../dataHelpers'
import { ChartDataPoint, EnhancedPublication } from '../types'

// Define a type for the mouse move event state from Recharts
interface ChartMouseMoveState {
  activeTooltipIndex?: number
  activeLabel?: string
  activePayload?: Array<{
    value: number
    payload: ChartDataPoint
    dataKey: string
  }>
}

// Define colors for publications - 10 distinct colors
export const PUBLICATION_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // violet
]

interface TrendingChartProps {
  data: ChartDataPoint[]
  publications: EnhancedPublication[]
  onCursorMove: (index: number, dataPoint: ChartDataPoint | null) => void
  title?: string
  selectedPublicationId?: number | null
  publicationColorMap?: Map<string | number, string | number>
}

const TrendingChart = ({
  data = [],
  publications = [],
  onCursorMove,
  title = 'Publication Scores Over Time',
  selectedPublicationId = null,
  publicationColorMap,
}: TrendingChartProps) => {
  // User interaction state
  const userInteractedRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [referenceX, setReferenceX] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [filteredData, setFilteredData] = useState<ChartDataPoint[]>([])

  // Filter data based on selected time period
  useEffect(() => {
    if (!data || data.length === 0) {
      setFilteredData([])
      return
    }

    // Use the helper function to filter data by time period
    const filtered = filterChartDataByTimePeriod(data, timePeriod)
    setFilteredData(filtered)

    // When time period changes, set the active index to the last item (most recent)
    // but ONLY if the user hasn't interacted yet or we have no current position
    if (
      filtered.length > 0 &&
      (activeIndex >= filtered.length || activeIndex < 0)
    ) {
      const newIndex = filtered.length - 1
      setActiveIndex(newIndex)
      onCursorMove(newIndex, filtered[newIndex])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod, data, onCursorMove])

  // When data initially loads, set to the most recent point
  useEffect(() => {
    if (filteredData.length > 0 && !userInteractedRef.current) {
      const newIndex = filteredData.length - 1
      setActiveIndex(newIndex)
      onCursorMove(newIndex, filteredData[newIndex])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData.length, onCursorMove])

  // Stable callback for mouse move - optimized to reduce rerenders
  const handleMouseMove = useCallback(
    (state: ChartMouseMoveState) => {
      if (state && state.activeTooltipIndex !== undefined) {
        const index = state.activeTooltipIndex
        if (index >= 0 && index < filteredData.length) {
          // Mark that user has interacted with the chart
          userInteractedRef.current = true

          setActiveIndex(index)
          setReferenceX(state.activeLabel || null)

          // Send both the index AND the actual data point to the parent
          onCursorMove(index, filteredData[index])
        }
      }
    },
    [filteredData, onCursorMove]
  )

  // Render empty state if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white p-4 shadow">
        <p className="text-gray-500">
          No data available for chart visualization
        </p>
      </div>
    )
  }

  // Render empty state if filtered data is empty
  if (filteredData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div className="flex space-x-2">
            {(['6m', '1y', '2y', '5y', 'ytd', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  timePeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period === 'ytd'
                  ? 'YTD'
                  : period === 'all'
                    ? 'All'
                    : period === '2y'
                      ? '2Y'
                      : period === '5y'
                        ? '5Y'
                        : period === '1y'
                          ? '1Y'
                          : '6M'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">
            No data available for the selected time period
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-4">
      {/* Title and time period selector */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="flex space-x-2">
          {(['6m', '1y', '2y', '5y', 'ytd', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                timePeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period === 'ytd'
                ? 'YTD'
                : period === 'all'
                  ? 'All'
                  : period === '2y'
                    ? '2Y'
                    : period === '5y'
                      ? '5Y'
                      : period === '1y'
                        ? '1Y'
                        : '6M'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onMouseMove={handleMouseMove}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
              minTickGap={30}
            />
            <YAxis tick={{ fontSize: 12 }} />

            {/* Reference line showing current cursor position */}
            {referenceX && (
              <ReferenceLine
                x={referenceX}
                stroke="#666"
                strokeDasharray="3 3"
              />
            )}

            {/* Lines for publications - render selected publication last to pin it on top */}
            {/* First render non-selected publications */}
            {publications
              .filter((pub) => pub.id !== selectedPublicationId)
              .map((pub, idx) => {
                // Use the color map if provided, otherwise fallback to index-based color
                const colorValue =
                  publicationColorMap?.get(pub.id) ||
                  PUBLICATION_COLORS[idx % PUBLICATION_COLORS.length]
                const color = String(colorValue) // Ensure it's a string for CSS
                const currentUserIdFromMap =
                  publicationColorMap?.get('currentUserId')
                const isUserPublication =
                  pub.isCurrentUser ||
                  pub.authors?.some(
                    (author) =>
                      currentUserIdFromMap !== undefined &&
                      author.userId === Number(currentUserIdFromMap)
                  )

                return (
                  <Line
                    key={pub.id}
                    type="monotone"
                    dataKey={`pub${pub.id}`}
                    stroke={color}
                    strokeWidth={isUserPublication ? 2.5 : 2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    connectNulls
                    opacity={selectedPublicationId !== null ? 0.3 : 1}
                    isAnimationActive={false}
                  />
                )
              })}

            {/* Then render selected publication on top if there is one */}
            {selectedPublicationId &&
              publications
                .filter((pub) => pub.id === selectedPublicationId)
                .map((pub) => {
                  const color =
                    publicationColorMap?.get(pub.id) ||
                    PUBLICATION_COLORS[
                      publications.findIndex((p) => p.id === pub.id) %
                        PUBLICATION_COLORS.length
                    ]

                  return (
                    <Line
                      key={pub.id}
                      type="monotone"
                      dataKey={`pub${pub.id}`}
                      stroke={String(color)}
                      strokeWidth={3.5}
                      dot={false}
                      activeDot={{ r: 8 }}
                      connectNulls
                      isAnimationActive={false}
                      style={{ zIndex: 1000 }}
                    />
                  )
                })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Selected date indicator - only show in the chart, not in the table */}
      {filteredData.length > 0 &&
        activeIndex >= 0 &&
        activeIndex < filteredData.length && (
          <div className="mt-2 text-center text-sm font-medium text-gray-600">
            Selected date:{' '}
            {new Date(filteredData[activeIndex].date).toLocaleDateString()}
          </div>
        )}
    </div>
  )
}

export default TrendingChart
