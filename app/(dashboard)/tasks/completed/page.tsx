import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TaskList } from '@/components/dashboard/TaskList'

export default async function CompletedDispatchesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tasks = await prisma.task.findMany({
    where: {
      actions: {
        some: {
          performedById: user.userId,
          actionType: {
            in: ['SUBMITTED', 'FORWARDED'],
          },
        },
      },
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      actions: {
        select: {
          actionType: true,
          performedById: true,
        },
      },
      priority: {
        select: { id: true, name: true, order: true },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Completed Dispatches</h1>
        <p className="text-gray-600 mt-1">
          Dispatches you submitted or forwarded, including current progress.
        </p>
      </div>
      <TaskList
        tasks={tasks as any}
        title="My Dispatch Activity"
        emptyMessage="No completed or forwarded dispatches yet."
      />
    </div>
  )
}
