import {
  Injectable,
  Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppState, Category, FilterState, Todo, TodoCounts } from '../models';
import { TodoStoreApi } from './todo-store.token';
import { TodoPersistenceService } from '../services/todo-persistence.service';
import { generateId } from '../utils/uuid';
import { SCHEMA_VERSION } from '../utils/storage';

const HISTORY_LIMIT = 50;
const UNCATEGORIZED_ID = 'uncategorized';

// Helper to build the first state of the app.
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

// Normalize state so missing data does not break the UI.
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

@Injectable({ providedIn: 'root' })
export class TodoStoreSignalsService implements TodoStoreApi {
  private readonly persistence = inject(TodoPersistenceService);
  private readonly saveQueue = new Subject<AppState>();

  // History stacks for undo/redo.
  // past -> present -> future is a common time-travel pattern.
  private readonly past = signal<AppState[]>([]);
  private readonly present = signal<AppState>(createInitialState());
  private readonly future = signal<AppState[]>([]);

  // Public signals for the UI.
  readonly state: Signal<AppState> = computed(() => this.present());
  readonly categories: Signal<Category[]> = computed(() => this.present().categories);
  readonly filterState: Signal<FilterState> = computed(() => this.present().filter);

  // categoryMap makes lookups fast and avoids repeated loops in templates.
  readonly categoryMap: Signal<Map<string, Category>> = computed(() => {
    const map = new Map<string, Category>();
    for (const category of this.present().categories) {
      map.set(category.id, category);
    }
    return map;
  });

  // filteredTodos is a derived view. We never mutate the array in-place.
  readonly filteredTodos: Signal<Todo[]> = computed(() => {
    const { todos, filter } = this.present();
    const search = filter.search.trim().toLowerCase();

    return todos.filter((todo) => {
      const matchesStatus =
        filter.status === 'all'
          ? true
          : filter.status === 'active'
            ? !todo.completed
            : todo.completed;

      const matchesCategory =
        filter.categoryId === 'all' ? true : todo.categoryId === filter.categoryId;

      const matchesSearch = search.length === 0 ? true : todo.title.toLowerCase().includes(search);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  });

  // counts help the UI show totals without recalculating everywhere.
  readonly counts: Signal<TodoCounts> = computed(() => {
    const todos = this.present().todos;
    const total = todos.length;
    const completed = todos.filter((todo) => todo.completed).length;
    return {
      total,
      completed,
      active: total - completed,
    };
  });

  readonly activeCategoryName: Signal<string> = computed(() => {
    const { categoryId } = this.present().filter;
    if (categoryId === 'all') return 'All categories';
    return this.categoryMap().get(categoryId)?.name ?? 'Unknown category';
  });

  readonly canUndo: Signal<boolean> = computed(() => this.past().length > 0);
  readonly canRedo: Signal<boolean> = computed(() => this.future().length > 0);

  constructor() {
    const stored = this.persistence.load();
    if (stored) {
      this.present.set(normalizeState(stored));
    }

    // Debounced persistence: we buffer rapid changes and save once.
    // This reduces localStorage writes when users type quickly.
    this.saveQueue
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((state) => this.persistence.save(state));

    // Whenever the present state changes, queue a save.
    effect(() => {
      this.saveQueue.next(this.present());
    });
  }

  // --- Commands ---

  addTodo(title: string, categoryId: string): void {
    const trimmed = title.trim();
    if (trimmed.length < 3) return; // Form validation should catch this too.

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
      ...this.present(),
      todos: [todo, ...this.present().todos],
    };

    this.commit(next);
  }

  editTodoTitle(todoId: string, title: string): void {
    const trimmed = title.trim();
    if (trimmed.length < 3) return;

    const now = Date.now();
    const next = {
      ...this.present(),
      todos: this.present().todos.map((todo) =>
        todo.id === todoId ? { ...todo, title: trimmed, updatedAt: now } : todo
      ),
      ui: {
        ...this.present().ui,
        editingTodoId: null,
      },
    };

    this.commit(next);
  }

  toggleTodo(todoId: string): void {
    const now = Date.now();
    const next = {
      ...this.present(),
      todos: this.present().todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed, updatedAt: now } : todo
      ),
    };

    this.commit(next);
  }

  deleteTodo(todoId: string): void {
    const next = {
      ...this.present(),
      todos: this.present().todos.filter((todo) => todo.id !== todoId),
      ui: {
        ...this.present().ui,
        editingTodoId: null,
      },
    };

    this.commit(next);
  }

  assignCategory(todoId: string, categoryId: string): void {
    const now = Date.now();
    const next = {
      ...this.present(),
      todos: this.present().todos.map((todo) =>
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
      ...this.present(),
      categories: [...this.present().categories, category],
    };

    this.commit(next);
  }

  renameCategory(categoryId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    const now = Date.now();
    const next = {
      ...this.present(),
      categories: this.present().categories.map((category) =>
        category.id === categoryId ? { ...category, name: trimmed, updatedAt: now } : category
      ),
    };

    this.commit(next);
  }

  deleteCategory(categoryId: string): void {
    if (categoryId === UNCATEGORIZED_ID) return; // Never delete the fallback category.

    const now = Date.now();
    const nextCategories = this.present().categories.filter((category) => category.id !== categoryId);

    const nextTodos = this.present().todos.map((todo) =>
      todo.categoryId === categoryId
        ? { ...todo, categoryId: UNCATEGORIZED_ID, updatedAt: now }
        : todo
    );

    const nextFilterCategoryId =
      this.present().filter.categoryId === categoryId ? 'all' : this.present().filter.categoryId;

    const next = {
      ...this.present(),
      categories: nextCategories,
      todos: nextTodos,
      filter: {
        ...this.present().filter,
        categoryId: nextFilterCategoryId,
      },
    };

    this.commit(next);
  }

  // Filter and search are UI-focused. We do not push them into history.
  setFilterStatus(status: FilterState['status']): void {
    this.commit(
      {
        ...this.present(),
        filter: { ...this.present().filter, status },
      },
      { recordHistory: false }
    );
  }

  setFilterCategory(categoryId: FilterState['categoryId']): void {
    this.commit(
      {
        ...this.present(),
        filter: { ...this.present().filter, categoryId },
      },
      { recordHistory: false }
    );
  }

  setSearch(search: string): void {
    this.commit(
      {
        ...this.present(),
        filter: { ...this.present().filter, search },
      },
      { recordHistory: false }
    );
  }

  startEditing(todoId: string): void {
    this.commit(
      {
        ...this.present(),
        ui: { ...this.present().ui, editingTodoId: todoId },
      },
      { recordHistory: false }
    );
  }

  cancelEditing(): void {
    this.commit(
      {
        ...this.present(),
        ui: { ...this.present().ui, editingTodoId: null },
      },
      { recordHistory: false }
    );
  }

  reorderTodos(visibleIds: string[], previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;

    // Step 1: reorder only the visible ids.
    const nextVisibleIds = [...visibleIds];
    const [moved] = nextVisibleIds.splice(previousIndex, 1);
    nextVisibleIds.splice(currentIndex, 0, moved);

    // Step 2: map back to the full list.
    // We keep non-visible todos exactly where they were so filters do not scramble data.
    const currentTodos = this.present().todos;
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

    this.commit({ ...this.present(), todos: nextTodos });
  }

  // Undo moves the current state into the future stack and restores the last past state.
  undo(): void {
    const past = this.past();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    this.future.set([this.present(), ...this.future()]);
    this.past.set(newPast);
    this.present.set(previous);
  }

  // Redo moves the next future state back into the present.
  redo(): void {
    const future = this.future();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    this.past.set([...this.past(), this.present()]);
    this.future.set(newFuture);
    this.present.set(next);
  }

  resetAll(): void {
    this.persistence.clear();
    this.past.set([]);
    this.future.set([]);
    this.present.set(createInitialState());
  }

  // Commit helper handles history and immutability.
  // "Immutability" means we create new objects/arrays instead of editing existing ones.
  // This makes change detection predictable and helps undo/redo work correctly.
  private commit(next: AppState, options: { recordHistory?: boolean } = {}): void {
    const recordHistory = options.recordHistory ?? true;

    const normalized = normalizeState(next);

    if (recordHistory) {
      const nextPast = [...this.past(), this.present()];
      if (nextPast.length > HISTORY_LIMIT) {
        nextPast.shift();
      }

      this.past.set(nextPast);
      this.future.set([]);
    }

    this.present.set(normalized);
  }
}
