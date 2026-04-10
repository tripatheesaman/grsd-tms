import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const requestedLimit = parseInt(searchParams.get('limit') || '20')
    const limit = Math.min(20, Math.max(1, Number.isNaN(requestedLimit) ? 20 : requestedLimit))

    const where: any = {
      userId: user.userId,
    }

    if (unreadOnly) {
      where.read = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              recordNumber: true,
              status: true,
              assignedCompletionDate: true,
              priority: {
                select: {
                  name: true,
                },
              },
              descriptionOfWork: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: user.userId,
          read: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    logger.error('Error fetching notifications', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, read, markAllRead } = body

    if (markAllRead === true) {
      await prisma.notification.updateMany({
        where: {
          userId: user.userId,
          read: false,
        },
        data: { read: true },
      })
      return NextResponse.json({ success: true })
    }

    if (!notificationId || typeof read !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: user.userId, 
      },
      data: { read },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    logger.error('Error updating notification', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
