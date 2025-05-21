import { useState, useEffect } from 'react'

import { Link, routes } from '@redwoodjs/router'

const MainLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [windowWidth, setWindowWidth] = useState(0)

  const handleLogout = () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userAlias')
    window.location.href = routes.login()
  }

  const userEmail = localStorage.getItem('userEmail')
  const userAlias = localStorage.getItem('userAlias')

  // Track window width for responsive layout decisions
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    // Set initial width
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Add scroll effect to header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.menu-container')) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Determine layout mode based on screen size - fixed breakpoint at 900px
  const showHorizontalNav = windowWidth >= 900

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F8FC]">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 bg-white shadow-sm transition-shadow ${
          scrolled ? 'shadow-md' : ''
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex shrink-0 items-center">
              <Link to={routes.home()} className="flex items-center">
                <img
                  src="/images/EAI-innovation-centred-1.png"
                  alt="COMPASS LOGO"
                  className="h-8 sm:h-10"
                />
              </Link>
            </div>

            {/* Navigation Links - Only shown on large screens */}
            {showHorizontalNav && (
              <div className="block">
                <div className="flex items-baseline space-x-4">
                  <Link
                    to={routes.home()}
                    className="px-3 py-2 text-sm font-medium text-[#163A68] first:ml-4 hover:text-[#3d8bfd]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={routes.trendingPublications()}
                    className="px-3 py-2 text-sm font-medium text-[#163A68] hover:text-[#3d8bfd]"
                  >
                    Publications
                  </Link>
                  <Link
                    to={routes.trendingResearchers()}
                    className="px-3 py-2 text-sm font-medium text-[#163A68] hover:text-[#3d8bfd]"
                  >
                    Researchers
                  </Link>
                  <Link
                    to={routes.trendingTopics()}
                    className="px-3 py-2 text-sm font-medium text-[#163A68] hover:text-[#3d8bfd]"
                  >
                    Topics
                  </Link>
                </div>
              </div>
            )}

            {/* User Name on Left, Buttons on Right */}
            <div className="ml-auto flex items-center space-x-4">
              {/* User Name - Show on larger screens */}
              {userAlias && (
                <span className="hidden text-sm font-medium text-gray-600 md:block">
                  {userAlias}
                </span>
              )}

              {/* Logout button */}
              {userEmail && (
                <button
                  className="rounded border border-transparent px-3 py-1 text-sm font-medium text-[#e74c3c] transition-colors hover:border-[#e74c3c] hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              )}

              {/* Menu Dropdown Button - Always shown when horizontal nav is hidden */}
              {!showHorizontalNav && (
                <div className="menu-container relative">
                  <button
                    className="rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open menu</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu - Positioned absolutely */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {/* Always include navigation in dropdown for compact mode */}
                      <Link
                        to={routes.home()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to={routes.trendingPublications()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Publications
                      </Link>
                      <Link
                        to={routes.trendingResearchers()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Researchers
                      </Link>
                      <Link
                        to={routes.trendingTopics()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Topics
                      </Link>

                      {/* User info on smallest screens */}
                      {userEmail && windowWidth < 768 && (
                        <>
                          <div className="my-1 border-t border-gray-100"></div>
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {userAlias}
                          </div>
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                            onClick={() => {
                              handleLogout()
                              setMenuOpen(false)
                            }}
                          >
                            Logout
                          </button>
                        </>
                      )}

                      {/* Additional menu items */}
                      <div className="my-1 border-t border-gray-100"></div>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        to="/help"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Help & Support
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-4 sm:px-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-[#163A68] py-4 text-white sm:py-6">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
              <div className="text-base font-bold text-white sm:text-lg">
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
                  href="https://www.youtube.com/channel/@EAIchannel"
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
                Copyright © 2025 Compass - Designed by Pavol Polednák - Terms
                and conditions - Privacy policy - Contact us
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
