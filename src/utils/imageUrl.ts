// Google Drive "share" links open a viewer page, not the image itself, so they can't
// be used in <img>. These patterns cover the link formats Drive hands out.
const DRIVE_FILE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([\w-]+)/, // https://drive.google.com/file/d/<id>/view?usp=sharing
  /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([\w-]+)/, // ...open?id=<id>, ...uc?export=view&id=<id>
];

/** Wide enough for screenshots to stay readable when zoomed in the viewer. */
const DRIVE_IMAGE_WIDTH = 2400;

/**
 * Turns a pasted image link into one an <img> can load. Google Drive share links are
 * rewritten to Google's direct image host; any other URL (Vercel Blob, Firebase
 * Storage, a CDN…) is returned unchanged.
 */
export function toDisplayableImageUrl(url: string): string {
  for (const pattern of DRIVE_FILE_ID_PATTERNS) {
    const id = url.match(pattern)?.[1];
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w${DRIVE_IMAGE_WIDTH}`;
  }
  return url;
}
