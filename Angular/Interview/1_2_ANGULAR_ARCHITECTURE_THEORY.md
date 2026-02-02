# Angular Architecture & Core Concepts — In-Depth Theory

> **Phase 1, Topic 2** of the Angular Preparation Roadmap
> Target audience: 10+ year senior developers preparing for FAANG Staff / Principal / Architect-level interviews
> Angular version context: Angular 21 (standalone-first, signals, zoneless-ready)

---

## Table of Contents

1. [Application Bootstrap Process](#1-application-bootstrap-process)
2. [Module System (NgModule vs Standalone Components)](#2-module-system)
3. [Component Lifecycle Hooks](#3-component-lifecycle-hooks)
4. [View Encapsulation Strategies](#4-view-encapsulation-strategies)
5. [Component Communication Patterns](#5-component-communication-patterns)
6. [Template Syntax and Binding Mechanisms](#6-template-syntax-and-binding-mechanisms)

---

## 1. Application Bootstrap Process

### 1.1 What Happens When an Angular App Starts

The bootstrap process is the sequence of steps Angular executes from the moment the browser loads `index.html` to the moment the first component is rendered on screen. Understanding this at depth is critical for debugging startup issues, optimizing initial load, and making architectural decisions about SSR and lazy loading.

#### The Complete Sequence

```
main.js: your actual Angular app entry point (bootstrap application)
polyfills.js: the browser compatibility translator (zone.js,)
runtime.js: The loader brain (Webpack/CLI runtime) - lazyload
  - how to load chunks lazily
  - how to resolve dependencies
  - how to start execution order

Browser loads index.html
  → <script> tags load bundled JS (main.js, polyfills.js, runtime.js)
    → main.ts executes
      → bootstrapApplication(AppComponent, appConfig) is called
        → Angular creates the root injector (environment injector)
          → Platform providers are registered
            → Application providers from appConfig are registered
              → Angular compiles the root component (AOT = already compiled)
                → Angular creates the root component instance
                  → Angular inserts the component's DOM into <app-root>
                    → Change detection runs for the first time
                      → The app is interactive
```

#### main.ts — The Entry Point

```typescript
// Angular 21 standalone bootstrap (modern approach)
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

`bootstrapApplication` is the standalone-first API introduced in Angular 14 and now the default. It replaces the older `platformBrowserDynamic().bootstrapModule(AppModule)` pattern.

#### appConfig — Application Configuration

```typescript
// app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
  ]
};
```

The `ApplicationConfig` object replaces `@NgModule` metadata for application-wide configuration. It centralizes all root-level providers. This is the "provide functions" pattern — each Angular feature exposes a `provideXxx()` function instead of requiring module imports.

#### Legacy NgModule Bootstrap (Pre-Angular 14)

```typescript
// main.ts (legacy)
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

```typescript
// app.module.ts (legacy)
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]   // <-- tells Angular which component to bootstrap
})
export class AppModule {}
```

Key difference: In the legacy approach, the `bootstrap` array in `@NgModule` metadata specifies the root component. In the standalone approach, the root component is the first argument to `bootstrapApplication`.

### 1.2 AOT vs JIT Compilation and Bootstrap

| Aspect | AOT (Ahead-of-Time) | JIT (Just-in-Time) |
|--------|---------------------|---------------------|
| When compilation happens | Build time (ng build) | Runtime (in the browser) |
| Bundle includes | Pre-compiled factory code | Angular compiler + templates |
| Bundle size | Smaller | Larger (includes compiler) |
| Startup speed | Faster | Slower |
| Template errors | Caught at build time | Caught at runtime |
| Default since | Angular 9 (Ivy) | Was default before Angular 9 |
| Production use | Always | Never (dev only, deprecated) |

With AOT (the default since Angular 9 / Ivy), templates are compiled into efficient JavaScript instructions during the build. The browser never sees the raw HTML templates — it only executes the compiled render functions.

### 1.3 The Platform Concept

Angular's architecture separates the **platform** from the **application**:

- **Platform**: The environment where Angular runs (browser, server, web worker)
- **Application**: Your components, services, and business logic

```typescript
// Browser platform
import { bootstrapApplication } from '@angular/platform-browser';

// Server platform (for SSR)
import { bootstrapApplication } from '@angular/platform-server';
```

This separation is what makes Angular Universal (SSR) possible — the same application code runs on different platforms because platform-specific APIs (DOM manipulation, HTTP) are abstracted behind platform-agnostic interfaces.

### 1.4 Injector Hierarchy at Bootstrap

During bootstrap, Angular creates a layered injector hierarchy:

```
Platform Injector (shared across apps on the same page)
  └── Environment Injector (root — created by bootstrapApplication)
       ├── Your application providers (from appConfig)
       ├── Router providers
       ├── HttpClient providers
       └── Element Injectors (created per component/directive)
            ├── Component A's injector
            └── Component B's injector
```

The **environment injector** (formerly "module injector") holds singleton services. **Element injectors** are created per component instance and enable per-component provider scoping.

### 1.5 What `providedIn: 'root'` Really Does

```typescript
@Injectable({
  providedIn: 'root'
})
export class UserService { }
```

This tells Angular: "Register this service in the root environment injector, but **only if someone injects it**." This is **tree-shakable** — if no component or service injects `UserService`, it is excluded from the bundle entirely. This is a significant improvement over the legacy pattern of listing services in a module's `providers` array, which always included them in the bundle.

---

## 2. Module System

### 2.1 NgModule — The Legacy Architecture

NgModules were Angular's original mechanism for organizing an application into cohesive blocks. Every Angular application before v14 required at least one NgModule (the root module).

```typescript
@NgModule({
  declarations: [
    // Components, directives, and pipes that BELONG to this module
    ProductListComponent,
    ProductCardComponent,
    HighlightDirective,
    CurrencyFormatPipe,
  ],
  imports: [
    // Other modules whose exported items this module needs
    CommonModule,
    FormsModule,
    SharedModule,
  ],
  exports: [
    // Items from declarations that OTHER modules can use
    ProductListComponent,
  ],
  providers: [
    // Services scoped to this module's injector
    ProductService,
  ]
})
export class ProductModule { }
```

#### NgModule's Four Key Metadata Properties

| Property | Purpose | Gotcha |
|----------|---------|--------|
| `declarations` | Register components/directives/pipes | Each item can only be declared in ONE module |
| `imports` | Pull in other modules | Order can matter for provider overrides |
| `exports` | Make items available to importing modules | Must re-export imported modules if needed |
| `providers` | Register services | Creates a new injector if lazy-loaded |

#### The "declarations in only one module" Rule

A component, directive, or pipe can only belong to **one** NgModule. If two feature modules both need `SharedButtonComponent`, both must import a `SharedModule` that declares and exports it. This constraint was one of the main pain points that led to standalone components.

#### Lazy-Loaded Module Injectors

When a module is lazy-loaded via the router, Angular creates a **child environment injector**:

```typescript
// This creates a new injector scope
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
}
```

Services provided in a lazy-loaded module are **not** singletons across the entire app — they are scoped to that lazy-loaded boundary. This catches many developers off guard.

### 2.2 Standalone Components — The Modern Architecture

Standalone components, directives, and pipes were introduced in Angular 14 and are now the default and recommended approach in Angular 21.

```typescript
@Component({
  selector: 'app-product-card',
  standalone: true,  // optional in Angular 19+ (standalone is the default)
  imports: [CommonModule, RouterLink, CurrencyFormatPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss'
})
export class ProductCardComponent {
  product = input.required<Product>();
}
```

#### Key Differences from NgModule-based Components

| Aspect | NgModule Component | Standalone Component |
|--------|-------------------|---------------------|
| Registration | Declared in a module | Self-contained via `imports` |
| Dependencies | Inherited from module | Explicitly listed in `imports` |
| Reusability | Import the entire module | Import just the component |
| Tree-shaking | Module-level granularity | Component-level granularity |
| Mental model | "What module provides this?" | "What does this component need?" |

#### Why Standalone is Better

1. **Explicit dependencies**: Every component declares exactly what it uses. No hidden dependencies inherited from a module's `imports`.
2. **Better tree-shaking**: Unused standalone components are reliably removed from bundles.
3. **Simpler mental model**: No need to understand module boundaries, re-exports, or the "declared in one module" rule.
4. **Easier testing**: Fewer boilerplate imports in test configurations.

#### Standalone Routing

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'products',
    loadComponent: () => import('./products/product-list').then(m => m.ProductListComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  }
];
```

`loadComponent` lazy-loads a single standalone component. `loadChildren` lazy-loads a set of child routes. Both enable code splitting without NgModules.

### 2.3 Migration Strategy: NgModules to Standalone

Angular provides a schematic:

```bash
ng generate @angular/core:standalone
```

The recommended migration steps:
1. Convert individual components/directives/pipes to standalone
2. Remove unnecessary NgModules
3. Switch bootstrap from `bootstrapModule` to `bootstrapApplication`

In Angular 19+, `standalone: true` is the default, so you can omit it. Non-standalone components must explicitly set `standalone: false`.

---

## 3. Component Lifecycle Hooks

### 3.1 The Complete Lifecycle Hook Sequence

Angular components have a well-defined lifecycle managed by the framework. Hooks execute in a specific, deterministic order:

```
constructor()                     → Dependency injection happens here
  ↓
ngOnChanges(changes)              → Input bindings changed (before first ngOnInit too)
  ↓
ngOnInit()                        → Component initialized (called ONCE)
  ↓
ngDoCheck()                       → Custom change detection logic
  ↓
ngAfterContentInit()              → Content projection (<ng-content>) initialized (ONCE)
  ↓
ngAfterContentChecked()           → Content projection checked
  ↓
ngAfterViewInit()                 → Component view + child views initialized (ONCE)
  ↓
ngAfterViewChecked()              → Component view + child views checked
  ↓
[... subsequent change detection cycles repeat from ngOnChanges ...]
  ↓
ngOnDestroy()                     → Component is about to be removed
```

### 3.2 Each Hook in Detail

#### `constructor()`

**Not technically a lifecycle hook** — it's a TypeScript/JavaScript class constructor. But it's the first code that runs.

- **Use for**: Dependency injection only
- **Don't use for**: Anything that depends on inputs, the DOM, or child components
- **Why**: At construction time, `@Input()` values have not been set, the template has not been rendered, and child components don't exist yet

```typescript
export class ProductComponent {
  private readonly productService = inject(ProductService);

  // Angular 21 preferred pattern: inject() in field initializers
  // No constructor needed at all
}
```

#### `ngOnChanges(changes: SimpleChanges)`

Called **every time** one or more `@Input()` properties change, including before `ngOnInit`.

```typescript
export class ProductComponent implements OnChanges {
  @Input() productId!: string;
  @Input() category!: string;

  ngOnChanges(changes: SimpleChanges): void {
    // changes is a map of property names to SimpleChange objects
    if (changes['productId']) {
      const change = changes['productId'];
      console.log('Previous:', change.previousValue);
      console.log('Current:', change.currentValue);
      console.log('First change:', change.firstChange);

      this.loadProduct(change.currentValue);
    }
  }
}
```

**Critical gotchas**:
- For **objects and arrays**, `ngOnChanges` only fires when the **reference** changes, not when properties are mutated. `product.name = 'new'` won't trigger it; `product = { ...product, name: 'new' }` will.
- With signal inputs (`input()`), `ngOnChanges` does not fire. Use `effect()` or `computed()` instead.

#### `ngOnInit()`

Called **once** after the first `ngOnChanges`. This is where most initialization logic goes.

- **Use for**: Fetching data, setting up subscriptions, complex initialization
- **Why not constructor**: Inputs are available, the component is fully wired up

```typescript
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  products: Product[] = [];

  ngOnInit(): void {
    this.productService.getAll().subscribe(products => {
      this.products = products;
    });
  }
}
```

**With signals (modern Angular 21 pattern)**:

```typescript
export class ProductListComponent {
  private readonly productService = inject(ProductService);

  // Using a resource or rxResource — no ngOnInit needed
  products = rxResource({
    loader: () => this.productService.getAll()
  });
}
```

#### `ngDoCheck()`

Called during **every** change detection cycle. This hook lets you implement custom change detection logic.

- **Use for**: Detecting changes that Angular's default change detection misses (e.g., deep object mutations)
- **Caution**: Runs very frequently — keep logic minimal

```typescript
export class DeepCheckComponent implements DoCheck {
  @Input() data!: Record<string, unknown>;
  private previousData = '';

  ngDoCheck(): void {
    const currentData = JSON.stringify(this.data);
    if (currentData !== this.previousData) {
      this.previousData = currentData;
      this.onDataChanged();
    }
  }
}
```

#### `ngAfterContentInit()` and `ngAfterContentChecked()`

These relate to **content projection** — content placed between the component's tags that gets projected into `<ng-content>` slots.

```typescript
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content select="[card-header]"></ng-content>
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent implements AfterContentInit {
  @ContentChildren(CardItemComponent) items!: QueryList<CardItemComponent>;

  ngAfterContentInit(): void {
    // Safe to access projected content here
    console.log('Projected items:', this.items.length);
    this.items.changes.subscribe(() => {
      // React to dynamic changes in projected content
    });
  }
}
```

#### `ngAfterViewInit()` and `ngAfterViewChecked()`

These relate to the component's **own template** and its **child components**.

```typescript
@Component({
  selector: 'app-chart',
  template: `<canvas #chartCanvas></canvas>`
})
export class ChartComponent implements AfterViewInit {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    // Safe to access the DOM element here
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    this.renderChart(ctx);
  }
}
```

**Critical rule**: You cannot change data-bound properties inside `ngAfterViewInit` or `ngAfterViewChecked` in dev mode without triggering `ExpressionChangedAfterItHasBeenCheckedError`. Use `setTimeout()` or `ChangeDetectorRef.detectChanges()` if needed.

#### `ngOnDestroy()`

Called just before the component is removed from the DOM.

- **Use for**: Cleaning up subscriptions, detaching event listeners, invalidating caches, disconnecting from WebSockets

```typescript
export class LiveFeedComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.feedService.connect()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.handleData(data));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Modern Angular 21 pattern with `DestroyRef`**:

```typescript
export class LiveFeedComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly feedService = inject(FeedService);

  constructor() {
    this.feedService.connect().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.handleData(data));
  }
}
```

### 3.3 Lifecycle Hook Execution Order with Parent-Child

```
Parent constructor
Parent ngOnChanges
Parent ngOnInit
Parent ngDoCheck
Parent ngAfterContentInit
Parent ngAfterContentChecked
  Child constructor
  Child ngOnChanges
  Child ngOnInit
  Child ngDoCheck
  Child ngAfterContentInit
  Child ngAfterContentChecked
  Child ngAfterViewInit
  Child ngAfterViewChecked
Parent ngAfterViewInit
Parent ngAfterViewChecked
```

Key insight: **Parent's `ngAfterViewInit` runs AFTER children's `ngAfterViewInit`**. This is because the parent's view includes its children — so the view is only "initialized" once all children are initialized.

### 3.4 Signals and the Shift Away from Lifecycle Hooks

With Angular's signals API (v16+), many lifecycle hook use cases are replaced:

| Old Pattern | New Signal Pattern |
|-------------|-------------------|
| `ngOnChanges` for input tracking | `input()` + `effect()` or `computed()` |
| `ngOnInit` for data loading | `rxResource()` or field initializers with `inject()` |
| `ngOnDestroy` for cleanup | `DestroyRef` + `takeUntilDestroyed()` |
| `ngAfterViewInit` for DOM access | `viewChild()` signal + `effect()` |

```typescript
// Modern Angular 21 component — minimal lifecycle hooks
@Component({
  selector: 'app-product-detail',
  template: `
    @if (product.value(); as p) {
      <h2>{{ p.name }}</h2>
      <p>{{ p.description }}</p>
    } @else if (product.isLoading()) {
      <spinner />
    }
  `
})
export class ProductDetailComponent {
  productId = input.required<string>();

  private readonly productService = inject(ProductService);

  product = rxResource({
    request: () => this.productId(),
    loader: ({ request: id }) => this.productService.getById(id)
  });
}
```

---

## 4. View Encapsulation Strategies

### 4.1 The Problem View Encapsulation Solves

In a large application, CSS class names from one component can accidentally style elements in another component. View encapsulation prevents this by scoping styles to individual components.

### 4.2 The Three Strategies

#### `ViewEncapsulation.Emulated` (Default)

Angular rewrites component styles and DOM elements with unique attributes to scope styles.

```typescript
@Component({
  selector: 'app-button',
  encapsulation: ViewEncapsulation.Emulated,  // this is the default
  styles: [`
    .btn { background: blue; color: white; }
  `],
  template: `<button class="btn">Click me</button>`
})
```

What Angular actually generates:

```html
<!-- DOM -->
<button _ngcontent-abc-c42 class="btn">Click me</button>
```

```css
/* Rewritten CSS */
.btn[_ngcontent-abc-c42] { background: blue; color: white; }
```

The `_ngcontent-xxx` attribute is unique per component type. This ensures `.btn` in this component doesn't affect `.btn` in any other component.

**Key behaviors**:
- Component styles **do not leak out** to child components
- Global styles **do leak in** to the component
- `:host` selector targets the component's host element
- `::ng-deep` (deprecated) pierces encapsulation downward

#### `ViewEncapsulation.ShadowDom`

Uses the browser's native Shadow DOM API for true style isolation.

```typescript
@Component({
  selector: 'app-widget',
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [`
    .title { font-size: 24px; }
  `],
  template: `<h1 class="title">Widget</h1>`
})
```

What the browser creates:

```html
<app-widget>
  #shadow-root (open)
    <style>.title { font-size: 24px; }</style>
    <h1 class="title">Widget</h1>
</app-widget>
```

**Key behaviors**:
- True isolation — global styles do NOT leak in
- Component styles do NOT leak out
- CSS custom properties (variables) DO cross shadow boundaries
- Some third-party libraries may not work well inside Shadow DOM
- Event retargeting behavior changes

#### `ViewEncapsulation.None`

No encapsulation at all. Styles are added to the global stylesheet.

```typescript
@Component({
  selector: 'app-theme',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .global-title { font-size: 20px; color: red; }
  `]
})
```

**Use cases**:
- Global theme components
- Components that intentionally provide shared styles
- When you need to style deeply nested third-party components

**Risk**: Style collisions with other components using the same class names.

### 4.3 Comparison Matrix

| Feature | Emulated | ShadowDom | None |
|---------|----------|-----------|------|
| Global styles leak IN | Yes | No | Yes |
| Component styles leak OUT | No | No | Yes |
| `:host` works | Yes | Yes | No |
| `::ng-deep` works | Yes (deprecated) | No | N/A |
| Performance overhead | Attribute rewriting | Browser-native | None |
| Third-party CSS compat | Good | Can be problematic | Good |
| CSS variables cross boundary | Yes | Yes | Yes |

### 4.4 The `:host` Selector

The `:host` selector targets the component's **host element** itself (the custom element tag):

```typescript
@Component({
  selector: 'app-panel',
  styles: [`
    :host {
      display: block;
      padding: 16px;
      border: 1px solid #ccc;
    }

    :host(.active) {
      border-color: blue;
    }

    :host-context(.dark-theme) {
      background: #333;
      color: white;
    }
  `]
})
```

- `:host` — styles the host element
- `:host(.active)` — styles the host when it has the `active` class
- `:host-context(.dark-theme)` — styles the host when any ancestor has `dark-theme` class

### 4.5 `::ng-deep` — Deprecated but Still Used

```css
:host ::ng-deep .mat-input {
  font-size: 14px;
}
```

`::ng-deep` removes the scoping attribute from the rule that follows, allowing it to pierce into child components. It's deprecated with no direct replacement. Alternatives:
- Use CSS custom properties (variables) for theming
- Use `ViewEncapsulation.None` on a dedicated theme component
- Use global stylesheets for third-party component overrides

---

## 5. Component Communication Patterns

### 5.1 Overview of All Patterns

```
                    ┌──────────────────────┐
                    │   Communication       │
                    │     Patterns          │
                    └──────┬───────────────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   Parent ↔ Child    Sibling/Any      Global
   ─────────────    ────────────     ──────────
   @Input/@Output   Service+Subject   NgRx/Store
   Signal inputs    Signal Service    Signal Store
   ViewChild        Router params
   ContentChild     Injector tree
   Template vars
```

### 5.2 Parent → Child Communication

#### Classic `@Input()` Decorator

```typescript
// Parent template
<app-product-card [product]="selectedProduct" [highlighted]="true"></app-product-card>

// Child component
@Component({ selector: 'app-product-card', ... })
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() highlighted = false;
}
```

#### Signal Inputs (Angular 17+, Recommended)

```typescript
@Component({ selector: 'app-product-card', ... })
export class ProductCardComponent {
  // Required input — component won't compile without it
  product = input.required<Product>();

  // Optional input with default
  highlighted = input(false);

  // Computed values derived from inputs
  discountedPrice = computed(() =>
    this.product().price * (1 - this.product().discount)
  );
}
```

Signal inputs advantages over `@Input()`:
- Type-safe by default (no `!` assertion needed for required inputs)
- Works with `computed()` and `effect()` for reactive derivations
- No need for `ngOnChanges` — reactivity is built in
- Better change detection performance with signals

#### Input Transforms

```typescript
@Component({ ... })
export class ToggleComponent {
  // Automatically converts string "true"/"false" to boolean
  disabled = input(false, { transform: booleanAttribute });

  // Converts string numbers to actual numbers
  count = input(0, { transform: numberAttribute });
}
```

```html
<!-- These string attributes are auto-converted -->
<app-toggle disabled count="5"></app-toggle>
```

#### Input Aliasing

```typescript
// The input is called 'label' externally but 'buttonLabel' internally
buttonLabel = input('', { alias: 'label' });
```

### 5.3 Child → Parent Communication

#### Classic `@Output()` with EventEmitter

```typescript
// Child component
@Component({ selector: 'app-product-card', ... })
export class ProductCardComponent {
  @Output() addToCart = new EventEmitter<Product>();
  @Output() remove = new EventEmitter<void>();

  onAddClick(): void {
    this.addToCart.emit(this.product);
  }
}
```

```html
<!-- Parent template -->
<app-product-card
  [product]="p"
  (addToCart)="handleAddToCart($event)"
  (remove)="handleRemove()">
</app-product-card>
```

#### Output Function (Angular 17+)

```typescript
@Component({ selector: 'app-product-card', ... })
export class ProductCardComponent {
  product = input.required<Product>();
  addToCart = output<Product>();
  remove = output<void>();

  onAddClick(): void {
    this.addToCart.emit(this.product());
  }
}
```

#### Using `@ViewChild` for Imperative Access

```typescript
// Parent component
@Component({
  template: `<app-timer #timer></app-timer>
             <button (click)="timer.start()">Start</button>`
})
export class ParentComponent {
  @ViewChild(TimerComponent) timer!: TimerComponent;

  resetTimer(): void {
    this.timer.reset();  // Direct method call on child
  }
}
```

Signal-based `viewChild` (Angular 17+):

```typescript
export class ParentComponent {
  timer = viewChild.required(TimerComponent);

  resetTimer(): void {
    this.timer().reset();
  }
}
```

### 5.4 Sibling and Cross-Component Communication

#### Shared Service with BehaviorSubject (Reactive)

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();
  readonly itemCount$ = this.items$.pipe(map(items => items.length));

  addItem(item: CartItem): void {
    const current = this.itemsSubject.getValue();
    this.itemsSubject.next([...current, item]);
  }

  removeItem(id: string): void {
    const current = this.itemsSubject.getValue();
    this.itemsSubject.next(current.filter(item => item.id !== id));
  }
}
```

#### Shared Service with Signals (Modern Angular 21)

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>([]);

  readonly items = this._items.asReadonly();
  readonly itemCount = computed(() => this._items().length);
  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  addItem(item: CartItem): void {
    this._items.update(items => [...items, item]);
  }

  removeItem(id: string): void {
    this._items.update(items => items.filter(i => i.id !== id));
  }
}
```

### 5.5 `@ContentChild` and `@ContentChildren`

Used to access projected content (content placed between component tags):

```typescript
// Usage
<app-tab-group>
  <app-tab label="Tab 1">Content 1</app-tab>
  <app-tab label="Tab 2">Content 2</app-tab>
</app-tab-group>

// TabGroupComponent
@Component({ selector: 'app-tab-group', ... })
export class TabGroupComponent implements AfterContentInit {
  @ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;

  ngAfterContentInit(): void {
    const firstTab = this.tabs.first;
    firstTab.active = true;

    // React to dynamic additions/removals
    this.tabs.changes.subscribe(() => {
      // Tabs were added or removed
    });
  }
}
```

### 5.6 Communication Pattern Selection Guide

| Scenario | Recommended Pattern |
|----------|-------------------|
| Parent passes config to child | Signal `input()` |
| Child notifies parent of events | `output()` / `@Output()` |
| Parent needs to call child methods | `viewChild()` / `@ViewChild` |
| Siblings share state | Shared service with signals |
| Deeply nested components | Service (avoid prop drilling) |
| App-wide state | Signal-based service or NgRx |
| Component composition | Content projection + `contentChildren()` |

---

## 6. Template Syntax and Binding Mechanisms

### 6.1 The Four Types of Data Binding

Angular provides four fundamental binding mechanisms:

```
Component Class  ──── Interpolation {{ }} ────→  Template (DOM)
                 ──── Property [ ] ───────────→
                 ←─── Event ( ) ──────────────
                 ←──→ Two-Way [( )] ──────────→
```

#### Interpolation `{{ expression }}`

Converts a TypeScript expression to a string and inserts it into the DOM:

```html
<h1>{{ title }}</h1>
<p>{{ getFullName() }}</p>
<span>{{ price | currency:'USD' }}</span>
<div>{{ condition ? 'Yes' : 'No' }}</div>
```

**What you CANNOT do in interpolation**:
- Assignments (`{{ x = 5 }}`)
- `new` keyword (`{{ new Date() }}`)
- Chained expressions with `;`
- Increment/decrement (`{{ i++ }}`)

#### Property Binding `[property]="expression"`

Binds a component property, element property, or directive input to an expression:

```html
<!-- Element property -->
<img [src]="imageUrl" [alt]="imageDescription">

<!-- Component input -->
<app-product [product]="selectedProduct">

<!-- Attribute binding (for attributes without DOM properties) -->
<td [attr.colspan]="columnSpan">

<!-- Class binding -->
<div [class.active]="isActive">
<div [class]="classExpression">

<!-- Style binding -->
<div [style.width.px]="containerWidth">
<div [style.background-color]="bgColor">
```

**Property vs Attribute**: HTML attributes initialize DOM properties. After initialization, properties can change but attributes stay the same. Angular binds to **properties**, not attributes. Use `[attr.xxx]` when there's no corresponding property (e.g., `colspan`, `aria-label`, `data-*`).

#### Event Binding `(event)="handler($event)"`

```html
<!-- DOM events -->
<button (click)="onSave()">Save</button>
<input (input)="onInput($event)" (keydown.enter)="onSubmit()">
<div (mouseenter)="onHover()" (mouseleave)="onLeave()">

<!-- Component output events -->
<app-search (searchChange)="onSearch($event)">

<!-- Key event filtering -->
<input (keydown.control.s)="onCtrlS($event)">
<input (keyup.escape)="onEscape()">
```

`$event` is the event payload — a DOM event for native events or the emitted value for component `@Output()` events.

#### Two-Way Binding `[(ngModel)]="property"`

Two-way binding is syntactic sugar combining property binding and event binding:

```html
<!-- This... -->
<input [(ngModel)]="username">

<!-- ...is equivalent to: -->
<input [ngModel]="username" (ngModelChange)="username = $event">
```

For custom components, the convention is:

```typescript
@Component({
  selector: 'app-counter',
  template: `<button (click)="increment()">{{ value }}</button>`
})
export class CounterComponent {
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();

  increment(): void {
    this.value++;
    this.valueChange.emit(this.value);
  }
}
```

```html
<!-- Two-way binding works because of the Input/Output naming convention -->
<app-counter [(value)]="count"></app-counter>
```

With signal model inputs (Angular 17+):

```typescript
export class CounterComponent {
  value = model(0);  // Creates a two-way bindable signal

  increment(): void {
    this.value.update(v => v + 1);  // Automatically emits to parent
  }
}
```

### 6.2 Control Flow Syntax (Angular 17+)

Angular 17 introduced a new built-in control flow syntax replacing structural directives:

#### `@if` / `@else if` / `@else`

```html
@if (user(); as u) {
  <h1>Welcome, {{ u.name }}</h1>
  @if (u.isAdmin) {
    <admin-panel />
  }
} @else if (isLoading()) {
  <loading-spinner />
} @else {
  <login-form />
}
```

#### `@for` with required `track`

```html
@for (product of products(); track product.id) {
  <app-product-card [product]="product" />
} @empty {
  <p>No products found.</p>
}
```

The `track` expression is **mandatory** (unlike `*ngFor`'s optional `trackBy`). It tells Angular how to identify each item for efficient DOM reuse. This prevents the common performance bug of forgetting `trackBy`.

Implicit variables available inside `@for`:
- `$index` — current index
- `$count` — total items
- `$first`, `$last` — boolean flags
- `$even`, `$odd` — boolean flags

```html
@for (item of items(); track item.id; let idx = $index, let isLast = $last) {
  <div [class.last-item]="isLast">{{ idx + 1 }}. {{ item.name }}</div>
}
```

#### `@switch`

```html
@switch (status()) {
  @case ('active') {
    <span class="badge green">Active</span>
  }
  @case ('pending') {
    <span class="badge yellow">Pending</span>
  }
  @case ('inactive') {
    <span class="badge red">Inactive</span>
  }
  @default {
    <span class="badge gray">Unknown</span>
  }
}
```

#### `@defer` — Lazy Loading Template Blocks

```html
@defer (on viewport) {
  <heavy-chart-component />
} @placeholder {
  <div class="chart-placeholder">Chart will load when visible</div>
} @loading (minimum 300ms) {
  <loading-spinner />
} @error {
  <p>Failed to load chart</p>
}
```

Deferral triggers:
- `on viewport` — element enters the viewport
- `on idle` — browser is idle
- `on interaction` — user interacts with a trigger element
- `on hover` — user hovers over a trigger element
- `on timer(2s)` — after a time delay
- `on immediate` — immediately (but still lazy-loaded)
- `when condition` — when a boolean expression becomes true

`@defer` is a game-changer for performance — it automatically code-splits the deferred component and its dependencies into a separate chunk.

### 6.3 Template Reference Variables

```html
<input #nameInput type="text">
<button (click)="greet(nameInput.value)">Greet</button>

<!-- Reference to a component instance -->
<app-timer #timer></app-timer>
<button (click)="timer.start()">Start Timer</button>

<!-- Reference with directive -->
<form #myForm="ngForm" (ngSubmit)="onSubmit(myForm)">
  ...
</form>
```

Template reference variables (`#var`) give you a reference to:
- A DOM element (if used on a plain HTML element)
- A component instance (if used on a component element)
- A directive instance (if you assign it, e.g., `#myForm="ngForm"`)

### 6.4 Pipes in Templates

```html
<!-- Built-in pipes -->
{{ today | date:'fullDate' }}
{{ price | currency:'EUR':'symbol':'1.2-2' }}
{{ name | uppercase }}
{{ data | json }}
{{ value | number:'1.0-2' }}
{{ items | slice:0:5 }}

<!-- Async pipe — subscribes and unsubscribes automatically -->
{{ data$ | async }}

<!-- Pipe chaining -->
{{ name | lowercase | titlecase }}
```

The `async` pipe is especially important — it:
1. Subscribes to an Observable or Promise
2. Returns the latest emitted value
3. Marks the component for change detection when a new value arrives
4. **Automatically unsubscribes** when the component is destroyed

### 6.5 Template Expression Constraints

Angular template expressions are intentionally limited compared to full TypeScript. They:
- Cannot use `import`
- Cannot use `new`
- Cannot use bitwise operators (except in Angular 17+ templates)
- Cannot assign values
- Cannot use optional chaining `?.` on the left side of assignments
- Should not have side effects (though this isn't enforced)

These restrictions exist because template expressions are evaluated on every change detection cycle. Side effects would lead to unpredictable behavior.

### 6.6 The Null Safety Operators

```html
<!-- Safe navigation (optional chaining) -->
{{ user?.address?.street }}

<!-- Non-null assertion (tells the compiler to trust you) -->
{{ user!.name }}
```

The safe navigation operator `?.` prevents `TypeError` when a property in a chain is `null` or `undefined`. The non-null assertion `!` suppresses TypeScript's strict null checks — use it sparingly and only when you're certain the value exists.

---

## Summary: Key Architectural Mental Models for FAANG Interviews

### 1. Angular is a Platform, Not Just a Framework
It provides a complete solution: DI, routing, forms, HTTP, testing utilities, SSR, PWA support, and a CLI. This is intentionally different from React's library approach.

### 2. Standalone-First is the Present and Future
NgModules are legacy. All new Angular development should use standalone components, `provideXxx()` functions, and `bootstrapApplication`. Know both patterns for interview discussions about migration.

### 3. Signals are Replacing RxJS for Synchronous State
Signals (v16+) provide fine-grained reactivity for synchronous state. RxJS remains essential for async operations, complex event streams, and HTTP. They complement each other.

### 4. The Component is the Fundamental Unit
Everything in Angular revolves around components. They have a lifecycle, encapsulated styles, declared dependencies, and structured communication patterns. Understanding components deeply means understanding Angular.

### 5. Template Syntax is Evolving
The new control flow (`@if`, `@for`, `@defer`) is cleaner, more performant, and enables features like mandatory `track` and deferred loading that weren't possible with structural directives.
