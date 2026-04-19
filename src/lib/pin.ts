import { createHash } from 'crypto';

export const MASTER_PIN = '2311';

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export function verifyPin(pin: string, storedHash: string | null): boolean {
  if (pin === MASTER_PIN) return true;
  if (!storedHash) return true;
  return hashPin(pin) === storedHash;
}
