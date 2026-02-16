import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { NotificationPanel } from '@/components/dashboard/NotificationPanel'
import { TaskList } from '@/components/dashboard/TaskList'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateDaysUntilDeadline, formatDate, stripHtml, truncateText } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

interface LeadershipData {
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

interface ContributorData {
  myBoardTasks: any[]
  myOpenCount: number
  myDueSoonCount: number
  myCompletedWeekCount: number
  noticeCount: number
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, canCreateTasks: true, name: true },
  })

  if (!userRecord) {
    return null
  }

  const userRole = userRecord.role as UserRole
  const isLeadership =
    userRole === 'SUPERADMIN' || userRole === 'DIRECTOR' || userRole === 'DY_DIRECTOR'
  const canCreateTasks = userRole === 'SUPERADMIN' || userRecord.canCreateTasks

  const now = new Date()
  const twoDaysOut = new Date(now)
  twoDaysOut.setDate(twoDaysOut.getDate() + 2)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [activeCount, completedTodayCount, dueSoonCount, overdueCount, ackPendingCount] =
    await Promise.all([
      prisma.task.count({
        where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
      }),
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: startOfToday },
        },
      }),
      prisma.task.count({
        where: {
          status: { in: ['ACTIVE', 'IN_PROGRESS'] },
          assignedCompletionDate: {
            gte: now,
            lte: twoDaysOut,
          },
        },
      }),
      prisma.task.count({
        where: {
          status: { in: ['ACTIVE', 'IN_PROGRESS'] },
          assignedCompletionDate: { lt: now },
        },
      }),
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          acknowledgedById: null,
        },
      }),
    ])

  let leadershipData: LeadershipData | null = null
  let contributorData: ContributorData | null = null

  if (isLeadership) {
    const [
      watchlistRaw,
      acknowledgmentQueueRaw,
      priorityGroupRaw,
      workcenterGroupRaw,
    ] =
      await Promise.all([
        prisma.task.findMany({
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
        prisma.task.findMany({
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
        prisma.task.groupBy({
          by: ['priorityId'],
          where: {
            status: { in: ['ACTIVE', 'IN_PROGRESS'] },
          },
          _count: { _all: true },
        }),
        prisma.task.groupBy({
          by: ['workcenterId'],
          where: {
            status: { in: ['ACTIVE', 'IN_PROGRESS'] },
            workcenterId: { not: null },
          },
          _count: { _all: true },
        }),
      ])

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

    const [priorityMeta, workcenterMeta] = await Promise.all([
      priorityIds.length
        ? prisma.priority.findMany({
            where: { id: { in: priorityIds } },
            select: { id: true, name: true, order: true },
          })
        : Promise.resolve([]),
      workcenterIds.length
        ? prisma.workcenter.findMany({
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

    leadershipData = {
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
  } else {
    const [myBoardTasksData, myOpenCount, myDueSoonCount, myCompletedWeekCount, noticeCount] =
      await Promise.all([
        prisma.task.findMany({
          where: {
            status: { not: 'CLOSED' },
            OR: [
              { assignedToId: user.userId },
              {
                assignments: {
                  some: { userId: user.userId },
                },
              },
            ],
          },
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            assignments: {
              include: { user: { select: { id: true, name: true, email: true } } },
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
        prisma.task.count({
          where: {
            status: { in: ['ACTIVE', 'IN_PROGRESS'] },
            OR: [
              { assignedToId: user.userId },
              {
                assignments: {
                  some: { userId: user.userId },
                },
              },
            ],
          },
        }),
        prisma.task.count({
          where: {
            status: { in: ['ACTIVE', 'IN_PROGRESS'] },
            assignedCompletionDate: {
              gte: now,
              lte: twoDaysOut,
            },
            OR: [
              { assignedToId: user.userId },
              {
                assignments: {
                  some: { userId: user.userId },
                },
              },
            ],
          },
        }),
        prisma.task.count({
          where: {
            status: 'COMPLETED',
            assignedToId: user.userId,
            updatedAt: { gte: weekAgo },
          },
        }),
        prisma.task.count({
          where: {
            isNotice: true,
            status: { not: 'CLOSED' },
            OR: [
              { assignedToId: user.userId },
              {
                assignments: {
                  some: { userId: user.userId },
                },
              },
            ],
          },
        }),
      ])

    contributorData = {
      myBoardTasks: myBoardTasksData,
      myOpenCount,
      myDueSoonCount,
      myCompletedWeekCount,
      noticeCount,
    }
  }

  const formatRoleTitle = (role: UserRole) => {
    switch (role) {
      case 'SUPERADMIN':
        return "Superadmin's Dashboard"
      case 'DIRECTOR':
        return "Director's Dashboard"
      case 'DY_DIRECTOR':
        return "Dy-Director's Dashboard"
      case 'MANAGER':
        return "Manager's Dashboard"
      case 'INCHARGE':
        return "Incharge's Dashboard"
      case 'EMPLOYEE':
      default:
        return "Employee's Dashboard"
    }
  }

  const heroTitle = formatRoleTitle(userRole)
  const heroMessage = isLeadership
    ? 'Stay in front of approaching deadlines and keep every receive & dispatch flowing.'
    : 'Track the assignments that need your action, from urgent dispatches to notices.'

  const getTimeGreeting = () => {
    const hour = now.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = userRecord.name?.split(' ')[0] ?? 'Team'
  const professionalGreeting = `${getTimeGreeting()}, ${firstName}.`

  type StatTile = {
    label: string
    value: number
    helper: string
    valueClass?: string
    helperClass?: string
    labelClass?: string
    cardClass?: string
  }

  const leadershipStats: StatTile[] = [
    {
      label: 'Open assignments',
      value: activeCount,
      helper: 'Active & in-progress',
      cardClass: 'bg-gradient-to-br from-[#0f172a] to-[#1d2d55] text-white border-none',
      labelClass: 'text-white/70',
      valueClass: 'text-4xl font-extrabold text-white',
      helperClass: 'text-white/80',
    },
    {
      label: 'Due in 48h',
      value: dueSoonCount,
      helper: 'Requires follow-up',
      cardClass: 'bg-gradient-to-br from-[#0f172a] to-[#0f4c81] text-white border-none',
      labelClass: 'text-white/70',
      valueClass: 'text-4xl font-extrabold text-white',
      helperClass: 'text-white/80',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      helper: 'Escalate immediately',
      cardClass: 'bg-gradient-to-br from-[#3b0d0d] to-[#7a0b1a] text-white border-none',
      labelClass: 'text-white/70',
      valueClass: 'text-4xl font-extrabold text-[#ffb4c1]',
      helperClass: 'text-white/80',
    },
    {
      label: 'Awaiting acknowledgment',
      value: ackPendingCount,
      helper: 'Completed but unsigned',
      cardClass: 'bg-gradient-to-br from-[#0f3a2e] to-[#1f6f4a] text-white border-none',
      labelClass: 'text-white/70',
      valueClass: 'text-4xl font-extrabold text-white',
      helperClass: 'text-white/80',
    },
  ]

  const contributorStats: StatTile[] =
    !isLeadership && contributorData
      ? [
          {
            label: 'My open tasks',
            value: contributorData.myOpenCount,
            helper: 'Active & in-progress',
            cardClass: 'bg-gradient-to-br from-white via-slate-50 to-blue-50 border border-blue-100',
          },
          {
            label: 'Due in 48h',
            value: contributorData.myDueSoonCount,
            helper: 'Prioritize now',
            cardClass: 'bg-gradient-to-br from-white via-amber-50 to-orange-50 border border-amber-100',
          },
          {
            label: 'Assigned notices',
            value: contributorData.noticeCount,
            helper: 'Requires acknowledgement',
            cardClass: 'bg-gradient-to-br from-white via-indigo-50 to-purple-50 border border-indigo-100',
          },
          {
            label: 'Completed last 7d',
            value: contributorData.myCompletedWeekCount,
            helper: 'Keeps momentum',
            cardClass: 'bg-gradient-to-br from-white via-emerald-50 to-green-50 border border-emerald-100',
          },
        ]
      : []

  const statTiles = isLeadership ? leadershipStats : contributorStats
  const personalDeadlinePreview =
    contributorData?.myBoardTasks.filter((task) => {
      const daysLeft = calculateDaysUntilDeadline(task.assignedCompletionDate)
      return daysLeft <= 3
    }) ?? []

  const getWatchlistSummary = (task: {
    descriptionOfWork?: string
    issuanceMessage?: string | null
  }) => {
    const source = task.descriptionOfWork || task.issuanceMessage || ''
    const plain = stripHtml(source)
    if (!plain) {
      return 'No description provided.'
    }
    return truncateText(plain, 160)
  }

  return (
    <div className="space-y-8">
      <Card
        variant="solid"
        className="bg-gradient-to-br from-[var(--brand-blue)]/90 to-[#0d1f46] text-white border-none shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">
              Nepal Airlines • Ground Support Department
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{heroTitle}</h1>
            <p className="text-base font-semibold text-white">{professionalGreeting}</p>
            <p className="text-white/80 max-w-2xl">{heroMessage}</p>
          </div>
          {canCreateTasks && (
            <Link href={withBasePath('/tasks/new')}>
              <Button variant="secondary" size="lg">
                Create task
              </Button>
            </Link>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile) => (
          <Card
            key={tile.label}
            padding="sm"
            variant="solid"
            className={tile.cardClass ?? 'bg-white/90 shadow-md'}
          >
            <p
              className={`text-xs uppercase tracking-wide ${
                tile.labelClass ?? 'text-slate-500'
              }`}
            >
              {tile.label}
            </p>
            <p className={`text-3xl font-bold ${tile.valueClass ?? 'text-slate-900'}`}>
              {tile.value}
            </p>
            {tile.helper && (
              <p className={`text-xs mt-1 ${tile.helperClass ?? 'text-slate-500'}`}>
                {tile.helper}
              </p>
            )}
          </Card>
        ))}
      </div>

      {isLeadership && leadershipData && (
        <>
          <div className="grid gap-6 xl:grid-cols-[3fr,2fr]">
            <Card
              variant="solid"
              className="bg-gradient-to-br from-white via-slate-50 to-rose-50 border border-rose-100"
            >
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle>Upcoming & overdue deadlines</CardTitle>
                  <p className="text-sm text-slate-500">
                    Tasks due within 7 days or currently late.
                  </p>
                </div>
                <Link
                  href={withBasePath('/tasks?sortBy=deadline')}
                  className="text-sm font-semibold text-[var(--brand-blue)]"
                >
                  View all →
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadershipData.watchlist.length === 0 ? (
                  <p className="text-sm text-slate-500">No deadlines in the next week.</p>
                ) : (
                  leadershipData.watchlist.map((task) => {
                    const isOverdue = task.daysLeft < 0
                    return (
                      <div
                        key={task.id}
                        className="flex flex-col gap-2 border border-slate-100 rounded-xl p-4 lg:flex-row lg:items-center lg:gap-4"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{task.recordNumber}</p>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {getWatchlistSummary(task)}
                          </p>
                          <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-3">
                            <span>{task.assignedTo?.name ?? 'Unassigned'}</span>
                            <span>•</span>
                            <span>{task.priority?.name ?? 'No priority'}</span>
                            {task.workcenter?.name && (
                              <>
                                <span>•</span>
                                <span>{task.workcenter.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Due</p>
                          <p className="font-semibold text-slate-900">
                            {formatDate(task.assignedCompletionDate)}
                          </p>
                          <p
                            className={`text-xs font-semibold ${
                              isOverdue ? 'text-[var(--brand-red)]' : 'text-amber-600'
                            }`}
                          >
                            {isOverdue
                              ? `Overdue by ${Math.abs(task.daysLeft)}d`
                              : `${task.daysLeft}d remaining`}
                          </p>
                          <Link
                            href={withBasePath(`/tasks/${task.id}`)}
                            className="text-xs text-[var(--brand-blue)] font-semibold inline-block mt-2"
                          >
                            Open →
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card
              variant="solid"
              className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border border-blue-100"
            >
              <CardHeader>
                <CardTitle>Priority distribution</CardTitle>
                <p className="text-sm text-slate-500">Active workload by priority band.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {leadershipData.priorityBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">No active workload recorded.</p>
                ) : (
                  leadershipData.priorityBreakdown.map((bucket) => {
                    const percentage =
                      activeCount === 0 ? 0 : Math.round((bucket.count / activeCount) * 100)
                    return (
                      <div key={bucket.name} className="space-y-1">
                        <div className="flex justify-between text-sm font-semibold text-slate-700">
                          <span>{bucket.name}</span>
                          <span>{bucket.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <span
                            className="block h-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-red)]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              variant="solid"
              className="bg-gradient-to-br from-white via-slate-50 to-emerald-50 border border-emerald-100"
            >
              <CardHeader>
                <CardTitle>Workcenter load</CardTitle>
                <p className="text-sm text-slate-500">Top centers with live assignments.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadershipData.workcenterLoad.length === 0 ? (
                  <p className="text-sm text-slate-500">Workcenters are currently clear.</p>
                ) : (
                  leadershipData.workcenterLoad.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between border border-slate-100 rounded-xl px-4 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{entry.name}</p>
                        <p className="text-xs text-slate-500">Active tasks</p>
                      </div>
                      <span className="text-2xl font-bold text-slate-900">{entry.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card
              variant="solid"
              className="bg-gradient-to-br from-white via-slate-50 to-amber-50 border border-amber-100"
            >
              <CardHeader>
                <CardTitle>Awaiting acknowledgment</CardTitle>
                <p className="text-sm text-slate-500">
                  Completed tasks that still need leadership sign-off.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadershipData.acknowledgmentQueue.length === 0 ? (
                  <p className="text-sm text-slate-500">No tasks pending acknowledgment.</p>
                ) : (
                  leadershipData.acknowledgmentQueue.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between border border-slate-100 rounded-xl px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{task.recordNumber}</p>
                        <p className="text-xs text-slate-500">
                          {task.assignedTo?.name ?? 'Unassigned'} • {task.priority?.name ?? 'N/A'}
                        </p>
                      </div>
                      <Link
                        href={withBasePath(`/tasks/${task.id}`)}
                        className="text-xs font-semibold text-[var(--brand-blue)]"
                      >
                        Review →
                      </Link>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!isLeadership && contributorData && (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <TaskList
            tasks={contributorData.myBoardTasks}
            title="Priority board"
            emptyMessage="No active assignments"
          />
          <Card
            variant="solid"
            className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border border-blue-100"
          >
            <CardHeader>
              <CardTitle>Quick actions & reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <Link
                  href={withBasePath('/tasks?assignedTo=me')}
                  className="flex items-center justify-between hover:text-[var(--brand-blue)]"
                >
                  <span>View all my tasks</span>
                  <span className="text-xs text-slate-500">→</span>
                </Link>
                <Link
                  href={withBasePath('/tasks/due')}
                  className="flex items-center justify-between hover:text-[var(--brand-blue)]"
                >
                  <span>Due soon board</span>
                  <span className="text-xs text-slate-500">→</span>
                </Link>
                <Link
                  href={withBasePath('/receives')}
                  className="flex items-center justify-between hover:text-[var(--brand-blue)]"
                >
                  <span>Incoming receives</span>
                  <span className="text-xs text-slate-500">→</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="font-semibold text-slate-900">Due within 3 days</p>
                {personalDeadlinePreview.length === 0 ? (
                  <p className="text-slate-500 text-sm">You are clear for the next 72h.</p>
                ) : (
                  personalDeadlinePreview.map((task) => {
                    const daysLeft = calculateDaysUntilDeadline(task.assignedCompletionDate)
                    const isOverdue = daysLeft < 0
                    return (
                      <Link
                        key={task.id}
                        href={withBasePath(`/tasks/${task.id}`)}
                        className="block border border-slate-100 rounded-lg px-3 py-2 hover:border-[var(--brand-blue)]"
                      >
                        <p className="font-semibold text-slate-900">{task.recordNumber}</p>
                        <p className="text-xs text-slate-500">
                          {isOverdue
                            ? `Overdue by ${Math.abs(daysLeft)}d`
                            : `${daysLeft}d remaining`}
                        </p>
                      </Link>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          variant="solid"
          className="bg-gradient-to-br from-white via-slate-50 to-cyan-50 border border-cyan-100"
        >
          <CardHeader>
            <CardTitle>System activity</CardTitle>
            <p className="text-sm text-slate-500">
              Completed today and notifications keep you informed automatically.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Completed today</p>
              <p className="text-3xl font-bold text-slate-900">{completedTodayCount}</p>
            </div>
            <div className="text-sm text-slate-500 max-w-sm">
              <p>
                Keep acknowledgments flowing so completed work turns into signed-off outcomes
                quickly.
              </p>
            </div>
          </CardContent>
        </Card>

        <NotificationPanel />
      </div>
    </div>
  )
}

