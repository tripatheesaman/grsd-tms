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

    const personnel = await prisma.assignedPersonnel.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ personnel })
  } catch (error) {
    logger.error('Error fetching assigned personnel', error)
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

    const currentUserData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManagePersonnel: true },
    })

    if (
      !currentUserData ||
      (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManagePersonnel)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, order, description } = body

    if (!name || order === undefined) {
      return NextResponse.json(
        { error: 'Name and order are required' },
        { status: 400 }
      )
    }

    
    const existingByName = await prisma.assignedPersonnel.findUnique({
      where: { name },
    })

    if (existingByName) {
      return NextResponse.json(
        { error: 'Personnel with this name already exists' },
        { status: 400 }
      )
    }

    
    const existingByOrder = await prisma.assignedPersonnel.findUnique({
      where: { order },
    })

    if (existingByOrder) {
      return NextResponse.json(
        { error: 'Personnel with this order already exists' },
        { status: 400 }
      )
    }

    const personnel = await prisma.assignedPersonnel.create({
      data: {
        name: name.trim(),
        order: parseInt(order),
        description: description?.trim() || null,
      },
    })

    logger.info('Assigned personnel created successfully', { personnelId: personnel.id })
    return NextResponse.json({ personnel }, { status: 201 })
  } catch (error) {
    logger.error('Error creating assigned personnel', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

