'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Personnel {
  id: string
  name: string
  order: number
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

interface PersonnelClientProps {
  initialPersonnel: Personnel[]
  currentUserRole: string
  canManagePersonnel: boolean
}

export function PersonnelClient({
  initialPersonnel,
  currentUserRole,
  canManagePersonnel,
}: PersonnelClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [personnel, setPersonnel] = useState(initialPersonnel)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null)
  const [deletingPersonnel, setDeletingPersonnel] = useState<Personnel | null>(null)
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
      const response = await fetch('/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create assigned personnel.')
        return
      }

      toast.success('Assigned personnel created successfully!')
      setPersonnel((prev) => [...prev, data.personnel].sort((a, b) => a.order - b.order))
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
    if (!editingPersonnel || !validateForm()) {
      toast.error('Please fill in all required fields correctly.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/personnel/${editingPersonnel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update assigned personnel.')
        return
      }

      toast.success('Assigned personnel updated successfully!')
      setPersonnel((prev) =>
        prev
          .map((p) => (p.id === editingPersonnel.id ? data.personnel : p))
          .sort((a, b) => a.order - b.order)
      )
      setEditingPersonnel(null)
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
    if (!deletingPersonnel) return

    setLoading(true)
    try {
      const response = await fetch(`/api/personnel/${deletingPersonnel.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete assigned personnel.')
        return
      }

      toast.success('Assigned personnel deleted successfully!')
      setPersonnel((prev) => prev.filter((p) => p.id !== deletingPersonnel.id))
      setIsDeleteModalOpen(false)
      setDeletingPersonnel(null)
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (personnelItem: Personnel) => {
    setEditingPersonnel(personnelItem)
    setFormData({
      name: personnelItem.name,
      order: personnelItem.order.toString(),
      description: personnelItem.description || '',
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (personnelItem: Personnel) => {
    setDeletingPersonnel(personnelItem)
    setIsDeleteModalOpen(true)
  }

  const closeModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setEditingPersonnel(null)
    setDeletingPersonnel(null)
    setFormData({ name: '', order: '', description: '' })
    setErrors({})
  }

  
  const hasAccess = currentUserRole === 'SUPERADMIN' || canManagePersonnel

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">
            You do not have permission to manage assigned personnel.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assigned Personnel Management</h1>
          <p className="text-gray-600 mt-1">
            Manage assigned personnel designations (ordered from highest to lowest)
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create New Personnel</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Personnel ({personnel.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {personnel.length > 0 ? (
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
                  {personnel.map((personnelItem) => (
                    <tr key={personnelItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {personnelItem.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {personnelItem.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {personnelItem.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEditModal(personnelItem)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(personnelItem)}
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
            <p className="p-6 text-center text-gray-500">No assigned personnel found.</p>
          )}
        </CardContent>
      </Card>

      {}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Assigned Personnel"
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
            placeholder="e.g., Dy. Director, Manager"
          />
          <Input
            label="Order (1 = highest, higher = lower)"
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
              Create Personnel
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
        title="Edit Assigned Personnel"
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
            label="Order (1 = highest, higher = lower)"
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
        title="Delete Assigned Personnel"
        message={`Are you sure you want to delete "${deletingPersonnel?.name}"? This action cannot be undone. Make sure no tasks are using this personnel.`}
        confirmText="Delete Personnel"
        variant="danger"
        isLoading={loading}
      />
    </div>
  )
}

