// Mirrors the existing context strings, e.g. "Sun · 5:32 PM".
export function formatContextTime(d: Date): string {
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}
