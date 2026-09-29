'use client';
import { useState, useEffect } from 'react';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '../lib/data-cache';
import { parseICal, parseRss } from '../lib/feeds';

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

export function useEvents(options: UseEventsOptions): CalendarEvent[] {
  const {
    apiUrl,
    sourceType = 'json',
    cacheTtlSeconds = 300,
    maxItems = 10,
    pollIntervalMs = 30_000,
    defaultEvents = [],
    selectedCategories,
    useCorsProxy = true,
  } = options;

  const [events, setEvents] = useState<CalendarEvent[]>(defaultEvents);

  // Sync from defaultEvents when no apiUrl
  useEffect(() => {
    if (apiUrl) return;
    setEvents(defaultEvents);
  }, [apiUrl, defaultEvents]);

  // Fetch from API
  useEffect(() => {
    if (!apiUrl) return;

    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const fetchUrl = useCorsProxy ? buildProxyUrl(apiUrl) : apiUrl;

        if (sourceType === 'ical') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('events-ical', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
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
          if (isMounted) setEvents(mapped.slice(0, maxItems));
          return;
        }

        if (sourceType === 'rss') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('events-rss', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
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
          if (isMounted) setEvents(mapped.slice(0, maxItems));
          return;
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
          const { data }: { data: Record<string, unknown> } = await fetchJsonWithCache<Record<string, unknown>>(fetchUrl, {
            cacheKey: buildCacheKey('events-json', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
          const list = Array.isArray(data) ? data : (data.events as Record<string, unknown>[] | undefined);
          // Leave the current events in place when the feed isn't a list.
          if (!Array.isArray(list)) {
            if (page === 0) return;
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
        if (!isMounted) return;
        collected.sort((a, b) => (a._sortTs ?? Infinity) - (b._sortTs ?? Infinity));
        const filtered = selectedCategories && selectedCategories.length > 0
          ? collected.filter(e => !e.category || selectedCategories.includes(e.category))
          : collected;
        setEvents(filtered.slice(0, maxItems));
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, pollIntervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiUrl, sourceType, cacheTtlSeconds, maxItems, pollIntervalMs, selectedCategories, useCorsProxy]);

  return events;
}
