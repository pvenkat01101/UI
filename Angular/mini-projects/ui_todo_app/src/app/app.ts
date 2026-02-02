import { Component } from '@angular/core';
import { CategoryPanelComponent } from './components/category-panel/category-panel.component';
import { TodoPanelComponent } from './components/todo-panel/todo-panel.component';

@Component({
  selector: 'app-root',
  imports: [CategoryPanelComponent, TodoPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Root component stays intentionally small.
  // It only arranges the layout and hosts child panels.
}
