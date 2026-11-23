import type { Sql } from './database'
import { COUNTRIES, DEPARTMENTS } from './locations'
import { deriveProfile } from './profile'
export { COUNTRIES, DEPARTMENTS } from './locations'
const first = [
  'Aarav',
  'Ananya',
  'Alex',
  'Amelia',
  'Arjun',
  'Ava',
  'Daniel',
  'Emma',
  'Felix',
  'Hannah',
  'Isha',
  'James',
  'Kabir',
  'Leah',
  'Liam',
  'Maya',
  'Mia',
  'Noah',
  'Priya',
  'Riya',
  'Sam',
  'Sara',
  'Sofia',
  'Theo',
  'Vikram',
  'Zara',
]
const last = [
  'Bennett',
  'Brooks',
  'Carter',
  'Das',
  'Fischer',
  'Gupta',
  'Hart',
  'Hayes',
  'Hoffmann',
  'Joshi',
  'Kapoor',
  'Khan',
  'Kumar',
  'Mehta',
  'Miller',
  'Morgan',
  'Nair',
  'Patel',
  'Rao',
  'Reed',
  'Schmidt',
  'Shah',
  'Sharma',
  'Singh',
  'Taylor',
  'Weber',
]
export type Employee = {
  id: string
  name: string
  department: string
  country: string
  currency: string
  salary_minor: number
  revision: number
}
export function employees(seed = 20261123): Employee[] {
  let state = seed >>> 0
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }
  return Array.from({ length: 10_000 }, (_, i) => {
    const place = COUNTRIES[i % COUNTRIES.length]
    const department = DEPARTMENTS[Math.floor(i / COUNTRIES.length) % DEPARTMENTS.length]
    const name = `${first[next() % first.length]} ${last[next() % last.length]}`
    const salary = (place.base + (next() % (place.base * 2))) * 100
    return {
      id: `EMP-${String(i + 1).padStart(5, '0')}`,
      name,
      department,
      country: place.country,
      currency: place.currency,
      salary_minor: salary,
      revision: 0,
    }
  })
}
export const SEED_SQL =
  'INSERT INTO employees (id,name,department,country,currency,salary_minor,revision) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING'
export async function seed(db: Sql, offset = 0, limit = 10_000) {
  const rows = employees().slice(offset, offset + limit)
  const insert = `INSERT INTO employees (id,name,department,country,currency,salary_minor,revision,job_title,email,level,hired_on)
    SELECT value->>'id', value->>'name', value->>'department', value->>'country', value->>'currency', value->>'salary_minor', 0,
           value->>'job_title', value->>'email', value->>'level', value->>'hired_on' FROM json_each(?) WHERE true
    ON CONFLICT(id) DO NOTHING`
  for (let i = 0; i < rows.length; i += 80) {
    const batch = rows.slice(i, i + 80).map((row) => ({ ...row, ...deriveProfile(row) }))
    await db.run(insert, [JSON.stringify(batch)])
  }
  return rows.length
}

export async function seedCounts(db: Sql) {
  const [counts] = await db.all<{ fixtures: number; additional: number }>(`
    SELECT fixtures, total - fixtures AS additional FROM (
      SELECT count(*) AS total, count(*) FILTER (WHERE id GLOB 'EMP-[0-9][0-9][0-9][0-9][0-9]'
        AND id BETWEEN 'EMP-00001' AND 'EMP-10000') AS fixtures FROM employees
    )`)
  return counts
}
