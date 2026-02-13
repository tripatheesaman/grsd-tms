'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { withBasePath } from '@/lib/base-path'

interface Priority {
  id: string
  name: string
  order: number
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

interface PrioritiesClientProps {
  initialPriorities: Priority[]
  currentUserRole: string
  canManagePriorities: boolean
}

export function PrioritiesClient({
  initialPriorities,
  currentUserRole,
  canManagePriorities,
}: PrioritiesClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [priorities, setPriorities] = useState(initialPriorities)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null)
  const [deletingPriority, setDeletingPriority] = useState<Priority | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    order: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.order.trim()) {
      newErrors.order = 'Order is required'
    } else {
      const orderNum = parseInt(formData.order)
      if (isNaN(orderNum) || orderNum < 1) {
        newErrors.order = 'Order must be a positive number'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(withBasePath('/api/priorities'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create priority.')
        return
      }

      toast.success('Priority created successfully!')
      setPriorities((prev) => [...prev, data.priority].sort((a, b) => a.order - b.order))
      setFormData({ name: '', order: '', description: '' })
      setIsCreateModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingPriority || !validateForm()) {
      toast.error('Please fill in all required fields correctly.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/priorities/${editingPriority.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update priority.')
        return
      }

      toast.success('Priority updated successfully!')
      setPriorities((prev) =>
        prev
          .map((p) => (p.id === editingPriority.id ? data.priority : p))
          .sort((a, b) => a.order - b.order)
      )
      setEditingPriority(null)
      setFormData({ name: '', order: '', description: '' })
      setIsEditModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingPriority) return

    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/priorities/${deletingPriority.id}`), {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete priority.')
        return
      }

      toast.success('Priority deleted successfully!')
      setPriorities((prev) => prev.filter((p) => p.id !== deletingPriority.id))
      setIsDeleteModalOpen(false)
      setDeletingPriority(null)
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (priority: Priority) => {
    setEditingPriority(priority)
    setFormData({
      name: priority.name,
      order: priority.order.toString(),
      description: priority.description || '',
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (priority: Priority) => {
    setDeletingPriority(priority)
    setIsDeleteModalOpen(true)
  }

  const closeModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setEditingPriority(null)
    setDeletingPriority(null)
    setFormData({ name: '', order: '', description: '' })
    setErrors({})
  }

  const hasAccess = currentUserRole === 'SUPERADMIN' || canManagePriorities

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">
            You do not have permission to manage priorities.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Priority Management</h1>
          <p className="text-gray-600 mt-1">
            Manage task priority levels (ordered from lowest to highest)
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create New Priority</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Priorities ({priorities.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {priorities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priorities.map((priority) => (
                    <tr key={priority.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {priority.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {priority.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {priority.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEditModal(priority)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(priority)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-center text-gray-500">No priorities found.</p>
          )}
        </CardContent>
      </Card>

      {}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Priority"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            placeholder="e.g., Normal, Urgent, Important"
          />
          <Input
            label="Order (1 = lowest, higher = higher priority)"
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: e.target.value })}
            error={errors.order}
            required
            min="1"
          />
          <Input
            label="Description (optional)"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={loading} className="flex-1">
              Create Priority
            </Button>
            <Button type="button" variant="outline" onClick={closeModals} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Priority"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />
          <Input
            label="Order (1 = lowest, higher = higher priority)"
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: e.target.value })}
            error={errors.order}
            required
            min="1"
          />
          <Input
            label="Description (optional)"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={loading} className="flex-1">
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={closeModals} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Priority"
        message={`Are you sure you want to delete "${deletingPriority?.name}"? This action cannot be undone. Make sure no tasks are using this priority.`}
        confirmText="Delete Priority"
        variant="danger"
        isLoading={loading}
      />
    </div>
  )
}

