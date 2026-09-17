// src/lib/batch-access.ts
//
// Server-side proof that a PIN was entered for a batch.
//
// `PinGate` only hides a page in the browser — an export URL is a plain link,
// so it carries no header we could check and was downloadable by anyone who had
// it. On a successful PIN check we set an httpOnly cookie holding an HMAC of the
// batch id; the export routes verify that cookie before sending any rows.
//
// The key is the service role key: server-only, always present (nothing else
// works without it), and never shipped to the browser.
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

const COOKIE_PREFIX = 'ba_';
const MASTER_COOKIE = 'ba_master';

function sign(payload: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHmac('sha256', key).update(payload).digest('hex');
}

function sameToken(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Remember, for this browser session, that the PIN for `batchId` was entered.
 * A master-PIN holder gets a second cookie that opens every batch.
 */
export function grantBatchAccess(res: NextResponse, batchId: string, isMaster = false): void {
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
  res.cookies.set(COOKIE_PREFIX + batchId, sign(`batch:${batchId}`), options);
  if (isMaster) res.cookies.set(MASTER_COOKIE, sign('master'), options);
}

/** Both `req.cookies` and `await cookies()` from next/headers satisfy this. */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

/** Has this browser proved the PIN for `batchId`, whether or not one is set? */
export function hasBatchCookie(cookies: CookieReader, batchId: string): boolean {
  if (sameToken(cookies.get(MASTER_COOKIE)?.value, sign('master'))) return true;
  return sameToken(cookies.get(COOKIE_PREFIX + batchId)?.value, sign(`batch:${batchId}`));
}

/** A batch with no PIN is open to anyone, exactly as it is in the browser. */
export function hasBatchAccess(cookies: CookieReader, batchId: string, pinHash: string | null): boolean {
  if (pinHash === null) return true;
  return hasBatchCookie(cookies, batchId);
}

/**
 * The gate for the JSON APIs. `null` means the caller may proceed.
 *
 * It costs one extra lookup per request; the alternative is trusting a batch id
 * from the query string, which is exactly what we are trying to stop.
 */
export async function denyUnlessBatchAccess(
  req: NextRequest,
  supabase: SupabaseClient,
  batchId: string,
): Promise<NextResponse | null> {
  const { data: batch } = await supabase
    .from('auction_batches')
    .select('pin_hash')
    .eq('id', batchId)
    .single();

  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  if (!hasBatchAccess(req.cookies, batchId, batch.pin_hash)) {
    return NextResponse.json({ error: 'This batch is locked' }, { status: 401 });
  }
  return null;
}

/**
 * The gate every export route runs first: look the batch up, then refuse
 * unless this browser has entered its PIN. The refusal is plain text because a
 * download is a navigation — the person sees this message, not JSON.
 */
export async function requireBatchAccess(
  req: NextRequest,
  supabase: SupabaseClient,
  batchId: string,
): Promise<{ batch: { name: string } } | { denied: NextResponse }> {
  const { data: batch } = await supabase
    .from('auction_batches')
    .select('name, pin_hash')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return { denied: new NextResponse('Batch not found.', { status: 404 }) };
  }
  if (!hasBatchAccess(req.cookies, batchId, batch.pin_hash)) {
    return {
      denied: new NextResponse(
        'This batch is locked. Open its export page, enter the PIN, then download again.',
        { status: 401 },
      ),
    };
  }
  return { batch: { name: batch.name } };
}
