import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        role: true,
        canViewReports: true,
      },
    })

    if (
      !currentUserRecord ||
      (currentUserRecord.role !== 'SUPERADMIN' && !currentUserRecord.canViewReports)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view reports' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get('type') || 'receive-and-assign' 
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.AND = []
      if (startDate) {
        dateFilter.AND.push({
          OR: [
            { receive: { receivedDate: { gte: new Date(startDate) } } },
            { createdAt: { gte: new Date(startDate) } },
          ],
        })
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        dateFilter.AND.push({
          OR: [
            { receive: { receivedDate: { lte: endDateTime } } },
            { createdAt: { lte: endDateTime } },
          ],
        })
      }
    }

    
    const tasks = await prisma.task.findMany({
      where: {
        ...(reportType === 'receive-only' ? { receiveId: { not: null } } : {}),
        ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
        isNotice: false, 
      },
      include: {
        receive: {
          select: {
            id: true,
            referenceNumber: true,
            letterReferenceNumber: true,
            receivedFrom: true,
            subject: true,
            receivedDate: true,
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
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        actions: {
          where: {
            actionType: {
              in: ['CREATED', 'ASSIGNED', 'SUBMITTED', 'CLOSED'],
            },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            actionType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    
    const reportData = tasks.map((task) => {
      
      const assignmentAction = task.actions.find(
        (a) => a.actionType === 'ASSIGNED' || a.actionType === 'CREATED'
      )
      const assignmentDate = assignmentAction?.createdAt || task.createdAt

      
      const completionAction = task.actions.find((a) => a.actionType === 'CLOSED')
      const completionDate = completionAction?.createdAt || null

      
      const daysAssigned = Math.ceil(
        (task.assignedCompletionDate.getTime() - assignmentDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      
      const daysActuallyTaken = completionDate
        ? Math.ceil((completionDate.getTime() - assignmentDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

      
      const deviationDays = completionDate
        ? daysActuallyTaken! - daysAssigned
        : null

      
      const deviationPercentage =
        completionDate && daysAssigned > 0
          ? ((deviationDays! / daysAssigned) * 100).toFixed(2)
          : null

      
      const baseRow: any = {}

      if (reportType === 'receive-only' || reportType === 'receive-and-assign') {
        baseRow['Received From'] = task.receive?.receivedFrom || ''
        baseRow['Receive Subject'] = task.receive?.subject || ''
        baseRow['Letter Reference Number'] = task.receive?.letterReferenceNumber || ''
        baseRow['Receive Registration Number'] = task.receive?.referenceNumber || ''
        baseRow['Received Date'] = task.receive?.receivedDate
          ? new Date(task.receive.receivedDate).toLocaleDateString('en-GB')
          : ''
      }

      if (reportType === 'assign-only' || reportType === 'receive-and-assign') {
        baseRow['Task Record Number'] = task.recordNumber
        baseRow['Complexity'] = task.complexity?.name || ''
        baseRow['Priority'] = task.priority?.name || ''
        baseRow['Assigned Deadline Date'] = task.assignedCompletionDate
          ? new Date(task.assignedCompletionDate).toLocaleDateString('en-GB')
          : ''
        baseRow['Assigned Personnel'] = task.assignedPersonnel?.name || ''
        baseRow['Workcenter'] = task.workcenter?.name || ''
        baseRow['Date of Assignation'] = assignmentDate
          ? new Date(assignmentDate).toLocaleDateString('en-GB')
          : ''
        baseRow['Date of Completion'] = completionDate
          ? new Date(completionDate).toLocaleDateString('en-GB')
          : 'Not Completed'
        baseRow['Total Days Assigned'] = daysAssigned
        baseRow['Total Days Actually Taken'] = daysActuallyTaken ?? 'N/A'
        baseRow['Days Deviation'] = deviationDays !== null ? deviationDays : 'N/A'
        baseRow['Deviation Percentage'] =
          deviationPercentage !== null ? `${deviationPercentage}%` : 'N/A'
      }

      return baseRow
    })

    return NextResponse.json({
      reportType,
      data: reportData,
      totalRecords: reportData.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error generating report', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

