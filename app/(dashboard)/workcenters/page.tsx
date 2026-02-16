import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@/types'
import { WorkcentersClient } from '@/components/workcenters/WorkcentersClient'

export default async function WorkcentersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, canManageWorkcenters: true },
  })

  if (
    !currentUserData ||
    (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManageWorkcenters)
  ) {
    redirect('/dashboard')
  }

  const workcenters = await prisma.workcenter.findMany({
    orderBy: { name: 'asc' },
  })

  return <WorkcentersClient workcenters={workcenters} />
}

