import { CommonModule } from '@angular/common';
import { Component, Signal, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../models';
import { TODO_STORE, TodoStoreApi } from '../../store/todo-store.token';

const UNCATEGORIZED_ID = 'uncategorized';

@Component({
  selector: 'app-category-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-panel.component.html',
  styleUrl: './category-panel.component.scss',
})
export class CategoryPanelComponent {
  readonly store: TodoStoreApi = inject(TODO_STORE);

  readonly categories = this.store.categories;
  readonly filterState = this.store.filterState;

  // Derived data: counts per category.
  readonly categoryCounts: Signal<Map<string, number>> = computed(() => {
    const counts = new Map<string, number>();
    for (const todo of this.store.state().todos) {
      counts.set(todo.categoryId, (counts.get(todo.categoryId) ?? 0) + 1);
    }
    return counts;
  });

  // Reactive form keeps validation in one place and is easy to test.
  readonly addCategoryForm = new FormGroup<{ name: FormControl<string> }>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Local UI state for renaming categories.
  readonly editingCategoryId = signal<string | null>(null);
  readonly renameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  selectCategory(categoryId: string | 'all'): void {
    this.store.setFilterCategory(categoryId);
  }

  addCategory(): void {
    if (this.addCategoryForm.invalid) return;
    const name = this.addCategoryForm.controls.name.value;
    this.store.addCategory(name);
    this.addCategoryForm.reset({ name: '' });
  }

  startRename(category: Category): void {
    this.editingCategoryId.set(category.id);
    this.renameControl.setValue(category.name);
  }

  saveRename(categoryId: string): void {
    if (this.renameControl.invalid) return;
    this.store.renameCategory(categoryId, this.renameControl.value);
    this.cancelRename();
  }

  cancelRename(): void {
    this.editingCategoryId.set(null);
    this.renameControl.setValue('');
  }

  deleteCategory(category: Category): void {
    if (category.id === UNCATEGORIZED_ID) return;
    const confirmed = window.confirm(`Delete "${category.name}"? Todos will move to Uncategorized.`);
    if (confirmed) {
      this.store.deleteCategory(category.id);
    }
  }

  trackById(_: number, item: Category): string {
    return item.id;
  }

  isUncategorized(categoryId: string): boolean {
    return categoryId === UNCATEGORIZED_ID;
  }
}
