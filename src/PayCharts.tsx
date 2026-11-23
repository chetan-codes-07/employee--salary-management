import type { ReactElement } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Charts } from './api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const axis = { fill: 'var(--muted-foreground)', fontSize: 12 }
const countAxis = { ...axis, fontFamily: 'IBM Plex Mono, ui-monospace, monospace' }

function Tip({ active, label, value }: { active?: boolean; label?: string | number; value: string }) {
  if (!active) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-sm">
      <p>{label}</p>
      <p className="font-mono tabular-nums">{value}</p>
    </div>
  )
}

function Frame({ children }: { children: ReactElement }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export function PayCharts({ charts }: { charts: Charts }) {
  const departments = charts.departments.map((row) => ({ ...row, label: row.label || 'Unassigned' }))
  const levels = charts.levels.map((row) => ({ ...row, label: row.label || 'Unassigned' }))

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">Headcount</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">By department</CardTitle>
            <CardDescription>Employees in the selected group</CardDescription>
          </CardHeader>
          <CardContent>
            <Frame>
              <BarChart data={departments} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={axis} />
                <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} tick={countAxis} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  content={(props) => (
                    <Tip
                      active={props.active}
                      label={props.label}
                      value={`${Number(props.payload?.[0]?.value ?? 0).toLocaleString()} people`}
                    />
                  )}
                />
                <Bar dataKey="count" fill="var(--foreground)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </Frame>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">By level</CardTitle>
            <CardDescription>Employees in the selected group</CardDescription>
          </CardHeader>
          <CardContent>
            <Frame>
              <LineChart data={levels} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={axis} />
                <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} tick={countAxis} />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  content={(props) => (
                    <Tip
                      active={props.active}
                      label={props.label}
                      value={`${Number(props.payload?.[0]?.value ?? 0).toLocaleString()} people`}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--foreground)' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </Frame>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
