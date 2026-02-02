import { HighlightPart } from './models';

export function highlightParts(text: string, query: string): HighlightPart[] {
  // Early exit for empty queries: nothing is highlighted.
  // This keeps the UI stable and avoids unnecessary work.
  if (!query.trim()) {
    return [{ text, match: false }];
  }

  // Normalize for case-insensitive matching.
  // Other ways:
  // - Use localeCompare for language-specific rules,
  // - Normalize accents with String.normalize('NFD').
  const safeText = text ?? '';
  const lowerText = safeText.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Split the text into alternating match and non-match parts.
  // This is safer than injecting HTML (no XSS risk).
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

  // Guarantee at least one part so templates are simple.
  return parts.length ? parts : [{ text: safeText, match: false }];
}

// References:
// - Angular security guide (avoid innerHTML for untrusted input): https://angular.dev/guide/security
