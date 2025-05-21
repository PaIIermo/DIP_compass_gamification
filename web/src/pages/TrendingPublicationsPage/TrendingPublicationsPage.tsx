import { useState, useEffect } from 'react'

import { Metadata } from '@redwoodjs/web'

import TrendingPublicationsCell from 'src/components/TrendingPublicationsCell'

// List of available topics
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

const TrendingPublicationsPage = () => {
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

  return (
    <>
      {/* Page metadata for SEO and document title */}
      <Metadata
        title="Trending Publications"
        description="Top publications by topic"
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Page heading */}
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Trending Publications
        </h1>

        {/* Topic selector UI */}
        <div className="mb-8 flex flex-col items-start space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <label
            htmlFor="topicSelectPub"
            className="text-lg font-medium text-gray-700"
          >
            Select Topic:
          </label>
          <select
            id="topicSelectPub"
            value={selectedTopicId === null ? 'null' : selectedTopicId}
            onChange={(e) =>
              setSelectedTopicId(
                e.target.value === 'null' ? null : Number(e.target.value)
              )
            }
            className="w-full rounded-md border border-gray-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
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

        {/* The trending publications cell that fetches and displays the data */}
        <TrendingPublicationsCell topicId={selectedTopicId} userId={userId} />
      </div>
    </>
  )
}

export default TrendingPublicationsPage
