import { PrismaClient } from '@prisma/client'

const logLevel =
  process.env.NODE_ENV === 'development' && process.env.PRISMA_QUERY_LOG === 'true'
    ? (['query', 'error', 'warn'] as const)
    : (['error'] as const)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaRead: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [...logLevel],
  })

const readUrl = process.env.DATABASE_URL_READ?.trim()

export const prismaRead =
  readUrl && readUrl !== process.env.DATABASE_URL?.trim()
    ? (globalForPrisma.prismaRead ??
        new PrismaClient({
          datasourceUrl: readUrl,
          log: [...logLevel],
        }))
    : prisma

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  if (prismaRead !== prisma) {
    globalForPrisma.prismaRead = prismaRead
  }
}

