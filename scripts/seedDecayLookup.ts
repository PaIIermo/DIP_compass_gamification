// scripts/seed-decayLookup.ts

// Option 1: Using Redwood’s shared db instance (recommended)
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const HALF_LIFE = 365.242374
const MAX_DAYS = 10000

async function seedDecayLookup() {
  const entries = Array.from({ length: MAX_DAYS + 1 }, (_, days) => ({
    days,
    decay_factor: Math.pow(0.5, days / HALF_LIFE),
  }))

  await prisma.decayLookup.createMany({
    data: entries,
    skipDuplicates: true,
  })

  console.log(`✅ Seeded ${entries.length} decay values into DecayLookup table`)
}

// ✅ This makes it work with `yarn rw exec seed-decayLookup`
export default async function () {
  try {
    await seedDecayLookup()
  } catch (e) {
    console.error('❌ Error seeding DecayLookup table:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}
