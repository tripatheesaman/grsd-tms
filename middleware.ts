import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/login']
const protectedRoutes = ['/dashboard', '/tasks', '/users', '/database']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  
  const token = request.cookies.get('tms-auth-token')?.value

  
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  
  
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  
  if (pathname === '/change-password') {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    







    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

