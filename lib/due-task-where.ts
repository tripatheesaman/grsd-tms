import type { Prisma } from '@prisma/client'

export function dueTasksSubmissionOrClause(userId: string): Prisma.TaskWhereInput {
  return {
    OR: [
      { submissions: { none: { userId } } },
      {
        submissions: {
          some: {
            userId,
            status: { in: ['PENDING', 'REJECTED'] },
          },
        },
      },
      {
        AND: [
          { assignedToId: userId },
          {
            submissions: {
              some: {
                userId,
                status: 'FORWARDED',
              },
            },
          },
        ],
      },
      {
        AND: [
          { submissionMode: 'SINGLE' },
          {
            assignments: {
              some: { userId, isCc: true },
            },
          },
        ],
      },
    ],
  }
}
