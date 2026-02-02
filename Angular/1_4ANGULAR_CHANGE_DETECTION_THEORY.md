# Angular Change Detection — In-Depth Theory

> **Phase 1 · Section 4** of the Angular Interview Preparation Roadmap
> Target: Angular 21 · Standalone-first · Signals · Zone.js & Zoneless

---

## Table of Contents

1. [What Is Change Detection?](#1-what-is-change-detection)
2. [Zone.js — How It Works and Limitations](#2-zonejs--how-it-works-and-limitations)
3. [Default vs OnPush Strategies](#3-default-vs-onpush-strategies)
4. [ChangeDetectorRef Methods](#4-changedetectorref-methods)
5. [NgZone and Running Outside Angular](#5-ngzone-and-running-outside-angular)
6. [Performance Implications of Change Detection](#6-performance-implications-of-change-detection)
7. [Signals and Their Impact on Change Detection](#7-signals-and-their-impact-on-change-detection)
8. [Zoneless Angular](#8-zoneless-angular)
9. [Mental Models & Quick-Reference Tables](#9-mental-models--quick-reference-tables)
10. [Zoneless Angular — Deep Dive (Angular 21)](#10-zoneless-angular--deep-dive-angular-21)
11. [Signal Reactive Graph Internals](#11-signal-reactive-graph-internals)
12. [resource() and rxResource() — Async Data Loading & CD](#12-resource-and-rxresource--async-data-loading--cd)
13. [linkedSignal — Advanced CD Patterns](#13-linkedsignal--advanced-cd-patterns)
14. [Comprehensive CD Flow Diagrams](#14-comprehensive-cd-flow-diagrams)

---

## 1. What Is Change Detection?

Change detection (CD) is the mechanism Angular uses to keep the **DOM in sync with component state**. Whenever application state changes — via user events, HTTP responses, timers, or any async operation — Angular must determine **which parts of the UI need updating** and re-render them.

### The Core Cycle

```
User action / async event
        ↓
Zone.js patches async API → notifies Angular
        ↓
ApplicationRef.tick()
        ↓
Root component → traverse component tree (top-down)
        ↓
For each component: check bindings → update DOM if changed
        ↓
Stable state reached
```

### Key Principles

- **Unidirectional data flow**: Angular checks the tree top-down, parent → child. A child component must NOT change a parent's binding during a CD cycle (causes `ExpressionChangedAfterItHasBeenCheckedError` in dev mode).
- **Predictable rendering**: Each CD cycle produces a consistent view. Dev mode runs CD **twice** to catch violations.
- **Component as the unit**: CD operates at the **component** level, not the individual binding level (until Signals change this).

---

## 2. Zone.js — How It Works and Limitations

### What Is Zone.js?

Zone.js is a **monkey-patching library** that wraps all browser async APIs so Angular can be notified when async work completes. It creates an execution context (a "zone") that persists across async operations.

### APIs Zone.js Patches

| Category | Patched APIs |
|----------|-------------|
| **Timers** | `setTimeout`, `setInterval`, `requestAnimationFrame` |
| **Promises** | `Promise.then`, `Promise.catch`, `Promise.finally` |
| **DOM Events** | `addEventListener`, `removeEventListener` |
| **XHR/Fetch** | `XMLHttpRequest`, `fetch` |
| **Microtasks** | `MutationObserver`, `queueMicrotask` |
| **Node.js** | `process.nextTick`, `EventEmitter` (if applicable) |

### How Zone.js Triggers Change Detection

```typescript
// Simplified flow:
// 1. Angular creates its own zone (NgZone)
NgZone = Zone.current.fork({
  name: 'angular',
  onHasTask: (delegate, current, target, hasTaskState) => {
    // When no more microtasks remain → trigger CD
    if (!hasTaskState.macroTask && !hasTaskState.microTask) {
      this.onMicrotaskEmpty.emit(null); // → ApplicationRef.tick()
    }
  }
});

// 2. Any async operation inside this zone auto-triggers CD
button.addEventListener('click', () => {
  this.count++;  // Zone intercepts → CD runs → DOM updates
});
```

### Zone.js Lifecycle Hooks

| Hook | When It Fires |
|------|--------------|
| `onInvokeTask` | Before executing a macrotask (setTimeout callback, event handler) |
| `onInvoke` | Before executing synchronous code in the zone |
| `onHasTask` | When the task queue state changes (empty/non-empty) |
| `onHandleError` | When an error occurs in the zone |

### Limitations of Zone.js

| Limitation | Explanation |
|-----------|-------------|
| **Bundle size** | ~35KB minified, added to every Angular app |
| **Performance overhead** | Monkey-patching adds indirection to every async call |
| **Over-triggering** | ANY async operation triggers CD, even if no state changed |
| **Cannot patch everything** | `async/await` (native), `ResizeObserver`, `IntersectionObserver`, Web Audio API, WebGL callbacks aren't patched by default |
| **Third-party conflicts** | Libraries that rely on native Promise behavior can break |
| **Debugging complexity** | Stack traces become harder to read due to wrapping |
| **No granularity** | Can't tell Angular *what* changed, only *that something happened* |

### Unpatched APIs Workaround

```typescript
// ResizeObserver — not patched by Zone.js
export class MyComponent {
  private ngZone = inject(NgZone);
  private observer: ResizeObserver;

  constructor() {
    this.observer = new ResizeObserver((entries) => {
      // This callback runs OUTSIDE Angular zone
      // Must manually trigger CD:
      this.ngZone.run(() => {
        this.size.set({ width: entries[0].contentRect.width });
      });
    });
  }
}
```

---

## 3. Default vs OnPush Strategies

### Default Strategy (`ChangeDetectionStrategy.Default`)

Every time CD runs, Angular checks **every component** in the tree from root to leaves, regardless of whether its inputs changed.

```
Root (checked ✓)
├── Header (checked ✓)
│   └── Nav (checked ✓)
├── Main (checked ✓)
│   ├── Sidebar (checked ✓)
│   └── Content (checked ✓)
│       ├── List (checked ✓)
│       └── Detail (checked ✓)
└── Footer (checked ✓)
```

**Problem**: In a tree of 200 components, Angular checks all 200 on every button click, even if only 1 component's state changed.

### OnPush Strategy (`ChangeDetectionStrategy.OnPush`)

Angular **skips** a component (and its subtree) unless one of these conditions is met:

| Trigger | Description |
|---------|-------------|
| **Input reference change** | An `@Input()` / `input()` signal receives a new object reference |
| **Event from the component or its children** | DOM events bound in the template (`(click)`, `(keyup)`, etc.) |
| **Async pipe** | `| async` unwraps Observable and calls `markForCheck()` internally |
| **Signal read in template** | Signal value changes → marks component dirty (Angular 17+) |
| **Manual markForCheck()** | Explicitly called via `ChangeDetectorRef` |
| **Manual detectChanges()** | Synchronously runs CD on this component |

```typescript
@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h3>{{ user().name }}</h3>
      <p>{{ user().email }}</p>
    </div>
  `
})
export class UserCardComponent {
  user = input.required<User>();
}
```

### OnPush — What Doesn't Trigger CD

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ data.name }}</p>`
})
export class BrokenComponent {
  data = { name: 'Alice' };

  updateName() {
    this.data.name = 'Bob';  // ❌ Mutating same object reference
    // OnPush won't detect this! Reference didn't change.
  }

  fixedUpdate() {
    this.data = { ...this.data, name: 'Bob' };  // ✅ New reference
  }
}
```

### OnPush With Observables

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ✅ async pipe calls markForCheck internally -->
    <p>{{ user$ | async | json }}</p>

    <!-- ❌ Manual subscribe without markForCheck won't update -->
    <p>{{ manualUser | json }}</p>
  `
})
export class UserComponent {
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  user$ = this.userService.getUser();
  manualUser: User | null = null;

  constructor() {
    // ❌ This won't update the view in OnPush
    this.userService.getUser().subscribe(u => {
      this.manualUser = u;
    });

    // ✅ Fix: call markForCheck
    this.userService.getUser().subscribe(u => {
      this.manualUser = u;
      this.cdr.markForCheck();
    });
  }
}
```

### OnPush — Skipping Visualization

```
Root (checked ✓)
├── Header [OnPush, no input change] (SKIPPED ✗)
│   └── Nav (SKIPPED ✗)
├── Main (checked ✓)
│   ├── Sidebar [OnPush, no input change] (SKIPPED ✗)
│   └── Content [OnPush, input changed ✓] (checked ✓)
│       ├── List [OnPush, input changed ✓] (checked ✓)
│       └── Detail [OnPush, no input change] (SKIPPED ✗)
└── Footer [OnPush] (SKIPPED ✗)
```

Only 3 of 8 components checked instead of all 8.

### Comparison Table

| Aspect | Default | OnPush |
|--------|---------|--------|
| **When checked** | Every CD cycle | Only when triggered |
| **Input handling** | Checks all bindings | Checks only on reference change |
| **Mutation-safe** | Yes (detects mutations) | No (requires immutable data) |
| **Performance** | O(n) all components | O(k) only dirty branches |
| **Complexity** | Low (just works) | Higher (must understand triggers) |
| **Best for** | Prototyping, small apps | Production, large apps |
| **Signals** | Work, but no optimization | Work + granular updates |

---

## 4. ChangeDetectorRef Methods

`ChangeDetectorRef` is an abstract class injected per component. It gives fine-grained control over when and how CD runs for that component.

### Method Reference

| Method | Effect | Use Case |
|--------|--------|----------|
| `detectChanges()` | Runs CD **synchronously** on this component and its children | Update UI immediately after a non-zone operation |
| `markForCheck()` | Marks this component and all **ancestors** as dirty, checked on next tick | OnPush component received data outside normal flow |
| `detach()` | Completely removes this component from the CD tree | Component that rarely changes (static dashboard widget) |
| `reattach()` | Re-adds a detached component to the CD tree | Re-enable checking after detach |
| `checkNoChanges()` | Dev-only: verifies no bindings changed since last check | Debugging unidirectional flow violations |

### detectChanges() Deep Dive

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ counter }}</p>`
})
export class CounterComponent {
  private cdr = inject(ChangeDetectorRef);
  counter = 0;

  // Called from outside Angular zone (e.g., WebSocket, ResizeObserver)
  onExternalUpdate(value: number) {
    this.counter = value;
    this.cdr.detectChanges();  // Synchronous, immediate update
  }
}
```

**Key behavior**: `detectChanges()` runs CD **from this component downward**. It does NOT mark ancestors. Use when you need immediate, synchronous DOM update.

### markForCheck() Deep Dive

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ message }}</p>`
})
export class NotificationComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private ws = inject(WebSocketService);
  message = '';

  ngOnInit() {
    this.ws.messages$.subscribe(msg => {
      this.message = msg;
      this.cdr.markForCheck();  // Marks dirty, actual CD runs on next tick
    });
  }
}
```

**Key behavior**: `markForCheck()` walks UP the tree marking each ancestor as dirty. The actual rendering happens during the next CD cycle (triggered by zone or `ApplicationRef.tick()`).

```
         Root ← marked dirty
          │
        Parent ← marked dirty
          │
    NotificationComponent ← marked dirty (origin)
```

### detach() / reattach() Deep Dive

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stock-ticker">
      <span>{{ stock.symbol }}: {{ stock.price | currency }}</span>
    </div>
  `
})
export class StockTickerComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  stock = { symbol: 'AAPL', price: 150.00 };

  ngOnInit() {
    this.cdr.detach();  // Remove from CD tree entirely

    // Only update every 5 seconds, not on every tick
    setInterval(() => {
      this.stock = this.fetchLatestPrice();
      this.cdr.detectChanges();  // Manual sync update
    }, 5000);
  }
}
```

### detectChanges() vs markForCheck()

| Aspect | detectChanges() | markForCheck() |
|--------|----------------|----------------|
| **Execution** | Synchronous (runs NOW) | Asynchronous (runs on next tick) |
| **Direction** | This component ↓ downward | This component ↑ upward (marks ancestors) |
| **Zone required** | No (works outside zone) | Yes (needs a CD cycle to actually render) |
| **Performance** | Can cause extra CD cycles if overused | Batches with the next CD cycle |
| **Common use** | Outside-zone updates, WebSocket data | Observable subscriptions in OnPush |

---

## 5. NgZone and Running Outside Angular

### NgZone API

`NgZone` is Angular's wrapper around Zone.js. It manages the "Angular zone" where async operations trigger CD.

```typescript
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private ngZone = inject(NgZone);

  // Observable that emits when Angular zone becomes stable
  isStable$ = this.ngZone.onStable;

  // Observable that emits when a microtask queue empties
  onMicrotaskEmpty$ = this.ngZone.onMicrotaskEmpty;
}
```

### Key NgZone Properties and Methods

| API | Description |
|-----|-------------|
| `ngZone.run(fn)` | Execute `fn` inside Angular zone → triggers CD |
| `ngZone.runOutsideAngular(fn)` | Execute `fn` outside Angular zone → NO CD |
| `ngZone.onStable` | Observable: emits when zone becomes stable (no pending tasks) |
| `ngZone.onUnstable` | Observable: emits when zone becomes unstable (async work started) |
| `ngZone.onMicrotaskEmpty` | Observable: emits when microtask queue drains |
| `ngZone.isStable` | Boolean: true if no pending micro/macro tasks |
| `ngZone.hasPendingMicrotasks` | Boolean |
| `ngZone.hasPendingMacrotasks` | Boolean |

### Running Outside Angular Zone

Use `runOutsideAngular()` for operations that don't affect the UI to avoid unnecessary CD cycles:

```typescript
@Component({
  template: `<canvas #canvas></canvas>`
})
export class AnimationComponent implements AfterViewInit {
  private ngZone = inject(NgZone);
  canvas = viewChild.required<ElementRef>('canvas');

  ngAfterViewInit() {
    // ✅ Animation loop runs outside Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });
  }

  private animate() {
    const ctx = this.canvas().nativeElement.getContext('2d');
    // Draw frame...
    ctx.clearRect(0, 0, 800, 600);
    ctx.fillRect(this.x, this.y, 50, 50);
    this.x += 1;

    requestAnimationFrame(() => this.animate());
    // This requestAnimationFrame does NOT trigger CD
    // because we're outside Angular zone
  }

  // When you need to update Angular state from outside:
  onAnimationComplete() {
    this.ngZone.run(() => {
      this.status.set('complete');  // Now CD triggers
    });
  }
}
```

### Common Patterns for runOutsideAngular

| Pattern | Why |
|---------|-----|
| **Canvas/WebGL rendering** | 60fps animation would trigger 60 CD cycles/sec |
| **Drag and drop (mousemove)** | Hundreds of events during a drag |
| **Scroll listeners** | High-frequency events |
| **WebSocket heartbeats** | Periodic pings shouldn't trigger CD |
| **Third-party libraries** | Google Maps, D3.js, Chart.js callbacks |
| **Polling intervals** | Background polling that may not affect UI |
| **Web Workers message handling** | Processing messages before UI needs update |

### NgZone Event Coalescing

Angular 21 enables event coalescing by default:

```typescript
// In bootstrapApplication configuration
bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true })  // Default in Angular 21
  ]
});
```

**Without coalescing**: A single click handler that modifies 3 properties triggers CD 3 times.
**With coalescing**: Multiple changes within the same event handler are batched into 1 CD cycle.

---

## 6. Performance Implications of Change Detection

### The Cost of a CD Cycle

Each CD cycle Angular must:

1. **Evaluate all template expressions** — every `{{ expression }}`, `[property]="expr"`, `(event)="handler()"` etc.
2. **Compare old and new values** — using `===` strict equality (or `Object.is` for signals)
3. **Update DOM nodes** — if values changed, call `textContent`, `setAttribute`, etc.
4. **Run lifecycle hooks** — `ngDoCheck`, `ngAfterContentChecked`, `ngAfterViewChecked`

### Performance Anti-Patterns

#### 1. Function calls in templates

```html
<!-- ❌ Called on EVERY CD cycle -->
<p>{{ getFullName() }}</p>
<div *ngFor="let item of getFilteredItems()">{{ item.name }}</div>

<!-- ✅ Use pure pipe -->
<p>{{ user | fullName }}</p>

<!-- ✅ Use signal / computed -->
<p>{{ fullName() }}</p>
<div *ngFor="let item of filteredItems()">{{ item.name }}</div>
```

#### 2. Complex expressions in templates

```html
<!-- ❌ Re-evaluated every CD cycle -->
<div [class]="items.filter(i => i.active).length > 0 ? 'has-active' : 'empty'">

<!-- ✅ Pre-computed -->
<div [class]="hasActiveItems() ? 'has-active' : 'empty'">
```

```typescript
// In component:
items = signal<Item[]>([]);
hasActiveItems = computed(() => this.items().some(i => i.active));
```

#### 3. Missing trackBy in loops

```html
<!-- ❌ Destroys and recreates all DOM nodes on change -->
@for (user of users(); track $index) {
  <app-user-card [user]="user" />
}

<!-- ✅ Track by unique identity -->
@for (user of users(); track user.id) {
  <app-user-card [user]="user" />
}
```

#### 4. Large component trees with Default CD

```
Root
├── Dashboard (100 widgets)
│   ├── Widget1
│   │   ├── Chart
│   │   └── Controls
│   ├── Widget2
│   ...
│   └── Widget100
```

A single button click checks 200+ components. **Fix**: Use OnPush on every widget.

### Performance Optimization Strategies

| Strategy | Impact | Effort |
|----------|--------|--------|
| **OnPush everywhere** | High — skips unchanged subtrees | Low–Medium |
| **Signals for state** | High — granular dirty-marking | Medium |
| **Pure pipes** | Medium — memoized by Angular | Low |
| **trackBy / track** | Medium — avoids DOM recreation | Low |
| **runOutsideAngular** | High — eliminates unnecessary CD | Medium |
| **detach()** | High — removes from CD tree | High (manual management) |
| **Virtual scrolling** | High — limits rendered DOM nodes | Medium |
| **Lazy loading** | Indirect — fewer components in tree | Medium |
| **@defer blocks** | Medium — delays component loading | Low |

### Measuring Change Detection Performance

```typescript
// 1. Angular DevTools profiler — shows CD cycles and component check times

// 2. Custom profiling with NgZone hooks
export class AppComponent {
  private ngZone = inject(NgZone);

  constructor() {
    let cdCount = 0;
    this.ngZone.onStable.subscribe(() => {
      cdCount++;
      console.log(`CD cycles: ${cdCount}`);
    });
  }
}

// 3. ngDoCheck counter
@Component({ ... })
export class ProfiledComponent {
  private checkCount = 0;

  ngDoCheck() {
    this.checkCount++;
    console.log(`${this.constructor.name} checked ${this.checkCount} times`);
  }
}
```

---

## 7. Signals and Their Impact on Change Detection

### What Are Signals?

Signals are Angular's **reactive primitive** (introduced in Angular 16, refined through 17–21) that provide **fine-grained reactivity** without Zone.js.

```typescript
// Writable signal
const count = signal(0);
count();       // Read: 0
count.set(5);  // Write: 5
count.update(v => v + 1);  // Update: 6

// Computed signal (derived, read-only, lazy, memoized)
const doubled = computed(() => count() * 2);  // 12

// Effect (side effect when dependencies change)
effect(() => {
  console.log(`Count is now: ${count()}`);
});
```

### How Signals Change CD

**Before signals (Zone.js model)**:
1. Something async happens
2. Zone.js notifies Angular
3. Angular checks EVERY component (or every OnPush-dirty component)
4. For each component, evaluate ALL template bindings

**With signals**:
1. A signal value changes
2. Angular knows EXACTLY which components read that signal
3. Only those components are marked dirty
4. Within those components, only signal-based bindings are re-evaluated

```
                 Zone.js Model              Signals Model
               ┌─────────────┐           ┌─────────────┐
Trigger:       │ Any async op │           │ signal.set() │
               └──────┬──────┘           └──────┬──────┘
                      │                         │
Notification:  │ Zone → tick() │           │ Direct mark  │
               └──────┬──────┘           └──────┬──────┘
                      │                         │
Scope:         │ All components│           │ Only readers │
               └──────┬──────┘           └──────┬──────┘
                      │                         │
Check:         │ All bindings  │           │ Signal binds │
               └──────────────┘           └─────────────┘
```

### Signal-Based Component Patterns

```typescript
@Component({
  selector: 'app-product',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>{{ product().name }}</h2>
    <p>Price: {{ formattedPrice() }}</p>
    <p>In stock: {{ product().stock > 0 ? 'Yes' : 'No' }}</p>
    <button (click)="addToCart()">Add to Cart</button>
    <p>Cart items: {{ cartCount() }}</p>
  `
})
export class ProductComponent {
  product = input.required<Product>();

  private cartService = inject(CartService);
  cartCount = this.cartService.itemCount;  // Signal from service

  formattedPrice = computed(() =>
    `$${this.product().price.toFixed(2)}`
  );

  addToCart() {
    this.cartService.add(this.product());
  }
}
```

### Signal Inputs, Outputs, Model

```typescript
// Signal input (read-only signal from parent)
name = input<string>('default');         // InputSignal<string>
name = input.required<string>();         // Required input

// Signal output (replaces @Output + EventEmitter)
saved = output<User>();                  // OutputEmitterRef<User>
saved.emit(user);                        // Emit value

// Model input (two-way binding signal)
checked = model<boolean>(false);         // ModelSignal<boolean>
// Parent: <app-toggle [(checked)]="isOn" />
```

### computed() — Memoized Derived State

```typescript
const items = signal<Item[]>([]);
const filter = signal<string>('');

// Only re-computes when items() or filter() actually change
const filteredItems = computed(() => {
  const f = filter().toLowerCase();
  return items().filter(item =>
    item.name.toLowerCase().includes(f)
  );
});

// Reading filteredItems() multiple times in the same CD cycle
// only computes once (memoized)
```

### effect() — Side Effects

```typescript
// Runs when any signal read inside changes
effect(() => {
  const user = currentUser();
  if (user) {
    localStorage.setItem('lastUser', JSON.stringify(user));
  }
});

// With cleanup
effect((onCleanup) => {
  const id = setInterval(() => pollStatus(), 5000);
  onCleanup(() => clearInterval(id));
});

// Untracked reads (don't create dependency)
effect(() => {
  const items = this.items();
  const config = untracked(() => this.config());  // Won't re-run when config changes
  this.processItems(items, config);
});
```

### Signal Equality

```typescript
// Default: Object.is (referential equality)
const user = signal({ name: 'Alice' });
user.set({ name: 'Alice' });  // Different reference → signal updates

// Custom equality
const user = signal({ name: 'Alice' }, {
  equal: (a, b) => a.name === b.name
});
user.set({ name: 'Alice' });  // Same name → signal does NOT update
```

### Signals vs Observables

| Aspect | Signals | Observables (RxJS) |
|--------|---------|-------------------|
| **Nature** | Synchronous, always has a value | Asynchronous, push-based stream |
| **Reading** | `signal()` — pull current value | `.subscribe()` — push values over time |
| **Glitch-free** | Yes (computed resolves before read) | No (combineLatest can emit intermediate states) |
| **Lazy** | computed is lazy | Depends on operator |
| **Memory** | Auto-tracked by Angular | Must manage subscriptions |
| **Async ops** | Use `toSignal()` / `rxResource` | Native (HTTP, events, WebSocket) |
| **Best for** | Synchronous derived state, UI bindings | Async streams, event composition, complex async |

### Interop: toSignal() and toObservable()

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal
const users$ = inject(UserService).getUsers();
const users = toSignal(users$, { initialValue: [] });
// Now use users() in templates directly

// Signal → Observable
const searchTerm = signal('');
const searchTerm$ = toObservable(this.searchTerm);
// Now pipe through RxJS operators
const results$ = searchTerm$.pipe(
  debounceTime(300),
  switchMap(term => this.searchService.search(term))
);
```

---

## 8. Zoneless Angular

### What Is Zoneless?

Angular 21 supports running **without Zone.js entirely** (`provideExperimentalZonelessChangeDetection()`). In zoneless mode, CD is triggered only by:

- Signal changes (auto-detected)
- `ChangeDetectorRef.markForCheck()`
- `ChangeDetectorRef.detectChanges()`
- Async pipe (internally calls `markForCheck()`)
- Component events (click handlers, etc.)

### Enabling Zoneless

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

```json
// angular.json — remove zone.js polyfill
{
  "polyfills": []  // Remove "zone.js"
}
```

### Zoneless Benefits

| Benefit | Detail |
|---------|--------|
| **Smaller bundle** | ~35KB less (no zone.js) |
| **Better performance** | No monkey-patching overhead, no unnecessary CD |
| **Cleaner stack traces** | No zone.js frames in error stacks |
| **SSR performance** | Faster server-side rendering |
| **Third-party compat** | No interference with native Promises, etc. |
| **Predictable** | CD only when you explicitly cause it |

### Zoneless Gotchas

```typescript
// ❌ This WON'T trigger CD in zoneless mode
@Component({
  template: `<p>{{ count }}</p>`
})
export class BrokenComponent {
  count = 0;

  ngOnInit() {
    setTimeout(() => {
      this.count++;  // No Zone.js to catch this!
      // DOM won't update
    }, 1000);
  }
}

// ✅ Use signals
@Component({
  template: `<p>{{ count() }}</p>`
})
export class FixedComponent {
  count = signal(0);

  constructor() {
    setTimeout(() => {
      this.count.update(c => c + 1);  // Signal notifies Angular
    }, 1000);
  }
}
```

### Migration Path: Zone.js → Zoneless

1. **Use OnPush everywhere** — stops relying on default CD
2. **Replace mutable state with signals** — `signal()`, `computed()`
3. **Replace `@Input()` with `input()`** — signal inputs
4. **Replace `@Output()` with `output()`** — signal outputs
5. **Audit uses of setTimeout/setInterval** — ensure they use signals or `markForCheck()`
6. **Switch to zoneless** — `provideExperimentalZonelessChangeDetection()`
7. **Remove zone.js from polyfills** — bundle size win
8. **Test thoroughly** — especially third-party integrations

---

## 9. Mental Models & Quick-Reference Tables

### Mental Model: CD as a Tree Walk

```
Think of CD as a mail carrier delivering mail (updates) to houses (components):

Default strategy:  Mail carrier visits EVERY house on EVERY route, EVERY day.
OnPush strategy:   Mail carrier only visits houses that have a flag up (dirty).
Signals:           Houses have smart mailboxes that notify the carrier directly.
Zoneless:          No mail carrier route — houses just have smart mailboxes.
```

### Mental Model: Dirty Marking

```
markForCheck():   "I changed! Tell everyone up to the postmaster!"
                  Component → Parent → ... → Root (all marked dirty)

detectChanges():  "I changed! Check me and my kids right NOW!"
                  Component → Child → ... (synchronous, downward only)

detach():         "Take me off the mail route. I'll check my own mail."
                  Component removed from CD tree entirely
```

### Quick-Reference: What Triggers CD?

| Trigger | Default | OnPush | Zoneless |
|---------|---------|--------|----------|
| DOM event in template | ✅ | ✅ | ✅ |
| setTimeout/setInterval | ✅ (Zone) | ✅ (Zone) | ❌ |
| HTTP response | ✅ (Zone) | ❌ (unless async pipe) | ❌ |
| Promise resolution | ✅ (Zone) | ✅ (Zone) | ❌ |
| Signal change | ✅ | ✅ (marks dirty) | ✅ |
| Input reference change | ✅ | ✅ | ✅ |
| Object mutation | ✅ (detected) | ❌ | ❌ |
| async pipe emission | ✅ | ✅ | ✅ |
| markForCheck() | ✅ | ✅ | ✅ |
| detectChanges() | ✅ | ✅ | ✅ |

### Quick-Reference: Choosing a CD Strategy

```
Is your app small / prototype?
  └── Yes → Default strategy is fine
  └── No
       ├── Can you use signals for all state?
       │   └── Yes → OnPush + Signals → Consider Zoneless
       │   └── No  → OnPush + Observables + async pipe
       └── Do you have high-frequency events (animation, drag)?
           └── Yes → runOutsideAngular() + manual CD
           └── No  → OnPush is sufficient
```

### Quick-Reference: ChangeDetectorRef Decision

```
Need to update UI from outside Angular zone?
  └── Use ngZone.run() or detectChanges()

Using OnPush and subscribing to Observables manually?
  └── Use markForCheck() in subscribe (or use async pipe)

Component rarely changes (e.g., static widget)?
  └── Use detach() + manual detectChanges()

Need immediate, synchronous DOM update?
  └── Use detectChanges()

Need to batch updates with the next tick?
  └── Use markForCheck()
```

### Performance Checklist

- [ ] All components use `ChangeDetectionStrategy.OnPush`
- [ ] State managed with `signal()` and `computed()`
- [ ] No function calls in templates (use pipes or computed signals)
- [ ] All `@for` loops use `track` with unique identity
- [ ] High-frequency events run outside Angular zone
- [ ] Observables consumed via `async` pipe or `toSignal()`
- [ ] No unnecessary `detectChanges()` calls
- [ ] Large lists use virtual scrolling (`@angular/cdk/scrolling`)
- [ ] Heavy components use `@defer` for lazy rendering
- [ ] Bundle analyzed for unnecessary imports

---

## 10. Zoneless Angular — Deep Dive (Angular 21)

> Section 8 introduced zoneless basics. This section covers the **internal scheduler, migration patterns, and production-readiness** details specific to Angular 21.

### Zoneless Scheduler Architecture

In zoneless mode, Angular replaces Zone.js's task-tracking with a **notification-based scheduler**. The key internal is the `ChangeDetectionScheduler`:

```
Signal.set() / Signal.update()
        ↓
Reactive graph marks consumers dirty
        ↓
ChangeDetectionScheduler.notify()
        ↓
Scheduler coalesces notifications
        ↓
Schedules ApplicationRef.tick() via microtask
        ↓
tick() traverses dirty components only
        ↓
DOM updated
```

```typescript
// Simplified internal scheduler logic
class ChangeDetectionScheduler {
  private pending = false;

  notify() {
    if (!this.pending) {
      this.pending = true;
      // Coalesce: schedule ONE tick per microtask turn
      queueMicrotask(() => {
        this.pending = false;
        this.appRef.tick();
      });
    }
  }
}
```

### What Triggers the Zoneless Scheduler?

| Trigger | Notifies Scheduler? | Notes |
|---------|---------------------|-------|
| `signal.set()` / `signal.update()` | Yes | Direct reactive notification |
| `computed()` dependency change | Yes (if template reads it) | Propagates through graph |
| Template DOM event `(click)` etc. | Yes | Angular event handler wraps with `markForCheck()` |
| `markForCheck()` | Yes | Explicitly marks component + schedules tick |
| `detectChanges()` | Immediate (sync) | Bypasses scheduler, runs NOW |
| `setTimeout` / `setInterval` callback | **NO** | No Zone.js to intercept |
| `Promise.then()` callback | **NO** | No Zone.js to intercept |
| `fetch` / `HttpClient` subscribe | **NO** (unless using signals/async pipe) | Must use `toSignal()` or `markForCheck()` |
| `async` pipe emission | Yes | Calls `markForCheck()` internally |
| `toSignal()` emission | Yes | Sets internal signal → notifies |

### provideZonelessChangeDetection() — Angular 21 Status

```typescript
import { provideZonelessChangeDetection } from '@angular/core';

// Angular 21: graduated from experimental
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection()
    // Note: provideExperimentalZonelessChangeDetection() still works as alias
  ]
});
```

Angular 21 refinements:
- **Stable API**: `provideZonelessChangeDetection()` is no longer marked experimental
- **Improved scheduler coalescing**: Multiple signal writes in the same synchronous block produce ONE CD cycle
- **Better SSR support**: Zoneless SSR uses `whenStable()` based on pending async operations tracked via `PendingTasks`
- **Testing utilities**: `TestBed` works without zone.js; `fixture.detectChanges()` still works

### Zoneless SSR — PendingTasks

Without Zone.js, Angular can't track pending tasks for SSR stability. Angular 21 provides `PendingTasks`:

```typescript
import { PendingTasks } from '@angular/core';

@Component({ ... })
export class DataComponent {
  private pendingTasks = inject(PendingTasks);

  async loadData() {
    // Tell Angular "I have pending async work"
    const cleanup = this.pendingTasks.add();
    try {
      const data = await fetch('/api/data').then(r => r.json());
      this.data.set(data);
    } finally {
      cleanup();  // "I'm done" — SSR can now serialize
    }
  }
}

// resource() and rxResource() handle this automatically
```

### afterRender / afterNextRender in Zoneless

These APIs work identically in zoneless because they hook into Angular's CD cycle, not Zone.js:

```typescript
@Component({ ... })
export class ChartComponent {
  data = input.required<number[]>();

  constructor() {
    // Runs after every CD cycle that checks this component
    afterRender(() => {
      this.renderChart(this.data());
    });

    // Runs once after the next CD cycle
    afterNextRender(() => {
      this.initializeD3();
    });
  }
}
```

### Zoneless Testing

```typescript
// test.config.ts — Configure TestBed without Zone.js
import { provideZonelessChangeDetection } from '@angular/core';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()]
  });
});

it('should update on signal change', async () => {
  const fixture = TestBed.createComponent(MyComponent);
  fixture.detectChanges();  // Initial render

  fixture.componentInstance.count.set(5);

  // In zoneless, must trigger CD manually in tests:
  fixture.detectChanges();
  // OR wait for automatic scheduler:
  await fixture.whenStable();

  expect(fixture.nativeElement.textContent).toContain('5');
});
```

---

## 11. Signal Reactive Graph Internals

### Producer-Consumer Model

Angular's signal system uses a **producer-consumer reactive graph**:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  signal(0)   │────▶│ computed(...)  │────▶│  Component   │
│  (Producer)  │     │ (Consumer +   │     │  Template    │
│              │     │  Producer)    │     │  (Consumer)  │
└──────────────┘     └──────────────┘     └──────────────┘
     writes               reads+derives        reads
```

- **Producers**: Writable signals (`signal()`), signal inputs (`input()`)
- **Consumers**: `computed()`, `effect()`, component templates
- **Hybrid**: `computed()` is both consumer (reads sources) and producer (provides derived value)

### How Signal Dirty-Marking Works Internally

```
Step 1: signal.set(newValue)
  └── Compare with equality fn → value changed?
      └── Yes → Mark signal as DIRTY
          └── For each consumer (computed, template view):
              └── Mark consumer as POTENTIALLY_DIRTY
                  └── If consumer is a component view:
                      └── Schedule CD for that component

Step 2: Scheduler fires ApplicationRef.tick()
  └── For each POTENTIALLY_DIRTY view:
      └── Re-evaluate signal reads
          └── If actual values changed → update DOM
          └── If not → skip (glitch prevention)
```

### The DIRTY vs POTENTIALLY_DIRTY Distinction

```typescript
const source = signal(1);
const derived = computed(() => source() > 5 ? 'high' : 'low');
// Template: {{ derived() }}

source.set(2);
// source: DIRTY
// derived: POTENTIALLY_DIRTY (source changed, but derived might not)
// component: POTENTIALLY_DIRTY

// When CD runs and reads derived():
// derived re-computes: source() is 2 → 'low' (same as before!)
// derived: CLEAN (value didn't actually change)
// component DOM: NOT UPDATED (optimization!)

source.set(10);
// source: DIRTY
// derived: POTENTIALLY_DIRTY
// When CD runs: derived() → 'high' (different!) → DOM UPDATED
```

This two-phase checking prevents unnecessary DOM updates when intermediate computeds don't actually change.

### Signal Graph — Multi-Component Propagation

```typescript
// Service (shared state)
@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>([]);
  totalPrice = computed(() =>
    this.items().reduce((sum, i) => sum + i.price * i.qty, 0)
  );
  itemCount = computed(() =>
    this.items().reduce((sum, i) => sum + i.qty, 0)
  );
}

// Component A reads itemCount() in template
// Component B reads totalPrice() in template
// Component C reads items() in template

// When items.update(...):
// → items: DIRTY
// → totalPrice: POTENTIALLY_DIRTY → Component B: scheduled
// → itemCount: POTENTIALLY_DIRTY → Component A: scheduled
// → Component C: scheduled (directly reads items)
//
// Components D, E, F (don't read any cart signals): NOT scheduled
```

### Signal Writes During CD — The allowSignalWrites Flag

```typescript
// By default, effects cannot write signals during CD
effect(() => {
  const count = this.items().length;
  this.itemCount.set(count);  // ❌ Error in production: signal write during CD
});

// Opt-in: explicitly allow (use sparingly)
effect(() => {
  const count = this.items().length;
  this.itemCount.set(count);
}, { allowSignalWrites: true });  // ✅ Allowed, but triggers additional CD

// Better pattern: use computed() instead
itemCount = computed(() => this.items().length);  // ✅ No write needed
```

---

## 12. resource() and rxResource() — Async Data Loading & CD

### The resource() API (Angular 19+)

`resource()` provides a declarative way to load async data that integrates directly with signals and change detection:

```typescript
import { resource, signal } from '@angular/core';

@Component({
  template: `
    @if (userResource.isLoading()) {
      <p>Loading...</p>
    }
    @if (userResource.value(); as user) {
      <p>{{ user.name }}</p>
    }
    @if (userResource.error(); as err) {
      <p>Error: {{ err.message }}</p>
    }
  `
})
export class UserComponent {
  userId = signal(1);

  // Automatically re-fetches when userId() changes
  userResource = resource({
    request: () => ({ id: this.userId() }),  // Reactive request
    loader: async ({ request }) => {
      const response = await fetch(`/api/users/${request.id}`);
      return response.json();
    }
  });

  // Change the user → resource auto-reloads → CD auto-updates
  loadNextUser() {
    this.userId.update(id => id + 1);
  }
}
```

### How resource() Triggers CD

```
userId.set(2)
    ↓
resource detects request signal changed
    ↓
Cancels previous request (AbortController)
    ↓
Sets isLoading signal → true
    ↓
Component marked dirty (reads isLoading in template)
    ↓
CD runs → shows "Loading..."
    ↓
Fetch completes → resource sets value signal
    ↓
Component marked dirty again
    ↓
CD runs → shows user data
```

Key CD behaviors:
- `resource.value()` — signal, marks component dirty on change
- `resource.isLoading()` — signal, marks component dirty on change
- `resource.error()` — signal, marks component dirty on change
- `resource.status()` — signal (ResourceStatus enum)
- **Works zoneless**: All state is signal-based, no Zone.js needed
- **SSR-aware**: Integrates with `PendingTasks` automatically

### rxResource() — Observable Version

```typescript
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

@Component({ ... })
export class ProductListComponent {
  private http = inject(HttpClient);
  category = signal('electronics');

  products = rxResource({
    request: () => ({ cat: this.category() }),
    loader: ({ request }) =>
      this.http.get<Product[]>(`/api/products?category=${request.cat}`)
  });
}
```

`rxResource()` is identical to `resource()` in CD behavior, but accepts an Observable-returning loader instead of a Promise.

### resource() vs toSignal() vs async Pipe for CD

| Aspect | `resource()` | `toSignal()` | `async` pipe |
|--------|-------------|-------------|-------------|
| **Reactive reload** | Yes (watches request signal) | No (subscribes once) | No |
| **Loading state** | Built-in `isLoading()` | Manual | Manual |
| **Error handling** | Built-in `error()` | `{ rejectErrors: true }` | Manual |
| **Cancellation** | AbortController built-in | Must unsubscribe | Unsubscribes on destroy |
| **Zoneless** | Yes (all signals) | Yes (sets signal) | Yes (markForCheck) |
| **SSR** | PendingTasks auto-managed | Not tracked | Not tracked |
| **Best for** | Data that reloads on param change | One-time Observable → Signal | Template-only consumption |

---

## 13. linkedSignal — Advanced CD Patterns

### How linkedSignal Interacts with CD

```typescript
import { signal, computed, linkedSignal } from '@angular/core';

@Component({
  template: `
    <select (change)="selectedCategory.set($any($event.target).value)">
      @for (cat of categories(); track cat) {
        <option>{{ cat }}</option>
      }
    </select>

    <select (change)="selectedProduct.set($any($event.target).value)">
      @for (p of productsInCategory(); track p) {
        <option>{{ p }}</option>
      }
    </select>

    <p>Selected: {{ selectedProduct() }}</p>
  `
})
export class CascadingDropdownComponent {
  categories = signal(['Electronics', 'Furniture', 'Books']);
  selectedCategory = signal('Electronics');

  productsInCategory = computed(() => {
    const cat = this.selectedCategory();
    return PRODUCTS.filter(p => p.category === cat).map(p => p.name);
  });

  // linkedSignal: resets to first product when category changes
  selectedProduct = linkedSignal({
    source: this.productsInCategory,
    computation: (products) => products[0] ?? ''
  });

  // CD flow when category changes:
  // 1. selectedCategory signal: DIRTY
  // 2. productsInCategory computed: POTENTIALLY_DIRTY → recomputes → new list
  // 3. selectedProduct linkedSignal: auto-resets to products[0]
  // 4. Template reads all three → component marked dirty → one CD cycle
  //
  // CD flow when user manually selects a product:
  // 5. selectedProduct.set('Keyboard') — writable, so this works
  // 6. Only selectedProduct changed → minimal CD
}
```

### linkedSignal vs computed for CD

| Scenario | `computed()` | `linkedSignal()` |
|----------|-------------|-----------------|
| User overrides value | Not possible (read-only) | Yes — writable |
| Source changes | Always recomputes | Resets to computation result |
| CD notification | Only if result differs | On reset AND on manual set |
| Use case | Pure derivation | Derived default with user override |

---

## 14. Comprehensive CD Flow Diagrams

### Flow 1: Zone.js + Default Strategy

```
User clicks button
    ↓
Zone.js intercepts addEventListener callback
    ↓
Click handler executes: this.name = 'Bob'
    ↓
Handler completes → Zone.js onMicrotaskEmpty fires
    ↓
ApplicationRef.tick()
    ↓
Root component: check all bindings
    ├── Child A: check all bindings
    │   ├── Grandchild A1: check all bindings
    │   └── Grandchild A2: check all bindings
    ├── Child B: check all bindings
    └── Child C: check all bindings
    ↓
(Dev mode: run entire tree check again for ExpressionChanged errors)
    ↓
DOM stable
```

### Flow 2: Zone.js + OnPush + Signals

```
User clicks button in Component B
    ↓
Zone.js intercepts callback
    ↓
Handler: this.items.update(i => [...i, newItem])
    ↓
Signal graph:
  items → DIRTY
  filteredItems (computed) → POTENTIALLY_DIRTY
  itemCount (computed) → POTENTIALLY_DIRTY
    ↓
Components reading these signals: B, Header → marked dirty
    ↓
Ancestors of dirty components: Root → marked dirty
    ↓
ApplicationRef.tick()
    ↓
Root: dirty → check
    ├── Header: dirty → check (reads itemCount)
    │   └── Nav: NOT dirty → SKIP
    ├── Component A: NOT dirty → SKIP (entire subtree)
    ├── Component B: dirty → check
    │   └── Component B1: inputs changed → check
    └── Footer: NOT dirty → SKIP
    ↓
DOM stable — only 4 of 8 components checked
```

### Flow 3: Zoneless + Signals (Angular 21)

```
User clicks button (Angular event binding)
    ↓
Angular event handler (no Zone.js involved)
    ↓
Handler: this.count.update(c => c + 1)
    ↓
Signal graph:
  count → DIRTY
  doubleCount (computed) → POTENTIALLY_DIRTY
    ↓
ChangeDetectionScheduler.notify()
    ↓
Scheduler coalesces (deduplicates) in same microtask
    ↓
queueMicrotask → ApplicationRef.tick()
    ↓
Only components that read count/doubleCount are checked
    ↓
DOM updated — MINIMAL work
    ↓
No Zone.js overhead, no monkey-patching, no tree traversal
```

### Flow 4: Zoneless + resource() (Async Data)

```
Component initializes → resource() created
    ↓
resource reads request signal: userId()
    ↓
resource.isLoading.set(true) → Component dirty → CD → "Loading..."
    ↓
fetch() starts (no Zone.js interception)
    ↓
fetch completes → resource.value.set(data) → Component dirty → CD → shows data
    ↓
userId.set(2) → resource detects request change
    ↓
Previous fetch cancelled (AbortController.abort())
    ↓
resource.isLoading.set(true) → Component dirty → CD → "Loading..."
    ↓
New fetch completes → resource.value.set(newData) → Component dirty → CD
```

---

*Next: Phase 2 — RxJS & Reactive Programming*
