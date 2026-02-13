'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { Receive, ReceiveStatus, TaskStatus } from '@/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { withBasePath } from '@/lib/base-path'

interface ReceiveWithMeta extends Receive {
  createdBy?: {
    id: string
    name: string
    email: string
  }
  tasks?: Array<{
    id: string
    recordNumber: string
    status: TaskStatus
  }>
}

interface ReceivesClientProps {
  receives: ReceiveWithMeta[]
  canManage: boolean
}

export function ReceivesClient({ receives, canManage }: ReceivesClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    receivedFrom: '',
    subject: '',
    letterReferenceNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [closingReceive, setClosingReceive] = useState<ReceiveWithMeta | null>(
    null
  )

  const openReceives = receives.filter((receive) => receive.status !== 'CLOSED')
  const closedReceives = receives.filter((receive) => receive.status === 'CLOSED')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.receivedFrom.trim() || !form.subject.trim()) {
      toast.error('Received from and subject are required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(withBasePath('/api/receives'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedFrom: form.receivedFrom.trim(),
          subject: form.subject.trim(),
          letterReferenceNumber: form.letterReferenceNumber.trim() || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to log receive')
        setLoading(false)
        return
      }

      toast.success(`Receive #${data.receive.referenceNumber} logged`)
      setForm({ receivedFrom: '', subject: '', letterReferenceNumber: '' })
      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseReceive = async () => {
    if (!closingReceive) return

    try {
      const response = await fetch(withBasePath(`/api/receives/${closingReceive.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' satisfies ReceiveStatus }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to close receive')
        return
      }
      toast.success('Receive closed')
      setClosingReceive(null)
      router.refresh()
    } catch (error) {
      toast.error('Failed to close receive')
    }
  }

  const statusBadgeVariant = (status: ReceiveStatus) => {
    switch (status) {
      case 'OPEN':
        return 'warning'
      case 'ASSIGNED':
        return 'info'
      case 'CLOSED':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receives</h1>
          <p className="text-gray-600">
            Log incoming correspondence and assign or close them from here.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)}>
            Log Receive
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Receives</CardTitle>
        </CardHeader>
        <CardContent>
          {openReceives.length === 0 ? (
            <p className="text-gray-500 text-sm">No open receives.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">System Ref</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Letter Ref</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Received From</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Subject</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Received Date</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Created</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Linked Tasks</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {openReceives.map((receive) => (
                    <tr key={receive.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{receive.referenceNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{receive.letterReferenceNumber || <span className="text-gray-400 italic">-</span>}</td>
                      <td className="px-4 py-3 text-gray-700">{receive.receivedFrom}</td>
                      <td className="px-4 py-3 text-gray-700">{receive.subject}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(receive.receivedDate)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDateTime(receive.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(receive.status)}>
                          {receive.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {receive?.tasks && receive.tasks.length > 0 ? (
                          <div className="space-y-1">
                            {receive.tasks.map((task) => (
                              <Link
                                key={task.id}
                                href={withBasePath(`/tasks/${task.id}`)}
                                className="text-blue-600 hover:underline block"
                              >
                                {task.recordNumber} ({task.status.replace('_', ' ')})
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <Link href={withBasePath(`/tasks/new?receiveId=${receive.id}`)}>
                              <Button size="sm">
                                Assign
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setClosingReceive(receive)}
                            >
                              Close
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Closed Receives</CardTitle>
        </CardHeader>
        <CardContent>
          {closedReceives.length === 0 ? (
            <p className="text-gray-500 text-sm">No closed receives.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">System Ref</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Letter Ref</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Subject</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Received Date</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Closed At</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {closedReceives.slice(0, 10).map((receive) => (
                    <tr key={receive.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {receive.referenceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{receive.letterReferenceNumber || <span className="text-gray-400 italic">-</span>}</td>
                      <td className="px-4 py-3 text-gray-700">{receive.subject}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(receive.receivedDate)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {receive.closedAt ? formatDateTime(receive.closedAt) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">CLOSED</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={Boolean(closingReceive)}
        title="Close receive"
        message="Closing will remove this receive from the open list. Are you sure?"
        confirmText="Close"
        variant="warning"
        onConfirm={handleCloseReceive}
        onClose={() => setClosingReceive(null)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log new receive"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-gray-500">
            A system reference number will be generated automatically when you save this receive.
          </p>
          <Input
            label="Letter Reference Number"
            value={form.letterReferenceNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, letterReferenceNumber: e.target.value }))
            }
            placeholder="Enter the reference number from the letter/document (optional)"
          />
          <Input
            label="Received From"
            value={form.receivedFrom}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, receivedFrom: e.target.value }))
            }
            required
          />
          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, subject: e.target.value }))
            }
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" isLoading={loading}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

