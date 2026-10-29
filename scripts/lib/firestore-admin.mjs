// Firestore access for the content scripts. Uses the Admin SDK, which bypasses the
// read-only security rules, so it only runs on a trusted computer with a service-account key.
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

export function getAdminDb() {
  // Local emulator: no credentials needed (set FIRESTORE_EMULATOR_HOST to use it).
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-jt-tutorial';
    initializeApp({ projectId });
    return { db: getFirestore(), projectId, target: `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` };
  }

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyPath) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is missing.\n' +
        'Firebase console → Project settings → Service accounts → Generate new private key,\n' +
        'save the JSON file OUTSIDE this project folder, and put its full path in .env.local:\n' +
        '  FIREBASE_SERVICE_ACCOUNT=C:/Users/you/keys/jt-tutorial-service-account.json',
    );
  }

  let key;
  try {
    key = JSON.parse(readFileSync(keyPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read the service-account key at ${keyPath}: ${error.message}`);
  }

  initializeApp({ credential: cert(key), projectId: key.project_id });
  return { db: getFirestore(), projectId: key.project_id, target: `project ${key.project_id}` };
}
