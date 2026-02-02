// Internal app model: simple, predictable shape for templates.
// Other ways:
// - Keep the raw API response and map in the template (not recommended),
// - Use classes with constructors if you need methods.
export interface Book {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  previewLink: string | null;
}

// Minimal subset of the Google Books API response needed for this feature.
// Keeping it minimal reduces coupling and makes tests easier.
export interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
}

// Each item is a "volume". Fields are optional because the API can omit them.
export interface GoogleBooksItem {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    previewLink?: string;
  };
}

// Represents highlighted text fragments for safe rendering.
export interface HighlightPart {
  text: string;
  match: boolean;
}

// References:
// - Google Books API response shape: https://developers.google.com/books/docs/v1/reference/volumes
