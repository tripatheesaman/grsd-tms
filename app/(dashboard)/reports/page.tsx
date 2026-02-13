import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReportsClient } from '@/components/reports/ReportsClient'
import { withBasePath } from '@/lib/base-path'

export default async function ReportsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(withBasePath('/login'))
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      role: true,
      canViewReports: true,
    },
  })

  if (!userData) {
    redirect(withBasePath('/login'))
  }

  if (userData.role !== 'SUPERADMIN' && !userData.canViewReports) {
    redirect(withBasePath('/dashboard'))
  }

  const earliestTask = await prisma.task.findFirst({
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const today = new Date()
  const defaultEndDate = today.toISOString().split('T')[0]
  const defaultStartDate = earliestTask
    ? earliestTask.createdAt.toISOString().split('T')[0]
    : defaultEndDate

  return (
    <ReportsClient
      defaultStartDate={defaultStartDate}
      defaultEndDate={defaultEndDate}
    />
  )
}

