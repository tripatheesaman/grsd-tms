import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendTaskNotificationEmail } from '@/lib/email'


export async function GET(request: NextRequest) {
  try {
    
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-change-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    })

    logger.info('Deleted old notifications', { count: deletedNotifications.count })

    
    
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const oldUnreadNotifications = await prisma.notification.findMany({
      where: {
        read: false,
        createdAt: {
          lt: oneDayAgo,
        },
        task: {
          is: {
            status: {
              notIn: ['COMPLETED', 'CLOSED'],
            },
          },
        },
        OR: [
          { lastReminderSent: null },
          { lastReminderSent: { lt: todayStart } },
        ],
      },
      include: {
        user: true,
        task: {
          include: {
            createdBy: {
              select: { name: true },
            },
            priority: {
              select: { name: true },
            },
            complexity: {
              select: { name: true },
            },
          },
        },
      },
    })

    let reminderEmailsSent = 0
    for (const notification of oldUnreadNotifications) {
      if (notification.task && notification.user) {
        try {
          
          const daysOld = Math.floor(
            (now.getTime() - notification.createdAt.getTime()) / (24 * 60 * 60 * 1000)
          )

          await sendTaskNotificationEmail(notification.user.email, {
            recordNumber: notification.task.recordNumber,
            issuanceMessage: `📧 REMINDER: You have an unread notification from ${daysOld} day(s) ago. ${notification.message}`,
            descriptionOfWork: notification.task.descriptionOfWork,
            priority: notification.task.priority?.name || 'Unknown',
            complexity: notification.task.complexity?.name || 'Unknown',
            assignedCompletionDate: notification.task.assignedCompletionDate.toISOString(),
            creatorName: notification.task.createdBy?.name || 'System',
            taskId: notification.task.id,
          })

          
          await prisma.notification.update({
            where: { id: notification.id },
            data: { lastReminderSent: now },
          })

          reminderEmailsSent++
          logger.info('Sent reminder email for old notification', {
            notificationId: notification.id,
            userId: notification.userId,
            daysOld,
          })
        } catch (error) {
          logger.error('Error sending reminder email', error, {
            notificationId: notification.id,
          })
        }
      }
    }

    
    
    const tasksDueSoon = await prisma.task.findMany({
      where: {
        status: {
          notIn: ['CLOSED', 'COMPLETED'],
        },
        assignedToId: {
          not: null,
        },
        assignedCompletionDate: {
          lte: twoDaysFromNow,
          gte: now,
        },
        OR: [
          { lastDeadlineReminder: null },
          { lastDeadlineReminder: { lt: todayStart } },
        ],
      },
      include: {
        assignedTo: true,
        createdBy: {
          select: { name: true },
        },
        priority: {
          select: { name: true },
        },
        complexity: {
          select: { name: true },
        },
      },
    })

    let deadlineRemindersSent = 0
    for (const task of tasksDueSoon) {
      if (task.assignedTo) {
        try {
          const daysLeft = Math.ceil(
            (task.assignedCompletionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          )

          await sendTaskNotificationEmail(task.assignedTo.email, {
            recordNumber: task.recordNumber,
            issuanceMessage: `⏰ DEADLINE REMINDER: This task is due in ${daysLeft} day(s)! Please complete it soon.`,
            descriptionOfWork: task.descriptionOfWork,
            priority: task.priority?.name || 'Unknown',
            complexity: task.complexity?.name || 'Unknown',
            assignedCompletionDate: task.assignedCompletionDate.toISOString(),
            creatorName: task.createdBy?.name || 'System',
            taskId: task.id,
          })

          
          await prisma.task.update({
            where: { id: task.id },
            data: { lastDeadlineReminder: now },
          })

          deadlineRemindersSent++
          logger.info('Sent deadline reminder email', {
            taskId: task.id,
            userId: task.assignedToId,
            daysLeft,
          })
        } catch (error) {
          logger.error('Error sending deadline reminder email', error, {
            taskId: task.id,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedNotifications: deletedNotifications.count,
      reminderEmailsSent,
      deadlineRemindersSent,
    })
  } catch (error) {
    logger.error('Error in notification cron job', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

