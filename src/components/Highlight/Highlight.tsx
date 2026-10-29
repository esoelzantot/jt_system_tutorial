import type { ReactNode } from 'react';
import type { HighlightedText } from '../../types/tutorial';

/** Renders text with `<mark>` around the given ranges. */
export function Highlight({ text, ranges }: HighlightedText) {
  if (ranges.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, i) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(<mark key={i}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}
