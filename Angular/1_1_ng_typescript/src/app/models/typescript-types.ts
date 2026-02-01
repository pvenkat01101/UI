// ============================================================
// SHARED TYPE DEFINITIONS FOR TYPESCRIPT DEEP DIVE PROJECT
// These types are used across all components to demonstrate
// TypeScript concepts in a real Angular application context
// ============================================================

// --- Basic Domain Models ---

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  tags: string[];
}

export interface AppConfig {
  theme: 'light' | 'dark';
  language: string;
  features: Record<string, boolean>;
  apiUrl: string;
  maxRetries: number;
}

// --- Advanced Types Demo Models ---

// Discriminated Unions (used in advanced-types component)
export type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; error: string; code: number };

// Intersection Types
export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt?: string;
}

export type AuditableUser = User & Timestamped & SoftDeletable;

// Conditional Types
export type ApiEndpoint<T> =
  T extends User ? '/api/typescript/users' :
  T extends Product ? '/api/typescript/products' :
  T extends AppConfig ? '/api/typescript/config' :
  never;

export type ExtractArrayType<T> = T extends Array<infer U> ? U : T;

// Template Literal Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ApiPath = `/api/typescript/${string}`;
export type ApiRequest = `${HttpMethod} ${ApiPath}`;

// --- Generics Demo Models ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface SearchResult<T> {
  items: T[];
  query: string;
  totalMatches: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// --- Type Guard Demo Models ---

export interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
  adminLevel: number;
}

export interface EditorUser extends User {
  role: 'editor';
  publications: string[];
}

export interface ViewerUser extends User {
  role: 'viewer';
  lastViewed: string;
}

// Notification types for discriminated union demo
export type Notification =
  | { type: 'email'; to: string; subject: string; body: string }
  | { type: 'sms'; phoneNumber: string; message: string }
  | { type: 'push'; deviceToken: string; title: string; payload: Record<string, unknown> };

// Shape types for instanceof demo
export class Circle {
  constructor(public radius: number) {}
  area(): number { return Math.PI * this.radius ** 2; }
}

export class Rectangle {
  constructor(public width: number, public height: number) {}
  area(): number { return this.width * this.height; }
}

export class Triangle {
  constructor(public base: number, public height: number) {}
  area(): number { return 0.5 * this.base * this.height; }
}

export type Shape = Circle | Rectangle | Triangle;
