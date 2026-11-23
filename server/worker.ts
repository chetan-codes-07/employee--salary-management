import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import type { Sql } from './sql'
import { requireAuthConfig } from './auth'
import { createApp } from './app'
import { backfillProfiles } from './employees'
import { applyAuthorCredit } from './author-credit'
// Generated from the production React build by scripts/build.ts.
// @ts-ignore generated only at build time
import assets from '../dist/asset-map.json'
const binding = (env as unknown as { DB: D1Database }).DB
const sql: Sql = {
  async all<T>(query: string, values: import('./database').Value[] = []) {
    return (
      await binding
        .prepare(query)
        .bind(...values)
        .all<T>()
    ).results
  },
  async run(query, values = []) {
    return (
      await binding
        .prepare(query)
        .bind(...values)
        .run()
    ).meta.changes
  },
  async transaction(statements) {
    await binding.batch(statements.map(({ query, values }) => binding.prepare(query).bind(...values)))
  },
  async batch(query, rows) {
    await binding.batch(rows.map((values) => binding.prepare(query).bind(...values)))
  },
}

const runtime = env as { SEED_TOKEN?: string; HR_EMAIL?: string; HR_PASSWORD?: string }
const auth = { HR_EMAIL: runtime.HR_EMAIL, HR_PASSWORD: runtime.HR_PASSWORD, hosted: true }
requireAuthConfig(auth)
let profilesReady = false
const app = createApp(sql, {
  seedToken: runtime.SEED_TOKEN,
  auth,
  async prepareData() {
    if (!profilesReady) {
      await backfillProfiles(sql)
      profilesReady = true
    }
  },
})
app.use((req, res) => {
  const normalized = req.path.replace(/\/$/, '') || '/'
  const path =
    normalized === '/' || normalized === '/employees' || /^\/employees\/EMP-\d{5}$/.test(normalized)
      ? '/index.html'
      : req.path
  const asset = (assets as Record<string, { type: string; body: string }>)[path]
  if (!asset) {
    res.status(404).send('Not found')
    return
  }
  if (path === '/index.html') {
    const html = applyAuthorCredit(Buffer.from(asset.body, 'base64').toString('utf8'))
    res.set('Content-Type', asset.type).send(html)
    return
  }
  res.set('Content-Type', asset.type).send(Buffer.from(asset.body, 'base64'))
})
app.listen(3000)
export default httpServerHandler({ port: 3000 })
