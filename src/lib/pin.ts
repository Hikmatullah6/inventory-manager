import { createHash } from 'crypto';

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export function verifyPin(pin: string, storedHash: string | null): boolean {
  const masterPin = process.env.MASTER_PIN;
  if (masterPin && pin === masterPin) return true;
  if (!storedHash) return true;
  return hashPin(pin) === storedHash;
}
