'use client';
import { useState, useEffect } from 'react';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '../lib/data-cache';
import { parseICal, parseRss } from '../lib/feeds';
import { useWidgetPreview } from '../lib/widget-preview';

export interface CalendarEvent {
  id: string | number;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  color?: string;
  /** Raw start timestamp for sorting — not displayed */
  _sortTs?: number;
}

export interface UseEventsOptions {
  apiUrl?: string;
  sourceType?: 'json' | 'ical' | 'rss';
  cacheTtlSeconds?: number;
  maxItems?: number;
  pollIntervalMs?: number;
  defaultEvents?: CalendarEvent[];
  selectedCategories?: string[];
  useCorsProxy?: boolean;
}

export const formatDate = (value: Date | null): string => {
  if (!value) return '';
  return value.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const formatTime = (value: Date | null): string => {
  if (!value) return '';
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Upper bound on pages followed for a paginated JSON feed per refresh. */
const MAX_JSON_PAGES = 10;

const EMPTY_EVENTS: CalendarEvent[] = [];

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Map raw JSON event items to CalendarEvents, dropping those that have ended
 * before `todayStartMs`. An event still in progress (started earlier, ends
 * today or later) is kept.
 */
function normalizeJsonEvents(
  list: Record<string, unknown>[],
  metadata: Record<string, Record<string, unknown>>,
  todayStartMs: number,
  indexOffset: number,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  list.forEach((item, i) => {
    const index = indexOffset + i;
    if (item.date && typeof item.date === 'string' && !/^\d{4}-/.test(item.date)) {
      events.push({ ...item, id: (item.id as string | number) ?? `${item.title}-${index}` } as unknown as CalendarEvent);
      return;
    }
    const startObj = parseDate(item.startDate ?? item.start_date ?? item.start ?? item.date);
    const endObj = parseDate(item.endDate ?? item.end_date ?? item.end);
    const lastMs = Math.max(startObj?.getTime() ?? -Infinity, endObj?.getTime() ?? -Infinity);
    if (startObj && lastMs < todayStartMs) return;
    const itemId = (item.id as string | number) ?? `${item.title}-${index}`;
    const meta = metadata[String(itemId)];
    events.push({
      id: itemId,
      title: item.title as string,
      date: formatDate(startObj),
      time: startObj ? formatTime(startObj) : '',
      location: (meta?.location as string) || (item.location as string) || '',
      category: (item.category as string) ?? undefined,
      color: (item.color as string) ?? undefined,
      _sortTs: startObj ? startObj.getTime() : Infinity,
    });
  });
  return events;
}

/** URL of the next page when the response advertises one via `pagination`. */
function nextPageUrl(currentUrl: string, data: unknown): string | null {
  if (!data || Array.isArray(data) || typeof data !== 'object') return null;
  const pagination = (data as { pagination?: { hasMore?: unknown; nextPage?: unknown } }).pagination;
  if (!pagination?.hasMore || typeof pagination.nextPage !== 'number') return null;
  try {
    const url = new URL(currentUrl);
    url.searchParams.set('page', String(pagination.nextPage));
    return url.toString();
  } catch {
    return null;
  }
}

type LoadEventsOptions = Required<Pick<UseEventsOptions, 'sourceType' | 'cacheTtlSeconds' | 'maxItems' | 'useCorsProxy'>> &
  Pick<UseEventsOptions, 'selectedCategories'>;

/** Fetch and normalize events from a configured source. Throws on failure. */
async function loadEvents(apiUrl: string, options: LoadEventsOptions): Promise<{ events: CalendarEvent[]; stale: boolean }> {
  const { sourceType, cacheTtlSeconds, maxItems, selectedCategories, useCorsProxy } = options;
  // Set when the cache helpers fell back to an expired entry after a failed request.
  let stale = false;
  const fetchUrl = useCorsProxy ? buildProxyUrl(apiUrl) : apiUrl;

  if (sourceType === 'ical') {
    const { text, stale: icalStale } = await fetchTextWithCache(fetchUrl, {
      cacheKey: buildCacheKey('events-ical', fetchUrl),
      ttlMs: cacheTtlSeconds * 1000,
    });
    stale = icalStale;
    const parsed = parseICal(text);
    const mapped = parsed.map((event, index) => {
      const isAllDay = event.startRaw?.trim().length === 8;
      return {
        id: event.uid ?? `${event.summary}-${index}`,
        title: event.summary,
        date: formatDate(event.start ?? null),
        time: isAllDay ? '' : formatTime(event.start ?? null),
        location: event.location ?? '',
      } satisfies CalendarEvent;
    });
    return { events: mapped.slice(0, maxItems), stale };
  }

  if (sourceType === 'rss') {
    const { text, stale: rssStale } = await fetchTextWithCache(fetchUrl, {
      cacheKey: buildCacheKey('events-rss', fetchUrl),
      ttlMs: cacheTtlSeconds * 1000,
    });
    stale = rssStale;
    const parsed = parseRss(text);
    const mapped = parsed.map((item, index) => {
      const dateObj = item.pubDate ? new Date(item.pubDate) : null;
      return {
        id: item.guid ?? item.link ?? `${item.title}-${index}`,
        title: item.title,
        date: formatDate(dateObj),
        time: formatTime(dateObj),
        location: item.categories?.[0] ?? '',
      } satisfies CalendarEvent;
    });
    return { events: mapped.slice(0, maxItems), stale };
  }

  // JSON source. Paginated feeds (e.g. Campus Manager's
  // `pagination.nextPage`) are followed until enough upcoming events are
  // found, since early pages can hold only past occurrences.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const collected: CalendarEvent[] = [];
  let itemsSeen = 0;
  let pageUrl: string | null = apiUrl;
  for (let page = 0; pageUrl && page < MAX_JSON_PAGES; page += 1) {
    const fetchUrl: string = useCorsProxy ? buildProxyUrl(pageUrl) : pageUrl;
    const { data, stale: pageStale }: { data: Record<string, unknown>; stale: boolean } = await fetchJsonWithCache<Record<string, unknown>>(fetchUrl, {
      cacheKey: buildCacheKey('events-json', fetchUrl),
      ttlMs: cacheTtlSeconds * 1000,
    });
    stale = stale || pageStale;
    const list = Array.isArray(data) ? data : (data.events as Record<string, unknown>[] | undefined);
    if (!Array.isArray(list)) {
      if (page === 0) throw new Error('Events feed did not return a list of events');
      break;
    }
    // eventMetadata is keyed by event ID and may contain location, organization, etc.
    const metadata: Record<string, Record<string, unknown>> = (!Array.isArray(data) && data.eventMetadata ? data.eventMetadata as Record<string, Record<string, unknown>> : {});
    collected.push(...normalizeJsonEvents(list, metadata, todayStart.getTime(), itemsSeen));
    itemsSeen += list.length;
    const upcomingCount = selectedCategories && selectedCategories.length > 0
      ? collected.filter(e => !e.category || selectedCategories.includes(e.category)).length
      : collected.length;
    pageUrl = upcomingCount < maxItems ? nextPageUrl(pageUrl, data) : null;
  }
  collected.sort((a, b) => (a._sortTs ?? Infinity) - (b._sortTs ?? Infinity));
  const filtered = selectedCategories && selectedCategories.length > 0
    ? collected.filter(e => !e.category || selectedCategories.includes(e.category))
    : collected;
  return { events: filtered.slice(0, maxItems), stale };
}

export interface EventsState {
  /** Events to render: demo events, live events, or last-good live events. */
  events: CalendarEvent[];
  /** True only when no source is configured and `defaultEvents` are shown. Show a "Demo" badge. */
  isDemo: boolean;
  /** True while a configured source has not produced data yet. */
  loading: boolean;
  /** Message from the most recent failed refresh, or null. */
  error: string | null;
  /** When live events were last loaded successfully. */
  lastUpdated: Date | null;
}

interface LiveEvents {
  sourceKey: string;
  events: CalendarEvent[];
  lastUpdated: Date;
}

/**
 * Events for a widget, following the SDK's demo / live / unavailable contract:
 *
 * - no `apiUrl`: `defaultEvents` with `isDemo: true` (render a Demo badge);
 * - `apiUrl` set: starts empty with `loading: true`, never shows
 *   `defaultEvents`. Live events are kept as last-good data for that source,
 *   so a failed refresh keeps them on screen and sets `error`;
 * - `apiUrl` set, failed, nothing loaded yet: empty `events` plus `error`.
 *   Render the shared SourceUnavailable state.
 */
export function useEventsState(options: UseEventsOptions): EventsState {
  const preview = useWidgetPreview();
  const {
    apiUrl: configuredApiUrl,
    sourceType = 'json',
    cacheTtlSeconds = 300,
    maxItems = 10,
    pollIntervalMs = 30_000,
    defaultEvents = EMPTY_EVENTS,
    selectedCategories,
    useCorsProxy = true,
  } = options;
  const apiUrl = preview ? undefined : configuredApiUrl;

  const [live, setLive] = useState<LiveEvents | null>(null);
  const [errorState, setErrorState] = useState<{ sourceKey: string; message: string } | null>(null);

  // A source is identified by everything that changes what it returns, so a
  // config edit never shows the previous source's events while refetching.
  const sourceKey = apiUrl
    ? JSON.stringify([apiUrl, sourceType, maxItems, useCorsProxy, selectedCategories ?? null])
    : '';

  useEffect(() => {
    if (!apiUrl) return;

    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const { events, stale } = await loadEvents(apiUrl, {
          sourceType,
          cacheTtlSeconds,
          maxItems,
          selectedCategories,
          useCorsProxy,
        });
        if (!isMounted) return;
        if (stale) {
          // The request failed and the cache served expired data: show it as
          // last-good data, but report the failed refresh. Keep the time the
          // data was actually loaded if we already have it.
          setLive((previous) =>
            previous?.sourceKey === sourceKey ? previous : { sourceKey, events, lastUpdated: new Date() },
          );
          setErrorState({ sourceKey, message: 'Refresh failed; showing cached events' });
          return;
        }
        setLive({ sourceKey, events, lastUpdated: new Date() });
        setErrorState(null);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : String(error);
        setErrorState({ sourceKey, message: message || 'Failed to load events' });
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, pollIntervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // sourceKey already covers apiUrl, sourceType, maxItems, useCorsProxy and selectedCategories.
  }, [sourceKey, cacheTtlSeconds, pollIntervalMs]);

  if (!apiUrl) {
    return { events: defaultEvents, isDemo: true, loading: false, error: null, lastUpdated: null };
  }

  const current = live?.sourceKey === sourceKey ? live : null;
  const error = errorState?.sourceKey === sourceKey ? errorState.message : null;
  return {
    events: current?.events ?? EMPTY_EVENTS,
    isDemo: false,
    loading: !current && !error,
    error,
    lastUpdated: current?.lastUpdated ?? null,
  };
}

/**
 * Events as a plain list. With no `apiUrl` this is `defaultEvents`; with a
 * configured source it is the live (or last-good) events, and empty while the
 * source is loading or has failed — never `defaultEvents`.
 *
 * Prefer {@link useEventsState}, which also reports demo/loading/error state
 * so the widget can show a Demo badge or the SourceUnavailable state.
 */
export function useEvents(options: UseEventsOptions): CalendarEvent[] {
  return useEventsState(options).events;
}

