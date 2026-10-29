// Uploads tutorial screenshots from this computer to Vercel Blob and prints the public
// URL to paste into a question's `imageUrl` field in Firestore.
//
// Usage: npm run upload-image -- <image> [more images…]
// Needs BLOB_READ_WRITE_TOKEN in .env.local (Vercel → Storage → your Blob store → .env.local tab).
// The token has no VITE_ prefix, so Vite never ships it to the browser.
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

const files = process.argv.slice(2);
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (files.length === 0) {
  console.error('Usage: npm run upload-image -- <image> [more images…]');
  process.exit(1);
}
if (!token) {
  console.error(
    'BLOB_READ_WRITE_TOKEN is missing.\n' +
      'Copy it from Vercel → Storage → your Blob store → ".env.local" tab, and add it to .env.local.',
  );
  process.exit(1);
}

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

let failed = 0;
for (const file of files) {
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) {
    console.error(`✖ ${file}: not a supported image (${Object.keys(CONTENT_TYPES).join(', ')})`);
    failed++;
    continue;
  }

  try {
    const { size } = await stat(file);
    console.log(`Uploading ${basename(file)} (${formatSize(size)})…`);

    // A random suffix keeps re-uploads of the same file name from replacing older images.
    const blob = await put(`${FOLDER}/${basename(file)}`, await readFile(file), {
      access: 'public',
      addRandomSuffix: true,
      contentType,
      token,
    });

    console.log(`✔ imageUrl:\n${blob.url}\n`);
  } catch (error) {
    console.error(`✖ ${file}: ${error.code === 'ENOENT' ? 'file not found' : error.message}`);
    failed++;
  }
}

if (files.length > 1) console.log(`Done: ${files.length - failed} uploaded, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
