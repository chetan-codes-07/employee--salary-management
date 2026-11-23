import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Charts, Summary } from './api'
import { downloadCsv, figure } from './api'
import { PayCharts } from './PayCharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { RATE_DATE } from '../server/profile'

type Options = { countries: string[]; departments: string[] }

export function Insight({
  country,
  department,
  options,
  groups,
  charts,
  loading,
  onCountry,
  onDepartment,
}: {
  country: string
  department: string
  options: Options | null
  groups: Summary[] | null
  charts: Charts | null
  loading: boolean
  onCountry: (value: string) => void
  onDepartment: (value: string) => void
}) {
  const people = groups?.reduce((total, group) => total + group.count, 0) ?? 0
  const scope = [country || 'All countries', department || 'All departments'].join(', ')

  const exportCsv = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams()
      if (country) params.set('country', country)
      if (department) params.set('department', department)
      return downloadCsv(params)
    },
    onSuccess: () => toast.success('Insight exported.'),
    onError: (reason) => toast.error(reason instanceof Error ? reason.message : 'Could not export this insight.'),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl leading-8 font-medium">Insights</h1>
          <p className="text-sm text-muted-foreground">Active employees, USD at rates dated {RATE_DATE}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <label className="sr-only" htmlFor="insight-country">
              Country
            </label>
            <NativeSelect id="insight-country" value={country} onChange={(event) => onCountry(event.target.value)}>
              <NativeSelectOption value="">All countries</NativeSelectOption>
              {options?.countries.map((value) => (
                <NativeSelectOption key={value}>{value}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="w-44">
            <label className="sr-only" htmlFor="insight-department">
              Department
            </label>
            <NativeSelect
              id="insight-department"
              value={department}
              onChange={(event) => onDepartment(event.target.value)}
            >
              <NativeSelectOption value="">All departments</NativeSelectOption>
              {options?.departments.map((value) => (
                <NativeSelectOption key={value}>{value}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Button variant="outline" disabled={exportCsv.isPending} onClick={() => exportCsv.mutate()}>
            {exportCsv.isPending && <Spinner />}
            {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-busy={loading}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-base font-medium">Annual base by currency</h2>
          <p className="text-sm text-muted-foreground">{scope}</p>
          {loading ? (
            <Skeleton className="ml-auto h-4 w-28" />
          ) : (
            <p className="ml-auto font-mono text-sm tabular-nums text-muted-foreground">
              {people.toLocaleString()} employees
            </p>
          )}
        </div>
        {loading && (
          <>
            <p className="sr-only">Loading pay figures</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-36" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </>
        )}
        {!loading && groups && groups.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((group) => (
              <Card key={group.currency}>
                <CardHeader>
                  <CardDescription className="flex items-center justify-between gap-3">
                    <span>Total annual base</span>
                    <span className="font-mono text-foreground">{group.currency}</span>
                  </CardDescription>
                  <CardTitle className="font-mono text-2xl leading-8 tabular-nums">
                    {figure(group.totalMinor, group.currency)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Average{' '}
                    <span className="font-mono text-foreground tabular-nums">
                      {figure(group.averageMinor, group.currency)}
                    </span>
                    {' · '}
                    <span className="font-mono tabular-nums">{group.count.toLocaleString()}</span> people
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
        {!loading && groups && groups.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching salaries</p>
        )}
      </section>
      {loading && (
        <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-60 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && charts && groups && groups.length > 0 && <PayCharts charts={charts} />}
    </div>
  )
}
