import { InjectionToken, Signal } from '@angular/core';
import { AppState, Category, FilterState, Todo, TodoCounts } from '../models';

// This interface describes the API that components expect from the store.
// We use an InjectionToken because Angular cannot inject an interface directly.
export interface TodoStoreApi {
  // Signals are reactive values. Call them like functions to read the latest value.
  state: Signal<AppState>;
  filteredTodos: Signal<Todo[]>;
  categories: Signal<Category[]>;
  categoryMap: Signal<Map<string, Category>>;
  filterState: Signal<FilterState>;
  counts: Signal<TodoCounts>;
  activeCategoryName: Signal<string>;
  canUndo: Signal<boolean>;
  canRedo: Signal<boolean>;

  // Commands (actions)
  // ?? How and where these actions are used?


  addTodo(title: string, categoryId: string): void;
  editTodoTitle(todoId: string, title: string): void;
  toggleTodo(todoId: string): void;
  deleteTodo(todoId: string): void;
  assignCategory(todoId: string, categoryId: string): void;

  addCategory(name: string): void;
  renameCategory(categoryId: string, name: string): void;
  deleteCategory(categoryId: string): void;

  setFilterStatus(status: FilterState['status']): void;
  setFilterCategory(categoryId: FilterState['categoryId']): void;
  setSearch(search: string): void;

  startEditing(todoId: string): void;
  cancelEditing(): void;

  reorderTodos(visibleIds: string[], previousIndex: number, currentIndex: number): void;

  undo(): void;
  redo(): void;
  resetAll(): void;
}

export const TODO_STORE = new InjectionToken<TodoStoreApi>('TODO_STORE');
