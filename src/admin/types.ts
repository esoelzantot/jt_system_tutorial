import type { AnswerType, ClaimInfo, PackagingGuide, QuestionTranslation, SectionTranslation, TicketSubtype, Translations } from '../types/tutorial';

export interface AdminSection {
  id: string;
  title: string;
  order: number;
  translations?: Translations<SectionTranslation>;
}

/** A question exactly as stored in Firestore (no display normalisation). */
export interface AdminQuestion {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  answerType: AnswerType;
  answerText: string;
  steps: string[];
  subtypes: TicketSubtype[];
  guide?: PackagingGuide;
  claim?: ClaimInfo;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  translations?: Translations<QuestionTranslation>;
}

export type QuestionInput = Omit<AdminQuestion, 'id' | 'order'>;
