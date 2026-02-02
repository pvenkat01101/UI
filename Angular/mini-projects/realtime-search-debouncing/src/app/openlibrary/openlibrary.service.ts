import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OpenLibraryBook, OpenLibrarySearchResponse } from './models';

@Injectable({ providedIn: 'root' })
export class OpenLibraryService {
  // HttpClient is a cold Observable source: request starts on subscribe.
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://openlibrary.org/search.json';

  searchBooks(query: string): Observable<OpenLibraryBook[]> {
    // Open Library uses `q` as the search query param.
    const params = new HttpParams().set('q', query);

    return this.http.get<OpenLibrarySearchResponse>(this.baseUrl, { params }).pipe(
      // Map raw API docs into a UI-friendly model.
      map((response) =>
        (response.docs ?? []).map((doc) => ({
          key: doc.key,
          title: doc.title ?? 'Untitled',
          authors: doc.author_name ?? [],
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          firstPublishYear: doc.first_publish_year ?? null
        }))
      )
    );
  }
}

// References:
// - Open Library Search API: https://openlibrary.org/dev/docs/api/search
// - Open Library Covers API: https://openlibrary.org/dev/docs/api/covers
// - Angular HttpClient: https://angular.dev/guide/http/making-requests
