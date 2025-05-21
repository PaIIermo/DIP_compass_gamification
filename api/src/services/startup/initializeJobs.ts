import { PointSystemInitializationJob } from 'src/jobs/PointSystemInitializationJob/PointSystemInitializationJob'
import { later } from 'src/lib/jobs'

export const initializeJobs = async (): Promise<void> => {
  console.log('[Startup]: Initializing jobs...')

  // Ensure job runs immediately if not already running
  await later(PointSystemInitializationJob, [
    { updateScheduleMode: 'immediate', delaySeconds: 300 },
  ])

  console.log('[Startup]: Jobs initialized successfully.')
}
