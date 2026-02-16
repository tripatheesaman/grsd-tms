import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const timeZone = process.env.NEXT_PUBLIC_TIMEZONE || 'UTC'
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const timeZone = process.env.NEXT_PUBLIC_TIMEZONE || 'UTC'
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

export function calculateDaysUntilDeadline(deadline: Date | string): number {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)
  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function stripHtml(input: string): string {
  if (!input) return ''
  const noTags = input.replace(/<[^>]*>/g, ' ')
  const decoded = noTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
  return decoded.replace(/\s+/g, ' ').trim()
}

