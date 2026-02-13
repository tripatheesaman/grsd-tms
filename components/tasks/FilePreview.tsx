'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { withBasePath } from '@/lib/base-path'

interface FilePreviewProps {
  attachment: {
    id: string
    filename: string
    mimeType?: string | null
  }
}

export function FilePreview({ attachment }: FilePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isImage = attachment.mimeType?.startsWith('image/')
  const isPDF = attachment.mimeType === 'application/pdf'
  const isText = attachment.mimeType?.startsWith('text/')

  const handlePreview = async () => {
    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/files/${attachment.id}`))
      if (response.ok) {
        if (isText) {
          const text = await response.text()
          setPreviewUrl(text)
        } else {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setPreviewUrl(url)
        }
        setIsPreviewOpen(true)
      }
    } catch (error) {
      console.error('Error loading preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    window.open(withBasePath(`/api/files/${attachment.id}`), '_blank')
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {isImage || isPDF || isText ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            isLoading={loading}
          >
            Preview
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={handleDownload}>
          Download
        </Button>
      </div>

      <Modal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false)
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
          }
        }}
        title={attachment.filename}
        size="xl"
      >
        <div className="max-h-[80vh] overflow-auto">
          {isImage && previewUrl && (
            <img
              src={previewUrl}
              alt={attachment.filename}
              className="w-full h-auto"
            />
          )}
          {isPDF && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] border-0"
              title={attachment.filename}
            />
          )}
          {isText && previewUrl && (
            <pre className="whitespace-pre-wrap p-4 bg-gray-50 rounded-lg max-h-[70vh] overflow-auto font-mono text-sm">
              {previewUrl}
            </pre>
          )}
        </div>
      </Modal>
    </>
  )
}

