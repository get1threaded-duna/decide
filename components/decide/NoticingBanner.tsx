import { Eye } from "lucide-react";

export interface NoticingBannerProps {
  tags: { tag: string; count: number }[];
}

export function NoticingBanner({ tags }: NoticingBannerProps) {
  if (tags.length === 0) return null;

  const text =
    tags.length === 1 ? (
      <>
        You&rsquo;ve been saving <strong className="font-medium text-foreground">{tags[0].tag}</strong> picks.
        The reasons below now lean into that.
      </>
    ) : (
      <>
        Pattern forming:{" "}
        <strong className="font-medium text-foreground">
          {tags.map((t) => t.tag).join(" + ")}
        </strong>
        . Reasons below adjust accordingly.
      </>
    );

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#F0D9A8] bg-gradient-to-b from-[#FEF6E7] to-[#FBF8F2] px-4 py-3">
      <Eye size={16} className="mt-px shrink-0 text-[var(--decide-accent-dark)]" />
      <div>
        <p className="mb-0.5 text-2xs font-medium uppercase tracking-widest text-[var(--decide-accent-dark)]">
          Decide is noticing
        </p>
        <p className="text-sm leading-snug text-[#3D362C]">{text}</p>
      </div>
    </div>
  );
}
