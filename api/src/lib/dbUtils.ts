import { jobs } from 'src/lib/jobs'

import { db } from './db'

const LOCK_KEYS = {
  INIT: { hi: 123456, lo: 424242 },
  // Add other locks here as needed
}

export async function acquireAdvisoryLock(
  lockType: keyof typeof LOCK_KEYS
): Promise<boolean> {
  const { hi, lo } = LOCK_KEYS[lockType]
  const res = await db.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${hi}, ${lo}) AS locked
  `
  const locked = res[0]?.locked ?? false

  if (!locked) {
    const activeLocks = await db.$queryRawUnsafe(`
      SELECT pid, locktype, mode
      FROM pg_locks
      WHERE locktype = 'advisory'
    `)
    console.log(`Active advisory locks for ${lockType}:`, activeLocks)
  }

  return locked
}

export async function releaseAdvisoryLock(
  lockType: keyof typeof LOCK_KEYS
): Promise<void> {
  const { hi, lo } = LOCK_KEYS[lockType]
  await db.$executeRaw`
    SELECT pg_advisory_unlock(${hi}, ${lo})
  `
}

export async function checkDatabaseHealth() {
  try {
    // Simple query to check DB connectivity and responsiveness
    const result = await db.$queryRaw`SELECT 1 as health_check`
    return result[0].health_check === 1
  } catch (error) {
    jobs.logger.error(
      `[LogJob]: Database health check failed: ${error.message}`
    )
    return false
  }
}
