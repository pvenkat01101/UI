import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BooksService } from './books.service';

describe('BooksService', () => {
  let httpMock: HttpTestingController;
  let service: BooksService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(BooksService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps Google Books response into a clean Book model', () => {
    service.searchBooks('harry').subscribe((books) => {
      expect(books.length).toBe(1);
      expect(books[0]).toEqual({
        id: '1',
        title: 'Harry Potter',
        authors: ['J. K. Rowling'],
        thumbnail: 'https://example.com/thumb.jpg',
        previewLink: 'https://example.com/preview'
      });
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === 'https://www.googleapis.com/books/v1/volumes' &&
        request.params.get('q') === 'harry'
    );

    req.flush({
      items: [
        {
          id: '1',
          volumeInfo: {
            title: 'Harry Potter',
            authors: ['J. K. Rowling'],
            imageLinks: { thumbnail: 'https://example.com/thumb.jpg' },
            previewLink: 'https://example.com/preview'
          }
        }
      ]
    });
  });
});
