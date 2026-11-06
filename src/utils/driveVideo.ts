/** Reads the file ID from a Google Drive sharing link. Folder and non-Drive links give null. */
export function driveFileId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) return null;
  const id = url.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([\w-]+)/)?.[1] ?? url.searchParams.get('id');
  return id && /^[\w-]+$/.test(id) ? id : null;
}

/** Older shared files also need their resource key. */
const resourceKey = (link: string) => new URL(link.trim()).searchParams.get('resourcekey');

/** The address Drive allows inside a frame: the fallback when the site cannot stream the file. */
export function driveEmbedUrl(link: string): string | null {
  const id = driveFileId(link);
  if (!id) return null;
  const key = resourceKey(link);
  return `https://drive.google.com/file/d/${id}/preview${key ? `?resourcekey=${encodeURIComponent(key)}` : ''}`;
}

/**
 * The video file itself. Drive refuses it to browsers on other sites (403),
 * so only the server can read this address (see api/video.ts).
 */
export function driveFileUrl(link: string): string | null {
  const id = driveFileId(link);
  if (!id) return null;
  const key = resourceKey(link);
  return `https://drive.usercontent.google.com/download?id=${id}&export=download${key ? `&resourcekey=${encodeURIComponent(key)}` : ''}`;
}

/** The preview picture Drive makes for the video. */
export function drivePosterUrl(link: string): string | null {
  const id = driveFileId(link);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1280` : null;
}
