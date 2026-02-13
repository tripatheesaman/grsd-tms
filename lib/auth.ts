import jwt, { SignOptions } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { logger } from './logger'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const COOKIE_NAME = 'tms-auth-token'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  try {
    if (!JWT_SECRET || JWT_SECRET === 'default-secret-change-in-production') {
      throw new Error('JWT_SECRET is not properly configured')
    }
    return jwt.sign(payload as object, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions)
  } catch (error) {
    logger.error('Error signing JWT token', error)
    throw new Error('Failed to sign token')
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    logger.error('Error verifying JWT token', error)
    return null
  }
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value || null
}

export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies()
  const isSecure = process.env.FORCE_SECURE_COOKIES === 'true'
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, 
    path: '/',
  })
}

export async function removeAuthToken(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken()
  if (!token) return null
  return verifyToken(token)
}

