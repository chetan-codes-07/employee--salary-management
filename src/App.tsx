import { useEffect, useState } from 'react'
import { Directory } from './Directory'
import { EmployeeDetail } from './EmployeeDetail'
import { Insight } from './Insight'
import { AppSidebar } from './AppSidebar'
import { request, type Charts, type Directory as DirectoryPage, type Summary } from './api'
import { readRoute, routeUrl, type Options, type Page, type RouteFilters } from './route'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

export function App({onSignOut, signingOut, signOutError}: {onSignOut:()=>void; signingOut:boolean; signOutError:string}) {
  const initial = readRoute()
  const [path, setPath] = useState<Page>(initial.path)
  const [employeeId, setEmployeeId] = useState(initial.employeeId)
  const [q, setQ] = useState(initial.q)
  const [country, setCountry] = useState(initial.country)
  const [department, setDepartment] = useState(initial.department)
  const [level, setLevel] = useState(initial.level)
  const [status, setStatus] = useState(initial.status)
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [groups, setGroups] = useState<Summary[] | null>(null)
  const [charts, setCharts] = useState<Charts | null>(null)
  const [directory, setDirectory] = useState<DirectoryPage | null>(null)
  const [options, setOptions] = useState<Options | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(initial.path !== '/employee')

  useEffect(() => {
    const onPop = () => {
      const next = readRoute()
      setLoading(next.path !== '/employee')
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

  useEffect(() => {
    if (path === '/employee') return
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (path === '/employees' && q) params.set('q', q)
    if (path === '/employees' && level) params.set('level', level)
    if (path === '/employees' && status) params.set('status', status)
    if (country) params.set('country', country)
    if (department) params.set('department', department)
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const opts = { signal: controller.signal }
        const nextOptions = request<Options>('/api/options', opts)
        if (path === '/employees') {
          const [rows, choices] = await Promise.all([
            request<DirectoryPage>('/api/employees?' + params + '&page=' + page, opts),
            nextOptions,
          ])
          if (!controller.signal.aborted) {
            setDirectory(rows)
            setOptions(choices)
          }
        } else {
          const [totals, picture, choices] = await Promise.all([
            request<Summary[]>('/api/summary?' + params, opts),
            request<Charts>('/api/charts?' + params, opts),
            nextOptions,
          ])
          if (!controller.signal.aborted) {
            setGroups(totals)
            setCharts(picture)
            setOptions(choices)
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load employees.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 150)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [path, q, country, department, level, status, page, refresh])

  function filters(): RouteFilters {
    return { q, country, department, level, status, employeeId }
  }

  function change(set: (value: string) => void, value: string) {
    setLoading(true)
    setPage(1)
    set(value)
  }

  function go(next: '/' | '/employees') {
    const url = routeUrl(next, filters())
    if (location.pathname + location.search !== url) history.pushState(null, '', url)
    setLoading(true)
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
          <Button variant="outline" disabled={signingOut} onClick={onSignOut}>{signingOut?'Signing out…':'Sign out'}</Button>
        </header>
        {signOutError && <p role="alert" className="px-4 text-destructive">{signOutError}</p>}
        <div
          className={
            path === '/employees'
              ? 'flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4 md:overflow-hidden'
              : 'min-h-0 flex-1 overflow-auto px-6 py-6'
          }
        >
          {path !== '/employee' && error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{path === '/employees' ? 'Directory unavailable' : 'Pay figures unavailable'}</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={() => setRefresh((n) => n + 1)}>
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
              groups={loading ? null : groups}
              charts={loading ? null : charts}
              loading={loading}
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
              directory={loading ? null : directory}
              loading={loading}
              onQuery={(value) => change(setQ, value)}
              onCountry={(value) => change(setCountry, value)}
              onDepartment={(value) => change(setDepartment, value)}
              onLevel={(value) => change(setLevel, value)}
              onStatus={(value) => change(setStatus, value)}
              onClear={() => {
                setLoading(true)
                setQ('')
                setCountry('')
                setDepartment('')
                setLevel('')
                setStatus('')
                setPage(1)
              }}
              onPage={(next) => {
                setLoading(true)
                setPage(next)
              }}
              onOpen={openEmployee}
              onCreated={() => setRefresh((n) => n + 1)}
            />
          ) : (
            <EmployeeDetail id={employeeId} onBack={() => go('/employees')} />
          )}
          {path === '/employees' && !loading && error && (
            <p className="text-sm text-muted-foreground">Directory unavailable</p>
          )}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
