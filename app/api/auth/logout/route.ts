import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('tms-auth-token')
    logger.info('User logged out successfully')
    return response
  } catch (error) {
    logger.error('Error in logout', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

