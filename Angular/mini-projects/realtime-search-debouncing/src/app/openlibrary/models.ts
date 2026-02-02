// UI-friendly model for Open Library search results.
export interface OpenLibraryBook {
  key: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  firstPublishYear: number | null;
}

// Minimal response shape from the Open Library Search API.
export interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDoc[];
}

// Raw document structure from the API.
export interface OpenLibraryDoc {
  key: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

// Highlight metadata for safe rendering (no innerHTML).
export interface HighlightPart {
  text: string;
  match: boolean;
}

// References:
// - Open Library Search API: https://openlibrary.org/dev/docs/api/search
