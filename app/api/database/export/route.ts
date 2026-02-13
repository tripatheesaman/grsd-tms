import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { canAccessDatabase } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canAccessDatabase(user.role as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to access database operations' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'

    let data: any = {}

    if (type === 'users' || type === 'all') {
      data.users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }

    if (type === 'tasks' || type === 'all') {
      data.tasks = await prisma.task.findMany({
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    }

    logger.info('Database export', { type, exportedBy: user.userId })

    return NextResponse.json(data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${type}-export-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    logger.error('Error exporting database', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

