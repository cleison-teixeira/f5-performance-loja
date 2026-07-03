import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verificarPinHash(pin: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const hashBuf = Buffer.from(hash, 'hex')
    const derivedBuf = scryptSync(pin, salt, 64)
    return timingSafeEqual(hashBuf, derivedBuf)
  } catch {
    return false
  }
}
