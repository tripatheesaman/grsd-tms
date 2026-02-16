'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/Loading'
import { formatDate, calculateDaysUntilDeadline, stripHtml, truncateText } from '@/lib/utils'
import { Task, TaskStatus, UserRole } from '@/types'
import { withBasePath } from '@/lib/base-path'

export default function TasksPage() {
  const getTaskPreview = (task: Task, isNotice: boolean, length = 200) => {
    const source = isNotice ? task.issuanceMessage : task.descriptionOfWork
    const plain = stripHtml(source || '')
    if (!plain) return ''
    return truncateText(plain, length)
  }
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  
  
  const [recordNumberSearch, setRecordNumberSearch] = useState<string>('')
  const [descriptionSearch, setDescriptionSearch] = useState<string>('')
  const [assigneeSearch, setAssigneeSearch] = useState<string>('')
  const [creatorSearch, setCreatorSearch] = useState<string>('')
  
  
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  )
  const [priorityFilter, setPriorityFilter] = useState<string>(
    searchParams.get('priority') || 'all'
  )
  const [assignedFilter, setAssignedFilter] = useState<string>(
    searchParams.get('assignedTo') || 'all'
  )
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get('sortBy') || 'deadline'
  )
  
  
  const [dueDateFrom, setDueDateFrom] = useState<string>('')
  const [dueDateTo, setDueDateTo] = useState<string>('')
  const [createdDateFrom, setCreatedDateFrom] = useState<string>('')
  const [createdDateTo, setCreatedDateTo] = useState<string>('')
  const [canCreateTasks, setCanCreateTasks] = useState<boolean | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
  useEffect(() => {
    let isMounted = true
    const checkPermission = async () => {
      try {
        const response = await fetch(withBasePath('/api/auth/me'))
        if (!response.ok) {
          throw new Error('Failed to load user info')
        }
        const data = await response.json()
        const userInfo = data?.user
        const allowed =
          userInfo?.role === 'SUPERADMIN' || userInfo?.canCreateTasks
        if (isMounted) {
          setCanCreateTasks(Boolean(allowed))
          setCurrentUserId(userInfo?.id ?? null)
          setCurrentUserRole(userInfo?.role ?? null)
        }
      } catch (error) {
        if (isMounted) {
          setCanCreateTasks(false)
        }
      }
    }

    checkPermission()
    return () => {
      isMounted = false
    }
  }, [])


  
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      
      if (recordNumberSearch.trim()) {
        params.append('recordNumber', recordNumberSearch.trim())
      }
      if (descriptionSearch.trim()) {
        params.append('description', descriptionSearch.trim())
      }
      if (assigneeSearch.trim()) {
        params.append('assignee', assigneeSearch.trim())
      }
      if (creatorSearch.trim()) {
        params.append('creator', creatorSearch.trim())
      }
      
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }
      if (assignedFilter === 'me') {
        params.append('assignedTo', 'me')
      } else if (assignedFilter === 'unassigned') {
        params.append('assignedTo', 'unassigned')
      }
      if (sortBy !== 'deadline') {
        params.append('sortBy', sortBy)
      }
      
      
      if (dueDateFrom) {
        params.append('dueDateFrom', dueDateFrom)
      }
      if (dueDateTo) {
        params.append('dueDateTo', dueDateTo)
      }
      if (createdDateFrom) {
        params.append('createdDateFrom', createdDateFrom)
      }
      if (createdDateTo) {
        params.append('createdDateTo', createdDateTo)
      }

      const response = await fetch(withBasePath(`/api/tasks?${params.toString()}`))
      const data = await response.json()

      if (response.ok) {
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [
    recordNumberSearch,
    descriptionSearch,
    assigneeSearch,
    creatorSearch,
    statusFilter,
    priorityFilter,
    assignedFilter,
    sortBy,
    dueDateFrom,
    dueDateTo,
    createdDateFrom,
    createdDateTo,
  ])

  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTasks()
    }, 500) 

    return () => clearTimeout(timeoutId)
  }, [
    recordNumberSearch,
    descriptionSearch,
    assigneeSearch,
    creatorSearch,
    fetchTasks,
  ])

  
  useEffect(() => {
    fetchTasks()
  }, [statusFilter, priorityFilter, assignedFilter, sortBy, dueDateFrom, dueDateTo, createdDateFrom, createdDateTo, fetchTasks])

  const clearFilters = () => {
    setRecordNumberSearch('')
    setDescriptionSearch('')
    setAssigneeSearch('')
    setCreatorSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setAssignedFilter('all')
    setSortBy('deadline')
    setDueDateFrom('')
    setDueDateTo('')
    setCreatedDateFrom('')
    setCreatedDateTo('')
  }

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage and track all tasks</p>
          {canCreateTasks === false && (
            <p className="text-sm text-amber-600 mt-2">
              You do not have permission to create new tasks.
            </p>
          )}
        </div>
        <Button
          onClick={() => router.push('/tasks/new')}
          disabled={!canCreateTasks}
          variant={canCreateTasks ? 'primary' : 'outline'}
        >
          Create New Task
        </Button>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-sm"
            >
              Clear All Filters
            </Button>
          </div>
          
          {}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Search</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Record Number"
                type="text"
                value={recordNumberSearch}
                onChange={(e) => setRecordNumberSearch(e.target.value)}
                placeholder="e.g., TMS-ABC123"
              />
              <Input
                label="Description"
                type="text"
                value={descriptionSearch}
                onChange={(e) => setDescriptionSearch(e.target.value)}
                placeholder="Search in description..."
              />
              <Input
                label="Assignee"
                type="text"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                placeholder="Name or email..."
              />
              <Input
                label="Creator"
                type="text"
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                placeholder="Name or email..."
              />
            </div>
          </div>

          {}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Due Date From"
                type="date"
                value={dueDateFrom}
                onChange={(e) => setDueDateFrom(e.target.value)}
              />
              <Input
                label="Due Date To"
                type="date"
                value={dueDateTo}
                onChange={(e) => setDueDateTo(e.target.value)}
              />
              <Input
                label="Created Date From"
                type="date"
                value={createdDateFrom}
                onChange={(e) => setCreatedDateFrom(e.target.value)}
              />
              <Input
                label="Created Date To"
                type="date"
                value={createdDateTo}
                onChange={(e) => setCreatedDateTo(e.target.value)}
              />
            </div>
          </div>

          {}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />

            <Select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />

            <Select
              label="Assignment"
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Tasks' },
                { value: 'me', label: 'My Tasks' },
                { value: 'unassigned', label: 'Unassigned' },
              ]}
            />

            <Select
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'deadline', label: 'Deadline (Earliest)' },
                { value: 'priority', label: 'Priority (High to Low)' },
                { value: 'created', label: 'Created Date (Newest)' },
                { value: 'status', label: 'Status' },
              ]}
            />
          </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No tasks found</p>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const isAdminViewer =
              currentUserRole === 'SUPERADMIN' || currentUserRole === 'DIRECTOR'
            const isCurrentAssignee =
              task.assignedTo?.id && task.assignedTo.id === currentUserId
            const showDeadline =
              task.status !== 'COMPLETED' &&
              task.status !== 'CLOSED' &&
              (isAdminViewer || isCurrentAssignee)
            const daysLeft = showDeadline
              ? calculateDaysUntilDeadline(task.assignedCompletionDate)
              : 0
            const isNotice = task.isNotice
            return (
              <Link key={task.id} href={withBasePath(`/tasks/${task.id}`)}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isNotice 
                    ? 'border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50' 
                    : ''
                }`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {isNotice && (
                            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                              📢 NOTICE
                            </span>
                          )}
                          <h3 className={`text-lg font-semibold ${isNotice ? 'text-blue-900' : 'text-gray-900'}`}>
                            {task.recordNumber}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500">
                          {isNotice ? 'Posted' : 'Created'} by {task.createdBy?.name || 'Unknown'} on{' '}
                          {formatDate(task.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isNotice && (
                          <Badge variant={getPriorityColor(task.priority?.name || '')}>
                            {task.priority?.name || 'Unknown'}
                          </Badge>
                        )}
                        <Badge variant={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <p
                      className={`mb-4 line-clamp-2 ${
                        isNotice ? 'text-gray-800 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {getTaskPreview(task, Boolean(isNotice), isNotice ? 250 : 200)}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div>
                        {(() => {
                          
                          const allAssignees: Array<{ name: string; email: string }> = []
                          if (task.assignedTo) {
                            allAssignees.push(task.assignedTo)
                          }
                          
                          
                          if (task.externalAssigneeName || task.externalAssigneeEmail) {
                            const externalNames = task.externalAssigneeName
                              ? task.externalAssigneeName.split(',').map((n: string) => n.trim()).filter((n: string) => Boolean(n))
                              : []
                            const externalEmails = task.externalAssigneeEmail
                              ? task.externalAssigneeEmail.split(',').map((e: string) => e.trim()).filter((e: string) => Boolean(e))
                              : []
                            
                            externalNames.forEach((name: string) => {
                              allAssignees.push({
                                name: name.toUpperCase(),
                                email: '',
                              })
                            })
                            
                            externalEmails.forEach((email: string) => {
                              allAssignees.push({
                                name: email.toLowerCase(),
                                email: email.toLowerCase(),
                              })
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
                            return <span className="text-gray-400">Unassigned</span>
                          } else if (allAssignees.length === 1) {
                            return <span>Assigned to: {allAssignees[0].name}</span>
                          } else {
                            return (
                              <span>
                                Assigned to: {allAssignees[0].name} and {allAssignees.length - 1} other{allAssignees.length - 1 > 1 ? 's' : ''}
                              </span>
                            )
                          }
                        })()}
                      </div>
                      <div className="flex items-center gap-4">
                        {!isNotice && (
                          <>
                            <span>
                              Due: {formatDate(task.assignedCompletionDate)}
                            </span>
                            {showDeadline ? (
                              daysLeft >= 0 ? (
                                <span
                                  className={
                                    daysLeft <= 3
                                      ? 'text-red-600 font-medium'
                                      : daysLeft <= 7
                                      ? 'text-yellow-600 font-medium'
                                      : 'text-gray-600'
                                  }
                                >
                                  {daysLeft} days left
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  Overdue by {Math.abs(daysLeft)} days
                                </span>
                              )
                            ) : (
                              <span className="text-gray-500 font-medium">
                                Task completed
                              </span>
                            )}
                          </>
                        )}
                        {isNotice && (
                          <span className="text-blue-600 font-medium">
                            📌 Informational Notice
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

