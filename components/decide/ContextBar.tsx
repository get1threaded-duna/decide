import { MapPin, Clock, Sun, Cloud, CloudRain, Leaf } from "lucide-react";

export type WeatherIcon = "sun" | "cloud" | "rain";

export interface ContextBarProps {
  location: string;
  time: string;
  weather: string;
  season: string;
  weatherIcon?: WeatherIcon;
}

const WEATHER_ICONS: Record<WeatherIcon, React.ElementType> = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
};

export function ContextBar({
  location,
  time,
  weather,
  season,
  weatherIcon = "sun",
}: ContextBarProps) {
  const WeatherIconComponent = WEATHER_ICONS[weatherIcon];

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 rounded-[10px] bg-[var(--decide-surface-warm)] px-4 py-3 text-sm text-[var(--decide-text-secondary)]">
      <Chip icon={MapPin}>
        <strong className="font-medium text-foreground">{location}</strong>
      </Chip>
      <Chip icon={Clock}>
        <strong className="font-mono font-medium text-foreground">{time}</strong>
      </Chip>
      <Chip icon={WeatherIconComponent}>
        <strong className="font-medium text-foreground">{weather}</strong>
      </Chip>
      <Chip icon={Leaf}>
        <strong className="font-medium text-foreground">{season}</strong>
      </Chip>
    </div>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-[7px]">
      <Icon size={14} />
      {children}
    </span>
  );
}
