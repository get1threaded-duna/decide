"use client";

import { useEffect, useState } from "react";
import { ContextBar, type WeatherIcon } from "./ContextBar";
import { getSeason } from "@/lib/decide/season";
import { formatContextTime } from "@/lib/decide/time";

type Weather = {
  tempF: number;
  description: string;
  icon: WeatherIcon;
  location: string;
};

interface LiveContextBarProps {
  fallback: {
    loc: string;
    weather: string;
    weatherIcon?: WeatherIcon;
  };
}

export function LiveContextBar({ fallback }: LiveContextBarProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [weather, setWeather] = useState<Weather | null>(null);

  // Tick on the minute boundary so the displayed time matches the system clock.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async (qs: string) => {
      try {
        const res = await fetch(`/api/weather${qs}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as Weather;
        if (!cancelled) setWeather(json);
      } catch {
        // Swallow — fallback values stay rendered.
      }
    };

    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(2);
          const lon = pos.coords.longitude.toFixed(2);
          void load(`?lat=${lat}&lon=${lon}`);
        },
        () => {
          void load("");
        },
        { timeout: 5_000, maximumAge: 10 * 60 * 1000 },
      );
    } else {
      void load("");
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ContextBar
      location={weather?.location ?? fallback.loc}
      time={formatContextTime(now)}
      weather={weather ? `${weather.tempF}°, ${weather.description}` : fallback.weather}
      season={getSeason(now.getMonth())}
      weatherIcon={weather?.icon ?? fallback.weatherIcon}
    />
  );
}
