import type { ComponentProps, ReactNode } from 'react';
import {
  BusFront,
  CalendarDays,
  Clock3,
  Cloud,
  CloudFog,
  CloudOff,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Film,
  Flame,
  GalleryHorizontalEnd,
  Gauge,
  Globe,
  Image,
  Layers,
  Link2,
  Megaphone,
  Mountain,
  Music2,
  Newspaper,
  Palette,
  Puzzle,
  QrCode,
  School,
  Snowflake,
  Sparkles,
  Sun,
  TriangleAlert,
  Tv,
  UtensilsCrossed,
  Wind,
  Users,
  Hourglass,
  ArrowLeftRight,
  Smile,
  PartyPopper,
  Coins,
  Satellite,
  Flag,
  Languages,
  Hand,
  Wine,
  Rss,
  Table,
  Type,
  CalendarRange,
  Wifi,
  Info,
  Database,
  Sunrise,
  Sunset,
  Camera,
  MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconName } from '../lib/icon-names';

interface AppIconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

const ICONS: Partial<Record<IconName, LucideIcon>> = {
  bus: BusFront,
  calendar: CalendarDays,
  carousel: GalleryHorizontalEnd,
  clock: Clock3,
  cloud: Cloud,
  cloudFog: CloudFog,
  cloudLightning: CloudLightning,
  cloudRain: CloudRain,
  cloudSun: CloudSun,
  droplets: Droplets,
  film: Film,
  flame: Flame,
  gauge: Gauge,
  globe: Globe,
  image: Image,
  layers: Layers,
  link: Link2,
  megaphone: Megaphone,
  mountain: Mountain,
  music: Music2,
  newspaper: Newspaper,
  palette: Palette,
  puzzle: Puzzle,
  qrCode: QrCode,
  school: School,
  slideshow: GalleryHorizontalEnd,
  snowflake: Snowflake,
  sparkles: Sparkles,
  sun: Sun,
  tv: Tv,
  utensils: UtensilsCrossed,
  warning: TriangleAlert,
  weather: CloudSun,
  wind: Wind,
  users: Users,
  hourglass: Hourglass,
  cloudOff: CloudOff,
  arrowLeftRight: ArrowLeftRight,
  smile: Smile,
  partyPopper: PartyPopper,
  coins: Coins,
  satellite: Satellite,
  flag: Flag,
  languages: Languages,
  hand: Hand,
  wine: Wine,
  rss: Rss,
  table: Table,
  type: Type,
  calendarRange: CalendarRange,
  wifi: Wifi,
  info: Info,
  database: Database,
  sunrise: Sunrise,
  sunset: Sunset,
  camera: Camera,
  mapPin: MapPin,
};

/* ── Brand SVG icons (not available in Lucide) ── */

const BRAND_ICONS: Partial<Record<IconName, (props: { className?: string; title?: string }) => ReactNode>> = {
  brandYoutube: ({ className, title }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={!title} aria-label={title}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  brandCanva: ({ className, title }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={!title} aria-label={title}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.194 14.612c-.447 1.693-2.073 3.5-5.194 3.5-3.68 0-6.165-2.757-6.165-5.995 0-3.932 3.085-6.83 6.717-6.83 2.13 0 3.274.998 3.274 2.09 0 .738-.446 1.136-.96 1.136-.37 0-.71-.222-.71-.71 0-.26.11-.48.11-.775 0-.515-.488-1.006-1.452-1.006-2.2 0-4.046 1.98-4.046 4.633 0 2.088 1.27 3.984 3.685 3.984 1.642 0 2.83-.986 3.42-2.022.182-.32.38-.384.564-.384.368 0 .63.352.63.69 0 .48-.26.782-.873 1.69z"/>
    </svg>
  ),
  brandGoogle: ({ className, title }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={!title} aria-label={title}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  brandGoogleCalendar: ({ className, title }) => (
    <svg viewBox="0 0 122.88 122.88" className={className} aria-hidden={!title} aria-label={title}>
      <polygon fill="#FFFFFF" points="93.78,29.1 29.1,29.1 29.1,93.78 93.78,93.78"/>
      <polygon fill="#F72A25" points="93.78,122.88 122.88,93.78 93.78,93.78"/>
      <polygon fill="#FBBC04" points="122.88,29.1 93.78,29.1 93.78,93.78 122.88,93.78"/>
      <polygon fill="#34A853" points="93.78,93.78 29.1,93.78 29.1,122.88 93.78,122.88"/>
      <path fill="#188038" d="M0,93.78v19.4c0,5.36,4.34,9.7,9.7,9.7h19.4v-29.1H0z"/>
      <path fill="#1967D2" d="M122.88,29.1V9.7c0-5.36-4.34-9.7-9.7-9.7h-19.4v29.1H122.88z"/>
      <path fill="#4285F4" d="M93.78,0H9.7C4.34,0,0,4.34,0,9.7v84.08h29.1V29.1h64.67V0z"/>
      <path fill="#1A73E8" d="M42.37,79.27c-2.42-1.63-4.09-4.02-5-7.17l5.61-2.31c0.51,1.94,1.4,3.44,2.67,4.51c1.26,1.07,2.8,1.59,4.59,1.59c1.84,0,3.41-0.56,4.73-1.67c1.32-1.12,1.98-2.54,1.98-4.26c0-1.76-0.7-3.2-2.09-4.32c-1.39-1.12-3.14-1.67-5.22-1.67H46.4v-5.55h2.91c1.79,0,3.31-0.48,4.54-1.46c1.23-0.97,1.84-2.3,1.84-3.99c0-1.5-0.55-2.7-1.65-3.6s-2.49-1.35-4.18-1.35c-1.65,0-2.96,0.44-3.93,1.32c-0.97,0.88-1.7,2-2.12,3.24l-5.55-2.31c0.74-2.09,2.09-3.93,4.07-5.52c1.98-1.59,4.51-2.39,7.58-2.39c2.27,0,4.32,0.44,6.13,1.32c1.81,0.88,3.23,2.1,4.26,3.65c1.03,1.56,1.54,3.31,1.54,5.25c0,1.98-0.48,3.65-1.43,5.03c-0.95,1.37-2.13,2.43-3.52,3.16v0.33c1.79,0.74,3.36,1.96,4.51,3.52c1.17,1.58,1.76,3.46,1.76,5.66c0,2.2-0.56,4.16-1.67,5.88c-1.12,1.72-2.66,3.08-4.62,4.07c-1.96,0.99-4.17,1.49-6.62,1.49C47.41,81.72,44.79,80.91,42.37,79.27z M76.83,51.43l-6.16,4.45l-3.08-4.67l11.05-7.97h4.24v37.6h-6.05V51.43z"/>
    </svg>
  ),
  brandGoogleSheets: ({ className, title }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden={!title} aria-label={title}>
      <path d="M14.727 0H2.182C.977 0 0 .977 0 2.182v19.636C0 23.023.977 24 2.182 24h19.636C23.023 24 24 23.023 24 21.818V9.273L14.727 0z" fill="#0f9c57"/>
      <path d="M5.818 12.436v8.728h12.364v-8.728H5.818zm5.091 7.637H6.909v-1.528h3.999v1.528zm0-2.618H6.909v-1.528h3.999v1.528zm0-2.619H6.909v-1.527h3.999v1.527zm5.182 5.237h-4.091v-1.528h4.091v1.528zm0-2.618h-4.091v-1.528h4.091v1.528zm0-2.619h-4.091v-1.527h4.091v1.527z" fill="#f0f0f0"/>
      <path d="M14.727 0v7.091c0 1.205.977 2.182 2.182 2.182H24L14.727 0z" fill="#87cdac"/>
    </svg>
  ),
  brandHomeAssistant: ({ className, title }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={!title} aria-label={title}>
      <path d="M12 0L1.608 6v12L12 24l10.392-6V6zm-1.073 16.4H8.473l-.14-.523c-.633-.046-1.202-.2-1.71-.467a4.626 4.626 0 0 1-1.316-.966l1.517-1.63c.506.552 1.09.837 1.742.837.228 0 .403-.047.525-.143a.474.474 0 0 0 .183-.39c0-.18-.076-.322-.229-.427-.152-.104-.448-.222-.887-.352-.64-.189-1.16-.434-1.562-.735-.401-.3-.602-.783-.602-1.448 0-.628.226-1.15.678-1.567.452-.418 1.053-.666 1.803-.747l.14-.505h2.454l.14.505c.49.036.942.156 1.354.36.412.204.776.473 1.09.807l-1.517 1.63c-.401-.42-.855-.63-1.362-.63-.21 0-.374.042-.491.125a.4.4 0 0 0-.175.34c0 .168.083.303.248.404.166.101.472.214.918.338.614.17 1.122.414 1.524.73.402.317.603.81.603 1.48 0 .644-.228 1.178-.684 1.601-.456.424-1.062.677-1.818.76zm5.073 0h-2v-8h2z"/>
    </svg>
  ),
};

export default function AppIcon({
  name,
  className,
  strokeWidth = 1.8,
  title,
}: AppIconProps) {
  // Check for brand icons first
  const BrandIcon = BRAND_ICONS[name];
  if (BrandIcon) {
    return <BrandIcon className={className} title={title} />;
  }

  const IconComponent = ICONS[name];
  if (!IconComponent) {
    return <Puzzle className={className} strokeWidth={strokeWidth} aria-hidden />;
  }
  const accessibilityProps: Pick<ComponentProps<'svg'>, 'aria-hidden' | 'aria-label'> = title
    ? { 'aria-label': title }
    : { 'aria-hidden': true };

  return (
    <IconComponent
      className={className}
      strokeWidth={strokeWidth}
      {...accessibilityProps}
    />
  );
}
