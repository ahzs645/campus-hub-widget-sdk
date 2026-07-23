/**
 * Source adapters turn provider-specific responses into reusable records before
 * widgets see them. Keep selectors and provider URL quirks here so the Sources
 * preview, capability detection, and every consuming widget share one view of
 * the source.
 */

import {
  DEFAULT_GROUP_FITNESS_URL,
  parseGroupFitnessSchedule,
  type ParsedGroupFitnessSchedule,
} from './group-fitness-source';
import {
  DEFAULT_CAFETERIA_MENU_URL,
  normalizeCafeteriaPayload,
  type ParsedCafeteriaMenu,
} from './cafeteria-source';
import { normalizeClubsPayload } from './club-source';
import { normalizeConfessionsPayload } from './confessions-source';
import {
  createDefaultLibCalPreviewRequest,
  DEFAULT_LIBCAL_AVAILABILITY_URL,
  normalizeLibCalGridResponse,
} from './libcal-source';
import { parseGeoMetWeather } from './geomet-weather-source';
import { extractRadioNowPlaying } from './radio-source';

export type SourceImageQuality = 'original' | 'thumbnail';

export interface NormalizedSourceItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
  imageUrl?: string;
  fallbackImageUrl?: string;
  url?: string;
}

export interface SourceAdapterOptions {
  maxItems?: number;
  imageQuality?: SourceImageQuality;
}

export interface SourceAdapterInput {
  url?: string;
  presetId?: string;
  adapterId?: string;
  payload?: unknown;
  rawText?: string;
  options?: SourceAdapterOptions;
}

export interface NormalizedSourceResult {
  adapterId: string;
  adapterLabel: string;
  sourceFormat: 'html' | 'json' | 'xml' | 'text';
  /** Canonical payload exposed to previews and consumers. */
  data: unknown;
  /** Convenience list for collection-oriented consumers. */
  items: NormalizedSourceItem[];
}

export interface SourceAdapter {
  id: string;
  label: string;
  defaultUrl?: string;
  matches: (source: Pick<SourceAdapterInput, 'url' | 'presetId'>) => boolean;
  normalize: (input: SourceAdapterInput) => NormalizedSourceResult;
  /** Provider request contract used when a preview cannot use a plain GET. */
  createPreviewRequest?: () => RequestInit;
}

const UNBC_RELEASES_URL = 'https://www.unbc.ca/our-stories/releases';
const UNBC_ROOFTOP_WEATHER_URL = 'https://cyclone.unbc.ca/wx/data-table-std-1m.html';

export interface NormalizedWeatherObservation {
  kind: 'weather-observation';
  observedAt: string;
  temperatureC: number;
  condition?: string;
  location?: string;
  dewPointC?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  windSpeedMps?: number;
  windDirectionDegrees?: number;
  windGustMps?: number;
  precipitationMm?: number;
  solarRadiationWm2?: number;
}

export interface NormalizedOccupancy {
  kind: 'occupancy';
  count: number;
  capacity: number;
  label: string;
  observedAt?: string;
}

function decodeHtmlEntities(value: string): string {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.body.textContent ?? '';
  }

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function resolveUrl(value: string, baseUrl: string): string {
  return new URL(value, baseUrl).toString();
}

function getOriginalUNBCImageUrl(imageSrc: string): string {
  const url = new URL(imageSrc, UNBC_RELEASES_URL);
  url.pathname = url.pathname
    .replace(/\/sites\/default\/files\/styles\/[^/]+\/public\//, '/sites/default/files/')
    .replace(/\.(jpe?g|png|gif)\.webp$/i, '.$1');
  url.search = '';
  return url.toString();
}

function buildUNBCReleaseItem(
  storyPath: string,
  imageSrc: string,
  title: string,
  subtitle: string | undefined,
  imageQuality: SourceImageQuality,
): NormalizedSourceItem {
  const thumbnailUrl = resolveUrl(imageSrc, UNBC_RELEASES_URL);
  const imageUrl = imageQuality === 'original'
    ? getOriginalUNBCImageUrl(imageSrc)
    : thumbnailUrl;

  return {
    id: storyPath,
    title,
    subtitle,
    date: subtitle,
    imageUrl,
    fallbackImageUrl: imageUrl !== thumbnailUrl ? thumbnailUrl : undefined,
    url: resolveUrl(storyPath, UNBC_RELEASES_URL),
  };
}

function parseUNBCReleasesWithDom(
  html: string,
  maxItems: number,
  imageQuality: SourceImageQuality,
): NormalizedSourceItem[] {
  if (typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const titleLinks = doc.querySelectorAll<HTMLAnchorElement>(
    'h1 a[href*="/our-stories/story/"], h2 a[href*="/our-stories/story/"], h3 a[href*="/our-stories/story/"], h4 a[href*="/our-stories/story/"]',
  );
  const items: NormalizedSourceItem[] = [];
  const seenStoryPaths = new Set<string>();

  for (const titleLink of titleLinks) {
    if (items.length >= maxItems) break;

    const storyPath = titleLink.getAttribute('href')?.trim() ?? '';
    const title = titleLink.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!storyPath || !title || seenStoryPaths.has(storyPath)) continue;

    let scope: Element | null = titleLink.closest('.article-item, article, .views-row, li')
      ?? titleLink.parentElement;
    let image = scope?.querySelector<HTMLImageElement>('img') ?? null;
    for (let depth = 0; !image && scope?.parentElement && scope !== doc.body && depth < 4; depth += 1) {
      scope = scope.parentElement;
      image = scope.querySelector<HTMLImageElement>('img');
    }

    const imageSrc = image?.getAttribute('src')
      ?? image?.getAttribute('data-src')
      ?? image?.getAttribute('data-lazy-src')
      ?? '';
    if (!imageSrc) continue;

    const subtitle = scope?.querySelector('time')?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
    items.push(buildUNBCReleaseItem(storyPath, imageSrc, title, subtitle, imageQuality));
    seenStoryPaths.add(storyPath);
  }

  return items;
}

/**
 * DOM-free fallback used by server runtimes. It keys off story heading links,
 * then inspects the surrounding Drupal article block for its image and date.
 */
function parseUNBCReleasesWithoutDom(
  html: string,
  maxItems: number,
  imageQuality: SourceImageQuality,
): NormalizedSourceItem[] {
  const headingPattern = /<h[1-4][^>]*>[\s\S]*?<a[^>]+href=["']([^"']*\/our-stories\/story\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-4]>/gi;
  const items: NormalizedSourceItem[] = [];
  const seenStoryPaths = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(html)) !== null && items.length < maxItems) {
    const storyPath = match[1].trim();
    if (seenStoryPaths.has(storyPath)) continue;

    const searchStart = Math.max(0, match.index - 8_000);
    const precedingHtml = html.slice(searchStart, match.index);
    const containerPattern = /<(?:div|article|li)\b[^>]*class=["']([^"']*)["'][^>]*>/gi;
    let containerMatch: RegExpExecArray | null;
    let articleStart = -1;
    while ((containerMatch = containerPattern.exec(precedingHtml)) !== null) {
      if (containerMatch[1].split(/\s+/).includes('article-item')) {
        articleStart = searchStart + containerMatch.index;
      }
    }
    const blockStart = articleStart >= 0
      ? articleStart
      : Math.max(0, match.index - 4_000);
    const nextArticle = html.indexOf('article-item', match.index + match[0].length);
    const blockEnd = nextArticle >= 0
      ? Math.min(html.length, nextArticle)
      : Math.min(html.length, match.index + match[0].length + 2_000);
    const block = html.slice(blockStart, blockEnd);
    const imageMatch = block.match(/<img\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/i);
    if (!imageMatch) continue;

    const title = decodeHtmlEntities(match[2]).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    const timeMatch = block.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i);
    const subtitle = timeMatch
      ? decodeHtmlEntities(timeMatch[1]).replace(/\s+/g, ' ').trim() || undefined
      : undefined;

    items.push(buildUNBCReleaseItem(storyPath, imageMatch[1], title, subtitle, imageQuality));
    seenStoryPaths.add(storyPath);
  }

  return items;
}

export function parseUNBCReleases(
  html: string,
  options: SourceAdapterOptions = {},
): NormalizedSourceItem[] {
  const maxItems = Math.max(1, options.maxItems ?? 100);
  const imageQuality = options.imageQuality ?? 'original';
  const domItems = parseUNBCReleasesWithDom(html, maxItems, imageQuality);
  return domItems.length > 0
    ? domItems
    : parseUNBCReleasesWithoutDom(html, maxItems, imageQuality);
}

/** Parse the latest row from the UNBC rooftop station's legacy HTML table. */
export function parseUNBCRooftopWeather(html: string): NormalizedWeatherObservation | null {
  const lines = html.split(/\r?\n/);
  let lastDataLine: string | undefined;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(lines[index])) {
      lastDataLine = lines[index];
      break;
    }
  }
  if (!lastDataLine) return null;

  const cells = lastDataLine
    .split(/<td>/i)
    .slice(1)
    .map((value) => value.replace(/<\/td>|<\/tr>/gi, '').trim());
  if (cells.length < 13) return null;

  const numberAt = (index: number): number | undefined => {
    const value = Number.parseFloat(cells[index] ?? '');
    return Number.isFinite(value) ? value : undefined;
  };
  const temperatureC = numberAt(2);
  if (temperatureC === undefined) return null;

  return {
    kind: 'weather-observation',
    observedAt: cells[0],
    temperatureC,
    dewPointC: numberAt(3),
    humidityPercent: numberAt(4),
    pressureHpa: numberAt(6),
    windSpeedMps: numberAt(7),
    windDirectionDegrees: numberAt(9),
    windGustMps: numberAt(11),
    precipitationMm: numberAt(12),
    solarRadiationWm2: numberAt(13),
  };
}

/** Extract the embedded occupancy object returned by Rock Gym Pro portals. */
export function parseRockGymProOccupancy(html: string): NormalizedOccupancy | null {
  const countMatch = html.match(/['"]count['"]\s*:\s*(\d+)/);
  const capacityMatch = html.match(/['"]capacity['"]\s*:\s*(\d+)/);
  const labelMatch = html.match(/['"]subLabel['"]\s*:\s*['"]([^'"]*)['"]/);
  const observedAtMatch = html.match(/['"]lastUpdate['"]\s*:\s*['"]([^'"]*)['"]/);
  if (!countMatch && !capacityMatch) return null;

  return {
    kind: 'occupancy',
    count: countMatch ? Number.parseInt(countMatch[1], 10) : 0,
    capacity: capacityMatch ? Number.parseInt(capacityMatch[1], 10) : 0,
    label: labelMatch?.[1] ?? 'Current Occupancy',
    observedAt: observedAtMatch?.[1]?.replace(/&nbsp;?/g, ' ') || undefined,
  };
}

function groupFitnessItems(schedule: ParsedGroupFitnessSchedule | null): NormalizedSourceItem[] {
  if (!schedule) return [];
  return schedule.byDay.flatMap((section) =>
    section.rows.map((row, index) => ({
      id: `${section.title}:${row.className ?? index}:${row.time ?? ''}`,
      title: row.className || 'Group fitness class',
      subtitle: [section.title, row.time].filter(Boolean).join(' · ') || undefined,
      description: [row.location, row.instructor, row.note].filter(Boolean).join(' · ') || undefined,
    })),
  );
}

function jsonPayload(input: SourceAdapterInput): unknown {
  if (input.payload !== undefined) return input.payload;
  if (typeof input.rawText !== 'string') return undefined;
  try {
    return JSON.parse(input.rawText) as unknown;
  } catch {
    return undefined;
  }
}

function cafeteriaItems(menu: ParsedCafeteriaMenu): NormalizedSourceItem[] {
  return (['weekly', 'breakfast', 'lunch', 'dinner', 'showtime'] as const)
    .flatMap((period) =>
      menu[period].flatMap((section) =>
        section.items.map((item, index) => ({
          id: `${period}:${section.title}:${item.name}:${index}`,
          title: item.name,
          subtitle: `${period[0].toUpperCase()}${period.slice(1)} · ${section.title}`,
          description: [item.description, ...(item.dietary ?? [])].filter(Boolean).join(' · ') || undefined,
        }))));
}

const SOURCE_ADAPTERS: SourceAdapter[] = [
  {
    id: 'msc-geomet-weather',
    label: 'MSC GeoMet weather',
    matches: ({ url, presetId }) =>
      presetId?.startsWith('weathercan-') === true
      || /api\.weather\.gc\.ca\/collections\/citypageweather-realtime\/items\//i.test(url ?? ''),
    normalize: (input) => {
      const observation = parseGeoMetWeather(jsonPayload(input));
      return {
        adapterId: 'msc-geomet-weather',
        adapterLabel: 'MSC GeoMet weather',
        sourceFormat: 'json',
        data: observation,
        items: [],
      };
    },
  },
  {
    id: 'radio-now-playing',
    label: 'Radio now playing',
    matches: ({ url, presetId }) =>
      presetId === 'cfur-now-playing'
      || /(?:api\.)?iheart\.com\/.*(?:live-meta\/stream|currentTrackMeta)/i.test(url ?? ''),
    normalize: (input) => {
      const nowPlaying = extractRadioNowPlaying(jsonPayload(input), input.url);
      const items = nowPlaying
        ? [{
          id: nowPlaying.timestamp ?? `${nowPlaying.artist ?? ''}:${nowPlaying.title ?? ''}`,
          title: nowPlaying.title ?? nowPlaying.showName ?? 'Now playing',
          subtitle: nowPlaying.artist,
          description: nowPlaying.album ?? nowPlaying.description,
          imageUrl: nowPlaying.artworkUrl,
        }]
        : [];
      return {
        adapterId: 'radio-now-playing',
        adapterLabel: 'Radio now playing',
        sourceFormat: 'json',
        data: nowPlaying,
        items,
      };
    },
  },
  {
    id: 'unbc-cafeteria-menu',
    label: 'UNBC cafeteria menu',
    defaultUrl: DEFAULT_CAFETERIA_MENU_URL,
    matches: ({ url, presetId }) =>
      presetId === 'unbc-cafeteria-menu'
      || /(?:unbc\.icaneat\.ca\/menu|menu\.d[ai]nahospitality\.ca\/unbc\/menu\.asp)(?:[/?#]|$)/i.test(url ?? ''),
    normalize: (input) => {
      const payload = input.payload ?? input.rawText ?? '';
      const normalized = normalizeCafeteriaPayload(payload);
      const items = cafeteriaItems(normalized.menu);
      return {
        adapterId: 'unbc-cafeteria-menu',
        adapterLabel: 'UNBC cafeteria menu',
        sourceFormat: typeof payload === 'string' ? 'html' : 'json',
        data: normalized,
        items,
      };
    },
  },
  {
    id: 'libcal-room-availability',
    label: 'LibCal room availability',
    defaultUrl: DEFAULT_LIBCAL_AVAILABILITY_URL,
    matches: ({ url, presetId }) =>
      presetId === 'unbc-library-availability'
      || /(?:^|\.)libcal\.com\/spaces\/availability\/grid(?:[/?#]|$)/i.test(url ?? ''),
    createPreviewRequest: createDefaultLibCalPreviewRequest,
    normalize: (input) => {
      const response = normalizeLibCalGridResponse(input.payload ?? input.rawText ?? '');
      const items = response.slots.map((slot, index) => ({
        id: `${slot.itemId}:${slot.start ?? index}`,
        title: `Room ${slot.itemId}`,
        subtitle: [slot.start, slot.end].filter(Boolean).join(' – ') || undefined,
        description: slot.className === 's-lc-eq-checkout' ? 'Booked' : 'Available',
      }));
      return {
        adapterId: 'libcal-room-availability',
        adapterLabel: 'LibCal room availability',
        sourceFormat: 'json',
        data: response,
        items,
      };
    },
  },
  {
    id: 'unbc-confessions',
    label: 'UNBC confessions',
    matches: ({ url, presetId }) =>
      presetId === 'unbc-confessions-feed'
      || /overtheedge\.unbc\.ca\/(?:wp-json\/wp\/v2\/pages[^#]*\bslug=confession|confession\/?)(?:[&#].*)?$/i.test(url ?? ''),
    normalize: (input) => {
      const confessions = normalizeConfessionsPayload(
        input.payload ?? input.rawText ?? '',
        input.options?.maxItems ?? 50,
      );
      return {
        adapterId: 'unbc-confessions',
        adapterLabel: 'UNBC confessions',
        sourceFormat: typeof (input.payload ?? input.rawText) === 'string' ? 'html' : 'json',
        data: confessions,
        items: confessions.map((confession) => ({
          id: confession.id,
          title: confession.text,
          subtitle: confession.by || undefined,
        })),
      };
    },
  },
  {
    id: 'unbc-clubs',
    label: 'UNBC clubs',
    matches: ({ url, presetId }) =>
      presetId === 'unbc-clubs-feed'
      || /overtheedge\.unbc\.ca\/(?:wp-json\/wp\/v2\/organization|clubs\/?)(?:[?#]|$)/i.test(url ?? ''),
    normalize: (input) => {
      const clubs = normalizeClubsPayload(input.payload ?? input.rawText ?? '');
      return {
        adapterId: 'unbc-clubs',
        adapterLabel: 'UNBC clubs',
        sourceFormat: typeof (input.payload ?? input.rawText) === 'string' ? 'html' : 'json',
        data: clubs,
        items: clubs.map((club) => ({
          id: club.id,
          title: club.name,
          imageUrl: club.image || undefined,
          url: club.link || undefined,
        })),
      };
    },
  },
  {
    id: 'unbc-news-releases',
    label: 'UNBC news releases',
    defaultUrl: UNBC_RELEASES_URL,
    matches: ({ url, presetId }) =>
      presetId === 'unbc-news-releases'
      || /unbc\.ca\/our-stories\/(?:releases|unbc-stories)(?:[/?#]|$)/i.test(url ?? ''),
    normalize: (input) => {
      const text = input.rawText ?? (typeof input.payload === 'string' ? input.payload : '');
      const items = parseUNBCReleases(text, input.options);
      return {
        adapterId: 'unbc-news-releases',
        adapterLabel: 'UNBC news releases',
        sourceFormat: 'html',
        data: items,
        items,
      };
    },
  },
  {
    id: 'rock-gym-pro-occupancy',
    label: 'Rock Gym Pro occupancy',
    matches: ({ url, presetId }) =>
      presetId === 'unbc-climbing-gym'
      || /portal\.rockgympro\.com\/portal\/public\/[^/]+\/occupancy(?:[/?#]|$)/i.test(url ?? ''),
    normalize: (input) => {
      const text = input.rawText ?? (typeof input.payload === 'string' ? input.payload : '');
      const occupancy = parseRockGymProOccupancy(text);
      return {
        adapterId: 'rock-gym-pro-occupancy',
        adapterLabel: 'Rock Gym Pro occupancy',
        sourceFormat: 'html',
        data: occupancy,
        items: [],
      };
    },
  },
  {
    id: 'unbc-group-fitness',
    label: 'UNBC group fitness schedule',
    defaultUrl: DEFAULT_GROUP_FITNESS_URL,
    matches: ({ url, presetId }) =>
      presetId === 'unbc-group-fitness'
      || /unbc\.ca\/northern-sport-centre\/group-fitness(?:-drop-classes)?(?:[/?#]|$)/i.test(url ?? ''),
    normalize: (input) => {
      const text = input.rawText ?? (typeof input.payload === 'string' ? input.payload : '');
      const schedule = typeof DOMParser === 'undefined'
        ? null
        : parseGroupFitnessSchedule(text);
      const items = groupFitnessItems(schedule);
      return {
        adapterId: 'unbc-group-fitness',
        adapterLabel: 'UNBC group fitness schedule',
        sourceFormat: 'html',
        data: schedule ?? items,
        items,
      };
    },
  },
  {
    id: 'unbc-rooftop-weather',
    label: 'UNBC rooftop weather',
    defaultUrl: UNBC_ROOFTOP_WEATHER_URL,
    matches: ({ url, presetId }) =>
      presetId === 'unbc-rooftop-weather'
      || /cyclone\.unbc\.ca\/wx\/data-table-std-1m\.html(?:[?#]|$)/i.test(url ?? ''),
    normalize: (input) => {
      const text = input.rawText ?? (typeof input.payload === 'string' ? input.payload : '');
      const observation = parseUNBCRooftopWeather(text);
      return {
        adapterId: 'unbc-rooftop-weather',
        adapterLabel: 'UNBC rooftop weather',
        sourceFormat: 'html',
        data: observation,
        items: [],
      };
    },
  },
];

export function getSourceAdapter(id: string): SourceAdapter | undefined {
  return SOURCE_ADAPTERS.find((adapter) => adapter.id === id);
}

export function resolveSourceAdapter(
  source: Pick<SourceAdapterInput, 'url' | 'presetId' | 'adapterId'>,
): SourceAdapter | undefined {
  if (source.adapterId) {
    const explicit = getSourceAdapter(source.adapterId);
    if (explicit) return explicit;
  }
  return SOURCE_ADAPTERS.find((adapter) => adapter.matches(source));
}

export function normalizeSourcePayload(input: SourceAdapterInput): NormalizedSourceResult | null {
  const adapter = resolveSourceAdapter(input);
  return adapter ? adapter.normalize(input) : null;
}
