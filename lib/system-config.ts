import { prisma } from './db'
import { getCurrentNepaliFiscalYear } from './bs-date'
import { decryptSecret } from './security'
import type { UserRole } from '@/types'

export type SettingsPermissionUser = {
  role: UserRole
  canManageSettings?: boolean | null
}

export function canManageSettings(user: SettingsPermissionUser): boolean {
  return user.role === 'SUPERADMIN' || Boolean(user.canManageSettings)
}

export async function ensureAppConfig() {
  const computedFy = getCurrentNepaliFiscalYear()
  const config = await (prisma as any).appConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      currentFy: computedFy,
      dispatchStartNumber: 1,
      receiveStartNumber: 1,
      smtpPort: 587,
      smtpSecure: false,
    },
  })

  if (config.currentFy !== computedFy) {
    return (prisma as any).appConfig.update({
      where: { id: 'default' },
      data: { currentFy: computedFy },
    })
  }
  return config
}

export async function getSmtpRuntimeConfig() {
  const config = await ensureAppConfig()
  const envPort = parseInt(process.env.SMTP_PORT || '587', 10)

  const host = config.smtpHost || process.env.SMTP_HOST || 'localhost'
  const port = config.smtpPort || envPort
  const secure = typeof config.smtpSecure === 'boolean' ? config.smtpSecure : port === 465
  const user = config.smtpUser || process.env.SMTP_USER || ''
  const from = config.smtpFrom || process.env.SMTP_USER || ''
  const pass = config.smtpPassEncrypted
    ? decryptSecret(config.smtpPassEncrypted)
    : process.env.SMTP_PASS || ''

  return { host, port, secure, user, pass, from }
}
