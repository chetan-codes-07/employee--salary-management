import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireAuthConfig } from './auth'
import { openLocal } from './database'
import { migrate } from './migrate'
import { createApp } from './app'
import { backfillProfiles } from './employees'
import { applyAuthorCredit } from './author-credit'

const envPath = resolve('.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

const auth = { HR_EMAIL: process.env.HR_EMAIL, HR_PASSWORD: process.env.HR_PASSWORD }
requireAuthConfig(auth)
const { sql, db } = openLocal()
migrate(db)
await backfillProfiles(sql)
const app = createApp(sql, { seedToken: process.env.SEED_TOKEN, auth })

function sendIndex(_req: express.Request, res: express.Response) {
  const html = applyAuthorCredit(readFileSync(resolve('dist/client/index.html'), 'utf8'))
  res.type('html').send(html)
}

app.get(['/', '/index.html'], sendIndex)
app.use(express.static('dist/client', { index: false }))
app.use((req, res, next) => {
  const path = req.path.replace(/\/$/, '') || '/'
  if (req.method !== 'GET' || (path !== '/employees' && !/^\/employees\/EMP-\d{5}$/.test(path))) return next()
  sendIndex(req, res)
})
const port = Number(process.env.PORT || 3000)
app.listen(port, () => console.log('ACME Compensation listening on port', port))
