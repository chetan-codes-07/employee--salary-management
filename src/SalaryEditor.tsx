import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { figure, mark, request, type Employee } from './api'
import { salaryCanSave } from './employee-forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export function SalaryEditor({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee
  onClose: () => void
  onSave: (row: Employee) => void
}) {
  const major = employee.salary_minor / 100
  const [amount, setAmount] = useState(Number.isInteger(major) ? String(major) : major.toFixed(2))
  const [error, setError] = useState('')
  const saveSalary = useMutation({
    mutationFn: () =>
      request<Employee>('/api/employees/' + employee.id + '/salary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary: amount.trim(), revision: employee.revision }),
      }),
    onSuccess: (saved) => onSave(saved),
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'Save failed. Try again.'),
  })
  const conflict = error.includes('Reload')
  const canSave = !saveSalary.isPending && salaryCanSave(amount, employee.salary_minor)

  function save(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    setError('')
    saveSalary.mutate()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveSalary.isPending) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit annual salary</DialogTitle>
          <DialogDescription>
            {employee.name} · {employee.department} · {employee.country}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={save}>
          <p className="font-mono text-xs text-muted-foreground">{employee.id}</p>
          <p className="text-sm text-muted-foreground">
            Current annual base{' '}
            <span className="font-mono text-base font-medium text-foreground tabular-nums">
              {figure(employee.salary_minor, employee.currency)}
            </span>
          </p>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="salary-amount">New annual base salary ({mark(employee.currency)})</FieldLabel>
            <Input
              id="salary-amount"
              autoFocus
              inputMode="decimal"
              value={amount}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'salary-error' : 'salary-hint'}
              onChange={(e) => setAmount(e.target.value)}
            />
            {error ? (
              <FieldError id="salary-error">{error}</FieldError>
            ) : (
              <FieldDescription id="salary-hint">Up to two decimal places</FieldDescription>
            )}
          </Field>
          <DialogFooter>
            {conflict && (
              <Button type="button" variant="outline" onClick={onClose}>
                Reload employee
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saveSalary.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saveSalary.isPending && <Spinner />}
              {saveSalary.isPending ? 'Saving…' : 'Save salary'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
