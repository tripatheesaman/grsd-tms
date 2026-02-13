'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { UserRole } from '@/types'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  designation?: string
  staffId?: string
  workcenterId?: string
  canCreateTasks: boolean
  canManageComplexities?: boolean
  canManagePersonnel?: boolean
  canManageWorkcenters?: boolean
  canManagePriorities?: boolean
  canManageUsers?: boolean
  canManageReceives?: boolean
  canApproveCompletions?: boolean
  canRevertCompletions?: boolean
  canViewReports?: boolean
  includeInAllStaff?: boolean
}

interface Option {
  value: string
  label: string
}

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onSuccess: () => void
  canToggleTaskCreation: boolean
  canToggleComplexityManagement: boolean
  canTogglePersonnelManagement: boolean
  canToggleWorkcenterManagement: boolean
  canTogglePriorityManagement: boolean
  canToggleUserManagement: boolean
  canToggleCompletionApproval: boolean
  canToggleReceiveManagement: boolean
  canToggleCompletionRevert: boolean
  canToggleReportAccess: boolean
  workcenters: Option[]
  canToggleAllStaff: boolean
}

export function UserEditModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  canToggleTaskCreation,
  canToggleComplexityManagement,
  canTogglePersonnelManagement,
  canToggleWorkcenterManagement,
  canTogglePriorityManagement,
  canToggleUserManagement,
  canToggleCompletionApproval,
  canToggleReceiveManagement,
  canToggleCompletionRevert,
  canToggleReportAccess,
  workcenters,
  canToggleAllStaff,
}: UserEditModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const hasWorkcenters = workcenters.length > 0
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    designation: user.designation || '',
    staffId: user.staffId || '',
    workcenterId: user.workcenterId || workcenters[0]?.value || '',
    role: user.role,
    password: '',
    canCreateTasks: user.canCreateTasks,
    canManageComplexities: user.canManageComplexities ?? false,
    canManagePersonnel: user.canManagePersonnel ?? false,
    canManageWorkcenters: user.canManageWorkcenters ?? false,
    canManagePriorities: user.canManagePriorities ?? false,
    canManageUsers: user.canManageUsers ?? false,
    canManageReceives: user.canManageReceives ?? false,
    canApproveCompletions: user.canApproveCompletions ?? false,
    canRevertCompletions: user.canRevertCompletions ?? false,
    canViewReports: user.canViewReports ?? false,
    includeInAllStaff: user.includeInAllStaff ?? true,
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user.name,
        email: user.email,
        designation: user.designation || '',
        staffId: user.staffId || '',
        workcenterId: user.workcenterId || workcenters[0]?.value || '',
        role: user.role,
        password: '',
        canCreateTasks: user.canCreateTasks,
        canManageComplexities: user.canManageComplexities ?? false,
        canManagePersonnel: user.canManagePersonnel ?? false,
        canManageWorkcenters: user.canManageWorkcenters ?? false,
        canManagePriorities: user.canManagePriorities ?? false,
        canManageUsers: user.canManageUsers ?? false,
        canManageReceives: user.canManageReceives ?? false,
        canApproveCompletions: user.canApproveCompletions ?? false,
        canRevertCompletions: user.canRevertCompletions ?? false,
        canViewReports: user.canViewReports ?? false,
        includeInAllStaff: user.includeInAllStaff ?? true,
      })
    }
  }, [isOpen, user, workcenters])

  const roleOptions = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'INCHARGE', label: 'Incharge' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'DY_DIRECTOR', label: 'Dy. Director' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'SUPERADMIN', label: 'Super Admin' },
  ]

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    setLoading(true)
    try {
    const updateData: any = {
      name: formData.name,
      email: formData.email,
      designation: formData.designation,
      staffId: formData.staffId,
      workcenterId: formData.workcenterId,
      role: formData.role,
      canCreateTasks: formData.canCreateTasks,
      canManageComplexities: formData.canManageComplexities,
      canManagePersonnel: formData.canManagePersonnel,
      canManageWorkcenters: formData.canManageWorkcenters,
      canManagePriorities: formData.canManagePriorities,
      canManageUsers: formData.canManageUsers,
      canManageReceives: formData.canManageReceives,
      canApproveCompletions: formData.canApproveCompletions,
      canRevertCompletions: formData.canRevertCompletions,
      canViewReports: formData.canViewReports,
      includeInAllStaff: formData.includeInAllStaff,
    }

      
      if (formData.password.trim()) {
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        updateData.password = formData.password
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update user')
        setLoading(false)
        return
      }

      toast.success('User updated successfully!')
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
      title="Edit User"
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
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <Input
          label="Staff ID"
          type="text"
          value={formData.staffId}
          onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
          required
        />
        <Input
          label="Designation"
          type="text"
          value={formData.designation}
          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
          required
        />
        <Select
          label="Workcenter"
          options={workcenters}
          value={formData.workcenterId}
          onChange={(e) =>
            setFormData({ ...formData, workcenterId: e.target.value })
          }
          required
          disabled={!hasWorkcenters}
        />
        <Select
          label="Role"
          options={roleOptions}
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
          required
        />
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleTaskCreation ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canCreateTasks}
            disabled={!canToggleTaskCreation}
            onChange={(e) =>
              setFormData({ ...formData, canCreateTasks: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to create and assign tasks.
            {!canToggleTaskCreation && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleComplexityManagement ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canManageComplexities}
            disabled={!canToggleComplexityManagement}
            onChange={(e) =>
              setFormData({ ...formData, canManageComplexities: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to manage complexity levels.
            {!canToggleComplexityManagement && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>

      {canTogglePersonnelManagement && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canTogglePersonnelManagement ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canManagePersonnel}
            disabled={!canTogglePersonnelManagement}
            onChange={(e) =>
              setFormData({ ...formData, canManagePersonnel: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to manage assigned personnel.
            {!canTogglePersonnelManagement && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}
      {canToggleReportAccess && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleReportAccess ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canViewReports}
            disabled={!canToggleReportAccess}
            onChange={(e) =>
              setFormData({ ...formData, canViewReports: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to access and export reports.
            {!canToggleReportAccess && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}

      {canToggleWorkcenterManagement && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleWorkcenterManagement ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canManageWorkcenters}
            disabled={!canToggleWorkcenterManagement}
            onChange={(e) =>
              setFormData({ ...formData, canManageWorkcenters: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to manage workcenters.
            {!canToggleWorkcenterManagement && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}

      {canTogglePriorityManagement && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canTogglePriorityManagement ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canManagePriorities}
            disabled={!canTogglePriorityManagement}
            onChange={(e) =>
              setFormData({ ...formData, canManagePriorities: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to manage priorities.
            {!canTogglePriorityManagement && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}

      {canToggleUserManagement && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleUserManagement ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canManageUsers}
            disabled={!canToggleUserManagement}
            onChange={(e) =>
              setFormData({ ...formData, canManageUsers: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to manage users.
            {!canToggleUserManagement && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}
      {canToggleReceiveManagement && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleReceiveManagement ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canManageReceives}
            disabled={!canToggleReceiveManagement}
            onChange={(e) =>
              setFormData({ ...formData, canManageReceives: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to manage receives.
            {!canToggleReceiveManagement && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}
      {canToggleCompletionApproval && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleCompletionApproval ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canApproveCompletions}
            disabled={!canToggleCompletionApproval}
            onChange={(e) =>
              setFormData({ ...formData, canApproveCompletions: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to approve completion requests.
            {!canToggleCompletionApproval && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}
      {canToggleCompletionRevert && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleCompletionRevert ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.canRevertCompletions}
            disabled={!canToggleCompletionRevert}
            onChange={(e) =>
              setFormData({ ...formData, canRevertCompletions: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Allow this user to revert completion back to ongoing.
            {!canToggleCompletionRevert && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}

      {canToggleAllStaff && (
        <label
          className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
            !canToggleAllStaff ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.includeInAllStaff}
            disabled={!canToggleAllStaff}
            onChange={(e) =>
              setFormData({ ...formData, includeInAllStaff: e.target.checked })
            }
          />
          <span className="text-sm text-gray-700">
            Receive all-staff notices.
            {!canToggleAllStaff && (
              <span className="block text-xs text-gray-500">
                Only superadmins can change this setting.
              </span>
            )}
          </span>
        </label>
      )}

        <Input
          label="New Password (Leave blank to keep current password)"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          minLength={6}
        />
        <div className="flex gap-3 pt-4">
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

