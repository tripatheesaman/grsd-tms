import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageWorkcenters: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageWorkcenters)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to manage workcenters' },
        { status: 403 }
      )
    }

    const workcenters = await prisma.workcenter.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ workcenters })
  } catch (error) {
    logger.error('Error fetching workcenters', error)
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

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageWorkcenters: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageWorkcenters)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to create workcenters' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Workcenter name is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.workcenter.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A workcenter with this name already exists' },
        { status: 400 }
      )
    }

    const workcenter = await prisma.workcenter.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    logger.info('Workcenter created', { workcenterId: workcenter.id })

    return NextResponse.json({ workcenter }, { status: 201 })
  } catch (error) {
    logger.error('Error creating workcenter', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

