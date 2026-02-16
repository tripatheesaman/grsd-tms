import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DatabaseClient } from '@/components/database/DatabaseClient'

export default async function DatabasePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true },
  })

  if (currentUserData?.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  
  const [userCount, taskCount, completedTaskCount, notificationCount] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.notification.count(),
  ])

  return (
    <DatabaseClient
      stats={{
        users: userCount,
        tasks: taskCount,
        completedTasks: completedTaskCount,
        notifications: notificationCount,
      }}
    />
  )
}

