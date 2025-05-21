import { useState } from 'react'

import type {
  FindPublicationCitations,
  FindPublicationCitationsVariables,
} from 'types/graphql'

import type {
  CellSuccessProps,
  CellFailureProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<
  FindPublicationCitations,
  FindPublicationCitationsVariables
> = gql`
  query FindPublicationCitations($publicationId: Int!) {
    publicationCitations(publicationId: $publicationId) {
      id
      oci
      citing
      creation_date
    }
  }
`

export const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="border-t-3 border-b-3 h-12 w-12 animate-spin rounded-full border-[#3d8bfd]"></div>
    <span className="ml-4 text-lg text-gray-600">Loading citations...</span>
  </div>
)

export const Empty = () => (
  <div className="rounded-lg bg-gray-50 p-10 text-center">
    <p className="text-lg text-gray-600">
      No citations found for this publication.
    </p>
  </div>
)

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rounded-md bg-red-50 p-6 text-base text-red-700">
    <p>Error: {error.message}</p>
  </div>
)

// Simplified component for truncated text without hover
const TruncatedText = ({
  text,
  maxLength = 50,
}: {
  text: string | null | undefined
  maxLength?: number
}) => {
  if (!text) return <span className="text-gray-400">-</span>

  const displayText =
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text

  return (
    <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
      {displayText}
    </div>
  )
}

const formatDate = (dateString: string | null | undefined) => {
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

// Card view component for mobile display
const CitationCard = ({ citation }) => (
  <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-3 grid grid-cols-2 gap-y-2">
      <div className="text-sm font-medium text-gray-500">OCI:</div>
      <div className="text-sm">
        <TruncatedText text={citation.oci} maxLength={20} />
      </div>

      <div className="text-sm font-medium text-gray-500">Citing:</div>
      <div className="text-sm">
        <TruncatedText text={citation.citing} maxLength={25} />
      </div>

      <div className="text-sm font-medium text-gray-500">Date:</div>
      <div className="text-sm text-gray-600">
        {formatDate(citation.creation_date)}
      </div>
    </div>
  </div>
)

export const Success = ({
  publicationCitations,
}: CellSuccessProps<
  FindPublicationCitations,
  FindPublicationCitationsVariables
>) => {
  const [viewMode, setViewMode] = useState(() => {
    // Default to card view on mobile, table on larger screens
    return window.innerWidth < 768 ? 'card' : 'table'
  })

  return (
    <div className="w-full rounded-lg bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
        {/* Header with title and view toggle */}
        <div className="flex flex-col items-start justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
          <h2 className="text-xl font-bold text-[#163A68]">
            Publication Citations
          </h2>

          {/* View toggle */}
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
        </div>
      </div>

      {/* Card view (for mobile) */}
      {viewMode === 'card' && (
        <div className="p-4">
          {publicationCitations.map((citation) => (
            <CitationCard key={citation.id} citation={citation} />
          ))}
        </div>
      )}

      {/* Table view (for desktop) - Modified to avoid vertical scrolling issues */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="whitespace-nowrap px-5 py-3 text-left text-sm font-medium uppercase tracking-wider text-gray-500"
                >
                  OCI
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-5 py-3 text-left text-sm font-medium uppercase tracking-wider text-gray-500"
                >
                  Citing
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-5 py-3 text-left text-sm font-medium uppercase tracking-wider text-gray-500"
                >
                  Citation Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {publicationCitations.map((citation) => (
                <tr key={citation.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">
                    <TruncatedText text={citation.oci} maxLength={30} />
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-900">
                    <TruncatedText text={citation.citing} maxLength={60} />
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {formatDate(citation.creation_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
