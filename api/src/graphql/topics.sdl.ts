export const schema = gql`
  type Topic {
    id: Int!
    name: String!
  }

  # A single snapshot data point for a topic
  type TopicSnapshotPoint {
    snapshot_date: DateTime!
    value: Float!
  }

  # Enhanced topic trend type with historical data
  type TopicTrend {
    id: Int!
    name: String!
    meanValue: Float!
    isBest: Boolean!
    # Added snapshots array for historical data and trend visualization
    snapshots: [TopicSnapshotPoint!]!
  }

  type Query {
    topics: [Topic!]! @requireAuth
    trendingTopics: [TopicTrend!]! @skipAuth
  }
`
