import { useState, useEffect } from 'react'

import { Metadata } from '@redwoodjs/web'

import TrendingResearchersCell from 'src/components/TrendingResearchersCell'

// List of available topics - same as publications
const topics = [
  { id: null, name: 'Overall' },
  { id: 1, name: 'eHealth' },
  { id: 2, name: 'Networks & Communications' },
  { id: 3, name: 'Intelligent Systems' },
  { id: 4, name: 'IoT' },
  { id: 5, name: 'Arts, Education, Media' },
  { id: 6, name: 'Smart Cities' },
  { id: 7, name: 'Developing Countries' },
  { id: 8, name: 'Systems & Security' },
  { id: 9, name: 'Other' },
]

const TrendingResearchersPage = () => {
  // State for the currently selected topic (null = overall)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [userId, setUserId] = useState<number | null>(null)

  // Get the current user ID on component mount
  useEffect(() => {
    const storedId = localStorage.getItem('userId')
    if (storedId) {
      const parsedId = Number(storedId)
      setUserId(parsedId)
    }
  }, [])

  // If no user ID is available yet, show loading
  if (!userId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-b-3 border-t-3 h-12 w-12 animate-spin rounded-full border-[#3d8bfd]"></div>
        <span className="ml-4 text-lg text-gray-600">Loading user data...</span>
      </div>
    )
  }

  return (
    <>
      {/* Page metadata for SEO and document title */}
      <Metadata
        title="Trending Researchers"
        description="Top researchers by topic"
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Page heading */}
        <h1 className="mb-6 text-2xl font-bold text-[#163A68]">
          Trending Researchers
        </h1>

        {/* Topic selector UI */}
        <div className="mb-8 flex flex-col items-start space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <label
            htmlFor="topicSelectRes"
            className="text-lg font-medium text-gray-700"
          >
            Select Topic:
          </label>
          <select
            id="topicSelectRes"
            value={selectedTopicId === null ? 'null' : selectedTopicId}
            onChange={(e) =>
              setSelectedTopicId(
                e.target.value === 'null' ? null : Number(e.target.value)
              )
            }
            className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
          >
            {topics.map((topic) => (
              <option
                key={topic.id ?? 'null'}
                value={topic.id === null ? 'null' : topic.id}
              >
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        {/* The trending researchers cell that fetches and displays the data */}
        <TrendingResearchersCell
          topicId={selectedTopicId}
          lisperatorId={userId}
        />
      </div>
    </>
  )
}

export default TrendingResearchersPage
