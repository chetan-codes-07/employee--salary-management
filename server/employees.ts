import type { Sql, Value } from './database'
import { COUNTRIES, DEPARTMENTS, type Employee } from './seed-data'
import { InputError, parseSalary } from './money'
import { LEVELS, STATUSES, RATE_DATE, bandFor, deriveProfile, usdMinor, type Profile } from './profile'

export type Filters = { q: string; country: string; department: string; level: string; status: string }
export type Summary = { currency: string; count: number; totalMinor: number; averageMinor: number }
export type ChartCount = { label: string; count: number }
export type ChartAverage = { label: string; currency: string; count: number; averageMinor: number }
export type Charts = { departments: ChartCount[]; levels: ChartCount[]; averages: ChartAverage[] }
export type EmployeeView = Employee & Profile & { status: string; usd_minor: number }
export type SalaryEvent = { effective_on: string; salary_minor: number; reason: string; change: number | null }
export type EmployeeDetail = EmployeeView & {
  band: { minMinor: number; maxMinor: number; midMinor: number; ratio: number; position: number }
  history: SalaryEvent[]
  rateDate: string
}

const LEVEL_SET = new Set<string>(LEVELS)
const STATUS_SET = new Set<string>(STATUSES)

export function filtersFrom(query: Record<string, unknown>): Filters {
  const read = (key: string) => {
    const v = query[key]
    if (v === undefined) return ''
    if (typeof v !== 'string') throw new InputError(`Invalid ${key} filter.`)
    return v.trim()
  }
  const q = read('q'),
    country = read('country'),
    department = read('department'),
    level = read('level'),
    status = read('status')
  if (q.length > 100) throw new InputError('Search must be 100 characters or fewer.')
  if (country && !COUNTRIES.some((c) => c.country === country)) throw new InputError('Choose a valid country.')
  if (department && !(DEPARTMENTS as readonly string[]).includes(department))
    throw new InputError('Choose a valid department.')
  if (level && !LEVEL_SET.has(level)) throw new InputError('Choose a valid level.')
  if (status && !STATUS_SET.has(status)) throw new InputError('Choose a valid status.')
  return { q, country, department, level, status }
}
export function where(filters: Filters) {
  const clauses: string[] = [],
    values: Value[] = []
  if (filters.q) {
    clauses.push(
      '(instr(lower(name), lower(?)) > 0 OR instr(lower(id), lower(?)) > 0 OR instr(lower(email), lower(?)) > 0)',
    )
    values.push(filters.q, filters.q, filters.q)
  }
  if (filters.country) {
    clauses.push('country = ?')
    values.push(filters.country)
  }
  if (filters.department) {
    clauses.push('department = ?')
    values.push(filters.department)
  }
  if (filters.level) {
    clauses.push('level = ?')
    values.push(filters.level)
  }
  if (filters.status) {
    clauses.push('status = ?')
    values.push(filters.status)
  }
  return { sql: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '', values }
}

type Stored = Employee & { job_title: string; email: string; level: string; status: string; hired_on: string }

function present(row: Stored): EmployeeView {
  const derived = deriveProfile(row)
  const profile: Profile = {
    job_title: row.job_title || derived.job_title,
    email: row.email || derived.email,
    level: (LEVEL_SET.has(row.level) ? row.level : derived.level) as Profile['level'],
    hired_on: row.hired_on || derived.hired_on,
  }
  return {
    ...row,
    ...profile,
    status: STATUS_SET.has(row.status) ? row.status : 'Active',
    usd_minor: usdMinor(row.salary_minor, row.currency),
  }
}

export async function listEmployees(db: Sql, filters: Filters, pageInput: unknown = undefined) {
  const pageValue = pageInput === undefined ? '1' : pageInput
  if (typeof pageValue !== 'string' || !/^[1-9]\d{0,3}$/.test(pageValue))
    throw new InputError('Page must be a positive whole number.')
  const page = Number(pageValue),
    pageSize = 25
  if (page > 2000) throw new InputError('Page is too far into the directory.')
  const w = where(filters)
  const [count] = await db.all<{ total: number }>('SELECT COUNT(*) AS total FROM employees' + w.sql, w.values)
  const items = await db.all<Stored>('SELECT * FROM employees' + w.sql + ' ORDER BY id LIMIT ? OFFSET ?', [
    ...w.values,
    pageSize,
    (page - 1) * pageSize,
  ])
  return { items: items.map(present), total: count.total, page, pageSize, pages: Math.ceil(count.total / pageSize) }
}
export async function summarize(db: Sql, filters: Filters): Promise<Summary[]> {
  const w = where(filters)
  const rows = await db.all<{ currency: string; count: number; totalMinor: number }>(
    'SELECT currency, COUNT(*) AS count, SUM(salary_minor) AS totalMinor FROM employees' +
      w.sql +
      ' GROUP BY currency ORDER BY currency',
    w.values,
  )
  return rows.map((r) => ({ ...r, averageMinor: Math.round(r.totalMinor / r.count) }))
}
export async function chartBreakdown(db: Sql, filters: Filters): Promise<Charts> {
  const w = where(filters)
  const departments = await db.all<ChartCount>(
    'SELECT department AS label, COUNT(*) AS count FROM employees' + w.sql + ' GROUP BY department ORDER BY department',
    w.values,
  )
  const levels = await db.all<ChartCount>(
    'SELECT level AS label, COUNT(*) AS count FROM employees' + w.sql + ' GROUP BY level ORDER BY level',
    w.values,
  )
  const rows = await db.all<ChartAverage & { totalMinor: number }>(
    'SELECT department AS label, currency, COUNT(*) AS count, SUM(salary_minor) AS totalMinor FROM employees' +
      w.sql +
      ' GROUP BY department, currency ORDER BY currency, department',
    w.values,
  )
  return {
    departments,
    levels,
    averages: rows.map((row) => ({
      label: row.label,
      currency: row.currency,
      count: row.count,
      averageMinor: Math.round(row.totalMinor / row.count),
    })),
  }
}

function withChanges(events: { effective_on: string; salary_minor: number; reason: string }[]): SalaryEvent[] {
  return events.map((event, index) => {
    if (!index) return { ...event, change: null }
    const previous = events[index - 1].salary_minor
    return { ...event, change: Math.round(((event.salary_minor - previous) / previous) * 1000) / 10 }
  })
}

export async function getEmployee(db: Sql, id: string): Promise<EmployeeDetail> {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError('Employee not found.', 404)
  type Event = Pick<SalaryEvent, 'effective_on' | 'salary_minor' | 'reason'>
  const [row] = await db.all<Stored & { events: string }>(
    `
    SELECT e.*, (SELECT json_group_array(json_object('effective_on', effective_on, 'salary_minor', salary_minor, 'reason', reason))
      FROM (SELECT effective_on, salary_minor, reason FROM salary_history WHERE employee_id = e.id ORDER BY id)) AS events
    FROM employees e WHERE e.id = ?`,
    [id],
  )
  if (!row) throw new InputError('Employee not found.', 404)
  const { events, ...employee } = row
  const history: Event[] = JSON.parse(events)
  // A legacy database may have a balance without a corresponding historical event.
  if (history.at(-1)?.salary_minor !== row.salary_minor)
    history.push({
      effective_on: new Date().toISOString().slice(0, 10),
      salary_minor: row.salary_minor,
      reason: 'Current balance',
    })
  const view = present(employee)
  const band = bandFor(view.country, view.level)
  const span = band.maxMinor - band.minMinor
  const ratio = Math.round((view.salary_minor / band.midMinor) * 100) / 100
  const position = span ? (view.salary_minor - band.minMinor) / span : 0
  return { ...view, band: { ...band, ratio, position }, history: withChanges(history), rateDate: RATE_DATE }
}

export async function updateSalary(db: Sql, id: string, body: unknown): Promise<EmployeeView> {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError('Employee not found.', 404)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Provide salary and revision.')
  const { salary, revision } = body as { salary: unknown; revision: unknown }
  const minor = parseSalary(salary)
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0)
    throw new InputError('Provide a valid employee revision.')
  const [current] = await db.all<Stored>('SELECT * FROM employees WHERE id = ?', [id])
  if (!current) throw new InputError('Employee not found.', 404)
  const [saved] = await db.all<Stored>(
    'UPDATE employees SET salary_minor = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING *',
    [minor, id, revision],
  )
  if (!saved)
    throw new InputError('This salary changed since you opened it. Reload the employee before saving again.', 409)
  return present(saved)
}

function readText(value: unknown, label: string, max: number) {
  if (typeof value !== 'string') throw new InputError(`Enter a ${label}.`)
  const text = value.trim()
  if (!text || text.length > max) throw new InputError(`${label} must be 1 to ${max} characters.`)
  return text
}

export async function updateEmployee(db: Sql, id: string, body: unknown): Promise<EmployeeView> {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError('Employee not found.', 404)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Provide employee details.')
  const record = body as { revision?: unknown; jobTitle?: unknown; email?: unknown; level?: unknown; status?: unknown }
  const [current] = await db.all<Stored>('SELECT * FROM employees WHERE id = ?', [id])
  if (!current) throw new InputError('Employee not found.', 404)
  if (typeof record.revision !== 'number' || !Number.isSafeInteger(record.revision) || record.revision < 0)
    throw new InputError('Provide a valid employee revision.')
  const jobTitle =
    record.jobTitle === undefined
      ? current.job_title || deriveProfile(current).job_title
      : readText(record.jobTitle, 'job title', 80)
  const email =
    record.email === undefined ? current.email || deriveProfile(current).email : readText(record.email, 'email', 120)
  if (record.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new InputError('Enter a valid email address.')
  const level =
    record.level === undefined ? current.level || deriveProfile(current).level : readText(record.level, 'level', 8)
  if (!LEVEL_SET.has(level)) throw new InputError('Choose a valid level.')
  const status = record.status === undefined ? current.status || 'Active' : readText(record.status, 'status', 20)
  if (!STATUS_SET.has(status)) throw new InputError('Choose a valid status.')
  const [saved] = await db.all<Stored>(
    'UPDATE employees SET job_title = ?, email = ?, level = ?, status = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING *',
    [jobTitle, email, level, status, id, record.revision],
  )
  if (!saved) throw new InputError('Employee details changed. Reload the employee before saving again.', 409)
  return present(saved)
}

function currencyFor(country: string) {
  const place = COUNTRIES.find((item) => item.country === country)
  if (!place) throw new InputError('Choose a valid country.')
  return place.currency
}

export function employeeValues(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Provide the new employee.')
  const record = body as {
    name?: unknown
    jobTitle?: unknown
    department?: unknown
    country?: unknown
    level?: unknown
    salary?: unknown
  }
  const name = readText(record.name, 'name', 80)
  const jobTitle = readText(record.jobTitle, 'job title', 80)
  const department = readText(record.department, 'department', 40)
  if (!(DEPARTMENTS as readonly string[]).includes(department)) throw new InputError('Choose a valid department.')
  const country = readText(record.country, 'country', 40)
  const currency = currencyFor(country)
  const level = readText(record.level, 'level', 8)
  if (!LEVEL_SET.has(level)) throw new InputError('Choose a valid level.')
  const minor = parseSalary(record.salary)
  const email = `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '') || 'employee'
  }@acme.example`
  return { name, department, country, currency, minor, jobTitle, email, level }
}

export async function createEmployee(db: Sql, body: unknown): Promise<EmployeeView> {
  const row = employeeValues(body)
  const [saved] = await db.all<Stored>(
    `INSERT INTO employees (id,name,department,country,currency,salary_minor,job_title,email,level,hired_on)
     SELECT printf('EMP-%05d', last_issued + 1), ?, ?, ?, ?, ?, ?, ?, ?, date('now')
     FROM employee_id_floor WHERE last_issued < 99999 RETURNING *`,
    [row.name, row.department, row.country, row.currency, row.minor, row.jobTitle, row.email, row.level],
  )
  if (!saved) throw new InputError('The employee directory is full.', 409)
  return present(saved)
}

export async function deleteEmployee(db: Sql, id: string) {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError('Employee not found.', 404)
  const [current] = await db.all<{ id: string; name: string }>(
    'DELETE FROM employees WHERE id = ? RETURNING id, name',
    [id],
  )
  if (!current) throw new InputError('Employee not found.', 404)
  return current
}

function csvCell(value: string | number) {
  const text = String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function exportEmployees(db: Sql, filters: Filters) {
  const w = where(filters)
  const rows = await db.all<Stored>('SELECT * FROM employees' + w.sql + ' ORDER BY id', w.values)
  const header = [
    'code',
    'name',
    'job title',
    'department',
    'country',
    'salary',
    'currency',
    'usd',
    'level',
    'status',
    'email',
  ]
  const lines = rows.map((row) => {
    const view = present(row)
    return [
      view.id,
      view.name,
      view.job_title,
      view.department,
      view.country,
      (view.salary_minor / 100).toFixed(2),
      view.currency,
      (view.usd_minor / 100).toFixed(2),
      view.level,
      view.status,
      view.email,
    ]
      .map(csvCell)
      .join(',')
  })
  return [header.join(','), ...lines].join('\n')
}

export async function backfillProfiles(db: Sql) {
  const rows = await db.all<{ id: string; name: string; department: string }>(
    "SELECT id, name, department FROM employees WHERE job_title = ''",
  )
  if (!rows.length) return 0
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500).map((row) => ({ id: row.id, ...deriveProfile(row) }))
    await db.run(
      `UPDATE employees SET job_title = value->>'job_title', email = value->>'email',
      level = value->>'level', hired_on = value->>'hired_on' FROM json_each(?)
      WHERE employees.id = value->>'id' AND job_title = ''`,
      [JSON.stringify(batch)],
    )
  }
  return rows.length
}
