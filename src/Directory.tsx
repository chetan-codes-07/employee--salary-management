import { useRef, useState, type FormEvent } from 'react'
import { csvEmployees, IMPORT_BATCH_SIZE, MAX_FILE_BYTES } from '../shared/import-csv'
import { toast } from 'sonner'
import { figure, request, type Directory as Page, type Employee } from './api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Filter, Pencil, Trash2 } from 'lucide-react'
import { RemoveEmployeeDialog } from './RemoveEmployeeDialog'

type Options = { countries: string[]; departments: string[]; levels: string[]; statuses: string[] }

export function Directory({
  q,
  country,
  department,
  level,
  status,
  page,
  options,
  directory,
  loading,
  onQuery,
  onCountry,
  onDepartment,
  onLevel,
  onStatus,
  onClear,
  onPage,
  onOpen,
  onCreated,
}: {
  q: string
  country: string
  department: string
  level: string
  status: string
  page: number
  options: Options | null
  directory: Page | null
  loading: boolean
  onQuery: (value: string) => void
  onCountry: (value: string) => void
  onDepartment: (value: string) => void
  onLevel: (value: string) => void
  onStatus: (value: string) => void
  onClear: () => void
  onPage: (page: number) => void
  onOpen: (id: string) => void
  onCreated: () => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Employee | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtered = Boolean(q || country || department || level || status)
  const sheetFilters = Boolean(country || department || level || status)
  const total = directory?.total ?? 0
  const count = total.toLocaleString()

  async function exportCsv() {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (country) params.set('country', country)
    if (department) params.set('department', department)
    if (level) params.set('level', level)
    if (status) params.set('status', status)
    const response = await fetch('/api/employees/export?' + params)
    if (response.status === 401) window.dispatchEvent(new Event('session-ended'))
    if (!response.ok) {
      toast.error('Could not export this directory.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'acme-employees.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Directory exported.')
  }

  async function importCsv(list: FileList | null) {
    const csv = list?.[0]
    if (!csv || importing) return
    setImporting(true)
    const result = { created: 0, errors: [] as { line: number; message: string }[] }
    try {
      if (csv.size > MAX_FILE_BYTES) throw new Error('Import file is too large.')
      const text = await csv.text()
      const rows = csvEmployees(text)
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      const fileId = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
      for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
        const batch = await request<typeof result>('/api/employees/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, offset, rows: rows.slice(offset, offset + IMPORT_BATCH_SIZE) }),
        })
        result.created += batch.created
        result.errors.push(...batch.errors)
      }
      if (result.errors.length) {
        toast.error(`Imported ${result.created} employees.`, {
          description: `Row ${result.errors[0].line}: ${result.errors[0].message}`,
        })
      } else {
        toast.success(`Imported ${result.created} employees.`)
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not import that file.', {
        description: 'Select the same file to retry. Completed batches are preserved.',
      })
    } finally {
      if (result.created) {
        onCreated()
      }
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 md:min-h-0 md:flex-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-medium">Employees</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={importing} onClick={() => file.current?.click()}>
            {importing ? 'Importing…' : 'Import CSV'}
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button onClick={() => setAdding(true)}>Add employee</Button>
          <input
            ref={file}
            className="hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              importCsv(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="flex items-end gap-2 md:hidden">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="employee-search">Search</FieldLabel>
          <Input
            id="employee-search"
            type="search"
            placeholder="Name, email or employee code"
            value={q}
            maxLength={100}
            onChange={(event) => onQuery(event.target.value)}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="relative shrink-0"
          aria-label={sheetFilters ? 'Open filters, filters applied' : 'Open filters'}
          onClick={() => setFiltersOpen(true)}
        >
          <Filter />
          {sheetFilters && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" aria-hidden="true" />
          )}
        </Button>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] gap-0 md:hidden">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow the employee directory</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-auto px-4 pb-4">
            <DirectoryFilters
              idPrefix="mobile"
              country={country}
              department={department}
              level={level}
              status={status}
              options={options}
              onCountry={onCountry}
              onDepartment={onDepartment}
              onLevel={onLevel}
              onStatus={onStatus}
            />
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              size="lg"
              disabled={!sheetFilters}
              onClick={() => {
                onClear()
                setFiltersOpen(false)
              }}
            >
              Clear filters
            </Button>
            <Button size="lg" onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="hidden items-end gap-4 md:grid md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
        <Field>
          <FieldLabel htmlFor="employee-search-desktop">Search</FieldLabel>
          <Input
            id="employee-search-desktop"
            type="search"
            placeholder="Name, email or employee code"
            value={q}
            maxLength={100}
            onChange={(event) => onQuery(event.target.value)}
          />
        </Field>
        <DirectoryFilters
          idPrefix="desktop"
          country={country}
          department={department}
          level={level}
          status={status}
          options={options}
          onCountry={onCountry}
          onDepartment={onDepartment}
          onLevel={onLevel}
          onStatus={onStatus}
        />
        <Button variant="outline" size="lg" onClick={onClear} disabled={!filtered}>
          Clear filters
        </Button>
      </div>

      <section className="flex flex-col gap-3 md:min-h-0 md:flex-1" aria-busy={loading}>
        {(loading || (directory && total > 0)) && (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {loading
                ? Array.from({ length: 6 }, (_, index) => (
                    <Card key={index} className="gap-3 py-4">
                      <CardHeader className="px-4">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                      </CardHeader>
                      <CardContent className="px-4">
                        <Skeleton className="h-4 w-32" />
                      </CardContent>
                    </Card>
                  ))
                : directory!.items.map((employee) => (
                    <Card
                      key={employee.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer gap-3 py-4 transition-colors hover:bg-muted/40"
                      onClick={() => onOpen(employee.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onOpen(employee.id)
                        }
                      }}
                    >
                      <CardHeader className="px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]">
                        <CardTitle className="text-base font-medium">{employee.name}</CardTitle>
                        <CardDescription>
                          <span className="font-mono text-xs text-muted-foreground">{employee.id}</span>
                          {' · '}
                          {employee.job_title}
                        </CardDescription>
                        <CardAction className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${employee.name}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              onOpen(employee.id)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                            aria-label={`Remove ${employee.name}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setRemoving(employee)
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2 px-4 text-sm">
                        <p className="text-muted-foreground">
                          {employee.department} · {employee.country}
                        </p>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-mono tabular-nums">{figure(employee.salary_minor, employee.currency)}</p>
                          <p className="font-mono text-muted-foreground tabular-nums">
                            {figure(employee.usd_minor, 'USD')} USD
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              {!loading && directory && total > 0 && (
                <DirectoryPager page={page} total={total} count={count} directory={directory} onPage={onPage} />
              )}
            </div>

            <div className="hidden min-h-48 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border md:flex">
              <Table containerClassName="min-h-0 flex-1" className="min-w-[1100px] border-separate border-spacing-0">
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Salary (local)</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 12 }, (_, index) => (
                        <TableRow key={index} className="h-11">
                          {Array.from({ length: 8 }, (_, cell) => (
                            <TableCell key={cell} className="py-0">
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : directory!.items.map((employee) => (
                        <TableRow key={employee.id} className="h-11 cursor-pointer" onClick={() => onOpen(employee.id)}>
                          <TableCell className="py-0 font-mono text-xs">{employee.id}</TableCell>
                          <TableCell className="py-0 font-medium">{employee.name}</TableCell>
                          <TableCell className="py-0">{employee.job_title}</TableCell>
                          <TableCell className="py-0">{employee.department}</TableCell>
                          <TableCell className="py-0">{employee.country}</TableCell>
                          <TableCell className="py-0 text-right font-mono tabular-nums">
                            {figure(employee.salary_minor, employee.currency)}
                          </TableCell>
                          <TableCell className="py-0 text-right font-mono tabular-nums">
                            {figure(employee.usd_minor, 'USD')}
                          </TableCell>
                          <TableCell className="py-0 text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${employee.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onOpen(employee.id)
                                }}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-destructive"
                                aria-label={`Remove ${employee.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setRemoving(employee)
                                }}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
              {!loading && directory && total > 0 && (
                <DirectoryPager
                  page={page}
                  total={total}
                  count={count}
                  directory={directory}
                  onPage={onPage}
                  bordered
                />
              )}
            </div>
          </>
        )}
        {loading && <p className="sr-only">Loading employees</p>}
        {!loading && directory && total === 0 && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">No employees match these filters</p>
            {filtered && (
              <Button variant="outline" onClick={onClear}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </section>
      {adding && (
        <AddEmployeeDialog
          options={options}
          onClose={() => setAdding(false)}
          onCreated={(employee) => {
            setAdding(false)
            toast.success(`${employee.name} added at ${figure(employee.salary_minor, employee.currency)}`)
            onCreated()
          }}
        />
      )}
      {removing && (
        <RemoveEmployeeDialog
          employee={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null)
            onCreated()
          }}
        />
      )}
    </div>
  )
}

function DirectoryFilters({
  idPrefix,
  country,
  department,
  level,
  status,
  options,
  onCountry,
  onDepartment,
  onLevel,
  onStatus,
}: {
  idPrefix: string
  country: string
  department: string
  level: string
  status: string
  options: Options | null
  onCountry: (value: string) => void
  onDepartment: (value: string) => void
  onLevel: (value: string) => void
  onStatus: (value: string) => void
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
        <NativeSelect id={`${idPrefix}-country`} value={country} onChange={(event) => onCountry(event.target.value)}>
          <NativeSelectOption value="">All countries</NativeSelectOption>
          {options?.countries.map((value) => (
            <NativeSelectOption key={value}>{value}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-department`}>Department</FieldLabel>
        <NativeSelect
          id={`${idPrefix}-department`}
          value={department}
          onChange={(event) => onDepartment(event.target.value)}
        >
          <NativeSelectOption value="">All departments</NativeSelectOption>
          {options?.departments.map((value) => (
            <NativeSelectOption key={value}>{value}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-level`}>Level</FieldLabel>
        <NativeSelect id={`${idPrefix}-level`} value={level} onChange={(event) => onLevel(event.target.value)}>
          <NativeSelectOption value="">All levels</NativeSelectOption>
          {options?.levels.map((value) => (
            <NativeSelectOption key={value}>{value}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-status`}>Status</FieldLabel>
        <NativeSelect id={`${idPrefix}-status`} value={status} onChange={(event) => onStatus(event.target.value)}>
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          {options?.statuses.map((value) => (
            <NativeSelectOption key={value}>{value}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </>
  )
}

function DirectoryPager({
  page,
  total,
  count,
  directory,
  onPage,
  bordered = false,
}: {
  page: number
  total: number
  count: string
  directory: Page
  onPage: (page: number) => void
  bordered?: boolean
}) {
  return (
    <div
      className={
        bordered
          ? 'flex w-full min-w-0 flex-col gap-3 border-t bg-card px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'
          : 'flex w-full min-w-0 flex-col gap-3 rounded-lg border bg-card px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'
      }
    >
      <p className="font-mono text-sm tabular-nums text-muted-foreground">
        {(page - 1) * directory.pageSize + 1}–{Math.min(page * directory.pageSize, total)} of {count}
      </p>
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:ml-auto sm:flex sm:w-auto sm:grid-cols-none">
        <Button
          variant="outline"
          className="w-full px-3 sm:w-auto sm:px-6"
          size="lg"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <span className="px-1 text-center font-mono text-sm tabular-nums text-muted-foreground whitespace-nowrap sm:min-w-28">
          Page {page} of {directory.pages}
        </span>
        <Button
          variant="outline"
          className="w-full px-3 sm:w-auto sm:px-6"
          size="lg"
          disabled={page >= directory.pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function AddEmployeeDialog({
  options,
  onClose,
  onCreated,
}: {
  options: Options | null
  onClose: () => void
  onCreated: (employee: Employee) => void
}) {
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [country, setCountry] = useState(options?.countries[0] ?? 'India')
  const [department, setDepartment] = useState(options?.departments[0] ?? 'Engineering')
  const [level, setLevel] = useState(options?.levels[2] ?? 'L3')
  const [salary, setSalary] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const saved = await request<Employee>('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, jobTitle, department, country, level, salary }),
      })
      onCreated(saved)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add this employee.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={save}>
          <Field>
            <FieldLabel htmlFor="new-name">Name</FieldLabel>
            <Input id="new-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-title">Job title</FieldLabel>
            <Input
              id="new-title"
              value={jobTitle}
              maxLength={80}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-country">Country</FieldLabel>
            <NativeSelect id="new-country" value={country} onChange={(event) => setCountry(event.target.value)}>
              {options?.countries.map((value) => (
                <NativeSelectOption key={value}>{value}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-department">Department</FieldLabel>
            <NativeSelect
              id="new-department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              {options?.departments.map((value) => (
                <NativeSelectOption key={value}>{value}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-level">Level</FieldLabel>
            <NativeSelect id="new-level" value={level} onChange={(event) => setLevel(event.target.value)}>
              {options?.levels.map((value) => (
                <NativeSelectOption key={value}>{value}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-salary">Annual salary</FieldLabel>
            <Input
              id="new-salary"
              inputMode="decimal"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Add employee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
