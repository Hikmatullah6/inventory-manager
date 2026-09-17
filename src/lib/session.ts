const VERIFIED_BATCHES_KEY = 'verified_batches';
const VERIFIED_PINS_KEY = 'verified_pins';
const MASTER_VERIFIED_KEY = 'master_verified';
const MASTER_PIN_KEY = 'master_pin';

export function isMasterVerified(): boolean {
  try {
    return sessionStorage.getItem(MASTER_VERIFIED_KEY) === 'true';
  } catch { return false; }
}

/**
 * Keeps the master PIN itself, not just the flag: the export cookie is minted
 * by re-checking a PIN server-side, and a master holder may never have entered
 * the PIN of the batch they are exporting.
 */
export function setMasterVerified(pin?: string): void {
  try {
    sessionStorage.setItem(MASTER_VERIFIED_KEY, 'true');
    if (pin) sessionStorage.setItem(MASTER_PIN_KEY, pin);
  } catch {}
}

export function getMasterPin(): string | null {
  try { return sessionStorage.getItem(MASTER_PIN_KEY); } catch { return null; }
}

export function isBatchVerified(batchId: string): boolean {
  try {
    const raw = sessionStorage.getItem(VERIFIED_BATCHES_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(batchId);
  } catch { return false; }
}

export function setBatchVerified(batchId: string): void {
  try {
    const raw = sessionStorage.getItem(VERIFIED_BATCHES_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(batchId)) {
      ids.push(batchId);
      sessionStorage.setItem(VERIFIED_BATCHES_KEY, JSON.stringify(ids));
    }
  } catch {}
}

export function storeVerifiedPin(batchId: string, pin: string): void {
  try {
    const raw = sessionStorage.getItem(VERIFIED_PINS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[batchId] = pin;
    sessionStorage.setItem(VERIFIED_PINS_KEY, JSON.stringify(map));
  } catch {}
}

export function getVerifiedPin(batchId: string): string | null {
  try {
    const raw = sessionStorage.getItem(VERIFIED_PINS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    return map[batchId] ?? null;
  } catch { return null; }
}
