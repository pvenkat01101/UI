import { HighlightPart } from './models';

export function highlightParts(text: string, query: string): HighlightPart[] {
  // For empty queries, return the full text unhighlighted.
  if (!query.trim()) {
    return [{ text, match: false }];
  }

  const safeText = text ?? '';
  const lowerText = safeText.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const parts: HighlightPart[] = [];
  let cursor = 0;
  let nextIndex = lowerText.indexOf(lowerQuery, cursor);

  while (nextIndex !== -1) {
    if (nextIndex > cursor) {
      parts.push({ text: safeText.slice(cursor, nextIndex), match: false });
    }

    parts.push({ text: safeText.slice(nextIndex, nextIndex + query.length), match: true });
    cursor = nextIndex + query.length;
    nextIndex = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < safeText.length) {
    parts.push({ text: safeText.slice(cursor), match: false });
  }

  return parts.length ? parts : [{ text: safeText, match: false }];
}

// References:
// - Angular security guide (avoid innerHTML for untrusted input): https://angular.dev/guide/security
