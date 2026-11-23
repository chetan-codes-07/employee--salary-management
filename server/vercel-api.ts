import express from 'express'
import { createApp } from './app'
import { requireAuthConfig } from './auth'
import { openTurso } from './turso'
import { backfillProfiles } from './employees'

function createHostedApp() {
  const auth = {
    HR_EMAIL: process.env.HR_EMAIL,
    HR_PASSWORD: process.env.HR_PASSWORD,
    hosted: true,
    clientAddressHeader: 'x-vercel-forwarded-for',
  }
  requireAuthConfig(auth)
  const { sql } = openTurso()
  let profilesReady = false
  return createApp(sql, {
    auth,
    seedToken: process.env.SEED_TOKEN,
    async prepareData() {
      if (!profilesReady) {
        await backfillProfiles(sql)
        profilesReady = true
      }
    },
  })
}

function createBootFailureApp(error: unknown) {
  const message = error instanceof Error ? error.message : 'Workspace unavailable'
  const app = express()
  app.disable('x-powered-by')
  app.use((_req, res) => {
    res.status(503).json({ status: 'unavailable', error: message })
  })
  return app
}

let app: express.Express
try {
  app = createHostedApp()
} catch (error) {
  app = createBootFailureApp(error)
}

export default app
