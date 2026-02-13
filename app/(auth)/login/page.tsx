"use client"

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { withBasePath } from '@/lib/base-path'

const fieldStyles =
  'w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm text-white placeholder-white/70 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/60'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(withBasePath('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      if (data.user?.mustChangePassword) {
        router.push(withBasePath('/change-password'))
        router.refresh()
        return
      }

      const redirect = searchParams.get('redirect') || '/dashboard'
      router.push(withBasePath(redirect))
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <section className="w-full max-w-lg lg:flex-1">
      <div className="rounded-[32px] border border-white/15 bg-white/10 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <header className="mb-8 space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-[11px] uppercase tracking-[0.4em] text-white/70">
            <span>Sign In</span>
            <span>•</span>
            <span>GrSD</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Ground Support Login</h2>
          <p className="text-sm text-white/70">Authorized personnel only • Activity monitored</p>
        </header>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-50">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@nac.com.np"
              className={fieldStyles}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white/80">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldStyles}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-blue)] shadow-lg shadow-white/40 transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <footer className="mt-8 text-center text-xs text-white/60">
          Ground Support Department
        </footer>
      </div>
    </section>
  )
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#010b1d] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-blue)] via-[#01204d] to-[var(--brand-red)] opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.05),transparent_40%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-10 lg:flex-row lg:items-center lg:py-0">
        <section className="flex-1 space-y-8 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start">
            <div className="relative flex w-full max-w-sm items-center gap-4 rounded-[28px] border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="relative h-16 w-16 rounded-2xl bg-white shadow-lg shadow-black/20 ring-4 ring-white/30">
                <img src={withBasePath('/logo.png')} alt="Nepal Airlines" className="h-full w-full object-contain p-2" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
                  Nepal Airlines
                </p>
                <p className="text-xl font-semibold text-white">Ground Support Department</p>
                <p className="text-xs text-white/60">Receive &amp; Dispatch Logging System</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Nepal Airlines Ground Support Department
            </h1>
            <p className="mx-auto max-w-xl text-base text-white/85 lg:mx-0">
              Receive &amp; dispatch logging for GrSD. Manage assignments,
              monitor deadlines, and keep an audit-ready history of every action.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            {[
              { title: 'Role-aware workflows', icon: '🛫' },
              { title: 'Deadline intelligence', icon: '⏱️' },
              { title: 'Secure attachments', icon: '🔐' },
              { title: 'Complete audit history', icon: '📑' },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/5 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </section>

        <Suspense fallback={
          <section className="w-full max-w-lg lg:flex-1">
            <div className="rounded-[32px] border border-white/15 bg-white/10 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl">
              <div className="text-center text-white/70">Loading...</div>
            </div>
          </section>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
