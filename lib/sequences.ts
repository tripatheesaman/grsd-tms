import { prisma } from './db'

export type SequenceName = 'TASK' | 'RECEIVE'

export async function getNextSequenceValue(name: SequenceName): Promise<number> {
  const delegate = (prisma as any).sequenceCounter
  if (!delegate) {
    throw new Error('SequenceCounter model is not available on the Prisma client. Did you run `npx prisma generate`?')
  }

  const counter = await delegate.upsert({
    where: { name },
    update: {
      value: {
        increment: 1,
      },
    },
    create: {
      name,
      value: 1,
    },
    select: {
      value: true,
    },
  })

  return counter.value as number
}

