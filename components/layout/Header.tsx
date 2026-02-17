'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types'
import { NotificationBell } from './NotificationBell'
import { withBasePath } from '@/lib/base-path'

interface HeaderProps {
  userName: string
  userEmail: string
  userRole: UserRole
}

export function Header({ userName, userEmail, userRole }: HeaderProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch(withBasePath('/api/auth/logout'), { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const roleColors: Record<UserRole, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-800',
    DIRECTOR: 'bg-red-100 text-red-800',
    DY_DIRECTOR: 'bg-blue-100 text-blue-800',
    MANAGER: 'bg-indigo-100 text-indigo-800',
    INCHARGE: 'bg-amber-100 text-amber-800',
    EMPLOYEE: 'bg-gray-100 text-gray-800',
  }

  const getInitials = () => {
    const normalized = userName?.trim()
    if (normalized) {
      const parts = normalized.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      if (parts[0].length >= 2) {
        return parts[0].slice(0, 2).toUpperCase()
      }
      return parts[0][0].toUpperCase()
    }
    if (userEmail) {
      const segment = userEmail.split('@')[0]
      if (segment.length >= 2) {
        return segment.slice(0, 2).toUpperCase()
      }
      return segment.charAt(0).toUpperCase()
    }
    return 'NA'
  }

  const initials = getInitials()

  return (
    <header className="bg-white/80 backdrop-blur border-b border-white/60 shadow-lg shadow-slate-900/5 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white/80 shadow-lg shadow-blue-900/20">
            <Image
              src={withBasePath("/logo.png")}
              alt="Nepal Airlines"
              fill
              className="object-contain p-1"
              sizes="48px"
              priority
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Nepal Airlines • Ground Support Department
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              GrSD Receive &amp; Dispatch Logging System
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-full bg-white/70 hover:bg-white shadow ring-1 ring-white/70 transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-red)] flex items-center justify-center text-white font-semibold shadow-inner shadow-black/20">
                {initials}
              </div>
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-3 w-72 z-20">
                <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="text-xs text-slate-500">{userEmail}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Ground Support • TIA, Kathmandu</p>
                    <span
                      className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 text-xs font-semibold rounded-full ${roleColors[userRole]}`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-current/60" />
                      {userRole}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    <Link
                      href="/change-password"
                      className="flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>Change password</span>
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-colors"
                    >
                      <span>Sign out</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-14v1m0 10h-2a2 2 0 01-2-2V7a2 2 0 012-2h2"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

