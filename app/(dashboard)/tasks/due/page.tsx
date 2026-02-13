import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TaskList } from '@/components/dashboard/TaskList'
import { withBasePath } from '@/lib/base-path'

export default async function DueTasksPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const tasks = await prisma.task.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'IN_PROGRESS'],
      },
      assignedToId: user.userId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      assignedCompletionDate: 'asc',
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Due Tasks</h1>
        <p className="text-gray-600 mt-1">
          Tasks where you are currently assigned.
        </p>
      </div>
      <TaskList
        tasks={tasks as any}
        title="My Due Tasks"
        emptyMessage="No assigned tasks found."
      />
    </div>
  )
}

