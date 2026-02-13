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

    const { id } = await params
    const complexity = await prisma.complexity.findUnique({
      where: { id },
    })

    if (!complexity) {
      return NextResponse.json({ error: 'Complexity not found' }, { status: 404 })
    }

    return NextResponse.json({ complexity })
  } catch (error) {
    logger.error('Error fetching complexity', error)
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

    const currentUserData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageComplexities: true },
    })

    if (
      !currentUserData ||
      (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManageComplexities)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, order, description } = body

    const existing = await prisma.complexity.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Complexity not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (name !== undefined) {
      
      if (name !== existing.name) {
        const existingByName = await prisma.complexity.findUnique({
          where: { name },
        })
        if (existingByName) {
          return NextResponse.json(
            { error: 'Complexity with this name already exists' },
            { status: 400 }
          )
        }
      }
      updateData.name = name.trim()
    }

    if (order !== undefined) {
      const orderNum = parseInt(order)
      
      if (orderNum !== existing.order) {
        const existingByOrder = await prisma.complexity.findUnique({
          where: { order: orderNum },
        })
        if (existingByOrder) {
          return NextResponse.json(
            { error: 'Complexity with this order already exists' },
            { status: 400 }
          )
        }
      }
      updateData.order = orderNum
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    const updated = await prisma.complexity.update({
      where: { id },
      data: updateData,
    })

    logger.info('Complexity updated successfully', { complexityId: updated.id })
    return NextResponse.json({ complexity: updated })
  } catch (error) {
    logger.error('Error updating complexity', error)
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

    const currentUserData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageComplexities: true },
    })

    if (
      !currentUserData ||
      (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManageComplexities)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.complexity.findUnique({
      where: { id },
      include: {
        tasks: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Complexity not found' }, { status: 404 })
    }

    
    if (existing.tasks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete complexity that is assigned to tasks' },
        { status: 400 }
      )
    }

    await prisma.complexity.delete({
      where: { id },
    })

    logger.info('Complexity deleted successfully', { complexityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting complexity', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

