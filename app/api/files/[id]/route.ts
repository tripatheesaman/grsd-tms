import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
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

    
    const buffer = await readFile(attachment.filepath)
    const mimeType = attachment.mimeType || 'application/octet-stream'
    const disposition = `${
      mimeType === 'application/pdf' || mimeType.startsWith('image/')
        ? 'inline'
        : 'attachment'
    }; filename="${encodeURIComponent(attachment.filename)}"`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    logger.error('Error downloading file', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

