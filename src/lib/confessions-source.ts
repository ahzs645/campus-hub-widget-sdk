export interface RawConfession {
  id?: number | string;
  testimonial?: string;
  by?: string;
  imgSrc?: string;
}

export interface ConfessionItem {
  id: string;
  text: string;
  by: string;
}

interface WordPressPageResponse {
  content?: {
    rendered?: string;
  };
}

function decodeHtmlEntities(value: string): string {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.body.textContent ?? '';
  }

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function toConfessionItems(items: RawConfession[], maxItems: number): ConfessionItem[] {
  return items
    .map((item, index) => ({
      id: String(item.id ?? index),
      text: decodeHtmlEntities(String(item.testimonial ?? '')).trim(),
      by: decodeHtmlEntities(String(item.by ?? '')).trim(),
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, Math.max(1, maxItems));
}

function readEmbeddedPayload(html: string): string | null {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc
      .querySelector<HTMLElement>('.ote-confessions-block-container[data-confessions], [data-confessions]')
      ?.getAttribute('data-confessions') ?? null;
  }

  const match = html.match(/\bdata-confessions\s*=\s*'([^']*)'/i)
    ?? html.match(/\bdata-confessions\s*=\s*"([^"]*)"/i);
  return match?.[1] ?? null;
}

export function parseConfessionsFromMarkup(
  html: string,
  maxItems = 10,
): ConfessionItem[] {
  const rawAttribute = readEmbeddedPayload(html);
  if (!rawAttribute) return [];

  for (const candidate of [rawAttribute, decodeHtmlEntities(rawAttribute)]) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (Array.isArray(parsed)) {
        return toConfessionItems(parsed as RawConfession[], maxItems);
      }
    } catch {
      // Try the decoded representation next.
    }
  }

  return [];
}

export function normalizeConfessionsPayload(
  payload: unknown,
  maxItems = 10,
): ConfessionItem[] {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return normalizeConfessionsPayload(JSON.parse(trimmed) as unknown, maxItems);
      } catch {
        // Treat malformed JSON as HTML below.
      }
    }
    return parseConfessionsFromMarkup(payload, maxItems);
  }

  const page = Array.isArray(payload)
    ? payload[0] as WordPressPageResponse | undefined
    : payload as WordPressPageResponse | undefined;
  return parseConfessionsFromMarkup(page?.content?.rendered ?? '', maxItems);
}
