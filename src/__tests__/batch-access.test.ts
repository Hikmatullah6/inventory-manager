/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
import { grantBatchAccess, hasBatchAccess } from '@/lib/batch-access';

const BATCH = 'batch-1';
const OTHER = 'batch-2';
const HASH = 'a'.repeat(64);

/** Replays the cookies a response set back onto a follow-up request. */
function cookiesFrom(res: NextResponse): NextRequest['cookies'] {
  const req = new NextRequest('http://localhost/api/export/x/quick');
  for (const cookie of res.cookies.getAll()) {
    req.cookies.set(cookie.name, cookie.value);
  }
  return req.cookies;
}

function grant(batchId: string, isMaster = false): NextRequest['cookies'] {
  const res = NextResponse.json({ ok: true });
  grantBatchAccess(res, batchId, isMaster);
  return cookiesFrom(res);
}

beforeAll(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'; });

describe('hasBatchAccess', () => {
  it('lets anyone through when the batch has no PIN', () => {
    const req = new NextRequest('http://localhost/');
    expect(hasBatchAccess(req.cookies, BATCH, null)).toBe(true);
  });

  it('refuses a PIN-protected batch with no cookie', () => {
    const req = new NextRequest('http://localhost/');
    expect(hasBatchAccess(req.cookies, BATCH, HASH)).toBe(false);
  });

  it('accepts the cookie minted for that batch', () => {
    expect(hasBatchAccess(grant(BATCH), BATCH, HASH)).toBe(true);
  });

  it('does not let one batch\'s cookie open another', () => {
    expect(hasBatchAccess(grant(OTHER), BATCH, HASH)).toBe(false);
  });

  it('refuses a forged cookie value', () => {
    const req = new NextRequest('http://localhost/');
    req.cookies.set(`ba_${BATCH}`, 'f'.repeat(64));
    expect(hasBatchAccess(req.cookies, BATCH, HASH)).toBe(false);
  });

  it('opens every batch for a master PIN holder', () => {
    expect(hasBatchAccess(grant(OTHER, true), BATCH, HASH)).toBe(true);
  });

  it('keeps the cookies httpOnly', () => {
    const res = NextResponse.json({ ok: true });
    grantBatchAccess(res, BATCH, true);
    expect(res.cookies.getAll().every(c => c.httpOnly)).toBe(true);
  });
});
