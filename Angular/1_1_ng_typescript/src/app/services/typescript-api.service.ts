import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import {
  User,
  Product,
  AppConfig,
  ValidationResult,
  PaginatedResponse,
  SearchResult,
} from '../models/typescript-types';

/**
 * TypeScript API Service
 * Calls localhost:8080 backend. Falls back to mock data if backend is unavailable.
 * Update mock data in mock-responses.json with actual backend responses.
 */
@Injectable({ providedIn: 'root' })
export class TypescriptApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/typescript';

  // --- Mock Data (fallback when backend is not running) ---

  private readonly mockUsers: User[] = [
    { id: 1, name: 'Alice Admin', email: 'alice@example.com', role: 'admin', isActive: true, metadata: { department: 'Engineering' } },
    { id: 2, name: 'Bob Editor', email: 'bob@example.com', role: 'editor', isActive: true, metadata: { publications: 15 } },
    { id: 3, name: 'Charlie Viewer', email: 'charlie@example.com', role: 'viewer', isActive: false, metadata: {} },
    { id: 4, name: 'Diana Admin', email: 'diana@example.com', role: 'admin', isActive: true, metadata: { department: 'Product' } },
    { id: 5, name: 'Eve Editor', email: 'eve@example.com', role: 'editor', isActive: true, metadata: { publications: 8 } },
  ];

  private readonly mockProducts: Product[] = [
    { id: 1, name: 'TypeScript Handbook', price: 29.99, category: 'books', inStock: true, tags: ['typescript', 'programming'] },
    { id: 2, name: 'Angular DevKit', price: 49.99, category: 'tools', inStock: true, tags: ['angular', 'development'] },
    { id: 3, name: 'RxJS Masterclass', price: 39.99, category: 'courses', inStock: false, tags: ['rxjs', 'reactive'] },
    { id: 4, name: 'VS Code Extension Pack', price: 0, category: 'tools', inStock: true, tags: ['vscode', 'extension'] },
  ];

  private readonly mockConfig: AppConfig = {
    theme: 'dark',
    language: 'en',
    features: { darkMode: true, notifications: true, analytics: false, betaFeatures: false },
    apiUrl: 'http://localhost:8080',
    maxRetries: 3,
  };

  // --- API Methods ---

  /** GET /api/typescript/users → User[] */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`).pipe(
      catchError(() => of(this.mockUsers))
    );
  }

  /** GET /api/typescript/users/:id → User */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`).pipe(
      catchError(() => of(this.mockUsers.find(u => u.id === id) ?? this.mockUsers[0]))
    );
  }

  /** PATCH /api/typescript/users/:id → User (Partial update) */
  updateUser(id: number, updates: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${id}`, updates).pipe(
      catchError(() => {
        const user = this.mockUsers.find(u => u.id === id);
        return of({ ...(user ?? this.mockUsers[0]), ...updates } as User);
      })
    );
  }

  /** GET /api/typescript/products → Product[] */
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`).pipe(
      catchError(() => of(this.mockProducts))
    );
  }

  /** POST /api/typescript/validate → ValidationResult */
  validate(data: { field: string; value: unknown }): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.baseUrl}/validate`, data).pipe(
      catchError(() => of({
        isValid: typeof data.value === 'string' && data.value.includes('@'),
        errors: typeof data.value === 'string' && data.value.includes('@')
          ? []
          : [{ field: data.field, message: `Invalid ${data.field} format`, code: 'INVALID_FORMAT' }],
      }))
    );
  }

  /** GET /api/typescript/config → AppConfig */
  getConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>(`${this.baseUrl}/config`).pipe(
      catchError(() => of(this.mockConfig))
    );
  }

  /** GET /api/typescript/search?q=term → SearchResult<Product> */
  searchProducts(query: string): Observable<SearchResult<Product>> {
    return this.http.get<SearchResult<Product>>(`${this.baseUrl}/search`, { params: { q: query } }).pipe(
      catchError(() => {
        const items = this.mockProducts.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
        );
        return of({ items, query, totalMatches: items.length });
      })
    );
  }

  /** GET /api/typescript/users/paginated?page=&pageSize= → PaginatedResponse<User> */
  getUsersPaginated(page: number, pageSize: number): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(`${this.baseUrl}/users/paginated`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    }).pipe(
      catchError(() => {
        const start = (page - 1) * pageSize;
        const data = this.mockUsers.slice(start, start + pageSize);
        return of({
          data,
          total: this.mockUsers.length,
          page,
          pageSize,
          hasNext: start + pageSize < this.mockUsers.length,
        });
      })
    );
  }
}
