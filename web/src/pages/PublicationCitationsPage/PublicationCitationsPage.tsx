import { Link, routes } from '@redwoodjs/router'

import PublicationCitationsCell from 'src/components/PublicationCitationsCell'

const PublicationCitationsPage = ({ id }) => {
  return (
    // Removed max-w-7xl to increase width
    <div className="mx-auto w-full px-6 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to={routes.home()}
          className="flex items-center text-lg font-medium text-[#163A68] hover:text-[#3d8bfd]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Reduced padding slightly to maximize content space */}
      <div className="rounded-lg bg-white p-3 shadow-sm sm:p-5">
        <PublicationCitationsCell publicationId={parseInt(id)} />
      </div>
    </div>
  )
}

export default PublicationCitationsPage
