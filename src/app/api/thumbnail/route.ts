import { NextRequest, NextResponse } from 'next/server';

/**
 * Auction thumbnails come from hibid's CDN, which returns 403 to any request
 * that does not look like a browser. That is fine in a normal browser, but a
 * phone with a content blocker, a privacy browser that trims the User-Agent, or
 * any network that blocks the CDN host leaves him staring at a placeholder
 * instead of the photo he is trying to identify an item by.
 *
 * Serving the bytes from our own origin removes every one of those failure
 * modes at once.
 */

/** Only hosts we actually import from — this must never become an open proxy. */
const ALLOWED_HOST_SUFFIXES = ['hibid.com'];

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function isProxyableThumbnail(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  return ALLOWED_HOST_SUFFIXES.some(
    suffix => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
  );
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');

  if (!isProxyableThumbnail(raw)) {
    return NextResponse.json({ error: 'Unsupported image host' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(raw!, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*' },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Could not reach the image' }, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!upstream.ok || !contentType.startsWith('image/')) {
    // The client falls back to the "Item photo" placeholder.
    return NextResponse.json({ error: 'Image unavailable' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // These URLs carry an id and a checksum, so the bytes never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
