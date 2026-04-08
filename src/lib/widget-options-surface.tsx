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
