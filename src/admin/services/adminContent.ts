import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore/lite';
import { getDb } from '../../services/firebase';
import { QUESTIONS_COLLECTION, SECTIONS_COLLECTION } from '../../services/tutorialService';
import type { AdminQuestion, AdminSection, QuestionInput } from '../types';

const sectionsRef = () => collection(getDb(), SECTIONS_COLLECTION);
const questionsRef = () => collection(getDb(), QUESTIONS_COLLECTION);

const nextOrder = (items: { order: number }[]) => Math.max(0, ...items.map((i) => i.order)) + 1;

function toQuestion(id: string, d: DocumentData): AdminQuestion {
  return {
    id,
    sectionId: String(d.sectionId ?? ''),
    title: String(d.title ?? ''),
    order: typeof d.order === 'number' ? d.order : 0,
    answerType: d.answerType === 'steps' ? 'steps' : 'paragraph',
    answerText: String(d.answerText ?? ''),
    steps: Array.isArray(d.steps) ? d.steps.map(String) : [],
    ...(d.imageUrl ? { imageUrl: String(d.imageUrl), imageAlt: String(d.imageAlt ?? '') } : {}),
    ...(typeof d.imageWidth === 'number' ? { imageWidth: d.imageWidth } : {}),
    ...(typeof d.imageHeight === 'number' ? { imageHeight: d.imageHeight } : {}),
  };
}

/** Everything, unfiltered — unlike the public loader, empty sections and orphans are kept. */
export async function loadAdminContent() {
  const [s, q] = await Promise.all([
    getDocs(query(sectionsRef(), orderBy('order'))),
    getDocs(query(questionsRef(), orderBy('order'))),
  ]);
  return {
    sections: s.docs.map((d): AdminSection => ({ id: d.id, title: String(d.data().title ?? ''), order: d.data().order })),
    questions: q.docs.map((d) => toQuestion(d.id, d.data())),
  };
}

export async function createSection(title: string, existing: AdminSection[]) {
  await addDoc(sectionsRef(), { title: title.trim(), order: nextOrder(existing) });
}

export async function renameSection(id: string, title: string) {
  await updateDoc(doc(sectionsRef(), id), { title: title.trim() });
}

/** Deletes a section and every question in it, atomically. */
export async function deleteSection(id: string, questions: AdminQuestion[]) {
  const batch = writeBatch(getDb());
  for (const q of questions.filter((q) => q.sectionId === id)) batch.delete(doc(questionsRef(), q.id));
  batch.delete(doc(sectionsRef(), id));
  await batch.commit();
}

/** Rewrites `order` as 1..n following `orderedIds`, so gaps and duplicates disappear. */
export async function saveOrder(kind: 'sections' | 'questions', orderedIds: string[]) {
  const batch = writeBatch(getDb());
  const ref = kind === 'sections' ? sectionsRef() : questionsRef();
  orderedIds.forEach((id, i) => batch.update(doc(ref, id), { order: i + 1 }));
  await batch.commit();
}

function cleanQuestion(input: QuestionInput, order: number) {
  const steps = input.steps.map((s) => s.trim()).filter(Boolean);
  return {
    sectionId: input.sectionId,
    title: input.title.trim(),
    order,
    answerType: input.answerType,
    answerText: input.answerText.trim(),
    steps: input.answerType === 'steps' ? steps : [],
    ...(input.imageUrl
      ? {
          imageUrl: input.imageUrl.trim(),
          imageAlt: (input.imageAlt || input.title).trim(),
          ...(input.imageWidth ? { imageWidth: input.imageWidth } : {}),
          ...(input.imageHeight ? { imageHeight: input.imageHeight } : {}),
        }
      : {}),
  };
}

/**
 * Creates or fully replaces a question. A question moved to another section goes to the
 * end of that section; otherwise it keeps its place.
 */
export async function saveQuestion(input: QuestionInput, all: AdminQuestion[], existing?: AdminQuestion) {
  const keepsPlace = existing && existing.sectionId === input.sectionId;
  const order = keepsPlace ? existing.order : nextOrder(all.filter((q) => q.sectionId === input.sectionId));
  const data = cleanQuestion(input, order);
  if (existing) await setDoc(doc(questionsRef(), existing.id), data);
  else await addDoc(questionsRef(), data);
}

export async function deleteQuestion(id: string) {
  await deleteDoc(doc(questionsRef(), id));
}
