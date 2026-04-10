import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { logger } from '@/lib/logger'
import { canAccessTaskWorkspace } from '@/lib/task-visibility'

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

    const viewer = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        role: true,
        canViewAllSubmissions: true,
        canApproveCompletions: true,
      },
    })
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            assignedToId: true,
            createdById: true,
            assignments: {
              select: {
                userId: true,
              },
            },
            actions: {
              select: { performedById: true, forwardedToId: true },
            },
            submissions: { select: { userId: true } },
            history: { select: { changedById: true } },
            attachments: { select: { uploadedById: true } },
          },
        },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const task = attachment.task
    const hasAccess =
      attachment.uploadedById === user.userId ||
      canAccessTaskWorkspace(user.userId, viewer, {
        createdById: task.createdById,
        assignedToId: task.assignedToId,
        assignments: task.assignments,
        actions: task.actions ?? [],
        submissions: task.submissions ?? [],
        attachments: task.attachments ?? [],
        history: task.history ?? [],
      })

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

