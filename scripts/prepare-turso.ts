import { existsSync } from 'node:fs'
import { migrateTurso } from './migrate-turso'
import { openTurso } from '../server/turso'
import { backfillProfiles } from '../server/employees'
import { seed, seedCounts } from '../server/seed-data'

if (existsSync('.env')) process.loadEnvFile('.env')
const { client, sql } = openTurso()
try {
  await migrateTurso(client)
  await seed(sql)
  await backfillProfiles(sql)
  const { fixtures, additional } = await seedCounts(sql)
  if (fixtures !== 10000) throw new Error('Expected exactly 10000 fixture IDs.')
  console.log(`Hosted database ready with ${fixtures} fixtures and ${additional} additional employees.`)
} finally {
  client.close()
}
