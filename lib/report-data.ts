import type { $Enums, Prisma } from '@prisma/client'

export function buildReportDateFilter(
  startDate: string | null,
  endDate: string | null
): Record<string, unknown> {
  const dateFilter: Record<string, unknown> = {}
  if (!startDate && !endDate) return dateFilter

  const and: object[] = []
  if (startDate) {
    and.push({
      OR: [
        { receive: { receivedDate: { gte: new Date(startDate) } } },
        { createdAt: { gte: new Date(startDate) } },
      ],
    })
  }
  if (endDate) {
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)
    and.push({
      OR: [
        { receive: { receivedDate: { lte: endDateTime } } },
        { createdAt: { lte: endDateTime } },
      ],
    })
  }
  dateFilter.AND = and
  return dateFilter
}

export function buildReportTaskWhere(
  reportType: string,
  dateFilter: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(reportType === 'receive-only' ? { receiveId: { not: null } } : {}),
    ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
    isNotice: false,
  }
}

const reportActionTypes: $Enums.TaskActionType[] = [
  'CREATED',
  'ASSIGNED',
  'SUBMITTED',
  'CLOSED',
]

export const reportTaskInclude = {
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
      actionType: { in: reportActionTypes },
    },
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      actionType: true,
      createdAt: true,
    },
  },
} satisfies Prisma.TaskInclude

export type ReportTaskPayload = Prisma.TaskGetPayload<{
  include: typeof reportTaskInclude
}>

export function mapTaskToReportRow(
  task: ReportTaskPayload,
  reportType: string
): Record<string, string | number | null> {
  const assignmentAction = task.actions.find(
    (a) => a.actionType === 'ASSIGNED' || a.actionType === 'CREATED'
  )
  const assignmentDate = assignmentAction?.createdAt || task.createdAt
  const completionAction = task.actions.find((a) => a.actionType === 'CLOSED')
  const completionDate = completionAction?.createdAt || null

  const daysAssigned = Math.ceil(
    (task.assignedCompletionDate.getTime() - assignmentDate.getTime()) /
      (1000 * 60 * 60 * 24)
  )
  const daysActuallyTaken = completionDate
    ? Math.ceil(
        (completionDate.getTime() - assignmentDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null
  const deviationDays =
    completionDate && daysActuallyTaken !== null
      ? daysActuallyTaken - daysAssigned
      : null
  const deviationPercentage =
    completionDate && daysAssigned > 0 && deviationDays !== null
      ? ((deviationDays / daysAssigned) * 100).toFixed(2)
      : null

  const baseRow: Record<string, string | number | null> = {}

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
}

export function formatCsvField(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function reportRowToCsvLine(
  row: Record<string, string | number | null>,
  headers: string[]
): string {
  return headers.map((h) => formatCsvField(row[h])).join(',')
}
