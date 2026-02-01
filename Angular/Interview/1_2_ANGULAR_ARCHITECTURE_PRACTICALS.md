# Angular Architecture & Core Concepts — Practical Exercises

> **Phase 1, Topic 2** of the Angular Preparation Roadmap
> Hands-on exercises from beginner to expert, designed to be implemented in the `1_2_ng_core` project
> Angular 21 / Standalone / Signals

---

## Table of Contents

1. [Exercise 1: Bootstrap Deep Dive — Custom Initialization](#exercise-1-bootstrap-deep-dive)
2. [Exercise 2: Standalone vs NgModule Migration](#exercise-2-standalone-vs-ngmodule)
3. [Exercise 3: Lifecycle Hook Explorer](#exercise-3-lifecycle-hook-explorer)
4. [Exercise 4: View Encapsulation Lab](#exercise-4-view-encapsulation-lab)
5. [Exercise 5: Component Communication Dashboard](#exercise-5-component-communication-dashboard)
6. [Exercise 6: Template Syntax Playground](#exercise-6-template-syntax-playground)
7. [Exercise 7: Advanced — Defer Block Performance Optimizer](#exercise-7-defer-block-performance-optimizer)
8. [Exercise 8: Expert — Build a Mini Component Library](#exercise-8-mini-component-library)

---

## Exercise 1: Bootstrap Deep Dive

### Objective
Understand and customize the Angular bootstrap process.

### Level: Beginner

### Task 1.1: Trace the Bootstrap
Add console.log statements to trace the entire startup sequence.

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

console.log('1. main.ts executing');

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    console.log('5. Application bootstrapped successfully');
    console.log('Component count:', appRef.components.length);
    console.log('Root component:', appRef.components[0].componentType.name);
  })
  .catch((err) => console.error('Bootstrap failed:', err));
```

```typescript
// app.config.ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

function initializeApp(): () => Promise<void> {
  return () => {
    console.log('3. APP_INITIALIZER running');
    return new Promise((resolve) => {
      // Simulate loading config from server
      setTimeout(() => {
        console.log('4. APP_INITIALIZER complete');
        resolve();
      }, 1000);
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },
  ],
};
```

```typescript
// app.ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<h1>App Loaded</h1><router-outlet />`,
})
export class App {
  constructor() {
    console.log('2. App component constructor');
  }
}
```

### Task 1.2: Multiple APP_INITIALIZER

Create a practical scenario with multiple initializers that run in parallel:

```typescript
// services/config.service.ts
import { Injectable, signal } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  features: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly _config = signal<AppConfig | null>(null);
  readonly config = this._config.asReadonly();

  loadConfig(): Promise<void> {
    // In real app, this would be an HTTP call
    return new Promise((resolve) => {
      setTimeout(() => {
        this._config.set({
          apiUrl: 'https://api.example.com',
          features: { darkMode: true, betaFeatures: false },
        });
        console.log('Config loaded');
        resolve();
      }, 500);
    });
  }
}

// services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  checkSession(): Promise<void> {
    return new Promise((resolve) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Validate token, load user profile
        this._user.set({ id: '1', name: 'Test User', role: 'admin' });
      }
      console.log('Auth checked');
      resolve();
    });
  }
}

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: (config: ConfigService) => () => config.loadConfig(),
      deps: [ConfigService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.checkSession(),
      deps: [AuthService],
      multi: true,
    },
  ],
};
```

**Expected output**: Both initializers run in parallel. Angular waits for ALL of them to complete before rendering the app.

### Verification Questions
- What order do the console logs appear in?
- What happens if an APP_INITIALIZER throws an error?
- What happens if an APP_INITIALIZER never resolves?

---

## Exercise 2: Standalone vs NgModule

### Objective
Build the same feature using both approaches to understand the differences.

### Level: Beginner to Intermediate

### Task 2.1: Build a Product Feature with NgModule (Legacy)

```typescript
// product/product.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductListComponent } from './product-list/product-list';
import { ProductCardComponent } from './product-card/product-card';
import { ProductBadgeDirective } from './directives/product-badge.directive';
import { DiscountPipe } from './pipes/discount.pipe';

@NgModule({
  declarations: [
    ProductListComponent,
    ProductCardComponent,
    ProductBadgeDirective,
    DiscountPipe,
  ],
  imports: [CommonModule],
  exports: [ProductListComponent],  // Only expose the list
})
export class ProductModule {}
```

```typescript
// product/product-card/product-card.ts (NgModule-based)
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-product-card',
  standalone: false,  // Explicit in Angular 19+
  template: `
    <div class="card" [appProductBadge]="product.isNew">
      <h3>{{ product.name }}</h3>
      <p>Original: {{ product.price | currency }}</p>
      <p>Discounted: {{ product.price | discount:product.discountPercent | currency }}</p>
      <button (click)="addToCart.emit(product)">Add to Cart</button>
    </div>
  `,
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() addToCart = new EventEmitter<Product>();
}
```

### Task 2.2: Convert to Standalone (Modern)

```typescript
// product/pipes/discount.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'discount',
  standalone: true,
})
export class DiscountPipe implements PipeTransform {
  transform(price: number, discountPercent: number): number {
    return price * (1 - discountPercent / 100);
  }
}

// product/directives/product-badge.directive.ts
import { Directive, input, ElementRef, effect, inject } from '@angular/core';

@Directive({
  selector: '[appProductBadge]',
  standalone: true,
})
export class ProductBadgeDirective {
  isNew = input(false, { alias: 'appProductBadge' });

  private readonly el = inject(ElementRef);

  constructor() {
    effect(() => {
      if (this.isNew()) {
        this.el.nativeElement.classList.add('new-badge');
        this.el.nativeElement.setAttribute('data-badge', 'NEW');
      } else {
        this.el.nativeElement.classList.remove('new-badge');
        this.el.nativeElement.removeAttribute('data-badge');
      }
    });
  }
}

// product/product-card/product-card.ts (Standalone)
import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DiscountPipe } from '../pipes/discount.pipe';
import { ProductBadgeDirective } from '../directives/product-badge.directive';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, DiscountPipe, ProductBadgeDirective],
  template: `
    <div class="card" [appProductBadge]="product().isNew">
      <h3>{{ product().name }}</h3>
      <p>Original: {{ product().price | currency }}</p>
      <p>Discounted: {{ product().price | discount:product().discountPercent | currency }}</p>
      <button (click)="addToCart.emit(product())">Add to Cart</button>
    </div>
  `,
})
export class ProductCardComponent {
  product = input.required<Product>();
  addToCart = output<Product>();
}

// product/product-list/product-list.ts (Standalone)
import { Component, signal } from '@angular/core';
import { ProductCardComponent } from '../product-card/product-card';

@Component({
  selector: 'app-product-list',
  imports: [ProductCardComponent],
  template: `
    @for (product of products(); track product.id) {
      <app-product-card
        [product]="product"
        (addToCart)="onAddToCart($event)" />
    } @empty {
      <p>No products available.</p>
    }
  `,
})
export class ProductListComponent {
  products = signal<Product[]>([
    { id: '1', name: 'Laptop', price: 999, discountPercent: 10, isNew: true },
    { id: '2', name: 'Phone', price: 699, discountPercent: 5, isNew: false },
    { id: '3', name: 'Tablet', price: 499, discountPercent: 15, isNew: true },
  ]);

  onAddToCart(product: Product): void {
    console.log('Added to cart:', product.name);
  }
}
```

### Key Observations to Note
1. Standalone components list their dependencies **explicitly** in `imports` — no hidden module dependencies
2. No `ProductModule` needed — each component is self-contained
3. The pipe and directive are imported directly where used
4. `signal()` and `input()` replace `@Input()` decorator
5. `output()` replaces `@Output() + EventEmitter`

---

## Exercise 3: Lifecycle Hook Explorer

### Objective
Build a visual component that demonstrates all lifecycle hooks in action.

### Level: Intermediate

### Task 3.1: Create a Lifecycle Logger Component

```typescript
// lifecycle/lifecycle-logger.ts
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  DoCheck,
  AfterContentInit,
  AfterContentChecked,
  AfterViewInit,
  AfterViewChecked,
  OnDestroy,
  SimpleChanges,
  signal,
} from '@angular/core';

interface LifecycleEvent {
  hook: string;
  timestamp: number;
  details?: string;
}

@Component({
  selector: 'app-lifecycle-logger',
  template: `
    <div class="lifecycle-panel">
      <h3>Lifecycle Events for: {{ label }}</h3>
      <div class="events">
        @for (event of events(); track event.timestamp) {
          <div class="event" [class]="getHookClass(event.hook)">
            <span class="time">{{ event.timestamp }}ms</span>
            <span class="hook">{{ event.hook }}</span>
            @if (event.details) {
              <span class="details">{{ event.details }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .lifecycle-panel { border: 1px solid #ccc; padding: 12px; margin: 8px; }
    .event { display: flex; gap: 8px; padding: 4px; font-family: monospace; font-size: 12px; }
    .constructor { color: #666; }
    .ngOnChanges { color: #e91e63; }
    .ngOnInit { color: #4caf50; }
    .ngDoCheck { color: #ff9800; }
    .ngAfterContentInit { color: #2196f3; }
    .ngAfterContentChecked { color: #03a9f4; }
    .ngAfterViewInit { color: #9c27b0; }
    .ngAfterViewChecked { color: #ba68c8; }
    .ngOnDestroy { color: #f44336; }
  `],
})
export class LifecycleLoggerComponent
  implements OnChanges, OnInit, DoCheck, AfterContentInit,
             AfterContentChecked, AfterViewInit, AfterViewChecked, OnDestroy
{
  @Input() label = 'Component';
  @Input() data: unknown;

  events = signal<LifecycleEvent[]>([]);
  private startTime = performance.now();

  constructor() {
    this.log('constructor');
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changedProps = Object.keys(changes).join(', ');
    const details = Object.entries(changes)
      .map(([key, change]) =>
        `${key}: ${change.previousValue} → ${change.currentValue}${change.firstChange ? ' (first)' : ''}`
      )
      .join('; ');
    this.log('ngOnChanges', details);
  }

  ngOnInit(): void {
    this.log('ngOnInit');
  }

  ngDoCheck(): void {
    this.log('ngDoCheck');
  }

  ngAfterContentInit(): void {
    this.log('ngAfterContentInit');
  }

  ngAfterContentChecked(): void {
    this.log('ngAfterContentChecked');
  }

  ngAfterViewInit(): void {
    this.log('ngAfterViewInit');
  }

  ngAfterViewChecked(): void {
    this.log('ngAfterViewChecked');
  }

  ngOnDestroy(): void {
    this.log('ngOnDestroy');
    console.log(`[${this.label}] Final lifecycle events:`, this.events());
  }

  private log(hook: string, details?: string): void {
    const elapsed = Math.round(performance.now() - this.startTime);
    this.events.update(events => [
      ...events,
      { hook, timestamp: elapsed, details },
    ]);
    console.log(`[${this.label}] ${hook}`, details ?? '');
  }

  getHookClass(hook: string): string {
    return hook;
  }
}
```

### Task 3.2: Parent-Child Lifecycle Ordering

```typescript
// lifecycle/parent-child-demo.ts
import { Component, signal } from '@angular/core';
import { LifecycleLoggerComponent } from './lifecycle-logger';

@Component({
  selector: 'app-parent-child-demo',
  imports: [LifecycleLoggerComponent],
  template: `
    <div class="demo">
      <h2>Parent-Child Lifecycle Ordering</h2>

      <div class="controls">
        <button (click)="counter.update(c => c + 1)">
          Update Counter ({{ counter() }})
        </button>
        <button (click)="showChild.update(v => !v)">
          {{ showChild() ? 'Hide' : 'Show' }} Child
        </button>
      </div>

      <app-lifecycle-logger
        label="Parent"
        [data]="counter()">
      </app-lifecycle-logger>

      @if (showChild()) {
        <app-lifecycle-logger
          label="Child"
          [data]="counter()">
        </app-lifecycle-logger>
      }
    </div>
  `,
})
export class ParentChildDemoComponent {
  counter = signal(0);
  showChild = signal(true);
}
```

### Exercises
1. Click "Update Counter" and observe the hook order in the console
2. Click "Hide Child" and observe `ngOnDestroy` firing
3. Click "Show Child" and observe the full initialization sequence again
4. Add a grandchild component and verify the three-level ordering

---

## Exercise 4: View Encapsulation Lab

### Objective
See the concrete differences between all three encapsulation modes.

### Level: Intermediate

### Task 4.1: Create Three Identical Components with Different Encapsulation

```typescript
// encapsulation/emulated-box.ts
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-emulated-box',
  encapsulation: ViewEncapsulation.Emulated,
  styles: [`
    .box {
      padding: 20px;
      border: 2px solid blue;
      margin: 10px;
    }
    .title { color: blue; font-weight: bold; }
    p { font-style: italic; }
  `],
  template: `
    <div class="box">
      <span class="title">Emulated Encapsulation</span>
      <p>My styles are scoped with attributes</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class EmulatedBoxComponent {}

// encapsulation/shadow-box.ts
@Component({
  selector: 'app-shadow-box',
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [`
    .box {
      padding: 20px;
      border: 2px solid green;
      margin: 10px;
    }
    .title { color: green; font-weight: bold; }
    p { font-style: italic; }
  `],
  template: `
    <div class="box">
      <span class="title">ShadowDom Encapsulation</span>
      <p>My styles use real Shadow DOM</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class ShadowBoxComponent {}

// encapsulation/none-box.ts
@Component({
  selector: 'app-none-box',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .box {
      padding: 20px;
      border: 2px solid red;
      margin: 10px;
    }
    .title { color: red; font-weight: bold; }
    p { font-style: italic; }
  `],
  template: `
    <div class="box">
      <span class="title">No Encapsulation</span>
      <p>My styles leak globally!</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class NoneBoxComponent {}
```

### Task 4.2: The Comparison Page

```typescript
// encapsulation/encapsulation-lab.ts
@Component({
  selector: 'app-encapsulation-lab',
  imports: [EmulatedBoxComponent, ShadowBoxComponent, NoneBoxComponent],
  styles: [`
    /* Global style that targets all .title elements */
    .title { text-decoration: underline; font-size: 20px; }
    /* Global style that targets all p elements */
    p { background-color: #f0f0f0; }
  `],
  template: `
    <h1>View Encapsulation Comparison</h1>

    <p>This paragraph is in the parent. Watch how each encapsulation mode
    affects whether styles leak in and out.</p>

    <app-emulated-box>
      <p>Projected content in Emulated</p>
    </app-emulated-box>

    <app-shadow-box>
      <p>Projected content in ShadowDom</p>
    </app-shadow-box>

    <app-none-box>
      <p>Projected content in None</p>
    </app-none-box>

    <!-- This plain paragraph will be affected by None's leaked styles -->
    <p class="title">I'm a plain paragraph outside any component.
    If None's styles leaked, I'll be red.</p>
  `,
})
export class EncapsulationLabComponent {}
```

### What to Observe
1. **Open DevTools → Elements tab**: Inspect each component's DOM
   - Emulated: Look for `_ngcontent-xxx` attributes
   - ShadowDom: Look for `#shadow-root`
   - None: No special attributes
2. **Style leaking**:
   - The parent's `.title` underline should appear in Emulated and None, but NOT in ShadowDom
   - None's red `.title` style will affect elements outside the component
3. **Projected content**: Check how `<ng-content>` behaves differently in ShadowDom

---

## Exercise 5: Component Communication Dashboard

### Objective
Build a dashboard that demonstrates all communication patterns in one application.

### Level: Intermediate to Advanced

### Task 5.1: The Data Model and Service

```typescript
// models/notification.model.ts
export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

// services/notification.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.read).length
  );
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  add(message: string, type: Notification['type'] = 'info'): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    this._notifications.update(list => [notification, ...list]);
  }

  markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllAsRead(): void {
    this._notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
  }

  remove(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  clear(): void {
    this._notifications.set([]);
  }
}
```

### Task 5.2: Parent → Child with Signal Inputs

```typescript
// dashboard/notification-badge.ts
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-notification-badge',
  template: `
    @if (count() > 0) {
      <span class="badge" [class]="badgeClass()">
        {{ count() > 99 ? '99+' : count() }}
      </span>
    }
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: bold;
      color: white;
      padding: 0 6px;
    }
    .badge-info { background: #2196f3; }
    .badge-warning { background: #ff9800; }
    .badge-danger { background: #f44336; }
  `],
})
export class NotificationBadgeComponent {
  count = input.required<number>();
  severity = input<'info' | 'warning' | 'danger'>('info');

  badgeClass = computed(() => `badge-${this.severity()}`);
}
```

### Task 5.3: Child → Parent with Output

```typescript
// dashboard/notification-item.ts
import { Component, input, output, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Notification } from '../models/notification.model';

@Component({
  selector: 'app-notification-item',
  imports: [DatePipe],
  template: `
    <div class="notification" [class.unread]="!notification().read"
         [class]="'type-' + notification().type">
      <div class="content">
        <span class="icon">{{ icon() }}</span>
        <div class="text">
          <p class="message">{{ notification().message }}</p>
          <small class="time">{{ notification().timestamp | date:'short' }}</small>
        </div>
      </div>
      <div class="actions">
        @if (!notification().read) {
          <button (click)="markRead.emit(notification().id)">Mark Read</button>
        }
        <button (click)="remove.emit(notification().id)">×</button>
      </div>
    </div>
  `,
  styles: [`
    .notification {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }
    .unread { background: #f5f5ff; font-weight: 500; }
    .content { display: flex; gap: 8px; align-items: flex-start; }
    .actions { display: flex; gap: 4px; }
    button {
      border: 1px solid #ddd;
      background: white;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
  `],
})
export class NotificationItemComponent {
  notification = input.required<Notification>();
  markRead = output<string>();
  remove = output<string>();

  icon = computed(() => {
    const icons: Record<string, string> = {
      info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌'
    };
    return icons[this.notification().type] ?? 'ℹ️';
  });
}
```

### Task 5.4: Sibling Communication via Shared Service

```typescript
// dashboard/notification-creator.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../models/notification.model';

@Component({
  selector: 'app-notification-creator',
  imports: [FormsModule],
  template: `
    <div class="creator">
      <h3>Create Notification (Sibling Communication)</h3>
      <div class="form">
        <input
          [(ngModel)]="message"
          placeholder="Enter notification message"
          (keydown.enter)="send()" />
        <select [(ngModel)]="type">
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <button (click)="send()" [disabled]="!message">Send</button>
      </div>
      <div class="presets">
        <button (click)="sendPreset('info')">+ Info</button>
        <button (click)="sendPreset('success')">+ Success</button>
        <button (click)="sendPreset('warning')">+ Warning</button>
        <button (click)="sendPreset('error')">+ Error</button>
      </div>
    </div>
  `,
  styles: [`
    .creator { padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
    .form { display: flex; gap: 8px; margin: 12px 0; }
    .presets { display: flex; gap: 4px; }
    input { flex: 1; padding: 8px; }
  `],
})
export class NotificationCreatorComponent {
  private readonly notificationService = inject(NotificationService);

  message = '';
  type: Notification['type'] = 'info';

  send(): void {
    if (this.message.trim()) {
      this.notificationService.add(this.message, this.type);
      this.message = '';
    }
  }

  sendPreset(type: Notification['type']): void {
    const messages: Record<string, string> = {
      info: 'New update available.',
      success: 'Operation completed successfully!',
      warning: 'Disk space running low.',
      error: 'Connection to server lost.',
    };
    this.notificationService.add(messages[type], type);
  }
}
```

### Task 5.5: ViewChild for Imperative Communication

```typescript
// dashboard/notification-list.ts
import { Component, inject, viewChild, ElementRef } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { NotificationItemComponent } from './notification-item';

@Component({
  selector: 'app-notification-list',
  imports: [NotificationItemComponent],
  template: `
    <div class="list" #scrollContainer>
      @for (notification of notificationService.notifications(); track notification.id) {
        <app-notification-item
          [notification]="notification"
          (markRead)="notificationService.markAsRead($event)"
          (remove)="notificationService.remove($event)" />
      } @empty {
        <div class="empty">No notifications</div>
      }
    </div>
  `,
  styles: [`
    .list { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; }
    .empty { padding: 40px; text-align: center; color: #999; }
  `],
})
export class NotificationListComponent {
  protected readonly notificationService = inject(NotificationService);
  private readonly scrollContainer = viewChild.required<ElementRef>('scrollContainer');

  scrollToTop(): void {
    this.scrollContainer().nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToBottom(): void {
    const el = this.scrollContainer().nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }
}
```

### Task 5.6: The Dashboard (Tying It All Together)

```typescript
// dashboard/dashboard.ts
import { Component, inject, viewChild } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { NotificationBadgeComponent } from './notification-badge';
import { NotificationCreatorComponent } from './notification-creator';
import { NotificationListComponent } from './notification-list';

@Component({
  selector: 'app-dashboard',
  imports: [
    NotificationBadgeComponent,
    NotificationCreatorComponent,
    NotificationListComponent,
  ],
  template: `
    <div class="dashboard">
      <header>
        <h1>Communication Patterns Dashboard</h1>
        <div class="header-actions">
          <span>Unread:</span>
          <!-- Parent → Child: passing data down -->
          <app-notification-badge
            [count]="notificationService.unreadCount()"
            [severity]="notificationService.unreadCount() > 5 ? 'danger' : 'info'" />
          <button (click)="notificationService.markAllAsRead()">Mark All Read</button>
          <button (click)="notificationService.clear()">Clear All</button>
          <!-- ViewChild: parent calls child method -->
          <button (click)="scrollListToTop()">↑ Scroll Top</button>
        </div>
      </header>

      <!-- Sibling A: Creates notifications via shared service -->
      <app-notification-creator />

      <!-- Sibling B: Reads notifications via shared service -->
      <!-- Child → Parent: emits events up via outputs -->
      <app-notification-list />
    </div>
  `,
  styles: [`
    .dashboard { max-width: 700px; margin: 0 auto; padding: 20px; }
    header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
  `],
})
export class DashboardComponent {
  protected readonly notificationService = inject(NotificationService);
  private readonly notificationList = viewChild(NotificationListComponent);

  scrollListToTop(): void {
    this.notificationList()?.scrollToTop();
  }
}
```

### Communication Patterns Demonstrated
| Pattern | Where |
|---------|-------|
| Parent → Child (input) | Dashboard → NotificationBadge `[count]` |
| Child → Parent (output) | NotificationItem → NotificationList `(markRead)` |
| Sibling via service | Creator → List (both use NotificationService) |
| ViewChild imperative | Dashboard calls `NotificationList.scrollToTop()` |
| Signal-based reactivity | `NotificationService` with `signal()` and `computed()` |

---

## Exercise 6: Template Syntax Playground

### Objective
Practice every template binding mechanism and the new control flow syntax.

### Level: Beginner to Intermediate

### Task 6.1: Binding Types Showcase

```typescript
// playground/binding-demo.ts
import { Component, signal, computed } from '@angular/core';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-binding-demo',
  template: `
    <div class="playground">
      <h2>Template Binding Playground</h2>

      <!-- INTERPOLATION -->
      <section>
        <h3>1. Interpolation {{ }}</h3>
        <p>Total: {{ todos().length }} items</p>
        <p>Remaining: {{ remaining() }} items</p>
        <p>Progress: {{ progressPercent() }}%</p>
      </section>

      <!-- PROPERTY BINDING -->
      <section>
        <h3>2. Property Binding [ ]</h3>
        <progress [value]="progressPercent()" max="100"></progress>
        <img [src]="avatarUrl()" [alt]="'Avatar for ' + userName()" width="50">
        <div [class.completed]="allDone()" [style.opacity]="allDone() ? '0.5' : '1'">
          {{ allDone() ? 'All done!' : 'Keep going...' }}
        </div>
        <!-- Attribute binding (no DOM property for colspan) -->
        <table>
          <tr><td [attr.colspan]="columnCount()">Spanning {{ columnCount() }} columns</td></tr>
        </table>
      </section>

      <!-- EVENT BINDING -->
      <section>
        <h3>3. Event Binding ( )</h3>
        <input
          #newTodo
          placeholder="New todo..."
          (keydown.enter)="addTodo(newTodo.value); newTodo.value = ''"
          (focus)="onInputFocus($event)"
          (blur)="onInputBlur($event)" />
        <button (click)="addTodo(newTodo.value); newTodo.value = ''">Add</button>
        <p>Input focused: {{ inputFocused() }}</p>
      </section>

      <!-- CONTROL FLOW -->
      <section>
        <h3>4. Control Flow</h3>

        <!-- @for with track and implicit variables -->
        @for (todo of todos(); track todo.id; let i = $index, let isFirst = $first, let isLast = $last) {
          <div class="todo-item"
               [class.done]="todo.done"
               [class.first]="isFirst"
               [class.last]="isLast">
            <span class="index">{{ i + 1 }}.</span>
            <input type="checkbox"
                   [checked]="todo.done"
                   (change)="toggleTodo(todo.id)" />
            <span class="text">{{ todo.text }}</span>

            <!-- @switch for priority -->
            @switch (todo.priority) {
              @case ('high') {
                <span class="priority high">HIGH</span>
              }
              @case ('medium') {
                <span class="priority medium">MED</span>
              }
              @case ('low') {
                <span class="priority low">LOW</span>
              }
            }

            <button (click)="removeTodo(todo.id)">×</button>
          </div>
        } @empty {
          <p class="empty">No todos yet. Add one above!</p>
        }
      </section>

      <!-- @if / @else -->
      <section>
        <h3>5. Conditional Rendering</h3>
        @if (allDone() && todos().length > 0) {
          <div class="celebration">All tasks completed!</div>
        } @else if (remaining() === 1) {
          <div class="almost">Just one more to go!</div>
        } @else {
          <div class="progress-info">{{ remaining() }} tasks remaining</div>
        }
      </section>

      <!-- TEMPLATE REFERENCE VARIABLES -->
      <section>
        <h3>6. Template Reference Variables</h3>
        <input #colorPicker type="color" value="#4caf50" (input)="0">
        <div [style.background-color]="colorPicker.value"
             style="width: 100px; height: 50px; margin-top: 8px; border-radius: 8px;">
        </div>
        <p>Selected: {{ colorPicker.value }}</p>
      </section>
    </div>
  `,
  styles: [`
    .playground { max-width: 600px; padding: 20px; }
    section { margin: 20px 0; padding: 16px; border: 1px solid #eee; border-radius: 8px; }
    .todo-item { display: flex; align-items: center; gap: 8px; padding: 8px; }
    .todo-item.done .text { text-decoration: line-through; opacity: 0.5; }
    .priority { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .priority.high { background: #ffcdd2; color: #c62828; }
    .priority.medium { background: #fff9c4; color: #f57f17; }
    .priority.low { background: #c8e6c9; color: #2e7d32; }
    .celebration { color: #4caf50; font-weight: bold; font-size: 18px; }
  `],
})
export class BindingDemoComponent {
  userName = signal('Developer');
  avatarUrl = signal('https://via.placeholder.com/50');
  columnCount = signal(3);
  inputFocused = signal(false);

  todos = signal<TodoItem[]>([
    { id: 1, text: 'Learn Angular signals', done: true, priority: 'high' },
    { id: 2, text: 'Build a component library', done: false, priority: 'high' },
    { id: 3, text: 'Write unit tests', done: false, priority: 'medium' },
    { id: 4, text: 'Update documentation', done: false, priority: 'low' },
  ]);

  remaining = computed(() => this.todos().filter(t => !t.done).length);
  allDone = computed(() => this.todos().length > 0 && this.remaining() === 0);
  progressPercent = computed(() => {
    const total = this.todos().length;
    return total === 0 ? 0 : Math.round(((total - this.remaining()) / total) * 100);
  });

  private nextId = 5;

  addTodo(text: string): void {
    if (!text.trim()) return;
    this.todos.update(todos => [
      ...todos,
      { id: this.nextId++, text: text.trim(), done: false, priority: 'medium' },
    ]);
  }

  toggleTodo(id: number): void {
    this.todos.update(todos =>
      todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  }

  removeTodo(id: number): void {
    this.todos.update(todos => todos.filter(t => t.id !== id));
  }

  onInputFocus(event: FocusEvent): void {
    this.inputFocused.set(true);
  }

  onInputBlur(event: FocusEvent): void {
    this.inputFocused.set(false);
  }
}
```

---

## Exercise 7: Defer Block Performance Optimizer

### Objective
Use `@defer` blocks to lazy-load heavy components and measure the performance impact.

### Level: Advanced

### Task 7.1: Simulate Heavy Components

```typescript
// heavy/heavy-chart.ts
import { Component, input, signal, effect, inject, ElementRef, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-heavy-chart',
  template: `
    <div class="chart-container">
      <h3>{{ title() }}</h3>
      <div class="chart" #chart>
        @for (bar of bars(); track bar.label) {
          <div class="bar"
               [style.height.%]="bar.value"
               [style.background]="bar.color">
            <span class="label">{{ bar.label }}</span>
          </div>
        }
      </div>
      <p class="load-info">Loaded at: {{ loadTime }}ms</p>
    </div>
  `,
  styles: [`
    .chart-container { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
    .chart { display: flex; align-items: flex-end; height: 200px; gap: 4px; }
    .bar { flex: 1; display: flex; align-items: flex-end; justify-content: center;
           border-radius: 4px 4px 0 0; min-width: 30px; transition: height 0.5s; }
    .label { font-size: 10px; color: white; padding: 4px; }
    .load-info { font-size: 12px; color: #999; margin-top: 8px; }
  `],
})
export class HeavyChartComponent {
  title = input('Chart');
  data = input<number[]>([]);

  loadTime = Math.round(performance.now());

  bars = signal<{ label: string; value: number; color: string }[]>([]);

  constructor() {
    // Simulate expensive computation on init
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < 5_000_000; i++) {
      result += Math.sin(i) * Math.cos(i);
    }
    console.log(`HeavyChart computed in ${Math.round(performance.now() - start)}ms`);

    effect(() => {
      const colors = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
      this.bars.set(
        this.data().map((value, i) => ({
          label: `#${i + 1}`,
          value,
          color: colors[i % colors.length],
        }))
      );
    });
  }
}
```

### Task 7.2: Page with Deferred Loading

```typescript
// heavy/deferred-page.ts
import { Component, signal } from '@angular/core';
import { HeavyChartComponent } from './heavy-chart';

@Component({
  selector: 'app-deferred-page',
  imports: [HeavyChartComponent],
  template: `
    <div class="page">
      <h1>Defer Block Demo</h1>
      <p>Page loaded at: {{ pageLoadTime }}ms — Scroll down to see deferred components load.</p>

      <!-- Immediately loaded chart -->
      <section>
        <h2>1. Eagerly Loaded (no defer)</h2>
        <app-heavy-chart title="Eager Chart" [data]="chartData1" />
      </section>

      <!-- Deferred: loads when scrolled into viewport -->
      <div style="height: 600px; display: flex; align-items: center; justify-content: center;">
        <p style="font-size: 24px; color: #ccc;">↓ Scroll down to trigger viewport defer ↓</p>
      </div>

      <section>
        <h2>2. Deferred on Viewport</h2>
        @defer (on viewport) {
          <app-heavy-chart title="Viewport Chart" [data]="chartData2" />
        } @placeholder {
          <div class="placeholder">Chart loads when you scroll here...</div>
        } @loading (minimum 500ms) {
          <div class="loading">Loading chart component...</div>
        } @error {
          <div class="error">Failed to load chart</div>
        }
      </section>

      <!-- Deferred: loads on idle -->
      <section>
        <h2>3. Deferred on Idle</h2>
        @defer (on idle) {
          <app-heavy-chart title="Idle Chart" [data]="chartData3" />
        } @placeholder {
          <div class="placeholder">Chart loads when browser is idle...</div>
        } @loading {
          <div class="loading">Loading...</div>
        }
      </section>

      <!-- Deferred: loads on interaction -->
      <section>
        <h2>4. Deferred on Interaction</h2>
        <button #loadBtn>Click to Load Chart</button>
        @defer (on interaction(loadBtn)) {
          <app-heavy-chart title="Interaction Chart" [data]="chartData4" />
        } @placeholder {
          <div class="placeholder">Click the button above to load...</div>
        } @loading {
          <div class="loading">Loading...</div>
        }
      </section>

      <!-- Deferred: loads on timer -->
      <section>
        <h2>5. Deferred on Timer (3s)</h2>
        @defer (on timer(3s)) {
          <app-heavy-chart title="Timer Chart" [data]="chartData5" />
        } @placeholder {
          <div class="placeholder">Chart loads in 3 seconds...</div>
        } @loading {
          <div class="loading">Loading...</div>
        }
      </section>

      <!-- Deferred: loads when condition is true -->
      <section>
        <h2>6. Deferred on Condition</h2>
        <label>
          <input type="checkbox" (change)="showConditional.set(!showConditional())" />
          Enable chart
        </label>
        @defer (when showConditional()) {
          <app-heavy-chart title="Conditional Chart" [data]="chartData6" />
        } @placeholder {
          <div class="placeholder">Check the box to load...</div>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 700px; margin: 0 auto; padding: 20px; }
    section { margin: 24px 0; }
    .placeholder { padding: 40px; text-align: center; background: #f5f5f5;
                   border: 2px dashed #ddd; border-radius: 8px; color: #999; }
    .loading { padding: 40px; text-align: center; background: #e3f2fd;
               border-radius: 8px; color: #1976d2; }
    .error { padding: 40px; text-align: center; background: #ffebee;
             border-radius: 8px; color: #c62828; }
  `],
})
export class DeferredPageComponent {
  pageLoadTime = Math.round(performance.now());
  showConditional = signal(false);

  chartData1 = [80, 60, 90, 45, 70, 85];
  chartData2 = [50, 75, 40, 95, 60, 30];
  chartData3 = [70, 80, 55, 65, 90, 45];
  chartData4 = [40, 60, 80, 50, 70, 90];
  chartData5 = [90, 30, 60, 80, 45, 75];
  chartData6 = [55, 85, 40, 70, 60, 95];
}
```

### What to Observe
1. Open **Network tab** in DevTools — watch separate chunks load for deferred components
2. Compare page load time with and without `@defer`
3. Notice how `@placeholder` shows instantly while the component loads
4. `minimum 500ms` on `@loading` prevents a flash of loading state

---

## Exercise 8: Build a Mini Component Library

### Objective
Apply all concepts to build reusable, composable components with proper encapsulation, lifecycle management, and communication.

### Level: Expert

### Task 8.1: Accordion Component with Content Projection

```typescript
// library/accordion/accordion-item.ts
import { Component, input, output, signal, contentChild, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-accordion-item',
  template: `
    <div class="accordion-item" [class.open]="isOpen()">
      <button class="header" (click)="toggle()" [attr.aria-expanded]="isOpen()">
        <span class="title">{{ title() }}</span>
        <span class="icon" [class.rotated]="isOpen()">▶</span>
      </button>
      @if (isOpen()) {
        <div class="content" role="region">
          <ng-content />
        </div>
      }
    </div>
  `,
  styles: [`
    .accordion-item { border: 1px solid #ddd; border-radius: 4px; margin: 4px 0; overflow: hidden; }
    .header {
      width: 100%; display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; background: #f5f5f5; border: none; cursor: pointer;
      font-size: 14px; font-weight: 500; text-align: left;
    }
    .header:hover { background: #eee; }
    .icon { transition: transform 0.2s; font-size: 10px; }
    .icon.rotated { transform: rotate(90deg); }
    .content { padding: 16px; animation: slideDown 0.2s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class AccordionItemComponent {
  title = input.required<string>();
  isOpen = signal(false);
  toggled = output<boolean>();

  toggle(): void {
    this.isOpen.update(v => !v);
    this.toggled.emit(this.isOpen());
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
```

```typescript
// library/accordion/accordion.ts
import {
  Component, contentChildren, input, effect, computed,
} from '@angular/core';
import { AccordionItemComponent } from './accordion-item';

@Component({
  selector: 'app-accordion',
  template: `<div class="accordion" role="tablist"><ng-content /></div>`,
  styles: [`.accordion { border-radius: 8px; overflow: hidden; }`],
})
export class AccordionComponent {
  /** If true, only one item can be open at a time */
  singleOpen = input(false);

  items = contentChildren(AccordionItemComponent);

  constructor() {
    effect(() => {
      if (!this.singleOpen()) return;

      const allItems = this.items();
      // When an item opens, close all others
      allItems.forEach(item => {
        // Subscribe to each item's toggled output
        // In a real implementation, you'd use afterRender or a more robust mechanism
      });
    });
  }

  openAll(): void {
    this.items().forEach(item => item.open());
  }

  closeAll(): void {
    this.items().forEach(item => item.close());
  }

  openAt(index: number): void {
    const items = this.items();
    if (index >= 0 && index < items.length) {
      if (this.singleOpen()) {
        this.closeAll();
      }
      items[index].open();
    }
  }
}
```

### Task 8.2: Usage Page

```typescript
// library/library-demo.ts
import { Component, viewChild } from '@angular/core';
import { AccordionComponent } from './accordion/accordion';
import { AccordionItemComponent } from './accordion/accordion-item';

@Component({
  selector: 'app-library-demo',
  imports: [AccordionComponent, AccordionItemComponent],
  template: `
    <div class="demo">
      <h1>Mini Component Library Demo</h1>

      <div class="controls">
        <button (click)="accordion().openAll()">Open All</button>
        <button (click)="accordion().closeAll()">Close All</button>
        <button (click)="accordion().openAt(0)">Open First</button>
      </div>

      <app-accordion #accordion [singleOpen]="false">
        <app-accordion-item title="What is Angular?">
          <p>Angular is a platform and framework for building single-page client
          applications using HTML and TypeScript. It is developed and maintained by Google.</p>
        </app-accordion-item>

        <app-accordion-item title="What are Signals?">
          <p>Signals are a reactivity primitive introduced in Angular 16. They provide
          fine-grained reactivity for synchronous state management and enable
          more efficient change detection.</p>
        </app-accordion-item>

        <app-accordion-item title="What is View Encapsulation?">
          <p>View Encapsulation defines how component styles are scoped. Angular supports
          three modes: Emulated (default), ShadowDom (native), and None (global).</p>
        </app-accordion-item>

        <app-accordion-item title="What are Standalone Components?">
          <p>Standalone components are self-contained Angular components that don't need
          to be declared in an NgModule. They specify their dependencies directly in
          their imports array.</p>
        </app-accordion-item>
      </app-accordion>
    </div>
  `,
  styles: [`
    .demo { max-width: 600px; margin: 0 auto; padding: 20px; }
    .controls { display: flex; gap: 8px; margin: 16px 0; }
  `],
})
export class LibraryDemoComponent {
  accordion = viewChild.required(AccordionComponent);
}
```

### Concepts Demonstrated in This Exercise
- **Content projection**: `<ng-content>` for composable component APIs
- **`contentChildren()`**: Parent queries projected child components
- **`viewChild()`**: Page component calls accordion methods imperatively
- **Signal inputs**: `input()` and `input.required()` for configuration
- **Outputs**: `output()` for event communication
- **View encapsulation**: Scoped styles per component
- **Control flow**: `@if` for conditional rendering
- **Accessibility**: `role`, `aria-expanded` attributes

---

## Routing Setup for All Exercises

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'bootstrap',
    loadComponent: () =>
      import('./lifecycle/parent-child-demo').then(m => m.ParentChildDemoComponent),
  },
  {
    path: 'encapsulation',
    loadComponent: () =>
      import('./encapsulation/encapsulation-lab').then(m => m.EncapsulationLabComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard').then(m => m.DashboardComponent),
  },
  {
    path: 'bindings',
    loadComponent: () =>
      import('./playground/binding-demo').then(m => m.BindingDemoComponent),
  },
  {
    path: 'defer',
    loadComponent: () =>
      import('./heavy/deferred-page').then(m => m.DeferredPageComponent),
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./library/library-demo').then(m => m.LibraryDemoComponent),
  },
];
```

```typescript
// app.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav>
      <a routerLink="/bootstrap">Lifecycle</a>
      <a routerLink="/encapsulation">Encapsulation</a>
      <a routerLink="/dashboard">Dashboard</a>
      <a routerLink="/bindings">Bindings</a>
      <a routerLink="/defer">Defer</a>
      <a routerLink="/library">Library</a>
    </nav>
    <router-outlet />
  `,
  styles: [`
    nav { display: flex; gap: 12px; padding: 16px; background: #f5f5f5; border-bottom: 1px solid #ddd; }
    nav a { text-decoration: none; color: #1976d2; font-weight: 500; }
    nav a:hover { text-decoration: underline; }
  `],
})
export class App {}
```

---

## Checklist: What You Should Be Able to Explain After These Exercises

- [ ] The exact order of bootstrap events and how APP_INITIALIZER works
- [ ] Why standalone components are preferred and how to migrate from NgModules
- [ ] The complete lifecycle hook order, including parent-child relationships
- [ ] How each View Encapsulation mode works at the DOM level
- [ ] When to use each component communication pattern
- [ ] All four binding types and the new control flow syntax
- [ ] How `@defer` works and its impact on bundle size and performance
- [ ] How to build composable component APIs using content projection
