import type { AnswerType } from '../types/tutorial';

export interface AdminSection {
  id: string;
  title: string;
  order: number;
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
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export type QuestionInput = Omit<AdminQuestion, 'id' | 'order'>;
