import { Metadata } from '@redwoodjs/web'

import TrendingTopicsCell from 'src/components/TrendingTopicsCell'

const TrendingTopicsPage = () => (
  <>
    <Metadata
      title="Trending Topics"
      description="Topic scores across all publications"
    />
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[#163A68]">
        Trending Topics
      </h1>
      <TrendingTopicsCell />
    </div>
  </>
)

export default TrendingTopicsPage
