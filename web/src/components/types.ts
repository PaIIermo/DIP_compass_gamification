// Common types used across chart and table components

// Base types from GraphQL
export interface PublicationSnapshot {
  snapshot_date: string
  value: number
}

export interface Author {
  userId: number
  user_id?: number // Alternative format for compatibility
  name?: string
}

export interface Publication {
  id: number
  title: string
  doi?: string | null
  overallScore: number
  snapshots?: PublicationSnapshot[]
  authors?: Author[]
  isCurrentUser?: boolean
}

// Enhanced types after processing
export interface EnhancedPublication extends Publication {
  trend?: 'up' | 'down' | 'same' | null
  sortedSnapshots?: PublicationSnapshot[]
}

// Chart data types
export interface ChartDataPoint {
  date: string
  [pubKey: string]: string | number | null // For dynamic properties like pub1, pub2, pub1Title, etc.
}

// Table row data type
export interface TableRowData {
  id: number
  title: string
  doi: string | null
  currentValue: number | null
  change: number | null
  percentChange: number | null
  trend: 'up' | 'down' | 'same' | null
  overallScore: number
  isCurrentUser: boolean
  existsAtCurrentTime?: boolean
  isBeforeFirstAppearance?: boolean
}

export const CHART_COLORS = [
  '#1f77b4', // blue
  '#ff7f0e', // orange
  '#2ca02c', // green
  '#d62728', // red
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // grey
  '#bcbd22', // lime
  '#17becf', // cyan
] as const
