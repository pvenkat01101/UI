// Models are plain TypeScript interfaces. They describe the shape of our data
// without adding behavior. This keeps data easy to serialize (e.g., to JSON).

export interface Todo {
  id: string; // Unique identifier (uuid)
  title: string;
  completed: boolean;
  categoryId: string; // Category that owns this todo
  createdAt: number; // Unix timestamp (milliseconds)
  updatedAt: number; // Unix timestamp (milliseconds)
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export type FilterStatus = 'all' | 'active' | 'completed';

export interface FilterState {
  status: FilterStatus;
  categoryId: string | 'all';
  search: string;
}

export interface UiState {
  // UI-only state lives here so it does not pollute domain data.
  editingTodoId: string | null;
}

export interface MetaState {
  // Meta data is useful for migrations and debugging.
  schemaVersion: number;
}

export interface AppState {
  todos: Todo[];
  categories: Category[];
  filter: FilterState;
  ui: UiState;
  meta: MetaState;
}

export interface TodoCounts {
  total: number;
  active: number;
  completed: number;
}
