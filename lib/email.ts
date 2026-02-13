import nodemailer from 'nodemailer'
import { logger } from './logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.nac.com.np',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, 
  },
})


const getLogoUrl = () => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}/logo.png`
}

interface EmailTemplateOptions {
  title: string
  subtitle?: string
  body: string
  buttonLabel?: string
  buttonUrl?: string
  footerNote?: string
}

const renderEmailTemplate = ({
  title,
  subtitle,
  body,
  buttonLabel,
  buttonUrl,
  footerNote = 'Automated message from the GrSD Receive & Dispatch Logging System.',
}: EmailTemplateOptions) => {
  const logoUrl = getLogoUrl()
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:24px 24px 16px 24px;text-align:center;">
                  <img src="${logoUrl}" alt="Nepal Airlines" style="height:48px;width:auto;margin-bottom:12px;" />
                  <h1 style="margin:0;font-size:20px;color:#111827;">${title}</h1>
                  ${subtitle ? `<p style="margin:8px 0 0 0;font-size:14px;color:#6b7280;">${subtitle}</p>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;">
                  <div style="font-size:14px;line-height:1.6;color:#1f2937;">
                    ${body}
                  </div>
                  ${
                    buttonLabel && buttonUrl
                      ? `<div style="margin-top:24px;text-align:center;">
                          <a href="${buttonUrl}" style="display:inline-block;background-color:#1e3a8a;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
                            ${buttonLabel}
                          </a>
                        </div>`
                      : ''
                  }
                </td>
              </tr>
              <tr>
                <td style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
                  ${footerNote}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

export interface TaskNotificationData {
  recordNumber: string
  issuanceMessage?: string
  descriptionOfWork: string
  priority: string
  complexity: string
  assignedCompletionDate: string
  creatorName: string
  attachmentPath?: string
  taskId?: string
}

export async function sendTaskNotificationEmail(
  to: string,
  taskData: TaskNotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const taskUrl = taskData.taskId
      ? `${baseUrl}/tasks/${taskData.taskId}`
      : `${baseUrl}/tasks/${taskData.recordNumber}`

    const dueDate = new Date(taskData.assignedCompletionDate)
    const dueDateText = dueDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const now = new Date()
    const daysLeft = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )
    let urgencyNote = 'Scheduled task'
    if (Number.isFinite(daysLeft)) {
      if (daysLeft < 0) {
        urgencyNote = `Overdue by ${Math.abs(daysLeft)} day(s)`
      } else if (daysLeft === 0) {
        urgencyNote = 'Due today'
      } else if (daysLeft === 1) {
        urgencyNote = 'Due in 1 day'
      } else {
        urgencyNote = `Due in ${daysLeft} day(s)`
      }
    }

    const bodySections = [
      `<p>Hello,</p>`,
      `<p>A new task <strong>${taskData.recordNumber}</strong> has been assigned to you.</p>`,
      `<p><strong>Summary</strong></p>`,
      `<ul style="padding-left:18px;margin:12px 0;color:#374151;font-size:14px;">
        <li><strong>Priority:</strong> ${taskData.priority}</li>
        <li><strong>Complexity:</strong> ${taskData.complexity}</li>
        <li><strong>Due date:</strong> ${dueDateText}</li>
        <li><strong>Urgency:</strong> ${urgencyNote}</li>
        <li><strong>Assigned by:</strong> ${taskData.creatorName}</li>
      </ul>`,
      `<p><strong>Description</strong></p>`,
      `<div style="margin:8px 0;padding:12px;background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">${taskData.descriptionOfWork}</div>`,
    ]

    if (taskData.issuanceMessage) {
      bodySections.push(
        `<p><strong>Issuance message</strong></p>`,
        `<div style="margin:8px 0;padding:12px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:6px;">${taskData.issuanceMessage}</div>`
      )
    }

    if (taskData.attachmentPath) {
      bodySections.push(
        `<p>An attachment is available with this task inside the system.</p>`
      )
    }

    bodySections.push(
      `<p>Please review the task and update the status once your action is complete.</p>`
    )

    const html = renderEmailTemplate({
      title: 'New Task Assigned',
      subtitle: 'Nepal Airlines • GrSD Receive & Dispatch Logging System',
      body: bodySections.join(''),
      buttonLabel: 'Open Task',
      buttonUrl: taskUrl,
    })

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: `New Task Assigned: ${taskData.recordNumber}`,
      html: html,
    }

    const result = await transporter.sendMail(mailOptions)
    logger.info('Email sent successfully', {
      messageId: result.messageId,
      to,
      subject: mailOptions.subject,
    })
    return { success: true, messageId: result.messageId }
  } catch (error) {
    logger.error('Error sending email', error, { to })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export interface TaskForwardData {
  recordNumber: string
  descriptionOfWork: string
  priority: string
  complexity: string
  assignedCompletionDate: string
  forwardedByName: string
  forwardedByEmail: string
  description?: string
  taskId?: string
}

export async function sendTaskForwardEmail(
  to: string,
  taskData: TaskForwardData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const taskUrl = taskData.taskId
      ? `${baseUrl}/tasks/${taskData.taskId}`
      : `${baseUrl}/tasks/${taskData.recordNumber}`

    const dueDate = new Date(taskData.assignedCompletionDate)
    const dueDateText = dueDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const now = new Date()
    const daysLeft = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )
    let urgencyNote = 'Scheduled task'
    if (Number.isFinite(daysLeft)) {
      if (daysLeft < 0) urgencyNote = `Overdue by ${Math.abs(daysLeft)} day(s)`
      else if (daysLeft === 0) urgencyNote = 'Due today'
      else if (daysLeft === 1) urgencyNote = 'Due in 1 day'
      else urgencyNote = `Due in ${daysLeft} day(s)`
    }

    const bodySections = [
      `<p>Hello,</p>`,
      `<p>The task <strong>${taskData.recordNumber}</strong> has been forwarded to you by ${taskData.forwardedByName} (${taskData.forwardedByEmail}).</p>`,
      `<p><strong>Summary</strong></p>`,
      `<ul style="padding-left:18px;margin:12px 0;color:#374151;font-size:14px;">
        <li><strong>Priority:</strong> ${taskData.priority}</li>
        <li><strong>Complexity:</strong> ${taskData.complexity}</li>
        <li><strong>Due date:</strong> ${dueDateText}</li>
        <li><strong>Urgency:</strong> ${urgencyNote}</li>
      </ul>`,
      `<p><strong>Description</strong></p>`,
      `<div style="margin:8px 0;padding:12px;background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">${taskData.descriptionOfWork}</div>`,
    ]

    if (taskData.description) {
      bodySections.push(
        `<p><strong>Forward message</strong></p>`,
        `<div style="margin:8px 0;padding:12px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:6px;">${taskData.description}</div>`
      )
    }

    bodySections.push(
      `<p>Please continue the work on this task and update the status once action is completed.</p>`
    )

    const html = renderEmailTemplate({
      title: 'Task Forwarded',
      subtitle: 'Nepal Airlines • GrSD Receive & Dispatch Logging System',
      body: bodySections.join(''),
      buttonLabel: 'Open Task',
      buttonUrl: taskUrl,
    })

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: `Task Forwarded: ${taskData.recordNumber}`,
      html,
    }

    const result = await transporter.sendMail(mailOptions)
    logger.info('Forward email sent successfully', {
      messageId: result.messageId,
      to,
      subject: mailOptions.subject,
    })
    return { success: true, messageId: result.messageId }
  } catch (error) {
    logger.error('Error sending forward email', error, { to })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export interface TaskRejectionData {
  recordNumber: string
  descriptionOfWork: string
  priority: string
  complexity: string
  assignedCompletionDate: string
  rejectedByName: string
  rejectedByEmail: string
  rejectionReason: string
  taskId: string
}

export async function sendTaskRejectionEmail(
  to: string,
  taskData: TaskRejectionData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const taskUrl = `${baseUrl}/tasks/${taskData.taskId}`

    const dueDate = new Date(taskData.assignedCompletionDate)
    const dueDateText = dueDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const body = [
      `<p>Hello,</p>`,
      `<p>The task <strong>${taskData.recordNumber}</strong> has been rejected by ${taskData.rejectedByName} (${taskData.rejectedByEmail}).</p>`,
      `<p><strong>Rejection reason</strong></p>`,
      `<div style="margin:8px 0;padding:12px;background-color:#fee2e2;border:1px solid #fecaca;border-radius:6px;">${taskData.rejectionReason}</div>`,
      `<p><strong>Summary</strong></p>`,
      `<ul style="padding-left:18px;margin:12px 0;color:#374151;font-size:14px;">
        <li><strong>Priority:</strong> ${taskData.priority}</li>
        <li><strong>Complexity:</strong> ${taskData.complexity}</li>
        <li><strong>Original due date:</strong> ${dueDateText}</li>
      </ul>`,
      `<p><strong>Description</strong></p>`,
      `<div style="margin:8px 0;padding:12px;background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">${taskData.descriptionOfWork}</div>`,
      `<p>Please review the feedback, make the necessary updates, and resubmit the task.</p>`,
    ].join('')

    const html = renderEmailTemplate({
      title: 'Task Rejected',
      subtitle: 'Action required',
      body,
      buttonLabel: 'Review Task',
      buttonUrl: taskUrl,
    })

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: `Task Rejected: ${taskData.recordNumber}`,
      html,
    }

    const result = await transporter.sendMail(mailOptions)
    logger.info('Rejection email sent successfully', {
      messageId: result.messageId,
      to,
      subject: mailOptions.subject,
    })
    return { success: true, messageId: result.messageId }
  } catch (error) {
    logger.error('Error sending rejection email', error, { to })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export interface NoticeData {
  recordNumber: string
  issuanceMessage?: string
  descriptionOfWork: string
  creatorName: string
  attachmentPath?: string
  taskId: string
}

export async function sendNoticeEmail(
  to: string,
  noticeData: NoticeData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const noticeUrl = `${baseUrl}/tasks/${noticeData.taskId}`

    const bodySections = [
      `<p>Hello,</p>`,
      `<p>The notice <strong>${noticeData.recordNumber}</strong> has been issued by ${noticeData.creatorName}.</p>`,
    ]

    if (noticeData.issuanceMessage) {
      bodySections.push(
        `<p><strong>Notice message</strong></p>`,
        `<div style="margin:8px 0;padding:12px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;">${noticeData.issuanceMessage}</div>`
      )
    }

    if (noticeData.descriptionOfWork) {
      bodySections.push(
        `<p><strong>Details</strong></p>`,
        `<div style="margin:8px 0;padding:12px;background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">${noticeData.descriptionOfWork}</div>`
      )
    }

    if (noticeData.attachmentPath) {
      bodySections.push(`<p>An attachment is available with this notice.</p>`)
    }

    bodySections.push(
      `<p>Please review and acknowledge this notice within the GrSD Receive & Dispatch Logging System.</p>`
    )

    const html = renderEmailTemplate({
      title: 'Notice Issued',
      subtitle: noticeData.recordNumber,
      body: bodySections.join(''),
      buttonLabel: 'View Notice',
      buttonUrl: noticeUrl,
    })

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: `Notice: ${noticeData.recordNumber}`,
      html,
    }

    const result = await transporter.sendMail(mailOptions)
    logger.info('Notice email sent successfully', {
      messageId: result.messageId,
      to,
      subject: mailOptions.subject,
    })
    return { success: true, messageId: result.messageId }
  } catch (error) {
    logger.error('Error sending notice email', error, { to })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export interface UserCredentialsEmailData {
  name: string
  email: string
  userId: string
  temporaryPassword: string
  createdByName: string
}

export async function sendUserCredentialsEmail(
  to: string,
  data: UserCredentialsEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const loginUrl = `${baseUrl}/login`
    const changePasswordUrl = `${baseUrl}/change-password`

    const body = [
      `<p>Hello ${data.name || data.email},</p>`,
      `<p>An account has been created for you on the GrSD Receive & Dispatch Logging System by ${data.createdByName}.</p>`,
      `<p><strong>Login details</strong></p>`,
      `<ul style="padding-left:18px;margin:12px 0;color:#374151;font-size:14px;">
        <li><strong>User ID:</strong> ${data.userId}</li>
        <li><strong>Temporary password:</strong> ${data.temporaryPassword}</li>
      </ul>`,
      `<p>For security reasons you must change this password immediately after signing in.</p>`,
      `<p>You can use the button below to log in. A separate link is provided if you wish to jump straight to the change-password page.</p>`,
      `<p><strong>Direct password change link:</strong> <a href="${changePasswordUrl}" style="color:#1d4ed8;text-decoration:none;">${changePasswordUrl}</a></p>`,
      `<p style="color:#92400e;"><strong>Security notice:</strong> Do not share your credentials. If you were not expecting this email, please contact your administrator.</p>`,
    ].join('')

    const html = renderEmailTemplate({
      title: 'Welcome to TMS',
      subtitle: 'Your account is ready',
      body,
      buttonLabel: 'Login to TMS',
      buttonUrl: loginUrl,
    })

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: `Welcome to TMS! Your Account Details`,
      html,
    }

    const result = await transporter.sendMail(mailOptions)
    logger.info('User credentials email sent successfully', {
      messageId: result.messageId,
      to,
      subject: mailOptions.subject,
    })
    return { success: true, messageId: result.messageId }
  } catch (error) {
    logger.error('Error sending user credentials email', error, { to })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.verify()
    logger.info('SMTP connection verified successfully')
    return { success: true }
  } catch (error) {
    logger.error('SMTP connection failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

