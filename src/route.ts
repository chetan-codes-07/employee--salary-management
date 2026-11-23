export type Page = '/' | '/employees' | '/employee'

export type RouteFilters = {
  q: string
  country: string
  department: string
  level: string
  status: string
  employeeId: string
}

export type Options = {
  countries: string[]
  departments: string[]
  levels: string[]
  statuses: string[]
}

export function readRoute() {
  const params = new URLSearchParams(location.search)
  const pathname = location.pathname.replace(/\/$/, '') || '/'
  const detail = pathname.match(/^\/employees\/(EMP-\d{5})$/)
  const path: Page = detail ? '/employee' : pathname === '/employees' ? '/employees' : '/'
  return {
    path,
    employeeId: detail?.[1] || '',
    q: params.get('q') || '',
    country: params.get('country') || '',
    department: params.get('department') || '',
    level: params.get('level') || '',
    status: params.get('status') || '',
  }
}

export function routeUrl(path: Page, filters: RouteFilters) {
  const params = new URLSearchParams()
  if (path !== '/' && filters.q) params.set('q', filters.q)
  if (filters.country) params.set('country', filters.country)
  if (filters.department) params.set('department', filters.department)
  if (path !== '/' && filters.level) params.set('level', filters.level)
  if (path !== '/' && filters.status) params.set('status', filters.status)
  const pathname = path === '/employee' ? `/employees/${filters.employeeId}` : path
  return pathname + (params.size ? '?' + params : '')
}
