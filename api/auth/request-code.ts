// POST /api/auth/request-code  { email }  → emails a 6-digit login code to the admin.
import { sendLoginCode } from '../_lib/email.js';
import { getAdminEmail } from '../_lib/firebaseAdmin.js';
import { json, normalizeEmail, readJson } from '../_lib/http.js';
import { CODE_TTL_MS, issueCode } from '../_lib/loginCodes.js';

export async function POST(request: Request) {
  const body = await readJson<{ email?: string }>(request);
  const email = normalizeEmail(body?.email);
  if (!email) return json({ error: 'invalid-request' }, 400);

  try {
    // Same answer for any other address, so the endpoint doesn't reveal who the admin is.
    if (email !== getAdminEmail()) return json({ ok: true });

    const result = await issueCode(email);
    if ('retryAfterMs' in result) {
      return json({ error: 'too-soon', retryAfterSeconds: Math.ceil(result.retryAfterMs / 1000) }, 429);
    }
    await sendLoginCode(email, result.code, CODE_TTL_MS / 60000);
    return json({ ok: true });
  } catch (error) {
    console.error('request-code failed', error);
    return json({ error: 'server-error' }, 500);
  }
}
