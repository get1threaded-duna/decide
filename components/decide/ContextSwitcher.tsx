import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ContextPreset {
  id: string;
  label: string;
  href?: string;
}

export interface ContextSwitcherProps {
  presets: ContextPreset[];
  activeId: string;
}

export function ContextSwitcher({ presets, activeId }: ContextSwitcherProps) {
  const pillClass = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-[var(--decide-border-warm)] bg-card text-[var(--decide-text-tertiary)] hover:border-[var(--decide-accent)] hover:text-[var(--decide-accent)]"
    );

  return (
    <div className="border-t border-[var(--decide-border)] pt-5 mt-7">
      <h3 className="font-serif text-[15px] font-medium tracking-snug text-foreground mb-1">
        Try a different context
      </h3>
      <p className="text-xs text-[var(--decide-text-muted)] mb-3">
        The whole feed re-ranks. Save a couple things first, then change context — watch
        the reasons reference your saves.
      </p>
      <div className="flex flex-wrap gap-[7px]">
        {presets.map((c) => {
          const active = c.id === activeId;
          return c.href ? (
            <Link key={c.id} href={c.href} className={pillClass(active)}>
              {c.label}
            </Link>
          ) : (
            <button key={c.id} className={pillClass(active)}>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
