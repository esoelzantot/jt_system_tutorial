// Firebase Admin for the serverless functions. Files under api/_lib are not routes.
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

/**
 * Credentials, in order of preference:
 *  - FIREBASE_SERVICE_ACCOUNT_JSON: the key file's JSON (raw or base64) — used on Vercel.
 *  - FIREBASE_SERVICE_ACCOUNT: a path to the key file — used on a developer machine.
 *  - Emulators (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST): no credentials.
 */
function readServiceAccount(): Record<string, string> | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    const json = inline.startsWith('{') ? inline : Buffer.from(inline, 'base64').toString('utf8');
    return JSON.parse(json);
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (path) return JSON.parse(readFileSync(path, 'utf8'));
  return null;
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.GCLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID });
  }

  const key = readServiceAccount();
  if (!key) throw new Error('Server is missing FIREBASE_SERVICE_ACCOUNT_JSON.');
  return initializeApp({ credential: cert(key), projectId: key.project_id });
}

export const adminDb = () => getFirestore(getAdminApp());
export const adminAuth = () => getAuth(getAdminApp());

/** The only account allowed into the dashboard. */
export function getAdminEmail(): string {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Server is missing ADMIN_EMAIL.');
  return email;
}

export const ADMIN_UID = 'jt-tutorial-admin';
