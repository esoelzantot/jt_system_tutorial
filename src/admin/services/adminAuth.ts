import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type Auth,
} from 'firebase/auth';
import { getFirebaseApp } from '../../services/firebase';

let auth: Auth | null = null;

export function getAdminAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  const emulator: string | undefined = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  return auth;
}

export class LoginError extends Error {
  constructor(
    public code: string,
    public retryAfterSeconds?: number,
  ) {
    super(code);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new LoginError('network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LoginError(data.error ?? 'server-error', data.retryAfterSeconds);
  return data as T;
}

export const requestLoginCode = (email: string) => post<{ ok: true }>('/api/auth/request-code', { email });

export async function verifyLoginCode(email: string, code: string) {
  const { token } = await post<{ token: string }>('/api/auth/verify-code', { email, code });
  await signInWithCustomToken(getAdminAuth(), token);
}

export type AdminSession = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; email: string };

/** Reports the session; a signed-in user without the admin claim is signed out. */
export function watchAdminSession(callback: (session: AdminSession) => void) {
  return onAuthStateChanged(getAdminAuth(), async (user) => {
    if (!user) return callback({ status: 'signed-out' });
    const { claims } = await user.getIdTokenResult();
    if (claims.admin !== true) {
      await signOut(getAdminAuth());
      return;
    }
    callback({ status: 'signed-in', email: String(claims.adminEmail ?? '') });
  });
}

export const signOutAdmin = () => signOut(getAdminAuth());

export async function getAdminIdToken(): Promise<string> {
  const user = getAdminAuth().currentUser;
  if (!user) throw new LoginError('signed-out');
  return user.getIdToken();
}
