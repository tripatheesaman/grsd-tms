import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { existsSync } from 'fs'
import { logger } from '@/lib/logger'
import { getFileUrl } from '@/lib/storage'

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

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            assignedToId: true,
            createdById: true,
          },
        },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    
    const hasAccess =
      attachment.task.assignedToId === user.userId ||
      attachment.task.createdById === user.userId ||
      user.role === 'SUPERADMIN' ||
      user.role === 'DIRECTOR'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    
    if (!existsSync(attachment.filepath)) {
      logger.error('File not found on disk', { filepath: attachment.filepath })
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    
    const fileUrl = getFileUrl(attachment.filepath)
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const forwardedHost = request.headers.get('x-forwarded-host')
    const hostHeader = forwardedHost || request.headers.get('host') || 'localhost:3000'
    const normalizedHost = hostHeader
      .replace(/^0\.0\.0\.0(?=[:/]|$)/, 'localhost')
      .replace(/^\[::\](?=[:/]|$)/, 'localhost')
    const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '')
    const redirectBase = `${protocol}://${normalizedHost}`
    return NextResponse.redirect(new URL(fileUrl, redirectBase))
  } catch (error) {
    logger.error('Error downloading file', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

