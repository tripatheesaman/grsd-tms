import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBasePath, withBasePath } from '@/lib/base-path'

const publicRoutes = ['/login']
const protectedRoutes = ['/dashboard', '/tasks', '/users', '/database']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const basePath = getBasePath()
  const appPath = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || '/'
    : pathname

  const isPublicRoute = publicRoutes.some((route) => appPath.startsWith(route))

  const isProtectedRoute = protectedRoutes.some((route) => appPath.startsWith(route))

  
  const token = request.cookies.get('tms-auth-token')?.value

  
  if (isProtectedRoute && !token) {
    const loginUrl = new URL(withBasePath('/login'), request.url)
    loginUrl.searchParams.set('redirect', appPath)
    return NextResponse.redirect(loginUrl)
  }

  
  
  if (appPath === '/login' && token) {
    return NextResponse.redirect(new URL(withBasePath('/dashboard'), request.url))
  }

  
  if (appPath === '/change-password') {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    







    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

