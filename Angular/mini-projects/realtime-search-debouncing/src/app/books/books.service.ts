import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Book, GoogleBooksResponse } from './models';

@Injectable({ providedIn: 'root' })
export class BooksService {
  // HttpClient is injected via Angular DI.
  // Internally, HttpClient returns a cold Observable: nothing happens
  // until something subscribes (e.g. the async pipe in the component).
  // Unsubscribing cancels the in-flight HTTP request.
  private readonly http = inject(HttpClient);

  // Keeping the base URL in one place makes the service easy to test
  // and avoids scattering string literals across the codebase.
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';

  searchBooks(query: string): Observable<Book[]> {
    // HttpParams automatically URL-encodes the query string.
    // Other ways:
    // - build the URL manually (risking encoding bugs),
    // - use a typed client wrapper,
    // - add optional params like "maxResults", "langRestrict", etc.
    const params = new HttpParams().set('q', query);

    return this.http.get<GoogleBooksResponse>(this.baseUrl, { params }).pipe(
      // Map the API shape into a clean view model.
      // Internally, this keeps the UI decoupled from the raw API response,
      // so API changes do not leak into templates.
      map((response) =>
        (response.items ?? []).map((item) => ({
          id: item.id,
          title: item.volumeInfo?.title ?? 'Untitled',
          authors: item.volumeInfo?.authors ?? [],
          thumbnail:
            item.volumeInfo?.imageLinks?.thumbnail ??
            item.volumeInfo?.imageLinks?.smallThumbnail ??
            null,
          previewLink: item.volumeInfo?.previewLink ?? null
        }))
      )
    );
  }
}

// References:
// - Angular HttpClient (cold Observables and cancellation): https://angular.dev/guide/http/making-requests
// - Google Books API volumes list (query parameter q): https://developers.google.com/books/docs/v1/reference/volumes/list
