'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const [email, setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--decide-accent)]" />
            <span className="font-serif text-xl font-medium text-foreground">Decide</span>
          </div>
          <p className="text-sm text-[var(--decide-text-secondary)]">
            {submitted ? 'Check your email.' : 'Enter your email to get a magic link.'}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-[var(--decide-border)] bg-[var(--decide-surface-subtle)] px-5 py-4 text-sm text-[var(--decide-text-secondary)]">
            Magic link sent to <strong className="text-foreground">{email}</strong>.
            Click the link in that email to sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--decide-border)] bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--decide-text-muted)] outline-none focus:border-[var(--decide-accent)] focus:ring-2 focus:ring-[var(--decide-accent)]/20"
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
