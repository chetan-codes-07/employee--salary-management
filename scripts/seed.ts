import { openLocal } from '../server/database'
import { migrate } from '../server/migrate'
import { seed, seedCounts } from '../server/seed-data'
import { existsSync } from 'node:fs'
if (existsSync('.env')) process.loadEnvFile('.env')
const local = openLocal()
try {
  migrate(local.db)
  await seed(local.sql)
  const { fixtures, additional } = await seedCounts(local.sql)
  if (fixtures !== 10_000) throw new Error(`Expected 10000 fixture IDs, found ${fixtures}`)
  console.log(`Seed complete: ${fixtures} fixtures and ${additional} additional employees. Existing edits preserved.`)
} finally {
  local.close()
}
