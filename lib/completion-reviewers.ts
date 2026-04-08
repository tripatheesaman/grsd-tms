import type { PrismaClient } from '@prisma/client'

export async function completionReviewerUserIds(db: PrismaClient): Promise<string[]> {
  const rows = await db.user.findMany({
    where: {
      OR: [
        { role: { in: ['SUPERADMIN', 'DIRECTOR'] } },
        { canApproveCompletions: true },
      ],
    },
    select: { id: true },
  })
  return [...new Set(rows.map((r) => r.id))]
}
