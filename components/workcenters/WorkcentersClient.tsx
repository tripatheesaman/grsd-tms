'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'

interface Workcenter {
  id: string
  name: string
  description?: string | null
  createdAt: Date
}

interface WorkcentersClientProps {
  workcenters: Workcenter[]
}

export function WorkcentersClient({ workcenters: initialWorkcenters }: WorkcentersClientProps) {
  const toast = useToast()
  const [workcenters, setWorkcenters] = useState(initialWorkcenters)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWorkcenter, setEditingWorkcenter] = useState<Workcenter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workcenter | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const openCreateModal = () => {
    setFormData({ name: '', description: '' })
    setEditingWorkcenter(null)
    setIsModalOpen(true)
  }

  const openEditModal = (workcenter: Workcenter) => {
    setFormData({
      name: workcenter.name,
      description: workcenter.description || '',
    })
    setEditingWorkcenter(workcenter)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Workcenter name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        editingWorkcenter ? `/api/workcenters/${editingWorkcenter.id}` : '/api/workcenters',
        {
          method: editingWorkcenter ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save workcenter')
        setSaving(false)
        return
      }

      if (editingWorkcenter) {
        setWorkcenters((prev) =>
          prev.map((wc) => (wc.id === editingWorkcenter.id ? data.workcenter : wc))
        )
        toast.success('Workcenter updated successfully')
      } else {
        setWorkcenters((prev) => [data.workcenter, ...prev])
        toast.success('Workcenter created successfully')
      }

      setIsModalOpen(false)
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const response = await fetch(`/api/workcenters/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete workcenter')
        setSaving(false)
        return
      }

      toast.success('Workcenter deleted successfully')
      setWorkcenters((prev) => prev.filter((wc) => wc.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workcenters</h1>
          <p className="text-gray-600 mt-1">Manage available workcenters</p>
        </div>
        <Button onClick={openCreateModal}>Create Workcenter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workcenters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No workcenters found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  workcenters.map((workcenter) => (
                    <tr key={workcenter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {workcenter.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {workcenter.description ? workcenter.description : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(workcenter.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(workcenter)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(workcenter)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWorkcenter ? 'Edit Workcenter' : 'Create Workcenter'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={handleSave}
              isLoading={saving}
              disabled={saving}
            >
              {editingWorkcenter ? 'Save Changes' : 'Create Workcenter'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Workcenter"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={saving}
        />
      )}
    </div>
  )
}

