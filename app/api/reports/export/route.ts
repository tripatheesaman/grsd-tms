import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma, prismaRead } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  buildReportDateFilter,
  buildReportTaskWhere,
  mapTaskToReportRow,
  reportRowToCsvLine,
  reportTaskInclude,
} from '@/lib/report-data'

const REPORT_BATCH = 400

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

    const dateFilter = buildReportDateFilter(startDate, endDate)
    const where = buildReportTaskWhere(reportType, dateFilter)

    const totalRows = await prismaRead.task.count({ where })
    if (totalRows === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 })
    }

    const nonCsvCap = parseInt(
      process.env.REPORT_EXPORT_MAX_NON_CSV_ROWS || '20000',
      10
    )
    if (format !== 'csv' && totalRows > nonCsvCap) {
      return NextResponse.json(
        {
          error: `This export has ${totalRows} rows. Excel and PDF support up to ${nonCsvCap} rows; narrow the date range or use CSV.`,
        },
        { status: 422 }
      )
    }

    if (format === 'csv') {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          let headers: string[] | null = null
          let skip = 0
          try {
            while (true) {
              const tasks = await prismaRead.task.findMany({
                where,
                include: reportTaskInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: REPORT_BATCH,
              })
              if (tasks.length === 0) break
              for (const task of tasks) {
                const row = mapTaskToReportRow(task, reportType)
                if (!headers) {
                  headers = Object.keys(row)
                  controller.enqueue(encoder.encode(`${headers.join(',')}\n`))
                }
                controller.enqueue(
                  encoder.encode(`${reportRowToCsvLine(row, headers)}\n`)
                )
              }
              skip += REPORT_BATCH
            }
          } catch (e) {
            controller.error(e)
            return
          }
          controller.close()
        },
      })

      const filename = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === 'excel') {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Report')

      let headers: string[] | null = null
      let skip = 0

      while (true) {
        const tasks = await prismaRead.task.findMany({
          where,
          include: reportTaskInclude,
          orderBy: { createdAt: 'desc' },
          skip,
          take: REPORT_BATCH,
        })
        if (tasks.length === 0) break

        for (const task of tasks) {
          const row = mapTaskToReportRow(task, reportType)
          if (!headers) {
            headers = Object.keys(row)
            worksheet.columns = headers.map((header) => ({
              header,
              key: header,
              width: Math.max(header.length + 5, 18),
            }))
          }
          worksheet.addRow(inObjectOrder(row, headers))
        }
        skip += REPORT_BATCH
      }

      if (!headers || headers.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 })
      }

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
    }

    if (format === 'pdf') {
      const PDFDocument = (await import('pdfkit/js/pdfkit.standalone.js')).default
      const doc = new PDFDocument({ margin: 40, layout: 'landscape', size: 'A4' })

      const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        void (async () => {
          try {
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

            let headers: string[] | null = null
            let skip = 0
            let pageWidth = 0
            let columnWidth = 0
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

            while (true) {
              const tasks = await prismaRead.task.findMany({
                where,
                include: reportTaskInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: REPORT_BATCH,
              })
              if (tasks.length === 0) break

              for (const task of tasks) {
                const row = mapTaskToReportRow(task, reportType)
                if (!headers) {
                  headers = Object.keys(row)
                  pageWidth =
                    doc.page.width - doc.page.margins.left - doc.page.margins.right
                  columnWidth = pageWidth / headers.length
                  drawRow(headers, { header: true })
                }
                const values = headers!.map((header) => String(row[header] ?? ''))
                drawRow(values)
              }
              skip += REPORT_BATCH
            }

            doc.end()
          } catch (err) {
            reject(err)
          }
        })()
      })

      const filename = `report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    logger.error('Error exporting report', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function inObjectOrder(
  row: Record<string, string | number | null>,
  headers: string[]
): Record<string, string | number | null> {
  const o: Record<string, string | number | null> = {}
  for (const h of headers) {
    o[h] = row[h]
  }
  return o
}
