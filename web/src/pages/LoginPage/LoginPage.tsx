import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'

// Updated login page with simpler design
const CompassLoginPage = () => {
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email || !userId) {
      setError('Please fill in all fields')
      return
    }

    try {
      const res = await fetch('/.redwood/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userId }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      localStorage.setItem('userId', data.user.lisperator_id)
      localStorage.setItem('userEmail', data.user.email)
      localStorage.setItem('userAlias', data.user.name)

      navigate(routes.home())
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F8FC]">
      {/* Main Content */}
      <div className="flex flex-grow items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">
            Welcome to Compass
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="User ID (mock password)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[#3d8bfd] py-3 font-medium text-white transition-colors hover:bg-[#337acc]"
            >
              Login
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#163A68] py-6 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold text-white">
                COMPASS - Gamification component
              </div>
              <div className="flex space-x-4">
                <a
                  href="https://twitter.com/eai_social"
                  className="text-white hover:text-gray-200"
                  aria-label="Twitter"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/channel/eai"
                  className="text-white hover:text-gray-200"
                  aria-label="YouTube"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/eai.eu/"
                  className="text-white hover:text-gray-200"
                  aria-label="Facebook"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/european-alliance-for-innovation/"
                  className="text-white hover:text-gray-200"
                  aria-label="LinkedIn"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <p className="text-xs text-[#DFF0FE]">
                Copyright © 2023 Compass - Designed by luducrafts - Terms and
                conditions - Privacy policy - Contact us
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CompassLoginPage
