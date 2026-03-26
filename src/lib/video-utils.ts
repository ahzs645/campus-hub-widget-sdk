/**
 * Video URL parsing and oEmbed metadata utilities.
 *
 * Supports YouTube, Vimeo, and TikTok — extracts video IDs, detects the
 * source platform, generates thumbnail URLs, and fetches oEmbed metadata.
 *
 * Ported from Concerto's Video model (Ruby), adapted for TypeScript/browser.
 */

export type VideoSource = 'youtube' | 'vimeo' | 'tiktok' | null;

export interface VideoMeta {
  source: VideoSource;
  videoId: string | null;
  thumbnailUrl: string | null;
  title?: string;
  authorName?: string;
  html?: string;
}

const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'];

/**
 * Detect which video platform a URL belongs to.
 */
export function detectVideoSource(url: string): VideoSource {
  try {
    const host = new URL(url).hostname;
    if (YT_HOSTS.includes(host)) return 'youtube';
    if (host === 'vimeo.com' || host === 'www.vimeo.com') return 'vimeo';
    if (TIKTOK_HOSTS.includes(host)) return 'tiktok';
  } catch {
    // not a valid URL
  }
  return null;
}

/**
 * Extract the video ID from a URL.
 *
 * For YouTube, supports watch, shorts, embed, and youtu.be formats.
 * For Vimeo, extracts the numeric ID.
 * For TikTok, returns null (use oEmbed to get the ID).
 */
export function extractVideoId(url: string): string | null {
  // Bare 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  const source = detectVideoSource(url);

  if (source === 'youtube') {
    const match = url.match(
      /(?:youtube\.com\/(?:shorts\/|[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
    );
    return match?.[1] ?? null;
  }

  if (source === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match?.[1] ?? null;
  }

  return null;
}

/**
 * Get a thumbnail URL for a video without making any network requests.
 *
 * YouTube thumbnails are deterministic; Vimeo/TikTok require an oEmbed call
 * (use `fetchOEmbed` for those).
 */
export function getVideoThumbnailUrl(url: string): string | null {
  const source = detectVideoSource(url);
  if (source === 'youtube') {
    const id = extractVideoId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }
  return null;
}

/**
 * Fetch oEmbed metadata for a video URL.
 *
 * Currently supports Vimeo and TikTok.  YouTube thumbnails are static and
 * don't need an oEmbed call — use `getVideoThumbnailUrl` instead.
 */
export async function fetchOEmbed(url: string): Promise<VideoMeta | null> {
  const source = detectVideoSource(url);
  if (!source) return null;

  const videoId = extractVideoId(url);

  if (source === 'youtube') {
    return {
      source,
      videoId,
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
    };
  }

  const oembedUrl =
    source === 'vimeo'
      ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
      : `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) return null;
    const data = await response.json();

    let tiktokId: string | null = null;
    if (source === 'tiktok' && data.html) {
      const match = (data.html as string).match(/data-video-id="(\d+)"/);
      tiktokId = match?.[1] ?? null;
    }

    return {
      source,
      videoId: source === 'tiktok' ? tiktokId : videoId,
      thumbnailUrl: (data.thumbnail_url as string) ?? null,
      title: data.title as string | undefined,
      authorName: data.author_name as string | undefined,
      html: data.html as string | undefined,
    };
  } catch {
    return null;
  }
}
