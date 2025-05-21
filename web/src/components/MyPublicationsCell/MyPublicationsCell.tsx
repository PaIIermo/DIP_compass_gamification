import { useState, useEffect } from 'react'

import type {
  MyPublicationsQuery,
  MyPublicationsQueryVariables,
} from 'types/graphql'

import { Link, routes } from '@redwoodjs/router'
import type {
  CellSuccessProps,
  CellFailureProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

import { truncate } from 'src/lib/formatters'

export const QUERY: TypedDocumentNode<MyPublicationsQuery> = gql`
  query MyPublicationsQuery($userId: Int!) {
    myPublications(userId: $userId) {
      id
      submission_id
      doi
      title
      conference
      conference_name
      review_score
      overall_score
      trend
      citation_count
      date_published
    }
  }
`

export const Loading = () => (
  <div className="flex justify-center py-8">
    <div className="border-t-3 border-b-3 h-12 w-12 animate-spin rounded-full border-[#3d8bfd]"></div>
  </div>
)

export const Empty = () => (
  <div className="rounded-lg bg-white p-10 text-center">
    <p className="text-lg text-gray-600">
      You don&apos;t have any publications yet.
    </p>
  </div>
)

export const Failure = ({
  error,
}: CellFailureProps<MyPublicationsQueryVariables>) => (
  <div className="rounded-md bg-red-50 p-6 text-base text-red-700">
    <p>Error: {error?.message}</p>
  </div>
)

// Simplified component for truncated text without hover
const TruncatedText = ({ text, maxLength = 20 }) => {
  if (!text) return <span className="text-gray-400">-</span>

  const displayText = text.length > maxLength ? truncate(text, maxLength) : text

  return (
    <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
      {displayText}
    </div>
  )
}

// Format date in a user friendly way
const formatDate = (dateString) => {
  if (!dateString) return '-'

  const date = new Date(dateString)

  // Check if date is valid
  if (isNaN(date.getTime())) return dateString

  // Format: Aug 11, 2015
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Card component for mobile view
const PublicationCard = ({ pub }) => {
  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-base font-medium text-gray-900 sm:text-lg">
        {pub.title || `Publication ID: ${pub.submission_id}`}
      </h3>

      <div className="mb-3 grid grid-cols-2 gap-y-2">
        <div className="text-sm font-medium text-gray-500">DOI:</div>
        <div className="text-sm">{pub.doi || '-'}</div>

        <div className="text-sm font-medium text-gray-500">Conference:</div>
        <div className="text-sm">
          {pub.conference_name || pub.conference?.toString() || '-'}
        </div>

        <div className="text-sm font-medium text-gray-500">Published:</div>
        <div className="text-sm">{formatDate(pub.date_published)}</div>

        <div className="text-sm font-medium text-gray-500">Value:</div>
        <div className="flex items-center text-sm">
          <span className="font-medium">{pub.overall_score}</span>
          {pub.trend > 0 ? (
            <span className="ml-2 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          ) : pub.trend < 0 ? (
            <span className="ml-2 text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          ) : (
            <span className="ml-2 text-gray-400">—</span>
          )}
        </div>
      </div>

      <div className="mt-3 text-center">
        <Link
          to={routes.publicationCitations({ id: pub.id })}
          className="inline-flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Citations
          {pub.citation_count > 0 && (
            <span className="ml-1.5 rounded-full bg-white px-2 py-0.5 text-sm font-semibold text-blue-600">
              {pub.citation_count}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}

export const Success = ({
  myPublications,
}: CellSuccessProps<MyPublicationsQuery, MyPublicationsQueryVariables>) => {
  const [viewMode, setViewMode] = useState(() => {
    // Default to card view on mobile, table on larger screens
    if (typeof window !== 'undefined') {
      // Force cards view for screens below 1024px
      return window.innerWidth < 1024 ? 'card' : 'table'
    }
    return 'table' // Default for SSR
  })

  const [windowWidth, setWindowWidth] = useState(0)

  // Track window width for responsive decisions
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setWindowWidth(width)

      // Force cards view for screens below 1024px
      if (width < 1024 && viewMode === 'table') {
        setViewMode('card')
      }
    }

    // Set initial width
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  // Show toggle only on larger screens
  const showToggle = windowWidth >= 1024

  return (
    <div className="w-full">
      {/* Header with title and view toggle */}
      <div className="mb-6 flex flex-col items-start justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <h2 className="text-xl font-bold text-[#163A68]">Your Publications</h2>

        {/* View toggle buttons - only show on larger screens */}
        {showToggle && (
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-l-lg border border-gray-200 px-3 py-1.5 text-sm font-medium ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-1 inline h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                  clipRule="evenodd"
                />
              </svg>
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`rounded-r-lg border border-gray-200 px-3 py-1.5 text-sm font-medium ${
                viewMode === 'card'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-1 inline h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
          </div>
        )}
      </div>

      {/* Card view */}
      {viewMode === 'card' && (
        <div className="space-y-4">
          {myPublications.map((pub) => (
            <PublicationCard key={pub.id} pub={pub} />
          ))}
          {myPublications.length === 0 && (
            <div className="rounded-lg bg-white p-6 text-center text-gray-500">
              No publications found.
            </div>
          )}
        </div>
      )}

      {/* Table view - Only horizontal scroll, no vertical scroll */}
      {viewMode === 'table' && (
        <div className="rounded-lg border border-gray-200 bg-white">
          {myPublications.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-700"
                    >
                      DOI
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Conference
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Value
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Citations
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Published
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myPublications.map((pub, index) => (
                    <tr
                      key={pub.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        index === myPublications.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <TruncatedText
                          text={
                            pub.title || `Publication ID: ${pub.submission_id}`
                          }
                          maxLength={25}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <TruncatedText text={pub.doi} maxLength={15} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <TruncatedText
                          text={
                            pub.conference_name || pub.conference?.toString()
                          }
                          maxLength={20}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <span className="font-medium">
                            {pub.overall_score}
                          </span>

                          {pub.trend > 0 ? (
                            <span className="ml-2 text-green-600">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          ) : pub.trend < 0 ? (
                            <span className="ml-2 text-red-600">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          ) : (
                            <span className="ml-2 text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <Link
                          to={routes.publicationCitations({ id: pub.id })}
                          className="inline-flex items-center justify-center rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          View
                          <span className="ml-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-blue-600">
                            {pub.citation_count}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(pub.date_published)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No publications found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
