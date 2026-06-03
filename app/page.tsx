"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { BentoDashboard } from "@/components/decide/bento-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { Modality } from "@/lib/decide/types";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [streak, setStreak] = useState({ current: 0, best: 0 });

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handlePickCategory = (modality: Modality) => {
    setStreak((s) => ({
      current: s.current + 1,
      best: Math.max(s.best, s.current + 1),
    }));
    if (typeof window !== "undefined") {
      window.location.href = `/dashboard?focus=${modality}`;
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Decide</h1>
        <div className="text-sm text-[var(--decide-text-secondary)]">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md border border-[var(--decide-border)] px-3 py-1.5 transition-colors hover:border-[var(--decide-accent)]"
            >
              Open feed →
            </Link>
          ) : (
            <Link
              href="/signin"
              className="rounded-md border border-[var(--decide-border)] px-3 py-1.5 transition-colors hover:border-[var(--decide-accent)]"
            >
              Sign in →
            </Link>
          )}
        </div>
      </header>
      <BentoDashboard
        user={user}
        streak={streak}
        onPickCategory={handlePickCategory}
      />
    </main>
  );
}
