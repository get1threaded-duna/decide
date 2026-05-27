import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--decide-accent)]" />
          <span className="font-serif text-xl font-medium text-foreground">Decide</span>
        </div>

        <div className="rounded-xl border border-[var(--decide-border)] bg-card px-5 py-4 space-y-1">
          <p className="text-2xs font-medium uppercase tracking-widest text-[var(--decide-text-muted)]">
            Signed in as
          </p>
          <p className="text-sm text-foreground font-medium">{user.email}</p>
        </div>

        <SignOutButton />
      </div>
    </main>
  )
}

// Isolated client component so the page stays a Server Component
function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="w-full rounded-lg border border-[var(--decide-border)] px-4 py-2.5 text-sm text-[var(--decide-text-tertiary)] transition-colors hover:bg-[var(--decide-surface-warm)]"
      >
        Sign out
      </button>
    </form>
  )
}
