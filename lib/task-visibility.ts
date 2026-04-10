import type { UserRole } from '@/types'

export type TaskVisibilityUser = {
  role: string
  canViewAllSubmissions?: boolean | null
  canApproveCompletions?: boolean | null
}

export function canViewAllTasksAndProgress(user: TaskVisibilityUser): boolean {
  const r = user.role as UserRole
  if (r === 'SUPERADMIN' || r === 'DIRECTOR' || r === 'DY_DIRECTOR') {
    return true
  }
  if (user.canViewAllSubmissions === true) return true
  if (user.canApproveCompletions === true) return true
  return false
}

export function canAccessTaskWorkspace(
  userId: string,
  viewer: TaskVisibilityUser,
  task: {
    createdById: string
    assignedToId: string | null
    assignments: { userId: string }[]
    actions?: { performedById: string; forwardedToId: string | null }[]
    submissions?: { userId: string }[]
    attachments?: { uploadedById: string }[]
    history?: { changedById: string }[]
  }
): boolean {
  if (canViewAllTasksAndProgress(viewer)) return true
  if (task.createdById === userId) return true
  if (task.assignedToId === userId) return true
  if (task.assignments.some((a) => a.userId === userId)) return true
  if (
    task.actions?.some(
      (a) => a.performedById === userId || a.forwardedToId === userId
    )
  ) {
    return true
  }
  if (task.submissions?.some((s) => s.userId === userId)) return true
  if (task.attachments?.some((x) => x.uploadedById === userId)) return true
  if (task.history?.some((h) => h.changedById === userId)) return true
  return false
}
