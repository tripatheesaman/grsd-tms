'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/Loading'

type ReportType = 'receive-only' | 'assign-only' | 'receive-and-assign'
type ExportFormat = 'csv' | 'excel' | 'pdf'

interface ReportsClientProps {
  defaultStartDate: string
  defaultEndDate: string
}

export function ReportsClient({
  defaultStartDate,
  defaultEndDate,
}: ReportsClientProps) {
  const toast = useToast()
  const [reportType, setReportType] = useState<ReportType>('receive-and-assign')
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: reportType,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })

      const response = await fetch(withBasePath(`/api/reports?${params.toString()}`))
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }

      const data = await response.json()
      setReportData(data.data || [])
      setTotalRecords(data.totalRecords || 0)
    } catch (error) {
      toast.error('Failed to load report data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
    
  }, [reportType, startDate, endDate])

  const handleExport = async (format: ExportFormat) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: reportType,
        format,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })

      const response = await fetch(withBasePath(`/api/reports/export?${params.toString()}`))
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const reportTypeName = reportType.replace(/-/g, '_')
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `report_${reportTypeName}_${dateStr}.${format === 'excel' ? 'xlsx' : format}`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Report exported successfully as ${format.toUpperCase()}!`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to export report')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getReportTitle = () => {
    switch (reportType) {
      case 'receive-only':
        return 'Receive Only Report'
      case 'assign-only':
        return 'Assign Only Report'
      case 'receive-and-assign':
        return 'Receive and Assign Report'
      default:
        return 'Report'
    }
  }

  const getReportDescription = () => {
    switch (reportType) {
      case 'receive-only':
        return 'This report contains only receive-related information including received from, subject, letter reference number, registration number, and received date.'
      case 'assign-only':
        return 'This report contains only task assignment information including complexity, priority, deadlines, assigned personnel, workcenter, and completion metrics.'
      case 'receive-and-assign':
        return 'This comprehensive report includes both receive and assignment information with complete tracking of tasks from receipt through completion, including deviation analysis.'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <Image
            src="/nac_icon.png"
              alt="NAC Logo"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--brand-blue)]">
              {getReportTitle()}
            </h1>
            <p className="text-slate-600 mt-1">{getReportDescription()}</p>
          </div>
        </div>
      </div>

      {}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Type
            </label>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <option value="receive-only">Receive Only</option>
              <option value="assign-only">Assign Only</option>
              <option value="receive-and-assign">Receive and Assign</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(defaultStartDate)
                setEndDate(defaultEndDate)
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Export Report</h2>
            <p className="text-sm text-slate-600 mt-1">
              Total Records: <span className="font-semibold">{totalRecords}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => handleExport('csv')}
              disabled={loading}
              isLoading={loading}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('excel')}
              disabled={loading}
              isLoading={loading}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              disabled={loading}
              isLoading={loading}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Report Preview</h2>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No data available for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {Object.keys(reportData[0] || {}).map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {reportData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.values(row).map((value: any, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-6 py-4 whitespace-nowrap text-sm text-slate-900"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.length > 50 && (
              <div className="mt-4 text-center text-sm text-slate-600">
                Showing first 50 of {reportData.length} records. Export to see all data.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

