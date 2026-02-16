'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatDateTime, calculateDaysUntilDeadline } from '@/lib/utils'
import { Task, TaskStatus, UserRole } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { TaskActions } from './TaskActions'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
import { FilePreview } from './FilePreview'
import { TaskEditModal } from './TaskEditModal'
import { withBasePath } from '@/lib/base-path'

interface TaskDetailsClientProps {
  task: Task & {
    attachments: Array<{
      id: string
      filename: string
      filepath: string
      fileSize?: number | null
      mimeType?: string | null
      createdAt: Date
      uploadedBy?: {
        id: string
        name: string
        email: string
      } | null
    }>
    actions: any[]
    history: any[]
    acknowledgedById?: string | null
    acknowledgedAt?: Date | null
    acknowledgedBy?: {
      id: string
      name: string
      email: string
    } | null
    receive?: {
      id: string
      referenceNumber: string
      receivedFrom: string
      subject: string
      status: string
    } | null
  }
  currentUser: {
    id: string
    role: UserRole
    canCreateTasks?: boolean
    canApproveCompletions?: boolean
    canRevertCompletions?: boolean
  }
}

export function TaskDetailsClient({ task, currentUser }: TaskDetailsClientProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  
  if (!task) {
    return <div>Task not found</div>
  }

  const isAdminViewer =
    currentUser.role === 'SUPERADMIN' || currentUser.role === 'DIRECTOR'
  const isCurrentAssignee = task.assignedTo?.id === currentUser.id
  const showDeadline =
    task.status !== 'COMPLETED' &&
    task.status !== 'CLOSED' &&
    (isAdminViewer || isCurrentAssignee)
  const daysLeft = showDeadline
    ? calculateDaysUntilDeadline(task.assignedCompletionDate)
    : 0
  const isOverdue = showDeadline ? daysLeft < 0 : false
  const isUrgent = showDeadline ? daysLeft <= 3 && !isOverdue : false

  const canEdit = (currentUser.role === 'SUPERADMIN' || currentUser.role === 'DIRECTOR') && 
    !(task.status === 'COMPLETED' && !task.acknowledgedById)
  const canDelete = currentUser.role === 'SUPERADMIN' || currentUser.role === 'DIRECTOR'
  const toast = useToast()

  
  const attachments = (Array.isArray(task?.attachments) ? task.attachments : []) as Array<{
    id: string
    filename: string
    filepath: string
    fileSize?: number | null
    mimeType?: string | null
    createdAt: Date
    uploadedBy?: {
      id: string
      name: string
      email: string
    } | null
  }>
  const actions = Array.isArray(task?.actions) ? task.actions : []
  const history = Array.isArray(task?.history) ? task.history : []

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(withBasePath(`/api/tasks/${task.id}`), {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete task')
        setDeleting(false)
        return
      }

      toast.success('Task deleted successfully!')
      router.push('/tasks')
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setDeleting(false)
    }
  }

  
  const allAssignees = useMemo(() => {
    try {
      const assignees = new Map<
        string,
        { key: string; name: string; email: string; assignedAt: Date | null }
      >()

      if (task?.assignedTo) {
        const key = `internal:${task.assignedTo.id}`
        assignees.set(key, {
          key,
          name: task.assignedTo.name,
          email: task.assignedTo.email,
          assignedAt: task.createdAt ?? null,
        })
      }

      
      if (task?.externalAssigneeName || task?.externalAssigneeEmail) {
        const externalNames = task.externalAssigneeName
          ? task.externalAssigneeName.split(',').map((n: string) => n.trim()).filter((n: string) => Boolean(n))
          : []
        const externalEmails = task.externalAssigneeEmail
          ? task.externalAssigneeEmail.split(',').map((e: string) => e.trim()).filter((e: string) => Boolean(e))
          : []

        
        externalNames.forEach((name: string) => {
          const key = `external-name:${name.toUpperCase()}`
          assignees.set(key, {
            key,
            name: name.toUpperCase(),
            email: '',
            assignedAt: task.createdAt ?? null,
          })
        })

        
        externalEmails.forEach((email: string) => {
          const normalizedEmail = email.toLowerCase()
          const key = `external-email:${normalizedEmail}`
          assignees.set(key, {
            key,
            name: normalizedEmail,
            email: normalizedEmail,
            assignedAt: task.createdAt ?? null,
          })
        })
      }

      if ((task as any)?.assignments && Array.isArray((task as any).assignments)) {
        (task as any).assignments.forEach((assignment: any) => {
          if (assignment?.user) {
            const key = `internal:${assignment.user.id}`
            assignees.set(key, {
              key,
              name: assignment.user.name,
              email: assignment.user.email,
              assignedAt: assignment.createdAt || task.createdAt || null,
            })
          }
        })
      }

      if (actions && Array.isArray(actions)) {
        actions.forEach((action: any) => {
          if (action?.actionType === 'FORWARDED' || action?.actionType === 'ASSIGNED') {
            if (action.forwardedTo) {
              const key = `internal:${action.forwardedTo.id}`
              assignees.set(key, {
                key,
                name: action.forwardedTo.name,
                email: action.forwardedTo.email,
                assignedAt: action.createdAt,
              })
            } else if (action.forwardedToEmail) {
              const key = emailRegex.test(action.forwardedToEmail)
                ? `external-email:${action.forwardedToEmail.toLowerCase()}`
                : `external-name:${action.forwardedToEmail}`
              assignees.set(key, {
                key,
                name: action.forwardedToEmail,
                email: emailRegex.test(action.forwardedToEmail)
                  ? action.forwardedToEmail.toLowerCase()
                  : '',
                assignedAt: action.createdAt,
              })
            }
          }
        })
      }

      return Array.from(assignees.values())
    } catch (error) {
      console.error('Error computing allAssignees:', error)
      return []
    }
  }, [task, actions])

  const currentAssigneeKey = useMemo(() => {
    if (task?.assignedTo) {
      return `internal:${task.assignedTo.id}`
    }
    if (task?.externalAssigneeEmail && emailRegex.test(task.externalAssigneeEmail)) {
      return `external-email:${task.externalAssigneeEmail.toLowerCase()}`
    }
    if (task?.externalAssigneeName) {
      return `external-name:${task.externalAssigneeName.toUpperCase()}`
    }
    if (task?.externalAssigneeEmail) {
      return `external-name:${task.externalAssigneeEmail}`
    }
    return null
  }, [task])

  const getPriorityColor = (priorityName: string) => {
    const upper = priorityName.toUpperCase()
    if (upper.includes('URGENT') || (upper.includes('IMPORTANT') && upper.includes('URGENT'))) {
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

  const getPriorityBgColor = (priorityName: string) => {
    const upper = priorityName.toUpperCase()
    if (upper.includes('URGENT') || (upper.includes('IMPORTANT') && upper.includes('URGENT'))) {
      return 'bg-red-50 border-red-200'
    }
    if (upper.includes('HIGH') || upper.includes('IMPORTANT')) {
      return 'bg-orange-50 border-orange-200'
    }
    if (upper.includes('MEDIUM') || upper.includes('NORMAL')) {
      return 'bg-yellow-50 border-yellow-200'
    }
    if (upper.includes('LOW')) {
      return 'bg-green-50 border-green-200'
    }
    return 'bg-gray-50 border-gray-200'
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

  const isNotice = task.isNotice

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/tasks"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Tasks
        </Link>
        
        {isNotice ? (
          
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-xl border-4 border-blue-300 p-8 mb-6 relative overflow-hidden">
            {}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                      📢 NOTICE
                    </div>
                    <Badge variant="info" size="lg" className="bg-indigo-100 text-indigo-800 border-2 border-indigo-300">
                      {task.recordNumber}
                    </Badge>
                  </div>
                  <p className="text-gray-700 text-sm">
                    <span className="font-semibold">Posted on</span> {formatDate(task.createdAt)} by <span className="font-medium text-blue-700">{task.createdBy?.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(canEdit || canDelete) && (
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setIsDeleteModalOpen(true)}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.recordNumber}</h1>
                <p className="text-gray-600">
                  Created on {formatDate(task.createdAt)} by <span className="font-medium">{task.createdBy?.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {(canEdit || canDelete) && (
                  <div className="flex gap-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </Button>
                    )}
                  </div>
                )}
                <Badge variant={getStatusColor(task.status)} size="lg">
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {}
            {showDeadline ? (
              <div className={`${getPriorityBgColor(task.priority?.name || '')} border-2 rounded-lg p-4 mb-4`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Priority</p>
                      <Badge variant={getPriorityColor(String(task.priority?.name || ''))} size="lg" className="text-base px-4 py-2">
                        {String(task.priority?.name || 'Unknown')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Due Date</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatDate(task.assignedCompletionDate)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-6 py-3 rounded-lg font-bold text-lg ${
                    isOverdue
                      ? 'bg-red-600 text-white animate-pulse'
                      : isUrgent
                      ? 'bg-orange-500 text-white'
                      : daysLeft <= 7
                      ? 'bg-yellow-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}>
                    {isOverdue ? (
                      <span>⚠️ OVERDUE BY {Math.abs(daysLeft)} DAYS</span>
                    ) : isUrgent ? (
                      <span>⚡ {daysLeft} DAYS LEFT - URGENT!</span>
                    ) : daysLeft <= 7 ? (
                      <span>⏰ {daysLeft} DAYS REMAINING</span>
                    ) : (
                      <span>✓ {daysLeft} DAYS REMAINING</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-gray-200 rounded-lg p-4 mb-4 bg-white">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Priority</p>
                    <Badge variant={getPriorityColor(task.priority?.name || '')} size="lg" className="text-base px-4 py-2">
                      {task.priority?.name || 'Unknown'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Due Date</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatDate(task.assignedCompletionDate)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Deadline tracking is handled by the current assignee.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isNotice ? (
            <>
              {}
              {task.issuanceMessage && (
                <Card className="border-4 border-blue-400 shadow-2xl bg-gradient-to-br from-white to-blue-50">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b-4 border-blue-700">
                    <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Notice Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div
                      className="prose prose-xl max-w-none text-gray-900 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: task.issuanceMessage }}
                    />
                  </CardContent>
                </Card>
              )}

              {}
              {task.descriptionOfWork && (
                <Card className="border-2 border-indigo-200 shadow-lg bg-indigo-50">
                  <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b-2 border-indigo-300">
                    <CardTitle className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div
                      className="prose prose-lg max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: task.descriptionOfWork }}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              {}
              <Card className="border-2 border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                  <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Description of Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div
                    className="prose prose-lg max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: task.descriptionOfWork }}
                  />
                </CardContent>
              </Card>

              {}
              {task.issuanceMessage && (
                <Card className="border-2 border-amber-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200">
                    <CardTitle className="text-xl font-bold text-amber-900 flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Issuance Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div
                      className="prose prose-lg max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: task.issuanceMessage }}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {}
          {attachments && Array.isArray(attachments) && attachments.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attachments ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(attachments) && attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded by {attachment.uploadedBy?.name} on {formatDate(attachment.createdAt)}
                            {attachment.fileSize && ` • ${(attachment.fileSize / 1024).toFixed(2)} KB`}
                          </p>
                        </div>
                      </div>
                      <FilePreview attachment={attachment} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Action History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {actions && Array.isArray(actions) && actions.length > 0 ? (
                  actions.map((action) => (
                    <div
                      key={action.id}
                      className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {action.actionType.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(action.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        by <span className="font-medium">{action.performedBy?.name || 'Unknown'}</span>
                      </p>
                      {action.description && (
                        <div
                          className="mt-2 text-sm text-gray-700 prose prose-sm max-w-none bg-white p-3 rounded border"
                          dangerouslySetInnerHTML={{ __html: action.description }}
                        />
                      )}
                      {action.forwardedTo && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Forwarded to:</span> {action.forwardedTo.name} ({action.forwardedTo.email})
                        </p>
                      )}
                      {action.forwardedToEmail && !action.forwardedTo && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Forwarded to:</span> {action.forwardedToEmail} (External)
                        </p>
                      )}
                      {action.referenceNumber && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Reference:</span> {action.referenceNumber}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No actions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="space-y-6">
          {}
          <Card className={`shadow-lg ${isNotice ? 'border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50' : ''}`}>
            <CardHeader className={`${isNotice ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
              <CardTitle className={isNotice ? 'text-white' : ''}>
                {isNotice ? '📢 Notice Information' : 'Task Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
                <Badge variant={getStatusColor(task.status)} size="lg" className="text-base">
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.status === 'COMPLETED' && !task.acknowledgedById && (
                  <p className="text-xs text-yellow-600 font-medium mt-2">
                    ⏳ Awaiting acknowledgment
                  </p>
                )}
                {task.status === 'COMPLETED' && task.acknowledgedById && task.acknowledgedBy && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 font-medium">
                      ✓ Acknowledged by {task.acknowledgedBy.name}
                    </p>
                    {task.acknowledgedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        on {formatDate(task.acknowledgedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {!isNotice && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Priority</p>
                    <Badge variant={getPriorityColor(String(task.priority?.name || ''))} size="lg" className="text-base">
                      {String(task.priority?.name || 'Unknown')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Complexity</p>
                    <p className="text-base font-medium text-gray-900">
                      {task.complexity?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Personnel</p>
                    <p className="text-base font-medium text-gray-900">
                      {task.assignedPersonnel?.name || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Workcenter</p>
                    <p className="text-base font-medium text-gray-900">
                      {task.workcenter?.name || 'Not specified'}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned To</p>
                {allAssignees && Array.isArray(allAssignees) && allAssignees.length > 0 ? (
                  <div className="space-y-2">
                    {allAssignees.map((assignee) => {
                      const isCurrent =
                        currentAssigneeKey !== null &&
                        assignee.key === currentAssigneeKey
                      return (
                        <div
                          key={assignee.key}
                          className="p-2 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {assignee.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {assignee.email || '—'}
                          </p>
                          {isCurrent && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-600 text-white rounded">
                              Current Assignee
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Due Date</p>
                <p className="text-base font-bold text-gray-900">
                  {formatDate(task.assignedCompletionDate)}
                </p>
                {showDeadline ? (
                  <p
                    className={`text-sm font-semibold mt-1 ${
                      isOverdue
                        ? 'text-red-600'
                        : isUrgent
                        ? 'text-orange-600'
                        : daysLeft <= 7
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    {isOverdue
                      ? `⚠️ Overdue by ${Math.abs(daysLeft)} days`
                      : `${daysLeft} days remaining`}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    Deadline tracking managed by the current assignee.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {task.receive && (currentUser.role === 'SUPERADMIN' || currentUser.canCreateTasks) && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Linked Receive</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Reference</span>
                  <span>{task.receive.referenceNumber}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Subject
                  </p>
                  <p>{task.receive.subject}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Received From</span>
                  <span>{task.receive.receivedFrom}</span>
                </div>
                <Badge variant="info">{task.receive.status}</Badge>
                <Link
                  href="/receives"
                  className="text-blue-600 text-sm inline-flex items-center gap-1 hover:underline"
                >
                  Manage Receives
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </CardContent>
            </Card>
          )}

          <TaskActions task={task} currentUser={currentUser} />
        </div>
      </div>

      <TaskEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
        onSuccess={() => {
          router.refresh()
        }}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Task"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete task <strong>{task.recordNumber}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleting}
              disabled={deleting}
              className="flex-1"
            >
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
