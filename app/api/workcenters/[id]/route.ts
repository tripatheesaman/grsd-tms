import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

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
      select: { role: true, canManageWorkcenters: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageWorkcenters)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to edit workcenters' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Workcenter name is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.workcenter.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Workcenter not found' }, { status: 404 })
    }

    const duplicate = await prisma.workcenter.findFirst({
      where: {
        id: { not: id },
        name: name.trim(),
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { error: 'Another workcenter with this name already exists' },
        { status: 400 }
      )
    }

    const updated = await prisma.workcenter.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    logger.info('Workcenter updated', { workcenterId: id })

    return NextResponse.json({ workcenter: updated })
  } catch (error) {
    logger.error('Error updating workcenter', error)
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
      select: { role: true, canManageWorkcenters: true },
    })

    if (
      !currentUser ||
      (currentUser.role !== 'SUPERADMIN' && !currentUser.canManageWorkcenters)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to delete workcenters' },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.workcenter.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Workcenter not found' }, { status: 404 })
    }

    if (existing.users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a workcenter that has assigned users' },
        { status: 400 }
      )
    }

    await prisma.workcenter.delete({
      where: { id },
    })

    logger.info('Workcenter deleted', { workcenterId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting workcenter', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

