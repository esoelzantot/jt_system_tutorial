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
import { TRANSLATION_LANGS } from '../../i18n/config';
import { getDb } from '../../services/firebase';
import { QUESTIONS_COLLECTION, SECTIONS_COLLECTION } from '../../services/tutorialService';
import type { GuideItem, GuideItemTranslation, GuideTranslation, PackagingGuide, QuestionTranslation, SectionTranslation, Translations } from '../../types/tutorial';
import type { AdminQuestion, AdminSection, QuestionInput } from '../types';

const sectionsRef = () => collection(getDb(), SECTIONS_COLLECTION);
const questionsRef = () => collection(getDb(), QUESTIONS_COLLECTION);

const nextOrder = (items: { order: number }[]) => Math.max(0, ...items.map((i) => i.order)) + 1;

function toQuestion(id: string, d: DocumentData): AdminQuestion {
  return {
    id,
    sectionId: String(d.sectionId ?? ''),
    title: String(d.title ?? ''),
    // Numbers typed as text in the Firebase console still sort correctly.
    order: Number(d.order) || 0,
    answerType: d.answerType === 'steps' || d.answerType === 'types' || d.answerType === 'guide' || d.answerType === 'claim' ? d.answerType : 'paragraph',
    answerText: String(d.answerText ?? ''),
    steps: Array.isArray(d.steps) ? d.steps.map(String) : [],
    subtypes: Array.isArray(d.subtypes)
      ? d.subtypes.map((s: DocumentData) => ({
          title: String(s?.title ?? ''),
          titleEn: String(s?.titleEn ?? ''),
          meaning: String(s?.meaning ?? ''),
          whenToUse: String(s?.whenToUse ?? ''),
          icon: String(s?.icon ?? ''),
        }))
      : [],
    ...(d.guide
      ? {
          guide: {
            examples: d.guide.examples ?? [],
            materials: d.guide.materials ?? [],
            steps: d.guide.steps ?? [],
            notes: d.guide.notes ?? [],
            warning: d.guide.warning ?? '',
          },
        }
      : {}),
    ...(d.claim
      ? {
          claim: {
            deadline: String(d.claim.deadline ?? ''),
            terms: d.claim.terms ?? [],
            ...(d.claim.anyTerm === true ? { anyTerm: true } : {}),
            documents: d.claim.documents ?? [],
          },
        }
      : {}),
    ...(d.translations ? { translations: d.translations } : {}),
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
    sections: s.docs.map(
      (d): AdminSection => ({
        id: d.id,
        title: String(d.data().title ?? ''),
        order: Number(d.data().order) || 0,
        ...(d.data().translations ? { translations: d.data().translations } : {}),
      }),
    ),
    questions: q.docs.map((d) => toQuestion(d.id, d.data())),
  };
}

/** Keeps only languages with a title, so empty fields fall back to Arabic. */
function cleanSectionTranslations(translations: Translations<SectionTranslation>) {
  const clean: Translations<SectionTranslation> = {};
  for (const lang of TRANSLATION_LANGS) {
    const title = translations[lang]?.title?.trim();
    if (title) clean[lang] = { title };
  }
  return clean;
}

export async function createSection(title: string, translations: Translations<SectionTranslation>, existing: AdminSection[]) {
  await addDoc(sectionsRef(), { title: title.trim(), order: nextOrder(existing), translations: cleanSectionTranslations(translations) });
}

/** Also normalises `order` to a number, which the security rules require. */
export async function updateSection(section: AdminSection, title: string, translations: Translations<SectionTranslation>) {
  await updateDoc(doc(sectionsRef(), section.id), {
    title: title.trim(),
    order: section.order,
    translations: cleanSectionTranslations(translations),
  });
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

/** Drops empty fields and languages. Steps and subtypes keep their positions (index = Arabic index). */
function cleanQuestionTranslations(translations: Translations<QuestionTranslation> = {}) {
  const clean: Translations<QuestionTranslation> = {};
  for (const lang of TRANSLATION_LANGS) {
    const tr = translations[lang];
    if (!tr) continue;
    const out: QuestionTranslation = {};
    if (tr.title?.trim()) out.title = tr.title.trim();
    if (tr.answerText?.trim()) out.answerText = tr.answerText.trim();
    if (tr.imageAlt?.trim()) out.imageAlt = tr.imageAlt.trim();
    if (tr.steps?.some((s) => s.trim())) out.steps = tr.steps.map((s) => s.trim());
    if (tr.subtypes?.some((s) => s.title?.trim() || s.meaning?.trim() || s.whenToUse?.trim())) {
      out.subtypes = tr.subtypes.map((s) => ({
        title: s.title?.trim() ?? '',
        meaning: s.meaning?.trim() ?? '',
        whenToUse: s.whenToUse?.trim() ?? '',
      }));
    }
    if (tr.guide) {
      const items = (list: GuideItemTranslation[] = []) => list.map((i) => ({ text: i.text?.trim() ?? '', note: i.note?.trim() ?? '' }));
      const guide: GuideTranslation = { examples: items(tr.guide.examples), materials: items(tr.guide.materials), steps: items(tr.guide.steps), notes: (tr.guide.notes ?? []).map((n) => n.trim()), warning: tr.guide.warning?.trim() ?? '' };
      const anyText = [...guide.examples!, ...guide.materials!, ...guide.steps!].some((i) => i.text || i.note) || guide.notes!.some(Boolean) || guide.warning;
      if (anyText) out.guide = guide;
    }
    if (tr.claim) {
      const items = (list: GuideItemTranslation[] = []) => list.map((i) => ({ text: i.text?.trim() ?? '', note: i.note?.trim() ?? '' }));
      const claim = { deadline: tr.claim.deadline?.trim() ?? '', terms: items(tr.claim.terms), documents: items(tr.claim.documents) };
      if (claim.deadline || [...claim.terms, ...claim.documents].some((i) => i.text || i.note)) out.claim = claim;
    }
    if (Object.keys(out).length > 0) clean[lang] = out;
  }
  return clean;
}

/** Firestore refuses undefined values, so optional fields are only written when set. */
const cleanGuideItems = (items: GuideItem[]) =>
  items.map((i) => ({ text: i.text.trim(), ...(i.note?.trim() ? { note: i.note.trim() } : {}), ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}) }));

const cleanGuide = (g: PackagingGuide): PackagingGuide => ({
  examples: cleanGuideItems(g.examples),
  materials: cleanGuideItems(g.materials),
  steps: cleanGuideItems(g.steps),
  notes: g.notes.map((n) => n.trim()),
  warning: g.warning.trim(),
});

function cleanQuestion(input: QuestionInput, order: number) {
  const steps = input.steps.map((s) => s.trim()).filter(Boolean);
  return {
    sectionId: input.sectionId,
    title: input.title.trim(),
    order,
    answerType: input.answerType,
    answerText: input.answerText.trim(),
    translations: cleanQuestionTranslations(input.translations),
    ...(input.answerType === 'guide' && input.guide ? { guide: cleanGuide(input.guide) } : {}),
    ...(input.answerType === 'claim' && input.claim
      ? { claim: { deadline: input.claim.deadline.trim(), terms: cleanGuideItems(input.claim.terms), ...(input.claim.anyTerm ? { anyTerm: true } : {}), documents: cleanGuideItems(input.claim.documents) } }
      : {}),
    steps: input.answerType === 'steps' ? steps : [],
    ...(input.answerType === 'types'
      ? {
          subtypes: input.subtypes
            .filter((s) => s.title.trim())
            .map((s) => ({
              title: s.title.trim(),
              titleEn: s.titleEn.trim(),
              meaning: s.meaning.trim(),
              whenToUse: s.whenToUse.trim(),
              icon: s.icon,
            })),
        }
      : {}),
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
