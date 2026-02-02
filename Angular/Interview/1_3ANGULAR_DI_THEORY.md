# Dependency Injection (DI) — In-Depth Theory

> **Phase 1, Topic 3** of the Angular Preparation Roadmap
> Target audience: 10+ year senior developers preparing for FAANG Staff / Principal / Architect-level interviews
> Angular version context: Angular 21 (standalone-first, signals, `inject()` function)

---

## Table of Contents

1. [What Is Dependency Injection and Why Does Angular Use It?](#1-what-is-dependency-injection-and-why-does-angular-use-it)
2. [Injector Hierarchy and Resolution](#2-injector-hierarchy-and-resolution)
3. [Provider Types](#3-provider-types)
4. [Injection Tokens](#4-injection-tokens)
5. [providedIn: 'root' vs Module vs Component Providers](#5-providedin-root-vs-module-vs-component-providers)
6. [Multi-Providers and Optional Dependencies](#6-multi-providers-and-optional-dependencies)
7. [Forward References and Circular Dependencies](#7-forward-references-and-circular-dependencies)
8. [The `inject()` Function — Modern DI](#8-the-inject-function)
9. [Advanced DI Patterns](#9-advanced-di-patterns)

---

## 1. What Is Dependency Injection and Why Does Angular Use It?

### 1.1 The Core Concept

Dependency Injection (DI) is a design pattern where a class **receives** its dependencies from an external source rather than **creating** them internally. It is a specific form of Inversion of Control (IoC).

```typescript
// WITHOUT DI — tight coupling
class OrderService {
  private http = new HttpClient();              // Creates its own dependency
  private logger = new LoggerService();         // Creates its own dependency
  private auth = new AuthService(new HttpClient()); // Nested creation

  getOrders() {
    return this.http.get('/orders');
  }
}

// WITH DI — loose coupling
class OrderService {
  private readonly http = inject(HttpClient);    // Injected by framework
  private readonly logger = inject(LoggerService);
  private readonly auth = inject(AuthService);

  getOrders() {
    return this.http.get('/orders');
  }
}
```

### 1.2 Why Angular Chose DI as a Core Architecture

Angular's DI system is not an optional add-on — it is fundamental to how the framework works. Every component, directive, pipe, service, guard, interceptor, and resolver is created by the DI system.

**Benefits for large-scale applications:**

1. **Testability**: Swap real services with mocks/stubs without changing component code
2. **Loose coupling**: Components depend on abstractions (tokens), not concrete implementations
3. **Hierarchical scoping**: Different parts of the app can get different instances of the same service
4. **Lifecycle management**: Angular creates, shares, and destroys service instances automatically
5. **Configuration flexibility**: Same code, different behavior based on environment or context

### 1.3 The Three Key Actors

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  Consumer    │───────▶│  Injector    │───────▶│  Provider    │
│             │ asks    │             │ uses    │             │
│ Component   │ for a   │ DI Container│ config  │ Recipe to   │
│ or Service  │ token   │             │ to      │ create the  │
│             │         │             │ create  │ dependency  │
└─────────────┘        └─────────────┘        └─────────────┘
```

- **Consumer**: The class that needs a dependency (component, service, directive, etc.)
- **Injector**: The container that knows how to create and cache instances
- **Provider**: The configuration that tells the injector HOW to create a specific dependency

### 1.4 How DI Relates to Angular's Compilation

When Angular compiles a component, it analyzes the constructor parameters (or `inject()` calls) and generates factory functions that resolve dependencies from the appropriate injector. With AOT compilation, this analysis happens at build time:

```typescript
// Your code:
class ProductComponent {
  private readonly productService = inject(ProductService);
}

// What Angular generates (conceptual):
ɵɵdefineComponent({
  factory: () => new ProductComponent(ɵɵdirectiveInject(ProductService)),
  // ...
});
```

The `ɵɵdirectiveInject` instruction knows how to walk the injector hierarchy to find the right provider.

---

## 2. Injector Hierarchy and Resolution

### 2.1 The Two Injector Trees

Angular maintains **two parallel injector hierarchies** that work together:

```
                    ┌──────────────────────────┐
                    │   Platform Injector       │  (shared across apps)
                    │   PlatformRef, etc.       │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Root Environment        │  (created by bootstrapApplication)
                    │   Injector                │
                    │   providedIn:'root'       │
                    │   appConfig providers     │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                                      │
   ┌──────────▼──────────┐              ┌────────────▼────────────┐
   │ Route Environment   │              │ Route Environment       │
   │ Injector (/admin)   │              │ Injector (/products)    │
   │ route providers     │              │ route providers         │
   └──────────┬──────────┘              └────────────┬────────────┘
              │                                      │
     ┌────────▼────────┐                    ┌────────▼────────┐
     │ Element Injector │                    │ Element Injector │
     │ (AdminComponent) │                    │ (ProductList)    │
     │ component provs  │                    │ component provs  │
     └────────┬────────┘                    └────────┬────────┘
              │                                      │
     ┌────────▼────────┐                    ┌────────▼────────┐
     │ Element Injector │                    │ Element Injector │
     │ (AdminTable)     │                    │ (ProductCard)    │
     └─────────────────┘                    └─────────────────┘
```

**Environment Injectors** (formerly "module injectors"):
- Created by `bootstrapApplication`, lazy-loaded routes with `providers`, or manually via `createEnvironmentInjector`
- Hold long-lived singleton services
- Form a flat or shallow hierarchy

**Element Injectors** (formerly "component injectors"):
- Created for each component/directive that has a `providers` or `viewProviders` array
- Follow the DOM tree structure (parent-child relationships)
- Short-lived — destroyed when the component is destroyed

### 2.2 The Resolution Algorithm

When a class requests a dependency, Angular follows this algorithm:

```
1. Check the element injector of the requesting component
   └── Found? Return it.
   └── Not found? Go to step 2.

2. Walk UP the element injector tree (parent component → grandparent → ...)
   └── Found? Return it.
   └── Reached the root component without finding? Go to step 3.

3. Check the environment injector chain (route → root → platform)
   └── Found? Return it.
   └── Not found? Go to step 4.

4. Is the dependency marked @Optional()?
   └── Yes? Return null.
   └── No? THROW NullInjectorError!
```

**Critical insight**: The element injector tree is checked FIRST, then the environment injector chain. This means a component-level provider always shadows a root-level provider.

### 2.3 Resolution Modifiers

Angular provides decorators (and `inject()` options) that alter the resolution algorithm:

#### `@Optional()` / `{ optional: true }`

Returns `null` instead of throwing if the dependency is not found:

```typescript
// Decorator style:
constructor(@Optional() private analytics: AnalyticsService | null) {}

// inject() style:
private readonly analytics = inject(AnalyticsService, { optional: true });
```

#### `@Self()`/ `{ self: true }`

Only check the **current** element injector — don't walk up the tree:

```typescript
// Only gets LoggerService if THIS component provides it
private readonly logger = inject(LoggerService, { self: true });
```

Use case: Ensuring a component gets its own instance, not a parent's.

#### `@SkipSelf()` / `{ skipSelf: true }`

Skip the current element injector — start resolution from the **parent**:

```typescript
// Gets the PARENT's instance, even if this component provides one
private readonly parentLogger = inject(LoggerService, { skipSelf: true });
```

Use case: A child component that needs to access the parent's service instance (e.g., nested form groups accessing the parent form).

#### `@Host()` / `{ host: true }`

Stop resolution at the **host element** boundary (the component that contains the requesting directive). Does not go above the host component into its parents, and does not check the environment injector:

```typescript
// Only finds the provider on the host component or its element injector
private readonly tooltip = inject(TooltipService, { host: true });
```

Use case: Directives that need services provided by the component they're attached to, but not from anywhere else.

### 2.4 Resolution Modifier Combinations

```typescript
// Optional + SkipSelf: Get parent's instance, or null if no parent provides it
inject(LoggerService, { optional: true, skipSelf: true });

// Optional + Self: Get own instance, or null if not provided locally
inject(LoggerService, { optional: true, self: true });

// SkipSelf + Host: Check from parent up to host boundary only
inject(FormGroupDirective, { skipSelf: true, host: true });
```

### 2.5 `providers` vs `viewProviders`

Components have TWO provider arrays:

```typescript
@Component({
  providers: [ServiceA],      // Available to component + projected content + children
  viewProviders: [ServiceB],  // Available to component + children ONLY (not projected content)
})
```

The difference matters when using content projection (`<ng-content>`):

```typescript
// parent.ts
@Component({
  template: `
    <app-card>
      <app-projected-child />  <!-- This child gets ServiceA but NOT ServiceB -->
    </app-card>
  `
})

// card.ts
@Component({
  selector: 'app-card',
  providers: [ServiceA],       // Projected children CAN see this
  viewProviders: [ServiceB],   // Projected children CANNOT see this
  template: `
    <ng-content />
    <app-view-child />          <!-- This child gets BOTH ServiceA and ServiceB -->
  `
})
```

**Use case for `viewProviders`**: When you want to provide a service that is an implementation detail of your component and should NOT be accessible to content projected from outside. This protects your component's encapsulation.

---

## 3. Provider Types

### 3.1 Overview

A **provider** is a configuration object that tells the injector how to create an instance for a given token. Angular supports four provider types:

```typescript
providers: [
  // 1. useClass — create a new instance of a class
  { provide: LoggerService, useClass: LoggerService },

  // 2. useValue — use this exact value
  { provide: API_URL, useValue: 'https://api.example.com' },

  // 3. useFactory — call this function to create the value
  { provide: DataService, useFactory: (http: HttpClient) => new DataService(http), deps: [HttpClient] },

  // 4. useExisting — alias one token to another
  { provide: AbstractLogger, useExisting: ConsoleLoggerService },
]
```

### 3.2 `useClass` — Class Provider

Creates a new instance of the specified class. The most common provider type.

```typescript
// Shorthand (provide and useClass are the same class):
providers: [LoggerService]
// Equivalent to:
providers: [{ provide: LoggerService, useClass: LoggerService }]

// Substitution (swap implementation):
providers: [{ provide: LoggerService, useClass: FileLoggerService }]
```

When the injector encounters a request for `LoggerService`, it creates an instance of `FileLoggerService` instead. The consumer doesn't know — it just uses the `LoggerService` interface.

```typescript
// Real-world: swap services based on environment
providers: [
  {
    provide: AnalyticsService,
    useClass: environment.production
      ? GoogleAnalyticsService
      : NoOpAnalyticsService,
  }
]
```

**Key behavior**: The class is instantiated with DI — its own constructor dependencies are resolved automatically.

### 3.3 `useValue` — Value Provider

Provides a fixed value. No class instantiation, no DI resolution.

```typescript
providers: [
  { provide: API_BASE_URL, useValue: 'https://api.example.com' },
  { provide: APP_CONFIG, useValue: { version: '1.0', maxRetries: 3 } },
  { provide: IS_PRODUCTION, useValue: true },
]
```

**Common use cases:**
- Configuration objects
- Constants
- Simple values (strings, numbers, booleans)
- Pre-created object instances

**Gotcha**: The value is provided AS-IS. If you provide an object, all consumers get the **same reference**. Mutating it in one place affects all consumers.

### 3.4 `useFactory` — Factory Provider

Calls a function to create the value. The function can have its own dependencies specified in `deps`.

```typescript
providers: [
  {
    provide: StorageService,
    useFactory: (platformId: object) => {
      if (isPlatformBrowser(platformId)) {
        return new LocalStorageService();
      }
      return new InMemoryStorageService();
    },
    deps: [PLATFORM_ID],
  }
]
```

**When to use `useFactory`:**
- Conditional logic to decide which instance to create
- Creating instances that need configuration not available through DI
- Creating instances from third-party libraries that don't use Angular DI
- Async initialization (returning a Promise that resolves to the instance)

**`deps` array**: Lists the tokens that should be injected as arguments to the factory function. The order of `deps` matches the function parameters.

```typescript
{
  provide: DatabaseService,
  useFactory: (http: HttpClient, config: AppConfig, logger: LoggerService) => {
    return new DatabaseService(http, config.dbUrl, logger);
  },
  deps: [HttpClient, APP_CONFIG, LoggerService],
  // deps[0] → http, deps[1] → config, deps[2] → logger
}
```

### 3.5 `useExisting` — Alias Provider

Creates an alias from one token to another. Does NOT create a new instance — it makes two tokens resolve to the same instance.

```typescript
providers: [
  ConsoleLoggerService,  // The actual service instance
  { provide: LoggerService, useExisting: ConsoleLoggerService },
  { provide: AbstractLogger, useExisting: ConsoleLoggerService },
]
```

Now `LoggerService`, `AbstractLogger`, and `ConsoleLoggerService` all resolve to the **same singleton instance** of `ConsoleLoggerService`.

**Key use cases:**

1. **Interface-based programming**: An abstract class serves as the interface, and `useExisting` maps it to the concrete implementation:
```typescript
abstract class Logger {
  abstract log(message: string): void;
}

@Injectable({ providedIn: 'root' })
class ConsoleLogger extends Logger {
  log(message: string) { console.log(message); }
}

// In providers:
{ provide: Logger, useExisting: ConsoleLogger }
```

2. **Narrowing an API**: Expose a read-only version of a service:
```typescript
// Full service (used internally):
@Injectable({ providedIn: 'root' })
class UserStateService {
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  setUser(user: User) { this._user.set(user); }
  clearUser() { this._user.set(null); }
}

// Read-only version (exposed to components):
abstract class UserReader {
  abstract readonly user: Signal<User | null>;
}

// Wire them together:
{ provide: UserReader, useExisting: UserStateService }
```

3. **Multiple tokens, one instance**: When different parts of the code need the same object under different type names.

### 3.6 Provider Comparison Table

| Type | Creates new instance? | Supports DI for deps? | Singleton by default? | Use when |
|------|----------------------|----------------------|----------------------|----------|
| `useClass` | Yes | Yes (constructor) | Yes (in env injector) | Swapping implementations |
| `useValue` | No (uses literal) | No | N/A (same value) | Constants, config objects |
| `useFactory` | Yes (via function) | Yes (via `deps`) | Yes (in env injector) | Conditional creation, complex setup |
| `useExisting` | No (alias) | No | N/A (alias) | Token aliasing, interface mapping |

---

## 4. Injection Tokens

### 4.1 What is an Injection Token?

An injection token is the **key** that the DI system uses to look up a provider. In TypeScript, there are two kinds of tokens:

1. **Class references**: The class itself is the token
2. **`InjectionToken<T>`**: A typed, named token for non-class values

### 4.2 Using Classes as Tokens

When you inject a service by its class, the class itself is the token:

```typescript
@Injectable({ providedIn: 'root' })
class UserService {
  // ...
}

// The class 'UserService' is both the token AND the value
private readonly userService = inject(UserService);
```

This works because TypeScript classes exist at runtime (unlike interfaces, which are erased during compilation). Angular uses the class reference as a key in its provider map.

### 4.3 `InjectionToken<T>` — Tokens for Non-Class Dependencies

You can't use a TypeScript `interface` or a primitive type as a DI token because they don't exist at runtime. `InjectionToken` solves this:

```typescript
import { InjectionToken } from '@angular/core';

// Create typed tokens for non-class values
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const MAX_RETRIES = new InjectionToken<number>('MAX_RETRIES');
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
export const IS_PRODUCTION = new InjectionToken<boolean>('IS_PRODUCTION');

// Register providers
providers: [
  { provide: API_BASE_URL, useValue: 'https://api.example.com' },
  { provide: MAX_RETRIES, useValue: 3 },
  { provide: APP_CONFIG, useValue: { theme: 'dark', locale: 'en' } },
]

// Inject
private readonly apiUrl = inject(API_BASE_URL);          // type: string
private readonly maxRetries = inject(MAX_RETRIES);       // type: number
private readonly config = inject(APP_CONFIG);             // type: AppConfig
```

The string argument (`'API_BASE_URL'`) is a **description** used in error messages. It does NOT make the token unique — the `InjectionToken` instance itself is the unique key (by reference identity).

### 4.4 `InjectionToken` with `factory` — Tree-Shakable Tokens

Just like `providedIn: 'root'` for services, `InjectionToken` supports a `factory` function that makes the token tree-shakable:

```typescript
export const LOGGER = new InjectionToken<Logger>('LOGGER', {
  providedIn: 'root',
  factory: () => new ConsoleLogger(),
});
```

If no one injects `LOGGER`, the `ConsoleLogger` code is tree-shaken out of the bundle. The factory can also use `inject()` internally:

```typescript
export const AUTH_HEADER = new InjectionToken<string>('AUTH_HEADER', {
  providedIn: 'root',
  factory: () => {
    const authService = inject(AuthService);
    return `Bearer ${authService.getToken()}`;
  },
});
```

### 4.5 Abstract Classes as Tokens

Since TypeScript interfaces are erased at compile time, a common pattern is to use abstract classes as DI tokens:

```typescript
// This acts as both a type AND a token (exists at runtime)
abstract class DataRepository {
  abstract getAll(): Observable<Data[]>;
  abstract getById(id: string): Observable<Data>;
  abstract save(data: Data): Observable<void>;
}

// Concrete implementation
@Injectable()
class HttpDataRepository implements DataRepository {
  private readonly http = inject(HttpClient);

  getAll() { return this.http.get<Data[]>('/api/data'); }
  getById(id: string) { return this.http.get<Data>(`/api/data/${id}`); }
  save(data: Data) { return this.http.post<void>('/api/data', data); }
}

// In-memory implementation for testing
@Injectable()
class InMemoryDataRepository implements DataRepository {
  private data: Data[] = [];
  getAll() { return of(this.data); }
  getById(id: string) { return of(this.data.find(d => d.id === id)!); }
  save(data: Data) { this.data.push(data); return of(void 0); }
}

// Provider configuration
providers: [
  { provide: DataRepository, useClass: HttpDataRepository }
]

// In tests:
TestBed.configureTestingModule({
  providers: [{ provide: DataRepository, useClass: InMemoryDataRepository }]
});
```

### 4.6 Angular's Built-in Injection Tokens

Angular provides many built-in tokens:

| Token | Type | Purpose |
|-------|------|---------|
| `APP_INITIALIZER` | `(() => void \| Promise<void>)[]` | Run code before app renders |
| `ENVIRONMENT_INITIALIZER` | `(() => void)[]` | Run code when an environment injector is created |
| `PLATFORM_ID` | `string` | Identify browser vs server platform |
| `DOCUMENT` | `Document` | Safe reference to `document` (SSR-safe) |
| `LOCALE_ID` | `string` | Current locale for i18n |
| `APP_BASE_HREF` | `string` | Base URL for routing |
| `ErrorHandler` | `ErrorHandler` | Global error handler |
| `DEFAULT_CURRENCY_CODE` | `string` | Default currency for `CurrencyPipe` |

```typescript
// Using built-in tokens
private readonly document = inject(DOCUMENT);
private readonly platformId = inject(PLATFORM_ID);

ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    this.document.body.classList.add('app-loaded');
  }
}
```

---

## 5. `providedIn: 'root'` vs Module vs Component Providers

### 5.1 `providedIn: 'root'`

```typescript
@Injectable({
  providedIn: 'root'
})
export class UserService { }
```

**Behavior:**
- Registered in the root environment injector
- Singleton across the entire application
- **Tree-shakable**: If no code injects `UserService`, it's excluded from the bundle
- No need to list in any `providers` array

**When to use:** For application-wide singletons — the vast majority of services (data access, authentication, state management, utility services).

### 5.2 `providedIn: 'platform'`

```typescript
@Injectable({
  providedIn: 'platform'
})
export class SharedAnalytics { }
```

Registered in the platform injector. Shared across multiple Angular applications on the same page. Rare — only for multi-app scenarios (micro-frontends).

### 5.3 `providedIn: 'any'`

```typescript
@Injectable({
  providedIn: 'any'
})
export class CacheService { }
```

**Behavior:**
- Each lazy-loaded route boundary gets its own instance
- Eagerly loaded modules share the root instance
- Results in multiple singletons scoped to their lazy boundaries

**Use case:** When you want isolated state per feature area (e.g., a cache that shouldn't share data between features).

### 5.4 Route-Level Providers

```typescript
// admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [
      AdminStateService,
      { provide: API_BASE_URL, useValue: '/api/admin' },
    ],
    children: [
      { path: 'dashboard', loadComponent: () => import('./dashboard').then(m => m.DashboardComponent) },
      { path: 'users', loadComponent: () => import('./users').then(m => m.UsersComponent) },
    ]
  }
];
```

**Behavior:**
- Creates a child environment injector for this route subtree
- Services are scoped to these routes and destroyed when the user navigates away
- Ideal for feature-specific state that shouldn't persist globally

### 5.5 Component-Level Providers

```typescript
@Component({
  selector: 'app-editor',
  providers: [EditorStateService],
  template: `...`
})
export class EditorComponent { }
```

**Behavior:**
- Each component INSTANCE gets its own service instance
- The service is destroyed when the component is destroyed
- Children of this component get the same instance (unless they provide their own)

**Use case:** Per-component state, such as a form service, undo/redo manager, or local cache.

### 5.6 Comparison Matrix

| Scope | Lifetime | Instance Count | Tree-Shakable | Register At |
|-------|----------|---------------|---------------|-------------|
| `providedIn: 'root'` | App lifetime | 1 (singleton) | Yes | Service class |
| `providedIn: 'platform'` | Page lifetime | 1 across apps | Yes | Service class |
| `providedIn: 'any'` | Per lazy boundary | 1+ | Yes | Service class |
| Route `providers` | Route active | 1 per route | No | Route config |
| Component `providers` | Component alive | 1 per instance | No | Component metadata |
| Component `viewProviders` | Component alive | 1 per instance | No | Component metadata |

### 5.7 The Decision Flowchart

```
Do you need one instance for the entire app?
├── Yes → providedIn: 'root'
└── No
    ├── Scoped to a feature route?
    │   └── Yes → Route-level providers
    └── Scoped to a component instance?
        ├── Should projected content access it?
        │   ├── Yes → Component providers
        │   └── No → Component viewProviders
        └── Shared across lazy modules independently?
            └── Yes → providedIn: 'any'
```

---

## 6. Multi-Providers and Optional Dependencies

### 6.1 Multi-Providers

A **multi-provider** allows multiple values to be registered under the same token. Instead of the last registration winning (normal behavior), all registrations are collected into an array:

```typescript
const HTTP_INTERCEPTOR = new InjectionToken<HttpInterceptorFn[]>('HTTP_INTERCEPTOR');

providers: [
  { provide: HTTP_INTERCEPTOR, useValue: authInterceptor, multi: true },
  { provide: HTTP_INTERCEPTOR, useValue: loggingInterceptor, multi: true },
  { provide: HTTP_INTERCEPTOR, useValue: errorInterceptor, multi: true },
]

// When injected, you get an array:
const interceptors = inject(HTTP_INTERCEPTOR);
// interceptors = [authInterceptor, loggingInterceptor, errorInterceptor]
```

**Key rule:** `multi: true` must be set on ALL registrations for a given token, or on NONE. Mixing them causes undefined behavior.

### 6.2 Built-in Multi-Provider Tokens

Angular uses multi-providers extensively:

| Token | Purpose |
|-------|---------|
| `APP_INITIALIZER` | Multiple initialization functions |
| `ENVIRONMENT_INITIALIZER` | Multiple environment init functions |
| `HTTP_INTERCEPTORS` | Multiple HTTP interceptors (class-based, legacy) |
| `NG_VALIDATORS` | Multiple validators for form controls |
| `NG_VALUE_ACCESSOR` | Control value accessor for form controls |
| `NG_ASYNC_VALIDATORS` | Multiple async validators |

### 6.3 Creating Your Own Multi-Provider Extension Point

```typescript
// Define the token
export interface Plugin {
  name: string;
  initialize(): void;
}

export const APP_PLUGIN = new InjectionToken<Plugin[]>('APP_PLUGIN');

// Register plugins from different parts of the app
// Core plugin:
{ provide: APP_PLUGIN, useClass: CorePlugin, multi: true }

// Analytics plugin:
{ provide: APP_PLUGIN, useClass: AnalyticsPlugin, multi: true }

// Feature-specific plugin:
{ provide: APP_PLUGIN, useClass: FeaturePlugin, multi: true }

// Use all plugins:
@Injectable({ providedIn: 'root' })
class PluginManager {
  private readonly plugins = inject(APP_PLUGIN);

  initializeAll(): void {
    this.plugins.forEach(plugin => {
      console.log(`Initializing plugin: ${plugin.name}`);
      plugin.initialize();
    });
  }
}
```

### 6.4 Optional Dependencies

When a dependency might not be available, use `{ optional: true }`:

```typescript
@Injectable({ providedIn: 'root' })
class LoggerService {
  // Analytics might not be provided in all environments
  private readonly analytics = inject(AnalyticsService, { optional: true });

  log(message: string): void {
    console.log(message);
    this.analytics?.trackEvent('log', { message });  // Safe — might be null
  }
}
```

**Without `{ optional: true }`**: Angular throws `NullInjectorError: No provider for AnalyticsService!`

**With `{ optional: true }`**: Angular returns `null`, and the code handles it gracefully.

### 6.5 `@Optional()` + `@SkipSelf()` Pattern for Hierarchical Services

A common pattern for services that should be singletons within a subtree but optional in terms of parent existence:

```typescript
@Injectable()
class AccordionService {
  private readonly parent = inject(AccordionService, { optional: true, skipSelf: true });

  readonly level = this.parent ? this.parent.level + 1 : 0;

  constructor() {
    if (this.parent) {
      console.log(`Nested accordion at level ${this.level}`);
    }
  }
}

// Each Accordion component provides its own instance:
@Component({
  providers: [AccordionService],
  template: `<ng-content />`
})
class AccordionComponent {
  private readonly accordion = inject(AccordionService);
}
```

When accordions are nested:
- The outer accordion's `AccordionService` has `level = 0` (no parent found)
- The inner accordion's `AccordionService` has `level = 1` (parent found via `skipSelf`)

---

## 7. Forward References and Circular Dependencies

### 7.1 The Problem: JavaScript Hoisting

JavaScript classes are NOT hoisted like function declarations. If class `A` references class `B` before `B` is defined, you get a `ReferenceError`:

```typescript
// This fails:
@Injectable()
class ServiceA {
  constructor(private b: ServiceB) {} // ERROR: ServiceB is not defined yet
}

@Injectable()
class ServiceB {
  constructor(private a: ServiceA) {} // This is fine (ServiceA is defined above)
}
```

### 7.2 `forwardRef()` — Solving Declaration Order

`forwardRef()` wraps a reference to a class that hasn't been defined yet:

```typescript
import { forwardRef, Inject, Injectable } from '@angular/core';

@Injectable()
class ServiceA {
  // forwardRef defers the reference resolution until runtime
  constructor(@Inject(forwardRef(() => ServiceB)) private b: ServiceB) {}
}

@Injectable()
class ServiceB {
  constructor(private a: ServiceA) {}
}
```

With `inject()` function:
```typescript
@Injectable()
class ServiceA {
  private readonly b = inject(forwardRef(() => ServiceB));
}
```

**How it works:** `forwardRef(() => ServiceB)` returns a wrapper that Angular evaluates lazily. By the time Angular actually resolves the dependency, `ServiceB` has been defined.

### 7.3 `forwardRef` in Component Providers

The most common use of `forwardRef` is in `ControlValueAccessor` and validator registrations where the component references itself:

```typescript
@Component({
  selector: 'app-custom-input',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent), // References the class being defined
      multi: true,
    }
  ]
})
class CustomInputComponent implements ControlValueAccessor {
  // ...
}
```

Without `forwardRef`, this fails because `CustomInputComponent` hasn't finished being defined when the `providers` array is evaluated.

### 7.4 Circular Dependencies — When and How They Happen

Circular dependencies occur when two or more services depend on each other:

```
ServiceA → depends on → ServiceB
ServiceB → depends on → ServiceA
```

Angular will throw a **circular dependency error** at runtime:

```
Error: NG0200: Circular dependency in DI detected for ServiceA.
```

### 7.5 Strategies to Break Circular Dependencies

#### Strategy 1: Introduce a Mediator Service

```typescript
// BEFORE: Circular
@Injectable() class OrderService {
  constructor(private payment: PaymentService) {}
}
@Injectable() class PaymentService {
  constructor(private order: OrderService) {}  // Circular!
}

// AFTER: Mediator breaks the cycle
@Injectable({ providedIn: 'root' })
class OrderPaymentMediator {
  processOrderPayment(orderId: string): Observable<PaymentResult> {
    // Contains the logic that needed both services
  }
}

@Injectable() class OrderService {
  constructor(private mediator: OrderPaymentMediator) {}
}
@Injectable() class PaymentService {
  constructor(private mediator: OrderPaymentMediator) {}
}
```

#### Strategy 2: Lazy Injection with `Injector`

```typescript
@Injectable({ providedIn: 'root' })
class ServiceA {
  private readonly injector = inject(Injector);
  private _serviceB?: ServiceB;

  get serviceB(): ServiceB {
    if (!this._serviceB) {
      this._serviceB = this.injector.get(ServiceB);  // Lazy resolution
    }
    return this._serviceB;
  }
}
```

#### Strategy 3: Event-Based Communication

```typescript
@Injectable({ providedIn: 'root' })
class EventBus {
  private readonly events$ = new Subject<AppEvent>();

  emit(event: AppEvent): void { this.events$.next(event); }
  on<T extends AppEvent>(type: string): Observable<T> {
    return this.events$.pipe(filter(e => e.type === type)) as Observable<T>;
  }
}

// Services communicate through events instead of direct references
@Injectable() class OrderService {
  private readonly eventBus = inject(EventBus);

  completeOrder(orderId: string) {
    this.eventBus.emit({ type: 'ORDER_COMPLETED', orderId });
  }
}

@Injectable() class PaymentService {
  private readonly eventBus = inject(EventBus);

  constructor() {
    this.eventBus.on('ORDER_COMPLETED').subscribe(event => {
      this.processRefundEligibility(event.orderId);
    });
  }
}
```

#### Strategy 4: Restructure to Eliminate the Cycle

Often, a circular dependency indicates that responsibilities are not properly separated. The best solution may be to extract the shared logic into a third service, or to merge the two services if they're too tightly coupled to exist separately.

---

## 8. The `inject()` Function

### 8.1 `inject()` vs Constructor Injection

Angular 14 introduced the `inject()` function as an alternative to constructor-based DI:

```typescript
// Constructor injection (legacy):
@Component({ ... })
class ProductComponent {
  constructor(
    private readonly productService: ProductService,
    private readonly router: Router,
    @Optional() private readonly analytics: AnalyticsService | null,
    @Inject(API_URL) private readonly apiUrl: string,
  ) {}
}

// inject() function (modern):
@Component({ ... })
class ProductComponent {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService, { optional: true });
  private readonly apiUrl = inject(API_URL);
}
```

### 8.2 Advantages of `inject()`

1. **No constructor needed**: Less boilerplate, especially with many dependencies
2. **Works in field initializers**: Dependencies are available immediately in property declarations
3. **Works in inheritance**: No need to pass dependencies through `super()` calls
4. **Type-safe modifiers**: `{ optional: true }` is type-safe (returns `T | null`), unlike `@Optional()` which doesn't narrow the type
5. **Works in plain functions**: Can be called from helper functions during injection context

### 8.3 Injection Context

`inject()` can only be called in an **injection context**:

- Field initializers of a class being instantiated by DI
- The constructor of a class being instantiated by DI
- A factory function (e.g., `useFactory`, `InjectionToken.factory`)
- Functions called from the above contexts (before the constructor returns)
- `runInInjectionContext()` (explicit context creation)

```typescript
// VALID — field initializer:
class MyComponent {
  private readonly http = inject(HttpClient); // ✅
}

// VALID — constructor:
class MyComponent {
  constructor() {
    const http = inject(HttpClient); // ✅
  }
}

// VALID — factory:
{
  provide: DATA,
  useFactory: () => {
    const http = inject(HttpClient); // ✅
    return http.get('/data');
  }
}

// VALID — helper called from constructor:
function setupLogging() {
  const logger = inject(LoggerService); // ✅ (if called from injection context)
  return logger;
}

class MyComponent {
  private readonly logger = setupLogging(); // ✅ (called during field init)
}

// INVALID — called too late:
class MyComponent {
  onClick() {
    const http = inject(HttpClient); // ❌ ERROR: Must be called in injection context
  }
}
```

### 8.4 `runInInjectionContext()` — Creating Custom Injection Contexts

When you need to call `inject()` outside of a constructor/field initializer:

```typescript
import { runInInjectionContext, EnvironmentInjector, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
class PluginLoader {
  private readonly envInjector = inject(EnvironmentInjector);

  loadPlugin(pluginFactory: () => Plugin): Plugin {
    // Create an injection context so the factory can use inject()
    return runInInjectionContext(this.envInjector, () => {
      return pluginFactory();
    });
  }
}
```

### 8.5 Helper Functions with `inject()` — Composable DI

One of the most powerful patterns enabled by `inject()` is creating reusable helper functions:

```typescript
// A reusable "toast notification" helper
function injectToast() {
  const snackBar = inject(MatSnackBar);

  return {
    success: (message: string) => snackBar.open(message, 'OK', { duration: 3000 }),
    error: (message: string) => snackBar.open(message, 'Dismiss', { panelClass: 'error' }),
    info: (message: string) => snackBar.open(message, '', { duration: 2000 }),
  };
}

// Usage — any component can use it:
@Component({ ... })
class OrderComponent {
  private readonly toast = injectToast();  // ✅ Called during field init

  async placeOrder() {
    try {
      await this.orderService.place();
      this.toast.success('Order placed!');
    } catch (e) {
      this.toast.error('Order failed.');
    }
  }
}
```

```typescript
// Reusable "destroy" helper
function injectDestroy() {
  const subject = new Subject<void>();
  const destroyRef = inject(DestroyRef);
  destroyRef.onDestroy(() => { subject.next(); subject.complete(); });
  return subject.asObservable();
}

// Usage:
class MyComponent {
  private readonly destroy$ = injectDestroy();

  constructor() {
    someObservable$.pipe(takeUntil(this.destroy$)).subscribe();
  }
}
```

This pattern is analogous to React's custom hooks — composable, reusable pieces of logic that can access the DI system.

---

## 9. Advanced DI Patterns

### 9.1 The Strategy Pattern with DI

```typescript
// Define the strategy interface
abstract class SortStrategy<T> {
  abstract sort(items: T[]): T[];
}

// Multiple implementations
@Injectable()
class AlphabeticalSort implements SortStrategy<Product> {
  sort(items: Product[]) { return [...items].sort((a, b) => a.name.localeCompare(b.name)); }
}

@Injectable()
class PriceSort implements SortStrategy<Product> {
  sort(items: Product[]) { return [...items].sort((a, b) => a.price - b.price); }
}

@Injectable()
class RatingSort implements SortStrategy<Product> {
  sort(items: Product[]) { return [...items].sort((a, b) => b.rating - a.rating); }
}

// Token for all strategies
export const SORT_STRATEGIES = new InjectionToken<SortStrategy<Product>[]>('SORT_STRATEGIES');

// Register:
providers: [
  { provide: SORT_STRATEGIES, useClass: AlphabeticalSort, multi: true },
  { provide: SORT_STRATEGIES, useClass: PriceSort, multi: true },
  { provide: SORT_STRATEGIES, useClass: RatingSort, multi: true },
]

// Use:
@Injectable({ providedIn: 'root' })
class ProductSorter {
  private readonly strategies = inject(SORT_STRATEGIES);

  getSortOptions(): string[] {
    return this.strategies.map(s => s.constructor.name);
  }

  sortBy(index: number, products: Product[]): Product[] {
    return this.strategies[index].sort(products);
  }
}
```

### 9.2 Scoped Services — State Per Feature Instance

```typescript
@Injectable() // NOT providedIn: 'root'
class FormStateService {
  private readonly _dirty = signal(false);
  private readonly _values = signal<Record<string, unknown>>({});

  readonly dirty = this._dirty.asReadonly();
  readonly values = this._values.asReadonly();

  setValue(key: string, value: unknown): void {
    this._values.update(v => ({ ...v, [key]: value }));
    this._dirty.set(true);
  }

  reset(): void {
    this._values.set({});
    this._dirty.set(false);
  }
}

// Each editor instance gets its own FormStateService
@Component({
  selector: 'app-editor',
  providers: [FormStateService],
  template: `...`
})
class EditorComponent {
  private readonly formState = inject(FormStateService);
}
```

If you have two `<app-editor>` instances on the same page, each gets an independent `FormStateService`.

### 9.3 Dynamic Injector Creation

You can create injectors programmatically for dynamic scenarios:

```typescript
import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';

@Injectable({ providedIn: 'root' })
class WidgetFactory {
  private readonly parentInjector = inject(EnvironmentInjector);

  createWidget(config: WidgetConfig): WidgetRef {
    // Each widget gets its own injector with custom providers
    const injector = createEnvironmentInjector(
      [
        { provide: WIDGET_CONFIG, useValue: config },
        WidgetStateService,
      ],
      this.parentInjector,
    );

    // Create the component with this injector
    const componentRef = createComponent(WidgetComponent, {
      environmentInjector: injector,
    });

    return { componentRef, injector };
  }
}
```

### 9.4 Testing with DI — Overriding Providers

DI makes testing straightforward by allowing provider substitution:

```typescript
describe('OrderComponent', () => {
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  beforeEach(() => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrders', 'placeOrder']);

    TestBed.configureTestingModule({
      providers: [
        // Replace the real service with a spy
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: API_BASE_URL, useValue: 'http://test-api.com' },
      ]
    });
  });

  it('should load orders on init', () => {
    orderServiceSpy.getOrders.and.returnValue(of([mockOrder]));
    const component = TestBed.createComponent(OrderComponent);
    component.detectChanges();
    expect(orderServiceSpy.getOrders).toHaveBeenCalled();
  });
});
```

### 9.5 The `DestroyRef` Pattern — DI-Powered Cleanup

`DestroyRef` is an injectable token that provides a hook into the current context's destruction:

```typescript
@Injectable({ providedIn: 'root' })
class PollingService {
  private readonly http = inject(HttpClient);

  startPolling(url: string, intervalMs: number, destroyRef: DestroyRef): Signal<unknown> {
    const data = signal<unknown>(null);

    const sub = interval(intervalMs).pipe(
      switchMap(() => this.http.get(url))
    ).subscribe(result => data.set(result));

    // Cleanup is tied to the caller's lifecycle
    destroyRef.onDestroy(() => sub.unsubscribe());

    return data.asReadonly();
  }
}

// Usage in a component:
@Component({ ... })
class DashboardComponent {
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrics = this.polling.startPolling('/api/metrics', 5000, this.destroyRef);
  // Automatically stops polling when the component is destroyed
}
```

### 9.6 Lightweight Injection Tokens Pattern

For library authors, use lightweight injection tokens to ensure tree-shaking works properly:

```typescript
// BAD — the full class is always included
export class HeavyService {
  // 500 lines of code...
}

// GOOD — lightweight abstract token
export abstract class HeavyService {
  abstract doWork(): void;
}

// The implementation is tree-shakable
@Injectable()
export class HeavyServiceImpl extends HeavyService {
  doWork() { /* 500 lines */ }
}

// Provider in the library:
{ provide: HeavyService, useClass: HeavyServiceImpl }
```

If the consumer never injects `HeavyService`, the `HeavyServiceImpl` class (and its 500 lines) are tree-shaken out.

---

## Summary: Key DI Mental Models for FAANG Interviews

### 1. DI is Angular's "Object Graph Manager"
It creates, wires, caches, and destroys objects. Understanding DI means understanding how Angular assembles your application at runtime.

### 2. Two Trees, One Resolution Path
The element injector tree (DOM-aligned) is checked first, then the environment injector chain. This enables both per-component scoping and global singletons.

### 3. Tokens Are Keys, Providers Are Recipes
A token identifies WHAT you want. A provider tells the injector HOW to create it. Separating these concepts enables substitution (the core of testability and flexibility).

### 4. `inject()` Is the Future
The `inject()` function enables composable DI patterns (like React hooks but for dependency injection). Constructor injection still works but is considered legacy style.

### 5. Tree-Shaking Depends on Provider Registration Location
`providedIn: 'root'` and `InjectionToken` with `factory` are tree-shakable. Explicit `providers` arrays are not. For libraries, this distinction is critical for bundle size.

### 6. Scope = Lifetime = Instance Count
Where you provide a service determines how long it lives and how many instances exist. Root = singleton forever. Component = instance per component, destroyed with it.
