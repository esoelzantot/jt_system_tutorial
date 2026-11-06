import type { TranslationLang } from '../i18n/config';

export type AnswerType = 'paragraph' | 'steps' | 'types' | 'guide';

/** A row in a packaging guide: an example, a material or a step. */
export interface GuideItem {
  text: string;
  note?: string;
  imageUrl?: string;
}

/** Structured answer of a question with answerType "guide". */
export interface PackagingGuide {
  examples: GuideItem[];
  materials: GuideItem[];
  steps: GuideItem[];
  notes: string[];
  warning: string;
}

/** One subtype of a ticket: a question with answerType "types" is the main type. */
export interface TicketSubtype {
  title: string;
  titleEn: string;
  meaning: string;
  whenToUse: string;
  /** Key from SUBTYPE_ICONS. */
  icon: string;
}

export type Translations<T> = Partial<Record<TranslationLang, T>>;

export interface SubtypeTranslation {
  title?: string;
  meaning?: string;
  whenToUse?: string;
}

/** Texts of a question in another language. Steps and subtypes follow the Arabic order by index. */
export interface GuideItemTranslation {
  text?: string;
  note?: string;
}

export interface GuideTranslation {
  examples?: GuideItemTranslation[];
  materials?: GuideItemTranslation[];
  steps?: GuideItemTranslation[];
  notes?: string[];
  warning?: string;
}

export interface QuestionTranslation {
  title?: string;
  answerText?: string;
  steps?: string[];
  subtypes?: SubtypeTranslation[];
  guide?: GuideTranslation;
  imageAlt?: string;
}

export interface SectionTranslation {
  title?: string;
}

export interface TutorialImage {
  url: string;
  alt: string;
  /** Intrinsic size, used to reserve space and avoid layout shift. */
  width?: number;
  height?: number;
}

export interface Question {
  id: string;
  sectionId: string;
  title: string;
  answerType: AnswerType;
  answerText: string;
  steps: string[];
  subtypes: TicketSubtype[];
  guide?: PackagingGuide;
  image: TutorialImage | null;
  order: number;
  translations?: Translations<QuestionTranslation>;
  /** Set when localized: some text is still showing in Arabic. */
  untranslated?: boolean;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  questions: Question[];
  translations?: Translations<SectionTranslation>;
}

/** A highlight range in the original (non-normalized) text: [start, end). */
export interface TextRange {
  start: number;
  end: number;
}

export interface HighlightedText {
  text: string;
  ranges: TextRange[];
}

export interface SearchResult {
  section: Section;
  question: Question;
  sectionTitle: HighlightedText;
  questionTitle: HighlightedText;
  /** Excerpt from the answer; `stepNumber` is set when it came from a step. */
  snippet: (HighlightedText & { stepNumber?: number; subtypeIndex?: number }) | null;
}

/** Where the ticket explorer should jump after a search result. */
export interface ExplorerTarget {
  questionId: string;
  subtypeIndex?: number;
  stepIndex?: number;
}

/** Where to go when navigating from the menu or from a search result. */
export interface NavigationTarget {
  sectionId: string;
  questionId?: string;
}
