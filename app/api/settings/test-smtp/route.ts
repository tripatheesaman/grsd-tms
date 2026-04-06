import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { canManageSettings } from '@/lib/system-config'
import { testSMTPConnection } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, canManageSettings: true },
    })

    if (!currentUser || !canManageSettings(currentUser as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to test SMTP settings' },
        { status: 403 }
      )
    }

    const result = await testSMTPConnection()
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'SMTP test failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error testing SMTP settings', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
