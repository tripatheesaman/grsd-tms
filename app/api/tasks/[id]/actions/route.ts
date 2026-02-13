import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { canCloseTask, canRevertTask, canAcknowledgeTask } from '@/lib/roles'
import { sendTaskForwardEmail, sendTaskNotificationEmail, sendTaskRejectionEmail } from '@/lib/email'
import { saveFile } from '@/lib/storage'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const currentUserRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        role: true,
        canApproveCompletions: true,
        canRevertCompletions: true,
      },
    })

    if (!currentUserRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true,
        complexity: {
          select: { id: true, name: true, order: true },
        },
        priority: {
          select: { id: true, name: true, order: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') || ''
    let actionType: string
    let description: string | null = null
    let forwardedToId: string | null = null
    let forwardedToEmail: string | null = null
    let referenceNumber: string | null = null
    let rejectionReason: string | null = null
    let file: File | null = null

    if (contentType.includes('application/json')) {
      
      const body = await request.json()
      actionType = body.actionType
      description = body.description || null
      rejectionReason = body.rejectionReason || null
    } else {
      
      const formData = await request.formData()
      actionType = formData.get('actionType') as string
      description = (formData.get('description') as string) || null
      forwardedToId = (formData.get('forwardedToId') as string) || null
      forwardedToEmail = (formData.get('forwardedToEmail') as string) || null
      referenceNumber = (formData.get('referenceNumber') as string) || null
      rejectionReason = (formData.get('rejectionReason') as string) || null
      file = (formData.get('file') as File) || null
    }

    const completionApprovalAllowed = canAcknowledgeTask(
      user.role as any,
      currentUserRecord.canApproveCompletions
    )
    const completionRevertAllowed = canRevertTask(
      user.role as any,
      currentUserRecord.canRevertCompletions
    )

    
    if (actionType === 'CLOSED' && !canCloseTask(user.role as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to close tasks' },
        { status: 403 }
      )
    }

    if (actionType === 'REVERTED' && !completionRevertAllowed) {
      return NextResponse.json(
        { error: 'You do not have permission to revert tasks' },
        { status: 403 }
      )
    }

    if (actionType === 'ACKNOWLEDGED' && !completionApprovalAllowed) {
      return NextResponse.json(
        { error: 'You do not have permission to acknowledge tasks' },
        { status: 403 }
      )
    }

    if (actionType === 'ACKNOWLEDGED' && task.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed tasks can be acknowledged' },
        { status: 400 }
      )
    }

    if (actionType === 'REJECTED' && !completionApprovalAllowed) {
      return NextResponse.json(
        { error: 'You do not have permission to reject tasks' },
        { status: 403 }
      )
    }

    if (actionType === 'REJECTED' && task.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed tasks can be rejected' },
        { status: 400 }
      )
    }

    if (actionType === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    if (actionType === 'SUBMITTED' && task.assignedToId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only submit work for tasks assigned to you' },
        { status: 403 }
      )
    }

    
    if (actionType === 'FORWARDED' && task.status === 'COMPLETED' && !task.acknowledgedById) {
      return NextResponse.json(
        { error: 'Cannot forward task that is completed and awaiting acknowledgment' },
        { status: 400 }
      )
    }

    
    let attachmentPath: string | undefined
    if (file && file.size > 0) {
      const uploadResult = await saveFile(file, file.name, 'tasks')
      if (!uploadResult.success) {
        return NextResponse.json(
          { error: uploadResult.error || 'File upload failed' },
          { status: 400 }
        )
      }
      attachmentPath = uploadResult.filepath
    }

    
    let newStatus = task.status
    let newAssignedToId = task.assignedToId
    let newExternalAssigneeName = task.externalAssigneeName || null
    let newExternalAssigneeEmail = task.externalAssigneeEmail || null

    if (actionType === 'FORWARDED') {
      
      if (forwardedToId && !forwardedToId.startsWith('external-')) {
        
        const forwardedUser = await prisma.user.findUnique({
          where: { id: forwardedToId },
        })
        if (!forwardedUser) {
          return NextResponse.json(
            { error: 'Forwarded user not found' },
            { status: 400 }
          )
        }
        newAssignedToId = forwardedToId
        newExternalAssigneeName = null
        newExternalAssigneeEmail = null
        forwardedToEmail = forwardedUser.email
      } else if (forwardedToEmail) {
        
        newAssignedToId = null
        if (emailRegex.test(forwardedToEmail)) {
          newExternalAssigneeEmail = forwardedToEmail.toLowerCase()
          newExternalAssigneeName = null
        } else {
          newExternalAssigneeName = forwardedToEmail.toUpperCase()
          newExternalAssigneeEmail = null
        }
      }

      
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_FORWARDED',
          oldValue: JSON.stringify({ assignedToId: task.assignedToId }),
          newValue: JSON.stringify({ assignedToId: newAssignedToId, forwardedToEmail }),
          changedById: user.userId,
        },
      })

      
      if (forwardedToId && !forwardedToId.startsWith('external-') && forwardedToEmail) {
        try {
          
          const currentUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true, email: true },
          })
          
          await sendTaskForwardEmail(forwardedToEmail, {
            recordNumber: task.recordNumber,
            descriptionOfWork: task.descriptionOfWork,
            priority: task.priority?.name || 'Unknown',
            complexity: task.complexity?.name || 'Unknown',
            assignedCompletionDate: task.assignedCompletionDate.toISOString(),
            forwardedByName: currentUser?.name || user.email,
            forwardedByEmail: currentUser?.email || user.email,
            description: description || undefined,
            taskId: task.id,
          })

          
          await prisma.notification.create({
            data: {
              userId: forwardedToId,
              taskId: task.id,
              type: 'TASK_FORWARDED',
              message: `Task forwarded to you: ${task.recordNumber}`,
            },
          })
        } catch (emailError) {
          logger.error('Error sending forward email', emailError)
        }
      }
    } else if (actionType === 'CLOSED') {
      newStatus = 'CLOSED'
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_CLOSED',
          oldValue: JSON.stringify({ status: task.status }),
          newValue: JSON.stringify({ status: 'CLOSED', referenceNumber }),
          changedById: user.userId,
        },
      })
    } else if (actionType === 'REVERTED') {
      newStatus = 'ACTIVE'
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_REVERTED',
          oldValue: JSON.stringify({ status: task.status }),
          newValue: JSON.stringify({ status: 'ACTIVE' }),
          changedById: user.userId,
        },
      })
    } else if (actionType === 'SUBMITTED') {
      newStatus = 'COMPLETED'
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_SUBMITTED',
          oldValue: JSON.stringify({ status: task.status }),
          newValue: JSON.stringify({ status: 'COMPLETED' }),
          changedById: user.userId,
        },
      })

      
      const directors = await prisma.user.findMany({
        where: {
          role: {
            in: ['SUPERADMIN', 'DIRECTOR', 'DY_DIRECTOR'],
          },
        },
        select: {
          id: true,
        },
      })

      for (const director of directors) {
        await prisma.notification.create({
          data: {
            userId: director.id,
            taskId: task.id,
            type: 'TASK_UPDATED',
            message: `Task completed and awaiting acknowledgment: ${task.recordNumber}`,
          },
        })
      }
    } else if (actionType === 'ACKNOWLEDGED') {
      
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_ACKNOWLEDGED',
          oldValue: JSON.stringify({ acknowledgedById: task.acknowledgedById }),
          newValue: JSON.stringify({ acknowledgedById: user.userId, acknowledgedAt: new Date() }),
          changedById: user.userId,
        },
      })
    } else if (actionType === 'REJECTED') {
      
      const lastSubmission = await prisma.taskAction.findFirst({
        where: {
          taskId: task.id,
          actionType: 'SUBMITTED',
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          performedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      
      let reassignToId: string | null = task.assignedToId
      let reassignToEmail: string | null = null
      let reassignToName: string | null = null

      if (lastSubmission?.performedBy) {
        reassignToId = lastSubmission.performedBy.id
        reassignToEmail = lastSubmission.performedBy.email
        reassignToName = lastSubmission.performedBy.name
      } else if (task.assignedTo) {
        reassignToId = task.assignedTo.id
        reassignToEmail = task.assignedTo.email
        reassignToName = task.assignedTo.name
      }

      
      newStatus = 'IN_PROGRESS'
      newAssignedToId = reassignToId
      newExternalAssigneeName = null
      newExternalAssigneeEmail = null

      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_REJECTED',
          oldValue: JSON.stringify({ 
            status: task.status, 
            assignedToId: task.assignedToId,
            acknowledgedById: task.acknowledgedById 
          }),
          newValue: JSON.stringify({ 
            status: 'IN_PROGRESS', 
            assignedToId: reassignToId,
            acknowledgedById: null,
            acknowledgedAt: null,
            rejectionReason 
          }),
          changedById: user.userId,
        },
      })

      
      if (reassignToId && reassignToEmail && reassignToName) {
        try {
          const currentUserData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true, email: true },
          })

          await sendTaskRejectionEmail(reassignToEmail, {
            recordNumber: task.recordNumber,
            descriptionOfWork: task.descriptionOfWork,
            priority: task.priority?.name || 'Unknown',
            complexity: task.complexity?.name || 'Unknown',
            assignedCompletionDate: task.assignedCompletionDate.toISOString(),
            rejectedByName: currentUserData?.name || user.email,
            rejectedByEmail: currentUserData?.email || user.email,
            rejectionReason: rejectionReason!,
            taskId: task.id,
          })

          await prisma.notification.create({
            data: {
              userId: reassignToId,
              taskId: task.id,
              type: 'TASK_UPDATED',
              message: `Task rejected: ${task.recordNumber}. Reason: ${rejectionReason}`,
            },
          })
        } catch (emailError) {
          logger.error('Error sending rejection email', emailError)
        }
      }
    }

    
    const updateData: any = {
      status: newStatus as any,
      assignedToId: newAssignedToId,
      externalAssigneeName: newExternalAssigneeName,
      externalAssigneeEmail: newExternalAssigneeEmail,
    }

    
    if (actionType === 'ACKNOWLEDGED') {
      updateData.acknowledgedById = user.userId
      updateData.acknowledgedAt = new Date()
    }

    
    if (actionType === 'REJECTED') {
      updateData.acknowledgedById = null
      updateData.acknowledgedAt = null
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    })

    
    if (attachmentPath && file) {
      await prisma.taskAttachment.create({
        data: {
          taskId: task.id,
          filename: file.name,
          filepath: attachmentPath,
          fileSize: file.size,
          mimeType: file.type,
          uploadedById: user.userId,
        },
      })
    }

    
    await prisma.taskAction.create({
      data: {
        taskId: task.id,
        actionType: actionType as any,
        description: actionType === 'REJECTED' ? rejectionReason : description,
        performedById: user.userId,
        forwardedToId,
        forwardedToEmail,
        referenceNumber,
      },
    })

    logger.info('Task action performed', {
      taskId: task.id,
      actionType,
      performedBy: user.userId,
    })

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (error) {
    logger.error('Error performing task action', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

