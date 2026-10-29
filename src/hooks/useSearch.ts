import { useMemo } from 'react';
import type { HighlightedText, SearchResult, Section } from '../types/tutorial';
import { findRanges, makeSnippet, normalizeWithMap, tokenize, type NormalizedText } from '../utils/textSearch';

interface IndexedField {
  text: string;
  normalized: NormalizedText;
  stepNumber?: number;
}

interface IndexEntry {
  section: Section;
  question: SearchResult['question'];
  sectionTitle: IndexedField;
  questionTitle: IndexedField;
  answerFields: IndexedField[];
}

const field = (text: string, stepNumber?: number): IndexedField => ({
  text,
  normalized: normalizeWithMap(text),
  stepNumber,
});

function buildIndex(sections: Section[]): IndexEntry[] {
  return sections.flatMap((section) => {
    const sectionTitle = field(section.title);
    return section.questions.map((question) => ({
      section,
      question,
      sectionTitle,
      questionTitle: field(question.title),
      answerFields: [
        ...(question.answerText ? [field(question.answerText)] : []),
        ...question.steps.map((step, i) => field(step, i + 1)),
      ],
    }));
  });
}

const contains = (f: IndexedField, token: string) => f.normalized.value.includes(token);
const highlight = (f: IndexedField, tokens: string[]): HighlightedText => ({
  text: f.text,
  ranges: findRanges(f.normalized, tokens),
});

function search(index: IndexEntry[], tokens: string[]): SearchResult[] {
  const scored: { result: SearchResult; score: number }[] = [];

  for (const entry of index) {
    const fields = [entry.sectionTitle, entry.questionTitle, ...entry.answerFields];
    // Every word of the query must appear somewhere in the question (or its section).
    if (!tokens.every((token) => fields.some((f) => contains(f, token)))) continue;

    const titleHits = tokens.filter((token) => contains(entry.questionTitle, token)).length;
    const sectionHits = tokens.filter((token) => contains(entry.sectionTitle, token)).length;
    // Snippet: the paragraph or step containing the most query words (first one on ties).
    let matchedAnswer: IndexedField | undefined;
    let bestHits = 0;
    for (const f of entry.answerFields) {
      const hits = tokens.filter((token) => contains(f, token)).length;
      if (hits > bestHits) {
        bestHits = hits;
        matchedAnswer = f;
      }
    }
    const snippetField = matchedAnswer ?? entry.answerFields[0];

    scored.push({
      score: titleHits * 3 + sectionHits,
      result: {
        section: entry.section,
        question: entry.question,
        sectionTitle: highlight(entry.sectionTitle, tokens),
        questionTitle: highlight(entry.questionTitle, tokens),
        snippet: snippetField
          ? {
              ...makeSnippet(snippetField.text, matchedAnswer ? findRanges(snippetField.normalized, tokens) : []),
              stepNumber: snippetField.stepNumber,
            }
          : null,
      },
    });
  }

  // Array.prototype.sort is stable, so equal scores keep the tutorial's own order.
  return scored.sort((a, b) => b.score - a.score).map((s) => s.result);
}

/** Searches section titles, question titles, answer paragraphs and individual steps. */
export function useSearch(sections: Section[], query: string) {
  const index = useMemo(() => buildIndex(sections), [sections]);
  const tokens = useMemo(() => tokenize(query), [query]);
  const results = useMemo(() => (tokens.length > 0 ? search(index, tokens) : []), [index, tokens]);

  return { results, isSearching: tokens.length > 0 };
}
