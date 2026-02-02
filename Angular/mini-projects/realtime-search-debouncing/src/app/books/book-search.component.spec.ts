import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BookSearchComponent, DEFAULT_DEBOUNCE_MS } from './book-search.component';
import { SearchViewModel } from './book-search.component';

describe('BookSearchComponent', () => {
  let fixture: ComponentFixture<BookSearchComponent>;
  let component: BookSearchComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(BookSearchComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debounces input before firing the API request', fakeAsync(() => {
    component.searchControl.setValue('ha');
    tick(DEFAULT_DEBOUNCE_MS - 1);

    httpMock.expectNone((request) => request.url.includes('volumes'));

    tick(1);
    const req = httpMock.expectOne(
      (request) => request.url.includes('volumes') && request.params.get('q') === 'ha'
    );
    req.flush({ items: [] });
  }));

  it('does not call the API until the minimum query length is met', fakeAsync(() => {
    component.searchControl.setValue('a');
    tick(DEFAULT_DEBOUNCE_MS);

    httpMock.expectNone((request) => request.url.includes('volumes'));
  }));

  it('toggles loading state during a search request', fakeAsync(() => {
    let latest: SearchViewModel | undefined;
    const sub = component.vm$.subscribe((vm) => (latest = vm));

    component.searchControl.setValue('harry');
    tick(DEFAULT_DEBOUNCE_MS);
    expect(latest?.loading).toBeTrue();

    const req = httpMock.expectOne(
      (request) => request.url.includes('volumes') && request.params.get('q') === 'harry'
    );
    req.flush({ items: [] });

    expect(latest?.loading).toBeFalse();
    sub.unsubscribe();
  }));

  it('sets an error state and recovers on the next valid query', fakeAsync(() => {
    let latest: SearchViewModel | undefined;
    const sub = component.vm$.subscribe((vm) => (latest = vm));

    component.searchControl.setValue('error');
    tick(DEFAULT_DEBOUNCE_MS);

    const req = httpMock.expectOne(
      (request) => request.url.includes('volumes') && request.params.get('q') === 'error'
    );
    req.flush('fail', { status: 500, statusText: 'Server Error' });

    expect(latest?.error).toContain('temporary');

    component.searchControl.setValue('angular');
    tick(DEFAULT_DEBOUNCE_MS);

    const req2 = httpMock.expectOne(
      (request) => request.url.includes('volumes') && request.params.get('q') === 'angular'
    );
    req2.flush({
      items: [
        {
          id: '1',
          volumeInfo: {
            title: 'Angular',
            authors: ['Someone'],
            imageLinks: { thumbnail: 'https://example.com/a.jpg' }
          }
        }
      ]
    });

    expect(latest?.error).toBeNull();
    expect(latest?.results.length).toBe(1);
    sub.unsubscribe();
  }));
});
