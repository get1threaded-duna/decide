import type { WeatherIcon } from "@/components/decide/ContextBar";

const FAIRFAX = { lat: 38.8462, lon: -77.3064, name: "Fairfax, VA" };

export type WeatherIconKind = "sun" | "cloud" | "rain";

export interface WeatherLookupInput {
  lat?: number;
  lon?: number;
  ip?: string | null;
}

export interface WeatherLookup {
  tempF: number;
  description: string;
  icon: WeatherIconKind;
  location: string;
  rawIcon: string;
  /** UTC offset in seconds at the looked-up location, as reported by OpenWeather. */
  timezoneOffsetSec: number;
}

function mapIcon(owIconCode: string): WeatherIconKind {
  const prefix = owIconCode.slice(0, 2);
  if (prefix === "01") return "sun";
  if (["09", "10", "11", "13"].includes(prefix)) return "rain";
  return "cloud";
}

async function ipLocate(ip: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const j = await res.json();
    if (typeof j.latitude !== "number" || typeof j.longitude !== "number") return null;
    const name = [j.city, j.region_code].filter(Boolean).join(", ") || "Nearby";
    return { lat: j.latitude, lon: j.longitude, name };
  } catch {
    return null;
  }
}

/**
 * Look up current weather. Resolution order:
 *   1. lat/lon if provided and finite
 *   2. IP geolocation via ipapi.co if `ip` is provided
 *   3. Fairfax, VA fallback
 *
 * OpenWeather upstream is cached in the Next.js Data Cache for 10 minutes,
 * keyed by coords rounded to 2 decimals (~1km buckets) so neighbors share entries.
 * Returns null only if OPENWEATHER_API_KEY is unset or upstream fails.
 */
export async function lookupWeather(input: WeatherLookupInput): Promise<WeatherLookup | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  let lat: number;
  let lon: number;
  let locationName: string | null = null;

  if (Number.isFinite(input.lat) && Number.isFinite(input.lon)) {
    lat = input.lat as number;
    lon = input.lon as number;
  } else {
    const geo = input.ip ? await ipLocate(input.ip) : null;
    if (geo) {
      lat = geo.lat;
      lon = geo.lon;
      locationName = geo.name;
    } else {
      lat = FAIRFAX.lat;
      lon = FAIRFAX.lon;
      locationName = FAIRFAX.name;
    }
  }

  const latR = lat.toFixed(2);
  const lonR = lon.toFixed(2);

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latR}&lon=${lonR}&units=imperial&appid=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const j = await res.json();
    const rawIcon = (j?.weather?.[0]?.icon ?? "03").toString();
    return {
      tempF: Math.round(j?.main?.temp ?? 0),
      description: (j?.weather?.[0]?.description ?? "").toString(),
      icon: mapIcon(rawIcon),
      location: locationName ?? j?.name ?? FAIRFAX.name,
      rawIcon,
      timezoneOffsetSec: typeof j?.timezone === "number" ? j.timezone : -14400,
    };
  } catch {
    return null;
  }
}

// Re-export so importing modules don't need a second import path for the icon type alias.
export type { WeatherIcon };
