import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

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
        { error: 'You do not have permission to export reports' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get('type') || 'receive-and-assign'
    const format = searchParams.get('format') || 'csv' 
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.AND = []
      if (startDate) {
        dateFilter.AND.push({
          OR: [
            { receive: { receivedDate: { gte: new Date(startDate) } } },
            { createdAt: { gte: new Date(startDate) } },
          ],
        })
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        dateFilter.AND.push({
          OR: [
            { receive: { receivedDate: { lte: endDateTime } } },
            { createdAt: { lte: endDateTime } },
          ],
        })
      }
    }

    const tasks = await prisma.task.findMany({
      where: {
        ...(reportType === 'receive-only' ? { receiveId: { not: null } } : {}),
        ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
        isNotice: false,
      },
      include: {
        receive: {
          select: {
            id: true,
            referenceNumber: true,
            letterReferenceNumber: true,
            receivedFrom: true,
            subject: true,
            receivedDate: true,
            status: true,
          },
        },
        priority: {
          select: { id: true, name: true, order: true },
        },
        complexity: {
          select: { id: true, name: true, order: true },
        },
        assignedPersonnel: {
          select: { id: true, name: true, order: true },
        },
        workcenter: {
          select: { id: true, name: true },
        },
        actions: {
          where: {
            actionType: {
              in: ['CREATED', 'ASSIGNED', 'SUBMITTED', 'CLOSED'],
            },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            actionType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    
    const reportData = tasks.map((task) => {
      const assignmentAction = task.actions.find(
        (a) => a.actionType === 'ASSIGNED' || a.actionType === 'CREATED'
      )
      const assignmentDate = assignmentAction?.createdAt || task.createdAt
      const completionAction = task.actions.find((a) => a.actionType === 'CLOSED')
      const completionDate = completionAction?.createdAt || null

      const daysAssigned = Math.ceil(
        (task.assignedCompletionDate.getTime() - assignmentDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const daysActuallyTaken = completionDate
        ? Math.ceil((completionDate.getTime() - assignmentDate.getTime()) / (1000 * 60 * 60 * 24))
        : null
      const deviationDays = completionDate ? daysActuallyTaken! - daysAssigned : null
      const deviationPercentage =
        completionDate && daysAssigned > 0
          ? ((deviationDays! / daysAssigned) * 100).toFixed(2)
          : null

      const row: any = {}

      if (reportType === 'receive-only' || reportType === 'receive-and-assign') {
        row['Received From'] = task.receive?.receivedFrom || ''
        row['Receive Subject'] = task.receive?.subject || ''
        row['Letter Reference Number'] = task.receive?.letterReferenceNumber || ''
        row['Receive Registration Number'] = task.receive?.referenceNumber || ''
        row['Received Date'] = task.receive?.receivedDate
          ? new Date(task.receive.receivedDate).toLocaleDateString('en-GB')
          : ''
      }

      if (reportType === 'assign-only' || reportType === 'receive-and-assign') {
        row['Task Record Number'] = task.recordNumber
        row['Complexity'] = task.complexity?.name || ''
        row['Priority'] = task.priority?.name || ''
        row['Assigned Deadline Date'] = task.assignedCompletionDate
          ? new Date(task.assignedCompletionDate).toLocaleDateString('en-GB')
          : ''
        row['Assigned Personnel'] = task.assignedPersonnel?.name || ''
        row['Workcenter'] = task.workcenter?.name || ''
        row['Date of Assignation'] = assignmentDate
          ? new Date(assignmentDate).toLocaleDateString('en-GB')
          : ''
        row['Date of Completion'] = completionDate
          ? new Date(completionDate).toLocaleDateString('en-GB')
          : 'Not Completed'
        row['Total Days Assigned'] = daysAssigned
        row['Total Days Actually Taken'] = daysActuallyTaken ?? 'N/A'
        row['Days Deviation'] = deviationDays !== null ? deviationDays : 'N/A'
        row['Deviation Percentage'] =
          deviationPercentage !== null ? `${deviationPercentage}%` : 'N/A'
      }

      return row
    })

    
    if (format === 'csv') {
      if (reportData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 })
      }

      const headers = Object.keys(reportData[0])
      const csvRows = [
        headers.join(','),
        ...reportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header] || ''
              
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value
            })
            .join(',')
        ),
      ]

      const csvContent = csvRows.join('\n')
      const buffer = Buffer.from(csvContent, 'utf-8')

      const filename = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else if (format === 'excel') {
      if (reportData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 })
      }

      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Report')

      const headers = Object.keys(reportData[0])
      worksheet.columns = headers.map((header) => ({
        header,
        key: header,
        width: Math.max(header.length + 5, 18),
      }))

      reportData.forEach((row) => {
        worksheet.addRow(row)
      })

      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      headerRow.height = 24
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F4C81' },
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0F4C81' } },
          left: { style: 'thin', color: { argb: 'FF0F4C81' } },
          bottom: { style: 'thin', color: { argb: 'FF0F4C81' } },
          right: { style: 'thin', color: { argb: 'FF0F4C81' } },
        }
      })

      worksheet.columns?.forEach((column) => {
        let maxLength = 18
        column?.eachCell?.({ includeEmpty: true }, (cell) => {
          const value = cell.value ? cell.value.toString() : ''
          if (value.length > maxLength) {
            maxLength = value.length
          }
        })
        
        column.width = Math.min(60, maxLength + 2)
      })

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        row.height = 20
        row.alignment = { vertical: 'middle', wrapText: true }
      })

      const excelBuffer = await workbook.xlsx.writeBuffer()
      const filename = `report-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`

      return new NextResponse(Buffer.from(excelBuffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else if (format === 'pdf') {
      if (reportData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 })
      }

      const PDFDocument = (await import('pdfkit/js/pdfkit.standalone.js')).default
      const doc = new PDFDocument({ margin: 40, layout: 'landscape', size: 'A4' })

      const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const reportTitleMap: Record<string, string> = {
          'receive-only': 'Receive Only Report',
          'assign-only': 'Assign Only Report',
          'receive-and-assign': 'Receive and Assign Report',
        }
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F4C81').text(reportTitleMap[reportType], {
          align: 'left',
        })
        doc.moveDown(0.5)
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#111827')
          .text(`Generated on ${new Date().toLocaleString()}`)
        doc.moveDown(0.5)

        const headers = Object.keys(reportData[0])
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
        const columnWidth = pageWidth / headers.length
        let y = doc.y + 10

        const drawRow = (values: string[], options?: { header?: boolean }) => {
          doc.font(options?.header ? 'Helvetica-Bold' : 'Helvetica').fontSize(
            options?.header ? 10 : 9
          )
          let rowHeight = 24
          values.forEach((value) => {
            const textValue = value ?? ''
            const height = doc.heightOfString(textValue, {
              width: columnWidth - 8,
            })
            rowHeight = Math.max(rowHeight, height + 10)
          })

          if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage({ margin: 40, layout: 'landscape', size: 'A4' })
            y = doc.y
          }

          values.forEach((value, index) => {
            const x = doc.page.margins.left + index * columnWidth
            if (options?.header) {
              doc.save()
              doc.fillColor('#0F4C81').rect(x, y, columnWidth, rowHeight).fill()
              doc.restore()
              doc
                .strokeColor('#0F4C81')
                .lineWidth(0.5)
                .rect(x, y, columnWidth, rowHeight)
                .stroke()
              doc.fillColor('#FFFFFF')
            } else {
              doc
                .strokeColor('#CBD5F5')
                .lineWidth(0.25)
                .rect(x, y, columnWidth, rowHeight)
                .stroke()
              doc.fillColor('#111827')
            }
            doc.text(String(value ?? ''), x + 4, y + 4, {
              width: columnWidth - 8,
              align: 'left',
            })
          })

          y += rowHeight
        }

        drawRow(headers, { header: true })
        reportData.forEach((row) => {
          const values = headers.map((header) => row[header] ?? '')
          drawRow(values)
        })

        doc.end()
      })

      const filename = `report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Error exporting report', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

