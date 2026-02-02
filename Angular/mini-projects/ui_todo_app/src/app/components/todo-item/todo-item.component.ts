import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Category, Todo } from '../../models';
import { TODO_STORE, TodoStoreApi } from '../../store/todo-store.token';

@Component({
  selector: 'app-todo-item',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.scss',
})
export class TodoItemComponent {
  @Input({ required: true }) todo!: Todo;
  @Input({ required: true }) categories: Category[] = [];

  private readonly store: TodoStoreApi = inject(TODO_STORE);

  // We use a FormControl for inline editing to practice reactive forms.
  readonly editControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  isEditing(): boolean {
    return this.store.state().ui.editingTodoId === this.todo.id;
  }

  startEdit(): void {
    this.store.startEditing(this.todo.id);
    this.editControl.setValue(this.todo.title);
  }

  saveEdit(): void {
    if (this.editControl.invalid) return;
    this.store.editTodoTitle(this.todo.id, this.editControl.value);
  }

  cancelEdit(): void {
    this.store.cancelEditing();
    this.editControl.setValue(this.todo.title);
  }

  // Drag-and-drop uses the CDK directives in the template (cdkDrag + cdkDragHandle).

  toggleCompleted(): void {
    this.store.toggleTodo(this.todo.id);
  }

  deleteTodo(): void {
    this.store.deleteTodo(this.todo.id);
  }

  assignCategory(categoryId: string): void {
    this.store.assignCategory(this.todo.id, categoryId);
  }

  categoryName(categoryId: string): string {
    return this.categories.find((category) => category.id === categoryId)?.name ?? 'Unknown';
  }

  trackById(_: number, category: Category): string {
    return category.id;
  }
}
