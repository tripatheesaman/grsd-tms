'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { RichTextEditor } from '@/components/forms/RichTextEditor'
import { UserSelector } from '@/components/forms/UserSelector'
import { FileUpload } from '@/components/forms/FileUpload'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { canCloseTask, canRevertTask, canEditTask, canAcknowledgeTask } from '@/lib/roles'
import { Task, UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

interface TaskActionsProps {
  task: Task & {
    acknowledgedById?: string | null
    acknowledgedAt?: Date | null
  }
  currentUser: {
    id: string
    role: UserRole
    canApproveCompletions?: boolean
    canRevertCompletions?: boolean
  }
}

interface User {
  id: string
  email: string
  name: string
}

export function TaskActions({ task, currentUser }: TaskActionsProps) {
  const router = useRouter()
  const toast = useToast()
  const [actionModal, setActionModal] = useState<'submit' | 'forward' | 'close' | 'reject' | null>(null)
  const [confirmModal, setConfirmModal] = useState<'revert' | 'acknowledge' | null>(null)
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const isAssignedToMe = task.assignedToId === currentUser.id
  const canClose = canCloseTask(currentUser.role)
  const canRevert =
    canRevertTask(currentUser.role, currentUser.canRevertCompletions) &&
    task.status === 'COMPLETED'
  const canEdit = canEditTask(currentUser.role)
  const hasCompletionApproval = canAcknowledgeTask(
    currentUser.role,
    currentUser.canApproveCompletions
  )
  const canAcknowledge =
    hasCompletionApproval && task.status === 'COMPLETED' && !task.acknowledgedById
  const canReject =
    hasCompletionApproval && task.status === 'COMPLETED' && !task.acknowledgedById

  const handleSubmit = async () => {
    if (!description.trim() && !selectedFile) {
      toast.error('Please provide a description or upload a file')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('actionType', 'SUBMITTED')
      formData.append('description', description)
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const response = await fetch(withBasePath(`/api/tasks/${task.id}/actions`), {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to submit work')
        setLoading(false)
        return
      }

      toast.success('Work submitted successfully!')
      setActionModal(null)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleForward = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to forward to')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('actionType', 'FORWARDED')
      formData.append('description', description)
      const user = selectedUsers[0]
      if (user.id.startsWith('external-email:')) {
        formData.append('forwardedToEmail', user.email)
      } else if (user.id.startsWith('external-name:')) {
        formData.append('forwardedToEmail', user.name)
      } else if (user.id.startsWith('external-')) {
        formData.append('forwardedToEmail', user.email || user.name)
      } else {
        formData.append('forwardedToId', user.id)
      }
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const response = await fetch(withBasePath(`/api/tasks/${task.id}/actions`), {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to forward task')
        setLoading(false)
        return
      }

      toast.success('Task forwarded successfully!')
      setActionModal(null)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = async () => {
    if (!referenceNumber.trim()) {
      toast.error('Reference number is required')
      return
    }

    if (!description.trim()) {
      toast.error('Description is required')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('actionType', 'CLOSED')
      formData.append('description', description)
      formData.append('referenceNumber', referenceNumber)
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const response = await fetch(withBasePath(`/api/tasks/${task.id}/actions`), {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to close task')
        setLoading(false)
        return
      }

      toast.success('Task closed successfully!')
      setActionModal(null)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleRevert = async () => {
    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/tasks/${task.id}/actions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'REVERTED',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to revert task')
        setLoading(false)
        return
      }

      toast.success('Task reverted successfully!')
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleAcknowledge = async () => {
    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/tasks/${task.id}/actions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'ACKNOWLEDGED',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to acknowledge task')
        setLoading(false)
        return
      }

      toast.success('Task acknowledged successfully!')
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/tasks/${task.id}/actions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to reject task')
        setLoading(false)
        return
      }

      toast.success('Task rejected successfully! The assignee has been notified.')
      setActionModal(null)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDescription('')
    setSelectedUsers([])
    setSelectedFile(null)
    setReferenceNumber('')
    setRejectionReason('')
    setLoading(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAssignedToMe && task.status !== 'CLOSED' && task.status !== 'COMPLETED' && (
            <>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setActionModal('submit')}
              >
                Submit Work
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActionModal('forward')}
              >
                Forward Task
              </Button>
            </>
          )}

          {task.status === 'COMPLETED' && !task.acknowledgedById && (
            <p className="text-sm text-yellow-600 text-center py-2 font-medium">
              ⏳ Task completed. Awaiting acknowledgment from director. No changes allowed.
            </p>
          )}

          {canClose && task.status !== 'CLOSED' && (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setActionModal('close')}
            >
              Close Task
            </Button>
          )}

          {canAcknowledge && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setConfirmModal('acknowledge')}
            >
              Acknowledge Completion
            </Button>
          )}

          {canRevert && task.acknowledgedById && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirmModal('revert')}
            >
              Revert to Ongoing
            </Button>
          )}

          {task.status === 'CLOSED' && (
            <p className="text-sm text-gray-500 text-center py-2">
              This task has been closed
            </p>
          )}

          {task.status === 'COMPLETED' && !task.acknowledgedById && (
            <p className="text-sm text-yellow-600 text-center py-2 font-medium">
              ⏳ Awaiting acknowledgment from director
            </p>
          )}

          {task.status === 'COMPLETED' && task.acknowledgedById && (
            <p className="text-sm text-green-600 text-center py-2 font-medium">
              ✓ Acknowledged by director
            </p>
          )}
        </CardContent>
      </Card>

      {}
      <Modal
        isOpen={actionModal === 'submit'}
        onClose={() => {
          setActionModal(null)
          resetForm()
        }}
        title="Submit Work"
        size="lg"
      >
        <div className="space-y-4">
          <RichTextEditor
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Describe the work completed..."
          />
          <FileUpload
            label="Attachment (Optional)"
            onFileSelect={setSelectedFile}
          />
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={loading}
              disabled={loading}
              className="flex-1"
            >
              Submit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActionModal(null)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        isOpen={actionModal === 'forward'}
        onClose={() => {
          setActionModal(null)
          resetForm()
        }}
        title="Forward Task"
        size="lg"
      >
        <div className="space-y-4">
          <UserSelector
            label="Forward To"
            selectedUsers={selectedUsers}
            onUsersChange={setSelectedUsers}
            allowExternal={true}
          />
          <RichTextEditor
            label="Description (Optional)"
            value={description}
            onChange={setDescription}
            placeholder="Add a note about forwarding..."
          />
          <FileUpload
            label="Attachment (Optional)"
            onFileSelect={setSelectedFile}
          />
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleForward}
              isLoading={loading}
              disabled={loading}
              className="flex-1"
            >
              Forward
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActionModal(null)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        isOpen={actionModal === 'close'}
        onClose={() => {
          setActionModal(null)
          resetForm()
        }}
        title="Close Task"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Reference Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Enter reference number"
            required
          />
          <RichTextEditor
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Describe how the work was completed..."
          />
          <FileUpload
            label="Attachment (Optional)"
            onFileSelect={setSelectedFile}
          />
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleClose}
              isLoading={loading}
              disabled={loading}
              variant="danger"
              className="flex-1"
            >
              Close Task
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActionModal(null)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        isOpen={actionModal === 'reject'}
        onClose={() => {
          setActionModal(null)
          resetForm()
        }}
        title="Reject Task Completion"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              <strong>Warning:</strong> Rejecting this task will:
            </p>
            <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
              <li>Send an email notification to the assignee</li>
              <li>Reassign the task back to the assignee</li>
              <li>Change the task status to "In Progress"</li>
              <li>Clear the acknowledgment status</li>
            </ul>
          </div>
          <RichTextEditor
            label="Rejection Reason"
            value={rejectionReason}
            onChange={setRejectionReason}
            placeholder="Please provide a detailed reason for rejecting this task completion..."
          />
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleReject}
              isLoading={loading}
              disabled={loading || !rejectionReason.trim()}
              variant="danger"
              className="flex-1"
            >
              Reject Task
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActionModal(null)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <ConfirmModal
        isOpen={confirmModal === 'revert'}
        onClose={() => setConfirmModal(null)}
        onConfirm={async () => {
          setConfirmModal(null)
          await handleRevert()
        }}
        title="Revert Task to Ongoing"
        message="Are you sure you want to revert this task to ongoing status? This will change the task status from Completed back to Active."
        confirmText="Revert Task"
        variant="warning"
        isLoading={loading}
      />

      {}
      <ConfirmModal
        isOpen={confirmModal === 'acknowledge'}
        onClose={() => setConfirmModal(null)}
        onConfirm={async () => {
          setConfirmModal(null)
          await handleAcknowledge()
        }}
        title="Acknowledge Task Completion"
        message="Are you sure you want to acknowledge this completed task? This confirms that the work has been reviewed and accepted."
        confirmText="Acknowledge"
        variant="primary"
        isLoading={loading}
      />
    </>
  )
}

