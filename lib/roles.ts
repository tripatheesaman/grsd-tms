import { UserRole } from '@/types'

export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  DIRECTOR: 'DIRECTOR',
  DY_DIRECTOR: 'DY_DIRECTOR',
  MANAGER: 'MANAGER',
  INCHARGE: 'INCHARGE',
  EMPLOYEE: 'EMPLOYEE',
} as const

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPERADMIN: 6,
  DIRECTOR: 5,
  DY_DIRECTOR: 4,
  MANAGER: 3,
  INCHARGE: 2,
  EMPLOYEE: 1,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canCloseTask(userRole: UserRole): boolean {
  const allowed: UserRole[] = [ROLES.SUPERADMIN, ROLES.DIRECTOR]
  return allowed.includes(userRole)
}

export function canRevertTask(
  userRole: UserRole,
  hasRevertPermission = false
): boolean {
  if (userRole === ROLES.SUPERADMIN) {
    return true
  }
  return hasRevertPermission
}

export function canEditTask(userRole: UserRole): boolean {
  const allowed: UserRole[] = [ROLES.SUPERADMIN, ROLES.DIRECTOR]
  return allowed.includes(userRole)
}

export function canAccessDatabase(userRole: UserRole): boolean {
  return userRole === ROLES.SUPERADMIN
}

export function canManageUsers(userRole: UserRole): boolean {
  return userRole === ROLES.SUPERADMIN
}

export function canAcknowledgeTask(
  userRole: UserRole,
  hasApprovalPermission = false
): boolean {
  if (userRole === ROLES.SUPERADMIN) {
    return true
  }
  return hasApprovalPermission
}

export function isDirector(userRole: UserRole): boolean {
  const allowed: UserRole[] = [ROLES.SUPERADMIN, ROLES.DIRECTOR, ROLES.DY_DIRECTOR]
  return allowed.includes(userRole)
}

export function getVisibleRoles(userRole: UserRole): UserRole[] {
  const rank = ROLE_HIERARCHY[userRole]
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    (role) => ROLE_HIERARCHY[role] <= rank
  )
}

export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const rank = ROLE_HIERARCHY[userRole]
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    (role) => ROLE_HIERARCHY[role] < rank
  )
}

export function canModifyUserRole(
  currentRole: UserRole,
  targetRole: UserRole
): boolean {
  return ROLE_HIERARCHY[currentRole] > ROLE_HIERARCHY[targetRole]
}

