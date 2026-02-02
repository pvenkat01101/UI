import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';
import { OpenLibraryService } from './openlibrary.service';
import { HighlightPart, OpenLibraryBook } from './models';
import { highlightParts } from './highlight.util';

// Minimum query length to avoid noisy, low-signal searches.
export const MIN_QUERY_LENGTH = 2;
// Debounce window so we only search after the user pauses typing.
export const DEFAULT_DEBOUNCE_MS = 300;

export interface SearchState {
  query: string;
  results: OpenLibraryBook[];
  loading: boolean;
  error: string | null;
  canSearch: boolean;
}

export interface BookViewModel extends OpenLibraryBook {
  highlightedTitle: HighlightPart[];
}

export interface SearchViewModel extends SearchState {
  results: BookViewModel[];
  showIdle: boolean;
  showTooShort: boolean;
}

// Normalize whitespace so "harry   potter" and "harry potter" are treated the same.
const normalizeQuery = (value: string) => value.trim().replace(/\s+/g, ' ');

export function buildOpenLibraryState(
  query$: Observable<string>,
  searchFn: (query: string) => Observable<OpenLibraryBook[]>,
  config: { debounceMs: number; minLength: number } = {
    debounceMs: DEFAULT_DEBOUNCE_MS,
    minLength: MIN_QUERY_LENGTH
  }
): Observable<SearchState> {
  return query$.pipe(
    // Ensure the stream never emits null/undefined.
    map((raw) => normalizeQuery(raw ?? '')),
    // Wait for quiet time before searching.
    debounceTime(config.debounceMs),
    // Prevent duplicate API calls for equivalent queries.
    distinctUntilChanged((a, b) => a.toLowerCase() === b.toLowerCase()),
    // Cancel previous searches when new input arrives.
    switchMap((query) => {
      if (query.length < config.minLength) {
        // Short queries skip the API entirely.
        return of({
          query,
          results: [],
          loading: false,
          error: null,
          canSearch: false
        });
      }

      return searchFn(query).pipe(
        // Success state.
        map((results) => ({
          query,
          results,
          loading: false,
          error: null,
          canSearch: true
        })),
        // Loading state.
        startWith({
          query,
          results: [],
          loading: true,
          error: null,
          canSearch: true
        }),
        // Error state while keeping the stream alive.
        catchError(() =>
          of({
            query,
            results: [],
            loading: false,
            error: 'Open Library is temporarily unavailable. Try again soon.',
            canSearch: true
          })
        )
      );
    }),
    // Replay the latest state to new subscribers without re-fetching.
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

@Component({
  selector: 'app-openlibrary-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './openlibrary-search.component.html',
  styleUrl: './openlibrary-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpenLibrarySearchComponent {
  // Service that calls the Open Library API.
  private readonly openLibraryService = inject(OpenLibraryService);

  // Reactive form control for the search box.
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly minQueryLength = MIN_QUERY_LENGTH;
  readonly debounceMs = DEFAULT_DEBOUNCE_MS;

  // Stream of user input values.
  private readonly rawQuery$ = this.searchControl.valueChanges.pipe(startWith(''));

  // Single view model stream consumed by the template.
  readonly vm$: Observable<SearchViewModel> = buildOpenLibraryState(
    this.rawQuery$,
    (query) => this.openLibraryService.searchBooks(query)
  ).pipe(
    // Add highlight data for safe rendering in the template.
    map((state) => ({
      ...state,
      results: state.results.map((book) => ({
        ...book,
        highlightedTitle: highlightParts(book.title, state.query)
      })),
      // UI state flags.
      showIdle: state.query.length === 0,
      showTooShort: state.query.length > 0 && state.query.length < MIN_QUERY_LENGTH
    }))
  );
}

// References:
// - Open Library Search API: https://openlibrary.org/dev/docs/api/search
// - RxJS debounceTime / switchMap: https://reactivex.io/documentation/operators/debounce.html
