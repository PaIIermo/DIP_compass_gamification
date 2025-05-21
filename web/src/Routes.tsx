// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Set, Router, Route } from '@redwoodjs/router'

import MainLayout from './layouts/MainLayout/MainLayout'

const Routes = () => {
  return (
    <Router>
      <Route path="/" page={LoginPage} name="login" />
      <Set wrap={MainLayout}>
        <Route path="/home" page={HomePage} name="home" />
        <Route path="/publication-citations" page={PublicationCitationsPage} name="publicationCitations" />
        <Route path="/trending-publications" page={TrendingPublicationsPage} name="trendingPublications" />
        <Route path="/trending-researchers" page={TrendingResearchersPage} name="trendingResearchers" />
        <Route path="/trending-topics" page={TrendingTopicsPage} name="trendingTopics" />
      </Set>

      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
