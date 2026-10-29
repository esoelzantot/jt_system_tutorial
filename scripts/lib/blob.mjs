// Shared Vercel Blob upload used by upload-image.mjs and content.mjs.
import { put } from '@vercel/blob';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const FOLDER = 'tutorial-images';
const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export const SUPPORTED_IMAGE_TYPES = Object.keys(CONTENT_TYPES);

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is missing.\n' +
        'Copy it from Vercel → Storage → your Blob store → ".env.local" tab, and add it to .env.local.',
    );
  }
  return token;
}

/** Uploads a local image to Vercel Blob and returns its public URL. */
export async function uploadImage(file) {
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) throw new Error(`not a supported image (${SUPPORTED_IMAGE_TYPES.join(', ')})`);

  let size;
  try {
    ({ size } = await stat(file));
  } catch (error) {
    throw error.code === 'ENOENT' ? new Error(`file not found: ${file}`) : error;
  }

  console.log(`Uploading ${basename(file)} (${formatSize(size)})…`);
  // A random suffix keeps re-uploads of the same file name from replacing older images.
  const blob = await put(`${FOLDER}/${basename(file)}`, await readFile(file), {
    access: 'public',
    addRandomSuffix: true,
    contentType,
    token: getBlobToken(),
  });
  return blob.url;
}
