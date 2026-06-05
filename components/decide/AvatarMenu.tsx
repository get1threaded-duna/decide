"use client";

import { useEffect, useRef } from "react";

interface AvatarMenuProps {
  email: string;
}

export function AvatarMenu({ email }: AvatarMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const initial = email.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = ref.current;
      if (el && el.open && !el.contains(e.target as Node)) {
        el.open = false;
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label="Account menu"
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full bg-[var(--decide-accent)] text-xs font-medium text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--decide-accent)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
      >
        {initial}
      </summary>
      <div
        role="menu"
        className="absolute right-0 top-9 z-10 min-w-[200px] rounded-lg border border-border bg-background p-2 shadow-lg"
      >
        <div className="truncate px-2 py-1.5 text-xs text-[var(--decide-text-muted)]" title={email}>
          {email}
        </div>
        <div className="my-1 h-px bg-border" />
        <a
          href="/tune"
          role="menuitem"
          className="block rounded px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[var(--decide-surface-warm)]"
        >
          Tune me
        </a>
      </div>
    </details>
  );
}
