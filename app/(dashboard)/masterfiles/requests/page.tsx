'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Loading'
import { useToast } from '@/components/ui/Toast'
import { withBasePath } from '@/lib/base-path'
import { formatDateTime } from '@/lib/utils'

type MasterfileRequest = {
  id: string
  fiscalYear?: string
  masterfileNumber: string
  masterfileTotal: number
  subjectOfLetter: string
  descriptionOfLetter: string
  letterAddressedTo: string
  pdfFilename?: string | null
  pdfUrl?: string | null
  createdAt: string
  requestedBy?: { id: string; name: string; email: string } | null
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MyMasterfileNumbersPage() {
  const toast = useToast()
  const [requests, setRequests] = useState<MasterfileRequest[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [fetching, setFetching] = useState(true)
  const [page, setPage] = useState(1)

  const [masterfileNumberSearch, setMasterfileNumberSearch] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [addressedToSearch, setAddressedToSearch] = useState('')
  const [bodySearch, setBodySearch] = useState('')
  const [fiscalYearSearch, setFiscalYearSearch] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [hasPdf, setHasPdf] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  const fetchRequests = useCallback(
    async (signal?: AbortSignal) => {
      setFetching(true)
      const params = new URLSearchParams()
      if (masterfileNumberSearch.trim()) {
        params.set('masterfileNumber', masterfileNumberSearch.trim())
      }
      if (subjectSearch.trim()) {
        params.set('subject', subjectSearch.trim())
      }
      if (addressedToSearch.trim()) {
        params.set('addressedTo', addressedToSearch.trim())
      }
      if (bodySearch.trim()) {
        params.set('body', bodySearch.trim())
      }
      if (fiscalYearSearch.trim()) {
        params.set('fiscalYear', fiscalYearSearch.trim())
      }
      if (createdFrom) params.set('createdFrom', createdFrom)
      if (createdTo) params.set('createdTo', createdTo)
      if (hasPdf === 'yes' || hasPdf === 'no') {
        params.set('hasPdf', hasPdf)
      }
      if (sortBy !== 'newest') {
        params.set('sortBy', sortBy)
      }
      params.set('page', String(page))
      params.set('limit', '20')

      try {
        const res = await fetch(withBasePath(`/api/masterfiles?${params.toString()}`), { signal })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Failed to load masterfile requests')
          setRequests([])
          setPagination(null)
          return
        }
        setRequests(data.requests || [])
        setPagination(data.pagination || null)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast.error('Failed to load masterfile requests')
          setRequests([])
          setPagination(null)
        }
      } finally {
        if (!signal?.aborted) {
          setFetching(false)
        }
      }
    },
    [
      masterfileNumberSearch,
      subjectSearch,
      addressedToSearch,
      bodySearch,
      fiscalYearSearch,
      createdFrom,
      createdTo,
      hasPdf,
      sortBy,
      page,
    ]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      fetchRequests(controller.signal)
    }, 300)
    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [fetchRequests])

  const clearFilters = () => {
    setMasterfileNumberSearch('')
    setSubjectSearch('')
    setAddressedToSearch('')
    setBodySearch('')
    setFiscalYearSearch('')
    setCreatedFrom('')
    setCreatedTo('')
    setHasPdf('all')
    setSortBy('newest')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Masterfile numbers</h1>
          <p className="text-gray-600 mt-1">
            Search and filter masterfile requests. Superadmin, directors, dy. directors, and users
            with submission or completion oversight permissions see every request in the system.
          </p>
        </div>
        <Link href="/masterfiles">
          <Button variant="outline">New request</Button>
        </Link>
      </div>

      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Search &amp; filters</h2>
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-sm">
              Clear all
            </Button>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Search</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Masterfile number"
                value={masterfileNumberSearch}
                onChange={(e) => {
                  setPage(1)
                  setMasterfileNumberSearch(e.target.value)
                }}
                placeholder="e.g. MF-..."
              />
              <Input
                label="Subject"
                value={subjectSearch}
                onChange={(e) => {
                  setPage(1)
                  setSubjectSearch(e.target.value)
                }}
                placeholder="Subject of letter"
              />
              <Input
                label="Addressed to"
                value={addressedToSearch}
                onChange={(e) => {
                  setPage(1)
                  setAddressedToSearch(e.target.value)
                }}
                placeholder="Recipient name or org"
              />
              <Input
                label="Description / body"
                value={bodySearch}
                onChange={(e) => {
                  setPage(1)
                  setBodySearch(e.target.value)
                }}
                placeholder="Words from letter description"
              />
              <Input
                label="Fiscal year"
                value={fiscalYearSearch}
                onChange={(e) => {
                  setPage(1)
                  setFiscalYearSearch(e.target.value)
                }}
                placeholder="e.g. FY 2079/80"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Created date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
              <Input
                label="From"
                type="date"
                value={createdFrom}
                onChange={(e) => {
                  setPage(1)
                  setCreatedFrom(e.target.value)
                }}
              />
              <Input
                label="To"
                type="date"
                value={createdTo}
                onChange={(e) => {
                  setPage(1)
                  setCreatedTo(e.target.value)
                }}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Other</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <Select
                label="PDF attachment"
                value={hasPdf}
                onChange={(e) => {
                  setPage(1)
                  setHasPdf(e.target.value)
                }}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'yes', label: 'Has PDF' },
                  { value: 'no', label: 'No PDF' },
                ]}
              />
              <Select
                label="Sort by"
                value={sortBy}
                onChange={(e) => {
                  setPage(1)
                  setSortBy(e.target.value)
                }}
                options={[
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'number', label: 'Masterfile number (A–Z)' },
                  { value: 'totalAsc', label: 'Total (low to high)' },
                  { value: 'totalDesc', label: 'Total (high to low)' },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Results</CardTitle>
            {pagination ? (
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {fetching && requests.length === 0 ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No masterfile numbers match your filters.{' '}
              <Link href="/masterfiles" className="text-blue-600 hover:underline font-medium">
                Submit a new request
              </Link>
            </p>
          ) : (
            <div className={`space-y-4 transition-opacity ${fetching ? 'opacity-60 pointer-events-none' : ''}`}>
              {requests.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100/80 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">
                        {item.masterfileNumber}
                        <span className="text-gray-600 font-normal text-base ml-2">
                          (Total {item.masterfileTotal}
                          {item.fiscalYear ? ` · ${item.fiscalYear}` : ''})
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mt-2 font-medium">{item.subjectOfLetter}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Addressed to: {item.letterAddressedTo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(item.createdAt)}</p>
                      {item.requestedBy ? (
                        <p className="text-xs text-gray-600 mt-1">
                          Requested by:{' '}
                          <span className="font-medium">{item.requestedBy.name}</span>
                          <span className="text-gray-500"> ({item.requestedBy.email})</span>
                        </p>
                      ) : null}
                    </div>
                    {item.pdfUrl && item.pdfFilename ? (
                      <a
                        className="text-sm text-blue-600 hover:underline shrink-0"
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF: {item.pdfFilename}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">No PDF</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-3 line-clamp-3 whitespace-pre-wrap">
                    {item.descriptionOfLetter}
                  </p>
                </div>
              ))}

              {pagination && pagination.totalPages > 1 ? (
                <div className="flex justify-center items-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
