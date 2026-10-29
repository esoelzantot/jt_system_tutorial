// Loads seed/sample-data.json into the LOCAL Firestore + Storage emulators.
// It never talks to a real Firebase project: hosts are fixed to the emulators and the
// "Bearer owner" token is only honoured by the emulators (it bypasses security rules).
//
// Usage: npm run emulators   (in one terminal)
//        npm run seed:emulator
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'demo-jt-tutorial';
const BUCKET = `${PROJECT_ID}.appspot.com`;
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const STORAGE = 'http://127.0.0.1:9199';
const AUTH = { Authorization: 'Bearer owner' };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(join(root, 'seed', 'sample-data.json'), 'utf8'));

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { stringValue: String(value) };
}

async function request(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${await res.text()}`);
  return res;
}

async function setDoc(collection, id, fields) {
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFirestoreValue(v)])) };
  await request(`${FIRESTORE}/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function uploadImage(fileName) {
  const path = `tutorial-images/${fileName}`;
  const bytes = await readFile(join(root, 'seed', 'images', fileName));
  const contentType = fileName.endsWith('.svg') ? 'image/svg+xml' : fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
  // Multipart upload so the object keeps its content type (needed for SVGs to render).
  const boundary = 'seed-boundary';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: path, contentType })}\r\n` +
        `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  await request(`${STORAGE}/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return `${STORAGE}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

// Start from an empty database so re-running the script is idempotent.
await request(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
  method: 'DELETE',
});

for (const { id, ...fields } of data.sections) await setDoc('sections', id, fields);

for (const { id, imageFile, ...fields } of data.questions) {
  if (imageFile) fields.imageUrl = await uploadImage(imageFile);
  await setDoc('questions', id, fields);
}

console.log(`Seeded ${data.sections.length} sections and ${data.questions.length} questions into the emulator.`);
