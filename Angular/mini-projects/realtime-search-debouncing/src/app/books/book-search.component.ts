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
import { BooksService } from './books.service';
import { Book, HighlightPart } from './models';
import { highlightParts } from './highlight.util';

// Minimum length before we hit the API.
// Internally, this reduces load and avoids searching for very noisy inputs.
export const MIN_QUERY_LENGTH = 2;

// Debounce duration in milliseconds.
// Internally, debounceTime waits for quiet time before emitting the latest value.
export const DEFAULT_DEBOUNCE_MS = 300;

export interface SearchState {
  query: string;
  results: Book[];
  loading: boolean;
  error: string | null;
  canSearch: boolean;
}

export interface BookViewModel extends Book {
  highlightedTitle: HighlightPart[];
}

export interface SearchViewModel extends SearchState {
  results: BookViewModel[];
  showIdle: boolean;
  showTooShort: boolean;
}

// Normalize user input so that whitespace and casing do not create duplicate queries.
// Other ways:
// - You could also normalize diacritics or use locale-aware comparisons.
const normalizeQuery = (value: string) => value.trim().replace(/\s+/g, ' ');

export function buildSearchState(
  query$: Observable<string>,
  searchFn: (query: string) => Observable<Book[]>,
  config: { debounceMs: number; minLength: number } = {
    debounceMs: DEFAULT_DEBOUNCE_MS,
    minLength: MIN_QUERY_LENGTH
  }
): Observable<SearchState> {
  return query$.pipe(
    // valueChanges can emit null in some configurations, so we normalize to ''.
    map((raw) => normalizeQuery(raw ?? '')),

    // Debounce reduces API calls by waiting for the user to pause typing.
    debounceTime(config.debounceMs),

    // Ignore repeated queries (case-insensitive) to avoid duplicate requests.
    // Internally, distinctUntilChanged compares the last emitted value to the new one.
    distinctUntilChanged((a, b) => a.toLowerCase() === b.toLowerCase()),

    // switchMap cancels the previous request when a new query arrives.
    // This prevents older, slower responses from overwriting newer results.
    switchMap((query) => {
      if (query.length < config.minLength) {
        // No API call for short queries; emit a stable empty state.
        return of({
          query,
          results: [],
          loading: false,
          error: null,
          canSearch: false
        });
      }

      return searchFn(query).pipe(
        // Convert the API response into a success UI state.
        map((results) => ({
          query,
          results,
          loading: false,
          error: null,
          canSearch: true
        })),

        // Emit a loading state immediately while the request is in flight.
        // Other ways:
        // - Use a separate loading$ stream and combineLatest.
        startWith({
          query,
          results: [],
          loading: true,
          error: null,
          canSearch: true
        }),

        // Keep the stream alive on errors so the next keystroke can recover.
        // Internally, catchError replaces the error with a fallback Observable.
        catchError(() =>
          of({
            query,
            results: [],
            loading: false,
            error: 'We hit a temporary issue. Please try again.',
            canSearch: true
          })
        )
      );
    }),

    // Share the latest state with any number of subscribers (async pipes, tests).
    // Internally, shareReplay caches the last value and replays it to new subscribers.
    // Other ways:
    // - Use a ComponentStore or signals for state sharing.
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

@Component({
  selector: 'app-book-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './book-search.component.html',
  styleUrl: './book-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookSearchComponent {
  // Inject the service directly; keeps the component focused on UI + streams.
  private readonly booksService = inject(BooksService);

  // Reactive form control: emits a new value on every keystroke.
  // Other ways:
  // - Use FormBuilder,
  // - Use a template-driven form,
  // - Use signals and manual event handlers.
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly minQueryLength = MIN_QUERY_LENGTH;
  readonly debounceMs = DEFAULT_DEBOUNCE_MS;

  // valueChanges is a stream of user input.
  // startWith('') ensures the UI has a predictable initial state.
  private readonly rawQuery$ = this.searchControl.valueChanges.pipe(startWith(''));

  // vm$ is the only stream the template consumes.
  // Internally, async pipe subscribes/unsubscribes automatically to avoid leaks.
  readonly vm$: Observable<SearchViewModel> = buildSearchState(
    this.rawQuery$,
    (query) => this.booksService.searchBooks(query)
  ).pipe(
    // Decorate results with highlight metadata for safe rendering.
    map((state) => ({
      ...state,
      results: state.results.map((book) => ({
        ...book,
        highlightedTitle: highlightParts(book.title, state.query)
      })),
      // These flags drive UI states in the template.
      showIdle: state.query.length === 0,
      showTooShort: state.query.length > 0 && state.query.length < MIN_QUERY_LENGTH
    }))
  );
}

// References:
// - Angular reactive forms and valueChanges: https://angular.dev/guide/forms/reactive-forms
// - RxJS debounceTime operator: https://reactivex.io/documentation/operators/debounce.html
// - RxJS distinctUntilChanged operator: https://reactivex.io/documentation/operators/distinct.html
// - RxJS switch (cancels previous inner Observable): https://reactivex.io/documentation/operators/switch.html
// - RxJS shareReplay source (v7.8.x): https://unpkg.com/rxjs@7.8.2/dist/cjs/internal/operators/shareReplay.js
// - Angular ChangeDetectionStrategy (OnPush): https://v18.angular.dev/guide/components/advanced-configuration
