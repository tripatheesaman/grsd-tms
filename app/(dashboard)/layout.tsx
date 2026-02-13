import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { withBasePath } from '@/lib/base-path'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect(withBasePath('/login'))
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        canCreateTasks: true,
        canManageComplexities: true,
        canManagePersonnel: true,
        canManageWorkcenters: true,
        canManagePriorities: true,
        canManageUsers: true,
        canManageReceives: true,
        canApproveCompletions: true,
        canRevertCompletions: true,
        canViewReports: true,
      },
    })

  if (!userData) {
    redirect(withBasePath('/login'))
  }

  
  if (userData.mustChangePassword) {
    redirect(withBasePath('/change-password'))
  }

  const [dueTaskCount, completionRequestCount] = await Promise.all([
    prisma.task.count({
    where: {
      status: {
        in: ['ACTIVE', 'IN_PROGRESS'],
      },
      assignedToId: user.userId,
    },
    }),
    (userData.canApproveCompletions || userData.role === 'SUPERADMIN'
      ? prisma.task.count({
          where: {
            status: 'COMPLETED',
            acknowledgedById: null,
          },
        })
      : Promise.resolve(0)),
  ])

  return (
    <div className="min-h-screen app-shell">
      <Sidebar
        userRole={userData.role as any}
        dueTaskCount={dueTaskCount}
        canManageComplexities={userData.canManageComplexities || false}
        canManagePersonnel={userData.canManagePersonnel || false}
        canManageWorkcenters={userData.canManageWorkcenters || false}
        canManagePriorities={userData.canManagePriorities || false}
        canManageUsers={userData.canManageUsers || false}
        canManageReceives={userData.canManageReceives || false}
        canApproveCompletions={userData.canApproveCompletions || false}
        canViewReports={userData.canViewReports || false}
        completionRequestCount={completionRequestCount}
      />
      <div className="md:pl-72 flex flex-col flex-1">
        <Header
          userName={userData.name}
          userEmail={userData.email}
          userRole={userData.role as any}
        />
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10">
          <div className="max-w-6xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

