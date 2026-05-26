import { cn } from "@/lib/utils";

export interface ContextPreset {
  id: string;
  label: string;
}

export interface ContextSwitcherProps {
  presets: ContextPreset[];
  activeId: string;
}

export function ContextSwitcher({ presets, activeId }: ContextSwitcherProps) {
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
        {presets.map((c) => (
          <button
            key={c.id}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              c.id === activeId
                ? "border-foreground bg-foreground text-background"
                : "border-[var(--decide-border-warm)] bg-card text-[var(--decide-text-tertiary)] hover:border-[var(--decide-accent)] hover:text-[var(--decide-accent)]"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
