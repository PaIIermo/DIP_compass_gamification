export const schema = gql`
  # Basic Publication type representing a row in the compass.Publication table
  type Publication {
    id: Int!
    submission_id: Int!
    doi: String
    title: String
    conference: Int
    conference_name: String
    review_score: Float
    overall_score: Float
    trend: Float
    citation_count: Int
    date_published: DateTime
    last_edited_at: DateTime
  }

  # Author information
  type Author {
    userId: Int!
    name: String
  }

  # Type representing a publication snapshot data point for trending publications
  type TrendingPublicationSnapshot {
    snapshot_date: String!
    value: Float!
  }

  # Type representing a trending publication with snapshots
  type TrendingPublication {
    id: Int!
    title: String!
    doi: String
    overallScore: Float!
    isCurrentUser: Boolean
    snapshots: [TrendingPublicationSnapshot!]!
    authors: [Author!]
  }

  type Query {
    publications: [Publication!]! @requireAuth
    publication(id: Int!): Publication @requireAuth
    myPublications(userId: Int!): [Publication!]! @skipAuth

    # Updated query with userId parameter to identify current user's publications
    trendingPublications(topicId: Int, userId: Int): [TrendingPublication!]!
      @requireAuth
  }
`
