/**
 * Enhanced feed source utilities inspired by Concerto's RssFeed and RemoteFeed
 * models.  These run client-side but bring the same patterns: multiple display
 * formats, digest-based deduplication, and structured content output.
 */

import { fetchTextWithCache, fetchJsonWithCache, buildProxyUrl } from './data-cache';
import { parseRss, type RssItem } from './feeds';

// ---------------------------------------------------------------------------
// RSS Feed with formatters (headlines / details / ticker)
// ---------------------------------------------------------------------------

export type RssFormatter = 'headlines' | 'details' | 'ticker';

export interface FormattedRssContent {
  title: string;
  html?: string;
  plainText?: string;
}

/**
 * Fetch and format an RSS feed, similar to Concerto's RssFeed#refresh.
 *
 * @param url       RSS feed URL (will be proxied if CORS proxy is configured)
 * @param formatter Display format: headlines (grouped titles), details
 *                  (title + description per item), or ticker (plain titles)
 * @param options   Cache TTL and other fetch options
 */
export async function fetchFormattedRss(
  url: string,
  formatter: RssFormatter = 'headlines',
  options: { ttlMs?: number; groupSize?: number } = {},
): Promise<{ items: FormattedRssContent[]; raw: RssItem[]; fromCache: boolean }> {
  const { ttlMs = 300_000, groupSize = 5 } = options;

  const proxiedUrl = buildProxyUrl(url);
  const { text, fromCache } = await fetchTextWithCache(proxiedUrl, { ttlMs });
  const raw = parseRss(text);

  let items: FormattedRssContent[];

  switch (formatter) {
    case 'details':
      items = raw.map((item) => ({
        title: item.title,
        html: `<h1>${escapeHtml(item.title)}</h1><p>${sanitizeHtml(item.description ?? '')}</p>`,
        plainText: item.description ?? '',
      }));
      break;

    case 'ticker':
      items = raw.map((item) => ({
        title: item.title,
        plainText: stripHtml(item.title).trim(),
      }));
      break;

    case 'headlines':
    default: {
      // Group items into pages of `groupSize`
      const feedTitle = extractFeedTitle(text);
      items = [];
      for (let i = 0; i < raw.length; i += groupSize) {
        const slice = raw.slice(i, i + groupSize);
        const titles = slice.map((it) => escapeHtml(it.title));
        items.push({
          title: feedTitle,
          html: `<h1>${escapeHtml(feedTitle)}</h1><h2>${titles.join('</h2><h2>')}</h2>`,
        });
      }
      break;
    }
  }

  return { items, raw, fromCache };
}

// ---------------------------------------------------------------------------
// Remote JSON Feed with digest-based deduplication
// ---------------------------------------------------------------------------

export interface RemoteFeedItem {
  type: string;
  name: string;
  text?: string;
  url?: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export interface RemoteFeedResult {
  items: RemoteFeedItem[];
  changed: boolean;
  fromCache: boolean;
}

const lastDigests = new Map<string, string>();

/**
 * Fetch a remote JSON feed, deduplicate items by [type, name], and detect
 * changes via a SHA-256 digest of the response.
 *
 * Inspired by Concerto's RemoteFeed#refresh.  Runs fully client-side; the
 * digest comparison tells callers whether a re-render is needed.
 */
export async function fetchRemoteFeed(
  url: string,
  options: { ttlMs?: number; cacheKey?: string } = {},
): Promise<RemoteFeedResult> {
  const { ttlMs = 60_000, cacheKey } = options;

  const proxiedUrl = buildProxyUrl(url);
  const { data, fromCache } = await fetchJsonWithCache<RemoteFeedItem[]>(proxiedUrl, {
    ttlMs,
    cacheKey,
  });

  if (!Array.isArray(data)) {
    return { items: [], changed: false, fromCache };
  }

  // Deduplicate by [type, name]
  const seen = new Map<string, number>();
  const deduped: RemoteFeedItem[] = [];

  for (const item of data) {
    const key = `${item.type}::${item.name}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    deduped.push(count > 1 ? { ...item, name: `${item.name} (${count})` } : item);
  }

  // Digest-based change detection
  const digest = await computeDigest(JSON.stringify(deduped));
  const digestKey = cacheKey ?? url;
  const previousDigest = lastDigests.get(digestKey);
  const changed = previousDigest !== digest;
  lastDigests.set(digestKey, digest);

  return { items: deduped, changed, fromCache };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

function sanitizeHtml(str: string): string {
  // Very basic sanitisation — strip script tags and event handlers
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

function extractFeedTitle(rssText: string): string {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(rssText, 'text/xml');
    return xml.querySelector('channel > title')?.textContent?.trim() ?? 'Feed';
  } catch {
    return 'Feed';
  }
}

async function computeDigest(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: simple hash for environments without SubtleCrypto
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
