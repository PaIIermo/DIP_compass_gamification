import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const citations: QueryResolvers['citations'] = () => {
  return db.citation.findMany()
}

export const citation: QueryResolvers['citation'] = ({ id }) => {
  return db.citation.findUnique({
    where: { id },
  })
}

export const publicationCitations: QueryResolvers['publicationCitations'] = ({
  publicationId,
}) => {
  return db.citation.findMany({
    where: { publication_id: publicationId },
    orderBy: { creation_date: 'desc' },
  })
}
