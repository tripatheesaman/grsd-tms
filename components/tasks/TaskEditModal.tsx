'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/forms/RichTextEditor'
import { UserSelector } from '@/components/forms/UserSelector'
import { useToast } from '@/components/ui/Toast'
import { Task, TaskStatus } from '@/types'
import { withBasePath } from '@/lib/base-path'

interface User {
  id: string
  email: string
  name: string
}

interface TaskEditModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  onSuccess: () => void
}

export function TaskEditModal({ isOpen, onClose, task, onSuccess }: TaskEditModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [priorities, setPriorities] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [complexities, setComplexities] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [personnel, setPersonnel] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [workcenters, setWorkcenters] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    recordNumber: task.recordNumber,
    issuanceDate: new Date(task.issuanceDate).toISOString().split('T')[0],
    issuanceMessage: task.issuanceMessage || '',
    descriptionOfWork: task.descriptionOfWork,
    priorityId: task.priorityId || (task.priority as any)?.id || '',
    complexityId: task.complexityId || (task.complexity as any)?.id || '',
    assignedPersonnelId: task.assignedPersonnelId || (task.assignedPersonnel as any)?.id || '',
    workcenterId: task.workcenterId || (task.workcenter as any)?.id || '',
    status: task.status,
    assignedCompletionDate: new Date(task.assignedCompletionDate).toISOString().split('T')[0],
  })
  const [selectedUsers, setSelectedUsers] = useState<User[]>(
    task.assignedTo ? [{ id: task.assignedToId!, email: task.assignedTo.email, name: task.assignedTo.name }] : []
  )

  useEffect(() => {
    const fetchPriorities = async () => {
      try {
        const response = await fetch(withBasePath('/api/priorities'))
        if (response.ok) {
          const data = await response.json()
          if (data.priorities) {
            setPriorities(data.priorities)
          }
        }
      } catch (error) {
        console.error('Failed to fetch priorities', error)
      }
    }
    const fetchComplexities = async () => {
      try {
        const response = await fetch(withBasePath('/api/complexities'))
        if (response.ok) {
          const data = await response.json()
          if (data.complexities) {
            setComplexities(data.complexities)
          }
        }
      } catch (error) {
        console.error('Failed to fetch complexities', error)
      }
    }
    const fetchPersonnel = async () => {
      try {
        const response = await fetch(withBasePath('/api/personnel'))
        if (response.ok) {
          const data = await response.json()
          if (data.personnel) {
            setPersonnel(data.personnel)
          }
        }
      } catch (error) {
        console.error('Failed to fetch assigned personnel', error)
      }
    }
    const fetchWorkcenters = async () => {
      try {
        const response = await fetch(withBasePath('/api/workcenters'))
        if (response.ok) {
          const data = await response.json()
          if (data.workcenters) {
            setWorkcenters(data.workcenters)
          }
        }
      } catch (error) {
        console.error('Failed to fetch workcenters', error)
      }
    }
    fetchPriorities()
    fetchComplexities()
    fetchPersonnel()
    fetchWorkcenters()
  }, [])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        recordNumber: task.recordNumber,
        issuanceDate: new Date(task.issuanceDate).toISOString().split('T')[0],
        issuanceMessage: task.issuanceMessage || '',
        descriptionOfWork: task.descriptionOfWork,
        priorityId: task.priorityId || (task.priority as any)?.id || '',
        complexityId: task.complexityId || (task.complexity as any)?.id || '',
        assignedPersonnelId: task.assignedPersonnelId || (task.assignedPersonnel as any)?.id || '',
        workcenterId: task.workcenterId || (task.workcenter as any)?.id || '',
        status: task.status,
        assignedCompletionDate: new Date(task.assignedCompletionDate).toISOString().split('T')[0],
      })
      setSelectedUsers(
        task.assignedTo ? [{ id: task.assignedToId!, email: task.assignedTo.email, name: task.assignedTo.name }] : []
      )
    }
  }, [isOpen, task])

  const handleSubmit = async () => {
    if (!formData.recordNumber.trim()) {
      toast.error('Record number is required')
      return
    }
    if (!formData.descriptionOfWork.trim()) {
      toast.error('Description of work is required')
      return
    }
    if (!formData.assignedCompletionDate) {
      toast.error('Assigned completion date is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/tasks/${task.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          priorityId: formData.priorityId,
          complexityId: formData.complexityId,
          assignedPersonnelId: formData.assignedPersonnelId || null,
          workcenterId: formData.workcenterId || null,
          assignedToId: selectedUsers.length > 0 ? selectedUsers[0].id : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update task')
        setLoading(false)
        return
      }

      toast.success('Task updated successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      size="xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Record Number"
            value={formData.recordNumber}
            onChange={(e) => setFormData({ ...formData, recordNumber: e.target.value })}
            required
          />
          <Input
            label="Issuance Date"
            type="date"
            value={formData.issuanceDate}
            onChange={(e) => setFormData({ ...formData, issuanceDate: e.target.value })}
            required
          />
        </div>

        <RichTextEditor
          label="Issuance Message (Optional)"
          value={formData.issuanceMessage}
          onChange={(value) => setFormData({ ...formData, issuanceMessage: value })}
          placeholder="Enter issuance message..."
        />

        <RichTextEditor
          label="Description of Work"
          value={formData.descriptionOfWork}
          onChange={(value) => setFormData({ ...formData, descriptionOfWork: value })}
          placeholder="Enter description of work..."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={formData.priorityId}
            onChange={(e) => setFormData({ ...formData, priorityId: e.target.value })}
            required
            options={priorities
              .sort((a, b) => a.order - b.order)
              .map((p) => ({ value: p.id, label: p.name }))}
            disabled={priorities.length === 0}
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
            required
          >
            <option value="ACTIVE">Active</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Complexity"
            value={formData.complexityId}
            onChange={(e) => setFormData({ ...formData, complexityId: e.target.value })}
            required
            options={complexities
              .sort((a, b) => a.order - b.order)
              .map((c) => ({ value: c.id, label: c.name }))}
            disabled={complexities.length === 0}
          />

          <Select
            label="Assigned Personnel"
            value={formData.assignedPersonnelId}
            onChange={(e) => setFormData({ ...formData, assignedPersonnelId: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...personnel
                .sort((a, b) => a.order - b.order)
                .map((p) => ({ value: p.id, label: p.name })),
            ]}
            disabled={personnel.length === 0}
          />
        </div>

        {!task.isNotice && (
          <div>
            <Select
              label="Workcenter"
              value={formData.workcenterId}
              onChange={(e) => setFormData({ ...formData, workcenterId: e.target.value })}
              options={[
                { value: '', label: 'None' },
                ...workcenters.map((w) => ({ value: w.id, label: w.name })),
              ]}
              disabled={workcenters.length === 0}
            />
          </div>
        )}

        <UserSelector
          label="Assigned To"
          selectedUsers={selectedUsers}
          onUsersChange={setSelectedUsers}
          allowExternal={false}
        />

        <Input
          label="Assigned Completion Date"
          type="date"
          value={formData.assignedCompletionDate}
          onChange={(e) => setFormData({ ...formData, assignedCompletionDate: e.target.value })}
          required
        />

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            isLoading={loading}
            disabled={loading}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

