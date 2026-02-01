# Angular Architecture & Core Concepts — Interview Questions & Answers

> **Phase 1, Topic 2** of the Angular Preparation Roadmap
> 75 questions from beginner to expert, organized by subtopic
> Includes FAANG-style twisted/scenario questions at the end

---

## Table of Contents

1. [Application Bootstrap Process (Q1-Q12)](#section-1-application-bootstrap-process)
2. [Module System — NgModule vs Standalone (Q13-Q24)](#section-2-module-system)
3. [Component Lifecycle Hooks (Q25-Q38)](#section-3-component-lifecycle-hooks)
4. [View Encapsulation Strategies (Q39-Q48)](#section-4-view-encapsulation-strategies)
5. [Component Communication Patterns (Q49-Q60)](#section-5-component-communication-patterns)
6. [Template Syntax and Binding Mechanisms (Q61-Q72)](#section-6-template-syntax-and-binding-mechanisms)
7. [Cross-Topic Scenario Questions (Q73-Q82)](#section-7-cross-topic-scenario-questions)
8. [System Design / Architecture Questions (Q83-Q90)](#section-8-system-design-architecture-questions)

---

## Section 1: Application Bootstrap Process

### Q1. What happens step-by-step when an Angular application starts in the browser? (Beginner)

**Answer:**

1. The browser loads `index.html`, which contains a `<app-root>` placeholder and `<script>` tags
2. The JavaScript bundles (`main.js`, `polyfills.js`, `runtime.js`) are downloaded and executed
3. `main.ts` runs and calls `bootstrapApplication(AppComponent, appConfig)`
4. Angular creates the **platform injector** (shared across multiple apps on the same page, if any)
5. Angular creates the **root environment injector** with all providers from `appConfig`
6. If any `APP_INITIALIZER` providers exist, Angular executes them all in parallel and waits for all to complete
7. Angular instantiates the root component (`AppComponent`), running its constructor and injecting dependencies
8. Angular compiles the component's template (already pre-compiled with AOT) and creates the DOM
9. The DOM is inserted into the `<app-root>` element in `index.html`
10. The first change detection cycle runs, updating all bindings
11. The application is now interactive

---

### Q2. What is the difference between `bootstrapApplication()` and `platformBrowserDynamic().bootstrapModule()`? (Beginner)

**Answer:**

| Aspect | `bootstrapApplication()` | `bootstrapModule()` |
|--------|--------------------------|---------------------|
| API style | Standalone-first (Angular 14+) | NgModule-based (legacy) |
| Root entity | A standalone component | An NgModule class |
| Configuration | `ApplicationConfig` with `provideXxx()` functions | `@NgModule` metadata |
| Tree-shaking | Better (unused features excluded) | Worse (modules pull in everything) |
| Current status | **Recommended** (default in Angular 17+) | Legacy (still supported) |

`bootstrapApplication` takes a component and a config object. `bootstrapModule` takes an NgModule class that has a `bootstrap` array specifying the root component.

---

### Q3. What is `APP_INITIALIZER` and when would you use it? (Intermediate)

**Answer:**

`APP_INITIALIZER` is an injection token that allows you to run asynchronous initialization logic **before** Angular renders the application. Common use cases:

- Loading runtime configuration from a server (API URLs, feature flags)
- Checking authentication state / refreshing tokens
- Loading translations for i18n
- Initializing analytics or monitoring SDKs

```typescript
{
  provide: APP_INITIALIZER,
  useFactory: (configService: ConfigService) => () => configService.loadConfig(),
  deps: [ConfigService],
  multi: true,  // Important: allows multiple initializers
}
```

Key behaviors:
- Multiple initializers run **in parallel** (all Promises are resolved with `Promise.all`)
- Angular **blocks rendering** until all initializers resolve
- If any initializer **rejects**, the application fails to bootstrap and the error is caught by the `.catch()` on `bootstrapApplication`
- If an initializer **never resolves**, the app hangs indefinitely on the loading state — there is no built-in timeout

---

### Q4. What is the difference between AOT and JIT compilation? When does each happen? (Intermediate)

**Answer:**

**AOT (Ahead-of-Time):**
- Templates and styles are compiled into JavaScript during the **build** step (`ng build`)
- The browser receives pre-compiled render functions — no compilation at runtime
- Template syntax errors are caught at build time
- Smaller bundles (Angular compiler is not shipped)
- Faster startup (no compilation overhead)
- **Default since Angular 9 (Ivy)**

**JIT (Just-in-Time):**
- Templates are compiled in the **browser** at runtime
- Requires shipping the Angular compiler in the bundle (~1MB+)
- Template errors only appear at runtime
- Used historically for development (`ng serve` before Angular 9)
- Now effectively deprecated for application code

In modern Angular (9+), **AOT is always used**, even in development mode. JIT is only relevant for very specific use cases like dynamically compiling templates at runtime (which is rare and discouraged).

---

### Q5. Explain the Angular injector hierarchy created during bootstrap. (Intermediate)

**Answer:**

Angular creates a layered injector hierarchy:

```
1. Platform Injector
   - Created by the platform factory (browser, server)
   - Shared across multiple Angular apps on the same page
   - Contains platform-specific services

2. Root Environment Injector
   - Created by bootstrapApplication()
   - Contains: all providedIn: 'root' services + appConfig providers
   - Singletons live here

3. Route-Level Environment Injectors (optional)
   - Created when a route has its own `providers` array
   - Services scoped to that route and its children

4. Element Injectors (per component)
   - Created for each component/directive with a `providers` array
   - Short-lived: destroyed when the component is destroyed
   - Enable per-component service instances
```

Resolution order: Angular looks up from the element injector → parent element injectors → environment injector → root → platform. The first match wins.

---

### Q6. What does `providedIn: 'root'` do, and how does it enable tree-shaking? (Intermediate)

**Answer:**

`providedIn: 'root'` tells Angular to register the service in the root environment injector, but **only if the service is actually injected somewhere** in the application.

Tree-shaking works because the service registration is defined on the service class itself (via the decorator), not in a module's `providers` array. The build tool (Webpack/esbuild) can analyze the dependency graph:

- If no component or service imports/injects `UserService`, the class is never referenced
- The bundler removes it from the final bundle (tree-shaking)
- With the legacy `providers: [UserService]` pattern, the service was always included because the module explicitly referenced it

```typescript
// Tree-shakable:
@Injectable({ providedIn: 'root' })
export class UserService { }

// NOT tree-shakable (legacy):
@NgModule({
  providers: [UserService]  // Always included in the bundle
})
```

---

### Q7. What happens if `APP_INITIALIZER` throws an error? (Advanced)

**Answer:**

If any `APP_INITIALIZER` returns a Promise that rejects:

1. The `bootstrapApplication()` Promise rejects
2. The error is caught by the `.catch()` handler in `main.ts`
3. **The application does not render** — the user sees a blank page (or whatever the static `index.html` contains)
4. No Angular error handler is invoked because the app hasn't bootstrapped yet

This is why robust `APP_INITIALIZER` implementations should:
- Wrap logic in try/catch and provide fallback values
- Implement timeouts for network calls
- Show a static loading indicator in `index.html` that gets replaced when the app bootstraps

```typescript
// Robust pattern:
function initConfig(http: HttpClient): () => Promise<void> {
  return () => http.get('/config.json').pipe(
    timeout(5000),
    catchError(() => of(DEFAULT_CONFIG)),  // Fallback, don't block bootstrap
  ).toPromise();
}
```

---

### Q8. Can you have multiple Angular applications on the same page? How does the platform injector facilitate this? (Advanced)

**Answer:**

Yes. You can call `bootstrapApplication()` multiple times, each with a different root component and selector:

```typescript
bootstrapApplication(AppOne, appOneConfig);
bootstrapApplication(AppTwo, appTwoConfig);
```

The **platform injector** is created once and shared across all applications on the page. It contains platform-level services like `PlatformRef`. Each application gets its own **root environment injector**, so their services and state are independent.

Use cases:
- Micro-frontend architectures
- Embedding Angular widgets in non-Angular pages
- Gradual migration from another framework

Caveats:
- Each app has its own Zone.js zone (or can opt out)
- They don't share change detection cycles
- Communication between them must use DOM events, shared services outside Angular, or a message bus

---

### Q9. Explain what happens if you provide the same service at multiple levels of the injector hierarchy. (Advanced)

**Answer:**

The most **local** provider wins. Angular resolves dependencies by walking up the injector tree and stopping at the first match:

```typescript
// Root level (singleton)
@Injectable({ providedIn: 'root' })
export class LoggerService {
  prefix = 'ROOT';
}

// Component level (instance per component)
@Component({
  providers: [{ provide: LoggerService, useValue: { prefix: 'COMPONENT' } }]
})
export class MyComponent {
  constructor(private logger: LoggerService) {
    console.log(logger.prefix); // 'COMPONENT'
  }
}
```

The component and all its children get the component-level instance. Components outside this subtree get the root singleton. This is how Angular implements **hierarchical dependency injection** — it's the same DI concept as Java's Spring but with a DOM-aligned hierarchy.

---

### Q10. What is the role of Zone.js in the bootstrap process? (Advanced)

**Answer:**

Zone.js monkey-patches all asynchronous browser APIs (setTimeout, Promise, addEventListener, XHR, fetch, etc.) at application startup. This happens **before** Angular bootstraps.

When any async operation completes, Zone.js notifies Angular that "something happened." Angular then triggers a change detection cycle to update the view.

In the bootstrap process:
1. `polyfills.js` loads Zone.js (patches async APIs)
2. `main.ts` runs inside the Angular zone
3. `bootstrapApplication` creates an `NgZone` instance
4. All subsequent async operations inside Angular components are intercepted
5. After each async callback completes, Zone.js tells NgZone, which tells Angular to run change detection

**Angular 18+ Zoneless mode**: Angular now supports `provideExperimentalZoneless()` which removes Zone.js entirely. Change detection is triggered by signals and explicit `markForCheck()` calls instead.

---

### Q11. How does Angular's bootstrap process differ for Server-Side Rendering (SSR)? (Expert)

**Answer:**

In SSR (Angular Universal / `@angular/ssr`):

1. A Node.js server receives an HTTP request
2. The server calls `bootstrapApplication()` using the **server platform** instead of the browser platform
3. Angular renders the component tree to an HTML string (no real DOM — uses a server DOM abstraction)
4. `APP_INITIALIZER`s run (including any HTTP calls, which are made from Node.js)
5. The rendered HTML is sent to the client
6. The client downloads and executes the JavaScript bundles
7. Angular **hydrates** the existing DOM rather than replacing it — it attaches event listeners and state to the server-rendered HTML
8. The app becomes interactive (this is called "Time to Interactive")

Key differences:
- Server has no `window`, `document`, `localStorage` — platform-specific code needs guards
- `TransferState` API transfers data fetched on the server to the client to avoid duplicate HTTP requests
- Hydration (Angular 16+) avoids DOM destruction/recreation, preserving the server-rendered content

---

### Q12. What is `provideExperimentalZoneless()` and what are its implications for bootstrapping? (Expert)

**Answer:**

Introduced in Angular 18, `provideExperimentalZoneless()` removes the dependency on Zone.js:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZoneless(),
    provideRouter(routes),
  ]
};
```

Implications:
- **No Zone.js** in the bundle (saves ~35KB gzipped)
- Change detection is driven by **signals** and explicit scheduling
- `setTimeout`, `setInterval`, HTTP calls no longer automatically trigger change detection
- Components must use signals or call `ChangeDetectorRef.markForCheck()` to notify Angular of changes
- OnPush change detection strategy becomes the effective default behavior
- Third-party libraries that rely on Zone.js-triggered change detection may not work correctly
- Significantly better performance for applications with many async operations that don't affect the UI

---

## Section 2: Module System

### Q13. What is an NgModule and what are its four main metadata properties? (Beginner)

**Answer:**

An NgModule is a class decorated with `@NgModule()` that organizes Angular application code into cohesive blocks. The four main properties are:

1. **`declarations`**: Components, directives, and pipes that belong to this module. Each can only be declared in ONE module.
2. **`imports`**: Other NgModules whose exported declarations this module needs.
3. **`exports`**: Declarations from this module that should be available to modules that import this module.
4. **`providers`**: Services that this module contributes to the application's (or module's) injector.

Additional properties: `bootstrap` (root module only — specifies the root component), `entryComponents` (deprecated since Ivy), `schemas` (for custom elements).

---

### Q14. What is a standalone component and why was it introduced? (Beginner)

**Answer:**

A standalone component is a self-contained component that declares its own dependencies in its `imports` array, eliminating the need for an NgModule to register it.

```typescript
@Component({
  selector: 'app-user-card',
  imports: [DatePipe, RouterLink],  // Declares its own dependencies
  template: `...`
})
export class UserCardComponent { }
```

It was introduced (Angular 14) to solve several NgModule pain points:
- **Complexity**: Developers had to understand module boundaries, re-exports, and the "only declared in one module" rule
- **Boilerplate**: Simple components required creating and managing a module
- **Bundle size**: NgModules pulled in all their declarations, even unused ones
- **Developer experience**: Confusing error messages about missing declarations/imports
- **Testing**: Test setups required extensive module configuration

In Angular 19+, `standalone: true` is the default — you don't even need to specify it.

---

### Q15. Can you mix standalone and NgModule-based components in the same application? (Intermediate)

**Answer:**

Yes, they are fully interoperable:

**Standalone component using an NgModule:**
```typescript
@Component({
  imports: [MaterialModule],  // Import the entire NgModule
  template: `<mat-button>Click</mat-button>`
})
export class MyStandaloneComponent { }
```

**NgModule declaring a non-standalone component that uses a standalone component:**
```typescript
@NgModule({
  declarations: [LegacyComponent],
  imports: [MyStandaloneComponent],  // Import standalone directly
})
export class LegacyModule { }
```

This interoperability is critical for **incremental migration** — you don't have to convert the entire application at once.

---

### Q16. What happens to dependency injection when a module is lazy-loaded? (Intermediate)

**Answer:**

When a module is lazy-loaded via the router, Angular creates a **new child environment injector**:

```typescript
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
}
```

Any service provided in `AdminModule` gets its own instance, separate from the root injector. This means:

- `AdminService` provided in `AdminModule` is NOT a singleton across the app
- If `AdminService` is also provided in the root injector, the lazy-loaded module's components get the local instance (shadowing)
- Services with `providedIn: 'root'` are NOT affected — they always resolve from the root injector regardless of lazy loading

This is a common source of bugs: developers provide a service in both a lazy module and the root, expecting a single instance, but get two.

---

### Q17. Explain the `declarations` vs `imports` vs `exports` distinction with an example where getting it wrong causes a bug. (Intermediate)

**Answer:**

```typescript
// shared.module.ts
@NgModule({
  declarations: [HighlightDirective],
  exports: [HighlightDirective],  // MUST export to make available
})
export class SharedModule { }

// feature.module.ts
@NgModule({
  declarations: [FeatureComponent],
  imports: [SharedModule],  // Import SharedModule, NOT HighlightDirective directly
})
export class FeatureModule { }
```

**Common bugs:**

1. **Forgetting to export**: If `SharedModule` doesn't export `HighlightDirective`, `FeatureComponent` can't use it even though it imported the module. Error: "Can't bind to 'appHighlight' since it isn't a known property."

2. **Declaring in two modules**: If both `SharedModule` and `FeatureModule` try to declare `HighlightDirective`, Angular throws: "HighlightDirective is declared in two modules."

3. **Forgetting to import CommonModule**: If `FeatureModule` doesn't import `CommonModule` (or `BrowserModule` for the root), `*ngIf` and `*ngFor` won't work. Error: "Can't bind to 'ngIf' since it isn't a known property."

These confusing errors are one of the main reasons standalone components were introduced.

---

### Q18. What is the difference between `loadChildren` and `loadComponent` in routing? (Intermediate)

**Answer:**

```typescript
// loadChildren: loads a set of child routes (module or route config)
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
}

// loadComponent: loads a single standalone component
{
  path: 'settings',
  loadComponent: () => import('./settings/settings').then(m => m.SettingsComponent)
}
```

| Aspect | `loadChildren` | `loadComponent` |
|--------|---------------|-----------------|
| What it loads | Route config array or NgModule | Single standalone component |
| Code splitting | Creates a separate chunk | Creates a separate chunk |
| Child routes | Naturally supports nested routes | The component can still have a `<router-outlet>` |
| Use case | Feature areas with multiple pages | Single-page features |

Both enable lazy loading and code splitting. `loadComponent` is simpler when you just need one page.

---

### Q19. How do `provideXxx()` functions work in standalone architecture? Why are they better than NgModule imports? (Advanced)

**Answer:**

Each Angular feature now exposes a `provideXxx()` function that configures the feature's providers:

```typescript
// Instead of: imports: [HttpClientModule]
provideHttpClient(withInterceptors([authInterceptor]))

// Instead of: imports: [RouterModule.forRoot(routes)]
provideRouter(routes, withPreloading(PreloadAllModules))

// Instead of: imports: [BrowserAnimationsModule]
provideAnimations()
```

Advantages over NgModule imports:

1. **Tree-shakable**: Each `withXxx()` function adds only the code needed. `HttpClientModule` includes everything; `provideHttpClient()` only includes what you configure.

2. **Composable**: Features are configured with clear function composition rather than hidden module metadata.

3. **Typed**: `provideRouter(routes, withPreloading(...))` gives better IDE autocomplete than `RouterModule.forRoot(routes, { preloadingStrategy: ... })`.

4. **No forRoot/forChild confusion**: The `forRoot()` vs `forChild()` pattern that confused developers is gone. `provideRouter()` is called once; child routes use `loadChildren`.

---

### Q20. What is `importProvidersFrom()` and when do you need it? (Advanced)

**Answer:**

`importProvidersFrom()` extracts providers from NgModules for use in standalone applications:

```typescript
import { importProvidersFrom } from '@angular/core';
import { SomeThirdPartyModule } from 'third-party-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(SomeThirdPartyModule),  // Extract providers from NgModule
  ]
};
```

You need it when:
- A third-party library only provides an NgModule (no `provideXxx()` function yet)
- You're migrating and some features are still in NgModules
- You need providers from `BrowserAnimationsModule` before `provideAnimations()` existed

It's a migration bridge — as libraries adopt `provideXxx()` patterns, `importProvidersFrom()` becomes unnecessary.

---

### Q21. How would you scope a service to a specific feature route in standalone architecture? (Advanced)

**Answer:**

Use the route's `providers` array:

```typescript
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [
      AdminStateService,  // Scoped to admin routes only
      { provide: API_BASE_URL, useValue: '/api/admin' },
    ],
    children: [
      { path: '', loadComponent: () => import('./admin-dashboard').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./admin-users').then(m => m.AdminUsersComponent) },
    ]
  }
];
```

`AdminStateService` is only available to components within these admin routes. When the user navigates away, the injector (and the service) is destroyed. When they navigate back, a new instance is created.

This replaces the old pattern of providing services in a lazy-loaded NgModule.

---

### Q22. What are the `ENVIRONMENT_INITIALIZER` and `EnvironmentInjector`? How do they differ from `APP_INITIALIZER`? (Expert)

**Answer:**

`ENVIRONMENT_INITIALIZER` runs when an **environment injector** is created (not just at app bootstrap):

```typescript
{
  path: 'admin',
  providers: [
    {
      provide: ENVIRONMENT_INITIALIZER,
      useFactory: () => () => console.log('Admin injector created'),
      multi: true,
    }
  ]
}
```

Differences from `APP_INITIALIZER`:

| Aspect | `APP_INITIALIZER` | `ENVIRONMENT_INITIALIZER` |
|--------|-------------------|---------------------------|
| When it runs | Once, during app bootstrap | When any environment injector is created |
| Blocks rendering | Yes (waits for Promises) | No (synchronous only) |
| Scope | Root only | Any route-level or manually created injector |
| Return value | Can return Promise | Must be synchronous (void) |

`EnvironmentInjector` is the Angular 14+ name for what was previously called "module injector." You can create one manually:

```typescript
const injector = createEnvironmentInjector(
  [MyService, { provide: SOME_TOKEN, useValue: 'test' }],
  parentInjector
);
```

---

### Q23. Explain the "single declaration" rule in NgModules. How did it create problems and how do standalone components solve it? (Advanced)

**Answer:**

**The rule**: Every component, directive, and pipe must be declared in exactly one NgModule. Declaring it in two modules causes a compile error.

**Problems this created:**

1. **Shared components required a SharedModule**: If `ButtonComponent` was needed in `FeatureAModule` and `FeatureBModule`, both had to import a `SharedModule` that declared and exported it. This often led to a bloated `SharedModule` that every feature imported, defeating lazy loading benefits.

2. **Circular module dependencies**: `ModuleA` needs a component from `ModuleB`, and vice versa. The single-declaration rule forced awkward restructuring into a third shared module.

3. **Mental overhead**: Developers had to track which module declares which component and ensure the right modules are imported everywhere.

**Standalone solution**: Each component is self-contained. `FeatureAComponent` imports `ButtonComponent` directly. `FeatureBComponent` does the same. No shared module, no declaration tracking, no circular dependency issues.

---

### Q24. If you're starting a new Angular project today, what module strategy would you recommend and why? (Expert)

**Answer:**

**100% standalone with no NgModules.** This is the Angular team's recommendation as of Angular 17+.

Architecture:
- `bootstrapApplication()` with `ApplicationConfig`
- All components, directives, and pipes are standalone
- Routing with `loadComponent` and `loadChildren` (route config arrays, not modules)
- Feature organization through folder structure and route-level providers, not NgModules
- `provideXxx()` functions for all framework features
- Services with `providedIn: 'root'` or route-level `providers`

The only reasons to use NgModules today:
- Third-party libraries that only expose NgModules (use `importProvidersFrom()`)
- Existing large codebase where migration is ongoing
- Very specific edge cases like dynamic component compilation that benefit from module metadata

---

## Section 3: Component Lifecycle Hooks

### Q25. List all Angular lifecycle hooks in execution order. (Beginner)

**Answer:**

1. `constructor()` — Not technically a hook, but first to run (DI happens here)
2. `ngOnChanges(changes)` — When input bindings change (runs before `ngOnInit`)
3. `ngOnInit()` — After first `ngOnChanges`, called once
4. `ngDoCheck()` — Every change detection run
5. `ngAfterContentInit()` — After projected content (`<ng-content>`) is initialized, once
6. `ngAfterContentChecked()` — After projected content is checked
7. `ngAfterViewInit()` — After component's view and child views are initialized, once
8. `ngAfterViewChecked()` — After component's view and child views are checked
9. `ngOnDestroy()` — Just before the component is destroyed

On subsequent change detection cycles: `ngOnChanges` (if inputs changed) → `ngDoCheck` → `ngAfterContentChecked` → `ngAfterViewChecked`.

---

### Q26. What is the difference between `constructor` and `ngOnInit`? When should you use each? (Beginner)

**Answer:**

**Constructor:**
- TypeScript class constructor — runs when the class is instantiated
- Used exclusively for dependency injection
- `@Input()` values are NOT yet set
- The DOM does not exist yet
- Child components don't exist yet

**ngOnInit:**
- Angular lifecycle hook — runs after the first `ngOnChanges`
- `@Input()` values ARE available
- Used for initialization logic: API calls, subscriptions, complex setup
- Still runs before the view is rendered (`ngAfterViewInit`)

```typescript
// Modern Angular 21 — constructor is often unnecessary
export class UserComponent {
  private readonly userService = inject(UserService);  // DI via inject()
  userId = input.required<string>();

  // ngOnInit also becoming less necessary with signals:
  user = rxResource({
    request: () => this.userId(),
    loader: ({ request: id }) => this.userService.getById(id)
  });
}
```

---

### Q27. When does `ngOnChanges` fire? What are its limitations? (Intermediate)

**Answer:**

`ngOnChanges` fires:
- Before `ngOnInit` (with `firstChange: true`)
- Every time an `@Input()` property's **binding** changes
- It receives a `SimpleChanges` object mapping property names to `SimpleChange` objects (previous/current value, firstChange flag)

**Limitations:**

1. **Object mutation is invisible**: Changing `obj.name = 'new'` does NOT trigger `ngOnChanges` because the object reference hasn't changed. Only `obj = { ...obj, name: 'new' }` (new reference) triggers it.

2. **Not called for signal inputs**: `input()` signal-based inputs don't trigger `ngOnChanges`. Use `effect()` or `computed()` instead.

3. **Performance with many inputs**: If a component has 10 inputs and only one changes, `ngOnChanges` still runs (though `SimpleChanges` tells you which one changed).

4. **No deep comparison**: Angular uses reference equality (`===`). Two different objects with identical content are considered "changed."

---

### Q28. Explain `ngDoCheck`. When is it useful and when is it dangerous? (Intermediate)

**Answer:**

`ngDoCheck` runs during **every** change detection cycle, regardless of whether any inputs changed. It's Angular's way of letting you implement custom change detection logic.

**Useful when:**
- You need to detect deep object mutations that `ngOnChanges` misses
- You're implementing a custom differ (like `KeyValueDiffers` or `IterableDiffers`)
- You need to compare current and previous state manually

```typescript
export class TableComponent implements DoCheck {
  @Input() data!: any[];
  private differ: IterableDiffer<any>;

  constructor(differs: IterableDiffers) {
    this.differ = differs.find([]).create();
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this.data);
    if (changes) {
      changes.forEachAddedItem(r => console.log('Added:', r.item));
      changes.forEachRemovedItem(r => console.log('Removed:', r.item));
    }
  }
}
```

**Dangerous because:**
- It runs on EVERY change detection cycle (could be dozens/hundreds of times per second)
- Expensive logic here directly impacts frame rate
- Must be kept extremely lightweight

---

### Q29. What is the `ExpressionChangedAfterItHasBeenCheckedError`? Why does it exist and how do you fix it? (Intermediate)

**Answer:**

This error occurs in **development mode** when Angular detects that a data-bound value changed between the first and second change detection passes. Angular runs CD twice in dev mode to catch this.

**Why it exists:** It prevents inconsistent UI states. If a binding changes after Angular has already updated the DOM, the DOM would be out of sync with the component's state.

**Common causes:**

1. Changing a parent's property inside a child's lifecycle hook:
```typescript
// CAUSES ERROR:
ngAfterViewInit() {
  this.parentService.title = 'new title'; // Changes parent's bound value
}
```

2. Changing state in `ngAfterViewChecked` or `ngAfterContentChecked`

**Fixes:**

1. **Move the update to `ngOnInit`** (if possible — before view checks)
2. **Use `setTimeout()`** to push the change to the next CD cycle:
```typescript
ngAfterViewInit() {
  setTimeout(() => this.title = 'new title');
}
```
3. **Use `ChangeDetectorRef.detectChanges()`** to explicitly trigger a check
4. **Use signals** — signals schedule updates properly and avoid this class of errors

---

### Q30. Explain the lifecycle hook execution order in a parent-child-grandchild scenario. (Intermediate)

**Answer:**

```
Parent constructor
Parent ngOnChanges
Parent ngOnInit
Parent ngDoCheck
Parent ngAfterContentInit
Parent ngAfterContentChecked
  │
  ├── Child constructor
  ├── Child ngOnChanges
  ├── Child ngOnInit
  ├── Child ngDoCheck
  ├── Child ngAfterContentInit
  ├── Child ngAfterContentChecked
  │     │
  │     ├── Grandchild constructor
  │     ├── Grandchild ngOnChanges
  │     ├── Grandchild ngOnInit
  │     ├── Grandchild ngDoCheck
  │     ├── Grandchild ngAfterContentInit
  │     ├── Grandchild ngAfterContentChecked
  │     ├── Grandchild ngAfterViewInit      ← Grandchild view done first
  │     └── Grandchild ngAfterViewChecked
  │
  ├── Child ngAfterViewInit                  ← Then child view
  └── Child ngAfterViewChecked
│
Parent ngAfterViewInit                       ← Parent view done last
Parent ngAfterViewChecked
```

**Key insight:** "View init" hooks run **bottom-up** (deepest child first, then parent), because a parent's "view" includes its children — so it can't be "initialized" until all children are.

---

### Q31. How does `DestroyRef` improve cleanup compared to `ngOnDestroy`? (Advanced)

**Answer:**

`DestroyRef` (Angular 16+) provides a more flexible cleanup mechanism:

```typescript
// Old pattern:
export class OldComponent implements OnDestroy {
  private subscription!: Subscription;

  ngOnInit() {
    this.subscription = this.data$.subscribe(...);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

// New pattern:
export class NewComponent {
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.data$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(...);

    // Can also register arbitrary cleanup callbacks:
    this.destroyRef.onDestroy(() => {
      console.log('Cleaning up resources');
    });
  }
}
```

Advantages:
1. **No interface implementation needed** — less boilerplate
2. **Can be used in services** — not just components
3. **`takeUntilDestroyed()`** operator works in constructors and field initializers
4. **Composable** — helper functions can accept `DestroyRef` and register their own cleanup
5. **Works with `inject()` pattern** — no constructor parameters needed

---

### Q32. What are the differences between `@ContentChild` / `@ContentChildren` and `@ViewChild` / `@ViewChildren`? (Intermediate)

**Answer:**

| Aspect | ContentChild/Children | ViewChild/Children |
|--------|----------------------|-------------------|
| What it queries | Projected content (between component tags) | Component's own template |
| Available in | `ngAfterContentInit` | `ngAfterViewInit` |
| HTML location | Provided by the parent's template | Defined in the component's template |

```html
<!-- Parent's template -->
<app-tabs>
  <app-tab title="Tab 1">Content</app-tab>   <!-- This is CONTENT -->
  <app-tab title="Tab 2">Content</app-tab>   <!-- Queried with @ContentChildren -->
</app-tabs>
```

```html
<!-- app-tabs template -->
<div class="tabs-header">
  <div #tabHeader>...</div>    <!-- This is VIEW -->
</div>                          <!-- Queried with @ViewChild -->
<ng-content></ng-content>
```

---

### Q33. How do signal-based queries (`viewChild()`, `contentChildren()`) differ from decorator-based queries? (Advanced)

**Answer:**

```typescript
// Decorator-based (legacy):
@ViewChild('myRef') myRef!: ElementRef;  // undefined until ngAfterViewInit

// Signal-based (modern):
myRef = viewChild<ElementRef>('myRef');  // Signal<ElementRef | undefined>
myRefRequired = viewChild.required<ElementRef>('myRef');  // Signal<ElementRef>
```

Key differences:

1. **Type safety**: `viewChild.required()` guarantees the value exists (no `!` assertion needed)
2. **Reactivity**: Signal queries work with `effect()` and `computed()` — you're notified when the query result changes
3. **No lifecycle timing issues**: You can use `effect()` instead of relying on `ngAfterViewInit`
4. **Consistent API**: Same signal-based pattern as `input()`, `output()`, and `model()`

```typescript
// React to view child availability with effect():
canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

constructor() {
  effect(() => {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    this.renderChart(ctx);
  });
}
```

---

### Q34. In what lifecycle hook can you safely access DOM elements? Why? (Intermediate)

**Answer:**

**`ngAfterViewInit`** is the first lifecycle hook where the component's template is fully rendered and DOM elements are accessible.

- `constructor` — No DOM exists
- `ngOnInit` — Component is initialized but template isn't rendered yet
- `ngAfterContentInit` — Projected content is available, but the component's own template may not be
- **`ngAfterViewInit`** — The component's template AND all child component templates are rendered

```typescript
@Component({
  template: `<canvas #chart width="400" height="300"></canvas>`
})
export class ChartComponent implements AfterViewInit {
  @ViewChild('chart') canvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    // Safe to access canvas.nativeElement here
    const ctx = this.canvas.nativeElement.getContext('2d');
  }
}
```

With signals, use `afterNextRender()` for DOM-dependent initialization that should only run in the browser (not during SSR):

```typescript
constructor() {
  afterNextRender(() => {
    // Guaranteed to run in the browser, after the DOM is rendered
  });
}
```

---

### Q35. How are lifecycle hooks affected by `OnPush` change detection strategy? (Advanced)

**Answer:**

With `OnPush`, a component's change detection only runs when:
- An `@Input()` reference changes
- An event handler in the component's template fires
- An `Observable` subscribed via `async` pipe emits
- `ChangeDetectorRef.markForCheck()` is called
- A signal read in the template changes

**Effect on hooks:**

- `ngOnChanges` — Only fires when an input reference actually changes (same as Default)
- `ngDoCheck` — **Still fires** on every parent CD cycle, even if the component is "skipped." This is intentional so you can manually check for changes and call `markForCheck()`.
- `ngAfterContentChecked` / `ngAfterViewChecked` — Only fire when the component's CD actually runs
- `ngOnInit` / `ngOnDestroy` — Unaffected (run once regardless of strategy)

The key gotcha: `ngDoCheck` runs even for OnPush components that are being "skipped." This confuses developers who expect it to only run when the component actually checks.

---

### Q36. What is `afterNextRender()` and how does it differ from `ngAfterViewInit`? (Advanced)

**Answer:**

`afterNextRender()` (Angular 16+) is a callback that runs once after the **next rendering cycle** completes:

```typescript
constructor() {
  afterNextRender(() => {
    // DOM is available, runs in browser only (not SSR)
    this.initThirdPartyLib(document.getElementById('chart'));
  });
}
```

Differences from `ngAfterViewInit`:

| Aspect | `ngAfterViewInit` | `afterNextRender()` |
|--------|-------------------|---------------------|
| Runs during SSR | Yes | **No** (browser only) |
| When it runs | After the component's first view check | After the next render cycle |
| Can be called from | Only the component class | Any injectable (services, directives) |
| Multiple calls | Once per component | Can be called multiple times |

`afterNextRender` is preferred for DOM manipulation because it's SSR-safe by default. There's also `afterRender()` which runs after **every** render cycle (like `ngAfterViewChecked` but browser-only).

---

### Q37. What happens to lifecycle hooks when a component is inside an `@if` or `@for` that toggles? (Advanced)

**Answer:**

When `@if` hides a component:
1. `ngOnDestroy` runs on the component and all its descendants
2. The component is removed from the DOM
3. All subscriptions and resources should be cleaned up

When `@if` shows it again:
1. A **new instance** is created (new `constructor`, new state)
2. The full initialization sequence runs: `ngOnChanges` → `ngOnInit` → `ngDoCheck` → etc.
3. Previous state is lost (it's a completely new component)

```html
@if (showPanel()) {
  <app-data-panel [data]="data()" />  <!-- Destroyed and recreated on toggle -->
}
```

This is different from CSS `display: none` (which hides but keeps the component alive). If you need to preserve state across toggles, options include:
- Moving state to a service
- Using `[hidden]` attribute instead of `@if`
- Using CSS visibility/display
- Caching state in a parent component

For `@for`, the `track` expression determines whether items are recreated or reused. Changing `track` from `track item` (identity) to `track item.id` (property) can dramatically change lifecycle behavior.

---

### Q38. Design a custom lifecycle-aware decorator or utility that logs performance metrics for component initialization. (Expert)

**Answer:**

```typescript
// utils/lifecycle-metrics.ts
import { DestroyRef, inject } from '@angular/core';

export function trackLifecycle(componentName: string) {
  const startTime = performance.now();
  const destroyRef = inject(DestroyRef);

  const initTime = performance.now() - startTime;
  console.log(`[${componentName}] Constructor: ${initTime.toFixed(2)}ms`);

  // Track when the component is destroyed
  destroyRef.onDestroy(() => {
    const totalLifetime = performance.now() - startTime;
    console.log(`[${componentName}] Destroyed after ${totalLifetime.toFixed(2)}ms`);

    // Send to analytics
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${componentName}-destroyed`);
      performance.measure(
        `${componentName}-lifetime`,
        { start: startTime, end: performance.now() }
      );
    }
  });

  return { startTime };
}

// Usage:
@Component({ selector: 'app-dashboard', template: `...` })
export class DashboardComponent {
  private readonly metrics = trackLifecycle('DashboardComponent');

  constructor() {
    afterNextRender(() => {
      const renderTime = performance.now() - this.metrics.startTime;
      console.log(`[DashboardComponent] First render: ${renderTime.toFixed(2)}ms`);
    });
  }
}
```

This demonstrates:
- Using `inject()` inside a utility function (must be called in injection context)
- `DestroyRef` for cleanup tracking
- `afterNextRender` for render timing
- Performance API for metrics
- A reusable pattern that doesn't require lifecycle interface implementation

---

## Section 4: View Encapsulation Strategies

### Q39. What are the three View Encapsulation modes in Angular? (Beginner)

**Answer:**

1. **`ViewEncapsulation.Emulated`** (default): Angular rewrites CSS selectors and adds unique attributes (`_ngcontent-xxx`) to DOM elements to scope styles. Global styles can still leak in, but component styles don't leak out.

2. **`ViewEncapsulation.ShadowDom`**: Uses the browser's native Shadow DOM API. True style isolation — global styles don't leak in, component styles don't leak out. CSS custom properties (variables) cross the boundary.

3. **`ViewEncapsulation.None`**: No encapsulation. Component styles are added as global styles. They affect the entire application.

---

### Q40. How does Angular's Emulated encapsulation work at the DOM level? (Intermediate)

**Answer:**

Angular adds unique attributes to every element in the component's template and rewrites CSS selectors to include those attributes:

**Component code:**
```typescript
@Component({
  selector: 'app-card',
  styles: [`.title { color: blue; }`],
  template: `<h2 class="title">Hello</h2>`
})
```

**Generated DOM:**
```html
<app-card _nghost-abc-c5>
  <h2 _ngcontent-abc-c5 class="title">Hello</h2>
</app-card>
```

**Generated CSS:**
```css
.title[_ngcontent-abc-c5] { color: blue; }
```

- `_nghost-xxx` is added to the host element
- `_ngcontent-xxx` is added to all content elements
- CSS selectors are rewritten to include the attribute selector
- The attribute is unique per component **type** (not per instance)

---

### Q41. When would you choose `ShadowDom` encapsulation over `Emulated`? (Intermediate)

**Answer:**

Choose `ShadowDom` when:
- Building **web components** that will be used outside Angular (Angular Elements)
- You need **complete style isolation** from the host page
- Building embeddable widgets that must work on any website regardless of their CSS
- You want **no global CSS interference** at all

Choose `Emulated` (default) when:
- Building standard Angular application components
- You want global theme styles (fonts, colors) to apply to your components
- You use third-party CSS frameworks (Bootstrap, Tailwind) that need to reach into components
- You need broad browser compatibility (though Shadow DOM support is now excellent)

The main practical issue with `ShadowDom`: third-party CSS libraries and global themes won't automatically apply inside Shadow DOM. You'd need to use CSS custom properties or duplicate styles inside the shadow root.

---

### Q42. What is `::ng-deep` and why is it deprecated? What are the alternatives? (Intermediate)

**Answer:**

`::ng-deep` is a CSS combinator that pierces view encapsulation, allowing parent styles to affect child components:

```css
:host ::ng-deep .mat-form-field {
  font-size: 14px;
}
```

**Why deprecated:** It breaks the encapsulation model and creates fragile styles that depend on implementation details of child components. The Angular team has intended to remove it but hasn't due to the lack of a perfect replacement.

**Alternatives:**

1. **CSS custom properties (recommended)**:
```css
/* Parent: */
:host { --card-bg: blue; }

/* Child: */
.card { background: var(--card-bg, white); }
```

2. **`ViewEncapsulation.None` on a dedicated theme component**:
```typescript
@Component({
  selector: 'app-theme',
  encapsulation: ViewEncapsulation.None,
  styles: [`.mat-form-field { font-size: 14px; }`]
})
```

3. **Global stylesheet** (`styles.css`):
```css
/* styles.css — global, no encapsulation */
.mat-form-field { font-size: 14px; }
```

4. **Component API**: Design child components to accept styling inputs:
```typescript
fontSize = input('16px');
// Use in template: [style.font-size]="fontSize()"
```

---

### Q43. Can you mix encapsulation strategies within an application? What happens? (Advanced)

**Answer:**

Yes, each component independently chooses its encapsulation strategy. They can be mixed freely.

**What happens:**

- An `Emulated` parent with a `ShadowDom` child: Parent's styles won't reach into the child (Shadow DOM blocks them). Global styles also won't reach the child.

- An `Emulated` parent with a `None` child: The child's styles become global and could affect the parent and other components.

- A `ShadowDom` parent with an `Emulated` child: The child is inside the shadow root. The child's emulated styles work within the shadow root. Global styles from outside the shadow root don't reach either.

- A `None` parent with an `Emulated` child: The child's styles are scoped (emulated). The parent's styles are global and can affect the child (since Emulated allows global styles to leak in).

The key insight: encapsulation modes interact based on their individual rules. `ShadowDom` creates the hardest boundary. `None` creates no boundary. `Emulated` blocks outward leaking but allows inward leaking.

---

### Q44. How does `:host` selector work? What about `:host-context()`? (Intermediate)

**Answer:**

`:host` targets the component's **host element** (the custom element tag itself):

```typescript
@Component({
  selector: 'app-panel',
  styles: [`
    :host { display: block; border: 1px solid gray; }
    :host(.highlighted) { border-color: gold; }
    :host([disabled]) { opacity: 0.5; pointer-events: none; }
  `]
})
```

`:host-context()` applies styles when any **ancestor** matches the selector:

```css
:host-context(.dark-theme) {
  background: #333;
  color: white;
}

:host-context(.compact-mode) {
  padding: 4px;
}
```

`:host-context` walks up the DOM tree. If it finds any ancestor with `.dark-theme`, it applies the styles. This is useful for theming without passing theme data through every component.

**Note:** `:host-context` doesn't work with `ShadowDom` encapsulation because the shadow boundary prevents ancestor traversal.

---

### Q45. How would you implement a theme system using view encapsulation effectively? (Advanced)

**Answer:**

The best approach uses CSS custom properties (variables) which cross all encapsulation boundaries:

```css
/* Global theme definition (styles.css or a None-encapsulated component) */
:root {
  --color-primary: #1976d2;
  --color-surface: #ffffff;
  --color-text: #212121;
  --spacing-unit: 8px;
  --border-radius: 4px;
}

.dark-theme {
  --color-primary: #90caf9;
  --color-surface: #121212;
  --color-text: #e0e0e0;
}
```

```typescript
// Any component, any encapsulation mode (including ShadowDom):
@Component({
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [`
    .card {
      background: var(--color-surface);
      color: var(--color-text);
      padding: calc(var(--spacing-unit) * 2);
      border-radius: var(--border-radius);
    }
    .card-title { color: var(--color-primary); }
  `]
})
```

Theme switching:
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<'light' | 'dark'>('light');
  readonly theme = this._theme.asReadonly();

  toggle(): void {
    this._theme.update(t => t === 'light' ? 'dark' : 'light');
    document.body.classList.toggle('dark-theme');
  }
}
```

This works because CSS custom properties inherit through the DOM tree and cross Shadow DOM boundaries — the only CSS feature that does so.

---

### Q46. What are the performance implications of each encapsulation mode? (Advanced)

**Answer:**

**Emulated:**
- Angular processes all component styles at build time (AOT) to add attribute selectors
- Slight CSS file size increase due to added attribute selectors
- DOM size increase due to `_ngcontent-xxx` attributes on every element
- No runtime overhead for style scoping (it's all done at build time)

**ShadowDom:**
- Browser handles scoping natively — no Angular processing needed
- Each component instance gets its own `<style>` element in its shadow root
- Memory usage can be higher if many instances of the same component exist (duplicated styles)
- Modern browsers optimize this well with shared style sheets (`adoptedStyleSheets`)

**None:**
- Zero overhead — styles are just added to the global stylesheet
- Smallest generated code
- But risk of style conflicts increases with application size

For most applications, the performance differences are negligible. Choose based on the isolation requirements, not performance.

---

### Q47. Explain the interaction between View Encapsulation and content projection (`<ng-content>`). (Advanced)

**Answer:**

Projected content belongs to the **parent's** encapsulation scope, not the child's:

```typescript
// parent.component.ts (Emulated)
@Component({
  template: `
    <app-card>
      <p class="projected">This text is projected</p>
    </app-card>
  `,
  styles: [`.projected { color: blue; }`]  // ← This style applies
})

// card.component.ts (Emulated)
@Component({
  template: `
    <div class="card">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`.projected { color: red; }`]  // ← This does NOT apply to projected content
})
```

The `<p class="projected">` gets the parent's `_ngcontent-xxx` attribute, not the card's. So the card's style for `.projected` doesn't match (wrong attribute).

**With ShadowDom**: Projected content is placed inside the shadow root via `<slot>`, but it's rendered in the "light DOM" context. The host component's shadow styles don't apply to slotted content. You need `::slotted()` pseudo-element:

```css
/* Inside ShadowDom component: */
::slotted(p) { color: red; }  /* Targets projected <p> elements */
```

---

### Q48. How would you debug a CSS issue caused by view encapsulation? (Expert)

**Answer:**

Step-by-step debugging process:

1. **Inspect the element in DevTools**: Look for `_ngcontent-xxx` or `_nghost-xxx` attributes. If they exist, Emulated encapsulation is active. If you see `#shadow-root`, it's ShadowDom.

2. **Check the computed styles**: DevTools → Computed tab shows exactly which CSS rule is winning and from which file.

3. **Look at the CSS selectors**: If a style isn't applying, the attribute selector may not match. A style from Component A (`.btn[_ngcontent-abc]`) won't match elements in Component B (which has `_ngcontent-def`).

4. **Check encapsulation mode**: Verify what mode the component uses. If it's `None`, the styles are global — check for naming conflicts.

5. **Content projection issues**: Remember projected content uses the parent's scoping attribute. If styles in the child component don't apply to `<ng-content>` content, this is likely why.

6. **Check for `::ng-deep`**: Search for `::ng-deep` in the codebase — it may be causing unexpected style bleeding.

7. **Temporarily switch to `None`**: As a debugging step, temporarily set `encapsulation: ViewEncapsulation.None` to see if the style works without scoping. If it does, the issue is scoping-related.

---

## Section 5: Component Communication Patterns

### Q49. What are the main ways components communicate in Angular? (Beginner)

**Answer:**

1. **Parent → Child**: `@Input()` / `input()` — passing data down
2. **Child → Parent**: `@Output()` / `output()` — emitting events up
3. **Two-way**: `[(ngModel)]` / `model()` — synchronized bidirectional binding
4. **Parent accessing child**: `@ViewChild()` / `viewChild()` — imperative access
5. **Component accessing projected content**: `@ContentChild()` / `contentChild()` / `contentChildren()`
6. **Sibling / Any**: Shared service with signals or BehaviorSubject
7. **Global**: State management (NgRx, Signal Store, or signal-based service)
8. **Template reference variables**: `#ref` for direct template access

---

### Q50. What is the difference between `@Input()` and signal `input()`? (Beginner)

**Answer:**

```typescript
// Decorator-based (legacy):
@Input() name!: string;
@Input() count: number = 0;

// Signal-based (modern):
name = input.required<string>();
count = input(0);
```

| Aspect | `@Input()` | `input()` |
|--------|-----------|-----------|
| Type safety | Needs `!` for required inputs | `input.required()` is guaranteed |
| Change detection | Uses `ngOnChanges` | Uses `effect()` / `computed()` |
| Default values | Assigned in property declaration | Passed to `input()` function |
| Transforms | `@Input({ transform: booleanAttribute })` | `input(false, { transform: booleanAttribute })` |
| Reactivity | Imperative (check in hook) | Declarative (signal-based) |
| Read syntax | `this.name` | `this.name()` (function call) |

Signal inputs are preferred in Angular 17+ because they integrate with Angular's signal-based reactivity system and provide better type safety.

---

### Q51. How does `model()` enable two-way binding? How does it compare to the old `Input/Output` pattern? (Intermediate)

**Answer:**

**Old pattern** (requires matching naming convention):
```typescript
@Input() value = 0;
@Output() valueChange = new EventEmitter<number>();

// Usage: <app-counter [(value)]="count">
```

**New pattern** with `model()`:
```typescript
value = model(0);  // Creates both input and output automatically

// In the component:
increment() {
  this.value.update(v => v + 1);  // Automatically emits to parent
}

// Usage: <app-counter [(value)]="count">
```

`model()` is a writable signal that:
- Receives values from the parent (like `input()`)
- Emits values back to the parent when `set()` or `update()` is called
- Eliminates the need for separate `@Output` + `EventEmitter`
- Works with signal-based change detection
- The naming convention (`xxxChange`) is handled automatically

---

### Q52. When should you use a shared service vs `@Input/@Output` for communication? (Intermediate)

**Answer:**

**Use `@Input`/`@Output` when:**
- Components have a direct parent-child relationship
- Data flow is 1-2 levels deep
- The communication is component-specific (not reused elsewhere)
- You want explicit, traceable data flow in templates

**Use a shared service when:**
- Components are siblings (no parent-child relationship)
- Data needs to cross 3+ component levels (avoid "prop drilling")
- Multiple unrelated components need the same data
- The state has a longer lifecycle than any individual component
- You need to share state across routes

**Anti-pattern to avoid:** Passing data through 5 levels of `@Input`/`@Output` just because "services are overkill." This creates brittle coupling and makes refactoring painful. If data needs to cross more than 2 levels, use a service.

---

### Q53. Explain the `@ViewChild` static option. When would you use `{ static: true }`? (Intermediate)

**Answer:**

```typescript
@ViewChild('myRef', { static: true }) myRef!: ElementRef;   // Available in ngOnInit
@ViewChild('myRef', { static: false }) myRef!: ElementRef;  // Available in ngAfterViewInit (default)
```

`{ static: true }` means Angular resolves the query during the **first** change detection run, making it available in `ngOnInit` instead of `ngAfterViewInit`.

**Use `{ static: true }` when:**
- The element is NOT inside `*ngIf`, `*ngFor`, `@if`, `@for`, or any conditional
- You need the reference in `ngOnInit`

**Use `{ static: false }` (default) when:**
- The element is inside a conditional or loop
- The element might not exist on initial render
- You only need it in `ngAfterViewInit` or later

With signal-based queries (`viewChild()`), the static option doesn't exist — signals handle the reactivity automatically.

---

### Q54. How would you build a component that communicates with deeply nested children without prop drilling? (Advanced)

**Answer:**

**Pattern 1: Shared service with hierarchical providers**

```typescript
@Injectable()  // NOT providedIn: 'root' — scoped to a subtree
export class PanelContext {
  theme = signal<'light' | 'dark'>('light');
  collapsed = signal(false);
}

// Top-level panel provides the context
@Component({
  selector: 'app-panel',
  providers: [PanelContext],  // New instance for each panel
  template: `<ng-content />`
})
export class PanelComponent { }

// Deeply nested child injects it (no prop drilling)
@Component({
  selector: 'app-panel-item',
  template: `<div [class.dark]="ctx.theme() === 'dark'">{{ label() }}</div>`
})
export class PanelItemComponent {
  ctx = inject(PanelContext);
  label = input('');
}
```

**Pattern 2: Signal-based service at route level**

```typescript
// route config
{
  path: 'editor',
  providers: [EditorStateService],
  loadComponent: () => import('./editor').then(m => m.EditorComponent)
}
```

All components within the editor route share the same `EditorStateService` instance. Components at any nesting depth simply `inject(EditorStateService)`.

---

### Q55. What is the difference between `EventEmitter` and `Subject`/`Observable` for outputs? (Advanced)

**Answer:**

`EventEmitter` extends `Subject` from RxJS:

```typescript
export class EventEmitter<T> extends Subject<T> {
  emit(value: T): void { ... }
  subscribe(...): Subscription { ... }
}
```

**In practice**, you should:
- Use `EventEmitter` (or `output()`) for `@Output()` component events
- Never subscribe to an `EventEmitter` from outside — only use the `(event)` template syntax
- Use `Subject`/`BehaviorSubject` in services for inter-component communication

**Why not use `Subject` as `@Output`?** Technically possible, but Angular's compiler and tools expect `EventEmitter` or the `output()` API. The `output()` function (Angular 17+) doesn't even use `EventEmitter` internally — it uses a simpler `OutputEmitterRef` that isn't an Observable at all, reinforcing that outputs should be event emitters, not streams.

---

### Q56. Explain the `contentChildren()` signal query and how it replaces `@ContentChildren` with `QueryList`. (Advanced)

**Answer:**

```typescript
// Old pattern:
@ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;

ngAfterContentInit() {
  this.tabs.changes.subscribe(() => {
    // React to dynamic changes
  });
}

// New pattern:
tabs = contentChildren(TabComponent);  // Signal<readonly TabComponent[]>

constructor() {
  effect(() => {
    const allTabs = this.tabs();  // Automatically reactive
    console.log('Tabs changed:', allTabs.length);
  });
}
```

Improvements:
- **No `QueryList`**: Returns a plain readonly array wrapped in a signal
- **No `.changes` subscription**: The signal updates automatically
- **No `ngAfterContentInit` dependency**: Use `effect()` or `computed()` anywhere
- **No cleanup needed**: No subscription to unsubscribe from
- **Type-safe**: No `!` assertion needed

---

### Q57. How does Angular's `@Output()` relate to native DOM events? Can a component output bubble like DOM events? (Advanced)

**Answer:**

Angular `@Output()` events do **NOT** bubble through the DOM. They are direct parent-child communication only. This is a critical distinction from native DOM events.

```html
<grandparent>
  <parent (childEvent)="handle($event)">   <!-- This works -->
    <child (childEvent)="handle($event)">   <!-- This also works (direct parent) -->
      <!-- child emits 'childEvent' -->
    </child>
  </parent>
  <!-- Grandparent CANNOT listen to child's @Output unless parent re-emits -->
</grandparent>
```

If you need event bubbling, use native `CustomEvent`:

```typescript
@Component({ selector: 'app-deep-child' })
export class DeepChildComponent {
  private readonly el = inject(ElementRef);

  emitBubbling(data: any): void {
    this.el.nativeElement.dispatchEvent(
      new CustomEvent('customAction', {
        detail: data,
        bubbles: true,    // Bubbles up the DOM
        composed: true,   // Crosses Shadow DOM boundaries
      })
    );
  }
}

// Any ancestor can listen:
<div (customAction)="handleAction($event)">
  <app-wrapper>
    <app-deep-child></app-deep-child>
  </app-wrapper>
</div>
```

---

### Q58. What are the trade-offs between signal-based services and NgRx for state management? (Expert)

**Answer:**

**Signal-based service:**
```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));

  addItem(item: CartItem) { this._items.update(list => [...list, item]); }
}
```

**NgRx:**
```typescript
// Actions, reducers, selectors, effects — 4+ files for the same feature
```

| Aspect | Signal Service | NgRx |
|--------|---------------|------|
| Boilerplate | Minimal | Significant (actions, reducers, selectors, effects) |
| Learning curve | Low | High |
| Debugging | Standard debugging | Redux DevTools, time-travel |
| Predictability | Good (immutable update patterns) | Enforced (pure reducers) |
| Scalability | Good for small-medium apps | Designed for large complex apps |
| Team coordination | Flexible (can be inconsistent) | Enforced patterns (consistency) |
| Testing | Simple service tests | Structured testing for each layer |
| Side effects | Mixed in service methods | Isolated in Effects |

**Recommendation for FAANG interviews**: Know both. Signal-based services are suitable for most applications. NgRx adds value when you need: enforced unidirectional data flow, time-travel debugging, complex side effect orchestration, or multiple teams working on the same state.

---

### Q59. How do you prevent memory leaks in component communication? (Intermediate)

**Answer:**

Memory leaks in Angular most commonly come from subscriptions that outlive their component:

**Pattern 1: `takeUntilDestroyed()` (recommended)**
```typescript
export class MyComponent {
  constructor() {
    this.dataService.data$.pipe(
      takeUntilDestroyed()  // Automatically unsubscribes on destroy
    ).subscribe(data => this.handleData(data));
  }
}
```

**Pattern 2: `async` pipe (for template subscriptions)**
```html
@if (data$ | async; as data) {
  <p>{{ data.name }}</p>
}
```
The `async` pipe handles subscribe/unsubscribe automatically.

**Pattern 3: Signals (no subscriptions needed)**
```typescript
data = this.dataService.data;  // Signal — no subscription
```

**Pattern 4: `DestroyRef.onDestroy()` for manual cleanup**
```typescript
private readonly destroyRef = inject(DestroyRef);

constructor() {
  const interval = setInterval(() => this.poll(), 5000);
  this.destroyRef.onDestroy(() => clearInterval(interval));
}
```

**Anti-patterns to avoid:**
- Subscribing in `ngOnInit` without unsubscribing
- Using `subscribe()` when `async` pipe would work
- Storing subscriptions in arrays and forgetting to unsubscribe from one

---

### Q60. Design a communication pattern for a complex form where deeply nested sub-forms need to report validity to a top-level form container. (Expert)

**Answer:**

**Use Angular's built-in `ControlValueAccessor` + Reactive Forms:**

```typescript
// address-form.ts — a sub-form that implements ControlValueAccessor
@Component({
  selector: 'app-address-form',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: AddressFormComponent,
    multi: true,
  }, {
    provide: NG_VALIDATORS,
    useExisting: AddressFormComponent,
    multi: true,
  }],
  template: `
    <div [formGroup]="form">
      <input formControlName="street" placeholder="Street" />
      <input formControlName="city" placeholder="City" />
      <input formControlName="zip" placeholder="ZIP" />
    </div>
  `
})
export class AddressFormComponent implements ControlValueAccessor, Validator {
  form = new FormGroup({
    street: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    zip: new FormControl('', [Validators.required, Validators.pattern(/^\d{5}$/)]),
  });

  // ControlValueAccessor implementation
  writeValue(val: Address) { if (val) this.form.patchValue(val); }
  registerOnChange(fn: any) { this.form.valueChanges.subscribe(fn); }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  // Validator implementation — reports validity up to parent form
  validate(): ValidationErrors | null {
    return this.form.valid ? null : { address: true };
  }

  private onTouched = () => {};
}

// Parent form — treats the entire address sub-form as a single control
@Component({
  template: `
    <form [formGroup]="parentForm">
      <input formControlName="name" />
      <app-address-form formControlName="address"></app-address-form>
      <button [disabled]="parentForm.invalid">Submit</button>
    </form>
  `
})
export class ParentFormComponent {
  parentForm = new FormGroup({
    name: new FormControl('', Validators.required),
    address: new FormControl<Address>(null!),  // Managed by AddressFormComponent
  });
}
```

This pattern:
- Sub-forms are completely self-contained
- Validity automatically propagates up via the `Validator` interface
- No custom event emitters or services needed
- Works at any nesting depth
- Each sub-form is independently testable

---

## Section 6: Template Syntax and Binding Mechanisms

### Q61. What are the four types of data binding in Angular? (Beginner)

**Answer:**

1. **Interpolation** `{{ expression }}` — One-way, component → DOM. Converts expression to string.
2. **Property binding** `[property]="expression"` — One-way, component → DOM. Sets element/component/directive property.
3. **Event binding** `(event)="handler()"` — One-way, DOM → component. Listens for events.
4. **Two-way binding** `[(property)]="field"` — Two-way. Combines property and event binding.

```html
{{ title }}                          <!-- Interpolation -->
<img [src]="imageUrl">               <!-- Property binding -->
<button (click)="save()">Save</button> <!-- Event binding -->
<input [(ngModel)]="name">           <!-- Two-way binding -->
```

---

### Q62. What is the difference between property binding and attribute binding? (Intermediate)

**Answer:**

HTML attributes and DOM properties are different things:
- **Attributes** are defined in HTML and initialize DOM properties
- **Properties** are the live state of the DOM element

```html
<input value="initial">
```
- `getAttribute('value')` → always "initial" (attribute doesn't change)
- `element.value` → reflects current user input (property changes)

Angular binds to **properties** by default:
```html
<input [value]="name">           <!-- Property binding -->
<td [attr.colspan]="span">       <!-- Attribute binding (explicit) -->
```

Use `[attr.xxx]` when:
- There is no corresponding DOM property (`colspan`, `aria-*`, `data-*`, `role`)
- You want to set an SVG attribute
- You need to remove an attribute (set to `null`)

---

### Q63. Explain the new `@if`, `@for`, `@switch` control flow syntax. How is it different from `*ngIf`, `*ngFor`, `*ngSwitch`? (Intermediate)

**Answer:**

| Feature | Old Structural Directives | New Control Flow |
|---------|--------------------------|-----------------|
| Syntax | `*ngIf="condition"` | `@if (condition) { }` |
| Import needed | Yes (`CommonModule`) | No (built-in) |
| `else` support | Via `ng-template` reference | Inline `@else` / `@else if` |
| `for` tracking | Optional `trackBy` function | **Mandatory** `track` expression |
| Empty state | No built-in support | `@empty` block for `@for` |
| Switch | Three directives needed | Clean `@switch/@case/@default` |
| Performance | Good | Better (optimized at compile time) |
| Lazy loading | Not possible | `@defer` block |

```html
<!-- Old -->
<div *ngIf="user; else loading">{{ user.name }}</div>
<ng-template #loading>Loading...</ng-template>

<!-- New -->
@if (user(); as u) {
  <div>{{ u.name }}</div>
} @else {
  <div>Loading...</div>
}
```

The mandatory `track` in `@for` is a major improvement — it prevents the common performance bug of forgetting `trackBy` in `*ngFor`.

---

### Q64. What is `track` in `@for` and why is it mandatory? (Intermediate)

**Answer:**

`track` tells Angular how to identify each item in the list for efficient DOM reuse:

```html
@for (user of users(); track user.id) {
  <app-user-card [user]="user" />
}
```

When the list changes (items added, removed, or reordered), Angular uses the `track` expression to determine:
- Which DOM elements can be **reused** (same tracked value → keep the element)
- Which need to be **created** (new tracked value)
- Which need to be **destroyed** (tracked value no longer present)

**Why mandatory:** In `*ngFor`, forgetting `trackBy` meant Angular tracked by **object identity**. If you returned a new array from an API call (common pattern), every item was a new object reference, so Angular destroyed and recreated every DOM element — even if the data was the same. This caused:
- Poor performance (unnecessary DOM operations)
- Loss of component state (inputs, form values)
- Visual glitches (animations restart)

By making `track` mandatory, Angular forces developers to think about item identity upfront.

**Common track expressions:**
- `track item.id` — unique identifier (most common)
- `track $index` — index-based (use only for static lists)
- `track item` — object identity (equivalent to no trackBy)

---

### Q65. What is `@defer` and what triggers does it support? (Intermediate)

**Answer:**

`@defer` lazily loads a section of template (and its component dependencies) in a separate JavaScript chunk:

```html
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <p>Will load when visible</p>
} @loading (minimum 200ms) {
  <spinner />
} @error {
  <p>Failed to load</p>
}
```

**Triggers:**

| Trigger | Fires when |
|---------|-----------|
| `on idle` | Browser's `requestIdleCallback` fires |
| `on viewport` | Element enters the viewport (IntersectionObserver) |
| `on interaction` | User clicks, focuses, or touches a trigger element |
| `on hover` | User hovers over a trigger element |
| `on timer(Xms)` | After a specified delay |
| `on immediate` | Immediately (but still code-split) |
| `when condition` | Boolean expression becomes true |

**Sub-blocks:**
- `@placeholder` — Shown before loading starts (optionally with `minimum` time to prevent flashing)
- `@loading` — Shown while the chunk is downloading (optionally with `after` and `minimum` for UX)
- `@error` — Shown if loading fails

`@defer` is one of Angular's most impactful features for performance — it enables granular code splitting without any manual `import()` or routing changes.

---

### Q66. What is the `async` pipe and why is it considered a best practice? (Intermediate)

**Answer:**

The `async` pipe subscribes to an Observable or Promise in the template and:
1. Emits the latest value
2. Triggers change detection when new values arrive
3. **Automatically unsubscribes** when the component is destroyed

```html
@if (users$ | async; as users) {
  @for (user of users; track user.id) {
    <app-user-card [user]="user" />
  }
} @else {
  <loading-spinner />
}
```

**Why it's a best practice:**
- No manual subscribe/unsubscribe — eliminates memory leak risk
- Works perfectly with `OnPush` change detection (it calls `markForCheck()`)
- Cleaner code — no component properties to hold subscription results
- Handles loading state naturally (value is `null` before first emission)

**When NOT to use it:**
- When you need to perform side effects on the stream (use `subscribe()` in the component)
- When multiple template locations need the same value (subscribe once with `as`)
- When migrating to signals (use signal-based patterns instead)

---

### Q67. What are template reference variables and what types of values can they hold? (Intermediate)

**Answer:**

Template reference variables (`#varName`) are declared in templates and provide references to:

1. **DOM element** (on plain HTML):
```html
<input #nameInput>
<button (click)="greet(nameInput.value)">Greet</button>
<!-- nameInput is an HTMLInputElement -->
```

2. **Component instance** (on a component):
```html
<app-timer #timer></app-timer>
<button (click)="timer.start()">Start</button>
<!-- timer is a TimerComponent instance -->
```

3. **Directive instance** (with explicit assignment):
```html
<form #myForm="ngForm">
<!-- myForm is the NgForm directive instance -->
```

4. **TemplateRef** (on `<ng-template>`):
```html
<ng-template #tooltip>
  <div class="tooltip">Tooltip content</div>
</ng-template>
<!-- tooltip is a TemplateRef -->
```

Template variables are scoped to the template they're declared in. They cannot be accessed from the component class unless queried with `@ViewChild` / `viewChild()`.

---

### Q68. Explain the difference between `[class.active]="isActive"` and `[ngClass]="classObj"`. (Intermediate)

**Answer:**

**`[class.active]`** — Toggles a single CSS class:
```html
<div [class.active]="isActive">           <!-- Boolean toggle -->
<div [class.text-bold]="isBold">          <!-- Hyphenated class names work -->
```

**`[class]`** — Sets the entire class attribute:
```html
<div [class]="'active bold'">              <!-- String of classes -->
<div [class]="classExpression">            <!-- Dynamic string -->
```

**`[ngClass]`** — Flexible multi-class binding:
```html
<div [ngClass]="{ 'active': isActive, 'disabled': isDisabled }">  <!-- Object -->
<div [ngClass]="['class-a', 'class-b']">                          <!-- Array -->
<div [ngClass]="classString">                                      <!-- String -->
```

**Recommendation:** Use `[class.xxx]` for single boolean toggles (simpler, no `CommonModule` import needed). Use `[ngClass]` when you need multiple conditional classes. In Angular 17+, `[class]` with template expressions often suffices:

```html
<!-- Modern pattern without ngClass -->
<div [class]="isActive() ? 'active bold' : 'inactive'">
```

---

### Q69. What are safe navigation operator (`?.`) and non-null assertion (`!`) in templates? When should you use each? (Intermediate)

**Answer:**

**Safe navigation `?.`** — Prevents `TypeError` when a value in the chain is null/undefined:
```html
{{ user?.address?.city }}
<!-- If user is null, evaluates to undefined (no error) -->
```

**Non-null assertion `!`** — Tells the TypeScript compiler to trust that the value is not null:
```html
{{ user!.name }}
<!-- Compiler doesn't warn about potential null, but WILL throw at runtime if user is null -->
```

**When to use:**
- Use `?.` for optional data that might legitimately be null (loading states, optional fields)
- Use `!` almost never — prefer `@if` to narrow the type:

```html
<!-- Better than user!.name: -->
@if (user(); as u) {
  {{ u.name }}   <!-- Type is narrowed, no assertion needed -->
}
```

---

### Q70. How do pipes work in Angular? What is the difference between pure and impure pipes? (Intermediate)

**Answer:**

Pipes transform displayed values in templates. They receive input, apply a transformation, and return the result.

**Pure pipes** (default):
- Only re-execute when the **input reference** changes
- For primitives: re-execute on value change
- For objects/arrays: re-execute only on **reference** change (not mutation)
- Angular can skip calling the pipe if the input hasn't changed
- Most built-in pipes are pure

**Impure pipes** (`pure: false`):
- Re-execute on **every change detection cycle**
- Can detect mutations inside objects/arrays
- Significantly worse performance
- The `async` pipe is impure (it needs to detect new emissions)

```typescript
// Pure pipe — only runs when 'items' reference changes
@Pipe({ name: 'filterByStatus', pure: true })
export class FilterByStatusPipe implements PipeTransform {
  transform(items: Item[], status: string): Item[] {
    return items.filter(item => item.status === status);
  }
}

// If you mutate the array (items.push(newItem)), the pipe WON'T re-run
// You must create a new array: items = [...items, newItem]
```

**Best practice:** Always use pure pipes. If you need reactivity to mutations, create new references (immutable updates) rather than making pipes impure.

---

### Q71. How does Angular handle security in template bindings (XSS prevention)? (Advanced)

**Answer:**

Angular automatically sanitizes values in template bindings to prevent XSS:

**Interpolation `{{ }}`** — Always escaped. `<script>alert('XSS')</script>` renders as literal text.

**Property binding `[innerHTML]`** — Angular sanitizes HTML, stripping dangerous elements/attributes:
```html
<!-- Angular removes <script>, onclick, etc. -->
<div [innerHTML]="userContent"></div>
```

**Contexts Angular sanitizes:**
- HTML (`[innerHTML]`)
- Style (`[style]`)
- URL (`[href]`, `[src]`)
- Resource URL (iframes, scripts)

**`DomSanitizer` bypass** (use with extreme caution):
```typescript
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export class MyComponent {
  private readonly sanitizer = inject(DomSanitizer);

  trustedHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(
    '<div onclick="alert(1)">Trusted content</div>'
  );
}
```

**Never bypass sanitization for user-provided content.** Only use it for content you fully control (e.g., from a trusted CMS that already sanitizes).

---

### Q72. Explain how `@defer` impacts bundle size and when you should NOT use it. (Advanced)

**Answer:**

**How it impacts bundle size:**
- Components inside `@defer` are moved to a **separate JavaScript chunk**
- The main bundle doesn't include the deferred component or its exclusive dependencies
- When the trigger fires, Angular dynamically loads the chunk via HTTP
- Shared dependencies (used by both deferred and non-deferred code) stay in the main bundle

**When NOT to use `@defer`:**

1. **Above-the-fold critical content**: Deferring content the user sees immediately adds a loading delay. Use `@defer` for below-the-fold or secondary content.

2. **Very small components**: If a component is only a few KB, the overhead of an extra HTTP request outweighs the bundle savings.

3. **Frequently toggled content**: If content is rapidly shown/hidden, repeatedly loading chunks (even from cache) adds overhead.

4. **SSR-critical content**: Deferred content isn't rendered on the server. If it needs to be in the initial HTML for SEO, don't defer it.

5. **Components with shared large dependencies**: If the deferred component shares a large library (e.g., charts library) with the main app, the library stays in the main bundle anyway — you only save the component code itself.

---

## Section 7: Cross-Topic Scenario Questions

### Q73. You inherit a large Angular app with performance issues. The initial load takes 8 seconds. Walk through your diagnosis and optimization approach. (Expert)

**Answer:**

**Diagnosis:**
1. **Lighthouse audit**: Get metrics (LCP, FID, CLS, bundle size)
2. **Bundle analysis**: Run `ng build --stats-json` + `webpack-bundle-analyzer` to identify large chunks
3. **Network tab**: Check how many JS chunks load on initial page, their sizes, and whether they load in parallel
4. **Performance profiler**: Check if the main thread is blocked during startup (long tasks)
5. **Angular DevTools**: Check for excessive change detection cycles

**Optimization approach (in order of impact):**

1. **Lazy loading**: Convert eagerly-loaded feature modules/routes to `loadComponent`/`loadChildren`. This is usually the single biggest win.
2. **`@defer` blocks**: Defer below-the-fold components (charts, comments, secondary widgets)
3. **Remove unused imports**: Check for heavy libraries imported but barely used (moment.js, lodash)
4. **SSR + Hydration**: Server-render the initial page for perceived instant load
5. **Preloading strategy**: After initial load, preload likely-needed routes in the background
6. **OnPush change detection**: Reduce unnecessary CD cycles, especially in list components
7. **Tree-shaking**: Ensure `providedIn: 'root'` for services, standalone components for better tree-shaking
8. **Image optimization**: Lazy load images, use `NgOptimizedImage` directive

---

### Q74. A junior developer asks: "Why can't I just use global CSS and skip all this encapsulation stuff?" How do you explain the value? (Intermediate)

**Answer:**

Global CSS works for small projects but creates serious problems at scale:

1. **Name collisions**: Two developers create `.card` in different features. They override each other. With 50+ developers, this becomes constant.

2. **Unpredictable side effects**: Changing `.btn` in one component accidentally breaks buttons across the app. The developer who made the change has no idea.

3. **Specificity wars**: Teams start adding `!important` to override each other's styles. CSS becomes unmaintainable.

4. **Dead CSS accumulation**: No one dares remove CSS rules because they can't tell what might break. The stylesheet grows indefinitely.

5. **Onboarding difficulty**: New developers can't reason about which styles affect which components.

View encapsulation solves these by giving each component its own style scope. A component's `.card` only affects that component. You can safely rename, refactor, or delete component styles knowing the blast radius is limited to that component.

The analogy: it's like function scope vs global variables. Global variables "work" but become unmaintainable at scale.

---

### Q75. You have a component that renders a list of 10,000 items. Each item has sub-components. Users report the page is slow. Diagnose and fix. (Advanced)

**Answer:**

**Diagnosis:**
1. Profile with Chrome DevTools Performance tab
2. Check if the bottleneck is initial render, scrolling, or change detection

**Solutions (in order):**

1. **Virtual scrolling** (`@angular/cdk/virtual-scrolling`):
```html
<cdk-virtual-scroll-viewport itemSize="50" class="list">
  <div *cdkVirtualFor="let item of items; trackBy: trackById">
    <app-item [item]="item" />
  </div>
</cdk-virtual-scroll-viewport>
```
Only renders ~20-30 visible items instead of 10,000.

2. **OnPush change detection** on the item component:
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  ...
})
export class ItemComponent {
  item = input.required<Item>();
}
```

3. **Mandatory `track` with stable identifier**:
```html
@for (item of items(); track item.id) { ... }
```

4. **`@defer (on viewport)`** for heavy sub-components within each item:
```html
@defer (on viewport) {
  <app-item-details [item]="item" />
} @placeholder {
  <div class="placeholder"></div>
}
```

5. **Pagination or infinite scroll** as a UX alternative to rendering 10,000 items.

---

### Q76. Explain how you would test a component that uses signal inputs, outputs, and computed values. (Advanced)

**Answer:**

```typescript
// The component:
@Component({
  selector: 'app-price-display',
  template: `<span>{{ formattedPrice() }}</span>`
})
export class PriceDisplayComponent {
  price = input.required<number>();
  currency = input('USD');
  formattedPrice = computed(() =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency()
    }).format(this.price())
  );
  priceClicked = output<number>();
}

// The test:
describe('PriceDisplayComponent', () => {
  it('should format price with default currency', async () => {
    const fixture = TestBed.createComponent(PriceDisplayComponent);

    // Set signal inputs using componentRef.setInput()
    fixture.componentRef.setInput('price', 29.99);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('$29.99');
  });

  it('should update when currency changes', () => {
    const fixture = TestBed.createComponent(PriceDisplayComponent);
    fixture.componentRef.setInput('price', 100);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('€100.00');
  });

  it('should emit priceClicked output', () => {
    const fixture = TestBed.createComponent(PriceDisplayComponent);
    fixture.componentRef.setInput('price', 50);

    let emittedValue: number | undefined;
    fixture.componentInstance.priceClicked.subscribe(v => emittedValue = v);

    fixture.componentInstance.priceClicked.emit(50);
    expect(emittedValue).toBe(50);
  });
});
```

Key points:
- Use `fixture.componentRef.setInput()` for signal inputs (not direct property assignment)
- `computed()` values update automatically when inputs change (after `detectChanges`)
- Outputs can be subscribed to or spied on in tests

---

### Q77. You're migrating a large NgModule-based Angular 12 app to Angular 21 standalone. What's your migration strategy? (Expert)

**Answer:**

**Phase 1: Update Angular version incrementally**
- Update through each major version (12→13→14→...→21) following Angular Update Guide
- Fix breaking changes at each step
- This ensures dependency compatibility

**Phase 2: Convert to standalone (bottom-up)**
1. Run `ng generate @angular/core:standalone` schematic as a starting point
2. Convert **leaf components** first (components with no children)
3. Move up to container components
4. Convert directives and pipes to standalone
5. Convert feature modules to standalone route configs

**Phase 3: Replace module-based routing**
- Convert `RouterModule.forChild(routes)` to exported route arrays
- Convert `loadChildren: () => import(...).then(m => m.XModule)` to `loadComponent` or route array exports

**Phase 4: Replace root module**
- Convert `AppModule` to `bootstrapApplication()` + `appConfig`
- Move module-level providers to `appConfig` providers
- Replace `BrowserModule` with `provideBrowserGlobalErrorListeners()`
- Replace `HttpClientModule` with `provideHttpClient()`
- Replace `RouterModule.forRoot()` with `provideRouter()`

**Phase 5: Modernize patterns**
- Replace `@Input()` with `input()`
- Replace `@Output() + EventEmitter` with `output()`
- Replace `@ViewChild` with `viewChild()`
- Adopt signals for component state
- Replace `*ngIf/*ngFor` with `@if/@for`

**Key principle:** Do this incrementally. Every step should produce a working application. Never block feature development for migration.

---

### Q78. A component has `ngOnChanges`, `ngDoCheck`, and multiple signal `effect()`s. In what order do they execute? (Expert)

**Answer:**

```typescript
@Component({ ... })
export class ComplexComponent implements OnChanges, DoCheck {
  @Input() legacyInput = '';
  signalInput = input('');

  constructor() {
    effect(() => {
      console.log('Effect A:', this.signalInput());
    });
    effect(() => {
      console.log('Effect B:', someOtherSignal());
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('ngOnChanges');
  }

  ngDoCheck() {
    console.log('ngDoCheck');
  }
}
```

Execution order during a change detection cycle:

1. **`ngOnChanges`** — fires first if `@Input()` (decorator-based) bindings changed
2. **`ngDoCheck`** — fires next as part of the CD cycle
3. **Signal `effect()`s** — execute as part of Angular's signal notification phase, which runs during change detection. Effects are batched and run after Angular processes template bindings.

Important nuances:
- Signal inputs (`input()`) do NOT trigger `ngOnChanges` — they update their signal value
- `effect()` runs when any signal it reads changes, which is detected during CD
- Multiple effects don't have a guaranteed order relative to each other
- Effects are glitch-free — if multiple signals change simultaneously, the effect runs once with all new values

---

### Q79. Explain how Angular's template compiler transforms template syntax into executable code. (Expert)

**Answer:**

Angular's AOT compiler (`ngc`) transforms templates into **render instructions** at build time:

**Your template:**
```html
<div [class.active]="isActive()">
  @if (user(); as u) {
    <h1>{{ u.name }}</h1>
  }
</div>
```

**What the compiler generates (conceptual):**
```typescript
// Component definition with template function
ɵɵdefineComponent({
  template: function MyComponent_Template(rf, ctx) {
    if (rf & RenderFlags.Create) {
      ɵɵelementStart(0, 'div');
      ɵɵtemplate(1, MyComponent_Conditional_1_Template, 2, 1);
      ɵɵelementEnd();
    }
    if (rf & RenderFlags.Update) {
      ɵɵclassProp('active', ctx.isActive());
      ɵɵconditional(ctx.user() ? 1 : -1);
    }
  }
});
```

Key concepts:
- **Create phase** (once): Creates DOM elements and template structures
- **Update phase** (every CD): Updates bindings and evaluates conditions
- Templates are compiled into TypeScript/JavaScript functions — no HTML parsing at runtime
- Ivy's instruction set (`ɵɵelementStart`, `ɵɵclassProp`, etc.) maps 1:1 to DOM operations
- The `@if` block compiles to `ɵɵconditional` which creates/destroys embedded views
- Signal reads (`isActive()`, `user()`) are compiled as regular function calls

This is why AOT catches template errors at build time — the compiler type-checks the generated TypeScript.

---

### Q80. How would you implement a component that supports both reactive form integration AND standalone usage? (Expert)

**Answer:**

Use `ControlValueAccessor` with a fallback:

```typescript
@Component({
  selector: 'app-rating',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: RatingComponent,
    multi: true,
  }],
  template: `
    @for (star of stars; track star) {
      <button
        (click)="selectRating(star)"
        [class.filled]="star <= currentValue()"
        [attr.aria-label]="star + ' star'">
        ★
      </button>
    }
  `
})
export class RatingComponent implements ControlValueAccessor {
  maxStars = input(5);
  value = model(0);  // For standalone usage with two-way binding

  currentValue = computed(() => this.value());
  stars = computed(() => Array.from({ length: this.maxStars() }, (_, i) => i + 1));

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  selectRating(star: number): void {
    this.value.set(star);
    this.onChange(star);       // Notify reactive form
    this.onTouched();
  }

  // ControlValueAccessor interface
  writeValue(val: number): void {
    this.value.set(val ?? 0);
  }
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
```

Usage:
```html
<!-- Standalone with two-way binding -->
<app-rating [(value)]="myRating" />

<!-- In a reactive form -->
<app-rating formControlName="rating" />

<!-- In a template-driven form -->
<app-rating [(ngModel)]="rating" />
```

---

### Q81. What are the memory and performance implications of using `effect()` in components? How can you misuse it? (Expert)

**Answer:**

**How `effect()` works:**
- Registers a callback that runs whenever any signal read inside it changes
- Creates a reactive dependency graph at runtime
- Effects are tracked by Angular's injector and cleaned up on destroy

**Performance implications:**
- Each `effect()` adds an entry to the reactive graph — thousands of effects can slow change detection
- Effects run synchronously during change detection (not asynchronously like RxJS)
- Nested signal reads create deep dependency chains

**Common misuses:**

1. **Using `effect()` for derived state** (use `computed()` instead):
```typescript
// BAD: effect to set a signal from another signal
effect(() => { this.fullName.set(this.firstName() + ' ' + this.lastName()); });

// GOOD: computed derives the value automatically
fullName = computed(() => this.firstName() + ' ' + this.lastName());
```

2. **Using `effect()` for HTTP calls on every change**:
```typescript
// BAD: fires HTTP request on every signal change
effect(() => { this.http.get(`/api/users/${this.userId()}`).subscribe(...); });

// GOOD: use rxResource or explicit debouncing
userResource = rxResource({
  request: () => this.userId(),
  loader: ({ request: id }) => this.http.get(`/api/users/${id}`)
});
```

3. **Creating effects inside loops**:
```typescript
// BAD: creates unbounded effects
for (const item of items) {
  effect(() => { ... });  // Memory leak if items change
}
```

4. **Circular dependencies**: Effect A writes to signal X, effect B reads X and writes to Y, effect A reads Y — infinite loop.

**Best practice:** Use `effect()` for **side effects only** (DOM manipulation, logging, localStorage writes). For derived state, always use `computed()`.

---

### Q82. You need to build a plugin system where third-party code can register custom components at runtime. How would you architect this? (Expert)

**Answer:**

```typescript
// plugin-registry.service.ts
import { Injectable, Type, signal } from '@angular/core';

export interface PluginDefinition {
  id: string;
  name: string;
  component: Type<unknown>;  // The component class
  position: 'sidebar' | 'main' | 'toolbar';
}

@Injectable({ providedIn: 'root' })
export class PluginRegistry {
  private readonly _plugins = signal<Map<string, PluginDefinition>>(new Map());
  readonly plugins = this._plugins.asReadonly();

  register(plugin: PluginDefinition): void {
    this._plugins.update(map => {
      const newMap = new Map(map);
      newMap.set(plugin.id, plugin);
      return newMap;
    });
  }

  getByPosition(position: string) {
    return computed(() =>
      Array.from(this._plugins().values()).filter(p => p.position === position)
    );
  }
}

// plugin-host.component.ts
import { Component, computed, inject, ViewContainerRef, viewChild, effect } from '@angular/core';

@Component({
  selector: 'app-plugin-host',
  template: `
    <div class="plugin-area">
      <ng-container #pluginOutlet></ng-container>
    </div>
  `
})
export class PluginHostComponent {
  position = input.required<string>();

  private readonly registry = inject(PluginRegistry);
  private readonly outlet = viewChild.required('pluginOutlet', { read: ViewContainerRef });

  private plugins = computed(() => this.registry.getByPosition(this.position())());

  constructor() {
    effect(() => {
      const vcr = this.outlet();
      vcr.clear();
      for (const plugin of this.plugins()) {
        vcr.createComponent(plugin.component);
      }
    });
  }
}

// Usage in host app:
<app-plugin-host position="sidebar" />

// Third-party plugin registration:
bootstrapApplication(App, {
  providers: [{
    provide: APP_INITIALIZER,
    useFactory: (registry: PluginRegistry) => () => {
      registry.register({
        id: 'weather-widget',
        name: 'Weather',
        component: WeatherWidgetComponent,
        position: 'sidebar'
      });
    },
    deps: [PluginRegistry],
    multi: true,
  }]
});
```

This architecture uses:
- `ViewContainerRef.createComponent()` for dynamic component instantiation
- Signal-based registry for reactive plugin management
- `APP_INITIALIZER` for plugin registration at startup
- No NgModules needed — standalone components all the way

---

## Section 8: System Design / Architecture Questions

### Q83. How would you structure a large Angular application for a team of 20 developers? (Expert)

**Answer:**

**Monorepo with Nx:**
```
apps/
  web-app/          (main application shell)
  admin-app/        (admin dashboard)
libs/
  shared/
    ui/             (reusable UI components: buttons, modals, tables)
    util/           (utility functions, pipes, validators)
    models/         (shared interfaces and types)
  features/
    auth/           (authentication feature — login, register, guards)
    products/       (product catalog feature)
    orders/         (order management feature)
    users/          (user management feature)
  data-access/
    products-api/   (HTTP services for products)
    orders-api/     (HTTP services for orders)
```

**Key principles:**

1. **Feature-based organization**: Each feature is a self-contained library with its own components, services, routes, and tests.

2. **Enforce boundaries**: Nx module boundary rules prevent unauthorized cross-feature imports. `products` feature cannot import from `orders` feature directly — they communicate through shared services or state.

3. **Smart/Dumb component split**: Feature libraries contain "smart" (connected) components. Shared UI contains "dumb" (presentational) components.

4. **Route-level code splitting**: Each feature lazy-loads its own routes.

5. **Team ownership**: Each team owns specific feature libraries. Clear CODEOWNERS file.

6. **Consistent patterns**: Shared architectural guidelines, linting rules, and schematics ensure consistency across teams.

---

### Q84. Design a dashboard application that displays real-time data from multiple sources. How do you handle the component architecture? (Expert)

**Answer:**

```
DashboardShell (smart component)
├── Toolbar (presentational — filters, date range, refresh)
├── GridLayout (smart — manages widget positions via CDK drag-drop)
│   ├── Widget wrapper (handles resize, loading state, error boundary)
│   │   ├── MetricsWidget (presentational — receives data via input)
│   │   ├── ChartWidget (presentational — renders chart from data input)
│   │   ├── TableWidget (presentational — paginated data table)
│   │   └── MapWidget (deferred — heavy, loads on viewport)
│   └── ...
└── NotificationPanel (sidebar — real-time alerts)
```

**Data architecture:**
```typescript
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly ws = inject(WebSocketService);
  private readonly http = inject(HttpClient);

  // Real-time metrics via WebSocket
  readonly metrics = toSignal(
    this.ws.connect('ws://api/metrics').pipe(
      retry({ delay: 3000 }),
      shareReplay(1)
    ),
    { initialValue: null }
  );

  // Historical data via HTTP (triggered by date range changes)
  readonly dateRange = signal<DateRange>(DEFAULT_RANGE);
  readonly historicalData = rxResource({
    request: () => this.dateRange(),
    loader: ({ request: range }) =>
      this.http.get<HistoricalData>(`/api/data?from=${range.from}&to=${range.to}`)
  });
}
```

**Key decisions:**
- Widgets are **presentational** — they receive data via inputs, making them reusable and testable
- **WebSocket** for real-time data, converted to signals via `toSignal()`
- **`rxResource`** for HTTP data that depends on user selections
- **`@defer (on viewport)`** for below-the-fold heavy widgets (maps, complex charts)
- **Error boundaries** at the widget level — one failing widget doesn't crash the dashboard
- **OnPush** on all widgets for performance with many updating simultaneously

---

### Q85. How would you implement error boundaries in Angular (similar to React's Error Boundaries)? (Expert)

**Answer:**

Angular doesn't have built-in error boundaries, but you can build them:

```typescript
@Component({
  selector: 'app-error-boundary',
  template: `
    @if (hasError()) {
      <div class="error-fallback">
        <h3>Something went wrong</h3>
        <p>{{ errorMessage() }}</p>
        <button (click)="retry()">Retry</button>
      </div>
    } @else {
      <ng-content />
    }
  `
})
export class ErrorBoundaryComponent {
  hasError = signal(false);
  errorMessage = signal('');

  private readonly errorHandler = inject(ErrorHandler);

  retry(): void {
    this.hasError.set(false);
    this.errorMessage.set('');
  }

  handleError(error: Error): void {
    this.hasError.set(true);
    this.errorMessage.set(error.message);
    this.errorHandler.handleError(error);  // Still log the error
  }
}
```

For `@defer` blocks, Angular provides built-in error handling:
```html
@defer (on viewport) {
  <app-heavy-widget />
} @error {
  <p>Failed to load this widget.</p>
}
```

For a more robust solution, combine with a custom `ErrorHandler`:
```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    // Log to monitoring service (Sentry, DataDog)
    console.error('Unhandled error:', error);
    // Optionally notify a global error state service
  }
}
```

---

### Q86. You're building a form wizard with 10 steps. Steps can be dynamic (shown/hidden based on previous answers). How do you architect this? (Expert)

**Answer:**

```typescript
// Wizard step definition
interface WizardStep {
  id: string;
  label: string;
  component: Type<WizardStepComponent>;
  isVisible: (formData: Record<string, unknown>) => boolean;
}

// Each step implements this interface
interface WizardStepComponent {
  form: FormGroup;
  isValid: Signal<boolean>;
}

// Wizard service manages state
@Injectable()
export class WizardService {
  private readonly _formData = signal<Record<string, unknown>>({});
  private readonly _currentStepIndex = signal(0);
  private readonly _steps = signal<WizardStep[]>([]);

  readonly formData = this._formData.asReadonly();
  readonly visibleSteps = computed(() =>
    this._steps().filter(step => step.isVisible(this._formData()))
  );
  readonly currentStep = computed(() =>
    this.visibleSteps()[this._currentStepIndex()]
  );
  readonly isFirstStep = computed(() => this._currentStepIndex() === 0);
  readonly isLastStep = computed(() =>
    this._currentStepIndex() === this.visibleSteps().length - 1
  );
  readonly progress = computed(() =>
    ((this._currentStepIndex() + 1) / this.visibleSteps().length) * 100
  );

  updateFormData(stepId: string, data: Record<string, unknown>): void {
    this._formData.update(current => ({ ...current, [stepId]: data }));
  }

  next(): void {
    if (!this.isLastStep()) {
      this._currentStepIndex.update(i => i + 1);
    }
  }

  previous(): void {
    if (!this.isFirstStep()) {
      this._currentStepIndex.update(i => i - 1);
    }
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.visibleSteps().length) {
      this._currentStepIndex.set(index);
    }
  }
}

// Wizard host component
@Component({
  selector: 'app-wizard',
  providers: [WizardService],  // Scoped to this wizard instance
  template: `
    <div class="wizard">
      <nav class="steps">
        @for (step of wizard.visibleSteps(); track step.id; let i = $index) {
          <button [class.active]="step === wizard.currentStep()"
                  (click)="wizard.goToStep(i)">
            {{ step.label }}
          </button>
        }
      </nav>

      <progress [value]="wizard.progress()" max="100"></progress>

      <div class="step-content">
        <ng-container #stepHost></ng-container>
      </div>

      <footer>
        <button (click)="wizard.previous()" [disabled]="wizard.isFirstStep()">Back</button>
        @if (wizard.isLastStep()) {
          <button (click)="submit()">Submit</button>
        } @else {
          <button (click)="wizard.next()">Next</button>
        }
      </footer>
    </div>
  `
})
export class WizardComponent {
  wizard = inject(WizardService);
  stepHost = viewChild.required('stepHost', { read: ViewContainerRef });

  constructor() {
    effect(() => {
      const step = this.wizard.currentStep();
      if (step) {
        const vcr = this.stepHost();
        vcr.clear();
        vcr.createComponent(step.component);
      }
    });
  }

  submit(): void {
    console.log('Final data:', this.wizard.formData());
  }
}
```

This architecture provides:
- Dynamic step visibility based on form data
- Each step is a separate component (code splitting possible)
- `WizardService` scoped per wizard instance via `providers`
- Progress tracking, navigation, and validation built in
- Steps are dynamically rendered via `ViewContainerRef`

---

### Q87. How would you implement A/B testing at the component level in Angular? (Expert)

**Answer:**

```typescript
// ab-test.service.ts
@Injectable({ providedIn: 'root' })
export class ABTestService {
  private readonly experiments = signal<Map<string, string>>(new Map());

  getVariant(experimentId: string): Signal<string> {
    return computed(() => this.experiments().get(experimentId) ?? 'control');
  }

  async loadExperiments(userId: string): Promise<void> {
    const response = await fetch(`/api/experiments?user=${userId}`);
    const data: Record<string, string> = await response.json();
    this.experiments.set(new Map(Object.entries(data)));
  }
}

// ab-test.directive.ts — structural directive approach
@Directive({ selector: '[abTest]' })
export class ABTestDirective {
  private readonly abService = inject(ABTestService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef);
  private readonly destroyRef = inject(DestroyRef);

  experiment = input.required<string>({ alias: 'abTest' });
  variant = input.required<string>({ alias: 'abTestVariant' });

  constructor() {
    effect(() => {
      const currentVariant = this.abService.getVariant(this.experiment())();
      this.vcr.clear();
      if (currentVariant === this.variant()) {
        this.vcr.createEmbeddedView(this.templateRef);
      }
    });
  }
}

// Usage:
<div *abTest="'checkout-flow'; variant: 'control'">
  <app-checkout-standard />
</div>
<div *abTest="'checkout-flow'; variant: 'variant-a'">
  <app-checkout-streamlined />
</div>
```

Alternative approach with `@defer`:
```html
@defer (when abService.getVariant('hero')() === 'variant-a') {
  <app-hero-variant-a />
} @placeholder {
  <app-hero-control />
}
```

---

### Q88. Compare the component architecture of Angular vs React vs Vue from a FAANG senior perspective. (Expert)

**Answer:**

| Aspect | Angular | React | Vue |
|--------|---------|-------|-----|
| Component model | Class-based with decorators + signals | Functions with hooks | SFC with Composition API |
| Template | HTML with extensions | JSX (JavaScript) | HTML with directives |
| Style scoping | ViewEncapsulation (3 modes) | CSS-in-JS / CSS Modules | Scoped styles (`<style scoped>`) |
| State | Signals + Services + NgRx | useState/useReducer + Context | ref/reactive + Pinia |
| DI system | Built-in hierarchical DI | None (prop drilling, Context) | provide/inject |
| Reactivity | Signals (fine-grained) + Zone.js | Virtual DOM diffing | Proxy-based reactivity |
| Forms | Reactive Forms + CVA | Controlled components (manual) | v-model + validation libs |
| CLI/Tooling | Opinionated CLI (ng) | Flexible (CRA, Vite, Next) | Vite-based (create-vue) |
| Type safety | Strong (strict templates) | Good (with TypeScript) | Good (with TypeScript) |
| Bundle size (min) | ~45KB | ~2.5KB (core) | ~16KB |
| Best for | Large enterprise apps, teams | Flexible, ecosystem-rich | Progressive enhancement |

**Angular's unique strengths for FAANG:**
1. Built-in DI hierarchy eliminates an entire class of state management problems
2. Opinionated structure means consistent codebases across teams
3. Template type-checking catches errors at build time
4. Comprehensive testing utilities built in

**Angular's trade-offs:**
1. Larger initial bundle size
2. Steeper learning curve
3. More boilerplate (though signals are reducing this)
4. Less flexibility in tooling choices

---

### Q89. How does Angular's Ivy rendering engine work under the hood? (Expert)

**Answer:**

Ivy (default since Angular 9) replaced the View Engine with a fundamentally different architecture:

**Key principles:**

1. **Locality**: Each component is compiled independently. The compiled code for a component contains everything needed to render it — no global metadata registry needed. This enables:
   - Faster incremental builds
   - Better tree-shaking
   - Lazy loading of individual components

2. **Instruction-based rendering**: Templates compile to sequences of instructions:
```typescript
// @if (condition) { <div>Hello</div> } compiles to:
function Template(rf, ctx) {
  if (rf & 1) {  // Create
    ɵɵtemplate(0, Conditional_Template, 2, 0);
  }
  if (rf & 2) {  // Update
    ɵɵconditional(ctx.condition ? 0 : -1);
  }
}
```

3. **Tree-shakable**: Framework features not used by any component are removed from the bundle. If no component uses `ngSwitch`, the `ngSwitch` code isn't included.

4. **Incremental DOM**: Unlike React's Virtual DOM (which creates a full virtual tree and diffs it), Ivy uses **incremental DOM** — it traverses the component tree and directly mutates the real DOM. This uses less memory (no virtual tree allocation) but requires more sophisticated compilation.

5. **Component definition on the class**: Ivy attaches the compiled template function directly to the component class via `ɵcmp`. This is the "locality" — no separate NgModule metadata store needed.

---

### Q90. You're tasked with improving the developer experience of a 500-component Angular application. What architectural changes would you propose? (Expert)

**Answer:**

**1. Migrate to Standalone Components**
- Eliminate NgModule complexity
- Each component's dependencies become explicit
- Better IDE support (auto-import, refactoring)
- Run `ng generate @angular/core:standalone` as a starting point

**2. Adopt Signal-Based Patterns**
- Replace `@Input`/`@Output` with `input()`/`output()`
- Replace BehaviorSubject services with signal-based services
- Replace `ngOnChanges` with `computed()` and `effect()`
- Reduces boilerplate significantly

**3. Implement Nx Monorepo**
- Split the 500 components into feature libraries
- Enforce module boundaries via lint rules
- Enable affected-based testing (only test what changed)
- Improve build times with computation caching

**4. New Control Flow + `@defer`**
- Migrate `*ngIf/*ngFor` to `@if/@for` (schematic available)
- Add `@defer` blocks to heavy below-the-fold components
- Mandatory `track` prevents performance regressions

**5. Testing Infrastructure**
- Move from Karma to Vitest (faster, modern)
- Add component testing with Playwright
- Set up visual regression testing

**6. Shared Component Library**
- Extract common UI into a shared library
- Document with Storybook
- Add automated accessibility testing

**7. Developer Tooling**
- Custom schematics for generating components with team conventions
- Shared ESLint config with Angular-specific rules
- Pre-commit hooks for formatting and linting

**Prioritization:** Start with #1 (standalone) and #3 (Nx) as they have the highest impact on daily developer experience. Then #2 (signals) and #4 (control flow) as ongoing modernization.

---

## Quick Reference: Top 10 Most-Asked Questions in FAANG Angular Interviews

1. Explain Angular's change detection and how OnPush differs from Default
2. What are signals and how do they change Angular's reactivity model?
3. NgModule vs Standalone — trade-offs and migration strategy
4. Component lifecycle hooks — order, use cases, and gotchas
5. Template syntax — binding types and new control flow
6. View encapsulation — how it works and when to use each mode
7. Component communication patterns — when to use which
8. Performance optimization strategies for large Angular apps
9. Dependency injection hierarchy and provider scoping
10. How would you architect a large-scale Angular application?
