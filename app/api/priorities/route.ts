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

    
    const priorities = await prisma.priority.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ priorities })
  } catch (error) {
    logger.error('Error fetching priorities', error)
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
      select: { role: true, canManagePriorities: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManagePriorities)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to create priorities' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, order, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Priority name is required' },
        { status: 400 }
      )
    }

    if (order === undefined || order === null) {
      return NextResponse.json(
        { error: 'Priority order is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.priority.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A priority with this name already exists' },
        { status: 400 }
      )
    }

    const existingOrder = await prisma.priority.findUnique({
      where: { order: parseInt(order) },
    })

    if (existingOrder) {
      return NextResponse.json(
        { error: 'A priority with this order already exists' },
        { status: 400 }
      )
    }

    const priority = await prisma.priority.create({
      data: {
        name: name.trim(),
        order: parseInt(order),
        description: description?.trim() || null,
      },
    })

    logger.info('Priority created', { priorityId: priority.id })

    return NextResponse.json({ priority }, { status: 201 })
  } catch (error) {
    logger.error('Error creating priority', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

