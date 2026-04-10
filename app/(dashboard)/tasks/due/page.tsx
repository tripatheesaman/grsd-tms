import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { dueTasksSubmissionOrClause } from '@/lib/due-task-where'
import { canViewAllTasksAndProgress } from '@/lib/task-visibility'
import { TaskList } from '@/components/dashboard/TaskList'

export default async function DueTasksPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userRow = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      role: true,
      canViewAllSubmissions: true,
      canApproveCompletions: true,
    },
  })
  const orgWide =
    userRow !== null && canViewAllTasksAndProgress(userRow)

  const tasksRaw = await prisma.task.findMany({
    where: orgWide
      ? {
          status: {
            in: ['ACTIVE', 'IN_PROGRESS'],
          },
        }
      : {
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
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      actions: {
        select: {
          actionType: true,
          performedById: true,
        },
      },
    },
    orderBy: {
      assignedCompletionDate: 'asc',
    },
    take: orgWide ? 500 : undefined,
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
        <h1 className="text-2xl font-bold text-gray-900">
          {orgWide ? 'Due tasks (organization)' : 'Due Tasks'}
        </h1>
        <p className="text-gray-600 mt-1">
          {orgWide
            ? 'All active and in-progress dispatches sorted by deadline.'
            : 'Tasks where you are currently assigned.'}
        </p>
      </div>
      <TaskList
        tasks={tasks as any}
        title={orgWide ? 'Organization due list' : 'My Due Tasks'}
        emptyMessage={
          orgWide ? 'No active dispatches in the system.' : 'No assigned tasks found.'
        }
      />
    </div>
  )
}
