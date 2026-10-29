import { collection, getDocs, orderBy, query, type DocumentData } from 'firebase/firestore/lite';
import type { AnswerType, Question, Section, TutorialImage } from '../types/tutorial';
import { toDisplayableImageUrl } from '../utils/imageUrl';
import { getDb } from './firebase';

export const SECTIONS_COLLECTION = 'sections';
export const QUESTIONS_COLLECTION = 'questions';

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asPositiveNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && value > 0 ? value : undefined;

function toImage(data: DocumentData): TutorialImage | null {
  const url = asString(data.imageUrl);
  if (!url) return null;
  return {
    url: toDisplayableImageUrl(url),
    alt: asString(data.imageAlt) || asString(data.title),
    width: asPositiveNumber(data.imageWidth),
    height: asPositiveNumber(data.imageHeight),
  };
}

function toQuestion(id: string, data: DocumentData, index: number): Question {
  const steps = Array.isArray(data.steps) ? data.steps.map(asString).filter(Boolean) : [];
  // A "steps" answer without any steps falls back to the paragraph so nothing renders empty.
  const answerType: AnswerType = data.answerType === 'steps' && steps.length > 0 ? 'steps' : 'paragraph';

  return {
    id,
    sectionId: asString(data.sectionId),
    title: asString(data.title),
    answerType,
    answerText: asString(data.answerText),
    steps,
    image: toImage(data),
    order: asNumber(data.order, index),
  };
}

/**
 * Loads every section with its questions, both sorted by their explicit `order`.
 * Two flat collections are read in parallel and joined on `question.sectionId`.
 */
export async function fetchTutorial(): Promise<Section[]> {
  const db = getDb();
  const [sectionSnap, questionSnap] = await Promise.all([
    getDocs(query(collection(db, SECTIONS_COLLECTION), orderBy('order'))),
    getDocs(query(collection(db, QUESTIONS_COLLECTION), orderBy('order'))),
  ]);

  const sections: Section[] = sectionSnap.docs.map((doc, index) => ({
    id: doc.id,
    title: asString(doc.data().title),
    order: asNumber(doc.data().order, index),
    questions: [],
  }));
  const byId = new Map(sections.map((section) => [section.id, section]));

  questionSnap.docs.forEach((doc, index) => {
    const question = toQuestion(doc.id, doc.data(), index);
    const section = byId.get(question.sectionId);
    if (!question.title) return;
    if (!section) {
      console.warn(`Question "${doc.id}" references unknown section "${question.sectionId}" and was skipped.`);
      return;
    }
    // Snapshot is already ordered by `order`, so pushing keeps each section's questions sorted.
    section.questions.push(question);
  });

  return sections.filter((section) => section.title && section.questions.length > 0);
}
