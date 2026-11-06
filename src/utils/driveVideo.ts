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

/** The address Drive allows inside a frame. Older shared files also need their resource key. */
export function driveEmbedUrl(link: string): string | null {
  const id = driveFileId(link);
  if (!id) return null;
  const resourceKey = new URL(link.trim()).searchParams.get('resourcekey');
  return `https://drive.google.com/file/d/${id}/preview${resourceKey ? `?resourcekey=${encodeURIComponent(resourceKey)}` : ''}`;
}
