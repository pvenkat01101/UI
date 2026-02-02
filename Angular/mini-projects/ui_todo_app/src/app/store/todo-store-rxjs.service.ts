import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, debounceTime, map, distinctUntilChanged, shareReplay } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppState, Category, FilterState, Todo, TodoCounts } from '../models';
import { TodoPersistenceService } from '../services/todo-persistence.service';
import { generateId } from '../utils/uuid';
import { SCHEMA_VERSION } from '../utils/storage';

const HISTORY_LIMIT = 50;
const UNCATEGORIZED_ID = 'uncategorized';

function createInitialState(): AppState {
  const now = Date.now();
  return {
    todos: [],
    categories: [
      {
        id: UNCATEGORIZED_ID,
        name: 'Uncategorized',
        createdAt: now,
        updatedAt: now,
      },
    ],
    filter: {
      status: 'all',
      categoryId: 'all',
      search: '',
    },
    ui: {
      editingTodoId: null,
    },
    meta: {
      schemaVersion: SCHEMA_VERSION,
    },
  };
}

function normalizeState(state: AppState): AppState {
  const now = Date.now();
  const categories = [...state.categories];
  const categoryIds = new Set(categories.map((category) => category.id));

  if (!categoryIds.has(UNCATEGORIZED_ID)) {
    categories.unshift({
      id: UNCATEGORIZED_ID,
      name: 'Uncategorized',
      createdAt: now,
      updatedAt: now,
    });
    categoryIds.add(UNCATEGORIZED_ID);
  }

  const todos = state.todos.map((todo) =>
    categoryIds.has(todo.categoryId)
      ? { ...todo }
      : { ...todo, categoryId: UNCATEGORIZED_ID, updatedAt: now }
  );

  const filterCategoryId =
    state.filter.categoryId !== 'all' && !categoryIds.has(state.filter.categoryId)
      ? 'all'
      : state.filter.categoryId;

  return {
    ...state,
    todos,
    categories,
    filter: {
      ...state.filter,
      categoryId: filterCategoryId,
    },
    ui: {
      editingTodoId: state.ui?.editingTodoId ?? null,
    },
    meta: {
      schemaVersion: SCHEMA_VERSION,
    },
  };
}

// This store uses the classic RxJS BehaviorSubject pattern.
// The app in this project uses the Signals store by default, but this service
// is a clean alternative for learners who want a purely Observable-based approach.
// Note: This class does NOT implement TodoStoreApi because its public API is Observable-based.
// It exists as a teaching reference for the RxJS pattern.
@Injectable({ providedIn: 'root' })
export class TodoStoreRxjsService {
  private readonly persistence = inject(TodoPersistenceService);
  private readonly saveQueue = new Subject<AppState>();

  private readonly past: AppState[] = [];
  private readonly future: AppState[] = [];
  private readonly present$ = new BehaviorSubject<AppState>(createInitialState());

  // Public streams (Observables)
  readonly state$ = this.present$.asObservable();

  readonly categories$ = this.state$.pipe(map((state) => state.categories), shareReplay(1));

  readonly filterState$ = this.state$.pipe(map((state) => state.filter), shareReplay(1));

  readonly categoryMap$ = this.categories$.pipe(
    map((categories) => new Map(categories.map((category) => [category.id, category] as const))),
    shareReplay(1)
  );

  readonly filteredTodos$ = this.state$.pipe(
    map((state) => {
      const search = state.filter.search.trim().toLowerCase();

      return state.todos.filter((todo) => {
        const matchesStatus =
          state.filter.status === 'all'
            ? true
            : state.filter.status === 'active'
              ? !todo.completed
              : todo.completed;

        const matchesCategory =
          state.filter.categoryId === 'all'
            ? true
            : todo.categoryId === state.filter.categoryId;

        const matchesSearch = search.length === 0 ? true : todo.title.toLowerCase().includes(search);

        return matchesStatus && matchesCategory && matchesSearch;
      });
    }),
    shareReplay(1)
  );

  readonly counts$ = this.state$.pipe(
    map((state) => {
      const total = state.todos.length;
      const completed = state.todos.filter((todo) => todo.completed).length;
      const counts: TodoCounts = {
        total,
        completed,
        active: total - completed,
      };
      return counts;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly canUndo$ = this.state$.pipe(map(() => this.past.length > 0), shareReplay(1));
  readonly canRedo$ = this.state$.pipe(map(() => this.future.length > 0), shareReplay(1));

  constructor() {
    const stored = this.persistence.load();
    if (stored) {
      this.present$.next(normalizeState(stored));
    }

    this.saveQueue
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((state) => this.persistence.save(state));

    this.state$.pipe(takeUntilDestroyed()).subscribe((state) => this.saveQueue.next(state));
  }

  addTodo(title: string, categoryId: string): void {
    const trimmed = title.trim();
    if (trimmed.length < 3) return;

    const now = Date.now();
    const todo: Todo = {
      id: generateId(),
      title: trimmed,
      completed: false,
      categoryId,
      createdAt: now,
      updatedAt: now,
    };

    const next = {
      ...this.present$.value,
      todos: [todo, ...this.present$.value.todos],
    };

    this.commit(next);
  }

  editTodoTitle(todoId: string, title: string): void {
    const trimmed = title.trim();
    if (trimmed.length < 3) return;

    const now = Date.now();
    const next = {
      ...this.present$.value,
      todos: this.present$.value.todos.map((todo) =>
        todo.id === todoId ? { ...todo, title: trimmed, updatedAt: now } : todo
      ),
      ui: { ...this.present$.value.ui, editingTodoId: null },
    };

    this.commit(next);
  }

  toggleTodo(todoId: string): void {
    const now = Date.now();
    const next = {
      ...this.present$.value,
      todos: this.present$.value.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed, updatedAt: now } : todo
      ),
    };

    this.commit(next);
  }

  deleteTodo(todoId: string): void {
    const next = {
      ...this.present$.value,
      todos: this.present$.value.todos.filter((todo) => todo.id !== todoId),
      ui: { ...this.present$.value.ui, editingTodoId: null },
    };

    this.commit(next);
  }

  assignCategory(todoId: string, categoryId: string): void {
    const now = Date.now();
    const next = {
      ...this.present$.value,
      todos: this.present$.value.todos.map((todo) =>
        todo.id === todoId ? { ...todo, categoryId, updatedAt: now } : todo
      ),
    };

    this.commit(next);
  }

  addCategory(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    const now = Date.now();
    const category: Category = {
      id: generateId(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };

    const next = {
      ...this.present$.value,
      categories: [...this.present$.value.categories, category],
    };

    this.commit(next);
  }

  renameCategory(categoryId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    const now = Date.now();
    const next = {
      ...this.present$.value,
      categories: this.present$.value.categories.map((category) =>
        category.id === categoryId ? { ...category, name: trimmed, updatedAt: now } : category
      ),
    };

    this.commit(next);
  }

  deleteCategory(categoryId: string): void {
    if (categoryId === UNCATEGORIZED_ID) return;

    const now = Date.now();
    const nextCategories = this.present$.value.categories.filter((category) => category.id !== categoryId);

    const nextTodos = this.present$.value.todos.map((todo) =>
      todo.categoryId === categoryId
        ? { ...todo, categoryId: UNCATEGORIZED_ID, updatedAt: now }
        : todo
    );

    const nextFilterCategoryId =
      this.present$.value.filter.categoryId === categoryId ? 'all' : this.present$.value.filter.categoryId;

    const next = {
      ...this.present$.value,
      categories: nextCategories,
      todos: nextTodos,
      filter: { ...this.present$.value.filter, categoryId: nextFilterCategoryId },
    };

    this.commit(next);
  }

  setFilterStatus(status: FilterState['status']): void {
    this.commit(
      {
        ...this.present$.value,
        filter: { ...this.present$.value.filter, status },
      },
      { recordHistory: false }
    );
  }

  setFilterCategory(categoryId: FilterState['categoryId']): void {
    this.commit(
      {
        ...this.present$.value,
        filter: { ...this.present$.value.filter, categoryId },
      },
      { recordHistory: false }
    );
  }

  setSearch(search: string): void {
    this.commit(
      {
        ...this.present$.value,
        filter: { ...this.present$.value.filter, search },
      },
      { recordHistory: false }
    );
  }

  startEditing(todoId: string): void {
    this.commit(
      {
        ...this.present$.value,
        ui: { ...this.present$.value.ui, editingTodoId: todoId },
      },
      { recordHistory: false }
    );
  }

  cancelEditing(): void {
    this.commit(
      {
        ...this.present$.value,
        ui: { ...this.present$.value.ui, editingTodoId: null },
      },
      { recordHistory: false }
    );
  }

  reorderTodos(visibleIds: string[], previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;

    const nextVisibleIds = [...visibleIds];
    const [moved] = nextVisibleIds.splice(previousIndex, 1);
    nextVisibleIds.splice(currentIndex, 0, moved);

    const currentTodos = this.present$.value.todos;
    const visibleSet = new Set(nextVisibleIds);
    const visiblePositions: number[] = [];
    const todoMap = new Map(currentTodos.map((todo) => [todo.id, todo] as const));

    currentTodos.forEach((todo, index) => {
      if (visibleSet.has(todo.id)) {
        visiblePositions.push(index);
      }
    });

    const nextTodos = [...currentTodos];
    visiblePositions.forEach((position, index) => {
      const todoId = nextVisibleIds[index];
      const todo = todoMap.get(todoId);
      if (todo) {
        nextTodos[position] = todo;
      }
    });

    this.commit({ ...this.present$.value, todos: nextTodos });
  }

  undo(): void {
    if (this.past.length === 0) return;
    const previous = this.past.pop();
    if (!previous) return;
    this.future.unshift(this.present$.value);
    this.present$.next(previous);
  }

  redo(): void {
    if (this.future.length === 0) return;
    const next = this.future.shift();
    if (!next) return;
    this.past.push(this.present$.value);
    this.present$.next(next);
  }

  resetAll(): void {
    this.persistence.clear();
    this.past.length = 0;
    this.future.length = 0;
    this.present$.next(createInitialState());
  }

  private commit(next: AppState, options: { recordHistory?: boolean } = {}): void {
    const recordHistory = options.recordHistory ?? true;
    const normalized = normalizeState(next);

    if (recordHistory) {
      this.past.push(this.present$.value);
      if (this.past.length > HISTORY_LIMIT) {
        this.past.shift();
      }
      this.future.length = 0;
    }

    this.present$.next(normalized);
  }
}
