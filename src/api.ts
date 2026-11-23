import type { Employee as CoreEmployee } from '../server/seed-data'
import type { EmployeeDetail, EmployeeView } from '../server/employees'
export type Employee = EmployeeView
export type { EmployeeDetail, CoreEmployee }
export type { Summary, Charts } from '../server/employees'
export type Directory = { items: Employee[]; total: number; pages: number; page: number; pageSize: number }
export async function downloadCsv(params: URLSearchParams) {
  const response = await fetch('/api/employees/export?' + params)
  if (response.status === 401) window.dispatchEvent(new Event('session-ended'))
  if (!response.ok) throw new Error('Could not export these employees.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'acme-employees.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (response.status === 401) window.dispatchEvent(new Event('session-ended'))
  const payload = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Unable to complete the request.')
  return payload
}
export function money(minor: number, currency: string, display: 'code' | 'amount' = 'code') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: display === 'code' ? 'currency' : 'decimal',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100)
}

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€' }

export function mark(currency: string) {
  return SYMBOL[currency] ?? currency
}

export function figure(minor: number, currency: string) {
  const whole = minor % 100 === 0
  const amount = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(minor / 100)
  return `${SYMBOL[currency] ?? ''}${amount}`
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}
