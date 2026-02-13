'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { UserRole } from '@/types'
import { ROLE_HIERARCHY } from '@/lib/roles'
import { UserEditModal } from './UserEditModal'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  designation?: string
  staffId?: string
  workcenterId?: string
  workcenter?: {
    id: string
    name: string
  } | null
  createdAt: Date
  canCreateTasks: boolean
  canManageComplexities?: boolean
  canManagePersonnel?: boolean
  canManageWorkcenters?: boolean
  canManagePriorities?: boolean
  canManageUsers?: boolean
  canManageReceives?: boolean
  canApproveCompletions?: boolean
  canRevertCompletions?: boolean
  includeInAllStaff?: boolean
}

interface WorkcenterOption {
  id: string
  name: string
  description?: string | null
}

interface UsersClientProps {
  users: User[]
  currentUserId: string
  currentUserRole: UserRole
  assignableRoles: UserRole[]
  workcenters: WorkcenterOption[]
}

export function UsersClient({
  users: initialUsers,
  currentUserId,
  currentUserRole,
  assignableRoles,
  workcenters,
}: UsersClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [users, setUsers] = useState(initialUsers)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const getInitialFormState = () => ({
    email: '',
    name: '',
    designation: '',
    staffId: '',
    workcenterId: workcenters[0]?.id ?? '',
    password: '',
    role: (assignableRoles[0] ?? 'EMPLOYEE') as UserRole,
    sendCredentials: true,
    canCreateTasks: false,
    canManageComplexities: false,
    canManagePersonnel: false,
    canManageWorkcenters: false,
    canManagePriorities: false,
    canManageUsers: false,
    canManageReceives: false,
    canApproveCompletions: false,
    canRevertCompletions: false,
    canViewReports: false,
    includeInAllStaff: true,
  })

  const [formData, setFormData] = useState(getInitialFormState())

  const roleLabels: Record<UserRole, string> = {
    SUPERADMIN: 'Super Admin',
    DIRECTOR: 'Director',
    DY_DIRECTOR: 'Dy. Director',
    MANAGER: 'Manager',
    INCHARGE: 'Incharge',
    EMPLOYEE: 'Employee',
  }

  const roleOptions = assignableRoles.map((role) => ({
    value: role,
    label: roleLabels[role],
  }))

  const workcenterOptions = workcenters.map((wc) => ({
    value: wc.id,
    label: wc.name,
  }))

  const hasWorkcenters = workcenterOptions.length > 0

  const roleColors: Record<UserRole, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-800',
    DIRECTOR: 'bg-red-100 text-red-800',
    DY_DIRECTOR: 'bg-blue-100 text-blue-800',
    MANAGER: 'bg-indigo-100 text-indigo-800',
    INCHARGE: 'bg-amber-100 text-amber-800',
    EMPLOYEE: 'bg-gray-100 text-gray-800',
  }

  const canToggleTaskCreation = currentUserRole === 'SUPERADMIN'
  const canToggleComplexityManagement = currentUserRole === 'SUPERADMIN'
  const canTogglePersonnelManagement = currentUserRole === 'SUPERADMIN'
  const canToggleWorkcenterManagement = currentUserRole === 'SUPERADMIN'
  const canTogglePriorityManagement = currentUserRole === 'SUPERADMIN'
  const canToggleUserManagement = currentUserRole === 'SUPERADMIN'
  const canToggleCompletionApproval = currentUserRole === 'SUPERADMIN'
  const canToggleReceiveManagement = currentUserRole === 'SUPERADMIN'
  const canToggleCompletionRevert = currentUserRole === 'SUPERADMIN'
  const canToggleReportAccess = currentUserRole === 'SUPERADMIN'
  const canToggleAllStaff = currentUserRole === 'SUPERADMIN'

  type PermissionKey =
    | 'canManageComplexities'
    | 'canManagePersonnel'
    | 'canManageWorkcenters'
    | 'canManagePriorities'
    | 'canManageUsers'
    | 'canManageReceives'
    | 'canApproveCompletions'
    | 'canRevertCompletions'
    | 'canViewReports'

  const permissionConfigs: Array<{
    key: PermissionKey
    label: string
    description: string
    enabled: boolean
  }> = [
    {
      key: 'canManageComplexities',
      label: 'Manage complexities',
      description: 'Access and edit complexity catalogue.',
      enabled: canToggleComplexityManagement,
    },
    {
      key: 'canManagePersonnel',
      label: 'Manage assigned personnel',
      description: 'Maintain personnel list used in tasks.',
      enabled: canTogglePersonnelManagement,
    },
    {
      key: 'canManageWorkcenters',
      label: 'Manage workcenters',
      description: 'Add or edit workcenters for staff.',
      enabled: canToggleWorkcenterManagement,
    },
    {
      key: 'canManagePriorities',
      label: 'Manage priorities',
      description: 'Control priority catalogue for tasks.',
      enabled: canTogglePriorityManagement,
    },
    {
      key: 'canManageUsers',
      label: 'Manage users',
      description: 'Access user management module.',
      enabled: canToggleUserManagement,
    },
    {
      key: 'canManageReceives',
      label: 'Manage receives',
      description: 'Access the receives logging workspace.',
      enabled: canToggleReceiveManagement,
    },
    {
      key: 'canApproveCompletions',
      label: 'Approve completion requests',
      description: 'Review and acknowledge completed work.',
      enabled: canToggleCompletionApproval,
    },
    {
      key: 'canRevertCompletions',
      label: 'Revert completion to ongoing',
      description: 'Send completed tasks back to active status.',
      enabled: canToggleCompletionRevert,
    },
    {
      key: 'canViewReports',
      label: 'View reports',
      description: 'Access and export system reports.',
      enabled: true, 
    },
  ]

  const handlePermissionChange = (key: PermissionKey, value: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        canCreateTasks: canToggleTaskCreation ? formData.canCreateTasks : false,
        canManageComplexities: canToggleComplexityManagement
          ? formData.canManageComplexities
          : false,
        canManagePersonnel: canTogglePersonnelManagement
          ? formData.canManagePersonnel
          : false,
        canManageWorkcenters: canToggleWorkcenterManagement
          ? formData.canManageWorkcenters
          : false,
        canManagePriorities: canTogglePriorityManagement
          ? formData.canManagePriorities
          : false,
        canManageUsers: canToggleUserManagement ? formData.canManageUsers : false,
        canManageReceives: canToggleReceiveManagement
          ? formData.canManageReceives
          : false,
        canApproveCompletions: canToggleCompletionApproval
          ? formData.canApproveCompletions
          : false,
        canRevertCompletions: canToggleCompletionRevert
          ? formData.canRevertCompletions
          : false,
        includeInAllStaff: canToggleAllStaff ? formData.includeInAllStaff : true,
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create user')
        setLoading(false)
        return
      }

      toast.success('User created successfully!')
      setUsers([data.user, ...users])
      setIsModalOpen(false)
      setFormData(getInitialFormState())
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      toast.error('You cannot delete your own account')
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete user')
        setDeleting(false)
        return
      }

      toast.success('User deleted successfully!')
      setUsers(users.filter((u) => u.id !== userId))
      setDeleteConfirmUser(null)
      setDeleting(false)
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Create User</Button>
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workcenter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Creation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    All-Staff Notice
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
                {users.map((user) => {
                  const canModify =
                    ROLE_HIERARCHY[currentUserRole] >
                    ROLE_HIERARCHY[user.role]
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.staffId || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.designation || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.workcenter?.name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={roleColors[user.role]}
                          size="sm"
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            user.canCreateTasks
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }
                          size="sm"
                        >
                          {user.canCreateTasks ? 'Allowed' : 'Not allowed'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {[
                            { flag: user.canManageComplexities, label: 'Complexities' },
                            { flag: user.canManagePersonnel, label: 'Personnel' },
                            { flag: user.canManageWorkcenters, label: 'Workcenters' },
                            { flag: user.canManagePriorities, label: 'Priorities' },
                            { flag: user.canManageUsers, label: 'Users' },
                            { flag: user.canManageReceives, label: 'Receives' },
                            { flag: user.canApproveCompletions, label: 'Completion approvals' },
                            { flag: user.canRevertCompletions, label: 'Revert to ongoing' },
                          ]
                            .filter((item) => item.flag)
                            .map((item) => (
                              <Badge key={item.label} variant="info" size="sm">
                                {item.label}
                              </Badge>
                            ))}
                          {!(
                            user.canManageComplexities ||
                            user.canManagePersonnel ||
                            user.canManageWorkcenters ||
                            user.canManagePriorities ||
                            user.canManageUsers ||
                            user.canManageReceives ||
                            user.canApproveCompletions ||
                            user.canRevertCompletions
                          ) && <span className="text-xs text-gray-400">None</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            user.includeInAllStaff ?? true
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }
                          size="sm"
                        >
                          {user.includeInAllStaff ?? true
                            ? 'Included'
                            : 'Excluded'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          {canModify && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingUser(user)
                                  setIsEditModalOpen(true)
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              {user.id !== currentUserId && (
                                <button
                                  onClick={() => setDeleteConfirmUser(user)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!hasWorkcenters && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No workcenters available. Please create one before adding new users.
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormData(getInitialFormState())
        }}
        title="Create New User"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
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
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
          />
          <Select
            label="Workcenter"
            options={workcenterOptions}
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
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value as UserRole })
            }
            required
            disabled={roleOptions.length === 0 || !hasWorkcenters}
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
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-gray-700">Administrative permissions</p>
            {permissionConfigs.map(({ key, label, description, enabled }) => (
              <label
                key={key}
                className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${
                  !enabled ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={Boolean(formData[key])}
                  disabled={!enabled}
                  onChange={(e) => handlePermissionChange(key, e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  {label}
                  <span className="block text-xs text-gray-500">{description}</span>
                  {!enabled && (
                    <span className="block text-xs text-gray-500">
                      Only superadmins can change this setting.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-3 rounded-md border border-gray-200 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={formData.sendCredentials}
              onChange={(e) =>
                setFormData({ ...formData, sendCredentials: e.target.checked })
              }
            />
            <span className="text-sm text-gray-700">
              Email login credentials to the user (includes user ID, temporary password, and password change link).
            </span>
          </label>
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              isLoading={loading}
              className="flex-1"
              disabled={roleOptions.length === 0 || !hasWorkcenters}
            >
              Create User
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setFormData(getInitialFormState())
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {editingUser && (
        <UserEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingUser(null)
          }}
          user={editingUser}
          canToggleTaskCreation={canToggleTaskCreation}
          canToggleComplexityManagement={canToggleComplexityManagement}
          canTogglePersonnelManagement={canTogglePersonnelManagement}
          canToggleWorkcenterManagement={canToggleWorkcenterManagement}
          canTogglePriorityManagement={canTogglePriorityManagement}
          canToggleUserManagement={canToggleUserManagement}
          canToggleCompletionApproval={canToggleCompletionApproval}
          canToggleReceiveManagement={canToggleReceiveManagement}
          canToggleCompletionRevert={canToggleCompletionRevert}
          canToggleReportAccess={canToggleReportAccess}
          workcenters={workcenterOptions}
          canToggleAllStaff={canToggleAllStaff}
          onSuccess={() => {
            router.refresh()
          }}
        />
      )}

      {deleteConfirmUser && (
        <ConfirmModal
          isOpen={!!deleteConfirmUser}
          onClose={() => setDeleteConfirmUser(null)}
          onConfirm={() => {
            if (deleteConfirmUser) {
              handleDeleteUser(deleteConfirmUser.id)
            }
          }}
          title="Delete User"
          message={`Are you sure you want to delete user "${deleteConfirmUser?.name}" (${deleteConfirmUser?.email})? This action cannot be undone.`}
          confirmText="Delete User"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleting}
        />
      )}
    </div>
  )
}

