// Source Capabilities — a compact, first-class description of *what a source
// yields* (format, item count, whether items carry images / text / dates), so
// the editor and store can show and filter sources by their real content shape
// instead of only the coarse `sourceType` transport label.
//
// This module is intentionally **isomorphic and DOM-free**: it runs in the
// browser (editor / store preview) and in the Convex action/mutation runtime
// (the poller), so both derive capabilities from the same heuristics. Feed /
// XML / HTML detection is done with regexes rather than DOMParser for exactly
// this reason. The rich, DOM-based preview in `source-store/ui.tsx` is a
// separate, browser-only concern.

import { normalizeSourcePayload } from './source-adapters';

export type SourceFormat =
  | 'json'
  | 'rss'
  | 'atom'
  | 'ical'
  | 'html'
  | 'xml'
  | 'image'
  | 'video'
  | 'text'
  | 'unknown';

export interface SourceCapabilities {
  /** Detected content format. */
  format: SourceFormat;
  /** Number of items/entries/events discovered, when the format is list-like. */
  itemCount?: number;
  /** At least some items carry a usable image. */
  hasImages: boolean;
  /** Items carry a title / textual body. */
  hasText: boolean;
  /** Items carry a publish/start date. */
  hasDates: boolean;
  /** Items carry a link/permalink. */
  hasLinks: boolean;
  /** Sample of discovered item field names (for JSON sources). */
  fields: string[];
  /** A representative first item, for picker previews. */
  sample?: { title?: string; subtitle?: string; imageUrl?: string };
  /** Epoch ms when this snapshot was computed. */
  detectedAt: number;
  /** Optional human note, e.g. why the format is unknown. */
  note?: string;
}

/** What a widget's source binding needs from a source. */
export interface SourceRequirement {
  /** The source must yield images (e.g. an image carousel). */
  hasImages?: boolean;
  /** The source must be one of these formats. */
  format?: SourceFormat[];
}

export interface AnalyzeInput {
  /** Already-parsed payload (e.g. JSON from the poller). Preferred when present. */
  payload?: unknown;
  /** Raw response text, used when `payload` is absent or not an object. */
  rawText?: string;
  /** HTTP content-type, used as a format hint. */
  contentType?: string;
  /** The source's declared transport type (image/video short-circuit). */
  sourceType?: string;
  /** Source URL, used to resolve/relativize image candidates. */
  url?: string;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i;
const IMAGE_KEYS = [
  'image',
  'imageurl',
  'image_url',
  'thumbnail',
  'thumbnailurl',
  'thumbnail_url',
  'poster',
  'posterurl',
  'featuredimage',
  'featured_image',
  'jetpack_featured_media_url',
  'source_url',
];
const DATE_KEYS = ['date', 'pubdate', 'published', 'start', 'startdate', 'updatedat', 'modified', 'created'];
const LINK_KEYS = ['url', 'link', 'href', 'permalink', 'guid'];
const TITLE_KEYS = ['title', 'name', 'headline', 'summary', 'label'];
const TEXT_KEYS = ['description', 'summary', 'excerpt', 'content', 'body', 'abstract'];
const ARRAY_KEYS = ['items', 'data', 'results', 'entries', 'events', 'posts', 'records'];
const SKIP_FIELD_KEYS = new Set(['_links', '_embedded', 'guid', 'yoast_head', 'yoast_head_json', 'class_list']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function lc(key: string): string {
  return key.toLowerCase();
}

function firstStringByKeys(item: Record<string, unknown>, keys: string[]): string | undefined {
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(item)) lowerMap.set(lc(k), v);
  for (const key of keys) {
    const value = lowerMap.get(key);
    if (typeof value === 'string' && value.trim()) return value.trim();
    // WordPress-style `{ rendered: '...' }`
    if (isRecord(value) && typeof value.rendered === 'string' && value.rendered.trim()) {
      return value.rendered.trim();
    }
  }
  return undefined;
}

function hasAnyKey(item: Record<string, unknown>, keys: string[]): boolean {
  const lowerKeys = new Set(Object.keys(item).map(lc));
  return keys.some((key) => lowerKeys.has(key));
}

function findJsonArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return null;
  for (const key of ARRAY_KEYS) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value;
  }
  return null;
}

function detectItemImage(item: Record<string, unknown>): string | undefined {
  const candidate = firstStringByKeys(item, IMAGE_KEYS);
  // Accept data URIs, anything with an image extension (absolute or relative),
  // or an extensionless URL on an image-ish host (many CDNs omit extensions).
  if (candidate && (candidate.startsWith('data:image/') || IMAGE_EXT.test(candidate) || isLikelyImageHost(candidate))) {
    return candidate;
  }
  // Nested WordPress featured media.
  const embedded = (item as Record<string, unknown>)._embedded;
  if (isRecord(embedded)) {
    const media = embedded['wp:featuredmedia'];
    if (Array.isArray(media) && isRecord(media[0])) {
      const src = media[0].source_url;
      if (typeof src === 'string' && src.trim()) return src.trim();
    }
  }
  return undefined;
}

function isLikelyImageHost(url: string): boolean {
  return /(images?|img|cdn|media|photos?|static|uploads?)\./i.test(url) || /\/(wp-content|uploads|media|images?)\//i.test(url);
}

/**
 * Resolve an image candidate to an absolute URL so the persisted sample stays
 * renderable outside the source's own origin. Relative candidates without a
 * base are dropped — a consumer could never load them.
 */
function resolveImageUrl(candidate: string | undefined, baseUrl: string | undefined): string | undefined {
  if (!candidate) return undefined;
  if (candidate.startsWith('data:image/')) return candidate;
  try {
    return new URL(candidate, baseUrl || undefined).toString();
  } catch {
    return undefined;
  }
}

function analyzeJson(data: unknown, detectedAt: number, baseUrl?: string): SourceCapabilities {
  const array = findJsonArray(data);
  const sampleRecord = (array ?? []).find(isRecord) ?? (isRecord(data) ? data : undefined);

  if (!sampleRecord) {
    return {
      format: 'json',
      itemCount: array?.length,
      hasImages: false,
      hasText: false,
      hasDates: false,
      hasLinks: false,
      fields: [],
      detectedAt,
    };
  }

  // Scan up to 20 items so a source that only decorates some items with images
  // is still reported as image-capable.
  const scanned = (array ?? [sampleRecord]).slice(0, 20).filter(isRecord);
  let sampleImage: string | undefined;
  const hasImages = scanned.some((item) => {
    const img = detectItemImage(item);
    if (img && !sampleImage) sampleImage = img;
    return Boolean(img);
  });

  const fields = Object.keys(sampleRecord)
    .filter((key) => !SKIP_FIELD_KEYS.has(lc(key)))
    .slice(0, 12);

  const title = firstStringByKeys(sampleRecord, TITLE_KEYS);

  return {
    format: 'json',
    itemCount: array?.length,
    hasImages,
    hasText: hasAnyKey(sampleRecord, [...TITLE_KEYS, ...TEXT_KEYS]),
    hasDates: hasAnyKey(sampleRecord, DATE_KEYS),
    hasLinks: hasAnyKey(sampleRecord, LINK_KEYS),
    fields,
    sample: {
      title,
      subtitle: firstStringByKeys(sampleRecord, DATE_KEYS),
      imageUrl: resolveImageUrl(sampleImage, baseUrl),
    },
    detectedAt,
  };
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function analyzeFeed(text: string, format: 'rss' | 'atom', detectedAt: number): SourceCapabilities {
  const itemCount = format === 'atom' ? countMatches(text, /<entry[\s>]/gi) : countMatches(text, /<item[\s>]/gi);
  const hasImages =
    /<enclosure[^>]+type=["']image/i.test(text) ||
    /<media:(content|thumbnail)/i.test(text) ||
    /<img\s/i.test(text) ||
    new RegExp(`url=["'][^"']+${IMAGE_EXT.source}`, 'i').test(text);
  const hasDates = /<(pubDate|published|updated|dc:date)[\s>]/i.test(text);
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const sampleTitle = titleMatch ? stripTags(titleMatch[1]).trim() : undefined;

  return {
    format,
    itemCount,
    hasImages,
    hasText: true,
    hasDates,
    hasLinks: true,
    fields: [],
    sample: sampleTitle ? { title: sampleTitle } : undefined,
    detectedAt,
  };
}

function analyzeICal(text: string, detectedAt: number): SourceCapabilities {
  return {
    format: 'ical',
    itemCount: countMatches(text, /BEGIN:VEVENT/gi),
    hasImages: /\bATTACH[;:].*(png|jpe?g|gif|webp)/i.test(text),
    hasText: true,
    hasDates: true,
    hasLinks: /\bURL[;:]/i.test(text),
    fields: [],
    detectedAt,
  };
}

function analyzeHtml(text: string, detectedAt: number): SourceCapabilities {
  return {
    format: 'html',
    itemCount: countMatches(text, /<h[1-3][\s>]/gi) || undefined,
    hasImages: /<img\s/i.test(text),
    hasText: true,
    hasDates: false,
    hasLinks: /<a\s[^>]*href=/i.test(text),
    fields: [],
    detectedAt,
  };
}

function stripTags(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Derive a {@link SourceCapabilities} snapshot from a fetched payload. Pure and
 * DOM-free; safe to call on the client or in Convex. Pass `payload` when you
 * already have parsed JSON (the poller does), otherwise pass `rawText`.
 */
export function analyzeSourcePayload(input: AnalyzeInput, now: number = Date.now()): SourceCapabilities {
  const { payload, rawText, contentType, sourceType, url } = input;

  if (sourceType === 'image' || sourceType === 'unsplash') {
    return { format: 'image', hasImages: true, hasText: false, hasDates: false, hasLinks: false, fields: [], detectedAt: now };
  }
  if (sourceType === 'video') {
    return { format: 'video', hasImages: true, hasText: false, hasDates: false, hasLinks: false, fields: [], detectedAt: now };
  }

  // Provider-specific HTML/XML is normalized at the source boundary before
  // generic shape detection. This keeps capability chips aligned with what
  // previews and widgets actually receive.
  const normalized = normalizeSourcePayload({ payload, rawText, url });
  if (normalized) {
    return analyzeJson(
      normalized.items.length > 0 ? normalized.items : normalized.data,
      now,
      url,
    );
  }

  // Prefer a parsed object/array payload.
  if (payload !== undefined && payload !== null && (typeof payload === 'object')) {
    return analyzeJson(payload, now, url);
  }

  const text = (rawText ?? (typeof payload === 'string' ? payload : '') ?? '').trim();
  if (!text) {
    return { format: 'unknown', hasImages: false, hasText: false, hasDates: false, hasLinks: false, fields: [], detectedAt: now, note: 'Empty response' };
  }

  const ct = (contentType ?? '').toLowerCase();

  if (text.startsWith('BEGIN:VCALENDAR') || ct.includes('calendar')) {
    return analyzeICal(text, now);
  }
  if (text.startsWith('{') || text.startsWith('[') || ct.includes('json')) {
    try {
      return analyzeJson(JSON.parse(text), now, url);
    } catch {
      // fall through to markup detection
    }
  }
  if (/<feed[\s>]/i.test(text.slice(0, 500))) {
    return analyzeFeed(text, 'atom', now);
  }
  if (/<(rss|channel|item)[\s>]/i.test(text.slice(0, 1000)) || ct.includes('rss') || ct.includes('atom')) {
    return analyzeFeed(text, 'rss', now);
  }
  if (/^<!doctype html/i.test(text) || /^<html[\s>]/i.test(text) || /<body[\s>]/i.test(text.slice(0, 2000)) || ct.includes('text/html')) {
    return analyzeHtml(text, now);
  }
  if (text.startsWith('<')) {
    return {
      format: 'xml',
      hasImages: /<img\s/i.test(text),
      hasText: true,
      hasDates: false,
      hasLinks: false,
      fields: [],
      detectedAt: now,
    };
  }

  return {
    format: 'text',
    hasImages: false,
    hasText: text.length > 0,
    hasDates: false,
    hasLinks: false,
    fields: [],
    detectedAt: now,
  };
}

const FORMAT_LABELS: Record<SourceFormat, string> = {
  json: 'JSON',
  rss: 'RSS',
  atom: 'Atom',
  ical: 'Calendar',
  html: 'Web page',
  xml: 'XML',
  image: 'Image',
  video: 'Video',
  text: 'Text',
  unknown: 'Unknown',
};

export function formatLabel(format: SourceFormat): string {
  return FORMAT_LABELS[format];
}

/**
 * Compact chip labels summarizing a capability snapshot, e.g.
 * `['RSS', '12 items', 'Images', 'Dated']`.
 */
export function describeCapabilities(cap: SourceCapabilities): string[] {
  const chips: string[] = [formatLabel(cap.format)];
  if (typeof cap.itemCount === 'number' && cap.itemCount > 0) {
    chips.push(`${cap.itemCount} item${cap.itemCount === 1 ? '' : 's'}`);
  }
  if (cap.hasImages) chips.push('Images');
  else if (cap.hasText && cap.format !== 'image' && cap.format !== 'video') chips.push('Text only');
  if (cap.hasDates) chips.push('Dated');
  return chips;
}

/**
 * Whether a source satisfies a widget binding's requirement, with a
 * human-readable reason when it does not (so the picker can grey-out-with-why
 * instead of silently hiding).
 */
export function meetsRequirement(
  cap: SourceCapabilities | undefined,
  requires: SourceRequirement | undefined,
): { ok: boolean; reason?: string } {
  if (!requires) return { ok: true };
  if (!cap) return { ok: true }; // unknown capabilities → don't block
  if (requires.hasImages && !cap.hasImages) {
    return { ok: false, reason: 'No images — this widget shows imagery' };
  }
  if (requires.format && !requires.format.includes(cap.format)) {
    return { ok: false, reason: `Expected ${requires.format.map(formatLabel).join(' / ')}, found ${formatLabel(cap.format)}` };
  }
  return { ok: true };
}
