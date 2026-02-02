import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { fromEvent, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Category, Todo } from '../../models';
import { TODO_STORE, TodoStoreApi } from '../../store/todo-store.token';
import { TodoItemComponent } from '../todo-item/todo-item.component';

const UNCATEGORIZED_ID = 'uncategorized';

@Component({
  selector: 'app-todo-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule, TodoItemComponent],
  templateUrl: './todo-panel.component.html',
  styleUrl: './todo-panel.component.scss',
})
export class TodoPanelComponent {
  readonly store: TodoStoreApi = inject(TODO_STORE);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  // Typed reactive form for adding todos.
  readonly addTodoForm = new FormGroup<{
    title: FormControl<string>;
    categoryId: FormControl<string>;
  }>({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    categoryId: new FormControl(UNCATEGORIZED_ID, { nonNullable: true }),
  });

  // Search is also a FormControl so we can debounce updates.
  readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    // Sync search input with store filter state.
    effect(() => {
      const currentSearch = this.store.filterState().search;
      if (this.searchControl.value !== currentSearch) {
        this.searchControl.setValue(currentSearch, { emitEvent: false });
      }
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.store.setSearch(value));

    // Keyboard shortcuts are global. We listen on document and clean up automatically.
    if (typeof document !== 'undefined') {
      fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => this.handleKeyboard(event));
    }
  }

  addTodo(): void {
    if (this.addTodoForm.invalid) return;

    const { title, categoryId } = this.addTodoForm.getRawValue();
    this.store.addTodo(title, categoryId);

    // Reset only the title so users can keep the same category.
    this.addTodoForm.controls.title.reset('');
  }

  setStatusFilter(status: 'all' | 'active' | 'completed'): void {
    this.store.setFilterStatus(status);
  }

  onDrop(event: CdkDragDrop<Todo[]>): void {
    // CDK gives indexes based on the filtered (visible) list.
    // We pass the visible ids so the store can safely map the move back to the full list.
    const visibleIds = this.store.filteredTodos().map((todo) => todo.id);
    this.store.reorderTodos(visibleIds, event.previousIndex, event.currentIndex);
  }

  resetApp(): void {
    const confirmed = window.confirm('Reset the app? This clears all local data.');
    if (confirmed) {
      this.store.resetAll();
    }
  }

  focusSearch(): void {
    this.searchInput?.nativeElement.focus();
  }

  handleKeyboard(event: KeyboardEvent): void {
    // We support both Ctrl (Windows/Linux) and Cmd (Mac).
    // This keeps shortcuts consistent across platforms.
    const isCommand = event.metaKey; // Mac uses Command (meta key).
    const isControl = event.ctrlKey; // Windows/Linux uses Control.
    const hasModifier = isCommand || isControl;
    const key = event.key.toLowerCase();

    if (hasModifier && key === 'z' && event.shiftKey) {
      event.preventDefault();
      this.store.redo();
      return;
    }

    if (hasModifier && key === 'z') {
      event.preventDefault();
      this.store.undo();
      return;
    }

    if (hasModifier && key === 'y') {
      event.preventDefault();
      this.store.redo();
      return;
    }

    if (hasModifier && key === 'k') {
      event.preventDefault();
      this.focusSearch();
      return;
    }

    if (event.key === 'Escape') {
      this.store.cancelEditing();
    }
  }

  trackById(_: number, todo: Todo): string {
    return todo.id;
  }

  trackByCategoryId(_: number, category: Category): string {
    return category.id;
  }
}
