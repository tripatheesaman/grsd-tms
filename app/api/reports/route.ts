import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma, prismaRead } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  buildReportDateFilter,
  buildReportTaskWhere,
  mapTaskToReportRow,
  reportTaskInclude,
} from '@/lib/report-data'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        role: true,
        canViewReports: true,
      },
    })

    if (
      !currentUserRecord ||
      (currentUserRecord.role !== 'SUPERADMIN' && !currentUserRecord.canViewReports)
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view reports' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get('type') || 'receive-and-assign'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const requestedLimit = parseInt(searchParams.get('limit') || '100', 10)
    const limit = Math.min(
      500,
      Math.max(1, Number.isNaN(requestedLimit) ? 100 : requestedLimit)
    )
    const skip = (page - 1) * limit

    const dateFilter = buildReportDateFilter(startDate, endDate)
    const where = buildReportTaskWhere(reportType, dateFilter)

    const [tasks, total] = await Promise.all([
      prismaRead.task.findMany({
        where,
        include: reportTaskInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prismaRead.task.count({ where }),
    ])

    const reportData = tasks.map((task) => mapTaskToReportRow(task, reportType))

    return NextResponse.json({
      reportType,
      data: reportData,
      totalRecords: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error generating report', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
