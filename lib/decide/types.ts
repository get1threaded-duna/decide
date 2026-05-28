export type Modality = "eat" | "watch" | "read" | "do" | "listen" | "connect";

export type WeatherIcon = "sun" | "cloud" | "rain";

export interface Item {
  id: string;
  title: string;
  meta: string;
  tags: string[];
  fallback: string;
}

export interface DecideContext {
  id: string;
  label: string;
  loc: string;
  city: string;
  time: string;
  tod: "morning" | "evening" | "late-night";
  dow: "weekday" | "weekend";
  weather: string;
  weatherIcon: WeatherIcon;
  season: string;
  seasonTag: "spring" | "summer" | "fall" | "winter";
  weatherTag: string;
  vibe: string;
  greetT: string;
  greetS: string;
}

export interface FeedbackEntry {
  action: "save" | "swap" | "ignore" | "open";
  item: { id: string; title: string; tags: string[]; category: Modality };
  ts: number;
}

export interface Pattern {
  tag: string;
  count: number;
}

export interface DerivedPatterns {
  recentSaves: FeedbackEntry[];
  recentPasses: FeedbackEntry[];
  topTags: Pattern[];
  saveCount: number;
}
