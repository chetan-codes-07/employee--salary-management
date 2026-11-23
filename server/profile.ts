import { COUNTRIES } from './locations'

export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const
export const STATUSES = ['Active', 'Inactive'] as const
export const RATE_DATE = '15 Nov 2026'

const TITLES: Record<string, readonly string[]> = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager'],
  Design: ['Product Designer', 'Senior Product Designer', 'Design Manager'],
  Product: ['Product Manager', 'Senior Product Manager', 'Group Product Manager'],
  Sales: ['Account Executive', 'Senior Account Executive', 'Sales Manager'],
  People: ['People Partner', 'Senior People Partner', 'People Manager'],
  Finance: ['Financial Analyst', 'Senior Financial Analyst', 'Finance Manager'],
}

const LEVEL_FACTOR: Record<(typeof LEVELS)[number], number> = {
  L1: 0.7,
  L2: 0.9,
  L3: 1.1,
  L4: 1.35,
  L5: 1.7,
  L6: 2.1,
}

export type Profile = {
  job_title: string
  email: string
  level: (typeof LEVELS)[number]
  hired_on: string
}

export function deriveProfile(row: { id: string; name: string; department: string }): Profile {
  const n = Number(row.id.slice(4)) || 1
  const titles = TITLES[row.department] ?? ['Specialist']
  const level = LEVELS[n % LEVELS.length]
  const slug =
    row.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '') || 'employee'
  const hired = new Date(Date.UTC(2016, 0, 1))
  hired.setUTCDate(hired.getUTCDate() + (n % 2800))
  return {
    job_title: titles[n % titles.length],
    email: `${slug}@acme.example`,
    level,
    hired_on: hired.toISOString().slice(0, 10),
  }
}

export function usdMinor(minor: number, currency: string) {
  if (currency === 'USD') return minor
  if (currency === 'EUR') return Math.round((minor * 108) / 100)
  if (currency === 'GBP') return Math.round((minor * 127) / 100)
  if (currency === 'INR') return Math.round((minor * 12) / 1000)
  throw new Error(`No USD rate for ${currency}.`)
}

export function bandFor(country: string, level: string) {
  const place = COUNTRIES.find((item) => item.country === country)
  const factor = LEVEL_FACTOR[level as (typeof LEVELS)[number]] ?? 1
  const midMinor = Math.round((place?.base ?? 50_000) * factor) * 100
  const minMinor = Math.round(midMinor * 0.75)
  const maxMinor = Math.round(midMinor * 1.25)
  return { minMinor, maxMinor, midMinor }
}
