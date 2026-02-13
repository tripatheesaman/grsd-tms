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

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManagePriorities: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManagePriorities)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view priorities' },
        { status: 403 }
      )
    }

    const { id } = await params
    const priority = await prisma.priority.findUnique({
      where: { id },
    })

    if (!priority) {
      return NextResponse.json({ error: 'Priority not found' }, { status: 404 })
    }

    return NextResponse.json({ priority })
  } catch (error) {
    logger.error('Error fetching priority', error)
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

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManagePriorities: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManagePriorities)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to edit priorities' },
        { status: 403 }
      )
    }

    const { id } = await params
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
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Priority not found' }, { status: 404 })
    }

    const duplicate = await prisma.priority.findFirst({
      where: {
        id: { not: id },
        name: name.trim(),
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { error: 'Another priority with this name already exists' },
        { status: 400 }
      )
    }

    const duplicateOrder = await prisma.priority.findFirst({
      where: {
        id: { not: id },
        order: parseInt(order),
      },
    })

    if (duplicateOrder) {
      return NextResponse.json(
        { error: 'Another priority with this order already exists' },
        { status: 400 }
      )
    }

    const updated = await prisma.priority.update({
      where: { id },
      data: {
        name: name.trim(),
        order: parseInt(order),
        description: description?.trim() || null,
      },
    })

    logger.info('Priority updated', { priorityId: id })

    return NextResponse.json({ priority: updated })
  } catch (error) {
    logger.error('Error updating priority', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'You do not have permission to delete priorities' },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.priority.findUnique({
      where: { id },
      include: {
        tasks: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Priority not found' }, { status: 404 })
    }

    if (existing.tasks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a priority that has assigned tasks' },
        { status: 400 }
      )
    }

    await prisma.priority.delete({
      where: { id },
    })

    logger.info('Priority deleted', { priorityId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting priority', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

