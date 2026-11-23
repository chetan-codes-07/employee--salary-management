import { createApp } from '../server/app'
import { requireAuthConfig } from '../server/auth'
import { openTurso } from '../server/turso'
import { backfillProfiles } from '../server/employees'

const auth = {
  HR_EMAIL: process.env.HR_EMAIL,
  HR_PASSWORD: process.env.HR_PASSWORD,
  hosted: true,
  clientAddressHeader: 'x-vercel-forwarded-for',
}
requireAuthConfig(auth)
const { sql } = openTurso()
let profilesReady = false

export default createApp(sql, {
  auth,
  seedToken: process.env.SEED_TOKEN,
  async prepareData() {
    if (!profilesReady) {
      await backfillProfiles(sql)
      profilesReady = true
    }
  },
})
