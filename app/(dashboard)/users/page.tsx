import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UsersClient } from '@/components/users/UsersClient'
import {
  canManageUsers,
  getVisibleRoles,
  getAssignableRoles,
} from '@/lib/roles'
import type { UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

export default async function UsersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true },
  })

  if (
    !currentUserData ||
    !canManageUsers(currentUserData.role as UserRole)
  ) {
    redirect(withBasePath('/dashboard'))
  }

  const visibleRoles = getVisibleRoles(currentUserData.role as UserRole)
  const assignableRoles = getAssignableRoles(currentUserData.role as UserRole)

  const prismaUsers = await prisma.user.findMany({
    where: {
      role: {
        in: visibleRoles as any,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      designation: true,
      staffId: true,
      workcenterId: true,
      workcenter: {
        select: { id: true, name: true },
      },
      createdAt: true,
      canCreateTasks: true,
      canManageComplexities: true,
      canManagePersonnel: true,
      canManageWorkcenters: true,
      canManagePriorities: true,
      canManageUsers: true,
      canManageReceives: true,
      canApproveCompletions: true,
      canRevertCompletions: true,
      includeInAllStaff: true,
    },
    orderBy: { createdAt: 'desc' },
  } as any)

  const users = prismaUsers.map((u: any) => ({
    ...u,
    role: u.role as UserRole,
    canCreateTasks: u.canCreateTasks ?? false,
    canManageReceives: u.canManageReceives ?? false,
    canApproveCompletions: u.canApproveCompletions ?? false,
    canRevertCompletions: u.canRevertCompletions ?? false,
    canManageUsers: u.canManageUsers ?? false,
    canManageComplexities: u.canManageComplexities ?? false,
    canManagePersonnel: u.canManagePersonnel ?? false,
    canManageWorkcenters: u.canManageWorkcenters ?? false,
    canManagePriorities: u.canManagePriorities ?? false,
    includeInAllStaff: u.includeInAllStaff ?? true,
  }))

  const workcenters = await prisma.workcenter.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  })

  return (
    <UsersClient
      users={users as any}
      currentUserId={user.userId}
      currentUserRole={currentUserData.role as UserRole}
      assignableRoles={assignableRoles}
      workcenters={workcenters}
    />
  )
}

