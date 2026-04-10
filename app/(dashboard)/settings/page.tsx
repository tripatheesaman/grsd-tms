import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SettingsClient } from '@/components/settings/SettingsClient'
import { canManageSettings, ensureAppConfig } from '@/lib/system-config'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, canManageSettings: true },
  })

  if (!currentUser || !canManageSettings(currentUser as any)) {
    redirect('/dashboard')
  }

  const config = await ensureAppConfig()

  return (
    <SettingsClient
      initialSettings={{
        currentFy: config.currentFy,
        dispatchStartNumber: config.dispatchStartNumber,
        receiveStartNumber: config.receiveStartNumber,
        masterfileStartNumber: config.masterfileStartNumber,
        smtpHost: config.smtpHost || '',
        smtpPort: config.smtpPort || 587,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser || '',
        smtpFrom: config.smtpFrom || '',
        hasSmtpPassword: Boolean(config.smtpPassEncrypted),
      }}
    />
  )
}
