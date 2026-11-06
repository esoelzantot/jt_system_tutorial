// GET /api/video?id=<question id>  → the video of that question, in parts (Range requests).
// Drive refuses its files to browsers on other sites, and its own player misplaces its controls
// on phones, so the site's server reads the file and the browser's own player shows it.
// Only links saved on a video question are served: this is not an open proxy.
import { driveFileUrl } from '../src/utils/driveVideo.js';
import { adminDb } from './_lib/firebaseAdmin.js';

/** Keeps each response under the size limit of a serverless function. Players ask for the next part. */
const MAX_PART_BYTES = 4 * 1024 * 1024;
const LINK_CACHE_MS = 5 * 60 * 1000;

const links = new Map<string, { url: string | null; at: number }>();

async function fileUrlOf(questionId: string): Promise<string | null> {
  const cached = links.get(questionId);
  if (cached && Date.now() - cached.at < LINK_CACHE_MS) return cached.url;
  const data = (await adminDb().collection('questions').doc(questionId).get()).data();
  const url = data?.answerType === 'video' && typeof data.videoUrl === 'string' ? driveFileUrl(data.videoUrl) : null;
  links.set(questionId, { url, at: Date.now() });
  return url;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[\w-]{1,100}$/.test(id)) return new Response(null, { status: 404 });

  try {
    const fileUrl = await fileUrlOf(id);
    if (!fileUrl) return new Response(null, { status: 404 });

    const range = request.headers.get('range')?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const lastAllowed = start + MAX_PART_BYTES - 1;
    const end = range?.[2] ? Math.min(Number(range[2]), lastAllowed) : lastAllowed;

    const upstream = await fetch(fileUrl, { headers: { Range: `bytes=${start}-${end}` } });
    if (upstream.status === 416) return new Response(null, { status: 416, headers: { 'Content-Range': upstream.headers.get('content-range') ?? '' } });

    // Very large files and busy ones get an HTML page from Drive instead of the video.
    const type = upstream.headers.get('content-type') ?? '';
    const contentRange = upstream.headers.get('content-range');
    if (upstream.status !== 206 || !type.startsWith('video/') || !contentRange) {
      await upstream.body?.cancel();
      return new Response(null, { status: 502 });
    }

    return new Response(upstream.body, {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Range': contentRange,
        'Content-Length': upstream.headers.get('content-length') ?? '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('video stream failed', error);
    return new Response(null, { status: 500 });
  }
}
