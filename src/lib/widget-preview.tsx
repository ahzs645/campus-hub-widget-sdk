'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { buildWidgetInitialProps, getWidgetManifest, type WidgetManifestEntry } from './widget-registry';

const WidgetPreviewContext = createContext(false);

/** Sample-only rendering. Providers must not open connections in this context. */
export function WidgetPreviewProvider({ children }: { children: ReactNode }) {
  return <WidgetPreviewContext.Provider value={true}>{children}</WidgetPreviewContext.Provider>;
}

export function useWidgetPreview(): boolean {
  return useContext(WidgetPreviewContext);
}

// Covers legacy widgets whose source inputs predate acceptsSources. Declared
// bindings are removed too, including plugin-specific input names. Presentation
// settings (colour, units, speed, typography, etc.) remain editable in a preview.
const SOURCE_FIELDS = new Set([
  '__sourceRef', '__sourceRefs', '__sourceData',
  'apiUrl', 'apiKey', 'audioUrl', 'calendarId', 'calendarUrl', 'csvUrl',
  'endpoint', 'feedUrl', 'httpUrl', 'menuUrl', 'portalUrl', 'proxyUrl',
  'scheduleUrl', 'sheetId', 'signalUrl', 'sourceId', 'sourceUrl', 'url',
  'videoId', 'videoUrl', 'password', 'token', 'accessToken', 'authorization',
]);

type PreviewManifest = Pick<WidgetManifestEntry,
  'defaultProps' | 'createDefaultProps' | 'acceptsSources' | 'previewProps'>;

function sanitizePreviewValue(value: unknown, omitted: ReadonlySet<string>): unknown {
  if (typeof value === 'string') {
    // Saved image/media/source URLs must not cause a network request merely
    // because their widget is being browsed. Inline data and local fixtures
    // are still usable as samples.
    return /^(?:https?:)?\/\//i.test(value.trim()) ? undefined : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePreviewValue(entry, omitted)).filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const childManifest = typeof record.type === 'string' ? getWidgetManifest(record.type) : undefined;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    const inlineSampleImage = key === 'url' && typeof entry === 'string' && entry.startsWith('data:image/');
    if ((SOURCE_FIELDS.has(key) && !inlineSampleImage) || omitted.has(key) || /(?:apiKey|secret|accessToken)$/i.test(key)) continue;
    const next = key === 'props' && childManifest && entry && typeof entry === 'object' && !Array.isArray(entry)
      ? buildWidgetPreviewProps(childManifest, entry as Record<string, unknown>)
      : sanitizePreviewValue(entry, omitted);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

/**
 * Build a separate sample configuration. Never mutate the saved widget or
 * copy its live source into a gallery/options preview. A plugin can supply
 * previewProps to select a sample mode or provide local fake records; those
 * props are sanitized too and must not contain a live endpoint.
 *
 * This is not a sandbox for arbitrary plugin code. A provider using non-URL
 * inputs (coordinates, IDs, or a WebSocket) must also honor useWidgetPreview.
 */
export function buildWidgetPreviewProps(
  manifest: PreviewManifest,
  data: Record<string, unknown> = {},
): Record<string, unknown> {
  const bindingFields = new Set(manifest.acceptsSources?.map((binding) => binding.propName) ?? []);
  const sanitized = sanitizePreviewValue({ ...buildWidgetInitialProps(manifest), ...data }, bindingFields);
  const samples = sanitizePreviewValue(manifest.previewProps ?? {}, new Set<string>());
  return { ...(sanitized as Record<string, unknown>), ...(samples as Record<string, unknown>) };
}
