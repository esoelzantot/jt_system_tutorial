import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore/lite';

export class FirebaseConfigError extends Error {
  constructor(missing: string[]) {
    super(`Missing Firebase configuration: ${missing.join(', ')}`);
    this.name = 'FirebaseConfigError';
  }
}

const env = import.meta.env;

function readConfig(): FirebaseOptions {
  const config: FirebaseOptions = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };

  // The emulator only needs a project ID; a real project needs the full web config.
  const required = env.VITE_FIRESTORE_EMULATOR_HOST
    ? (['projectId'] as const)
    : (['apiKey', 'projectId', 'appId'] as const);
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) throw new FirebaseConfigError(missing.map((key) => `VITE_FIREBASE_${toEnvName(key)}`));

  return config;
}

function toEnvName(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();
}

let db: Firestore | null = null;

/** Lazily initialised so configuration errors surface as a normal load error. */
export function getDb(): Firestore {
  if (db) return db;

  const app = initializeApp(readConfig());
  db = getFirestore(app);

  const emulatorHost: string | undefined = env.VITE_FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    const [host, port] = emulatorHost.split(':');
    connectFirestoreEmulator(db, host, Number(port));
  }

  return db;
}
