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
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
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
    },
  })

  if (!currentUser) {
    notFound()
  }

  const canViewAll =
    currentUser.role === 'SUPERADMIN' ||
    currentUser.role === 'DIRECTOR' ||
    task.assignedToId === currentUser.id

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
            (action: any) => action.createdAt <= visibleUntil
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
    }
  }

  return (
    <TaskDetailsClient
      task={filteredTask as any}
      currentUser={currentUser as any}
    />
  )
}

