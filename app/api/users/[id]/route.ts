import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { canManageUsers, canModifyUserRole } from '@/lib/roles'
import bcrypt from 'bcryptjs'
import { UserRole } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageUsers(user.role as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit users' },
        { status: 403 }
      )
    }

    const { id } = await params

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()

    const {
      name,
      email,
      role,
      password,
      canCreateTasks,
      canManageComplexities,
      canManagePersonnel,
      canManageWorkcenters,
      canManagePriorities,
      canManageUsers: bodyCanManageUsers,
      canManageReceives: bodyCanManageReceives,
      canApproveCompletions: bodyCanApproveCompletions,
      canRevertCompletions: bodyCanRevertCompletions,
      canViewReports: bodyCanViewReports,
      designation,
      staffId,
      workcenterId,
      includeInAllStaff,
    } = body

    
    const userToUpdate = await prisma.user.findUnique({
      where: { id },
    })

    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (
      !canModifyUserRole(
        currentUser.role as UserRole,
        userToUpdate.role as UserRole
      )
    ) {
      return NextResponse.json(
        { error: 'You cannot edit users at this level' },
        { status: 403 }
      )
    }

    
    if (email && email !== userToUpdate.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    if (staffId && staffId !== userToUpdate.staffId) {
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
          { error: 'Staff ID already exists' },
          { status: 400 }
        )
      }
    }

    if (workcenterId) {
      const workcenter = await prisma.workcenter.findUnique({
        where: { id: workcenterId },
      })
      if (!workcenter) {
        return NextResponse.json(
          { error: 'Selected workcenter not found' },
          { status: 400 }
        )
      }
    }

    
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (designation) updateData.designation = designation
    if (staffId) updateData.staffId = staffId.toString().trim()
    if (workcenterId) updateData.workcenterId = workcenterId
    if (role) {
      if (
        !canModifyUserRole(currentUser.role as UserRole, role as UserRole)
      ) {
        return NextResponse.json(
          { error: 'You cannot assign this role' },
          { status: 403 }
        )
      }
      updateData.role = role
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
      
      updateData.mustChangePassword = true
    }

    if (typeof canCreateTasks === 'boolean' && currentUser.role === 'SUPERADMIN') {
      updateData.canCreateTasks = canCreateTasks
    }
    if (
      typeof canManageComplexities === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canManageComplexities = canManageComplexities
    }
    if (
      typeof canManagePersonnel === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canManagePersonnel = canManagePersonnel
    }

    if (
      typeof canManageWorkcenters === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canManageWorkcenters = canManageWorkcenters
    }
    if (
      typeof canManagePriorities === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canManagePriorities = canManagePriorities
    }
    if (
      typeof bodyCanManageUsers === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canManageUsers = bodyCanManageUsers
    }
    if (
      typeof bodyCanManageReceives === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canManageReceives = bodyCanManageReceives
    }
    if (
      typeof bodyCanApproveCompletions === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canApproveCompletions = bodyCanApproveCompletions
    }
    if (
      typeof bodyCanRevertCompletions === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canRevertCompletions = bodyCanRevertCompletions
    }
    if (
      typeof bodyCanViewReports === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.canViewReports = bodyCanViewReports
    }
    if (
      typeof includeInAllStaff === 'boolean' &&
      currentUser.role === 'SUPERADMIN'
    ) {
      updateData.includeInAllStaff = includeInAllStaff
    }

    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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
        canViewReports: true,
        designation: true,
        staffId: true,
        workcenterId: true,
        workcenter: {
          select: { id: true, name: true },
        },
        includeInAllStaff: true,
      },
    })

    logger.info('User updated', { userId: id })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    logger.error('Error updating user', error)
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

    if (!canManageUsers(user.role as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete users' },
        { status: 403 }
      )
    }

    const { id } = await params

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    
    if (id === user.userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (
      !canModifyUserRole(
        currentUser.role as UserRole,
        userToDelete.role as UserRole
      )
    ) {
      return NextResponse.json(
        { error: 'You cannot delete users at this level' },
        { status: 403 }
      )
    }

    
    await prisma.user.delete({
      where: { id },
    })

    logger.info('User deleted', { userId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting user', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

