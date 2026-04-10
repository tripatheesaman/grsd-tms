import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getNextMasterfileRecord } from '@/lib/sequences'
import { getFileUrl, saveFile } from '@/lib/storage'
import { canViewAllTasksAndProgress } from '@/lib/task-visibility'

const listSelect = {
  id: true,
  fiscalYear: true,
  masterfileNumber: true,
  masterfileTotal: true,
  subjectOfLetter: true,
  descriptionOfLetter: true,
  letterAddressedTo: true,
  pdfFilename: true,
  pdfFilepath: true,
  createdAt: true,
  user: {
    select: { id: true, name: true, email: true },
  },
} as const

function mapRequestItem(item: any) {
  const { user, ...rest } = item
  return {
    ...rest,
    requestedBy: user
      ? { id: user.id, name: user.name, email: user.email }
      : null,
    pdfUrl: item.pdfFilepath ? getFileUrl(item.pdfFilepath) : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const masterfileNumber = searchParams.get('masterfileNumber')
    const subject = searchParams.get('subject')
    const addressedTo = searchParams.get('addressedTo')
    const body = searchParams.get('body')
    const fiscalYear = searchParams.get('fiscalYear')
    const createdFrom = searchParams.get('createdFrom')
    const createdTo = searchParams.get('createdTo')
    const hasPdf = searchParams.get('hasPdf')
    const sortBy = searchParams.get('sortBy') || 'newest'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const requestedLimit = parseInt(searchParams.get('limit') || '20', 10)
    const limit = Math.min(50, Math.max(1, Number.isNaN(requestedLimit) ? 20 : requestedLimit))
    const skip = (page - 1) * limit

    const viewer = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        role: true,
        canViewAllSubmissions: true,
        canApproveCompletions: true,
      },
    })
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: Record<string, unknown> = {}
    if (!canViewAllTasksAndProgress(viewer)) {
      where.userId = user.userId
    }
    const andConditions: Record<string, unknown>[] = []

    if (masterfileNumber?.trim()) {
      andConditions.push({
        masterfileNumber: { contains: masterfileNumber.trim() },
      })
    }
    if (subject?.trim()) {
      andConditions.push({
        subjectOfLetter: { contains: subject.trim() },
      })
    }
    if (addressedTo?.trim()) {
      andConditions.push({
        letterAddressedTo: { contains: addressedTo.trim() },
      })
    }
    if (body?.trim()) {
      andConditions.push({
        descriptionOfLetter: { contains: body.trim() },
      })
    }
    if (fiscalYear?.trim()) {
      andConditions.push({
        fiscalYear: { contains: fiscalYear.trim() },
      })
    }

    if (createdFrom || createdTo) {
      const range: { gte?: Date; lte?: Date } = {}
      if (createdFrom) {
        range.gte = new Date(createdFrom)
      }
      if (createdTo) {
        const end = new Date(createdTo)
        end.setHours(23, 59, 59, 999)
        range.lte = end
      }
      andConditions.push({ createdAt: range })
    }

    if (hasPdf === 'yes') {
      andConditions.push({ pdfFilepath: { not: null } })
    } else if (hasPdf === 'no') {
      andConditions.push({ pdfFilepath: null })
    }

    if (andConditions.length > 0) {
      ;(where as any).AND = andConditions
    }

    let orderBy: Record<string, string | Record<string, string>> = { createdAt: 'desc' }
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (sortBy === 'number') {
      orderBy = { masterfileNumber: 'asc' }
    } else if (sortBy === 'totalAsc') {
      orderBy = { masterfileTotal: 'asc' }
    } else if (sortBy === 'totalDesc') {
      orderBy = { masterfileTotal: 'desc' }
    }

    const [requests, total] = await Promise.all([
      (prisma as any).masterfileRequest.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: listSelect,
      }),
      (prisma as any).masterfileRequest.count({ where }),
    ])

    return NextResponse.json({
      requests: requests.map(mapRequestItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Error fetching masterfile requests', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const subjectOfLetter = String(formData.get('subjectOfLetter') || '').trim()
    const descriptionOfLetter = String(formData.get('descriptionOfLetter') || '').trim()
    const letterAddressedTo = String(formData.get('letterAddressedTo') || '').trim()
    const file = formData.get('file') as File | null

    if (!subjectOfLetter || !descriptionOfLetter || !letterAddressedTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let upload: { filepath: string } | null = null
    if (file && file.size > 0) {
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
      }
      const result = await saveFile(file, file.name, 'masterfiles')
      if (!result.success || !result.filepath) {
        return NextResponse.json({ error: result.error || 'File upload failed' }, { status: 400 })
      }
      upload = { filepath: result.filepath }
    }

    const seq = await getNextMasterfileRecord()
    const created = await (prisma as any).masterfileRequest.create({
      data: {
        userId: user.userId,
        fiscalYear: seq.fiscalYear,
        masterfileNumber: seq.masterfileNumber,
        masterfileTotal: seq.total,
        subjectOfLetter,
        descriptionOfLetter,
        letterAddressedTo,
        pdfFilename: file?.name || null,
        pdfFilepath: upload?.filepath || null,
        pdfMimeType: file?.type || null,
        pdfSize: file?.size || null,
      },
      select: {
        id: true,
        fiscalYear: true,
        masterfileNumber: true,
        masterfileTotal: true,
        subjectOfLetter: true,
        descriptionOfLetter: true,
        letterAddressedTo: true,
        pdfFilename: true,
        pdfFilepath: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        request: {
          ...created,
          pdfUrl: created.pdfFilepath ? getFileUrl(created.pdfFilepath) : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating masterfile request', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
