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
  size?: number;
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
    <svg viewBox="0 0 333333 333333" className={className} aria-hidden={!title} aria-label={title} preserveAspectRatio="xMidYMid meet">
      <path d="M329930 100020s-3254-22976-13269-33065c-12691-13269-26901-13354-33397-14124-46609-3396-116614-3396-116614-3396h-122s-69973 0-116608 3396c-6522 793-20712 848-33397 14124C6501 77044 3316 100020 3316 100020S-1 126982-1 154001v25265c0 26962 3315 53979 3315 53979s3254 22976 13207 33082c12685 13269 29356 12838 36798 14254 26685 2547 113354 3315 113354 3315s70065-124 116675-3457c6522-770 20706-848 33397-14124 10021-10089 13269-33090 13269-33090s3319-26962 3319-53979v-25263c-67-26962-3384-53979-3384-53979z" fill="red"/>
      <path d="M132123 209917v-93681l90046 46997-90046 46684z" fill="#fff"/>
    </svg>
  ),
  brandCanva: ({ className, title }) => (
    <svg viewBox="0 0 508 508" className={className} aria-hidden={!title} aria-label={title} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="canva_r1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(1469.491) rotate(-49.416 1.37 .302)"><stop offset="0" stopColor="#6420ff"/><stop offset="1" stopColor="#6420ff" stopOpacity="0"/></radialGradient>
        <radialGradient id="canva_r2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="rotate(54.703 42.717 594.194) scale(1657.122)"><stop offset="0" stopColor="#00c4cc"/><stop offset="1" stopColor="#00c4cc" stopOpacity="0"/></radialGradient>
        <radialGradient id="canva_r3" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1023 -1030 473.711 470.491 367 1684)"><stop offset="0" stopColor="#6420ff"/><stop offset="1" stopColor="#6420ff" stopOpacity="0"/></radialGradient>
        <radialGradient id="canva_r4" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(595.999 1372 -2298.41 998.431 777 256)"><stop offset="0" stopColor="#00c4cc"/><stop offset="1" stopColor="#00c4cc" stopOpacity="0"/></radialGradient>
      </defs>
      <g transform="matrix(.26718 0 0 .26718 0 0)">
        <circle cx="950" cy="950" r="950" fill="#7d2ae7"/>
        <circle cx="950" cy="950" r="950" fill="url(#canva_r1)"/>
        <circle cx="950" cy="950" r="950" fill="url(#canva_r2)"/>
        <circle cx="950" cy="950" r="950" fill="url(#canva_r3)"/>
        <circle cx="950" cy="950" r="950" fill="url(#canva_r4)"/>
      </g>
      <path d="M446.744 276.845c-.665 0-1.271.43-1.584 1.33-4.011 11.446-9.43 18.254-13.891 18.254-2.563 0-3.6-2.856-3.6-7.336 0-11.21 6.71-34.982 10.095-45.82.392-1.312.646-2.485.646-3.483 0-3.15-1.722-4.696-5.987-4.696-4.598 0-9.547 1.8-14.36 10.233-1.663-7.435-6.691-10.683-13.715-10.683-8.12 0-15.965 5.224-22.421 13.696-6.456 8.471-14.048 11.25-19.76 9.88 4.108-10.057 5.634-17.57 5.634-23.145 0-8.746-4.324-14.028-11.308-14.028-10.624 0-16.747 10.134-16.747 20.797 0 8.237 3.736 16.708 11.954 20.817-6.887 15.573-16.943 29.66-20.758 29.66-4.93 0-6.379-24.123-6.105-41.38.176-9.9.998-10.408.998-13.401 0-1.722-1.115-2.896-5.595-2.896-10.448 0-13.676 8.844-14.165 18.998a50.052 50.052 0 01-1.8 11.406c-4.363 15.573-13.363 27.39-19.232 27.39-2.72 0-3.463-2.72-3.463-6.28 0-11.21 6.28-25.219 6.28-37.173 0-8.784-3.854-14.34-11.112-14.34-8.55 0-19.858 10.173-30.56 29.229 3.521-14.595 4.97-28.721-5.459-28.721a14.115 14.115 0 00-6.476 1.683 3.689 3.689 0 00-2.113 3.56c.998 15.535-12.521 55.329-25.336 55.329-2.328 0-3.463-2.524-3.463-6.593 0-11.23 6.691-34.943 10.056-45.801.43-1.409.666-2.622.666-3.678 0-2.974-1.84-4.5-6.007-4.5-4.578 0-9.547 1.741-14.34 10.174-1.683-7.435-6.711-10.683-13.735-10.683-11.523 0-24.397 12.19-30.051 28.076-7.572 21.208-22.832 41.692-43.375 41.692-18.645 0-28.486-15.515-28.486-40.03 0-35.392 25.982-64.308 45.253-64.308 9.215 0 13.617 5.869 13.617 14.869 0 10.897-6.085 15.964-6.085 20.112 0 1.272 1.057 2.524 3.15 2.524 8.374 0 18.234-9.841 18.234-23.262 0-13.422-10.897-23.243-30.168-23.243-31.851 0-63.898 32.047-63.898 73.113 0 32.673 16.121 52.374 44 52.374 19.017 0 35.628-14.79 44.588-32.047 1.018 14.302 7.513 21.776 17.413 21.776 8.804 0 15.925-5.243 21.364-14.458 2.094 9.645 7.65 14.36 14.87 14.36 8.275 0 15.201-5.243 21.794-14.986-.097 7.65 1.644 14.85 8.276 14.85 3.13 0 6.867-.725 7.533-3.464 6.984-28.877 24.24-52.453 29.523-52.453 1.565 0 1.995 1.507 1.995 3.287 0 7.846-5.537 23.928-5.537 34.2 0 11.092 4.716 18.43 14.459 18.43 10.8 0 21.775-13.227 29.092-32.556 2.29 18.058 7.24 32.633 14.987 32.633 9.508 0 26.392-20.014 36.625-41.203 4.01.509 10.036.372 15.827-3.717-2.465 6.241-3.912 13.07-3.912 19.897 0 19.663 9.39 25.18 17.47 25.18 8.785 0 15.907-5.243 21.365-14.458 1.8 8.315 6.398 14.34 14.85 14.34 13.225 0 24.71-13.519 24.71-24.612 0-2.934-1.252-4.715-2.72-4.715zm-274.51 18.547c-5.342 0-7.435-5.38-7.435-13.401 0-13.93 9.528-37.193 19.604-37.193 4.402 0 6.065 5.185 6.065 11.524 0 14.145-9.059 39.07-18.235 39.07zm182.948-41.574c-3.189-3.796-4.343-8.961-4.343-13.559 0-5.673 2.074-10.467 4.558-10.467 2.485 0 3.248 2.446 3.248 5.85 0 5.693-2.035 14.008-3.463 18.176zm41.418 41.574c-5.34 0-7.434-6.182-7.434-13.401 0-13.441 9.528-37.193 19.682-37.193 4.402 0 5.967 5.146 5.967 11.524 0 14.145-8.902 39.07-18.215 39.07z" fill="#fff" fillRule="nonzero"/>
    </svg>
  ),
  brandGoogle: ({ className, title }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden={!title} aria-label={title} preserveAspectRatio="xMidYMid meet">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  brandGoogleCalendar: ({ className, title }) => (
    <svg viewBox="0 0 122.88 122.88" className={className} aria-hidden={!title} aria-label={title} preserveAspectRatio="xMidYMid meet">
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
    <svg viewBox="0 0 87 120" className={className} aria-hidden={!title} aria-label={title} preserveAspectRatio="xMidYMid meet">
      <path d="M54.5 0H8.2C3.7 0 0 3.7 0 8.2v103.6c0 4.5 3.7 8.2 8.2 8.2h70.6c4.5 0 8.2-3.7 8.2-8.2V32.7L54.5 0z" fill="#0f9c57"/>
      <path d="M21.8 58.7v32.7h43.4V58.7H21.8zm18 28.6H25.5v-5.7h14.3v5.7zm0-9.8H25.5v-5.7h14.3v5.7zm0-9.8H25.5v-5.7h14.3v5.7zm18.4 19.6H43.9v-5.7h14.3v5.7zm0-9.8H43.9v-5.7h14.3v5.7zm0-9.8H43.9v-5.7h14.3v5.7z" fill="#f0f0f0"/>
      <path d="M54.5 0v24.5c0 4.5 3.7 8.2 8.2 8.2h24.3L54.5 0z" fill="#87cdac"/>
    </svg>
  ),
  brandHomeAssistant: ({ className, title }) => (
    <svg viewBox="0 0 240 240" className={className} aria-hidden={!title} aria-label={title} preserveAspectRatio="xMidYMid meet">
      <path d="M240 224.762C240 233.012 233.25 239.762 225 239.762H15C6.75 239.762 0 233.012 0 224.762V134.762C0 126.512 4.77 114.993 10.61 109.153L109.39 10.3725C115.22 4.5425 124.77 4.5425 130.6 10.3725L229.39 109.162C235.22 114.992 240 126.522 240 134.772V224.772z" fill="#F2F4F9"/>
      <path d="M229.39 109.153L130.61 10.3725C124.78 4.5425 115.23 4.5425 109.4 10.3725L10.61 109.153C4.78 114.983 0 126.512 0 134.762V224.762C0 233.012 6.75 239.762 15 239.762H107.27L66.64 199.132C64.55 199.852 62.32 200.262 60 200.262C48.7 200.262 39.5 191.062 39.5 179.762C39.5 168.462 48.7 159.262 60 159.262C71.3 159.262 80.5 168.462 80.5 179.762C80.5 182.092 80.09 184.322 79.37 186.412L111 218.042V102.162C104.2 98.8225 99.5 91.8425 99.5 83.7725C99.5 72.4725 108.7 63.2725 120 63.2725C131.3 63.2725 140.5 72.4725 140.5 83.7725C140.5 91.8425 135.8 98.8225 129 102.162V183.432L160.46 151.972C159.84 150.012 159.5 147.932 159.5 145.772C159.5 134.472 168.7 125.272 180 125.272C191.3 125.272 200.5 134.472 200.5 145.772C200.5 157.072 191.3 166.272 180 166.272C177.5 166.272 175.12 165.802 172.91 164.982L129 208.892V239.772H225C233.25 239.772 240 233.022 240 224.772V134.772C240 126.522 235.23 115.002 229.39 109.162z" fill="#18BCF2"/>
    </svg>
  ),
};

export default function AppIcon({
  name,
  className,
  size,
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
    return <Puzzle className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
  }
  const accessibilityProps: Pick<ComponentProps<'svg'>, 'aria-hidden' | 'aria-label'> = title
    ? { 'aria-label': title }
    : { 'aria-hidden': true };

  return (
    <IconComponent
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      {...accessibilityProps}
    />
  );
}
