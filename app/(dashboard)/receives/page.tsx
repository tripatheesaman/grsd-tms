import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReceivesClient } from '@/components/receives/ReceivesClient'
import { withBasePath } from '@/lib/base-path'

export default async function ReceivesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      role: true,
      canManageReceives: true,
      name: true,
    },
  })

  if (
    !currentUser ||
    (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageReceives)
  ) {
    redirect(withBasePath('/dashboard'))
  }

  const receives = await prisma.receive.findMany({
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      tasks: {
        select: { id: true, recordNumber: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <ReceivesClient
      receives={receives as any}
      canManage={currentUser.role === 'SUPERADMIN' || currentUser.canManageReceives}
    />
  )
}

