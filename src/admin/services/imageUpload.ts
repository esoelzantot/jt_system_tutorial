import { upload } from '@vercel/blob/client';
import { getAdminIdToken } from './adminAuth';

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Safe, readable blob name: "Screen Shot 1.PNG" → "screen-shot-1.png"; pasted images get a timestamp. */
function blobName(file: File) {
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `tutorial-images/${base && base !== 'image' ? base : `screenshot-${Date.now()}`}.${ext}`;
}

/** Uploads straight from the browser to Vercel Blob (the server only issues a token). */
export async function uploadImage(file: File, onProgress?: (percent: number) => void) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('type');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('size');

  const [size, token] = await Promise.all([readImageSize(file), getAdminIdToken()]);
  const blob = await upload(blobName(file), file, {
    access: 'public',
    handleUploadUrl: '/api/upload-image',
    clientPayload: token,
    contentType: file.type,
    onUploadProgress: (e) => onProgress?.(e.percentage),
  });
  return { url: blob.url, width: size?.width, height: size?.height };
}
