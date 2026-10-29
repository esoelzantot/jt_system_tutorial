// Uploads tutorial screenshots from this computer to Vercel Blob and prints the public
// URL to paste into a question's `imageUrl` field in Firestore.
//
// Usage: npm run upload-image -- <image> [more images…]
// Needs BLOB_READ_WRITE_TOKEN in .env.local (Vercel → Storage → your Blob store → .env.local tab).
// The token has no VITE_ prefix, so Vite never ships it to the browser.
import { getBlobToken, uploadImage } from './lib/blob.mjs';

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: npm run upload-image -- <image> [more images…]');
  process.exit(1);
}
try {
  getBlobToken();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  try {
    console.log(`✔ imageUrl:\n${await uploadImage(file)}\n`);
  } catch (error) {
    console.error(`✖ ${file}: ${error.message}`);
    failed++;
  }
}

if (files.length > 1) console.log(`Done: ${files.length - failed} uploaded, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
