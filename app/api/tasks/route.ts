import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getNextSequenceValue } from '@/lib/sequences'
import { sendTaskNotificationEmail, sendNoticeEmail } from '@/lib/email'
import { saveFile } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const recordNumber = searchParams.get('recordNumber')
    const description = searchParams.get('description')
    const assignee = searchParams.get('assignee')
    const creator = searchParams.get('creator')
    const status = searchParams.get('status')
    const priorityId = searchParams.get('priorityId')
    const assignedTo = searchParams.get('assignedTo')
    const dueDateFrom = searchParams.get('dueDateFrom')
    const dueDateTo = searchParams.get('dueDateTo')
    const createdDateFrom = searchParams.get('createdDateFrom')
    const createdDateTo = searchParams.get('createdDateTo')
    const sortBy = searchParams.get('sortBy') || 'created'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    const andConditions: any[] = []

    
    if (status) {
      andConditions.push({ status })
    }

    
    if (priorityId) {
      andConditions.push({ priorityId })
    }

    
    if (assignedTo === 'me') {
      andConditions.push({
        OR: [
          { assignedToId: user.userId },
          {
            assignments: {
              some: {
                userId: user.userId,
              },
            },
          },
        ],
      })
    } else if (assignedTo === 'unassigned') {
      andConditions.push({ assignedToId: null })
    } else if (assignedTo) {
      andConditions.push({ assignedToId: assignedTo })
    }

    
    if (recordNumber && recordNumber.trim()) {
      andConditions.push({
        recordNumber: {
          contains: recordNumber.trim(),
        },
      })
    }

    if (description && description.trim()) {
      andConditions.push({
        descriptionOfWork: {
          contains: description.trim(),
        },
      })
    }

    if (assignee && assignee.trim()) {
      const assigneeTerm = assignee.trim()
      andConditions.push({
        OR: [
          {
            assignedTo: {
              name: {
                contains: assigneeTerm,
              },
            },
          },
          {
            assignedTo: {
              email: {
                contains: assigneeTerm,
              },
            },
          },
          {
            assignments: {
              some: {
                user: {
                  OR: [
                    {
                      name: {
                        contains: assigneeTerm,
                      },
                    },
                    {
                      email: {
                        contains: assigneeTerm,
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      })
    }

    if (creator && creator.trim()) {
      const creatorTerm = creator.trim()
      andConditions.push({
        OR: [
          {
            createdBy: {
              name: {
                contains: creatorTerm,
              },
            },
          },
          {
            createdBy: {
              email: {
                contains: creatorTerm,
              },
            },
          },
        ],
      })
    }

    
    if (dueDateFrom) {
      andConditions.push({
        assignedCompletionDate: {
          gte: new Date(dueDateFrom),
        },
      })
    }

    if (dueDateTo) {
      const toDate = new Date(dueDateTo)
      toDate.setHours(23, 59, 59, 999) 
      andConditions.push({
        assignedCompletionDate: {
          lte: toDate,
        },
      })
    }

    if (createdDateFrom) {
      andConditions.push({
        createdAt: {
          gte: new Date(createdDateFrom),
        },
      })
    }

    if (createdDateTo) {
      const toDate = new Date(createdDateTo)
      toDate.setHours(23, 59, 59, 999) 
      andConditions.push({
        createdAt: {
          lte: toDate,
        },
      })
    }

    const canViewAll =
      user.role === 'SUPERADMIN' || user.role === 'DIRECTOR'

    if (!canViewAll) {
      andConditions.push({
        OR: [
          { createdById: user.userId },
          { assignedToId: user.userId },
          {
            assignments: {
              some: { userId: user.userId },
            },
          },
          {
            actions: {
              some: {
                OR: [
                  { performedById: user.userId },
                  { forwardedToId: user.userId },
                ],
              },
            },
          },
        ],
      })
    }

    
    if (andConditions.length > 0) {
      if (andConditions.length === 1) {
        Object.assign(where, andConditions[0])
      } else {
        where.AND = andConditions
      }
    }

    
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'deadline') {
      orderBy = { assignedCompletionDate: 'asc' }
    } else if (sortBy === 'priority') {
      
      orderBy = { priority: { order: 'asc' } }
    } else if (sortBy === 'created') {
      orderBy = { createdAt: 'desc' }
    } else if (sortBy === 'status') {
      orderBy = { status: 'asc' }
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
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
          complexity: {
            select: { id: true, name: true, order: true },
          },
          assignedPersonnel: {
            select: { id: true, name: true, order: true },
          },
          priority: {
            select: { id: true, name: true, order: true },
          },
          workcenter: {
            select: { id: true, name: true },
          },
          attachments: true,
          _count: {
            select: { actions: true, notifications: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ])

    
    let sortedTasks = tasks
    if (sortBy === 'priority') {
      sortedTasks = [...tasks].sort((a, b) => {
        const aOrder = (a.priority as any)?.order || 0
        const bOrder = (b.priority as any)?.order || 0
        return bOrder - aOrder 
      })
    }

    return NextResponse.json({
      tasks: sortedTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Error fetching tasks', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        canCreateTasks: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      currentUser.role !== 'SUPERADMIN' &&
      !currentUser.canCreateTasks
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to create tasks' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const issuanceMessage = formData.get('issuanceMessage') as string
    const descriptionOfWork = formData.get('descriptionOfWork') as string
    const assignedToIds = formData.get('assignedToIds') as string 
    const priorityId = formData.get('priorityId') as string
    const complexityId = formData.get('complexityId') as string
    const assignedPersonnelId = formData.get('assignedPersonnelId') as string | null
    const workcenterId = formData.get('workcenterId') as string | null
    const assignedCompletionDate = formData.get('assignedCompletionDate') as string
    const isNotice = formData.get('isNotice') === 'true'
    const receiveId = formData.get('receiveId') as string | null
    const file = formData.get('file') as File | null

    
    
    if (!descriptionOfWork || !priorityId || !complexityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    
    const priority = await prisma.priority.findUnique({
      where: { id: priorityId },
    })
    if (!priority) {
      return NextResponse.json(
        { error: 'Invalid priority selected' },
        { status: 400 }
      )
    }

    
    const complexity = await prisma.complexity.findUnique({
      where: { id: complexityId },
    })
    if (!complexity) {
      return NextResponse.json(
        { error: 'Invalid complexity selected' },
        { status: 400 }
      )
    }

    
    if (assignedPersonnelId && !isNotice) {
      const personnel = await prisma.assignedPersonnel.findUnique({
        where: { id: assignedPersonnelId },
      })
      if (!personnel) {
        return NextResponse.json(
          { error: 'Invalid assigned personnel selected' },
          { status: 400 }
        )
      }
    }

    
    if (workcenterId && !isNotice) {
      const workcenter = await prisma.workcenter.findUnique({
        where: { id: workcenterId },
      })
      if (!workcenter) {
        return NextResponse.json(
          { error: 'Invalid workcenter selected' },
          { status: 400 }
        )
      }
    }
    
    if (!isNotice && !assignedCompletionDate) {
      return NextResponse.json(
        { error: 'Completion date is required for tasks' },
        { status: 400 }
      )
    }

    type AssigneeEntry = {
      key: string
      type: 'internal' | 'external-email' | 'external-name'
      userId?: string
      email?: string
      displayName: string
    }

    const assigneeMap = new Map<string, AssigneeEntry>()
    const addInternalAssignee = (userRecord: { id: string; email: string; name: string }) => {
      const key = `internal:${userRecord.id}`
      if (assigneeMap.has(key)) return
      assigneeMap.set(key, {
        key,
        type: 'internal',
        userId: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.name || userRecord.email,
      })
    }
    const addExternalEmailAssignee = (email: string) => {
      const normalized = email.toLowerCase()
      const key = `external-email:${normalized}`
      if (assigneeMap.has(key)) return
      assigneeMap.set(key, {
        key,
        type: 'external-email',
        email: normalized,
        displayName: normalized,
      })
    }
    const addExternalNameAssignee = (label: string) => {
      const upper = label.toUpperCase()
      const key = `external-name:${upper}`
      if (assigneeMap.has(key)) return
      assigneeMap.set(key, {
        key,
        type: 'external-name',
        displayName: upper,
      })
    }

    let cachedAllStaffUsers:
      | Array<{ id: string; email: string; name: string }>
      | null = null

    if (assignedToIds) {
      try {
        const userIds = JSON.parse(assignedToIds) as string[]
        if (!Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json(
            { error: 'At least one assignee is required' },
            { status: 400 }
          )
        }

        for (const rawToken of userIds) {
          const token = rawToken.trim()
          if (!token) continue

          const lowerToken = token.toLowerCase()
          if (lowerToken === 'allstaff' || lowerToken === 'allstaff@nac.com.np') {
            if (!cachedAllStaffUsers) {
              cachedAllStaffUsers = await prisma.user.findMany({
                where: { includeInAllStaff: true },
                select: { id: true, email: true, name: true },
              })
            }
            for (const staffUser of cachedAllStaffUsers) {
              addInternalAssignee(staffUser)
            }
            continue
          }

          if (token.startsWith('external-email:')) {
            const emailValue = token.slice('external-email:'.length)
            if (emailValue) {
              addExternalEmailAssignee(emailValue)
            }
            continue
          }

          if (token.startsWith('external-name:')) {
            const labelValue = token.slice('external-name:'.length)
            if (labelValue) {
              addExternalNameAssignee(labelValue)
            }
            continue
          }

          if (token.startsWith('external-')) {
            
            const legacyValue = token.slice('external-'.length)
            if (legacyValue.includes('@')) {
              addExternalEmailAssignee(legacyValue)
            } else {
              addExternalNameAssignee(legacyValue)
            }
            continue
          }

          const assignedUser = await prisma.user.findUnique({
            where: { id: token },
            select: { id: true, email: true, name: true },
          })
          if (assignedUser) {
            addInternalAssignee(assignedUser)
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid assignees format' },
          { status: 400 }
        )
      }
    }

    let linkedReceive: { id: string; status: string } | null = null
    if (receiveId) {
      linkedReceive = await prisma.receive.findUnique({
        where: { id: receiveId },
        select: { id: true, status: true },
      })

      if (!linkedReceive) {
        return NextResponse.json(
          { error: 'Linked receive could not be found' },
          { status: 404 }
        )
      }

      if (linkedReceive.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'This receive has already been closed' },
          { status: 400 }
        )
      }
    }

    const assignees = Array.from(assigneeMap.values())

    if (assignees.length === 0) {
      return NextResponse.json(
        { error: 'At least one assignee is required' },
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

    const createdTasks: any[] = []
    const noticeGroupId = isNotice
      ? `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : null

    const createTaskForAssignee = async (
      assignee: AssigneeEntry,
      {
        status,
        isNoticeTask,
        groupId,
      }: { status: 'ACTIVE' | 'CLOSED'; isNoticeTask: boolean; groupId?: string | null }
    ) => {
      const recordNumber = (await getNextSequenceValue('TASK')).toString()
      const assignedToId = assignee.type === 'internal' ? assignee.userId! : null
      const externalName =
        assignee.type === 'external-name' ? assignee.displayName : null
      const externalEmail =
        assignee.type === 'external-email' ? assignee.email || null : null

      const task = await prisma.task.create({
        data: {
          recordNumber,
          issuanceMessage: issuanceMessage || null,
          descriptionOfWork,
          assignedToId,
          externalAssigneeName: externalName,
          externalAssigneeEmail: externalEmail,
          priorityId: priorityId,
          complexityId: complexityId,
          assignedPersonnelId: isNoticeTask ? null : (assignedPersonnelId || null),
          workcenterId: isNoticeTask ? null : (workcenterId || null),
          assignedCompletionDate: new Date(assignedCompletionDate),
          createdById: user.userId,
          status,
          isNotice: isNoticeTask,
          noticeGroupId: isNoticeTask ? groupId : null,
          receiveId: linkedReceive?.id || null,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
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
          actionType: 'CREATED',
          performedById: user.userId,
        },
      })

      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_CREATED',
          newValue: JSON.stringify({ recordNumber, status, isNotice: isNoticeTask }),
          changedById: user.userId,
        },
      })

      return task
    }

    if (isNotice) {
      
      const recordNumber = (await getNextSequenceValue('TASK')).toString()
      
      
      const internalAssignees = assignees.filter(a => a.type === 'internal')
      const externalEmailAssignees = assignees.filter(a => a.type === 'external-email')
      const externalNameAssignees = assignees.filter(a => a.type === 'external-name')
      
      
      const firstInternalAssignee = internalAssignees[0]
      const assignedToId = firstInternalAssignee?.userId || null
      
      
      const externalEmails = externalEmailAssignees
        .map(a => a.email)
        .filter((email): email is string => !!email)
        .join(', ')
      const externalNames = externalNameAssignees
        .map(a => a.displayName)
        .filter((name): name is string => !!name)
        .join(', ')
      
      
      const noticeCompletionDate = assignedCompletionDate 
        ? new Date(assignedCompletionDate)
        : new Date()
      
      
      const task = await prisma.task.create({
        data: {
          recordNumber,
          issuanceMessage: issuanceMessage || null,
          descriptionOfWork,
          assignedToId,
          externalAssigneeName: externalNames || null,
          externalAssigneeEmail: externalEmails || null,
          priorityId: priorityId,
          complexityId: complexityId,
          assignedPersonnelId: null, 
          workcenterId: null, 
          assignedCompletionDate: noticeCompletionDate,
          createdById: user.userId,
          status: 'CLOSED',
          isNotice: true,
          noticeGroupId,
          receiveId: linkedReceive?.id || null,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      
      for (const assignee of internalAssignees) {
        if (assignee.userId) {
          await prisma.taskAssignment.create({
            data: {
              taskId: task.id,
              userId: assignee.userId,
            },
          })
        }
      }

      
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
          actionType: 'CREATED',
          performedById: user.userId,
        },
      })

      
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          action: 'TASK_CREATED',
          newValue: JSON.stringify({ recordNumber, status: 'CLOSED', isNotice: true }),
          changedById: user.userId,
        },
      })

      
      for (const assignee of assignees) {
        if (assignee.email) {
          try {
            await sendNoticeEmail(assignee.email, {
              recordNumber: task.recordNumber,
              issuanceMessage: task.issuanceMessage || undefined,
              descriptionOfWork: task.descriptionOfWork,
              creatorName: currentUser.name,
              attachmentPath,
              taskId: task.id,
            })

            if (assignee.type === 'internal' && assignee.userId) {
              await prisma.notification.create({
                data: {
                  userId: assignee.userId,
                  taskId: task.id,
                  type: 'TASK_ASSIGNED',
                  message: `New notice: ${task.recordNumber}`,
                },
              })
            }
          } catch (emailError) {
            logger.error('Error sending notice email', emailError)
          }
        }
      }

      createdTasks.push(task)
    } else {
      for (const assignee of assignees) {
        const task = await createTaskForAssignee(assignee, {
          status: 'ACTIVE',
          isNoticeTask: false,
        })

        if (assignee.email) {
          try {
            await sendTaskNotificationEmail(assignee.email, {
              recordNumber: task.recordNumber,
              issuanceMessage: task.issuanceMessage || undefined,
              descriptionOfWork: task.descriptionOfWork,
              priority: task.priority?.name || 'Unknown',
              complexity: task.complexity?.name || 'Unknown',
              assignedCompletionDate: task.assignedCompletionDate.toISOString(),
              creatorName: currentUser.name,
              attachmentPath,
              taskId: task.id,
            })

            if (assignee.type === 'internal' && assignee.userId) {
              await prisma.notification.create({
                data: {
                  userId: assignee.userId,
                  taskId: task.id,
                  type: 'TASK_ASSIGNED',
                  message: `New task assigned: ${task.recordNumber}`,
                },
              })
            }
          } catch (emailError) {
            logger.error('Error sending task notification email', emailError)
          }
        }

        createdTasks.push(task)
      }
    }

    logger.info('Task(s) created successfully', {
      taskCount: createdTasks.length,
      isNotice,
      createdBy: user.userId,
    })

    if (linkedReceive && linkedReceive.status !== 'CLOSED') {
      await prisma.receive.update({
        where: { id: linkedReceive.id },
        data: { status: 'ASSIGNED' },
      })
    }

    return NextResponse.json({ 
      task: createdTasks[0], 
      tasks: createdTasks, 
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating task', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

