import { prisma } from './db'
import { ensureAppConfig } from './system-config'

/** Issued sequence would exceed configured masterfile maximum for this FY. */
export class MasterfileSequenceExhaustedError extends Error {
  constructor(public readonly maxTotal: number) {
    super('MASTERFILE_SEQUENCE_EXHAUSTED')
    this.name = 'MasterfileSequenceExhaustedError'
  }
}

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

type NumberSeries = 'DISPATCH' | 'RECEIVE' | 'MASTERFILE'

async function getNextFiscalSequenceValue(
  series: NumberSeries,
  fy: string,
  startValue: number,
  maxValue: number | null = null
): Promise<number> {
  const delegate = (prisma as any).sequenceCounter
  if (!delegate) {
    throw new Error(
      'SequenceCounter model is not available on the Prisma client. Did you run `npx prisma generate`?'
    )
  }

  const sequenceName = `${series}_${fy}`

  if (maxValue != null) {
    return prisma.$transaction(async (tx) => {
      const d = (tx as any).sequenceCounter
      const counter = await d.upsert({
        where: { name: sequenceName },
        update: {
          value: {
            increment: 1,
          },
        },
        create: {
          name: sequenceName,
          value: startValue,
        },
        select: {
          value: true,
        },
      })
      const next = counter.value as number
      if (next > maxValue) {
        await d.update({
          where: { name: sequenceName },
          data: { value: { decrement: 1 } },
        })
        throw new MasterfileSequenceExhaustedError(maxValue)
      }
      return next
    })
  }

  const counter = await delegate.upsert({
    where: { name: sequenceName },
    update: {
      value: {
        increment: 1,
      },
    },
    create: {
      name: sequenceName,
      value: startValue,
    },
    select: {
      value: true,
    },
  })

  return counter.value as number
}

export async function getNextDispatchRecordNumber(): Promise<string> {
  const config = await ensureAppConfig()
  const next = await getNextFiscalSequenceValue(
    'DISPATCH',
    config.currentFy,
    config.dispatchStartNumber
  )
  return `D-${config.currentFy}-${next}`
}

export async function getNextReceiveRecordNumber(): Promise<string> {
  const config = await ensureAppConfig()
  const next = await getNextFiscalSequenceValue(
    'RECEIVE',
    config.currentFy,
    config.receiveStartNumber
  )
  return `R-${config.currentFy}-${next}`
}

export async function getNextMasterfileRecord(): Promise<{
  fiscalYear: string
  total: number
  masterfileNumber: string
}> {
  const config = await ensureAppConfig()
  const maxTotal =
    typeof config.masterfileMaxTotal === 'number' && config.masterfileMaxTotal >= 1
      ? config.masterfileMaxTotal
      : null
  const next = await getNextFiscalSequenceValue(
    'MASTERFILE',
    config.currentFy,
    config.masterfileStartNumber,
    maxTotal
  )
  return {
    fiscalYear: config.currentFy,
    total: next,
    masterfileNumber: `MF-${config.currentFy}-${next}`,
  }
}

