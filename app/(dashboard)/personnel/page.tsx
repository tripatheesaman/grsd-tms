import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PersonnelClient } from '@/components/personnel/PersonnelClient'
import { UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

export default async function PersonnelPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, canManagePersonnel: true },
  })

  if (
    !currentUserData ||
    (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManagePersonnel)
  ) {
    redirect(withBasePath('/dashboard'))
  }

  const personnel = await prisma.assignedPersonnel.findMany({
    orderBy: { order: 'asc' },
  })

  return (
    <PersonnelClient
      initialPersonnel={personnel}
      currentUserRole={currentUserData.role as UserRole}
      canManagePersonnel={currentUserData.canManagePersonnel || currentUserData.role === 'SUPERADMIN'}
    />
  )
}

