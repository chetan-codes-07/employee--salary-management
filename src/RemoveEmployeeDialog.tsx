import { useState } from 'react'
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
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (busy) return
    setBusy(true)
    try {
      await request<{ id: string }>('/api/employees/' + employee.id, { method: 'DELETE' })
      toast.success(`${employee.name} removed.`)
      onRemoved()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not remove this employee.')
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove employee</DialogTitle>
          <DialogDescription>
            Remove {employee.name} ({employee.id}) and their salary history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={remove} disabled={busy}>
            {busy && <Spinner />}
            {busy ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
