export function forwardTargetDisallowedMessage(params: {
  createdById: string | null | undefined
  targetUserId: string | null | undefined
  targetRole: string | null | undefined
}): string | null {
  const { createdById, targetUserId, targetRole } = params
  if (targetUserId && createdById && targetUserId === createdById) {
    return 'Cannot forward this dispatch to the user who created and assigned it.'
  }
  if (targetRole === 'SUPERADMIN') {
    return 'Cannot forward this dispatch to a superadmin.'
  }
  return null
}
