// POST /api/auth/verify-code  { email, code }  → { token } for signInWithCustomToken.
import { ADMIN_UID, adminAuth, getAdminEmail } from '../_lib/firebaseAdmin.js';
import { json, normalizeEmail, readJson } from '../_lib/http.js';
import { verifyCode } from '../_lib/loginCodes.js';

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; code?: string }>(request);
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return json({ error: 'invalid-request' }, 400);

  try {
    if (email !== getAdminEmail()) return json({ error: 'invalid' }, 401);

    const result = await verifyCode(email, code);
    if (result !== 'ok') return json({ error: result }, 401);

    // The `admin` claim is what firestore.rules checks before allowing writes.
    const token = await adminAuth().createCustomToken(ADMIN_UID, { admin: true, adminEmail: email });
    return json({ token });
  } catch (error) {
    console.error('verify-code failed', error);
    return json({ error: 'server-error' }, 500);
  }
}
