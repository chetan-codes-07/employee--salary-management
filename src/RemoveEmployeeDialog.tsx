import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request } from './api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

export function RemoveEmployeeDialog({
  employee,
  onClose,
  onRemoved,
}: {
  employee: { id: string; name: string }
  onClose: () => void
  onRemoved: () => void
}) {
  const removeEmployee = useMutation({
    mutationFn: () => request<{ id: string }>('/api/employees/' + employee.id, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`${employee.name} removed.`)
      onRemoved()
    },
    onError: (reason) => toast.error(reason instanceof Error ? reason.message : 'Could not remove this employee.'),
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !removeEmployee.isPending) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove employee</DialogTitle>
          <DialogDescription>
            Remove {employee.name} ({employee.id}) and their salary history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={removeEmployee.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => removeEmployee.mutate()} disabled={removeEmployee.isPending}>
            {removeEmployee.isPending && <Spinner />}
            {removeEmployee.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
