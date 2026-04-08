import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { dueTasksSubmissionOrClause } from '@/lib/due-task-where'
import { TaskList } from '@/components/dashboard/TaskList'

export default async function DueTasksPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tasksRaw = await prisma.task.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'IN_PROGRESS'],
      },
      OR: [
        { assignedToId: user.userId },
        {
          assignments: {
            some: { userId: user.userId },
          },
        },
      ],
      AND: [dueTasksSubmissionOrClause(user.userId)],
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

  const priorityIds = [...new Set(tasksRaw.map((t) => t.priorityId))]
  const priorityRows =
    priorityIds.length > 0
      ? await prisma.priority.findMany({
          where: { id: { in: priorityIds } },
          select: { id: true, name: true, order: true },
        })
      : []
  const priorityById = new Map(priorityRows.map((p) => [p.id, p]))

  const tasks = tasksRaw.map((t) => ({
    ...t,
    priority: priorityById.get(t.priorityId) ?? null,
  }))

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

