import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { formatDate, formatDateTime, stripHtml, truncateText } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { withBasePath } from '@/lib/base-path'

export default async function CompletionRequestsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(withBasePath('/login'))
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      role: true,
      canApproveCompletions: true,
    },
  })

  const canReviewCompletions =
    currentUser &&
    (currentUser.role === 'SUPERADMIN' || currentUser.canApproveCompletions)

  if (!canReviewCompletions) {
    redirect(withBasePath('/dashboard'))
  }

  const completionTasks = await prisma.task.findMany({
    where: {
      status: 'COMPLETED',
      acknowledgedById: null,
    },
    include: {
      assignedTo: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      priority: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Completion Requests
          </h1>
          <p className="text-slate-600">
            Tasks submitted for final acknowledgment and awaiting your decision.
          </p>
        </div>
        <Badge variant="info" size="lg">
          {completionTasks.length} pending
        </Badge>
      </div>

      {completionTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No completion requests at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {completionTasks.map((task) => {
            const summary = truncateText(
              stripHtml(task.descriptionOfWork ?? ''),
              200
            )
            return (
              <Card key={task.id} className="border border-slate-100">
                <CardContent className="py-4 px-6 flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        #{task.recordNumber}
                      </h3>
                      <Badge variant="warning" size="sm">
                        Pending approval
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                      {summary || 'No description provided.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>
                        Submitted by:{' '}
                        <strong>
                          {task.assignedTo?.name || 'Unassigned'}
                        </strong>
                      </span>
                      <span>
                        Created by:{' '}
                        <strong>{task.createdBy?.name || 'Unknown'}</strong>
                      </span>
                      {task.priority?.name && (
                        <span>
                          Priority: <strong>{task.priority.name}</strong>
                        </span>
                      )}
                      <span>
                        Completion requested:{' '}
                        <strong>{formatDateTime(task.updatedAt)}</strong>
                      </span>
                      <span>
                        Due:{' '}
                        <strong>{formatDate(task.assignedCompletionDate)}</strong>
                      </span>
                    </div>
                  </div>
                  <a
                    href={withBasePath(`/tasks/${task.id}`)}
                    className="text-sm font-semibold text-[var(--brand-blue)] hover:underline"
                  >
                    Review task →
                  </a>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

