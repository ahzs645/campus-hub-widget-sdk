import {
  buildCacheKey,
  buildProxyUrl,
  fetchJsonWithCache,
  fetchTextWithCache,
} from './data-cache';

export const DEFAULT_CAFETERIA_MENU_URL =
  'https://menu.danahospitality.ca/unbc/menu.asp?loc=48784&grid=1';

export interface CafeteriaMenuItem {
  name: string;
  description?: string;
  dietary?: string[];
}

export interface CafeteriaMealSection {
  title: string;
  items: CafeteriaMenuItem[];
}

export interface ParsedCafeteriaMenu {
  weekly: CafeteriaMealSection[];
  breakfast: CafeteriaMealSection[];
  lunch: CafeteriaMealSection[];
  dinner: CafeteriaMealSection[];
  showtime: CafeteriaMealSection[];
}

export type CafeteriaMenuStatus = 'ready' | 'seasonClosed' | 'unavailable';

export interface NormalizedCafeteriaSource {
  menu: ParsedCafeteriaMenu;
  status: CafeteriaMenuStatus;
  discoveredUrls: string[];
}

export interface LoadCafeteriaSourceOptions {
  menuUrl: string;
  danaLocations?: string;
  ttlMs: number;
  useCorsProxy: boolean;
}

export const CAFETERIA_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function createEmptyCafeteriaMenu(): ParsedCafeteriaMenu {
  return {
    weekly: [],
    breakfast: [],
    lunch: [],
    dinner: [],
    showtime: [],
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .trim();
}

function parseDanaGridCellItems(cellHtml: string): string[] {
  const patterns = [
    /<dt[^>]*class=["'][^"']*Grid_ItemTitle[^"']*["'][^>]*>([\s\S]*?)<\/dt>/gi,
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
  ];

  for (const pattern of patterns) {
    const items = [...cellHtml.matchAll(pattern)]
      .map((match) => stripHtml(match[1] ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (items.length > 0) return items;
  }
  return [];
}

function parseDanaWeeklyGridSections(html: string): CafeteriaMealSection[] {
  const tableHtml = html.match(
    /<table[^>]*id=["']WeeklyMenuAtAGlance["'][^>]*>([\s\S]*?)<\/table>/i,
  )?.[1];
  if (!tableHtml) return [];

  const sections: CafeteriaMealSection[] = [];
  const sectionPattern = /<tr[^>]*class=["']section["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*MenuSection[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/tr>\s*<tr[^>]*>([\s\S]*?)<\/tr>\s*<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const match of tableHtml.matchAll(sectionPattern)) {
    const title = stripHtml(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const headers = [...(match[2] ?? '').matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((header) => stripHtml(header[1] ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((header) =>
        CAFETERIA_DAY_NAMES.find((day) => day.toLowerCase() === header.toLowerCase()) ?? header);
    const cells = [...(match[3] ?? '').matchAll(
      /<td[^>]*class=["'][^"']*sectioncontent[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi,
    )].map((cell) => cell[1] ?? '');

    const items = cells.slice(0, CAFETERIA_DAY_NAMES.length).flatMap((cell, index) => {
      const dayItems = parseDanaGridCellItems(cell);
      return dayItems.length > 0
        ? [{ name: `${headers[index] ?? CAFETERIA_DAY_NAMES[index]}: ${dayItems.join(' • ')}` }]
        : [];
    });
    if (items.length > 0) sections.push({ title, items });
  }

  const focused = sections.filter(({ title }) =>
    /born of fire|showtime|weekly\s*special|breakfast|lunch|dinner|supper/i.test(title));
  return focused.length > 0 ? focused : sections;
}

export function parseDanaMenuHtml(html: string): CafeteriaMealSection[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const weeklyGrid = parseDanaWeeklyGridSections(cleaned);
  if (weeklyGrid.length > 0) return weeklyGrid;

  const items: CafeteriaMenuItem[] = [];
  const seen = new Set<string>();
  const addItem = (nameValue: string, description?: string, dietary?: string[]) => {
    const name = stripHtml(nameValue).trim();
    if (!name || name.length <= 1 || name.length >= 200 || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    items.push({
      name,
      description: description ? stripHtml(description).trim() || undefined : undefined,
      dietary: dietary && dietary.length > 0 ? dietary : undefined,
    });
  };

  for (const match of cleaned.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1] ?? '';
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1] ?? '');
    if (cells.length === 0) continue;
    const dietary = [...row.matchAll(/<img[^>]*alt="([^"]{1,10})"[^>]*>/gi)]
      .map((icon) => (icon[1] ?? '').trim().toUpperCase())
      .filter((tag, index, tags) => Boolean(tag) && tags.indexOf(tag) === index);
    addItem(cells[0] ?? '', cells[1], dietary);
  }

  const fallbacks = [
    /<(?:strong|b|h[2-5])[^>]*>([\s\S]*?)<\/(?:strong|b|h[2-5])>/gi,
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
  ];
  for (const pattern of fallbacks) {
    if (items.length > 0) break;
    for (const match of cleaned.matchAll(pattern)) addItem(match[1] ?? '');
  }

  return items.length > 0 ? [{ title: 'Menu', items }] : [];
}

export function extractDanaIframeUrls(html: string): string[] {
  const decode = (value: string) =>
    value
      .replace(/\\\//g, '/')
      .replace(/&amp;|&#038;/g, '&')
      .replace(/&#8220;|&#8221;|&quot;/g, '"')
      .replace(/&#x2F;/gi, '/');
  const withGrid = (rawUrl: string) => {
    const normalized = decode(rawUrl)
      .replace(/menu\.dinahospitality\.ca/gi, 'menu.danahospitality.ca')
      .trim();
    if (!normalized || /[\?&]grid=/i.test(normalized)) return normalized;
    return `${normalized}${normalized.includes('?') ? '&' : '?'}grid=1`;
  };

  const normalizedHtml = decode(html);
  const urls: string[] = [];
  const patterns = [
    /<iframe[^>]*src="([^"]*menu\.d[ai]nahospitality[^"]*)"/gi,
    /href="([^"]*menu\.d[ai]nahospitality[^"]*)"/gi,
    /(https?:\/\/menu\.d[ai]nahospitality\.ca\/[^\s"'<>\\]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of normalizedHtml.matchAll(pattern)) {
      const url = withGrid(match[1] ?? '');
      if (url && !urls.includes(url)) urls.push(url);
    }
  }
  return urls;
}

function extractItemsFromGenericHtml(html: string): CafeteriaMenuItem[] {
  const seen = new Set<string>();
  const patterns = [
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi,
  ];
  for (const pattern of patterns) {
    const items = [...html.matchAll(pattern)].flatMap((match) => {
      const name = stripHtml(match[1] ?? '').trim();
      if (name.length <= 1 || name.length >= 200 || seen.has(name.toLowerCase())) return [];
      seen.add(name.toLowerCase());
      return [{ name }];
    });
    if (items.length > 0) return items;
  }
  return [];
}

export function categoriseCafeteriaHtml(html: string): ParsedCafeteriaMenu {
  const result = createEmptyCafeteriaMenu();
  for (const fragment of html.split(/<h[1-4][^>]*>/i)) {
    const items = extractItemsFromGenericHtml(fragment);
    if (items.length === 0) continue;
    const title = stripHtml(fragment.match(/^([\s\S]*?)<\/h[1-4]>/i)?.[1] ?? '').trim();
    const section = { title: title || 'Menu', items };
    const lower = fragment.toLowerCase();
    if (/showtime/i.test(lower)) result.showtime.push(section);
    else if (/weekly\s*special|special/i.test(lower)) result.weekly.push(section);
    else if (/breakfast|morning|brunch/i.test(lower)) result.breakfast.push(section);
    else if (/dinner|supper|evening/i.test(lower)) result.dinner.push(section);
    else if (/lunch|midday|entrée|entree/i.test(lower)) result.lunch.push(section);
    else result.weekly.push(section);
  }
  return result;
}

export function categorizeDanaSections(
  sections: CafeteriaMealSection[],
): ParsedCafeteriaMenu {
  const result = createEmptyCafeteriaMenu();
  for (const section of sections) {
    const combined = `${section.title} ${section.items.map((item) => item.name).join(' ')}`.toLowerCase();
    if (/showtime/i.test(combined)) result.showtime.push(section);
    else if (/weekly\s*special|special/i.test(combined)) result.weekly.push(section);
    else if (/breakfast|morning|brunch|pancake|egg|omelette|waffle/i.test(combined)) {
      result.breakfast.push(section);
    } else if (/born of fire\s*lunch|lunch|midday|entrée|entree/i.test(combined)) {
      result.lunch.push(section);
    } else if (/born of fire\s*dinner|dinner|supper|evening/i.test(combined)) {
      result.dinner.push(section);
    } else result.weekly.push(section);
  }
  return result;
}

export function getCafeteriaMenuStatus(html: string): CafeteriaMenuStatus {
  const text = stripHtml(html).replace(/\s+/g, ' ').toLowerCase();
  if (
    /\bclosed\s+for\s+(?:the\s+)?season\b/.test(text)
    || /\bclosed\s+for\s+(?:the\s+)?summer\b/.test(text)
    || /\bclosed\s+for\s+(?:winter|spring|fall|autumn)\s+break\b/.test(text)
  ) return 'seasonClosed';
  if (
    /\bmenu\s+for\s+this\s+location\s+is\s+temporarily\s+unavailable\b/.test(text)
    || /\bmenu\s+is\s+temporarily\s+unavailable\b/.test(text)
    || /\bplease\s+try\s+again\s+later\b/.test(text)
  ) return 'unavailable';
  return 'ready';
}

export function hasCafeteriaMenuContent(menu: ParsedCafeteriaMenu): boolean {
  return menu.weekly.length + menu.breakfast.length + menu.lunch.length
    + menu.dinner.length + menu.showtime.length > 0;
}

export function normalizeCafeteriaPayload(payload: unknown): NormalizedCafeteriaSource {
  let source = payload;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        source = JSON.parse(trimmed) as unknown;
      } catch {
        // Parse it as HTML below.
      }
    }
  }

  const page = Array.isArray(source)
    ? source[0] as { content?: { rendered?: string } } | undefined
    : null;
  const html = page?.content?.rendered ?? (typeof source === 'string' ? source : '');
  const status = getCafeteriaMenuStatus(html);
  const discoveredUrls = extractDanaIframeUrls(html);
  const danaSections = /menu\.d[ai]nahospitality\.ca|WeeklyMenuAtAGlance/i.test(html)
    ? parseDanaMenuHtml(html)
    : [];
  const menu = danaSections.length > 0
    ? categorizeDanaSections(danaSections)
    : categoriseCafeteriaHtml(html);

  return { menu, status, discoveredUrls };
}

function mergeCafeteriaMenus(menus: ParsedCafeteriaMenu[]): ParsedCafeteriaMenu {
  return {
    weekly: menus.flatMap((menu) => menu.weekly),
    breakfast: menus.flatMap((menu) => menu.breakfast),
    lunch: menus.flatMap((menu) => menu.lunch),
    dinner: menus.flatMap((menu) => menu.dinner),
    showtime: menus.flatMap((menu) => menu.showtime),
  };
}

function combineStatus(
  current: CafeteriaMenuStatus,
  next: CafeteriaMenuStatus,
): CafeteriaMenuStatus {
  if (current === 'seasonClosed' || next === 'seasonClosed') return 'seasonClosed';
  if (current === 'unavailable' || next === 'unavailable') return 'unavailable';
  return 'ready';
}

/**
 * Load the provider's direct Dana feeds, then its WordPress discovery page,
 * then its plain HTML fallback. Consumers receive only the canonical menu.
 */
export async function loadCafeteriaSource(
  options: LoadCafeteriaSourceOptions,
): Promise<NormalizedCafeteriaSource> {
  const fetchUrl = (url: string) => options.useCorsProxy ? buildProxyUrl(url) : url;
  let status: CafeteriaMenuStatus = 'ready';

  const locationIds = (options.danaLocations ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (locationIds.length > 0) {
    const menus: ParsedCafeteriaMenu[] = [];
    for (const locationId of locationIds) {
      const url = `https://menu.danahospitality.ca/unbc/menu.asp?loc=${locationId}&grid=1`;
      try {
        const { text } = await fetchTextWithCache(fetchUrl(url), {
          cacheKey: buildCacheKey('cafeteria-dana', locationId),
          ttlMs: options.ttlMs,
        });
        const normalized = normalizeCafeteriaPayload(text);
        status = combineStatus(status, normalized.status);
        if (hasCafeteriaMenuContent(normalized.menu)) menus.push(normalized.menu);
      } catch {
        // Continue to the next configured location or fallback.
      }
    }
    if (menus.length > 0) {
      return { menu: mergeCafeteriaMenus(menus), status: 'ready', discoveredUrls: [] };
    }
    if (status !== 'ready') return { menu: createEmptyCafeteriaMenu(), status, discoveredUrls: [] };
  }

  try {
    const origin = new URL(options.menuUrl).origin;
    const apiUrl = `${origin}/wp-json/wp/v2/pages?slug=menu&_fields=id,slug,content`;
    const { data } = await fetchJsonWithCache<unknown>(fetchUrl(apiUrl), {
      cacheKey: buildCacheKey('cafeteria-wp', apiUrl),
      ttlMs: options.ttlMs,
    });
    const page = normalizeCafeteriaPayload(data);
    if (page.discoveredUrls.length > 0) {
      const menus: ParsedCafeteriaMenu[] = [];
      for (const url of page.discoveredUrls) {
        try {
          const { text } = await fetchTextWithCache(fetchUrl(url), {
            cacheKey: buildCacheKey('cafeteria-dana-discovered', url),
            ttlMs: options.ttlMs,
          });
          const normalized = normalizeCafeteriaPayload(text);
          status = combineStatus(status, normalized.status);
          if (hasCafeteriaMenuContent(normalized.menu)) menus.push(normalized.menu);
        } catch {
          // Continue to the remaining discovered locations.
        }
      }
      if (menus.length > 0) {
        return {
          menu: mergeCafeteriaMenus(menus),
          status: 'ready',
          discoveredUrls: page.discoveredUrls,
        };
      }
    }
    if (page.status !== 'ready' || hasCafeteriaMenuContent(page.menu)) return page;
  } catch {
    // Continue to the direct page fallback.
  }

  const { text } = await fetchTextWithCache(fetchUrl(options.menuUrl), {
    cacheKey: buildCacheKey('cafeteria-page', options.menuUrl),
    ttlMs: options.ttlMs,
  });
  return normalizeCafeteriaPayload(text);
}
