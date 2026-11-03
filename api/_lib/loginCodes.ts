import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { adminDb } from './firebaseAdmin.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

// One document per email. The collection has no client rules, so browsers can't read it.
const codeDoc = (email: string) =>
  adminDb().collection('adminLoginCodes').doc(createHash('sha256').update(email).digest('hex'));

const hashCode = (code: string, salt: string) => createHash('sha256').update(`${salt}:${code}`).digest('hex');

interface StoredCode {
  hash: string;
  salt: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
}

/** Creates a new code, or returns how long to wait if one was sent too recently. */
export async function issueCode(email: string): Promise<{ code: string } | { retryAfterMs: number }> {
  const ref = codeDoc(email);
  const existing = (await ref.get()).data() as StoredCode | undefined;
  const now = Date.now();
  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    return { retryAfterMs: RESEND_COOLDOWN_MS - (now - existing.sentAt) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const salt = randomBytes(16).toString('hex');
  await ref.set({ hash: hashCode(code, salt), salt, expiresAt: now + CODE_TTL_MS, sentAt: now, attempts: 0 });
  return { code };
}

export type VerifyResult = 'ok' | 'invalid' | 'expired' | 'too-many-attempts';

/** Checks a code; a correct code is consumed, a wrong one uses up an attempt. */
export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const ref = codeDoc(email);
  return adminDb().runTransaction(async (tx) => {
    const stored = (await tx.get(ref)).data() as StoredCode | undefined;
    if (!stored) return 'invalid';
    if (Date.now() > stored.expiresAt) {
      tx.delete(ref);
      return 'expired';
    }
    if (stored.attempts >= MAX_ATTEMPTS) return 'too-many-attempts';

    const expected = Buffer.from(stored.hash, 'hex');
    const actual = Buffer.from(hashCode(code, stored.salt), 'hex');
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
      tx.delete(ref);
      return 'ok';
    }
    tx.update(ref, { attempts: stored.attempts + 1 });
    return stored.attempts + 1 >= MAX_ATTEMPTS ? 'too-many-attempts' : 'invalid';
  });
}
