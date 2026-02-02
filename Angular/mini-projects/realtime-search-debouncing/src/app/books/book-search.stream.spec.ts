import { TestScheduler } from 'rxjs/testing';
import { filter, map } from 'rxjs';
import { buildSearchState } from './book-search.component';
import { Book } from './models';

describe('buildSearchState', () => {
  it('cancels slower requests when a newer query arrives (switchMap)', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ hot, cold, expectObservable }) => {
      const queries = hot('a---b----|', { a: 'har', b: 'angular' });

      const search = (query: string) => {
        if (query === 'har') {
          return cold<ReadonlyArray<Book>>('-----r|', {
            r: [{ id: 'a', title: 'Har', authors: [], thumbnail: null, previewLink: null }]
          });
        }

        return cold<ReadonlyArray<Book>>('--s|', {
          s: [{ id: 'b', title: 'Angular', authors: [], thumbnail: null, previewLink: null }]
        });
      };

      const results$ = buildSearchState(queries, search, { debounceMs: 0, minLength: 1 }).pipe(
        filter((state) => !state.loading && state.canSearch),
        map((state) => state.results[0].id)
      );

      expectObservable(results$).toBe('------s--|', { s: 'b' });
    });
  });
});
