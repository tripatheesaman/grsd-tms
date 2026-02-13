'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/forms/RichTextEditor'
import { UserSelector } from '@/components/forms/UserSelector'
import { FileUpload } from '@/components/forms/FileUpload'
import { useToast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/Loading'

interface User {
  id: string
  email: string
  name: string
}

export default function NewTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    issuanceMessage: '',
    descriptionOfWork: '',
    priorityId: '',
    complexityId: '',
    assignedPersonnelId: '',
    workcenterId: '',
    assignedCompletionDate: '',
    isNotice: false,
  })
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [canCreateTasks, setCanCreateTasks] = useState<boolean | null>(null)
  const [priorities, setPriorities] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [complexities, setComplexities] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [personnel, setPersonnel] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [workcenters, setWorkcenters] = useState<Array<{ id: string; name: string }>>([])
  const [linkedReceive, setLinkedReceive] = useState<{
    id: string
    referenceNumber: string
    subject: string
    receivedFrom: string
    status: string
  } | null>(null)
  const [receiveError, setReceiveError] = useState<string | null>(null)
  const [receiveLoading, setReceiveLoading] = useState(false)

  const receiveId = searchParams?.get('receiveId')

  useEffect(() => {
    let isMounted = true
    const checkPermission = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) {
          throw new Error('Failed to load user info')
        }
        const data = await response.json()
        const allowed =
          data?.user?.role === 'SUPERADMIN' || data?.user?.canCreateTasks
        if (isMounted) {
          setCanCreateTasks(Boolean(allowed))
        }
      } catch (error) {
        if (isMounted) {
          setCanCreateTasks(false)
        }
      }
    }

    const fetchPriorities = async () => {
      try {
        const response = await fetch('/api/priorities')
        if (response.ok) {
          const data = await response.json()
          if (isMounted && data.priorities) {
            setPriorities(data.priorities)
            
            if (data.priorities.length > 0 && !formData.priorityId) {
              setFormData(prev => ({ ...prev, priorityId: data.priorities[0].id }))
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch priorities', error)
      }
    }

    const fetchComplexities = async () => {
      try {
        const response = await fetch('/api/complexities')
        if (response.ok) {
          const data = await response.json()
          if (isMounted && data.complexities) {
            setComplexities(data.complexities)
            
            if (data.complexities.length > 0 && !formData.complexityId) {
              setFormData(prev => ({ ...prev, complexityId: data.complexities[0].id }))
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch complexities', error)
      }
    }

    const fetchPersonnel = async () => {
      try {
        const response = await fetch('/api/personnel')
        if (response.ok) {
          const data = await response.json()
          if (isMounted && data.personnel) {
            setPersonnel(data.personnel)
          }
        }
      } catch (error) {
        console.error('Failed to fetch assigned personnel', error)
      }
    }

    const fetchWorkcenters = async () => {
      try {
        const response = await fetch('/api/workcenters')
        if (response.ok) {
          const data = await response.json()
          if (isMounted && data.workcenters) {
            setWorkcenters(data.workcenters)
          }
        }
      } catch (error) {
        console.error('Failed to fetch workcenters', error)
      }
    }

    checkPermission()
    fetchPriorities()
    fetchComplexities()
    fetchPersonnel()
    fetchWorkcenters()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const fetchReceive = async () => {
      if (!receiveId) {
        setLinkedReceive(null)
        setReceiveError(null)
        return
      }
      setReceiveLoading(true)
      setReceiveError(null)
      try {
        const response = await fetch(`/api/receives/${receiveId}`)
        const data = await response.json()
        if (!response.ok) {
          setReceiveError(data.error || 'Unable to load receive details')
          setLinkedReceive(null)
          return
        }
        setLinkedReceive(data.receive)
      } catch (error) {
        setReceiveError('Unable to load receive details')
        setLinkedReceive(null)
      } finally {
        setReceiveLoading(false)
      }
    }

    fetchReceive()
  }, [receiveId])

  
  useEffect(() => {
    if (formData.isNotice) {
      
      return
    }

    const internalUsers = selectedUsers.filter(
      (u) => u.id && !u.id.startsWith('external-') && u.id !== 'allstaff'
    )

    if (internalUsers.length === 0) {
      
      setFormData((prev) => ({ ...prev, workcenterId: '' }))
      return
    }

    
    const fetchUserWorkcenters = async () => {
      try {
        const userIds = internalUsers.map((u) => u.id)
        const response = await fetch('/api/users/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        })
        if (response.ok) {
          const data = await response.json()
          const usersWithWorkcenters = data.users || []
          const workcenterIds = usersWithWorkcenters
            .map((u: any) => u.workcenterId as string | null)
            .filter((id: string | null): id is string => typeof id === 'string' && id.length > 0)

          if (workcenterIds.length === 0) {
            
            setFormData((prev) => ({ ...prev, workcenterId: '' }))
            return
          }

          
          const uniqueWorkcenterIds = Array.from(new Set(workcenterIds)) as string[]
          if (uniqueWorkcenterIds.length === 1) {
            
            setFormData((prev) => ({
              ...prev,
              workcenterId: uniqueWorkcenterIds[0],
            }))
          } else {
            
            setFormData((prev) => ({ ...prev, workcenterId: '' }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch user workcenters', error)
      }
    }

    fetchUserWorkcenters()
  }, [selectedUsers, formData.isNotice])

  const priorityOptions = priorities
    .sort((a, b) => a.order - b.order)
    .map((p) => ({ value: p.id, label: p.name }))

  const complexityOptions = complexities
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ value: c.id, label: c.name }))

  const personnelOptions = [
    { value: '', label: 'None' },
    ...personnel
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ value: p.id, label: p.name })),
  ]

  const workcenterOptions = [
    { value: '', label: 'None' },
    ...workcenters.map((w) => ({ value: w.id, label: w.name })),
  ]

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.descriptionOfWork.trim()) {
      newErrors.descriptionOfWork = 'Description of work is required'
    }

    if (!formData.priorityId) {
      newErrors.priorityId = 'Priority is required'
    }

    if (!formData.complexityId) {
      newErrors.complexityId = 'Complexity is required'
    }

    
    
    if (!formData.isNotice) {
      if (!formData.assignedCompletionDate) {
        newErrors.assignedCompletionDate = 'Completion date is required'
      } else {
        const date = new Date(formData.assignedCompletionDate)
        if (date < new Date()) {
          newErrors.assignedCompletionDate = 'Completion date must be in the future'
        }
      }
    }

    if (selectedUsers.length === 0) {
      newErrors.assignedTo = 'At least one assignee is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    if (receiveId && !linkedReceive) {
      toast.error('Linked receive could not be loaded')
      return
    }

    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('issuanceMessage', formData.issuanceMessage)
      formDataToSend.append('descriptionOfWork', formData.descriptionOfWork)
      formDataToSend.append('priorityId', formData.priorityId)
      formDataToSend.append('complexityId', formData.complexityId)
      if (formData.assignedPersonnelId && !formData.isNotice) {
        formDataToSend.append('assignedPersonnelId', formData.assignedPersonnelId)
      }
      if (formData.workcenterId && !formData.isNotice) {
        formDataToSend.append('workcenterId', formData.workcenterId)
      }
      
      if (formData.assignedCompletionDate) {
        formDataToSend.append('assignedCompletionDate', formData.assignedCompletionDate)
      }
      formDataToSend.append('isNotice', formData.isNotice.toString())

      
      if (selectedUsers.length > 0) {
        const userIds = selectedUsers.map(u => u.id)
        formDataToSend.append('assignedToIds', JSON.stringify(userIds))
      }

      if (selectedFile) {
        formDataToSend.append('file', selectedFile)
      }

      if (linkedReceive) {
        formDataToSend.append('receiveId', linkedReceive.id)
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create task')
        setLoading(false)
        return
      }

      toast.success('Task created successfully!')
      router.push(`/tasks/${data.task.id}`)
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (canCreateTasks === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (canCreateTasks === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Task Creation Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              You do not have permission to create tasks. Please contact a superadmin if you believe this is a mistake.
            </p>
            <Button variant="outline" onClick={() => router.push('/tasks')}>
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
        <p className="text-gray-600 mt-1">Fill in the details to create a new task</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          {receiveId && (
            <div className="p-4 border rounded-lg mb-6 bg-blue-50 border-blue-200">
              {receiveLoading ? (
                <div className="text-sm text-gray-600">Loading receive information...</div>
              ) : receiveError ? (
                <div className="text-sm text-red-600">{receiveError}</div>
              ) : linkedReceive ? (
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Receive Reference:</strong> {linkedReceive.referenceNumber}</p>
                  <p><strong>Subject:</strong> {linkedReceive.subject}</p>
                  <p><strong>Received From:</strong> {linkedReceive.receivedFrom}</p>
                  <p><strong>Status:</strong> {linkedReceive.status}</p>
                </div>
              ) : null}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <UserSelector
                label={formData.isNotice ? "Send Notice To" : "Assign To"}
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
                allowExternal={true}
                error={errors.assignedTo}
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isNotice}
                  onChange={(e) =>
                    setFormData({ ...formData, isNotice: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  This is a notice (will be sent to all selected users and marked as closed)
                </span>
              </label>
            </div>

            <div>
              <RichTextEditor
                label="Description of Work"
                value={formData.descriptionOfWork}
                onChange={(value) =>
                  setFormData({ ...formData, descriptionOfWork: value })
                }
                placeholder="Enter detailed description of the work..."
                error={errors.descriptionOfWork}
              />
            </div>

            <div>
              <RichTextEditor
                label="Issuance Message (Optional)"
                value={formData.issuanceMessage}
                onChange={(value) =>
                  setFormData({ ...formData, issuanceMessage: value })
                }
                placeholder="Enter issuance message..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Priority"
                  options={priorityOptions}
                  value={formData.priorityId}
                  onChange={(e) =>
                    setFormData({ ...formData, priorityId: e.target.value })
                  }
                  required
                  disabled={priorityOptions.length === 0}
                  error={errors.priorityId}
                />
              </div>

              <div>
                <Select
                  label="Complexity"
                  options={complexityOptions}
                  value={formData.complexityId}
                  onChange={(e) =>
                    setFormData({ ...formData, complexityId: e.target.value })
                  }
                  required
                  disabled={complexityOptions.length === 0}
                  error={errors.complexityId}
                />
              </div>
            </div>

            {!formData.isNotice && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Assigned Personnel"
                    options={personnelOptions}
                    value={formData.assignedPersonnelId}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedPersonnelId: e.target.value })
                    }
                    disabled={personnelOptions.length === 1}
                  />
                </div>

                <div>
                  <Select
                    label="Workcenter"
                    options={workcenterOptions}
                    value={formData.workcenterId}
                    onChange={(e) =>
                      setFormData({ ...formData, workcenterId: e.target.value })
                    }
                    disabled={workcenterOptions.length === 1}
                  />
                </div>
              </div>
            )}

            {!formData.isNotice && (
              <div>
                <Input
                  label="Assigned Completion Date"
                  type="datetime-local"
                  value={formData.assignedCompletionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedCompletionDate: e.target.value })
                  }
                  required
                  error={errors.assignedCompletionDate}
                />
              </div>
            )}

            <div>
              <FileUpload
                label="Attachment (Optional)"
                onFileSelect={setSelectedFile}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
              >
                Create Task
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

