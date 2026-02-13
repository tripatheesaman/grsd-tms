import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  canManageUsers,
  getVisibleRoles,
  getAssignableRoles,
} from '@/lib/roles'
import { sendUserCredentialsEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { UserRole } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageUsers(user.role as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage users' },
        { status: 403 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const visibleRoles = getVisibleRoles(currentUser.role as UserRole)

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: visibleRoles,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        designation: true,
        staffId: true,
        workcenterId: true,
        workcenter: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        canCreateTasks: true,
        canManageComplexities: true,
        canManagePersonnel: true,
        canManageWorkcenters: true,
        canManagePriorities: true,
        canManageUsers: true,
        canManageReceives: true,
        canApproveCompletions: true,
        canRevertCompletions: true,
        includeInAllStaff: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    logger.error('Error fetching users', error)
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

    if (!canManageUsers(user.role as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to create users' },
        { status: 403 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, role: true, name: true, email: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      name,
      password,
      role,
      sendCredentials,
      canCreateTasks,
      canManageComplexities,
      canManagePersonnel,
      canManageWorkcenters,
      canManagePriorities,
      canManageUsers: bodyCanManageUsers,
      canManageReceives: bodyCanManageReceives,
      canApproveCompletions: bodyCanApproveCompletions,
      canRevertCompletions: bodyCanRevertCompletions,
      designation,
      staffId,
      workcenterId,
      includeInAllStaff,
    } = body

    if (
      !email ||
      !name ||
      !password ||
      !role ||
      !designation ||
      !staffId ||
      !workcenterId
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const trimmedStaffId = staffId.toString().trim()

    if (!trimmedStaffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    const existingStaff = await prisma.user.findUnique({
      where: { staffId: trimmedStaffId },
    })

    if (existingStaff) {
      return NextResponse.json(
        { error: 'User with this staff ID already exists' },
        { status: 400 }
      )
    }

    const workcenter = await prisma.workcenter.findUnique({
      where: { id: workcenterId },
    })

    if (!workcenter) {
      return NextResponse.json(
        { error: 'Selected workcenter was not found' },
        { status: 400 }
      )
    }

    
    const hashedPassword = await bcrypt.hash(password, 10)

    const assignableRoles = getAssignableRoles(currentUser.role as UserRole)
    const targetRole = role as UserRole

    if (!assignableRoles.includes(targetRole)) {
      return NextResponse.json(
        { error: 'You cannot create users with this role' },
        { status: 403 }
      )
    }

    
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        designation: designation.trim(),
        staffId: trimmedStaffId,
        workcenterId,
        password: hashedPassword,
        role: role as any,
        mustChangePassword: true, 
        canCreateTasks:
          currentUser.role === 'SUPERADMIN' ? !!canCreateTasks : false,
        canManageComplexities:
          currentUser.role === 'SUPERADMIN' ? !!canManageComplexities : false,
        canManagePersonnel:
          currentUser.role === 'SUPERADMIN' ? !!canManagePersonnel : false,
        canManageWorkcenters:
          currentUser.role === 'SUPERADMIN' ? !!canManageWorkcenters : false,
        canManagePriorities:
          currentUser.role === 'SUPERADMIN' ? !!canManagePriorities : false,
        canManageUsers:
          currentUser.role === 'SUPERADMIN' ? !!bodyCanManageUsers : false,
        canManageReceives:
          currentUser.role === 'SUPERADMIN' ? !!bodyCanManageReceives : false,
        canApproveCompletions:
          currentUser.role === 'SUPERADMIN' ? !!bodyCanApproveCompletions : false,
        canRevertCompletions:
          currentUser.role === 'SUPERADMIN' ? !!bodyCanRevertCompletions : false,
        includeInAllStaff:
          currentUser.role === 'SUPERADMIN'
            ? includeInAllStaff !== false
            : true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        designation: true,
        staffId: true,
        workcenterId: true,
        workcenter: {
          select: { id: true, name: true },
        },
        createdAt: true,
        canCreateTasks: true,
        canManageComplexities: true,
        canManagePersonnel: true,
        canManageWorkcenters: true,
        canManagePriorities: true,
        canManageUsers: true,
        canManageReceives: true,
        canApproveCompletions: true,
        canRevertCompletions: true,
        includeInAllStaff: true,
      },
    })

    const shouldSendCredentials =
      typeof sendCredentials === 'boolean' ? sendCredentials : false

    if (shouldSendCredentials) {
      try {
        await sendUserCredentialsEmail(newUser.email, {
          name: newUser.name,
          email: newUser.email,
          userId: newUser.email,
          temporaryPassword: password,
          createdByName: currentUser.name || 'System Administrator',
        })
      } catch (emailError) {
        logger.error('Error sending user credentials email', emailError)
      }
    }

    logger.info('User created', {
      userId: newUser.id,
      email: newUser.email,
      sendCredentials: shouldSendCredentials,
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    logger.error('Error creating user', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

