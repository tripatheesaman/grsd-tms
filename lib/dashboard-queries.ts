import { unstable_cache } from 'next/cache'
import { prismaRead } from '@/lib/db'
import { dueTasksSubmissionOrClause } from '@/lib/due-task-where'
import { calculateDaysUntilDeadline } from '@/lib/utils'

const dashboardRevalidate = Math.max(
  5,
  parseInt(process.env.DASHBOARD_CACHE_SECONDS || '30', 10)
)

type LeadershipWatchlistRow = {
  id: string
  recordNumber: string
  descriptionOfWork: string
  assignedCompletionDate: Date
  assignedTo: { name: string } | null
  priority: { name: string; order: number } | null
  workcenter: { name: string } | null
}

type LeadershipAckQueueRow = {
  id: string
  recordNumber: string
  updatedAt: Date
  assignedTo: { name: string } | null
  priority: { name: string } | null
}

export interface LeadershipData {
  watchlist: Array<{
    id: string
    recordNumber: string
    descriptionOfWork: string
    assignedCompletionDate: Date
    assignedTo?: { name: string | null }
    priority?: { name: string | null }
    workcenter?: { name: string | null }
    daysLeft: number
  }>
  acknowledgmentQueue: Array<{
    id: string
    recordNumber: string
    updatedAt: Date
    assignedTo?: { name: string | null }
    priority?: { name: string | null }
  }>
  priorityBreakdown: Array<{ name: string; count: number }>
  workcenterLoad: Array<{ name: string; count: number }>
}

export interface ContributorData {
  myBoardTasks: any[]
  myOpenCount: number
  myDueSoonCount: number
  myCompletedWeekCount: number
  noticeCount: number
}

async function loadGlobalCounts() {
  const db = prismaRead
  const now = new Date()
  const twoDaysOut = new Date(now)
  twoDaysOut.setDate(twoDaysOut.getDate() + 2)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  return Promise.all([
    db.task.count({
      where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    }),
    db.task.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: startOfToday },
      },
    }),
    db.task.count({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        assignedCompletionDate: {
          gte: now,
          lte: twoDaysOut,
        },
      },
    }),
    db.task.count({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        assignedCompletionDate: { lt: now },
      },
    }),
    db.task.count({
      where: {
        status: 'COMPLETED',
        acknowledgedById: null,
      },
    }),
  ])
}

export const getDashboardGlobalCounts = unstable_cache(
  loadGlobalCounts,
  ['dashboard-global-counts'],
  { revalidate: dashboardRevalidate }
)

async function loadLeadershipData(): Promise<LeadershipData> {
  const db = prismaRead
  const [
    watchlistRaw,
    acknowledgmentQueueRaw,
    priorityGroupRaw,
    workcenterGroupRaw,
  ] = (await Promise.all([
    db.task.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
      include: {
        assignedTo: { select: { name: true } },
        priority: { select: { name: true, order: true } },
        workcenter: { select: { name: true } },
      },
      orderBy: { assignedCompletionDate: 'asc' },
      take: 20,
    }),
    db.task.findMany({
      where: {
        status: 'COMPLETED',
        acknowledgedById: null,
      },
      include: {
        assignedTo: { select: { name: true } },
        priority: { select: { name: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 6,
    }),
    db.task.groupBy({
      by: ['priorityId'],
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['workcenterId'],
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        workcenterId: { not: null },
      },
      _count: { _all: true },
    }),
  ])) as [
    LeadershipWatchlistRow[],
    LeadershipAckQueueRow[],
    { priorityId: string | null; _count: { _all: number } }[],
    { workcenterId: string | null; _count: { _all: number } }[],
  ]

  const priorityGroup = [...priorityGroupRaw].sort(
    (a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0)
  )
  const workcenterGroup = [...workcenterGroupRaw]
    .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
    .slice(0, 5)

  const priorityIds = priorityGroup
    .map((item) => item.priorityId)
    .filter((id): id is string => Boolean(id))
  const workcenterIds = workcenterGroup
    .map((item) => item.workcenterId)
    .filter((id): id is string => Boolean(id))

  const [priorityMeta, workcenterMeta]: [
    { id: string; name: string; order: number }[],
    { id: string; name: string }[],
  ] = await Promise.all([
    priorityIds.length
      ? db.priority.findMany({
          where: { id: { in: priorityIds } },
          select: { id: true, name: true, order: true },
        })
      : Promise.resolve([]),
    workcenterIds.length
      ? db.workcenter.findMany({
          where: { id: { in: workcenterIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ])

  const priorityLookup = new Map(priorityMeta.map((p) => [p.id, p]))
  const workcenterLookup = new Map(workcenterMeta.map((wc) => [wc.id, wc.name]))

  const priorityBreakdown = priorityGroup.map((entry) => ({
    name: entry.priorityId
      ? priorityLookup.get(entry.priorityId)?.name ?? 'Unspecified'
      : 'Unspecified',
    count: entry._count?._all ?? 0,
  }))

  const workcenterLoad = workcenterGroup.map((entry) => ({
    name: workcenterLookup.get(entry.workcenterId!) ?? 'Unassigned',
    count: entry._count?._all ?? 0,
  }))

  const watchlist = watchlistRaw
    .map((task) => ({
      id: task.id,
      recordNumber: task.recordNumber,
      descriptionOfWork: task.descriptionOfWork,
      assignedCompletionDate: task.assignedCompletionDate,
      assignedTo: task.assignedTo ? { name: task.assignedTo.name ?? null } : undefined,
      priority: task.priority ? { name: task.priority.name ?? null } : undefined,
      workcenter: task.workcenter ? { name: task.workcenter.name ?? null } : undefined,
      daysLeft: calculateDaysUntilDeadline(task.assignedCompletionDate),
    }))
    .filter((task) => task.daysLeft <= 7)
    .slice(0, 10)

  return {
    watchlist,
    acknowledgmentQueue: acknowledgmentQueueRaw.map((task) => ({
      id: task.id,
      recordNumber: task.recordNumber,
      updatedAt: task.updatedAt,
      assignedTo: task.assignedTo ? { name: task.assignedTo.name ?? null } : undefined,
      priority: task.priority ? { name: task.priority.name ?? null } : undefined,
    })),
    priorityBreakdown,
    workcenterLoad,
  }
}

export const getDashboardLeadershipData = unstable_cache(
  loadLeadershipData,
  ['dashboard-leadership'],
  { revalidate: dashboardRevalidate }
)

async function loadContributorData(userId: string): Promise<ContributorData> {
  const db = prismaRead
  const now = new Date()
  const twoDaysOut = new Date(now)
  twoDaysOut.setDate(twoDaysOut.getDate() + 2)
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [myBoardTasksData, myOpenCount, myDueSoonCount, myCompletedWeekCount, noticeCount] =
    await Promise.all([
      db.task.findMany({
        where: {
          status: { not: 'CLOSED' },
          OR: [
            { assignedToId: userId },
            {
              assignments: {
                some: { userId },
              },
            },
          ],
          AND: [dueTasksSubmissionOrClause(userId)],
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          actions: {
            select: {
              actionType: true,
              performedById: true,
            },
          },
          priority: { select: { id: true, name: true, order: true } },
        },
        orderBy: [
          { isNotice: 'desc' },
          { priority: { order: 'desc' } },
          { assignedCompletionDate: 'asc' },
        ],
        take: 8,
      }),
      db.task.count({
        where: {
          status: { in: ['ACTIVE', 'IN_PROGRESS'] },
          OR: [
            { assignedToId: userId },
            {
              assignments: {
                some: { userId },
              },
            },
          ],
          AND: [dueTasksSubmissionOrClause(userId)],
        },
      }),
      db.task.count({
        where: {
          status: { in: ['ACTIVE', 'IN_PROGRESS'] },
          assignedCompletionDate: {
            gte: now,
            lte: twoDaysOut,
          },
          OR: [
            { assignedToId: userId },
            {
              assignments: {
                some: { userId },
              },
            },
          ],
          AND: [dueTasksSubmissionOrClause(userId)],
        },
      }),
      db.task.count({
        where: {
          status: 'COMPLETED',
          assignedToId: userId,
          updatedAt: { gte: weekAgo },
        },
      }),
      db.task.count({
        where: {
          isNotice: true,
          status: { not: 'CLOSED' },
          OR: [
            { assignedToId: userId },
            {
              assignments: {
                some: { userId },
              },
            },
          ],
        },
      }),
    ])

  return {
    myBoardTasks: myBoardTasksData,
    myOpenCount,
    myDueSoonCount,
    myCompletedWeekCount,
    noticeCount,
  }
}

export function getDashboardContributorData(userId: string) {
  return unstable_cache(
    () => loadContributorData(userId),
    ['dashboard-contributor', userId],
    { revalidate: dashboardRevalidate }
  )()
}
