// src/lib/thumbnail.ts

/** Hosts whose images are served through our own origin — see /api/thumbnail. */
const PROXIED_HOST_SUFFIXES = ['hibid.com'];

/**
 * The URL to render for an item photo. Proxied hosts go through our own origin
 * so a content blocker or a trimmed User-Agent cannot break the photo; anything
 * else is loaded directly.
 */
export function thumbnailSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }

  const proxied =
    url.protocol === 'https:' &&
    PROXIED_HOST_SUFFIXES.some(s => url.hostname === s || url.hostname.endsWith(`.${s}`));

  return proxied ? `/api/thumbnail?url=${encodeURIComponent(raw)}` : raw;
}
