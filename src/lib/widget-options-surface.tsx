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

// ── Host-rendered preview ──
// The editor renders one live preview of the real widget for every widget it
// edits. Inside this provider a widget's own OptionsPreview stands down, so a
// widget that still carries a hand-written mock-up never stacks two previews
// in one panel — and no widget has to know whether the host previews it.
const HostPreviewContext = createContext(false);

export function HostRendersPreviewProvider({ children }: { children: ReactNode }) {
  return (
    <HostPreviewContext.Provider value={true}>{children}</HostPreviewContext.Provider>
  );
}

export function useHostRendersPreview() {
  return useContext(HostPreviewContext);
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

// ── Nested widget editor bridge ──
// Container widgets (the Widget Stack today) hold other widgets as props.
// Their options UI should not have to re-implement the editor for each
// child — schema forms, data-source linking, the live preview. Instead the
// host editor injects an opener through this context: the container asks
// for one child to be edited, the host drills into its full editor for that
// widget type, and hands the edited props back when the user applies them.
export interface NestedWidgetEditRequest {
  /** Registered type of the child widget to edit. */
  widgetType: string;
  /** The child's current props. */
  data: Record<string, unknown>;
  /** Where the child sits in its container, e.g. "Widget 2 of 4". */
  context?: string;
  /** Receives the edited props when the user applies the nested editor. */
  onApply: (data: Record<string, unknown>) => void;
}

export type NestedWidgetEditorFn = (request: NestedWidgetEditRequest) => void;

const NestedWidgetEditorContext = createContext<NestedWidgetEditorFn | null>(null);

export function NestedWidgetEditorProvider({
  value,
  children,
}: {
  value: NestedWidgetEditorFn | null;
  children: ReactNode;
}) {
  return (
    <NestedWidgetEditorContext.Provider value={value}>
      {children}
    </NestedWidgetEditorContext.Provider>
  );
}

/**
 * The host's nested editor opener, or null when the surface cannot drill in
 * (the gallery, or an older host). Callers fall back to inline options.
 */
export function useNestedWidgetEditor() {
  return useContext(NestedWidgetEditorContext);
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
