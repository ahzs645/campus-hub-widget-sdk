import { createContext, useContext, type ReactNode } from 'react';

export type WidgetOptionsSurface = 'editor' | 'gallery';

const WidgetOptionsSurfaceContext = createContext<WidgetOptionsSurface>('editor');

const HIDDEN_GALLERY_CONTROL_NAMES = new Set([
  'alt',
  'apiUrl',
  'apiKey',
  'audioUrl',
  'calendarId',
  'calendarUrl',
  'content',
  'coverUrl',
  'csvUrl',
  'customQuestions',
  'displayId',
  'endpoint',
  'entityIds',
  'eventName',
  'feedUrl',
  'httpUrl',
  'latitude',
  'league',
  'location',
  'longitude',
  'manualData',
  'menuUrl',
  'password',
  'portalUrl',
  'proxyUrl',
  'scheduleUrl',
  'sheetId',
  'sheetName',
  'signalUrl',
  'source',
  'ssid',
  'targetDate',
  'targetTime',
  'teamName',
  'timezone',
  'url',
  'useCorsProxy',
  'videoId',
]);

const HIDDEN_GALLERY_LABEL_PATTERNS = [
  /\burl\b/i,
  /\bfeed\b/i,
  /\bsource\b/i,
  /\bproxy\b/i,
  /\bendpoint\b/i,
  /\bdisplay id\b/i,
  /\bentity ids?\b/i,
  /\bnetwork name\b/i,
  /\bssid\b/i,
  /\bpassword\b/i,
  /\bteam name\b/i,
  /\bleague\b/i,
  /\btimezone\b/i,
  /\blatitude\b/i,
  /\blongitude\b/i,
  /\blocation\b/i,
  /\bcalendar id\b/i,
  /\bsheet id\b/i,
  /\bsheet name\b/i,
  /\bapi key\b/i,
];

export interface WidgetOptionsSurfaceProviderProps {
  surface: WidgetOptionsSurface;
  children: ReactNode;
}

export interface GalleryControlMetadata {
  label?: string;
  name?: string;
  type?: string;
}

export function WidgetOptionsSurfaceProvider({
  surface,
  children,
}: WidgetOptionsSurfaceProviderProps) {
  return (
    <WidgetOptionsSurfaceContext.Provider value={surface}>
      {children}
    </WidgetOptionsSurfaceContext.Provider>
  );
}

export function useWidgetOptionsSurface() {
  return useContext(WidgetOptionsSurfaceContext);
}

// ── Media picker bridge ──
// The host app owns the Media library (and its auth), so it injects a picker
// through this context. Widget option inputs (FormInput with `media`) call it
// to let users browse stored assets instead of pasting a raw URL.
export interface MediaPickRequest {
  accept?: string;
  onSelect: (url: string, name: string) => void;
}

type MediaPickFn = (request: MediaPickRequest) => void;

const MediaPickerContext = createContext<MediaPickFn | null>(null);

export function MediaPickerProvider({
  value,
  children,
}: {
  value: MediaPickFn | null;
  children: ReactNode;
}) {
  return (
    <MediaPickerContext.Provider value={value}>
      {children}
    </MediaPickerContext.Provider>
  );
}

export function useMediaPicker() {
  return useContext(MediaPickerContext);
}

export function shouldHideGalleryControl({
  label,
  name,
  type,
}: GalleryControlMetadata) {
  const normalizedName = name?.trim() ?? '';
  const normalizedLabel = label?.trim() ?? '';
  const normalizedType = type?.trim().toLowerCase() ?? '';

  if (
    normalizedType === 'url' ||
    normalizedType === 'file' ||
    normalizedType === 'date' ||
    normalizedType === 'time'
  ) {
    return true;
  }

  if (
    normalizedName &&
    (HIDDEN_GALLERY_CONTROL_NAMES.has(normalizedName) ||
      normalizedName.endsWith('Url') ||
      normalizedName.endsWith('Id'))
  ) {
    return true;
  }

  return HIDDEN_GALLERY_LABEL_PATTERNS.some((pattern) =>
    pattern.test(normalizedLabel),
  );
}
