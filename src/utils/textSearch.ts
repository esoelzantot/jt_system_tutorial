import type { HighlightedText, TextRange } from '../types/tutorial';

// Arabic short vowels (tashkeel), Quranic marks and tatweel carry no meaning for search.
const IGNORED_CHARS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/;

const CHAR_FOLDS: Record<string, string> = {
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا',
  'ٱ': 'ا',
  'ى': 'ي',
  'ئ': 'ي',
  'ؤ': 'و',
  'ة': 'ه',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export interface NormalizedText {
  value: string;
  /** `map[i]` is the index in the original text of normalized character `i`. */
  map: number[];
}

/**
 * Folds text for matching (case, Arabic letter variants, diacritics, whitespace runs)
 * while remembering where each folded character came from, so matches can be
 * highlighted in the original text.
 */
export function normalizeWithMap(text: string): NormalizedText {
  let value = '';
  const map: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (IGNORED_CHARS.test(ch)) continue;

    if (/\s/.test(ch)) {
      if (value.length > 0 && value[value.length - 1] !== ' ') {
        value += ' ';
        map.push(i);
      }
      continue;
    }

    for (const folded of CHAR_FOLDS[ch] ?? ch.toLowerCase()) {
      value += folded;
      map.push(i);
    }
  }

  return { value, map };
}

export const normalize = (text: string): string => normalizeWithMap(text).value.trim();

export function tokenize(query: string): string[] {
  return Array.from(new Set(normalize(query).split(' ').filter(Boolean)));
}

/** Finds every token occurrence and returns merged ranges in original-text indices. */
export function findRanges(normalized: NormalizedText, tokens: string[]): TextRange[] {
  const ranges: TextRange[] = [];

  for (const token of tokens) {
    let from = normalized.value.indexOf(token);
    while (from !== -1) {
      const last = from + token.length - 1;
      ranges.push({ start: normalized.map[from], end: normalized.map[last] + 1 });
      from = normalized.value.indexOf(token, from + token.length);
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];
  for (const range of ranges) {
    const prev = merged[merged.length - 1];
    if (prev && range.start <= prev.end) prev.end = Math.max(prev.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

const ELLIPSIS = '…';

/** Cuts a window of text around the first match, shifting ranges to match. */
export function makeSnippet(text: string, ranges: TextRange[], maxLength = 160): HighlightedText {
  if (text.length <= maxLength) return { text, ranges };

  const anchor = ranges[0]?.start ?? 0;
  let start = Math.max(0, anchor - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);
  start = Math.max(0, end - maxLength);

  // Prefer word boundaries so the excerpt doesn't start or end mid-word.
  const boundaryStart = start === 0 ? 0 : text.indexOf(' ', start) + 1 || start;
  const lastSpace = text.lastIndexOf(' ', end);
  const boundaryEnd = end === text.length || lastSpace <= boundaryStart ? end : lastSpace;

  const prefix = boundaryStart > 0 ? ELLIPSIS : '';
  const suffix = boundaryEnd < text.length ? ELLIPSIS : '';
  const shift = prefix.length - boundaryStart;

  return {
    text: prefix + text.slice(boundaryStart, boundaryEnd) + suffix,
    ranges: ranges
      .filter((r) => r.end > boundaryStart && r.start < boundaryEnd)
      .map((r) => ({
        start: Math.max(r.start, boundaryStart) + shift,
        end: Math.min(r.end, boundaryEnd) + shift,
      })),
  };
}
