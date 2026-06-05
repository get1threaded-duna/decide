import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FAIRFAX = { lat: 38.8462, lon: -77.3064, name: "Fairfax, VA" };

type WeatherIcon = "sun" | "cloud" | "rain";

type WeatherResponse = {
  tempF: number;
  description: string;
  icon: WeatherIcon;
  location: string;
};

function mapIcon(owIconCode: string): WeatherIcon {
  // OpenWeather icon codes: 01* clear, 02-04* clouds, 09/10/11* rain/storm, 13* snow, 50* mist.
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

export async function GET(req: NextRequest) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "OPENWEATHER_API_KEY not set" }, { status: 500 });
  }

  const sp = req.nextUrl.searchParams;
  const qLat = Number(sp.get("lat"));
  const qLon = Number(sp.get("lon"));

  let lat: number;
  let lon: number;
  let locationName: string | null = null;

  if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
    lat = qLat;
    lon = qLon;
  } else {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const geo = ip ? await ipLocate(ip) : null;
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

  // Round to 2 decimals (~1km buckets) so neighbors share the Next.js Data Cache entry.
  const latR = lat.toFixed(2);
  const lonR = lon.toFixed(2);

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latR}&lon=${lonR}&units=imperial&appid=${key}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    return NextResponse.json({ error: "weather fetch failed", status: res.status }, { status: 502 });
  }
  const j = await res.json();

  const out: WeatherResponse = {
    tempF: Math.round(j?.main?.temp ?? 0),
    description: (j?.weather?.[0]?.description ?? "").toString(),
    icon: mapIcon(j?.weather?.[0]?.icon ?? "03"),
    location: locationName ?? j?.name ?? FAIRFAX.name,
  };

  return NextResponse.json(out, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" },
  });
}
