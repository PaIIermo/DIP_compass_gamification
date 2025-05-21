export const schema = gql`
  type Citation {
    id: Int!
    publication_id: Int!
    oci: String!
    citing: String
    creation_date: DateTime
    author_sc: Boolean
    publication: Publication!
  }

  type Query {
    citations: [Citation!]! @requireAuth
    citation(id: Int!): Citation @requireAuth
    publicationCitations(publicationId: Int!): [Citation!]! @requireAuth
  }
`
