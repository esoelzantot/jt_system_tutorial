import type { QuestionTranslation, Question, Section, TicketSubtype, Translations } from '../types/tutorial';
import type { Lang, TranslationLang } from './config';

const pick = (translated: string | undefined, base: string) => translated?.trim() || base;

/** The parts of a question that have text to translate (shared with the dashboard's model). */
interface TranslatableQuestion {
  title: string;
  answerText: string;
  steps: string[];
  subtypes: TicketSubtype[];
  translations?: Translations<QuestionTranslation>;
}

export type TranslationStatus = 'complete' | 'partial' | 'none';

/** Compares a translation with the Arabic text: every non-empty Arabic field needs a counterpart. */
export function translationStatus(q: TranslatableQuestion, lang: TranslationLang): TranslationStatus {
  const tr = q.translations?.[lang];
  const has = (value: string | undefined) => !!value?.trim();
  const checks = [
    has(tr?.title),
    ...(q.answerText.trim() ? [has(tr?.answerText)] : []),
    ...q.steps.map((_, i) => has(tr?.steps?.[i])),
    ...q.subtypes.flatMap((s, i) => [
      has(tr?.subtypes?.[i]?.title),
      has(tr?.subtypes?.[i]?.meaning),
      ...(s.whenToUse.trim() ? [has(tr?.subtypes?.[i]?.whenToUse)] : []),
    ]),
  ];
  if (checks.every(Boolean)) return 'complete';
  return checks.some(Boolean) ? 'partial' : 'none';
}

/** Applies a translation field by field: anything missing stays in Arabic rather than blank. */
export function localizeQuestion(q: Question, lang: Lang): Question {
  if (lang === 'ar') return q;
  const tr = q.translations?.[lang];
  const title = pick(tr?.title, q.title);
  return {
    ...q,
    title,
    answerText: pick(tr?.answerText, q.answerText),
    steps: q.steps.map((step, i) => pick(tr?.steps?.[i], step)),
    subtypes: q.subtypes.map((s, i) => {
      const st = tr?.subtypes?.[i];
      return {
        ...s,
        title: pick(st?.title, lang === 'en' ? s.titleEn || s.title : s.title),
        // The secondary English name would only repeat the title in English.
        titleEn: lang === 'en' ? '' : s.titleEn,
        meaning: pick(st?.meaning, s.meaning),
        whenToUse: pick(st?.whenToUse, s.whenToUse),
      };
    }),
    image: q.image && { ...q.image, alt: tr?.imageAlt?.trim() || tr?.title?.trim() || q.image.alt },
    untranslated: translationStatus(q, lang) !== 'complete',
  };
}

export function localizeSections(sections: Section[], lang: Lang): Section[] {
  if (lang === 'ar') return sections;
  return sections.map((section) => ({
    ...section,
    title: pick(section.translations?.[lang]?.title, section.title),
    questions: section.questions.map((q) => localizeQuestion(q, lang)),
  }));
}
