export interface RadioNowPlaying {
  title?: string;
  artist?: string;
  album?: string;
  showName?: string;
  description?: string;
  artworkUrl?: string;
  timestamp?: string;
  raw: unknown;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function coerceUrl(value: unknown, baseUrl?: string): string | undefined {
  const raw = coerceString(value);
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function walkValues(
  value: unknown,
  visit: (entry: { key?: string; value: unknown }) => string | undefined,
  depth = 0,
): string | undefined {
  if (depth > 5 || value == null) return undefined;
  const direct = visit({ value });
  if (direct) return direct;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = walkValues(entry, visit, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  for (const [key, child] of Object.entries(value)) {
    const found = visit({ key, value: child }) ?? walkValues(child, visit, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function findStringByKeys(value: unknown, keys: string[]): string | undefined {
  const accepted = new Set(keys.map((key) => key.toLowerCase()));
  return walkValues(value, ({ key, value: candidate }) =>
    key && accepted.has(key.toLowerCase()) ? coerceString(candidate) : undefined);
}

function findUrlByKeys(value: unknown, keys: string[], baseUrl?: string): string | undefined {
  const accepted = new Set(keys.map((key) => key.toLowerCase()));
  return walkValues(value, ({ key, value: candidate }) => {
    if (!key || !accepted.has(key.toLowerCase())) return undefined;
    if (isRecord(candidate)) {
      return coerceUrl(candidate.url, baseUrl)
        ?? coerceUrl(candidate.src, baseUrl)
        ?? coerceUrl(candidate.href, baseUrl);
    }
    return coerceUrl(candidate, baseUrl);
  });
}

function findArtistList(value: unknown): string | undefined {
  return walkValues(value, ({ key, value: candidate }) => {
    if (!key || !['artists', 'artistnames'].includes(key.toLowerCase())) return undefined;
    if (!Array.isArray(candidate)) return coerceString(candidate);
    const names = candidate.flatMap((entry) => {
      if (typeof entry === 'string') return entry.trim() ? [entry.trim()] : [];
      if (!isRecord(entry)) return [];
      const name = coerceString(entry.name) ?? coerceString(entry.title) ?? coerceString(entry.artistName);
      return name ? [name] : [];
    });
    return names.length > 0 ? names.join(', ') : undefined;
  });
}

export function extractRadioNowPlaying(
  payload: unknown,
  baseUrl?: string,
): RadioNowPlaying | null {
  if (!payload) return null;
  const title = findStringByKeys(payload, ['trackTitle', 'songTitle', 'trackName', 'songName'])
    ?? findStringByKeys(payload, ['title', 'name', 'track']);
  const artist = findStringByKeys(payload, ['artistName'])
    ?? findArtistList(payload)
    ?? findStringByKeys(payload, ['artist', 'subtitle', 'performer', 'band']);
  const album = findStringByKeys(payload, ['albumName', 'album', 'collection']);
  const showName = findStringByKeys(payload, ['showName', 'programName', 'program', 'show', 'episodeTitle']);
  const description = findStringByKeys(payload, ['description', 'summary', 'teaser']);
  const artworkUrl = findUrlByKeys(payload, ['imagePath', 'imageUrl', 'artworkUrl', 'coverUrl'], baseUrl)
    ?? findUrlByKeys(payload, ['image', 'artwork', 'cover', 'thumbnailUrl', 'logo'], baseUrl);
  const timestamp = findStringByKeys(payload, ['timestamp', 'updatedAt', 'startTime', 'startedAt']);

  if (!title && !artist && !album && !showName && !description && !artworkUrl) return null;
  return { title, artist, album, showName, description, artworkUrl, timestamp, raw: payload };
}
