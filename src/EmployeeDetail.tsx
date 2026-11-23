import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { detailsCanSave, parseDetails } from './employee-forms'
import { RemoveEmployeeDialog } from './RemoveEmployeeDialog'
import { SalaryEditor } from './SalaryEditor'
import { figure, formatDate, request, type EmployeeDetail as Detail } from './api'
import { refreshCompensation } from './query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']

export function EmployeeDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const employeeQuery = useQuery({
    queryKey: ['employee', id],
    queryFn: ({ signal }) => request<Detail>('/api/employees/' + id, { signal }),
  })
  const detail = employeeQuery.data
  const loading = employeeQuery.isPending
  const error = employeeQuery.error
  const [editingSalary, setEditingSalary] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [removing, setRemoving] = useState(false)

  function remember(saved: Detail) {
    queryClient.setQueryData<Detail>(['employee', id], (current) => (current ? { ...current, ...saved } : saved))
    refreshCompensation(id)
  }

  const setStatus = useMutation({
    mutationFn: (status: 'Active' | 'Inactive') =>
      request<Detail>('/api/employees/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, revision: detail?.revision }),
      }),
    onSuccess: (saved) => remember(saved),
    onError: (reason) => toast.error(reason instanceof Error ? reason.message : 'Could not update status.'),
  })

  const band = detail?.band
  const marker = band ? Math.min(100, Math.max(0, band.position * 100)) : 0
  const within = band ? detail!.salary_minor >= band.minMinor && detail!.salary_minor <= band.maxMinor : false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Employees
          </button>
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-2xl leading-8 font-medium">{detail?.name}</h1>
          )}
          {detail && (
            <p className="text-sm text-muted-foreground">
              {detail.id} · {detail.job_title} · {detail.department}
            </p>
          )}
        </div>
        {detail && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditingDetails(true)}>
              Edit details
            </Button>
            <Button
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate(detail.status === 'Active' ? 'Inactive' : 'Active')}
            >
              {setStatus.isPending && <Spinner />}
              {setStatus.isPending ? 'Saving…' : detail.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="outline" onClick={() => setRemoving(true)}>
              Remove
            </Button>
            <Button onClick={() => setEditingSalary(true)}>Change salary</Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Employee unavailable</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error instanceof Error ? error.message : 'Unable to load this employee.'}</span>
            <Button variant="outline" size="sm" disabled={employeeQuery.isFetching} onClick={() => employeeQuery.refetch()}>
              {employeeQuery.isFetching && <Spinner />}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )}

      {detail && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Current salary</CardTitle>
                <p className="font-mono text-3xl leading-9 font-medium tabular-nums">
                  {figure(detail.salary_minor, detail.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums">{figure(detail.usd_minor, 'USD')}</span> USD · rates dated{' '}
                  {detail.rateDate}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    Position in band ({detail.level}, {detail.country})
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="meter"
                  aria-valuemin={band!.minMinor}
                  aria-valuemax={band!.maxMinor}
                  aria-valuenow={detail.salary_minor}
                  aria-label="Position in salary band"
                >
                  <div className="h-full bg-foreground" style={{ width: `${marker}%` }} />
                </div>
                <div className="flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
                  <span>Min {figure(band!.minMinor, detail.currency)}</span>
                  <span>Max {figure(band!.maxMinor, detail.currency)}</span>
                </div>
                <p className="text-sm">
                  Compa-ratio <span className="font-mono tabular-nums">{band!.ratio.toFixed(2)}</span> ·{' '}
                  {within ? 'within band' : 'outside band'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <ProfileItem label="Email" value={detail.email} />
                <ProfileItem label="Country" value={`${detail.country} (${detail.currency})`} />
                <ProfileItem label="Level" value={detail.level} />
                <ProfileItem label="Hired" value={formatDate(detail.hired_on)} />
                <ProfileItem label="Status" value={detail.status} />
                <ProfileItem
                  label="Last raise"
                  value={formatDate(detail.history.at(-1)?.effective_on ?? detail.hired_on)}
                />
              </CardContent>
            </Card>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-medium">Salary history</h2>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Effective</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...detail.history].reverse().map((event) => (
                    <TableRow key={`${event.effective_on}-${event.reason}-${event.salary_minor}`}>
                      <TableCell>{formatDate(event.effective_on)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {figure(event.salary_minor, detail.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {event.change === null ? '' : `${event.change > 0 ? '+' : ''}${event.change.toFixed(1)}%`}
                      </TableCell>
                      <TableCell>{event.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      {editingSalary && detail && (
        <SalaryEditor
          employee={detail}
          onClose={() => setEditingSalary(false)}
          onSave={() => {
            setEditingSalary(false)
            refreshCompensation(id)
          }}
        />
      )}
      {editingDetails && detail && (
        <DetailsDialog
          detail={detail}
          onClose={() => setEditingDetails(false)}
          onSaved={(saved) => {
            remember(saved)
            setEditingDetails(false)
          }}
        />
      )}
      {removing && detail && (
        <RemoveEmployeeDialog employee={detail} onClose={() => setRemoving(false)} onRemoved={onBack} />
      )}
    </div>
  )
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function DetailsDialog({
  detail,
  onClose,
  onSaved,
}: {
  detail: Detail
  onClose: () => void
  onSaved: (row: Detail) => void
}) {
  const [jobTitle, setJobTitle] = useState(detail.job_title)
  const [email, setEmail] = useState(detail.email)
  const [level, setLevel] = useState<string>(detail.level)
  const [error, setError] = useState('')
  const saveDetails = useMutation({
    mutationFn: (parsed: { jobTitle: string; email: string; level: string }) =>
      request<Detail>('/api/employees/' + detail.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: detail.revision,
          jobTitle: parsed.jobTitle,
          email: parsed.email,
          level: parsed.level,
        }),
      }),
    onSuccess: (saved) => onSaved(saved),
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'Could not save these details.'),
  })
  const current = { jobTitle: detail.job_title, email: detail.email, level: detail.level }
  const canSave = !saveDetails.isPending && detailsCanSave({ jobTitle, email, level }, current)

  function save(event: FormEvent) {
    event.preventDefault()
    const parsed = parseDetails({ jobTitle, email, level })
    if (!parsed.success || !detailsCanSave(parsed.data, current) || saveDetails.isPending) return
    setError('')
    saveDetails.mutate(parsed.data)
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveDetails.isPending) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={save}>
          <Field>
            <FieldLabel htmlFor="job-title">Job title</FieldLabel>
            <Input
              id="job-title"
              value={jobTitle}
              maxLength={80}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="employee-email">Email</FieldLabel>
            <Input
              id="employee-email"
              type="email"
              value={email}
              maxLength={120}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="employee-level">Level</FieldLabel>
            <NativeSelect id="employee-level" value={level} onChange={(event) => setLevel(event.target.value)}>
              {LEVELS.map((item) => (
                <NativeSelectOption key={item}>{item}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saveDetails.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saveDetails.isPending && <Spinner />}
              {saveDetails.isPending ? 'Saving…' : 'Save details'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
