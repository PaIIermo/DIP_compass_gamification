import { useEffect, useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'

import MyPublicationsCell from 'src/components/MyPublicationsCell'

const HomePage = () => {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    const email = localStorage.getItem('userEmail')
    const alias = localStorage.getItem('userAlias')

    if (!userId) {
      navigate(routes.login()) // Redirect to login if not authenticated
    } else {
      setUser({ id: Number(userId), email, alias })
    }
  }, [])

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F2F8FC]">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    )

  return (
    // Increased the width by removing max-w-screen-xl constraint
    <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome Card */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-bold text-[#163A68] sm:text-2xl">
              Welcome, {user.alias || user.email}
            </h1>
          </div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-700 sm:text-base">
            View your publications, their review score and citations. See the
            best performers in the trending sections.
          </p>
        </div>
      </div>

      {/* Publications Card - Reduced padding for more content space */}
      <div className="rounded-lg bg-white p-3 shadow-sm sm:p-5">
        <MyPublicationsCell userId={user.id} />
      </div>
    </div>
  )
}

export default HomePage
