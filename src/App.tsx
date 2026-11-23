import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Directory } from './Directory'
import { EmployeeDetail } from './EmployeeDetail'
import { Insight } from './Insight'
import { AppSidebar } from './AppSidebar'
import { request, type Charts, type Directory as DirectoryPage, type Summary } from './api'
import { refreshCompensation } from './query'
import { readRoute, routeUrl, type Options, type Page, type RouteFilters } from './route'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/sonner'

export function App({
  onSignOut,
  signingOut,
  signOutError,
}: {
  onSignOut: () => void
  signingOut: boolean
  signOutError: string
}) {
  const initial = readRoute()
  const [path, setPath] = useState<Page>(initial.path)
  const [employeeId, setEmployeeId] = useState(initial.employeeId)
  const [q, setQ] = useState(initial.q)
  const [country, setCountry] = useState(initial.country)
  const [department, setDepartment] = useState(initial.department)
  const [level, setLevel] = useState(initial.level)
  const [status, setStatus] = useState(initial.status)
  const [page, setPage] = useState(1)
  const search = useDebounced(q)

  const optionsQuery = useQuery({
    queryKey: ['options'],
    queryFn: ({ signal }) => request<Options>('/api/options', { signal }),
    staleTime: 5 * 60_000,
  })
  const directoryQuery = useQuery({
    queryKey: ['directory', { q: search, country, department, level, status, page }],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('q', search)
      if (country) params.set('country', country)
      if (department) params.set('department', department)
      if (level) params.set('level', level)
      if (status) params.set('status', status)
      return request<DirectoryPage>('/api/employees?' + params, { signal })
    },
    enabled: path === '/employees',
    placeholderData: keepPreviousData,
  })
  const summaryQuery = useQuery({
    queryKey: ['summary', { country, department }],
    queryFn: ({ signal }) => request<Summary[]>('/api/summary?' + scopeParams(country, department), { signal }),
    enabled: path === '/',
    placeholderData: keepPreviousData,
  })
  const chartsQuery = useQuery({
    queryKey: ['charts', { country, department }],
    queryFn: ({ signal }) => request<Charts>('/api/charts?' + scopeParams(country, department), { signal }),
    enabled: path === '/',
    placeholderData: keepPreviousData,
  })

  const options = optionsQuery.data ?? null
  const directory = directoryQuery.data ?? null
  const groups = summaryQuery.data ?? null
  const charts = chartsQuery.data ?? null
  const directoryLoading = directoryQuery.isPending
  const insightLoading = summaryQuery.isPending || chartsQuery.isPending
  const retrying = path === '/employees' ? directoryQuery.isFetching : summaryQuery.isFetching || chartsQuery.isFetching
  const activeError =
    path === '/employees' ? directoryQuery.error : path === '/' ? summaryQuery.error || chartsQuery.error : null

  useEffect(() => {
    const onPop = () => {
      const next = readRoute()
      setPath(next.path)
      setEmployeeId(next.employeeId)
      setQ(next.q)
      setCountry(next.country)
      setDepartment(next.department)
      setLevel(next.level)
      setStatus(next.status)
      setPage(1)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const url = routeUrl(path, {
      q,
      country,
      department,
      level,
      status,
      employeeId,
    })
    if (location.pathname + location.search !== url) history.replaceState(null, '', url)
  }, [path, q, country, department, level, status, employeeId])

  function filters(): RouteFilters {
    return { q, country, department, level, status, employeeId }
  }

  function change(set: (value: string) => void, value: string) {
    setPage(1)
    set(value)
  }

  function go(next: '/' | '/employees') {
    const url = routeUrl(next, filters())
    if (location.pathname + location.search !== url) history.pushState(null, '', url)
    setPath(next)
    setPage(1)
  }

  function openEmployee(id: string) {
    const url = routeUrl('/employee', { ...filters(), employeeId: id })
    if (location.pathname + location.search !== url) history.pushState(null, '', url)
    setEmployeeId(id)
    setPath('/employee')
  }

  const insightUrl = routeUrl('/', filters())
  const employeesUrl = routeUrl('/employees', filters())

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <a className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50" href="#top">
        Skip to content
      </a>
      <AppSidebar path={path} insightUrl={insightUrl} employeesUrl={employeesUrl} onGo={go} />
      <SidebarInset id="top" className="min-h-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="size-11" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">{path === '/' ? 'Insights' : 'Employees'}</span>
          <span className="ml-auto text-sm text-muted-foreground">Fictional records</span>
          <Button variant="outline" disabled={signingOut} onClick={onSignOut}>
            {signingOut && <Spinner />}
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </header>
        {signOutError && (
          <p role="alert" className="px-4 text-destructive">
            {signOutError}
          </p>
        )}
        <div
          className={
            path === '/employees'
              ? 'flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4 md:overflow-hidden'
              : 'min-h-0 flex-1 overflow-auto px-6 py-6'
          }
        >
          {path !== '/employee' && activeError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{path === '/employees' ? 'Directory unavailable' : 'Pay figures unavailable'}</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{activeError instanceof Error ? activeError.message : 'Unable to load employees.'}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={retrying}
                  onClick={() => (path === '/employees' ? directoryQuery.refetch() : refreshCompensation())}
                >
                  {retrying && <Spinner />}
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {path === '/' ? (
            <Insight
              country={country}
              department={department}
              options={options}
              groups={groups}
              charts={charts}
              loading={insightLoading}
              onCountry={(value) => change(setCountry, value)}
              onDepartment={(value) => change(setDepartment, value)}
            />
          ) : path === '/employees' ? (
            <Directory
              q={q}
              country={country}
              department={department}
              level={level}
              status={status}
              page={page}
              options={options}
              directory={directory}
              loading={directoryLoading}
              onQuery={(value) => change(setQ, value)}
              onCountry={(value) => change(setCountry, value)}
              onDepartment={(value) => change(setDepartment, value)}
              onLevel={(value) => change(setLevel, value)}
              onStatus={(value) => change(setStatus, value)}
              onClear={() => {
                setQ('')
                setCountry('')
                setDepartment('')
                setLevel('')
                setStatus('')
                setPage(1)
              }}
              onPage={setPage}
              onOpen={openEmployee}
              onCreated={() => refreshCompensation()}
            />
          ) : (
            <EmployeeDetail id={employeeId} onBack={() => go('/employees')} />
          )}
          {path === '/employees' && !directoryLoading && activeError && (
            <p className="text-sm text-muted-foreground">Directory unavailable</p>
          )}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}

function scopeParams(country: string, department: string) {
  const params = new URLSearchParams()
  if (country) params.set('country', country)
  if (department) params.set('department', department)
  return params
}

function useDebounced(value: string, delay = 150) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
