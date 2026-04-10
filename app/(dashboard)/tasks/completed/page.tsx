import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canViewAllTasksAndProgress } from '@/lib/task-visibility'
import { TaskList } from '@/components/dashboard/TaskList'

export default async function CompletedDispatchesPage() {
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

  const tasks = await prisma.task.findMany({
    where: orgWide
      ? {
          status: {
            in: ['COMPLETED', 'CLOSED'],
          },
        }
      : {
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
    take: orgWide ? 400 : undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {orgWide ? 'Completed & closed (organization)' : 'My Completed Dispatches'}
        </h1>
        <p className="text-gray-600 mt-1">
          {orgWide
            ? 'All completed and closed dispatches, most recently updated first.'
            : 'Dispatches you submitted or forwarded, including current progress.'}
        </p>
      </div>
      <TaskList
        tasks={tasks as any}
        title={orgWide ? 'Organization completions' : 'My Dispatch Activity'}
        emptyMessage={
          orgWide
            ? 'No completed or closed dispatches found.'
            : 'No completed or forwarded dispatches yet.'
        }
      />
    </div>
  )
}
