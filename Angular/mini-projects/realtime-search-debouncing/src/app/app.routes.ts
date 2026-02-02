import { Routes } from '@angular/router';
import { OpenLibrarySearchComponent } from './openlibrary/openlibrary-search.component';
import { BookSearchComponent } from './books/book-search.component';

export const routes: Routes = [
  { path: '', redirectTo: 'openlibrary', pathMatch: 'full' },
  { path: 'openlibrary', component: OpenLibrarySearchComponent },
    { path: 'books', component: BookSearchComponent },
  { path: '**', redirectTo: 'openlibrary' }
];
