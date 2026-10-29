export type AnswerType = 'paragraph' | 'steps';

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
  image: TutorialImage | null;
  order: number;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  questions: Question[];
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
  snippet: (HighlightedText & { stepNumber?: number }) | null;
}

/** Where to go when navigating from the menu or from a search result. */
export interface NavigationTarget {
  sectionId: string;
  questionId?: string;
}
