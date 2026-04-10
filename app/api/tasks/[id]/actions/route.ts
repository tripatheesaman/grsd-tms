import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { canCloseTask, canRevertTask, canAcknowledgeTask } from '@/lib/roles'
import { sendTaskForwardEmail, sendTaskNotificationEmail, sendTaskRejectionEmail } from '@/lib/email'
import { saveFile } from '@/lib/storage'
import { completionReviewerUserIds } from '@/lib/completion-reviewers'
import { forwardTargetDisallowedMessage } from '@/lib/forward-guards'

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
        assignments: {
          select: {
            userId: true,
            isOriginal: true,
            isCc: true,
            originalAssigneeId: true,
          },
        },
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
    let targetUserId: string | null = null
    let file: File | null = null

    if (contentType.includes('application/json')) {
      
      const body = await request.json()
      actionType = body.actionType
      description = body.description || null
      rejectionReason = body.rejectionReason || null
      targetUserId = body.targetUserId || null
    } else {
      
      const formData = await request.formData()
      actionType = formData.get('actionType') as string
      description = (formData.get('description') as string) || null
      forwardedToId = (formData.get('forwardedToId') as string) || null
      forwardedToEmail = (formData.get('forwardedToEmail') as string) || null
      referenceNumber = (formData.get('referenceNumber') as string) || null
      rejectionReason = (formData.get('rejectionReason') as string) || null
      targetUserId = (formData.get('targetUserId') as string) || null
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

    if (actionType === 'REJECTED' && !completionApprovalAllowed) {
      return NextResponse.json(
        { error: 'You do not have permission to reject tasks' },
        { status: 403 }
      )
    }

    if (actionType === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const myAssignment = task.assignments.find(
      (assignment) => assignment.userId === user.userId
    )
    const isOriginalAssignee = Boolean(myAssignment?.isOriginal)
    const isCcOnly = Boolean(myAssignment?.isCc)
    const isCurrentHandler =
      task.assignedToId === user.userId ||
      task.assignments.some((assignment) => assignment.userId === user.userId)

    if (actionType === 'SUBMITTED' && !isOriginalAssignee) {
      return NextResponse.json(
        { error: 'Only the originally assigned users can submit work for this dispatch' },
        { status: 403 }
      )
    }
    if (actionType === 'ADD_INFO' && !isCurrentHandler) {
      return NextResponse.json(
        { error: 'You can only add info if this dispatch is assigned to you' },
        { status: 403 }
      )
    }

    if (actionType === 'FORWARDED' && !isCurrentHandler) {
      return NextResponse.json(
        { error: 'You can only forward if this dispatch is assigned to you' },
        { status: 403 }
      )
    }
    if (actionType === 'FORWARDED' && task.submissionMode === 'SINGLE' && !isOriginalAssignee) {
      return NextResponse.json(
        { error: 'CC users cannot forward this same-work dispatch' },
        { status: 403 }
      )
    }
    if (actionType === 'FORWARDED' && isCcOnly) {
      return NextResponse.json(
        { error: 'CC users cannot forward dispatches' },
        { status: 403 }
      )
    }

    if ((actionType === 'ACKNOWLEDGED' || actionType === 'REJECTED') && !targetUserId) {
      return NextResponse.json(
        { error: 'Target assignee is required' },
        { status: 400 }
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
      const streamOwnerId =
        myAssignment?.originalAssigneeId ||
        (isOriginalAssignee ? user.userId : null)
      
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
        const blockMsg = forwardTargetDisallowedMessage({
          createdById: task.createdById,
          targetUserId: forwardedToId,
          targetRole: forwardedUser.role,
        })
        if (blockMsg) {
          return NextResponse.json({ error: blockMsg }, { status: 400 })
        }
        newAssignedToId = forwardedToId
        newExternalAssigneeName = null
        newExternalAssigneeEmail = null
        forwardedToEmail = forwardedUser.email
        await prisma.taskAssignment.upsert({
          where: {
            taskId_userId: {
              taskId: task.id,
              userId: forwardedToId,
            },
          },
          create: {
            taskId: task.id,
            userId: forwardedToId,
            isOriginal: false,
            isCc: false,
            originalAssigneeId: streamOwnerId,
          },
          update: {
            isCc: false,
            originalAssigneeId: streamOwnerId,
          },
        })
      } else if (forwardedToEmail) {
        
        newAssignedToId = null
        if (emailRegex.test(forwardedToEmail)) {
          const normalized = forwardedToEmail.toLowerCase()
          const internalMatch = await prisma.user.findFirst({
            where: { email: normalized },
            select: { id: true, role: true },
          })
          if (internalMatch) {
            const blockMsg = forwardTargetDisallowedMessage({
              createdById: task.createdById,
              targetUserId: internalMatch.id,
              targetRole: internalMatch.role,
            })
            if (blockMsg) {
              return NextResponse.json({ error: blockMsg }, { status: 400 })
            }
          }
          newExternalAssigneeEmail = normalized
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
      if (isCurrentHandler) {
        await prisma.taskSubmission.upsert({
          where: {
            taskId_userId: {
              taskId: task.id,
              userId: user.userId,
            },
          },
          create: {
            taskId: task.id,
            userId: user.userId,
            status: 'FORWARDED',
            submissionDescription: description,
            submittedAt: new Date(),
          },
          update: {
            status: 'FORWARDED',
            submissionDescription: description,
            submittedAt: new Date(),
          },
        })
      }

      
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
      const submission = await prisma.taskSubmission.upsert({
        where: {
          taskId_userId: {
            taskId: task.id,
            userId: user.userId,
          },
        },
        create: {
          taskId: task.id,
          userId: user.userId,
          status: 'PENDING',
        },
        update: {},
      })

      if (submission.status === 'SUBMITTED' || submission.status === 'ACKNOWLEDGED') {
        return NextResponse.json(
          {
            error:
              'You already submitted this task. Wait for director review or rejection before submitting again.',
          },
          { status: 400 }
        )
      }

      await prisma.taskSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'SUBMITTED',
          submissionDescription: description,
          attachmentFilename: file?.name || null,
          attachmentFilepath: attachmentPath || null,
          attachmentMimeType: file?.type || null,
          attachmentSize: file?.size || null,
          submittedAt: new Date(),
          rejectedAt: null,
          rejectedById: null,
          rejectionReason: null,
        },
      })

      const internalAssigneeIds = new Set<string>(
        task.assignments
          .filter((assignment) => assignment.isOriginal && !assignment.isCc)
          .map((assignment) => assignment.userId)
      )

      const allSubmissions = await prisma.taskSubmission.findMany({
        where: { taskId: task.id, userId: { in: Array.from(internalAssigneeIds) } },
        select: { userId: true, status: true },
      })
      const submittedLike = new Set(
        allSubmissions
          .filter((s) => s.status === 'SUBMITTED' || s.status === 'ACKNOWLEDGED')
          .map((s) => s.userId)
      )
      const allInternalAssigneesSubmitted = Array.from(internalAssigneeIds).every(
        (assigneeId) => submittedLike.has(assigneeId)
      )
      if (task.submissionMode === 'SINGLE') {
        newStatus = 'COMPLETED'
      } else {
        newStatus = allInternalAssigneesSubmitted ? 'COMPLETED' : 'IN_PROGRESS'
      }
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_SUBMITTED',
          oldValue: JSON.stringify({ status: task.status }),
          newValue: JSON.stringify({
            status: newStatus,
            submittedBy: user.userId,
            totalRequiredSubmissions: internalAssigneeIds.size,
            totalSubmissions: submittedLike.size,
          }),
          changedById: user.userId,
        },
      })

      const reviewerIds = await completionReviewerUserIds(prisma)
      const submitterLabel =
        (
          await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true, email: true },
          })
        )?.name ||
        user.email ||
        'Assignee'
      const fullCompletion =
        task.submissionMode === 'SINGLE' || allInternalAssigneesSubmitted
      const notifyMessage = fullCompletion
        ? `Dispatch completed and awaiting acknowledgment: ${task.recordNumber}`
        : `Dispatch ${task.recordNumber}: submission from ${submitterLabel} is ready for review.`
      const reviewerNotificationRows = reviewerIds
        .filter((reviewerId) => reviewerId !== user.userId)
        .map((reviewerId) => ({
          userId: reviewerId,
          taskId: task.id,
          type: 'TASK_UPDATED' as const,
          message: notifyMessage,
        }))
      if (reviewerNotificationRows.length > 0) {
        await prisma.notification.createMany({
          data: reviewerNotificationRows,
        })
      }
    } else if (actionType === 'ADD_INFO') {
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_INFO_ADDED',
          newValue: JSON.stringify({
            addedBy: user.userId,
          }),
          changedById: user.userId,
        },
      })
    } else if (actionType === 'ACKNOWLEDGED') {
      const targetSubmission = await prisma.taskSubmission.findUnique({
        where: {
          taskId_userId: {
            taskId: task.id,
            userId: targetUserId!,
          },
        },
      })
      if (!targetSubmission || targetSubmission.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Selected assignee has no pending submission to acknowledge' },
          { status: 400 }
        )
      }

      await prisma.taskSubmission.update({
        where: { id: targetSubmission.id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedById: user.userId,
        },
      })

      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_ACKNOWLEDGED',
          oldValue: JSON.stringify({ targetUserId, status: 'SUBMITTED' }),
          newValue: JSON.stringify({ targetUserId, status: 'ACKNOWLEDGED', acknowledgedById: user.userId, acknowledgedAt: new Date() }),
          changedById: user.userId,
        },
      })
    } else if (actionType === 'REJECTED') {
      const targetSubmission = await prisma.taskSubmission.findUnique({
        where: {
          taskId_userId: {
            taskId: task.id,
            userId: targetUserId!,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })
      if (!targetSubmission || (targetSubmission.status !== 'SUBMITTED' && targetSubmission.status !== 'ACKNOWLEDGED')) {
        return NextResponse.json(
          { error: 'Selected assignee has no submission to reject' },
          { status: 400 }
        )
      }

      await prisma.taskSubmission.update({
        where: { id: targetSubmission.id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedById: user.userId,
          rejectionReason,
          acknowledgedAt: null,
          acknowledgedById: null,
        },
      })

      newStatus = 'IN_PROGRESS'
      newAssignedToId = task.assignedToId

      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_REJECTED',
          oldValue: JSON.stringify({ 
            status: task.status,
            targetUserId,
            submissionStatus: targetSubmission.status,
          }),
          newValue: JSON.stringify({ 
            status: 'IN_PROGRESS',
            targetUserId,
            submissionStatus: 'REJECTED',
            rejectionReason 
          }),
          changedById: user.userId,
        },
      })

      if (targetSubmission.user?.id && targetSubmission.user?.email) {
        try {
          const currentUserData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true, email: true },
          })

          await sendTaskRejectionEmail(targetSubmission.user.email, {
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
              userId: targetSubmission.user.id,
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

    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    })

    
    if (attachmentPath && file && actionType !== 'SUBMITTED') {
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

