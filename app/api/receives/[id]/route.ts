import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = (await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageReceives: true } as any,
    })) as any

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageReceives)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view receives' },
        { status: 403 }
      )
    }

    const { id } = await params

    const receive = await prisma.receive.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        tasks: {
          select: {
            id: true,
            recordNumber: true,
            status: true,
          },
        },
      },
    })

    if (!receive) {
      return NextResponse.json({ error: 'Receive not found' }, { status: 404 })
    }

    return NextResponse.json({ receive })
  } catch (error) {
    logger.error('Error fetching receive', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = (await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, role: true, canManageReceives: true } as any,
    })) as any

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      currentUser.role !== 'SUPERADMIN' &&
      !currentUser.canManageReceives
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to manage receives' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['OPEN', 'ASSIGNED', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const receive = await prisma.receive.findUnique({ where: { id } })

    if (!receive) {
      return NextResponse.json({ error: 'Receive not found' }, { status: 404 })
    }

    const updated = await prisma.receive.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'CLOSED' ? new Date() : null,
        closedById: status === 'CLOSED' ? currentUser.id : null,
      },
    })

    logger.info('Receive updated', { receiveId: updated.id, status })

    return NextResponse.json({ receive: updated })
  } catch (error) {
    logger.error('Error updating receive', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

