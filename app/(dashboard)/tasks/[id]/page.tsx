import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TaskDetailsClient } from '@/components/tasks/TaskDetailsClient'

export default async function TaskDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    notFound()
  }

  const { id } = await params

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      assignments: {
        select: {
          userId: true,
          isOriginal: true,
          isCc: true,
          originalAssigneeId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      submissions: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          acknowledgedBy: {
            select: { id: true, name: true, email: true },
          },
          rejectedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
      acknowledgedBy: {
        select: { id: true, name: true, email: true },
      },
      attachments: {
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      actions: {
        include: {
          performedBy: {
            select: { id: true, name: true, email: true },
          },
          forwardedTo: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      history: {
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      receive: {
        select: {
          id: true,
          referenceNumber: true,
          receivedFrom: true,
          subject: true,
          status: true,
        },
      },
      priority: {
        select: { id: true, name: true, order: true },
      },
      complexity: {
        select: { id: true, name: true, order: true },
      },
      assignedPersonnel: {
        select: { id: true, name: true, order: true },
      },
      workcenter: {
        select: { id: true, name: true },
      },
    },
  })

  if (!task) {
    notFound()
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      role: true,
      canCreateTasks: true,
      canApproveCompletions: true,
      canRevertCompletions: true,
      canViewAllSubmissions: true,
    },
  })

  if (!currentUser) {
    notFound()
  }

  const superadmins = await prisma.user.findMany({
    where: { role: 'SUPERADMIN' },
    select: { id: true, email: true },
  })
  const forwardBlockUserIds = [
    ...new Set([task.createdById, ...superadmins.map((u) => u.id)]),
  ]
  const forwardBlockEmails = [
    ...new Set(
      [task.createdBy?.email, ...superadmins.map((u) => u.email)]
        .filter((e): e is string => Boolean(e))
        .map((e) => e.toLowerCase())
    ),
  ]

  const canViewAll =
    currentUser.role === 'SUPERADMIN' ||
    currentUser.role === 'DIRECTOR' ||
    currentUser.canViewAllSubmissions === true ||
    task.assignedToId === currentUser.id ||
    task.assignments.some((assignment: any) => assignment.userId === currentUser.id)

  let filteredTask = task

  if (!canViewAll) {
    const timestamps: Date[] = []
    const userId = currentUser.id

    task.actions.forEach((action: any) => {
      if (action.performedById === userId || action.forwardedToId === userId) {
        timestamps.push(action.createdAt)
      }
    })

    task.attachments.forEach((attachment: any) => {
      if (attachment.uploadedById === userId) {
        timestamps.push(attachment.createdAt)
      }
    })

    task.history.forEach((entry: any) => {
      if (entry.changedById === userId) {
        timestamps.push(entry.createdAt)
      }
    })

    task.assignments.forEach((assignment: any) => {
      if (assignment.userId === userId) {
        timestamps.push(assignment.createdAt)
      }
    })

    if (task.createdById === userId) {
      timestamps.push(task.createdAt)
    }

    const visibleUntil =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps.map((date) => date.getTime())))
        : null

    filteredTask = {
      ...task,
      attachments: visibleUntil
        ? task.attachments.filter(
            (attachment: any) => attachment.createdAt <= visibleUntil
          )
        : [],
      actions: visibleUntil
        ? task.actions.filter(
            (action: any) =>
              action.createdAt <= visibleUntil &&
              (action.performedById === userId || action.forwardedToId === userId)
          )
        : [],
      history: visibleUntil
        ? task.history.filter((entry: any) => entry.createdAt <= visibleUntil)
        : [],
      assignments: visibleUntil
        ? task.assignments.filter(
            (assignment: any) => assignment.createdAt <= visibleUntil
          )
        : [],
      submissions: task.submissions.filter(
        (submission: any) => submission.userId === userId
      ),
    }
  }

  return (
    <TaskDetailsClient
      task={filteredTask as any}
      currentUser={currentUser as any}
      forwardBlockUserIds={forwardBlockUserIds}
      forwardBlockEmails={forwardBlockEmails}
    />
  )
}

