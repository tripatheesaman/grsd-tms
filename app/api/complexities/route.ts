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

    const complexities = await prisma.complexity.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ complexities })
  } catch (error) {
    logger.error('Error fetching complexities', error)
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
      select: { role: true, canManageComplexities: true },
    })

    if (
      !currentUserData ||
      (currentUserData.role !== 'SUPERADMIN' && !currentUserData.canManageComplexities)
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

    
    const existingByName = await prisma.complexity.findUnique({
      where: { name },
    })

    if (existingByName) {
      return NextResponse.json(
        { error: 'Complexity with this name already exists' },
        { status: 400 }
      )
    }

    
    const existingByOrder = await prisma.complexity.findUnique({
      where: { order },
    })

    if (existingByOrder) {
      return NextResponse.json(
        { error: 'Complexity with this order already exists' },
        { status: 400 }
      )
    }

    const complexity = await prisma.complexity.create({
      data: {
        name: name.trim(),
        order: parseInt(order),
        description: description?.trim() || null,
      },
    })

    logger.info('Complexity created successfully', { complexityId: complexity.id })
    return NextResponse.json({ complexity }, { status: 201 })
  } catch (error) {
    logger.error('Error creating complexity', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

