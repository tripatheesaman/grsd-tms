import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { canEditTask } from '@/lib/roles'
import { sendTaskNotificationEmail } from '@/lib/email'
import type { UserRole } from '@/types'

function canEditTaskData(task: any, userRole: string): boolean {
  
  if (canEditTask(userRole as any)) {
    
    if (task.status === 'COMPLETED' && !task.acknowledgedById) {
      return false
    }
    return true
  }
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    logger.error('Error fetching task', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    const currentUserRole = currentUserData?.role as unknown as UserRole
    if (!currentUserData || !canEditTask(currentUserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      recordNumber,
      issuanceDate,
      issuanceMessage,
      descriptionOfWork,
      priorityId,
      complexityId,
      assignedPersonnelId,
      workcenterId,
      status,
      assignedCompletionDate,
      assignedToId,
    } = body

    
    const currentTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true,
        priority: {
          select: { id: true, name: true, order: true },
        },
        workcenter: {
          select: { id: true, name: true },
        },
      },
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    
    if (recordNumber && recordNumber !== currentTask.recordNumber) {
      const existingTask = await prisma.task.findUnique({
        where: { recordNumber },
      })
      if (existingTask) {
        return NextResponse.json(
          { error: 'Record number already exists' },
          { status: 400 }
        )
      }
    }

    
    const updateData: any = {}
    if (recordNumber) updateData.recordNumber = recordNumber
    if (issuanceDate) updateData.issuanceDate = new Date(issuanceDate)
    if (issuanceMessage !== undefined) updateData.issuanceMessage = issuanceMessage
    if (descriptionOfWork) updateData.descriptionOfWork = descriptionOfWork
    if (priorityId) {
      
      const priority = await prisma.priority.findUnique({
        where: { id: priorityId },
      })
      if (!priority) {
        return NextResponse.json(
          { error: 'Invalid priority selected' },
          { status: 400 }
        )
      }
      updateData.priorityId = priorityId
    }
    if (complexityId) {
      
      const complexity = await prisma.complexity.findUnique({
        where: { id: complexityId },
      })
      if (!complexity) {
        return NextResponse.json(
          { error: 'Invalid complexity selected' },
          { status: 400 }
        )
      }
      updateData.complexityId = complexityId
    }
    if (assignedPersonnelId !== undefined) {
      if (assignedPersonnelId) {
        
        const personnel = await prisma.assignedPersonnel.findUnique({
          where: { id: assignedPersonnelId },
        })
        if (!personnel) {
          return NextResponse.json(
            { error: 'Invalid assigned personnel selected' },
            { status: 400 }
          )
        }
        updateData.assignedPersonnelId = assignedPersonnelId
      } else {
        updateData.assignedPersonnelId = null
      }
    }
    if (workcenterId !== undefined) {
      if (workcenterId) {
        
        const workcenter = await prisma.workcenter.findUnique({
          where: { id: workcenterId },
        })
        if (!workcenter) {
          return NextResponse.json(
            { error: 'Invalid workcenter selected' },
            { status: 400 }
          )
        }
        updateData.workcenterId = workcenterId
      } else {
        updateData.workcenterId = null
      }
    }
    if (status) updateData.status = status
    if (assignedCompletionDate) updateData.assignedCompletionDate = new Date(assignedCompletionDate)
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId || null
    }

    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        priority: {
          select: { name: true },
        },
        complexity: {
          select: { name: true },
        },
      },
    })

    
    await prisma.taskAction.create({
      data: {
        taskId: id,
        actionType: 'EDITED',
        performedById: user.userId,
        description: `Task details updated by ${currentUserData.role}`,
      },
    })

    
    const changes: any = {}
    if (recordNumber && recordNumber !== currentTask.recordNumber) {
      changes.recordNumber = { old: currentTask.recordNumber, new: recordNumber }
    }
    if (status && status !== currentTask.status) {
      changes.status = { old: currentTask.status, new: status }
    }
    if (assignedToId !== undefined && assignedToId !== currentTask.assignedToId) {
      changes.assignedToId = { old: currentTask.assignedToId, new: assignedToId }
    }
    if (priorityId && priorityId !== currentTask.priorityId) {
      const oldPriority = currentTask.priorityId
        ? await prisma.priority.findUnique({
            where: { id: currentTask.priorityId },
            select: { name: true },
          })
        : null
      const newPriority = priorityId
        ? await prisma.priority.findUnique({
            where: { id: priorityId },
            select: { name: true },
          })
        : null
      changes.priority = {
        old: oldPriority?.name || 'Unknown',
        new: newPriority?.name || 'Unknown',
      }
    }
    if (complexityId && complexityId !== currentTask.complexityId) {
      const oldComplexity = await prisma.complexity.findUnique({
        where: { id: currentTask.complexityId },
        select: { name: true },
      })
      const newComplexity = await prisma.complexity.findUnique({
        where: { id: complexityId },
        select: { name: true },
      })
      changes.complexity = {
        old: oldComplexity?.name || currentTask.complexityId,
        new: newComplexity?.name || complexityId,
      }
    }
    if (assignedPersonnelId !== undefined && assignedPersonnelId !== currentTask.assignedPersonnelId) {
      const oldPersonnel = currentTask.assignedPersonnelId
        ? await prisma.assignedPersonnel.findUnique({
            where: { id: currentTask.assignedPersonnelId },
            select: { name: true },
          })
        : null
      const newPersonnel = assignedPersonnelId
        ? await prisma.assignedPersonnel.findUnique({
            where: { id: assignedPersonnelId },
            select: { name: true },
          })
        : null
      changes.assignedPersonnel = {
        old: oldPersonnel?.name || 'None',
        new: newPersonnel?.name || 'None',
      }
    }
    if (workcenterId !== undefined && workcenterId !== currentTask.workcenterId) {
      const oldWorkcenter = currentTask.workcenterId
        ? await prisma.workcenter.findUnique({
            where: { id: currentTask.workcenterId },
            select: { name: true },
          })
        : null
      const newWorkcenter = workcenterId
        ? await prisma.workcenter.findUnique({
            where: { id: workcenterId },
            select: { name: true },
          })
        : null
      changes.workcenter = {
        old: oldWorkcenter?.name || 'None',
        new: newWorkcenter?.name || 'None',
      }
    }

    if (Object.keys(changes).length > 0) {
      await prisma.taskHistory.create({
        data: {
          taskId: id,
          action: 'TASK_EDITED',
          oldValue: JSON.stringify(changes),
          newValue: JSON.stringify(updateData),
          changedById: user.userId,
        },
      })
    }

    
    if (assignedToId && assignedToId !== currentTask.assignedToId) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: assignedToId },
      })

      if (newAssignee) {
        try {
          await sendTaskNotificationEmail(newAssignee.email, {
            recordNumber: updatedTask.recordNumber,
            issuanceMessage: updatedTask.issuanceMessage || undefined,
            descriptionOfWork: updatedTask.descriptionOfWork,
            priority: updatedTask.priority?.name || 'Unknown',
            complexity: updatedTask.complexity?.name || 'Unknown',
            assignedCompletionDate: updatedTask.assignedCompletionDate.toISOString(),
            creatorName: updatedTask.createdBy?.name || 'System',
            taskId: updatedTask.id,
          })

          await prisma.notification.create({
            data: {
              userId: assignedToId,
              taskId: id,
              type: 'TASK_ASSIGNED',
              message: `Task reassigned to you: ${updatedTask.recordNumber}`,
            },
          })
        } catch (emailError) {
          logger.error('Error sending reassignment email', emailError)
        }
      }
    }

    logger.info('Task updated', { taskId: id, userId: user.userId })

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    logger.error('Error updating task', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    const currentUserRole = currentUserData?.role as unknown as UserRole
    if (!currentUserData || !canEditTask(currentUserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    
    await prisma.task.delete({
      where: { id },
    })

    logger.info('Task deleted', { taskId: id, userId: user.userId })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting task', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
