export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Parses a small JSON body; returns null for anything malformed or oversized. */
export async function readJson<T>(request: Request, maxBytes = 4096): Promise<T | null> {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const normalizeEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
