import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getNextSequenceValue } from '@/lib/sequences'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        role: true,
        canManageReceives: true,
      },
    } as any)
    const currentUser = currentUserRecord as {
      role: string
      canManageReceives?: boolean | null
    } | null

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageReceives)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view receives' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const statusParam = searchParams.get('status')

    const receives = await prisma.receive.findMany({
      where: statusParam
        ? {
            status: statusParam as any,
          }
        : undefined,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        tasks: {
          select: { id: true, recordNumber: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ receives })
  } catch (error) {
    logger.error('Error fetching receives', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        role: true,
        canManageReceives: true,
      },
    } as any)
    const currentUser = currentUserRecord as {
      id: string
      role: string
      canManageReceives?: boolean | null
    } | null

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canManage = currentUser.role === 'SUPERADMIN' || currentUser.canManageReceives

    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to manage receives' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { receivedFrom, subject, letterReferenceNumber } = body

    if (!receivedFrom || !receivedFrom.trim()) {
      return NextResponse.json(
        { error: 'Received from is required' },
        { status: 400 }
      )
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    const referenceNumber = (await getNextSequenceValue('RECEIVE')).toString()

    const receive = await prisma.receive.create({
      data: {
        referenceNumber,
        letterReferenceNumber: letterReferenceNumber?.trim() || null,
        receivedFrom: receivedFrom.trim(),
        subject: subject.trim(),
        receivedDate: new Date(),
        createdById: currentUser.id,
      },
    })

    logger.info('Receive logged', { receiveId: receive.id })

    return NextResponse.json({ receive }, { status: 201 })
  } catch (error) {
    logger.error('Error creating receive', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

