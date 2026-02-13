import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PrioritiesClient } from '@/components/priorities/PrioritiesClient'
import { UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

export default async function PrioritiesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, canManagePriorities: true },
  })

  if (
    !currentUserData ||
    (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManagePriorities)
  ) {
    redirect(withBasePath('/dashboard'))
  }

  const priorities = await prisma.priority.findMany({
    orderBy: { order: 'asc' },
  })

  return (
    <PrioritiesClient
      initialPriorities={priorities}
      currentUserRole={currentUserData.role as UserRole}
      canManagePriorities={currentUserData.canManagePriorities || currentUserData.role === 'SUPERADMIN'}
    />
  )
}

