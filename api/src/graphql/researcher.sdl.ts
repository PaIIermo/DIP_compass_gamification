export const schema = gql`
  type ResearcherSnapshotPoint {
    snapshotDate: DateTime!
    meanValue: Float!
  }

  # This type represents a researcher in our trending list
  # It contains both their current score and historical snapshots for trend visualization
  type TrendingResearcher {
    id: Int! # The user's ID in our system
    email: String
    aliasName: String
    meanValue: Float! # Their current average score (as of the most recent snapshot)
    isCurrentUser: Boolean! # Flag to highlight the current user in the UI
    snapshots: [ResearcherSnapshotPoint!]! # Historical data points for charting trends
  }

  # Our GraphQL query defines what data can be requested
  type Query {
    # This query fetches trending researchers for a specific topic or overall
    # If topicId is NULL, it returns the overall ranking across all topics
    trendingResearchers(
      topicId: Int # Optional - If null, returns overall rankings
      lisperatorId: Int! # Required - The current user's ID for highlighting
    ): [TrendingResearcher!]! @requireAuth # Returns an array of researchers, requires authentication
  }
`
