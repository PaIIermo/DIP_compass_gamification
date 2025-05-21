import 'dotenv/config'
import { PointSystemInitializationJob } from '../api/src/jobs/PointSystemInitializationJob/PointSystemInitializationJob'
import { later } from '../api/src/lib/jobs'

// CLI argument parsing
const args = process.argv.slice(2)

const waitArg = args.find((arg) => arg.startsWith('--wait='))
const modeArg = args.find((arg) => arg.startsWith('--mode='))
const mockArg = args.find((arg) => arg === '--mock')
const mockCountArg = args.find((arg) => arg.startsWith('--mock-count='))
const snapshotFreqArg = args.find((arg) => arg.startsWith('--snapshot-freq='))
const validationArg = args.find((arg) => arg === '--validation-mode') // Add this line

const wait = waitArg ? parseInt(waitArg.split('=')[1], 10) : 0
const mode = modeArg ? modeArg.split('=')[1] : 'immediate'
const useMock = mockArg !== undefined
const mockCount = mockCountArg ? parseInt(mockCountArg.split('=')[1], 10) : 2000
const snapshotFrequency = snapshotFreqArg
  ? snapshotFreqArg.split('=')[1]
  : 'weekly'
const validationMode = validationArg !== undefined // Add this line

// Validate mode - renamed "weekly" to "period"
const validModes = ['immediate', 'period']
if (!validModes.includes(mode)) {
  console.error(
    `[CLI Job]: Invalid mode "${mode}". Must be one of: ${validModes.join(', ')}.`
  )
  process.exit(1)
}

// Validate snapshot frequency - removed "test"
const validFrequencies = ['weekly', 'monthly', 'quarterly']
if (!validFrequencies.includes(snapshotFrequency)) {
  console.error(
    `[CLI Job]: Invalid snapshot frequency "${snapshotFrequency}". Must be one of: ${validFrequencies.join(', ')}.`
  )
  process.exit(1)
}

// Show mode information
if (validationMode) {
  console.log(`[CLI Job]: Running in VALIDATION mode - will use controlled test data`)

  // Validation mode should override other modes
  if (useMock) {
    console.log(`[CLI Job]: Warning: --mock flag will be ignored in validation mode`)
  }
} else if (useMock) {
  console.log(
    `[CLI Job]: Will generate ${mockCount} mock publications after initialization.`
  )
} else {
  console.log(`[CLI Job]: Using normal initialization with real data`)
}

console.log(`[CLI Job]: Using snapshot frequency: ${snapshotFrequency}`)
console.log(
  `[CLI Job]: Using mode: ${mode} ${mode === 'immediate' ? `with delay of ${wait}s` : ''}`
)

async function main() {
  try {
    await later(
      {
        ...PointSystemInitializationJob,
        name: 'PointSystemInitializationJob',
        path: 'PointSystemInitializationJob/PointSystemInitializationJob',
      },
      [
        {
          updateScheduleMode: mode as 'immediate' | 'period',
          delaySeconds: wait,
          // In validation mode, always set useMock to false regardless of CLI flag
          useMock: validationMode ? false : useMock,
          mockCount,
          snapshotFrequency: snapshotFrequency as
            | 'weekly'
            | 'monthly'
            | 'quarterly',
          validationMode, // Pass this new parameter to the job
        },
      ],
      {
        wait: 1,
      }
    )

    console.log('[CLI Job]: Job completed.')
  } catch (err) {
    console.error('[CLI Job]: Error occurred while running job:', err)
  }
}

export default main