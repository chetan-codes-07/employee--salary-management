import express from 'express'
import { authRouter, type AuthConfig } from './auth'
import type { Sql } from './sql'
import {
  filtersFrom,
  listEmployees,
  updateSalary,
  summarize,
  chartBreakdown,
  getEmployee,
  updateEmployee,
  createEmployee,
  deleteEmployee,
  exportEmployees,
} from './employees'
import { importBatch, importCsvRequest } from './imports'
import { InputError } from './money'
import { LEVELS, STATUSES } from './profile'
import { COUNTRIES, DEPARTMENTS, seed } from './seed-data'
export function createApp(
  db: Sql,
  options: { seedToken?: string; auth?: AuthConfig; prepareData?: () => Promise<void> } = {},
) {
  const app = express()
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' })
    next()
  })
  app.use('/api/employees/import', express.json({ limit: '512kb' }))
  app.use(express.json({ limit: '16kb' }))
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.get('/api/health', async (_req, res) => {
    try {
      await db.all('SELECT 1 AS connected')
      res.json({ status: 'ok', database: 'connected', storage: 'persistent SQLite' })
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unreachable' })
    }
  })
  app.post('/api/admin/seed', async (req, res) => {
    if (!options.seedToken || req.get('authorization') !== `Bearer ${options.seedToken}`)
      throw new InputError('Not authorized.', 401)
    const offset = req.body?.offset
    if (!Number.isInteger(offset) || offset < 0 || offset >= 10_000 || offset % 80 !== 0)
      throw new InputError('Invalid seed offset.')
    const processed = await seed(db, offset, 80)
    res.json({ processed, offset })
  })
  app.use('/api', authRouter(db, options.auth))
  if (options.prepareData)
    app.use('/api', async (_req, _res, next) => {
      await options.prepareData!()
      next()
    })
  app.get('/api/options', (_req, res) =>
    res.json({
      countries: COUNTRIES.map((c) => c.country),
      departments: DEPARTMENTS,
      levels: [...LEVELS],
      statuses: [...STATUSES],
    }),
  )
  app.get('/api/employees/export', async (req, res) => {
    const csv = await exportEmployees(db, filtersFrom(req.query))
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="acme-employees.csv"',
      })
      .send(csv)
  })
  app.post('/api/employees/import', express.text({ type: 'text/csv', limit: '8mb' }), async (req, res) => {
    res.json(typeof req.body === 'string' ? await importCsvRequest(db, req.body) : await importBatch(db, req.body))
  })
  app.post('/api/employees', async (req, res) => {
    res.status(201).json(await createEmployee(db, req.body))
  })
  app.get('/api/employees', async (req, res) =>
    res.json(await listEmployees(db, filtersFrom(req.query), req.query.page)),
  )
  app.get('/api/summary', async (req, res) => res.json(await summarize(db, filtersFrom(req.query))))
  app.get('/api/charts', async (req, res) => res.json(await chartBreakdown(db, filtersFrom(req.query))))
  app.get('/api/employees/:id', async (req, res) => {
    res.json(await getEmployee(db, req.params.id))
  })
  app.patch('/api/employees/:id/salary', async (req, res) => {
    res.json(await updateSalary(db, req.params.id, req.body))
  })
  app.patch('/api/employees/:id', async (req, res) => {
    res.json(await updateEmployee(db, req.params.id, req.body))
  })
  app.delete('/api/employees/:id', async (req, res) => {
    res.json(await deleteEmployee(db, req.params.id))
  })
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }))
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof InputError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    const status = (error as { status?: number })?.status
    if (status === 400 || status === 413) {
      res.status(status).json({ error: status === 413 ? 'Request is too large.' : 'Request must contain valid JSON.' })
      return
    }
    console.error('Request failed', error instanceof Error ? error.message : 'Unknown error')
    res.status(500).json({ error: 'Unable to complete the request. Please try again.' })
  })
  return app
}
