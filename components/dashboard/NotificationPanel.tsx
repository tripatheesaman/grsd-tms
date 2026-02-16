'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/Loading'
import { formatDate, calculateDaysUntilDeadline, stripHtml, truncateText } from '@/lib/utils'
import { withBasePath } from '@/lib/base-path'

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  task?: {
    id: string
    recordNumber: string
    status: string
    assignedCompletionDate: string
    priority?: {
      name: string
    } | null
    descriptionOfWork: string
  }
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) 
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(withBasePath('/api/notifications?unreadOnly=true&limit=10'))
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(withBasePath('/api/notifications'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          read: true,
        }),
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const getPriorityColor = (priorityName: string) => {
    const normalized = priorityName?.toUpperCase() || ''
    switch (normalized) {
      case 'URGENT':
      case 'URGENT+IMPORTANT':
        return 'danger'
      case 'IMPORTANT':
      case 'HIGH':
        return 'warning'
      case 'NORMAL':
      case 'MEDIUM':
        return 'info'
      case 'LOW':
        return 'default'
      default:
        return 'default'
    }
  }

  const getExcerpt = (content: string | null | undefined, length = 150) => {
    const plain = stripHtml(content ?? '')
    if (!plain) return ''
    return truncateText(plain, length)
  }

  if (loading) {
    return (
      <Card
        variant="solid"
        className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border border-blue-100"
      >
        <CardContent className="py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      variant="solid"
      className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border border-blue-100"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="danger">{unreadCount} unread</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No new notifications</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const daysLeft = notification.task
                ? calculateDaysUntilDeadline(notification.task.assignedCompletionDate)
                : null

              return (
                <Link
                  key={notification.id}
                  href={notification.task ? `/tasks/${notification.task.id}` : '#'}
                  onClick={() => markAsRead(notification.id)}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900">{notification.message}</p>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1 ml-2" />
                    )}
                  </div>
                  {notification.task && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {getExcerpt(notification.task.descriptionOfWork, 150)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={getPriorityColor(String(notification.task.priority?.name || ''))}
                          size="sm"
                        >
                          {String(notification.task.priority?.name || 'Unknown')}
                        </Badge>
                        {daysLeft !== null && (
                          <span
                            className={`text-xs font-medium ${
                              daysLeft <= 3
                                ? 'text-red-600'
                                : daysLeft <= 7
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {daysLeft >= 0
                              ? `${daysLeft} days left`
                              : `Overdue by ${Math.abs(daysLeft)} days`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDate(notification.createdAt)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
        {notifications.length > 0 && (
          <Link
            href="/tasks"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4 font-medium"
          >
            View all tasks →
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

