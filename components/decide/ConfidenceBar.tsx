import { cn } from "@/lib/utils";

export interface ConfidenceBarProps {
  label: string;
  value: number;
  className?: string;
}

export function ConfidenceBar({ label, value, className }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-3 text-xs", className)}>
      <span className="w-14 capitalize text-[var(--decide-text-secondary)]">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#ECE5D7]">
        <div
          className="h-full rounded-full bg-[var(--decide-accent)] transition-all duration-400"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 text-right font-mono text-[11.5px] text-[var(--decide-text-muted)]">
        {clamped}%
      </span>
    </div>
  );
}
