import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ensureAppConfig, canManageSettings } from '@/lib/system-config'
import { encryptSecret } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageSettings: true },
    })

    if (!currentUser || !canManageSettings(currentUser as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage settings' },
        { status: 403 }
      )
    }

    const config = await ensureAppConfig()
    return NextResponse.json({
      settings: {
        currentFy: config.currentFy,
        dispatchStartNumber: config.dispatchStartNumber,
        receiveStartNumber: config.receiveStartNumber,
        masterfileStartNumber: config.masterfileStartNumber,
        smtpHost: config.smtpHost || '',
        smtpPort: config.smtpPort || 587,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser || '',
        smtpFrom: config.smtpFrom || '',
        hasSmtpPassword: Boolean(config.smtpPassEncrypted),
      },
    })
  } catch (error) {
    logger.error('Error fetching settings', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageSettings: true },
    })

    if (!currentUser || !canManageSettings(currentUser as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      dispatchStartNumber,
      receiveStartNumber,
      masterfileStartNumber,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpFrom,
      smtpPassword,
    } = body

    if (!Number.isInteger(dispatchStartNumber) || dispatchStartNumber < 1) {
      return NextResponse.json(
        { error: 'Dispatch start number must be a positive integer' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(receiveStartNumber) || receiveStartNumber < 1) {
      return NextResponse.json(
        { error: 'Receive start number must be a positive integer' },
        { status: 400 }
      )
    }

    const ensuredConfig = await ensureAppConfig()

    const effectiveMasterfileStart =
      typeof masterfileStartNumber === 'number' &&
      Number.isInteger(masterfileStartNumber) &&
      masterfileStartNumber >= 1
        ? masterfileStartNumber
        : ensuredConfig.masterfileStartNumber

    if (!Number.isInteger(effectiveMasterfileStart) || effectiveMasterfileStart < 1) {
      return NextResponse.json(
        { error: 'Masterfile start number must be a positive integer' },
        { status: 400 }
      )
    }


    const updateData: any = {
      currentFy: ensuredConfig.currentFy,
      dispatchStartNumber,
      receiveStartNumber,
      masterfileStartNumber: effectiveMasterfileStart,
      smtpHost: smtpHost?.trim() || null,
      smtpPort: smtpPort ? Number(smtpPort) : null,
      smtpSecure: Boolean(smtpSecure),
      smtpUser: smtpUser?.trim() || null,
      smtpFrom: smtpFrom?.trim() || null,
    }

    if (typeof smtpPassword === 'string' && smtpPassword.length > 0) {
      updateData.smtpPassEncrypted = encryptSecret(smtpPassword)
    }

    const updated = await (prisma as any).appConfig.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    })

    logger.info('Settings updated', { updatedBy: user.userId })

    return NextResponse.json({
      settings: {
        currentFy: updated.currentFy,
        dispatchStartNumber: updated.dispatchStartNumber,
        receiveStartNumber: updated.receiveStartNumber,
        masterfileStartNumber: updated.masterfileStartNumber,
        smtpHost: updated.smtpHost || '',
        smtpPort: updated.smtpPort || 587,
        smtpSecure: updated.smtpSecure,
        smtpUser: updated.smtpUser || '',
        smtpFrom: updated.smtpFrom || '',
        hasSmtpPassword: Boolean(updated.smtpPassEncrypted),
      },
    })
  } catch (error) {
    logger.error('Error updating settings', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
