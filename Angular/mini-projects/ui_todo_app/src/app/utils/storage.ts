import { AppState } from '../models';

export const STORAGE_KEY = 'advanced-todo-app';
export const SCHEMA_VERSION = 1;

// Safe JSON parse helper. It returns null if parsing fails.
export function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Very small runtime validation. We check only the fields we depend on.
// This keeps it beginner-friendly while avoiding crashes on bad data.
export function isValidState(candidate: unknown): candidate is AppState {
  if (!candidate || typeof candidate !== 'object') return false;
  const state = candidate as AppState;

  const hasArray = (value: unknown) => Array.isArray(value);
  const hasString = (value: unknown) => typeof value === 'string';
  const hasNumber = (value: unknown) => typeof value === 'number' && !Number.isNaN(value);

  if (!hasArray(state.todos) || !hasArray(state.categories)) return false;
  if (!state.filter || !state.ui || !state.meta) return false;
  if (!hasNumber(state.meta.schemaVersion)) return false;

  if (!hasString(state.filter.status) || !hasString(state.filter.categoryId) || !hasString(state.filter.search)) {
    return false;
  }

  // Basic shape checks for todos and categories.
  for (const todo of state.todos) {
    if (
      !todo ||
      !hasString(todo.id) ||
      !hasString(todo.title) ||
      typeof todo.completed !== 'boolean' ||
      !hasString(todo.categoryId) ||
      !hasNumber(todo.createdAt) ||
      !hasNumber(todo.updatedAt)
    ) {
      return false;
    }
  }

  for (const category of state.categories) {
    if (
      !category ||
      !hasString(category.id) ||
      !hasString(category.name) ||
      !hasNumber(category.createdAt) ||
      !hasNumber(category.updatedAt)
    ) {
      return false;
    }
  }

  return true;
}

export function readStateFromStorage(): AppState | null {
  const parsed = safeParse<AppState>(localStorage.getItem(STORAGE_KEY));
  if (!parsed) return null;
  if (!isValidState(parsed)) return null;
  if (parsed.meta.schemaVersion !== SCHEMA_VERSION) return null;
  return parsed;
}

export function writeStateToStorage(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Swallow errors so the app keeps working even if storage is full/blocked.
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same safety approach as above.
  }
}
