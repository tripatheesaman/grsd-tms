'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Complexity {
  id: string
  name: string
  order: number
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

interface ComplexitiesClientProps {
  initialComplexities: Complexity[]
  currentUserRole: string
  canManageComplexities: boolean
}

export function ComplexitiesClient({
  initialComplexities,
  currentUserRole,
  canManageComplexities,
}: ComplexitiesClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [complexities, setComplexities] = useState(initialComplexities)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingComplexity, setEditingComplexity] = useState<Complexity | null>(null)
  const [deletingComplexity, setDeletingComplexity] = useState<Complexity | null>(null)
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
      const response = await fetch('/api/complexities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create complexity.')
        return
      }

      toast.success('Complexity created successfully!')
      setComplexities((prev) => [...prev, data.complexity].sort((a, b) => a.order - b.order))
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
    if (!editingComplexity || !validateForm()) {
      toast.error('Please fill in all required fields correctly.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/complexities/${editingComplexity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update complexity.')
        return
      }

      toast.success('Complexity updated successfully!')
      setComplexities((prev) =>
        prev
          .map((c) => (c.id === editingComplexity.id ? data.complexity : c))
          .sort((a, b) => a.order - b.order)
      )
      setEditingComplexity(null)
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
    if (!deletingComplexity) return

    setLoading(true)
    try {
      const response = await fetch(`/api/complexities/${deletingComplexity.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete complexity.')
        return
      }

      toast.success('Complexity deleted successfully!')
      setComplexities((prev) => prev.filter((c) => c.id !== deletingComplexity.id))
      setIsDeleteModalOpen(false)
      setDeletingComplexity(null)
      router.refresh()
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (complexity: Complexity) => {
    setEditingComplexity(complexity)
    setFormData({
      name: complexity.name,
      order: complexity.order.toString(),
      description: complexity.description || '',
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (complexity: Complexity) => {
    setDeletingComplexity(complexity)
    setIsDeleteModalOpen(true)
  }

  const closeModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setEditingComplexity(null)
    setDeletingComplexity(null)
    setFormData({ name: '', order: '', description: '' })
    setErrors({})
  }

  
  const hasAccess = currentUserRole === 'SUPERADMIN' || canManageComplexities

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">
            You do not have permission to manage complexities.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complexity Management</h1>
          <p className="text-gray-600 mt-1">
            Manage task complexity levels (ordered from easiest to hardest)
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create New Complexity</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complexities ({complexities.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {complexities.length > 0 ? (
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
                  {complexities.map((complexity) => (
                    <tr key={complexity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {complexity.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {complexity.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {complexity.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEditModal(complexity)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(complexity)}
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
            <p className="p-6 text-center text-gray-500">No complexities found.</p>
          )}
        </CardContent>
      </Card>

      {}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Complexity"
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
            placeholder="e.g., Sand, Gravel, Rock"
          />
          <Input
            label="Order (1 = easiest, higher = harder)"
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
              Create Complexity
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
        title="Edit Complexity"
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
            label="Order (1 = easiest, higher = harder)"
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
        title="Delete Complexity"
        message={`Are you sure you want to delete "${deletingComplexity?.name}"? This action cannot be undone. Make sure no tasks are using this complexity.`}
        confirmText="Delete Complexity"
        variant="danger"
        isLoading={loading}
      />
    </div>
  )
}

