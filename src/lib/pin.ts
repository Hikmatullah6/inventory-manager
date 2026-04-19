import { createHash } from 'crypto';

function getMasterPin(): string {
  const pin = process.env.MASTER_PIN;
  if (!pin) throw new Error('MASTER_PIN environment variable is not set');
  return pin;
}

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export function verifyPin(pin: string, storedHash: string | null): boolean {
  if (pin === getMasterPin()) return true;
  if (!storedHash) return true;
  return hashPin(pin) === storedHash;
}
