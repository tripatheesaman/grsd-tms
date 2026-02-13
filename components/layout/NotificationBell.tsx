'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

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
    }
    descriptionOfWork: string
  }
}

export function NotificationBell() {
  const router = useRouter()
  const toast = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [lastPopupTime, setLastPopupTime] = useState<{ [key: string]: number }>({})

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=20')
      const data = await response.json()

      if (response.ok) {
        const previousUnreadCount = unreadCount
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)

        
        const unreadNotifications = (data.notifications || []).filter((n: Notification) => !n.read)
        const now = Date.now()
        
        unreadNotifications.forEach((notification: Notification) => {
          const lastPopup = lastPopupTime[notification.id] || 0
          
          if (now - lastPopup >= 60000) {
            toast.info(notification.message, 5000)
            setLastPopupTime((prev) => ({ ...prev, [notification.id]: now }))
          }
        })

        
        if (data.unreadCount > previousUnreadCount && previousUnreadCount > 0) {
          const newNotifications = unreadNotifications.filter(
            (n: Notification) => !lastPopupTime[n.id]
          )
          if (newNotifications.length > 0) {
            toast.info(`You have ${newNotifications.length} new notification(s)`, 3000)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
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

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read)
          .map((n) =>
            fetch('/api/notifications', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                notificationId: n.id,
                read: true,
              }),
            })
          )
      )
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.task) {
      router.push(`/tasks/${notification.task.id}`)
      setIsOpen(false)
    }
  }

  const getPriorityColor = (priorityName: string) => {
    const upper = priorityName.toUpperCase()
    if (upper.includes('URGENT') || upper.includes('IMPORTANT')) {
      return 'danger'
    }
    if (upper.includes('HIGH') || upper.includes('IMPORTANT')) {
      return 'warning'
    }
    if (upper.includes('MEDIUM') || upper.includes('NORMAL')) {
      return 'info'
    }
    if (upper.includes('LOW')) {
      return 'default'
    }
    return 'default'
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        size="lg"
        footer={
          unreadCount > 0 ? (
            <div className="flex justify-end">
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Mark all as read
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="max-h-[600px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    notification.read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-300 shadow-md'
                  } hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      {notification.task && (
                        <div className="mt-2 space-y-1">
                          <div
                            className="text-sm text-gray-600 line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: (notification.task.descriptionOfWork || '').substring(0, 150),
                            }}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={getPriorityColor(String(notification.task.priority?.name || ''))}
                              size="sm"
                            >
                              {String(notification.task.priority?.name || 'Unknown')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Due: {formatDate(notification.task.assignedCompletionDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

