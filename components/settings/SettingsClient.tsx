'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { withBasePath } from '@/lib/base-path'

interface SettingsClientProps {
  initialSettings: {
    currentFy: string
    dispatchStartNumber: number
    receiveStartNumber: number
    masterfileStartNumber: number
    masterfileMaxTotal: number | null
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
    smtpUser: string
    smtpFrom: string
    hasSmtpPassword: boolean
  }
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const toast = useToast()
  const [settings, setSettings] = useState(initialSettings)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(withBasePath('/api/settings'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          smtpPassword: smtpPassword.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to save settings')
        return
      }
      setSettings(data.settings)
      setSmtpPassword('')
      toast.success('Settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    setTesting(true)
    try {
      const response = await fetch(withBasePath('/api/settings/test-smtp'), {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'SMTP test failed')
        return
      }
      toast.success('SMTP connection successful')
    } catch (error) {
      toast.error('SMTP test failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure SMTP and fiscal-year numbering for dispatch, receive, and masterfile records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fiscal Year and Numbering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Current FY (BS format)"
            value={settings.currentFy}
            placeholder="2083/84"
            disabled
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dispatch Start Number"
              type="number"
              min={1}
              value={String(settings.dispatchStartNumber)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  dispatchStartNumber: Math.max(1, Number(e.target.value || 1)),
                }))
              }
            />
            <Input
              label="Receive Start Number"
              type="number"
              min={1}
              value={String(settings.receiveStartNumber)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  receiveStartNumber: Math.max(1, Number(e.target.value || 1)),
                }))
              }
            />
            <Input
              label="Masterfile Start Number"
              type="number"
              min={1}
              value={String(settings.masterfileStartNumber)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  masterfileStartNumber: Math.max(1, Number(e.target.value || 1)),
                }))
              }
            />
            <Input
              label="Masterfile Maximum Total (optional)"
              type="number"
              min={1}
              value={
                settings.masterfileMaxTotal === null || settings.masterfileMaxTotal === undefined
                  ? ''
                  : String(settings.masterfileMaxTotal)
              }
              onChange={(e) => {
                const raw = e.target.value.trim()
                setSettings((prev) => ({
                  ...prev,
                  masterfileMaxTotal: raw === '' ? null : Math.max(1, Number(raw)),
                }))
              }}
              placeholder="No limit"
            />
          </div>
          <p className="text-sm text-gray-500">
            Number format: <strong>Dispatch</strong> = `D-FY-sequence`,{' '}
            <strong>Receive</strong> = `R-FY-sequence`, <strong>Masterfile</strong> = `MF-FY-sequence`.
            Masterfile maximum total is the highest allowed sequence value for the current fiscal year
            (leave blank for no limit).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMTP Host"
              value={settings.smtpHost}
              onChange={(e) => setSettings((prev) => ({ ...prev, smtpHost: e.target.value }))}
              placeholder="mail.example.com"
            />
            <Input
              label="SMTP Port"
              type="number"
              value={String(settings.smtpPort)}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, smtpPort: Number(e.target.value || 587) }))
              }
            />
            <Input
              label="SMTP User"
              value={settings.smtpUser}
              onChange={(e) => setSettings((prev) => ({ ...prev, smtpUser: e.target.value }))}
            />
            <Input
              label="SMTP From"
              value={settings.smtpFrom}
              onChange={(e) => setSettings((prev) => ({ ...prev, smtpFrom: e.target.value }))}
              placeholder="no-reply@example.com"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.smtpSecure}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, smtpSecure: e.target.checked }))
              }
            />
            <span className="text-sm text-gray-700">Use secure SMTP (SSL/TLS)</span>
          </label>
          <Input
            label={
              settings.hasSmtpPassword
                ? 'SMTP Password (leave blank to keep current)'
                : 'SMTP Password'
            }
            type="password"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleTestSmtp} isLoading={testing}>
              Test SMTP
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}
