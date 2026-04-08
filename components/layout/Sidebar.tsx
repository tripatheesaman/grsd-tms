'use client'

import Image from 'next/image'
import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types'
import { getBasePath, withBasePath } from '@/lib/base-path'

interface NavItem {
  name: string
  href: string
  icon: ReactNode
  roles?: UserRole[]
  showBadge?: boolean
  requiresComplexityPermission?: boolean
  requiresPersonnelPermission?: boolean
  requiresWorkcenterPermission?: boolean
  requiresPriorityPermission?: boolean
  requiresUserPermission?: boolean
  requiresSettingsPermission?: boolean
  requiresCompletionPermission?: boolean
  requiresReceivePermission?: boolean
  requiresReportsPermission?: boolean
}

interface SidebarProps {
  userRole: UserRole
  dueTaskCount?: number
  canManageComplexities?: boolean
  canManagePersonnel?: boolean
  canManageWorkcenters?: boolean
  canManagePriorities?: boolean
  canManageUsers?: boolean
  canManageSettings?: boolean
  canManageReceives?: boolean
  canApproveCompletions?: boolean
  canViewReports?: boolean
  completionRequestCount?: number
}
const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Dispatches',
    href: '/tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    name: 'Due Dispatches',
    href: '/tasks/due',
    showBadge: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6l7-3v6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
    ),
  },
  {
    name: 'My Completed Dispatches',
    href: '/tasks/completed',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Receives',
    href: '/receives',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h12" />
      </svg>
    ),
    requiresReceivePermission: true,
  },
  {
    name: 'Workcenters',
    href: '/workcenters',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
      </svg>
    ),
    requiresWorkcenterPermission: true,
  },
  {
    name: 'Complexities',
    href: '/complexities',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    requiresComplexityPermission: true,
  },
  {
    name: 'Assigned Personnel',
    href: '/personnel',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    requiresPersonnelPermission: true,
  },
  {
    name: 'Priorities',
    href: '/priorities',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    requiresPriorityPermission: true,
  },
  {
    name: 'Users',
    href: '/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    requiresUserPermission: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.983 5.5a1.5 1.5 0 011.034.412l.909.878a1.5 1.5 0 001.458.36l1.26-.336a1.5 1.5 0 011.821.95l.467 1.221a1.5 1.5 0 001.098.949l1.3.289a1.5 1.5 0 011.167 1.689l-.162 1.299a1.5 1.5 0 00.473 1.422l.95.887a1.5 1.5 0 01.18 2.132l-.843 1.002a1.5 1.5 0 00-.303 1.476l.438 1.23a1.5 1.5 0 01-.939 1.83l-1.223.46a1.5 1.5 0 00-.945 1.103l-.282 1.301a1.5 1.5 0 01-1.683 1.174l-1.3-.154a1.5 1.5 0 00-1.42.478l-.882.954a1.5 1.5 0 01-2.132.187l-1.006-.838a1.5 1.5 0 00-1.477-.296l-1.228.444a1.5 1.5 0 01-1.834-.933l-.466-1.22a1.5 1.5 0 00-1.103-.944l-1.302-.282a1.5 1.5 0 01-1.174-1.683l.154-1.3a1.5 1.5 0 00-.478-1.42l-.954-.882a1.5 1.5 0 01-.187-2.132l.838-1.006a1.5 1.5 0 00.296-1.477l-.444-1.228a1.5 1.5 0 01.933-1.834l1.22-.466a1.5 1.5 0 00.944-1.103l.282-1.302a1.5 1.5 0 011.683-1.174l1.3.154a1.5 1.5 0 001.42-.478l.882-.954a1.5 1.5 0 011.08-.487z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
      </svg>
    ),
    requiresSettingsPermission: true,
  },
  {
    name: 'Dispatch Completion Requests',
    href: '/tasks/completions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    showBadge: true,
    requiresCompletionPermission: true,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    requiresReportsPermission: true,
  },
  {
    name: 'Database',
    href: '/database',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    roles: ['SUPERADMIN'],
  },
]

export function Sidebar({
  userRole,
  dueTaskCount = 0,
  canManageComplexities = false,
  canManagePersonnel = false,
  canManageWorkcenters = false,
  canManagePriorities = false,
  canManageUsers = false,
  canManageSettings = false,
  canManageReceives = false,
  canApproveCompletions = false,
  canViewReports = false,
  completionRequestCount = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const basePath = getBasePath()
  const normalizedPathname =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || '/'
      : pathname

  const filteredNav = navigation.filter((item) => {
    
    if (item.roles && !item.roles.includes(userRole)) {
      return false
    }
    
    if (item.requiresComplexityPermission && !canManageComplexities && userRole !== 'SUPERADMIN') {
      return false
    }
    
    if (item.requiresPersonnelPermission && !canManagePersonnel && userRole !== 'SUPERADMIN') {
      return false
    }
    
    if (item.requiresWorkcenterPermission && !canManageWorkcenters && userRole !== 'SUPERADMIN') {
      return false
    }
    
    if (item.requiresPriorityPermission && !canManagePriorities && userRole !== 'SUPERADMIN') {
      return false
    }
    if (item.requiresUserPermission && !canManageUsers && userRole !== 'SUPERADMIN') {
      return false
    }
    if (
      item.requiresSettingsPermission &&
      !canManageSettings &&
      userRole !== 'SUPERADMIN'
    ) {
      return false
    }
    if (
      item.requiresReceivePermission &&
      !canManageReceives &&
      userRole !== 'SUPERADMIN'
    ) {
      return false
    }
    if (
      item.requiresCompletionPermission &&
      !canApproveCompletions &&
      userRole !== 'SUPERADMIN'
    ) {
      return false
    }
    if (
      item.requiresReportsPermission &&
      !canViewReports &&
      userRole !== 'SUPERADMIN'
    ) {
      return false
    }
    return true
  })

  return (
    <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-[var(--brand-blue)] via-[#001437] to-[var(--brand-red)] text-white shadow-2xl">
        <div className="px-5 py-6 border-b border-white/20 flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white ring-2 ring-white/70 shrink-0">
            <Image
              src={withBasePath("/logo.png")}
              alt="Nepal Airlines"
              fill
              className="object-contain p-2"
              sizes="56px"
              priority
              unoptimized
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">
              GrSD
            </p>
            <p className="text-base font-semibold leading-tight">
              Receive &amp; Dispatch Logging System
            </p>
            <p className="text-xs text-white/70">Nepal Airlines</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 px-4 py-5 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive =
              item.href === '/tasks'
                ? normalizedPathname === item.href || normalizedPathname.startsWith('/tasks/')
                : normalizedPathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-semibold rounded-xl transition-all',
                  isActive
                    ? 'bg-white text-[var(--brand-blue)] shadow-lg shadow-black/10'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'mr-3 inline-flex items-center justify-center rounded-full p-1.5',
                    isActive
                      ? 'bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-red)] text-white'
                      : 'bg-white/10 text-white'
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.name}</span>
                {item.showBadge && (
                  <>
                    {item.requiresCompletionPermission ? (
                      completionRequestCount > 0 && (
                        <span className="ml-auto text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full shadow shadow-red-900/30">
                          {completionRequestCount}
                        </span>
                      )
                    ) : dueTaskCount > 0 ? (
                      <span className="ml-auto text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full shadow shadow-red-900/30">
                    {dueTaskCount}
                  </span>
                    ) : null}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-5 py-5 border-t border-white/20 text-sm text-white/80 space-y-1">
          <p className="font-semibold text-white">Ground Support Department</p>
          <p>Nepal Airlines • TIA</p>
        </div>
      </div>
    </div>
  )
}

