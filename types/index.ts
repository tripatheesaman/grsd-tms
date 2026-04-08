export type UserRole =
  | 'SUPERADMIN'
  | 'DIRECTOR'
  | 'DY_DIRECTOR'
  | 'MANAGER'
  | 'INCHARGE'
  | 'EMPLOYEE'
export type TaskStatus = 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'
export interface Complexity {
  id: string
  name: string
  order: number
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AssignedPersonnel {
  id: string
  name: string
  order: number
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Priority {
  id: string
  name: string
  order: number
  description?: string | null
  createdAt: Date
  updatedAt: Date
}
export type TaskActionType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'FORWARDED'
  | 'SUBMITTED'
  | 'ADD_INFO'
  | 'CLOSED'
  | 'REVERTED'
  | 'EDITED'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_FORWARDED' | 'TASK_CLOSED' | 'TASK_UPDATED'
export type ReceiveStatus = 'OPEN' | 'ASSIGNED' | 'CLOSED'
export type TaskSubmissionStatus = 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'REJECTED' | 'FORWARDED'
export type TaskSubmissionMode = 'SINGLE' | 'MULTIPLE'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  designation?: string
  staffId?: string
  workcenterId?: string
  createdAt: Date
  updatedAt: Date
  canCreateTasks?: boolean
  canManageComplexities?: boolean
  canManagePersonnel?: boolean
  canManageWorkcenters?: boolean
  canManagePriorities?: boolean
  canManageUsers?: boolean
  canManageSettings?: boolean
  canManageReceives?: boolean
  canViewAllSubmissions?: boolean
  canApproveCompletions?: boolean
  canRevertCompletions?: boolean
  canViewReports?: boolean
  includeInAllStaff?: boolean
  workcenter?: Workcenter
}

export interface Task {
  id: string
  recordNumber: string
  fileNumber?: string | null
  submissionMode?: TaskSubmissionMode
  issuanceDate: Date
  issuanceMessage?: string | null
  descriptionOfWork: string
  assignedToId?: string | null
  priorityId: string
  priority?: Priority
  complexityId: string
  complexity?: Complexity
  assignedPersonnelId?: string | null
  assignedPersonnel?: AssignedPersonnel | null
  workcenterId?: string | null
  workcenter?: Workcenter | null
  status: TaskStatus
  assignedCompletionDate: Date
  createdById: string
  createdAt: Date
  updatedAt: Date
  isNotice?: boolean
  receiveId?: string | null
  createdBy?: User
  assignedTo?: User | null
  attachments?: TaskAttachment[]
  actions?: TaskAction[]
  history?: TaskHistory[]
  externalAssigneeName?: string | null
  externalAssigneeEmail?: string | null
  receive?: Receive | null
  submissions?: TaskSubmission[]
}

export interface TaskSubmission {
  id: string
  taskId: string
  userId: string
  status: TaskSubmissionStatus
  submissionDescription?: string | null
  attachmentFilename?: string | null
  attachmentFilepath?: string | null
  attachmentMimeType?: string | null
  attachmentSize?: number | null
  submittedAt?: Date | null
  acknowledgedAt?: Date | null
  acknowledgedById?: string | null
  rejectedAt?: Date | null
  rejectedById?: string | null
  rejectionReason?: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
}

export interface TaskAttachment {
  id: string
  taskId: string
  filename: string
  filepath: string
  fileSize?: number | null
  mimeType?: string | null
  uploadedById: string
  createdAt: Date
}

export interface TaskAction {
  id: string
  taskId: string
  actionType: TaskActionType
  description?: string | null
  performedById: string
  forwardedToId?: string | null
  forwardedToEmail?: string | null
  referenceNumber?: string | null
  createdAt: Date
  performedBy?: User
  forwardedTo?: User | null
}

export interface TaskHistory {
  id: string
  taskId: string
  action: string
  oldValue?: string | null
  newValue?: string | null
  changedById: string
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  taskId?: string | null
  type: NotificationType
  message: string
  read: boolean
  createdAt: Date
}

export interface Workcenter {
  id: string
  name: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Receive {
  id: string
  referenceNumber: string
  letterReferenceNumber?: string | null
  receivedFrom: string
  subject: string
  receivedDate: Date
  status: ReceiveStatus
  createdById: string
  closedById?: string | null
  createdAt: Date
  updatedAt: Date
  closedAt?: Date | null
}

