// POST /api/upload-image — Vercel Blob client-upload handshake. The browser uploads the file
// straight to Blob; this route only hands out a short-lived token, and only to the admin.
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { adminAuth } from './_lib/firebaseAdmin.js';
import { json } from './_lib/http.js';

const FOLDER = 'tutorial-images/';
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return json({ error: 'invalid-request' }, 400);
  }

  try {
    const result = await handleUpload({
      body,
      request,
      // clientPayload carries the admin's Firebase ID token.
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const decoded = clientPayload ? await adminAuth().verifyIdToken(clientPayload).catch(() => null) : null;
        if (!decoded?.admin) throw new Error('unauthorized');
        if (!pathname.startsWith(FOLDER)) throw new Error('invalid-path');
        return {
          allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'unauthorized' ? 401 : message === 'invalid-path' ? 400 : 500;
    if (status === 500) console.error('upload-image failed', error);
    return json({ error: status === 500 ? 'server-error' : message }, status);
  }
}
