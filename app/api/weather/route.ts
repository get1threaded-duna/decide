import { NextRequest, NextResponse } from "next/server";
import { lookupWeather } from "@/lib/weather/lookup";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qLat = Number(sp.get("lat"));
  const qLon = Number(sp.get("lon"));
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

  if (!process.env.OPENWEATHER_API_KEY) {
    return NextResponse.json({ error: "OPENWEATHER_API_KEY not set" }, { status: 500 });
  }

  const result = await lookupWeather({
    lat: Number.isFinite(qLat) ? qLat : undefined,
    lon: Number.isFinite(qLon) ? qLon : undefined,
    ip,
  });

  if (!result) {
    return NextResponse.json({ error: "weather fetch failed" }, { status: 502 });
  }

  return NextResponse.json(
    {
      tempF: result.tempF,
      description: result.description,
      icon: result.icon,
      location: result.location,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" } },
  );
}
