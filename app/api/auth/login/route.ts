import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      logger.warn('Login attempt with invalid email', { email })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    })

    
    const isSecure = request.url.startsWith('https://') || process.env.FORCE_SECURE_COOKIES === 'true'
    
    
    response.cookies.set('tms-auth-token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, 
      path: '/',
    })

    logger.info('User logged in successfully', { userId: user.id, email: user.email })

    return response
  } catch (error) {
    logger.error('Error in login', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

