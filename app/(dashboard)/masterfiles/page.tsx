'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { withBasePath } from '@/lib/base-path'

type MasterfileRequest = {
  id: string
  fiscalYear?: string
  masterfileNumber: string
  masterfileTotal: number
  subjectOfLetter: string
  descriptionOfLetter: string
  letterAddressedTo: string
  pdfFilename?: string | null
  pdfFilepath?: string | null
  pdfUrl?: string | null
  createdAt: string
}

export default function MasterfileRequestsPage() {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmedRequest, setConfirmedRequest] = useState<MasterfileRequest | null>(null)
  const [form, setForm] = useState({
    subjectOfLetter: '',
    descriptionOfLetter: '',
    letterAddressedTo: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.subjectOfLetter.trim() || !form.descriptionOfLetter.trim() || !form.letterAddressedTo.trim()) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    try {
      const body = new FormData()
      body.append('subjectOfLetter', form.subjectOfLetter.trim())
      body.append('descriptionOfLetter', form.descriptionOfLetter.trim())
      body.append('letterAddressedTo', form.letterAddressedTo.trim())
      if (file) body.append('file', file)

      const res = await fetch(withBasePath('/api/masterfiles'), {
        method: 'POST',
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to request masterfile number')
        return
      }
      setConfirmedRequest(data.request)
      setConfirmOpen(true)
      setForm({
        subjectOfLetter: '',
        descriptionOfLetter: '',
        letterAddressedTo: '',
      })
      setFile(null)
    } catch (error) {
      toast.error('Failed to request masterfile number')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setConfirmedRequest(null)
        }}
        title="Masterfile number assigned"
        size="md"
        footer={
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setConfirmOpen(false)
              setConfirmedRequest(null)
            }}
          >
            OK
          </Button>
        }
      >
        {confirmedRequest ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="text-base font-semibold text-gray-900">
              Your masterfile number has been generated successfully.
            </p>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2">
              <p>
                <span className="font-medium text-gray-900">Masterfile number: </span>
                {confirmedRequest.masterfileNumber}
              </p>
              <p>
                <span className="font-medium text-gray-900">Fiscal year total: </span>
                {confirmedRequest.masterfileTotal}
              </p>
              {confirmedRequest.fiscalYear ? (
                <p>
                  <span className="font-medium text-gray-900">Fiscal year: </span>
                  {confirmedRequest.fiscalYear}
                </p>
              ) : null}
            </div>
            <div className="pt-1 border-t border-gray-100 space-y-1">
              <p>
                <span className="font-medium text-gray-900">Subject: </span>
                {confirmedRequest.subjectOfLetter}
              </p>
              <p>
                <span className="font-medium text-gray-900">Addressed to: </span>
                {confirmedRequest.letterAddressedTo}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Masterfile Number</h1>
          <p className="text-gray-600 mt-1">
            Submit letter details to generate your fiscal-year masterfile number.
          </p>
        </div>
        <Link href="/masterfiles/requests">
          <Button variant="outline">My masterfile numbers</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Subject of the letter"
              value={form.subjectOfLetter}
              onChange={(e) => setForm((prev) => ({ ...prev, subjectOfLetter: e.target.value }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description of the letter
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px]"
                value={form.descriptionOfLetter}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descriptionOfLetter: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label="Letter addressed to"
              value={form.letterAddressedTo}
              onChange={(e) => setForm((prev) => ({ ...prev, letterAddressedTo: e.target.value }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload PDF (optional)
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
