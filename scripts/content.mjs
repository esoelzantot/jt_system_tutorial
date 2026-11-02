// Adds tutorial content to Firestore from the terminal.
//
//   npm run content -- list                  show sections and questions (with their IDs)
//   npm run content -- add-section           add one section (asks questions)
//   npm run content -- add-question          add one question (asks questions)
//   npm run content -- import <file.json>    add/replace many sections and questions at once
//   npm run content -- clear                 delete ALL sections and questions (optionally the images too)
//
// Needs FIREBASE_SERVICE_ACCOUNT in .env.local (see scripts/lib/firestore-admin.mjs).
// Local images are uploaded to Vercel Blob (needs BLOB_READ_WRITE_TOKEN).
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { deleteImages, listTutorialImages, uploadImage } from './lib/blob.mjs';
import { getAdminDb } from './lib/firestore-admin.mjs';

const SECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANSWER_TYPES = ['paragraph', 'steps'];

// ---------- terminal input ----------

// A line queue (instead of rl.question) so piped input works as well as typing.
const rl = createInterface({ input: process.stdin, terminal: process.stdin.isTTY });
const pending = [];
const waiting = [];
let inputClosed = false;
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : pending.push(line)));
rl.on('close', () => {
  inputClosed = true;
  waiting.splice(0).forEach((resolveLine) => resolveLine(null));
});

function readLine(prompt = '') {
  if (prompt) process.stdout.write(prompt);
  if (pending.length) return Promise.resolve(pending.shift());
  if (inputClosed) return Promise.resolve(null);
  return new Promise((resolveLine) => waiting.push(resolveLine));
}

class Cancelled extends Error {}

async function ask(prompt, { required = false, fallback = '' } = {}) {
  for (;;) {
    const line = await readLine(prompt);
    if (line === null) throw new Cancelled();
    const value = line.trim();
    if (value) return value;
    if (!required) return fallback;
    console.log('  This field is required.');
  }
}

async function askNumber(prompt, fallback) {
  for (;;) {
    const value = await ask(`${prompt} [${fallback}]: `, { fallback: String(fallback) });
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    console.log('  Please type a number.');
  }
}

async function confirm(prompt) {
  return /^y(es)?$/i.test(await ask(`${prompt} (y/n): `));
}

/** Lines until a line that is exactly "." — blank lines are kept as paragraph breaks. */
async function readParagraphs() {
  const lines = [];
  for (;;) {
    const line = await readLine('  > ');
    if (line === null) throw new Cancelled();
    if (line.trim() === '.') break;
    lines.push(line.trimEnd());
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** One step per line until an empty line. */
async function readSteps() {
  const steps = [];
  for (;;) {
    const line = await readLine(`  ${steps.length + 1}. `);
    if (line === null) throw new Cancelled();
    if (!line.trim()) {
      if (steps.length > 0) return steps;
      console.log('  Add at least one step.');
      continue;
    }
    steps.push(line.trim());
  }
}

// ---------- data helpers ----------

async function loadSections(db) {
  const snap = await db.collection('sections').orderBy('order').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function loadQuestions(db) {
  const snap = await db.collection('questions').orderBy('order').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

const nextOrder = (items) => Math.max(0, ...items.map((item) => Number(item.order) || 0)) + 1;

/** Accepts a URL as-is; uploads a local file to Vercel Blob. Strips quotes added by drag-and-drop. */
async function resolveImage(input, baseDir = process.cwd()) {
  const value = input.trim().replace(/^["']|["']$/g, '');
  if (/^https?:\/\//i.test(value)) return value;
  return uploadImage(resolve(baseDir, value));
}

/** Validates and normalises a question; returns the Firestore fields (without image handling). */
function toQuestionFields(q, sectionIds) {
  const errors = [];
  if (!q.title?.trim()) errors.push('title is required');
  if (!sectionIds.has(q.sectionId)) errors.push(`sectionId "${q.sectionId}" does not exist`);
  if (!ANSWER_TYPES.includes(q.answerType)) errors.push('answerType must be "paragraph" or "steps"');
  if (typeof q.order !== 'number') errors.push('order must be a number');

  const steps = Array.isArray(q.steps) ? q.steps.map((s) => String(s).trim()).filter(Boolean) : [];
  if (q.answerType === 'steps' && steps.length === 0) errors.push('a "steps" answer needs at least one step');
  if (q.answerType === 'paragraph' && !q.answerText?.trim()) errors.push('a "paragraph" answer needs answerText');
  if (errors.length) throw new Error(errors.join('; '));

  return {
    sectionId: q.sectionId,
    title: q.title.trim(),
    order: q.order,
    answerType: q.answerType,
    answerText: (q.answerText ?? '').trim(),
    steps: q.answerType === 'steps' ? steps : [],
    ...(q.imageUrl ? { imageUrl: q.imageUrl, imageAlt: (q.imageAlt || q.title).trim() } : {}),
  };
}

function printQuestion(fields) {
  console.log(`\n  Section:   ${fields.sectionId}`);
  console.log(`  Title:     ${fields.title}`);
  console.log(`  Type:      ${fields.answerType}`);
  if (fields.answerText) console.log(`  Text:      ${fields.answerText.replace(/\n/g, '\n             ')}`);
  fields.steps.forEach((step, i) => console.log(`  Step ${i + 1}:    ${step}`));
  if (fields.imageUrl) console.log(`  Image:     ${fields.imageUrl}`);
  console.log(`  Order:     ${fields.order}\n`);
}

// ---------- commands ----------

async function list(db) {
  const [sections, questions] = await Promise.all([loadSections(db), loadQuestions(db)]);
  if (sections.length === 0) return console.log('No sections yet. Start with: npm run content -- add-section');

  for (const section of sections) {
    const own = questions.filter((q) => q.sectionId === section.id);
    console.log(`\n[${section.order}] ${section.title}   (id: ${section.id})`);
    if (own.length === 0) console.log('    (no questions yet: hidden on the website)');
    for (const q of own) console.log(`    ${q.order}. ${q.title}   [${q.answerType}${q.imageUrl ? ', image' : ''}] (id: ${q.id})`);
  }

  const orphans = questions.filter((q) => !sections.some((s) => s.id === q.sectionId));
  if (orphans.length) {
    console.log('\n⚠ Questions whose sectionId matches no section (hidden on the website):');
    for (const q of orphans) console.log(`    ${q.title}  (id: ${q.id}, sectionId: ${q.sectionId})`);
  }
}

async function addSection(db) {
  const sections = await loadSections(db);
  const existing = new Set(sections.map((s) => s.id));

  console.log('\nNew section');
  let id;
  for (;;) {
    id = (await ask('ID — English, lowercase, dashes (e.g. waybills, daily-reports): ', { required: true })).toLowerCase();
    if (!SECTION_ID.test(id)) console.log('  Use only a-z, 0-9 and single dashes.');
    else if (existing.has(id)) console.log('  A section with this ID already exists.');
    else break;
  }
  const title = await ask('Title (shown on the website): ', { required: true });
  const order = await askNumber('Order', nextOrder(sections));

  console.log(`\n  ID: ${id}\n  Title: ${title}\n  Order: ${order}\n`);
  if (!(await confirm('Save this section?'))) return console.log('Not saved.');

  await db.collection('sections').doc(id).set({ title, order });
  console.log(`✔ Section saved. It appears on the website once it has a question:\n  npm run content -- add-question`);
}

async function addQuestion(db) {
  const sections = await loadSections(db);
  if (sections.length === 0) return console.log('Add a section first: npm run content -- add-section');

  console.log('\nSections:');
  sections.forEach((s, i) => console.log(`  ${i + 1}) ${s.title}  (${s.id})`));
  let section;
  while (!section) {
    section = sections[Number(await ask('Section number: ', { required: true })) - 1];
    if (!section) console.log('  Pick one of the numbers above.');
  }

  const title = await ask('Question title: ', { required: true });

  let answerType;
  while (!answerType) {
    const choice = await ask('Answer type — 1) paragraph (text)   2) steps (numbered): ', { required: true });
    answerType = { 1: 'paragraph', 2: 'steps', paragraph: 'paragraph', steps: 'steps' }[choice.toLowerCase()];
  }

  let answerText = '';
  let steps = [];
  if (answerType === 'paragraph') {
    console.log('Answer text. Empty line = new paragraph. Type a single "." on its own line to finish.');
    while (!answerText) {
      answerText = await readParagraphs();
      if (!answerText) console.log('  The answer cannot be empty. Type it, then "." to finish.');
    }
  } else {
    answerText = await ask('Intro line above the steps (optional, Enter to skip): ');
    console.log('Steps: one per line. Press Enter on an empty line to finish.');
    steps = await readSteps();
  }

  let imageUrl = '';
  let imageAlt = '';
  for (;;) {
    const image = await ask('Image — file path or URL (Enter to skip): ');
    if (!image) break;
    try {
      imageUrl = await resolveImage(image);
      console.log(`  ✔ ${imageUrl}`);
      imageAlt = await ask('Short image description [question title]: ', { fallback: title });
      break;
    } catch (error) {
      console.log(`  ✖ ${error.message}`);
    }
  }

  const questionsInSection = (await loadQuestions(db)).filter((q) => q.sectionId === section.id);
  const order = await askNumber('Order inside the section', nextOrder(questionsInSection));

  const fields = toQuestionFields(
    { sectionId: section.id, title, answerType, answerText, steps, imageUrl, imageAlt, order },
    new Set(sections.map((s) => s.id)),
  );
  printQuestion(fields);
  if (!(await confirm('Save this question?'))) return console.log('Not saved.');

  const ref = await db.collection('questions').add(fields);
  console.log(`✔ Question saved (id: ${ref.id}). Refresh the website to see it.`);
}

async function importFile(db, file) {
  if (!file) throw new Error('Usage: npm run content -- import <file.json>');
  const path = resolve(file);
  const data = JSON.parse(await readFile(path, 'utf8'));
  const newSections = data.sections ?? [];
  const newQuestions = data.questions ?? [];

  // Validate everything before writing anything.
  for (const s of newSections) {
    if (!SECTION_ID.test(s.id ?? '')) throw new Error(`Section "${s.id}": ID must be lowercase a-z, 0-9 and dashes`);
    if (!s.title?.trim()) throw new Error(`Section "${s.id}": title is required`);
    if (typeof s.order !== 'number') throw new Error(`Section "${s.id}": order must be a number`);
  }
  const sectionIds = new Set([...(await loadSections(db)).map((s) => s.id), ...newSections.map((s) => s.id)]);
  newQuestions.forEach((q, i) => {
    try {
      toQuestionFields({ ...q, imageUrl: q.imageUrl || (q.imageFile ? 'pending' : '') }, sectionIds);
    } catch (error) {
      throw new Error(`Question ${i + 1} ("${q.title ?? ''}"): ${error.message}`);
    }
  });

  console.log(`\nAbout to write ${newSections.length} section(s) and ${newQuestions.length} question(s) to Firestore.`);
  console.log('Items with an "id" that already exists will be REPLACED.');
  if (!(await confirm('Continue?'))) return console.log('Nothing written.');

  // Upload local images first, so a failed upload leaves Firestore untouched.
  const questionFields = [];
  for (const q of newQuestions) {
    const imageUrl = q.imageFile ? await resolveImage(q.imageFile, dirname(path)) : q.imageUrl;
    questionFields.push({ id: q.id, fields: toQuestionFields({ ...q, imageUrl }, sectionIds) });
  }

  const batch = db.batch();
  for (const { id, ...s } of newSections) batch.set(db.collection('sections').doc(id), { title: s.title.trim(), order: s.order });
  for (const { id, fields } of questionFields) {
    const ref = id ? db.collection('questions').doc(id) : db.collection('questions').doc();
    batch.set(ref, fields);
  }
  await batch.commit();
  console.log(`✔ Imported ${newSections.length} section(s) and ${newQuestions.length} question(s).`);
}

async function clear(db, projectId) {
  const [sections, questions] = await Promise.all([db.collection('sections').get(), db.collection('questions').get()]);
  if (sections.empty && questions.empty) console.log('Firestore has no sections or questions.');

  if (!sections.empty || !questions.empty) {
    console.log(`\n⚠ This permanently deletes ${sections.size} section(s) and ${questions.size} question(s) from "${projectId}".`);
    console.log('There is no undo. To see what would be deleted, cancel and run: npm run content -- list');
    const typed = await ask(`Type the project ID (${projectId}) to confirm: `);
    if (typed !== projectId) return console.log('Did not match. Nothing deleted.');

    await db.recursiveDelete(db.collection('questions'));
    await db.recursiveDelete(db.collection('sections'));
    console.log(`✔ Deleted ${sections.size} section(s) and ${questions.size} question(s).`);
  }

  // Images live in Vercel Blob, separately from Firestore. Only offered when a token is configured.
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const images = await listTutorialImages();
  if (images.length === 0) return;
  if (!(await confirm(`\nAlso delete ${images.length} image(s) in Vercel Blob (tutorial-images/)?`))) {
    return console.log('Images kept.');
  }
  await deleteImages(images);
  console.log(`✔ Deleted ${images.length} image(s).`);
}

// ---------- main ----------

const COMMANDS = { list, 'add-section': addSection, 'add-question': addQuestion, import: importFile, clear };
const [command, ...args] = process.argv.slice(2);

try {
  if (!COMMANDS[command]) {
    console.log('Usage: npm run content -- <list | add-section | add-question | import <file.json> | clear>');
    process.exitCode = 1;
  } else {
    const { db, projectId, target } = getAdminDb();
    console.log(`Firestore: ${target}`);
    await COMMANDS[command](db, ...(command === 'clear' ? [projectId] : args));
  }
} catch (error) {
  console.error(error instanceof Cancelled ? '\nCancelled.' : `✖ ${error.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
