"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveInterests } from "./actions";

interface InterestEditorProps {
  allInterests: string[];
  initial: string[];
}

export function InterestEditor({ allInterests, initial }: InterestEditorProps) {
  const [selected, setSelected] = useState(new Set(initial));
  const [, startTransition] = useTransition();

  const toggle = (tag: string) => {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelected(next);
    const nextArr = Array.from(next);
    startTransition(async () => {
      await saveInterests(nextArr);
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {allInterests.map(tag => {
        const on = selected.has(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              on
                ? "border-[#F5C28F] bg-[#FEF3E7] text-[var(--decide-accent-dark)]"
                : "border-[var(--decide-border-warm)] bg-card text-[var(--decide-text-secondary)] hover:border-[var(--decide-accent)] hover:text-[var(--decide-accent)]"
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
