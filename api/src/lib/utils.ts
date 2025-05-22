import Bottleneck from 'bottleneck'

import { jobs } from 'src/lib/jobs'

import { db } from './db'
import { OCitRecord } from './types'

/**
 * Process an array of items in chunks to avoid hitting database parameter limits
 *
 * @param items Array of items to process
 * @param chunkSize Maximum size of each chunk
 * @param processor Function that processes a single chunk and returns a result
 * @returns Array of results from processing each chunk
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<R>
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const result = await processor(chunk)
    results.push(result)
  }

  return results
}

/**
 * ----------------------------------------------------------------
 * extractDoiFromCitationsString()
 * ----------------------------------------------------------------
 * OpenCitations returns "citing" strings that may contain "doi:..."
 * but also can contain other IDs. This helper extracts a clean DOI
 * from that string if found. If not found, returns null.
 */
export function extractDoi(citingStr: string): string | null {
  if (!citingStr) return null
  const match = citingStr.match(/doi:(10\.\S+)/)
  return match ? match[1] : null
}

/**
 * This patch allows the fetchCitationsListWithRetriesAndVerification function
 * to recognize mock DOIs and return synthetic data instead of making API calls.
 *
 * To use: Apply this patch to your src/lib/utils.ts file
 */

// Add this helper function before fetchCitationsListWithRetriesAndVerification
/**
 * Checks if a DOI is a mock DOI (created by our test system)
 */
// Add this helper function before fetchCitationsListWithRetriesAndVerification
/**
 * Checks if a DOI is a mock DOI (created by our test system)
 */
function isMockDOI(doi: string): boolean {
  return doi.startsWith('10.9999/mock-')
}

// For mock DOIs, generate synthetic citation data instead of calling the API
async function generateSyntheticCitations(doi: string): Promise<OCitRecord[]> {
  jobs.logger.info(`[Citation]: Detected mock DOI ${doi}, using synthetic data`)

  // Get any existing citations from the database
  const existingCitations = await db.citation.findMany({
    where: {
      Publication: {
        doi,
      },
    },
  })

  if (existingCitations.length > 0) {
    // Convert to OCitRecord format
    return existingCitations.map((citation) => ({
      oci:
        citation.oci || `oci:mock-${Math.random().toString(36).substring(2)}`,
      citing: citation.citing || '10.9999/mock-citing',
      cited: doi,
      creation:
        citation.creation_date?.toISOString() || new Date().toISOString(),
      timespan: null,
      journal_sc: 'no',
      author_sc: citation.author_sc ? 'yes' : 'no',
    }))
  }

  // Otherwise return an empty array
  return []
}

/**
 * ----------------------------------------------------------------
 * fetchCitationsListWithRetriesAndVerification()
 * ----------------------------------------------------------------
 * Fetches a list of citations from the OpenCitations API for a given DOI.
 * Includes additional verification by making multiple attempts and taking the maximum count.
 *  - Implements exponential backoff and retries on failure
 *  - Aborts the request if it exceeds TIMEOUT_MS
 *  - Up to MAX_RETRIES attempts for connection issues
 *  - Makes VERIFICATION_ATTEMPTS total successful fetch attempts and uses the maximum citation count
 *
 * @param doi The DOI to fetch citations for
 * @returns An array of OCitRecord objects representing citations
 */
export async function fetchCitationsListWithRetriesAndVerification(
  doi: string
): Promise<OCitRecord[]> {
  // Check if this is a mock DOI and return synthetic data if it is
  if (doi && isMockDOI(doi)) {
    return await generateSyntheticCitations(doi)
  }
  // For connection issues, we'll use exponential backoff
  let attempt = 0
  let delay = 500
  const MAX_RETRIES = 5
  const TIMEOUT_MS = 10000

  // For verification, we'll make multiple successful attempts
  const VERIFICATION_ATTEMPTS = 3
  let successfulAttempts = 0
  let bestResult: OCitRecord[] = []

  while (successfulAttempts < VERIFICATION_ATTEMPTS && attempt < MAX_RETRIES) {
    try {
      const controller = new AbortController()
      const timerId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(
        `https://opencitations.net/index/api/v2/citations/doi:${doi}`,
        {
          method: 'GET',
          headers: {
            ...(process.env.OPEN_CITATION_API_KEY
              ? { authorization: process.env.OPEN_CITATION_API_KEY }
              : {}),
          },

          signal: controller.signal,
        } as RequestInit
      )

      clearTimeout(timerId)

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = (await response.json()) as OCitRecord[]

      // Update our best result if this attempt returned more citations
      // Note: We're keeping all citations including self-citations at this point
      // Filtering will happen in the calling code
      if (data.length > bestResult.length) {
        bestResult = data
      }

      successfulAttempts++

      // If the flow has not been interupted (received number of citations > 0) on the first attempt, we can exit early
      // This optimization helps avoid unnecessary API calls for publications with clear citation data
      if (bestResult.length >= 1 && successfulAttempts >= 1) {
        return bestResult
      }

      // Add a small delay between verification attempts to avoid overwhelming the API
      if (successfulAttempts < VERIFICATION_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      attempt++
      console.error(
        `fetchCitationsListWithRetriesAndVerification failed (attempt ${attempt}) for DOI=${doi}: ${error}`
      )

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
      } else {
        // If we've had at least one successful attempt but hit max retries, return our best result
        if (successfulAttempts > 0) {
          return bestResult
        }
        throw new Error(`Max retries reached for doi=${doi}, giving up.`)
      }
    }
  }

  return bestResult
}

interface RateLimiterOptions {
  minTime?: number
  maxConcurrent?: number
  maxConsecutiveFailures?: number
}

export function createRateLimiter({
  minTime = 200,
  maxConcurrent = 4,
  maxConsecutiveFailures = 20,
}: RateLimiterOptions = {}) {
  const limiter = new Bottleneck({
    minTime,
    maxConcurrent,
  })

  let consecutiveFailures = 0

  return {
    limiter,

    // Track a success or failure
    trackResult: (success: boolean) => {
      if (success) {
        consecutiveFailures = 0
      } else {
        consecutiveFailures++
      }
      return consecutiveFailures
    },

    // Get current failure count
    getFailureCount: () => consecutiveFailures,

    // Check if we've exceeded the maximum allowed failures
    shouldAbort: () => consecutiveFailures > maxConsecutiveFailures,

    // Reset the failure counter
    resetFailures: () => {
      consecutiveFailures = 0
    },

    // Stop the limiter and abort remaining jobs
    abort: async () => {
      await limiter.stop({ dropWaitingJobs: true })
    },
  }
}
