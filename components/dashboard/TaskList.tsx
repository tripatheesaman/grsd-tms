'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, calculateDaysUntilDeadline, stripHtml, truncateText } from '@/lib/utils'
import { Task, TaskStatus } from '@/types'

interface TaskListProps {
  tasks: Task[]
  title: string
  emptyMessage?: string
}

export function TaskList({ tasks, title, emptyMessage = 'No tasks found' }: TaskListProps) {
  const getExcerpt = (content: string | null | undefined, length = 150) => {
    const plain = stripHtml(content ?? '')
    if (!plain) return ''
    return truncateText(plain, length)
  }

  
  const normalizedTasks = useMemo(() => {
    return tasks.map((task) => {
      
      const normalizedTask: any = {
        ...task,
        descriptionOfWork: String(task.descriptionOfWork ?? ''),
        issuanceMessage: String(task.issuanceMessage ?? ''),
        
        priority: task.priority ? {
          id: String(task.priority.id || ''),
          name: String(task.priority.name || ''),
          order: Number(task.priority.order || 0),
        } : null,
      }
      return normalizedTask
    })
  }, [tasks])

  const getPriorityColor = (priorityName: string) => {
    const name = priorityName?.toUpperCase() || ''
    if (name.includes('URGENT') && name.includes('IMPORTANT')) {
      return 'danger'
    }
    if (name.includes('URGENT')) {
      return 'danger'
    }
    if (name.includes('IMPORTANT')) {
      return 'warning'
    }
    if (name.includes('NORMAL')) {
      return 'default'
    }
    return 'default'
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'CLOSED':
        return 'success'
      case 'COMPLETED':
        return 'info'
      case 'IN_PROGRESS':
        return 'warning'
      case 'ACTIVE':
        return 'default'
      default:
        return 'default'
    }
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <p className="text-gray-500 text-center py-4">{emptyMessage}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {normalizedTasks.map((task) => {
            const showDeadline =
              task.status !== 'COMPLETED' && task.status !== 'CLOSED'
            const daysLeft = showDeadline
              ? calculateDaysUntilDeadline(task.assignedCompletionDate)
              : 0
            const isOverdue = showDeadline && daysLeft < 0
            const isUrgent = showDeadline && daysLeft <= 3 && !isOverdue
            const isApproaching =
              showDeadline && daysLeft <= 7 && daysLeft > 3 && !isOverdue

            const isNotice = task.isNotice
            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <div
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                    isNotice
                      ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50'
                      : showDeadline && isOverdue
                      ? 'border-red-300 bg-red-50'
                      : showDeadline && isUrgent
                      ? 'border-orange-300 bg-orange-50'
                      : showDeadline && isApproaching
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isNotice && (
                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            📢 NOTICE
                          </span>
                        )}
                        <h4 className={`font-semibold ${isNotice ? 'text-blue-900' : 'text-gray-900'}`}>
                          {task.recordNumber}
                        </h4>
                      </div>
                      <p
                        className={`text-sm line-clamp-2 ${
                          isNotice ? 'text-gray-700 font-medium' : 'text-gray-600'
                        }`}
                      >
                        {isNotice
                          ? getExcerpt(task.issuanceMessage, 150)
                          : getExcerpt(task.descriptionOfWork, 150)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!isNotice && (
                        <Badge variant={getPriorityColor(String(task.priority?.name || ''))} size="sm">
                          {String(task.priority?.name || 'Unknown')}
                        </Badge>
                      )}
                      <Badge variant={getStatusColor(task.status)} size="sm">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>
                      {(() => {
                        
                        const allAssignees: Array<{ name: string; email?: string }> = []
                        if (task.assignedTo) {
                          allAssignees.push(task.assignedTo)
                        }
                        
                        
                        if (task.externalAssigneeName || task.externalAssigneeEmail) {
                          const externalNames = task.externalAssigneeName
                            ? task.externalAssigneeName
                                .split(',')
                                .map((name: string) => name.trim())
                                .filter((name: string) => Boolean(name))
                            : []
                          const externalEmails = task.externalAssigneeEmail
                            ? task.externalAssigneeEmail
                                .split(',')
                                .map((email: string) => email.trim())
                                .filter((email: string) => Boolean(email))
                            : []
                          
                          externalNames.forEach((name: string) => {
                            allAssignees.push({ name: name.toUpperCase() })
                          })
                          
                          externalEmails.forEach((email: string) => {
                            allAssignees.push({ name: email.toLowerCase(), email: email.toLowerCase() })
                          })
                        }
                        
                        if ((task as any).assignments && Array.isArray((task as any).assignments)) {
                          (task as any).assignments.forEach((assignment: any) => {
                            if (assignment.user && !allAssignees.find(a => a.email && a.email === assignment.user.email)) {
                              allAssignees.push(assignment.user)
                            }
                          })
                        }
                        
                        if (allAssignees.length === 0) {
                          return 'Unassigned'
                        } else if (allAssignees.length === 1) {
                          return `Assigned to: ${allAssignees[0].name}`
                        } else {
                          return `Assigned to: ${allAssignees[0].name} and ${allAssignees.length - 1} other${allAssignees.length - 1 > 1 ? 's' : ''}`
                        }
                      })()}
                    </span>
                      {isNotice ? (
                        <span className="text-blue-600 font-medium">📌 Notice</span>
                      ) : showDeadline ? (
                        <div className="flex items-center gap-3">
                          <span>Due: {formatDate(task.assignedCompletionDate)}</span>
                          <span
                            className={`font-medium ${
                              isOverdue
                                ? 'text-red-600'
                                : isUrgent
                                ? 'text-orange-600'
                                : isApproaching
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {isOverdue
                              ? `Overdue by ${Math.abs(daysLeft)} days`
                              : `${daysLeft} days left`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-medium">Task completed</span>
                      )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

