import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

const DEFAULT_LIMIT = 10000

function fulltextRowLimit(): number {
  const n = parseInt(process.env.TASK_FULLTEXT_ROW_LIMIT || String(DEFAULT_LIMIT), 10)
  return Math.min(50000, Math.max(100, Number.isNaN(n) ? DEFAULT_LIMIT : n))
}

function buildBooleanPrefixQuery(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 200)
  if (!trimmed) return null
  const tokens = trimmed.split(/\s+/).map((t) => t.replace(/["'\\]/g, '')).filter(Boolean)
  if (tokens.length === 0) return null
  const safe = tokens.map((t) =>
    t.replace(/[-+~*<>()@]/g, '').replace(/^\^+/, '')
  ).filter(Boolean)
  if (safe.length === 0) return null
  return safe.map((t) => `+${t}*`).join(' ')
}

function buildNaturalLanguageQuery(raw: string): string | null {
  const q = raw.trim().slice(0, 200)
  return q.length ? q : null
}

function intersectIdSets(chunks: string[][]): string[] {
  if (chunks.length === 0) return []
  let set = new Set(chunks[0])
  for (let i = 1; i < chunks.length; i++) {
    const next = new Set(chunks[i])
    set = new Set([...set].filter((id) => next.has(id)))
  }
  return [...set]
}

export async function fulltextTaskIdsByBody(
  db: PrismaClient,
  term: string
): Promise<string[]> {
  const q = buildNaturalLanguageQuery(term)
  if (!q) return []
  const limit = fulltextRowLimit()
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM Task
      WHERE MATCH(descriptionOfWork, issuanceMessage) AGAINST(${q} IN NATURAL LANGUAGE MODE)
      LIMIT ${limit}
    `
  )
  return rows.map((r) => r.id)
}

export async function fulltextTaskIdsByNumbers(
  db: PrismaClient,
  recordNumber?: string | null,
  fileNumber?: string | null
): Promise<string[]> {
  const r = recordNumber?.trim() || ''
  const f = fileNumber?.trim() || ''
  if (!r && !f) return []
  const parts: string[] = []
  const rq = buildBooleanPrefixQuery(r)
  const fq = buildBooleanPrefixQuery(f)
  if (rq) parts.push(rq)
  if (fq) parts.push(fq)
  if (parts.length === 0) return []
  const against = parts.join(' ')
  const limit = fulltextRowLimit()
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM Task
      WHERE MATCH(recordNumber, fileNumber) AGAINST(${against} IN BOOLEAN MODE)
      LIMIT ${limit}
    `
  )
  return rows.map((row) => row.id)
}

export async function fulltextTaskIdsByReceiveSubject(
  db: PrismaClient,
  term: string
): Promise<string[]> {
  const q = buildNaturalLanguageQuery(term)
  if (!q) return []
  const limit = fulltextRowLimit()
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT t.id FROM Task t
      INNER JOIN Receive r ON t.receiveId = r.id
      WHERE MATCH(r.subject) AGAINST(${q} IN NATURAL LANGUAGE MODE)
      LIMIT ${limit}
    `
  )
  return rows.map((r) => r.id)
}

export async function fulltextUserIdsByIdentity(
  db: PrismaClient,
  term: string
): Promise<string[]> {
  const q = buildNaturalLanguageQuery(term)
  if (!q) return []
  const limit = fulltextRowLimit()
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM User
      WHERE MATCH(name, email) AGAINST(${q} IN NATURAL LANGUAGE MODE)
      LIMIT ${limit}
    `
  )
  return rows.map((r) => r.id)
}

export async function fulltextTaskIdsByAssigneeUsers(
  db: PrismaClient,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return []
  const limit = fulltextRowLimit()
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT DISTINCT t.id FROM Task t
      WHERE t.assignedToId IN (${Prisma.join(userIds)})
         OR EXISTS (
           SELECT 1 FROM TaskAssignment ta
           WHERE ta.taskId = t.id AND ta.userId IN (${Prisma.join(userIds)})
         )
      LIMIT ${limit}
    `
  )
  return rows.map((r) => r.id)
}

export async function fulltextTaskIdsByCreatorUsers(
  db: PrismaClient,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return []
  const limit = fulltextRowLimit()
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM Task
      WHERE createdById IN (${Prisma.join(userIds)})
      LIMIT ${limit}
    `
  )
  return rows.map((r) => r.id)
}

export async function resolveFulltextTaskIdFilter(
  db: PrismaClient,
  input: {
    recordNumber?: string | null
    fileNumber?: string | null
    subject?: string | null
    bodyOrDescription?: string | null
    assignee?: string | null
    creator?: string | null
  }
): Promise<string[] | null> {
  const chunks: string[][] = []

  if (input.bodyOrDescription?.trim()) {
    chunks.push(await fulltextTaskIdsByBody(db, input.bodyOrDescription.trim()))
  }
  if (input.subject?.trim()) {
    chunks.push(await fulltextTaskIdsByReceiveSubject(db, input.subject.trim()))
  }
  if (input.recordNumber?.trim() || input.fileNumber?.trim()) {
    chunks.push(
      await fulltextTaskIdsByNumbers(
        db,
        input.recordNumber?.trim(),
        input.fileNumber?.trim()
      )
    )
  }
  if (input.assignee?.trim()) {
    const userIds = await fulltextUserIdsByIdentity(db, input.assignee.trim())
    chunks.push(
      userIds.length === 0
        ? []
        : await fulltextTaskIdsByAssigneeUsers(db, userIds)
    )
  }
  if (input.creator?.trim()) {
    const userIds = await fulltextUserIdsByIdentity(db, input.creator.trim())
    chunks.push(
      userIds.length === 0
        ? []
        : await fulltextTaskIdsByCreatorUsers(db, userIds)
    )
  }

  if (chunks.length === 0) return null
  return intersectIdSets(chunks)
}
