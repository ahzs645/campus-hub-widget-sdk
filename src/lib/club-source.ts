export interface ClubItem {
  id: string;
  name: string;
  image: string;
  link: string;
}

interface WordPressClubPost {
  id?: number;
  title?: { rendered?: string };
  link?: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      media_details?: {
        sizes?: Record<string, { source_url?: string }>;
      };
    }>;
  };
  content?: { rendered?: string };
}

function decodeHtmlEntities(value: string): string {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.body.textContent ?? '';
  }
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function parseClubsFromApi(payload: unknown): ClubItem[] {
  if (!Array.isArray(payload)) return [];

  return (payload as WordPressClubPost[])
    .map((post) => {
      const name = decodeHtmlEntities(post.title?.rendered ?? '').trim();
      if (!name) return null;

      const media = post._embedded?.['wp:featuredmedia']?.[0];
      const sizes = media?.media_details?.sizes;
      let image =
        sizes?.['ote-card-thumbnail']?.source_url ??
        sizes?.medium?.source_url ??
        sizes?.['ote-hero-image']?.source_url ??
        sizes?.full?.source_url ??
        media?.source_url ??
        '';

      if (!image && post.content?.rendered) {
        image = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '';
      }

      return {
        id: String(post.id ?? name),
        name,
        image,
        link: post.link ?? '',
      };
    })
    .filter((club): club is ClubItem => club !== null);
}

export function parseClubsFromHtml(html: string): ClubItem[] {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clubs: ClubItem[] = [];

  const addCards = (
    elements: NodeListOf<Element>,
    idPrefix: string,
    headingSelector: string,
  ) => {
    elements.forEach((element, index) => {
      const imageElement = element.querySelector('img');
      const heading = element.querySelector(headingSelector);
      const image = imageElement?.getAttribute('src') || imageElement?.getAttribute('data-src') || '';
      const name = heading?.textContent?.trim() || imageElement?.getAttribute('alt')?.trim() || '';
      const link = element.querySelector('a')?.getAttribute('href') || '';
      if (name) clubs.push({ id: `${idPrefix}-${index}`, name, image, link });
    });
  };

  addCards(
    doc.querySelectorAll('.wp-block-post-template li, .wp-block-post-template > *'),
    'wp',
    '.wp-block-post-title, h1, h2, h3, h4, h5, h6',
  );
  if (clubs.length > 0) return clubs;

  addCards(
    doc.querySelectorAll('article, .club, .club-card, .wp-block-group, .ote-club'),
    'club',
    'h1, h2, h3, h4, h5, h6, .club-name, .title',
  );
  if (clubs.length > 0) return clubs;

  doc.querySelectorAll('figure').forEach((figure, index) => {
    const imageElement = figure.querySelector('img');
    const image = imageElement?.getAttribute('src') || imageElement?.getAttribute('data-src') || '';
    const name = figure.querySelector('figcaption')?.textContent?.trim()
      || imageElement?.getAttribute('alt')?.trim()
      || '';
    if (name && image) clubs.push({ id: `fig-${index}`, name, image, link: '' });
  });
  if (clubs.length > 0) return clubs;

  doc.querySelector('.entry-content, .page-content, main, .content')
    ?.querySelectorAll('img')
    .forEach((imageElement, index) => {
      const image = imageElement.getAttribute('src') || imageElement.getAttribute('data-src') || '';
      const alt = imageElement.getAttribute('alt')?.trim() || '';
      const width = Number.parseInt(imageElement.getAttribute('width') || '999', 10);
      if (!alt || !image || width <= 50 || image.includes('icon') || image.includes('logo')) return;
      const heading = imageElement.closest('div, a, li, td')
        ?.querySelector('h1, h2, h3, h4, h5, h6');
      clubs.push({
        id: `img-${index}`,
        name: heading?.textContent?.trim() || alt,
        image,
        link: '',
      });
    });

  return clubs;
}

export function normalizeClubsPayload(payload: unknown): ClubItem[] {
  if (typeof payload !== 'string') return parseClubsFromApi(payload);
  const trimmed = payload.trim();
  if (trimmed.startsWith('[')) {
    try {
      return parseClubsFromApi(JSON.parse(trimmed) as unknown);
    } catch {
      // Fall through to the HTML representation.
    }
  }
  return parseClubsFromHtml(payload);
}
