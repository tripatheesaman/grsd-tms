import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ComplexitiesClient } from '@/components/complexities/ComplexitiesClient'
import { UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

export default async function ComplexitiesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, canManageComplexities: true },
  })

  if (
    !currentUserData ||
    (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManageComplexities)
  ) {
    redirect(withBasePath('/dashboard'))
  }

  const complexities = await prisma.complexity.findMany({
    orderBy: { order: 'asc' },
  })

  return (
    <ComplexitiesClient
      initialComplexities={complexities}
      currentUserRole={currentUserData.role as UserRole}
      canManageComplexities={currentUserData.canManageComplexities || currentUserData.role === 'SUPERADMIN'}
    />
  )
}

