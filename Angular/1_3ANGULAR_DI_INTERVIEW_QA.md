# Dependency Injection (DI) — Interview Questions & Answers

> **Phase 1, Topic 3** of the Angular Preparation Roadmap
> 80+ questions from beginner to expert, organized by subtopic
> Includes FAANG-style scenario and system design questions

---

## Table of Contents

1. [Injector Hierarchy and Resolution (Q1-Q15)](#section-1-injector-hierarchy-and-resolution)
2. [Provider Types (Q16-Q28)](#section-2-provider-types)
3. [Injection Tokens (Q29-Q38)](#section-3-injection-tokens)
4. [providedIn Scoping (Q39-Q48)](#section-4-providedin-scoping)
5. [Multi-Providers and Optional Dependencies (Q49-Q58)](#section-5-multi-providers-and-optional-dependencies)
6. [Forward References and Circular Dependencies (Q59-Q66)](#section-6-forward-references-and-circular-dependencies)
7. [The inject() Function and Modern Patterns (Q67-Q76)](#section-7-the-inject-function-and-modern-patterns)
8. [Cross-Topic Scenario and Design Questions (Q77-Q88)](#section-8-cross-topic-scenario-and-design-questions)

---

## Section 1: Injector Hierarchy and Resolution

### Q1. What is Dependency Injection in Angular? Why is it a core part of the framework rather than an optional library? (Beginner)

**Answer:**

Dependency Injection is a design pattern where a class receives its dependencies from an external source (the injector) rather than creating them itself. In Angular, DI is not optional — it is fundamental to how the framework works.

Angular uses DI to:
- **Create every component, service, directive, and pipe** in the application
- **Manage service lifetimes** (singleton vs per-component vs per-route)
- **Enable testability** by allowing easy substitution of real services with mocks
- **Decouple components** from concrete implementations
- **Support hierarchical scoping** so different parts of the app can have different service instances

Every `@Injectable()` service, every component constructor, and every `inject()` call goes through Angular's DI system. Without it, Angular cannot function.

---

### Q2. What are the two types of injectors in Angular? (Beginner)

**Answer:**

1. **Environment Injectors** (formerly "module injectors"):
   - Created by `bootstrapApplication()`, lazy-loaded routes with `providers`, or manually via `createEnvironmentInjector()`
   - Hold application-wide and feature-scoped services
   - Form a relatively flat hierarchy (platform → root → route-level)

2. **Element Injectors** (formerly "component injectors"):
   - Created for each component or directive that has a `providers` or `viewProviders` array
   - Follow the DOM tree structure (parent component → child component)
   - Destroyed when the component is destroyed

Both work together during dependency resolution: Angular checks element injectors first (walking up the DOM tree), then falls back to environment injectors.

---

### Q3. Describe the dependency resolution algorithm step by step. (Intermediate)

**Answer:**

When a class requests a dependency via `inject(Token)` or constructor injection:

1. **Check the element injector** of the requesting component/directive
2. If not found, **walk up the element injector tree** (parent → grandparent → ... → root component)
3. If still not found, **check the environment injector chain** (route-level → root → platform)
4. If still not found:
   - If the dependency is marked `{ optional: true }` → return `null`
   - Otherwise → throw `NullInjectorError: No provider for [Token]!`

Key nuance: Element injectors are checked FIRST. This means a component-level provider always **shadows** a root-level provider of the same token.

```
Component requests Token
  ↓ Check own element injector
  ↓ Walk up parent element injectors
  ↓ Check environment injectors (route → root → platform)
  ↓ Not found → @Optional returns null, else throws error
```

---

### Q4. What is the difference between `providers` and `viewProviders` in a component? (Intermediate)

**Answer:**

Both register services in the component's element injector, but they differ in **visibility to projected content**:

| Feature | `providers` | `viewProviders` |
|---------|------------|-----------------|
| Visible to component's own template | Yes | Yes |
| Visible to child components in the template | Yes | Yes |
| Visible to content projected via `<ng-content>` | **Yes** | **No** |

```typescript
@Component({
  providers: [ServiceA],       // Projected content CAN access
  viewProviders: [ServiceB],   // Projected content CANNOT access
  template: `
    <ng-content></ng-content>   <!-- Gets ServiceA, NOT ServiceB -->
    <app-child></app-child>     <!-- Gets both ServiceA and ServiceB -->
  `
})
```

**Use case for `viewProviders`**: When a service is an implementation detail of your component that should NOT leak to content projected from outside. For example, an internal form state service that projected items shouldn't accidentally interact with.

---

### Q5. Explain how `@Self()`, `@SkipSelf()`, `@Host()`, and `@Optional()` modify resolution. (Intermediate)

**Answer:**

These decorators (or equivalent `inject()` options) restrict where Angular looks for a provider:

**`@Self()` / `{ self: true }`**: Only check the element injector of the requesting class itself. Don't walk up the tree at all.
```typescript
inject(Service, { self: true }); // Only finds if THIS component provides it
```

**`@SkipSelf()` / `{ skipSelf: true }`**: Skip the current element injector and start from the parent.
```typescript
inject(Service, { skipSelf: true }); // Gets parent's instance, ignoring own
```

**`@Host()` / `{ host: true }`**: Stop resolution at the host component boundary. Does NOT check environment injectors.
```typescript
inject(Service, { host: true }); // Only checks up to the host element
```

**`@Optional()` / `{ optional: true }`**: Return `null` instead of throwing if not found.
```typescript
inject(Service, { optional: true }); // Returns Service | null
```

These can be combined:
```typescript
// Get parent's instance, or null if parent doesn't provide it
inject(Service, { skipSelf: true, optional: true });
```

---

### Q6. What happens when the same service is provided at multiple levels of the injector hierarchy? (Intermediate)

**Answer:**

The **most local** provider wins. Angular stops at the first match while walking up the injector chain.

```typescript
// Root level: provides LoggerService (instance #1)
bootstrapApplication(App, {
  providers: [LoggerService]
});

// FeatureComponent provides its own (instance #2)
@Component({
  providers: [LoggerService]
})
class FeatureComponent {
  logger = inject(LoggerService); // Gets instance #2 (local)
}

// ChildComponent (no own provider)
class ChildComponent {
  logger = inject(LoggerService); // Gets instance #2 (from FeatureComponent parent)
}

// UnrelatedComponent (not in FeatureComponent's subtree)
class UnrelatedComponent {
  logger = inject(LoggerService); // Gets instance #1 (root)
}
```

This is called **shadowing** — the local provider shadows the parent/root provider. This is intentional and enables per-component service isolation.

---

### Q7. Can you explain the NullInjectorError? What are common causes and how do you debug it? (Intermediate)

**Answer:**

`NullInjectorError: No provider for [ServiceName]!` means Angular walked the entire injector chain and found no provider for the requested token.

**Common causes:**

1. **Service missing `@Injectable()` decorator**:
```typescript
// Missing @Injectable — Angular can't construct it
class UserService { }
```

2. **Service not provided anywhere**:
```typescript
@Injectable() // No providedIn, and not in any providers array
class UserService { }
```

3. **Typo in `InjectionToken`** — creating two different token instances with the same description (description is not the lookup key, the reference is)

4. **Lazy-loaded module boundary** — providing a service only in a lazy module but injecting it from a component outside that module

5. **Using `@Self()` when the local injector doesn't have it**

**Debugging steps:**
1. Read the error message — it shows the injection chain: `NullInjectorError: R3InjectorError(AppModule)[UserService -> HttpClient -> HttpClient]:`
2. Check that the service has `@Injectable({ providedIn: 'root' })` or is listed in a `providers` array
3. For `InjectionToken`, verify you're importing the exact same token instance
4. Check that required modules are imported (e.g., `provideHttpClient()` for `HttpClient`)

---

### Q8. What is an Environment Injector and how do you create one manually? (Advanced)

**Answer:**

An `EnvironmentInjector` is a DI container for application-wide or feature-scoped services. It's the successor to the "module injector" concept.

Angular creates them automatically:
- One root `EnvironmentInjector` at bootstrap
- One per lazy-loaded route that has `providers`

You can also create them manually:

```typescript
import { createEnvironmentInjector, EnvironmentInjector, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
class WidgetFactory {
  private readonly parentInjector = inject(EnvironmentInjector);

  createIsolatedContext(providers: Provider[]): EnvironmentInjector {
    return createEnvironmentInjector(providers, this.parentInjector);
  }
}

// Usage:
const injector = this.widgetFactory.createIsolatedContext([
  { provide: CONFIG, useValue: customConfig },
  CustomService,
]);

const service = injector.get(CustomService);

// Don't forget to destroy when done:
injector.destroy();
```

Use cases: dynamic component creation with isolated providers, plugin systems, multi-tenant isolation.

---

### Q9. How does the injector hierarchy differ between eagerly-loaded and lazy-loaded routes? (Advanced)

**Answer:**

**Eagerly-loaded routes** (with `providers`):
```typescript
{
  path: 'settings',
  providers: [SettingsService],
  component: SettingsComponent
}
```
Creates a child environment injector when the route activates. `SettingsService` is scoped to this route and its children. When navigating away, the injector is destroyed.

**Lazy-loaded routes** (with `loadComponent`/`loadChildren`):
```typescript
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  providers: [AdminService]
}
```
Also creates a child environment injector, but the component code is loaded on demand.

**Key difference in legacy NgModule architecture:**

In the NgModule era, lazy-loaded modules automatically created their own child injector (because `@NgModule.providers` was always evaluated). This caused the famous "multiple instances" bug — providing a service in both root and a lazy module gave two instances.

In the standalone architecture, injector creation is explicit: only routes with a `providers` array create a new child injector. This is more predictable.

---

### Q10. What is the Null Injector? Where does it sit in the hierarchy? (Advanced)

**Answer:**

The **Null Injector** is the topmost injector in Angular's hierarchy, sitting above the Platform Injector. Its sole purpose is to throw `NullInjectorError` when a dependency is not found:

```
Null Injector         ← Always throws NullInjectorError
  └── Platform Injector
       └── Root Environment Injector
            └── Route Environment Injectors
                 └── Element Injectors
```

Every injector chain terminates at the Null Injector. When Angular walks up the chain and reaches it, the lookup fails definitively. The `@Optional()` decorator intercepts BEFORE reaching the Null Injector, returning `null` instead.

You never interact with the Null Injector directly, but it appears in error stack traces:

```
NullInjectorError: R3InjectorError[NullInjector -> UserService]:
  NullInjectorError: No provider for UserService!
```

---

### Q11. How does Angular resolve a dependency when a directive on a component requests a service? (Advanced)

**Answer:**

When a directive requests a service, Angular checks injectors in this order:

1. The directive's own element injector (directives share the element injector with their host component)
2. The host component's element injector
3. Parent element injectors (walking up the DOM)
4. Environment injectors (route → root → platform)

```typescript
@Directive({ selector: '[appTooltip]' })
class TooltipDirective {
  // This gets the service from the host component's element injector
  // or walks up until it finds one
  private readonly tooltipService = inject(TooltipService);
}
```

Using `{ host: true }` limits the search to the host component's element injector:
```typescript
// Only finds TooltipService if the HOST component provides it
private readonly tooltipService = inject(TooltipService, { host: true, optional: true });
```

This is how directives like `ngModel` find their parent `ngForm` — via `@Host() @SkipSelf()` to reach the form container but not beyond.

---

### Q12. What happens to injected services when a component is destroyed? (Intermediate)

**Answer:**

When a component is destroyed (e.g., removed by `@if`, route change):

1. `ngOnDestroy()` on the component runs
2. The component's **element injector** is destroyed
3. Any services provided at the component level (via `providers`/`viewProviders`) are also destroyed
4. If those services implement `OnDestroy`, their `ngOnDestroy()` is called
5. `DestroyRef` callbacks registered for these services fire

**Services at higher levels are NOT affected:**
- Root-level services (`providedIn: 'root'`) persist for the app's lifetime
- Route-level services persist while the route is active
- Parent component services persist while the parent is alive

```typescript
@Injectable()
class EditorState implements OnDestroy {
  ngOnDestroy() {
    console.log('EditorState destroyed — component was removed');
  }
}

@Component({
  providers: [EditorState],  // Destroyed WITH the component
})
class EditorComponent { }
```

---

### Q13. Explain the concept of "injector bubbling" with a concrete example. (Intermediate)

**Answer:**

Injector bubbling is how Angular walks up the injector chain to find a provider. It's conceptually similar to DOM event bubbling:

```typescript
// Root provides a default ThemeService
bootstrapApplication(App, {
  providers: [{ provide: ThemeService, useValue: { color: 'blue' } }]
});

// SidebarComponent provides a different ThemeService for its subtree
@Component({
  selector: 'app-sidebar',
  providers: [{ provide: ThemeService, useValue: { color: 'green' } }],
  template: `
    <app-menu />        <!-- Gets green theme -->
    <app-user-info />   <!-- Gets green theme -->
  `
})
class SidebarComponent { }

// MainComponent has no provider — bubbles up to root
@Component({
  selector: 'app-main',
  template: `<app-dashboard />  <!-- Gets blue theme (root) -->`
})
class MainComponent { }

// MenuComponent (child of sidebar) — bubbles up to sidebar
@Component({ selector: 'app-menu' })
class MenuComponent {
  theme = inject(ThemeService); // { color: 'green' } — found at SidebarComponent
}

// DashboardComponent (child of main) — bubbles up to root
@Component({ selector: 'app-dashboard' })
class DashboardComponent {
  theme = inject(ThemeService); // { color: 'blue' } — found at root
}
```

---

### Q14. How would you debug a situation where a service has unexpected state because multiple instances exist? (Advanced)

**Answer:**

This is one of the most common DI bugs. Debugging steps:

1. **Add an instance ID to the service**:
```typescript
@Injectable()
class UserService {
  private static nextId = 0;
  readonly instanceId = ++UserService.nextId;
  constructor() { console.log(`UserService created: #${this.instanceId}`); }
}
```

2. **Check where it's provided**: Search the codebase for:
   - `providers: [UserService]` or `providers: [{ provide: UserService`
   - `viewProviders: [UserService]`
   - `providedIn:` in the service decorator
   - Route-level `providers`

3. **Use Angular DevTools**: The "Injector Tree" panel shows which injectors exist and what they provide.

4. **Common culprits**:
   - Service provided in both root AND a lazy-loaded module → two instances
   - Service provided in a component's `providers` when you wanted a singleton
   - Service provided in a shared module that's imported by multiple lazy modules
   - Forgetting `providedIn: 'root'` and adding to multiple `providers` arrays

5. **Fix**: Use `providedIn: 'root'` for singletons. For intentional multi-instance, use component-level `providers`. Remove duplicate registrations.

---

### Q15. What is `runInInjectionContext()` and when would you need it? (Expert)

**Answer:**

`runInInjectionContext()` creates an injection context programmatically, allowing `inject()` to be called outside of a constructor or field initializer:

```typescript
import { runInInjectionContext, EnvironmentInjector, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
class DynamicLoader {
  private readonly envInjector = inject(EnvironmentInjector);

  loadWithDI<T>(factory: () => T): T {
    return runInInjectionContext(this.envInjector, factory);
  }
}

// Usage:
const result = dynamicLoader.loadWithDI(() => {
  const http = inject(HttpClient);  // Works because we're in an injection context
  const config = inject(APP_CONFIG);
  return new CustomService(http, config);
});
```

**When you need it:**
- Building framework-level utilities that accept user-provided factory functions
- Plugin systems where plugins need DI access
- Calling `inject()` in a callback/event handler (which is normally outside injection context)
- Testing utilities that need to resolve dependencies programmatically
- Library code that needs to be DI-aware but isn't directly instantiated by Angular

---

## Section 2: Provider Types

### Q16. What are the four provider types in Angular? Give a one-sentence description of each. (Beginner)

**Answer:**

1. **`useClass`**: Creates a new instance of the specified class (supports its own DI).
2. **`useValue`**: Provides a fixed, pre-existing value (no instantiation).
3. **`useFactory`**: Calls a function with injected dependencies to create the value.
4. **`useExisting`**: Creates an alias — two tokens resolve to the same instance.

---

### Q17. When would you use `useClass` to substitute one service for another? (Beginner)

**Answer:**

`useClass` is for swapping implementations while keeping the same injection token:

```typescript
// In development:
{ provide: AnalyticsService, useClass: ConsoleAnalyticsService }

// In production:
{ provide: AnalyticsService, useClass: GoogleAnalyticsService }

// For SSR (no browser APIs):
{ provide: StorageService, useClass: isPlatformServer(platformId) ? InMemoryStorage : LocalStorage }
```

Consumers inject `AnalyticsService` and don't know (or care) which implementation they get. This is the **Liskov Substitution Principle** in action.

---

### Q18. What is the difference between `useValue` and `useFactory`? When would you choose one over the other? (Intermediate)

**Answer:**

| Aspect | `useValue` | `useFactory` |
|--------|-----------|-------------|
| Value creation | Provided as-is | Created by a function |
| DI access | None | Yes (via `deps` array) |
| Dynamic logic | No | Yes (conditionals, computations) |
| Timing | Evaluated at provider registration | Evaluated when first injected |

**Choose `useValue` when**: The value is a constant that doesn't depend on any other service — config objects, URLs, feature flags, simple values.

**Choose `useFactory` when**: Creating the value requires dependencies, conditional logic, or computation:

```typescript
// useValue — simple constant
{ provide: API_URL, useValue: 'https://api.example.com' }

// useFactory — needs a dependency and conditional logic
{
  provide: API_URL,
  useFactory: (config: AppConfig) => config.isStaging ? 'https://staging-api.example.com' : 'https://api.example.com',
  deps: [APP_CONFIG],
}
```

---

### Q19. Explain `useExisting` with a real-world example. How does it differ from `useClass`? (Intermediate)

**Answer:**

`useExisting` creates an **alias** — it makes one token point to the same instance as another token. `useClass` creates a **new instance**.

```typescript
// Real-world: read-only interface for a service
@Injectable({ providedIn: 'root' })
class AuthStateService {
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  login(user: User) { this._user.set(user); }
  logout() { this._user.set(null); }
}

// Read-only abstraction
abstract class AuthReader {
  abstract readonly user: Signal<User | null>;
  abstract readonly isLoggedIn: Signal<boolean>;
}

// useExisting — SAME instance, different token:
{ provide: AuthReader, useExisting: AuthStateService }

// Components inject AuthReader and can only READ (login/logout not exposed)
// Admin service injects AuthStateService and can WRITE
```

If we used `useClass: AuthStateService` instead, we'd get a **second instance** — changes in one wouldn't be reflected in the other. `useExisting` ensures they share the same object.

---

### Q20. What is the `deps` array in `useFactory`? What happens if the order is wrong? (Intermediate)

**Answer:**

`deps` lists the DI tokens whose resolved values are passed as arguments to the factory function, **in order**:

```typescript
{
  provide: DataService,
  useFactory: (http: HttpClient, config: AppConfig, logger: Logger) => {
    return new DataService(http, config.apiUrl, logger);
  },
  deps: [HttpClient, APP_CONFIG, LOGGER],
  // deps[0] → http (HttpClient)
  // deps[1] → config (APP_CONFIG)
  // deps[2] → logger (LOGGER)
}
```

If the order is wrong, the arguments are passed to the wrong parameters. TypeScript won't catch this at compile time because `deps` is a plain array — there's no type-checking between `deps` and the factory function parameters. This is a common source of bugs.

To use resolution modifiers in `deps`, wrap tokens with decorators:

```typescript
deps: [
  HttpClient,
  [new Optional(), AnalyticsService],  // Optional dependency
  [new SkipSelf(), ConfigService],      // Skip own injector
]
```

---

### Q21. A service needs different configurations in different parts of the app. How do you provide it? (Intermediate)

**Answer:**

Use `useFactory` with component-level or route-level providers:

```typescript
// A configurable API service
@Injectable()
class ApiService {
  constructor(readonly baseUrl: string, private readonly http: HttpClient) {}

  get<T>(path: string) {
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }
}

// Admin area: uses admin API
// admin.routes.ts
export const ADMIN_ROUTES: Routes = [{
  path: '',
  providers: [{
    provide: ApiService,
    useFactory: (http: HttpClient) => new ApiService('/api/admin', http),
    deps: [HttpClient],
  }],
  children: [...]
}];

// Public area: uses public API
// public.routes.ts
export const PUBLIC_ROUTES: Routes = [{
  path: '',
  providers: [{
    provide: ApiService,
    useFactory: (http: HttpClient) => new ApiService('/api/public', http),
    deps: [HttpClient],
  }],
  children: [...]
}];
```

Components in the admin area get an `ApiService` pointing to `/api/admin`. Components in the public area get one pointing to `/api/public`. Same service class, different configuration.

---

### Q22. What happens if you provide a service with `useValue` and the value is a mutable object? (Advanced)

**Answer:**

All consumers get a reference to the **same object**. Mutations in one place affect all others:

```typescript
const config = { theme: 'light', maxItems: 10 };
{ provide: APP_CONFIG, useValue: config }

// Component A:
const cfg = inject(APP_CONFIG);
cfg.theme = 'dark';  // MUTATES the shared object

// Component B:
const cfg = inject(APP_CONFIG);
console.log(cfg.theme);  // 'dark' — unexpectedly changed!
```

**Solutions:**
1. Use `Object.freeze()`:
```typescript
{ provide: APP_CONFIG, useValue: Object.freeze({ theme: 'light', maxItems: 10 }) }
```

2. Use `useFactory` to return a copy:
```typescript
{
  provide: APP_CONFIG,
  useFactory: () => ({ theme: 'light', maxItems: 10 }),  // New object each time
}
```

3. Use a signal-based service instead of a plain value:
```typescript
@Injectable({ providedIn: 'root' })
class ConfigService {
  readonly theme = signal('light');
  readonly maxItems = signal(10);
}
```

---

### Q23. How do you provide a third-party class that doesn't have `@Injectable()`? (Intermediate)

**Answer:**

Use `useFactory` to create it manually:

```typescript
import { ChartJS } from 'chart.js';

{
  provide: ChartJS,
  useFactory: () => {
    const chart = new ChartJS();
    chart.defaults.responsive = true;
    return chart;
  }
}

// Or with useValue if no setup is needed:
{ provide: SOME_LIB, useValue: new ThirdPartyLib() }
```

If the third-party class needs Angular services as dependencies:
```typescript
{
  provide: ExternalPaymentGateway,
  useFactory: (http: HttpClient, config: AppConfig) => {
    return new ExternalPaymentGateway({
      apiKey: config.paymentApiKey,
      httpClient: http,
    });
  },
  deps: [HttpClient, APP_CONFIG],
}
```

---

### Q24. What is the `shorthand` provider syntax and when is it equivalent to `useClass`? (Beginner)

**Answer:**

When the token and the class are the same, you can use the shorthand:

```typescript
// Shorthand:
providers: [LoggerService]

// Is equivalent to:
providers: [{ provide: LoggerService, useClass: LoggerService }]
```

This only works when you want to provide the exact same class. If you need substitution, you must use the full object syntax:

```typescript
// NOT the same as shorthand:
providers: [{ provide: LoggerService, useClass: FileLoggerService }]
```

---

### Q25. You have a service that should log to console in dev and to a remote server in production. How do you configure this with providers? (Intermediate)

**Answer:**

```typescript
// Option 1: useFactory with environment check
{
  provide: LoggerService,
  useFactory: () => {
    if (isDevMode()) {
      return new ConsoleLoggerService();
    }
    return new RemoteLoggerService();
  },
}

// Option 2: useClass with environment variable
{
  provide: LoggerService,
  useClass: environment.production ? RemoteLoggerService : ConsoleLoggerService,
}

// Option 3: InjectionToken with factory (tree-shakable)
export const LOGGER = new InjectionToken<LoggerService>('LOGGER', {
  providedIn: 'root',
  factory: () => isDevMode() ? new ConsoleLoggerService() : inject(RemoteLoggerService),
});
```

Option 3 is preferred because it's tree-shakable — if the production build eliminates `isDevMode()` branch, `ConsoleLoggerService` code is removed.

---

### Q26. Explain the difference between providing a service in `appConfig.providers` vs in a component's `providers`. (Beginner)

**Answer:**

| Aspect | `appConfig.providers` | Component `providers` |
|--------|----------------------|----------------------|
| Injector type | Root environment injector | Element injector |
| Instance count | 1 (singleton) | 1 per component instance |
| Lifetime | Entire application | Component creation to destruction |
| Scope | All components | Component + its children |
| Tree-shakable | No (explicit registration) | No |

```typescript
// Singleton — one instance shared by all
export const appConfig: ApplicationConfig = {
  providers: [UserService]
};

// Per-instance — new instance per component
@Component({
  providers: [FormState]
})
class EditorComponent { }
```

---

### Q27. Can you use `useClass` with an abstract class? (Intermediate)

**Answer:**

Yes, but the abstract class serves as the **token**, not the implementation:

```typescript
abstract class PaymentProcessor {
  abstract processPayment(amount: number): Observable<PaymentResult>;
}

@Injectable()
class StripePaymentProcessor extends PaymentProcessor {
  processPayment(amount: number) { /* Stripe implementation */ }
}

@Injectable()
class PayPalPaymentProcessor extends PaymentProcessor {
  processPayment(amount: number) { /* PayPal implementation */ }
}

// In providers:
{ provide: PaymentProcessor, useClass: StripePaymentProcessor }

// Consumer only knows about the abstract class:
class CheckoutComponent {
  private readonly payment = inject(PaymentProcessor);
  // payment is typed as PaymentProcessor, but is actually StripePaymentProcessor
}
```

This is the **Dependency Inversion Principle** — high-level modules depend on abstractions, not concrete implementations.

---

### Q28. What is the order of precedence when a token has providers at multiple levels? (Advanced)

**Answer:**

From highest to lowest precedence:

1. **Element injector** of the requesting component (component-level `providers`)
2. **Parent element injectors** (walking up the DOM tree)
3. **Route-level environment injector** (route `providers`)
4. **Root environment injector** (`providedIn: 'root'` or `appConfig.providers`)
5. **Platform injector** (`providedIn: 'platform'`)

If the same token is provided at multiple levels, the **first match wins**. Later levels are never checked for that particular resolution.

```
Component providers  →  wins over everything
Parent providers     →  wins over route/root/platform
Route providers      →  wins over root/platform
Root providers       →  wins over platform
Platform providers   →  last resort before error
```

---

## Section 3: Injection Tokens

### Q29. What is an `InjectionToken` and why can't you use a TypeScript interface as a DI token? (Beginner)

**Answer:**

An `InjectionToken` is a DI lookup key for non-class dependencies (strings, numbers, config objects, functions).

TypeScript interfaces **cannot** be DI tokens because they are **erased during compilation** — they don't exist at runtime. Angular's DI system needs runtime values to use as keys in its provider map.

```typescript
// This interface doesn't exist at runtime:
interface AppConfig { apiUrl: string; }
// { provide: AppConfig, ... }  ← ERROR: AppConfig is not a value

// InjectionToken creates a runtime object:
const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
// { provide: APP_CONFIG, ... }  ← Works: APP_CONFIG is a runtime object
```

Classes work as tokens because they exist at runtime (they compile to constructor functions).

---

### Q30. Two `InjectionToken`s have the same description string. Are they the same token? (Intermediate)

**Answer:**

**No.** The description string is purely for debugging/error messages. Token identity is based on **reference equality** (the `InjectionToken` instance itself).

```typescript
const TOKEN_A = new InjectionToken<string>('MY_TOKEN');
const TOKEN_B = new InjectionToken<string>('MY_TOKEN');

// TOKEN_A !== TOKEN_B — they are different objects
providers: [
  { provide: TOKEN_A, useValue: 'value A' },
  { provide: TOKEN_B, useValue: 'value B' },
]

inject(TOKEN_A); // 'value A'
inject(TOKEN_B); // 'value B'
```

This is why importing the exact same token instance is critical. If two files create their own `new InjectionToken('API_URL')`, they are different tokens even though they look the same.

---

### Q31. How do you create a tree-shakable `InjectionToken`? (Intermediate)

**Answer:**

Add `providedIn` and `factory` to the `InjectionToken` constructor:

```typescript
export const ANALYTICS_CONFIG = new InjectionToken<AnalyticsConfig>('ANALYTICS_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    trackingId: 'UA-DEFAULT',
    enabled: true,
    sampleRate: 100,
  }),
});
```

If no component or service ever `inject(ANALYTICS_CONFIG)`, the factory function and the default config object are tree-shaken out of the bundle.

The factory can also use `inject()` to depend on other tokens:

```typescript
export const API_CLIENT = new InjectionToken<ApiClient>('API_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const http = inject(HttpClient);
    const baseUrl = inject(API_BASE_URL);
    return new ApiClient(http, baseUrl);
  },
});
```

---

### Q32. What are the built-in injection tokens you use most frequently? (Intermediate)

**Answer:**

| Token | Import | Type | Use Case |
|-------|--------|------|----------|
| `DOCUMENT` | `@angular/common` | `Document` | SSR-safe access to `document` |
| `PLATFORM_ID` | `@angular/core` | `string` | Check if browser or server |
| `APP_INITIALIZER` | `@angular/core` | `(() => void\|Promise)[]` | Pre-bootstrap logic |
| `LOCALE_ID` | `@angular/core` | `string` | Current locale |
| `ErrorHandler` | `@angular/core` | `ErrorHandler` | Custom global error handling |
| `APP_BASE_HREF` | `@angular/common` | `string` | Base URL for routing |
| `ENVIRONMENT_INITIALIZER` | `@angular/core` | `(() => void)[]` | Per-injector init |

```typescript
// Common SSR-safe pattern:
private readonly document = inject(DOCUMENT);
private readonly platformId = inject(PLATFORM_ID);

ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    const localStorage = this.document.defaultView?.localStorage;
    // Safe to use browser APIs
  }
}
```

---

### Q33. When should you use an abstract class as a token vs an `InjectionToken`? (Advanced)

**Answer:**

**Use an abstract class when:**
- The token represents a service with methods (an interface/contract)
- You want TypeScript type safety without a separate token declaration
- The consumer needs to call methods on the injected value

```typescript
abstract class DataRepository {
  abstract getAll(): Observable<Data[]>;
  abstract save(data: Data): Observable<void>;
}

{ provide: DataRepository, useClass: HttpDataRepository }

// Consumer gets full autocomplete for methods:
const repo = inject(DataRepository); // typed as DataRepository
repo.getAll(); // ✓ autocomplete works
```

**Use `InjectionToken` when:**
- The token represents a primitive value, config object, or function
- There's no meaningful abstract class to define
- You need `multi: true` support
- You need tree-shakable `factory` registration

```typescript
const API_URL = new InjectionToken<string>('API_URL');
const FEATURE_FLAGS = new InjectionToken<Record<string, boolean>>('FEATURE_FLAGS');

const apiUrl = inject(API_URL);  // typed as string
```

---

### Q34. How would you create a typed configuration system using `InjectionToken` for a feature library? (Advanced)

**Answer:**

```typescript
// lib/config.ts
export interface FeatureLibConfig {
  apiEndpoint: string;
  maxRetries: number;
  enableCaching: boolean;
  cacheTTL: number;
  onError?: (error: Error) => void;
}

export const FEATURE_LIB_CONFIG = new InjectionToken<FeatureLibConfig>('FEATURE_LIB_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiEndpoint: '/api/default',
    maxRetries: 3,
    enableCaching: true,
    cacheTTL: 60_000,
  }),
});

// lib/provide-feature.ts
export function provideFeatureLib(config: Partial<FeatureLibConfig>): Provider[] {
  return [
    {
      provide: FEATURE_LIB_CONFIG,
      useFactory: () => {
        const defaults = {
          apiEndpoint: '/api/default',
          maxRetries: 3,
          enableCaching: true,
          cacheTTL: 60_000,
        };
        return { ...defaults, ...config };
      },
    },
  ];
}

// Consumer app:
export const appConfig: ApplicationConfig = {
  providers: [
    provideFeatureLib({
      apiEndpoint: '/api/v2',
      enableCaching: false,
    }),
  ],
};
```

This pattern (a `provideXxx()` function returning providers) is the standard Angular approach for library configuration.

---

### Q35-Q38: Additional Token Questions

### Q35. What happens if you forget to export an `InjectionToken` and two modules create their own? (Intermediate)

**Answer:** You get two different tokens with the same description. Providers registered on one token are invisible when injecting the other. The fix: always export tokens from a single shared file and import that same reference everywhere.

### Q36. Can you override a tree-shakable token's factory? (Intermediate)

**Answer:** Yes. If you provide the token explicitly in a `providers` array, the explicit provider overrides the factory:

```typescript
// Token with factory:
const DATA = new InjectionToken('DATA', { providedIn: 'root', factory: () => 'default' });

// Override in route:
{ path: 'admin', providers: [{ provide: DATA, useValue: 'admin-data' }] }
```

Components in the admin route get `'admin-data'`; others get `'default'`.

### Q37. How do you inject the `Window` object safely for SSR? (Intermediate)

**Answer:**

```typescript
export const WINDOW = new InjectionToken<Window | null>('WINDOW', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT);
    return doc.defaultView;  // null on the server
  },
});

// Usage:
const win = inject(WINDOW);
if (win) {
  win.scrollTo(0, 0);  // Safe — only in browser
}
```

### Q38. What is the `Injector` token itself? Can you inject the injector? (Advanced)

**Answer:** Yes. You can inject `Injector` to perform dynamic/imperative dependency resolution:

```typescript
private readonly injector = inject(Injector);

someMethod() {
  const service = this.injector.get(SomeService);       // Resolved at runtime
  const optional = this.injector.get(Other, null);       // null if not found
}
```

Use this sparingly — it bypasses static analysis and makes dependencies invisible. It's useful for: lazy resolution to break circular deps, dynamic component creation, and plugin/factory patterns.

---

## Section 4: providedIn Scoping

### Q39. What are all the `providedIn` options and when do you use each? (Intermediate)

**Answer:**

| Option | Scope | Instance Count | Tree-Shakable | Use Case |
|--------|-------|---------------|---------------|----------|
| `'root'` | Entire app | 1 (singleton) | Yes | Most services |
| `'platform'` | Across apps on same page | 1 per page | Yes | Multi-app / micro-frontend |
| `'any'` | Per lazy boundary | 1 per boundary | Yes | Isolated feature caches |
| *(omit)* | Must be in `providers` | Depends on where provided | No | Scoped/configurable services |

**Decision guide:**
- **Default to `'root'`** for 90% of services
- **Omit `providedIn`** when you need per-component or per-route instances
- **`'any'`** is niche — only when lazy modules need isolated state
- **`'platform'`** is rare — only for multi-app communication

---

### Q40. Why is `providedIn: 'root'` tree-shakable but listing a service in `providers` is not? (Intermediate)

**Answer:**

With `providedIn: 'root'`, the registration is on the **service class itself** (via metadata). The build tool can analyze whether any code imports the service class. If nothing imports it, the entire class is removed.

With explicit `providers: [MyService]`, the module/component **references** the class directly. This reference is visible to the bundler, so the class is always included — even if no component actually injects it.

```typescript
// Tree-shakable: build tool can prove no one uses it
@Injectable({ providedIn: 'root' })
class RarelyUsedService { }

// NOT tree-shakable: the provider array references it
providers: [RarelyUsedService]  // Always included in bundle
```

---

### Q41. How do route-level providers create scoped services? What happens when the user navigates away? (Intermediate)

**Answer:**

Route-level providers create a child `EnvironmentInjector`:

```typescript
{
  path: 'editor',
  providers: [EditorStateService],
  loadComponent: () => import('./editor').then(m => m.EditorComponent),
}
```

When the user navigates **to** `/editor`:
- A new `EnvironmentInjector` is created
- `EditorStateService` is instantiated within it
- All components in this route tree share the same instance

When the user navigates **away** from `/editor`:
- The `EnvironmentInjector` is destroyed
- `EditorStateService` is destroyed (its `ngOnDestroy` runs)
- All state is lost

When the user navigates **back** to `/editor`:
- A new `EnvironmentInjector` is created
- A **new** `EditorStateService` instance is created (fresh state)

This behavior is useful for feature-specific state that should reset when the user leaves the feature.

---

### Q42. What is `providedIn: 'any'`? Give a scenario where it's useful. (Advanced)

**Answer:**

`providedIn: 'any'` creates **one instance per lazy-loaded boundary**. Eagerly loaded parts of the app share the root instance, but each lazy chunk gets its own.

```typescript
@Injectable({ providedIn: 'any' })
class FeatureCacheService {
  private cache = new Map<string, unknown>();
  // ...
}
```

Scenario: An e-commerce app with lazy-loaded Product and Admin features. Each feature caches API responses. With `providedIn: 'any'`:
- The Product feature has its own `FeatureCacheService` instance (caches product data)
- The Admin feature has its own instance (caches admin data)
- They don't pollute each other's caches
- Clearing the cache in one feature doesn't affect the other

Without `'any'`, you'd need to manually provide the service at each feature's route level.

---

### Q43-Q48: Additional Scoping Questions

### Q43. Can a `providedIn: 'root'` service be overridden at the component level? (Beginner)

**Answer:** Yes. A component's `providers` array creates a local instance that shadows the root singleton. The component and its children get the local instance; other parts of the app continue using the root singleton.

### Q44. What happens if you provide a service in both a parent and child component? (Intermediate)

**Answer:** The child gets its **own** instance (from its own `providers`). The parent keeps its own instance. The child's children get the child's instance (unless they also provide their own). There is no "merging" — the child's provider completely shadows the parent's for that subtree.

### Q45. How would you provide a service that is shared only within a specific lazy-loaded feature? (Intermediate)

**Answer:** Add it to the route's `providers` array:
```typescript
{
  path: 'admin',
  loadChildren: () => import('./admin/routes').then(m => m.ADMIN_ROUTES),
  providers: [AdminStateService],
}
```
All components within the admin route tree share a single `AdminStateService` instance.

### Q46. What is the difference between `@Injectable()` and `@Injectable({ providedIn: 'root' })`? (Beginner)

**Answer:** `@Injectable()` makes the class injectable but doesn't register it anywhere — you must add it to a `providers` array. `@Injectable({ providedIn: 'root' })` both makes it injectable AND registers it in the root injector (tree-shakably). The latter is preferred for singletons.

### Q47. Can a component-level service inject a root-level service? (Beginner)

**Answer:** Yes. A component-level service can inject any service available in the injector chain above it. The component's element injector is checked first, then parent element injectors, then environment injectors up to root.

### Q48. How do you ensure a service exists as exactly ONE instance even with lazy loading? (Intermediate)

**Answer:** Use `providedIn: 'root'`. Root-level services are singletons regardless of lazy loading boundaries. The common mistake is providing the service in a shared NgModule that gets imported by multiple lazy modules — this creates multiple instances. With `providedIn: 'root'`, there's always exactly one instance.

---

## Section 5: Multi-Providers and Optional Dependencies

### Q49. What are multi-providers? How do they differ from normal providers? (Beginner)

**Answer:**

Normal providers: The **last** registration for a token wins. Previous registrations are overwritten.

Multi-providers (`multi: true`): All registrations are **collected into an array**. Injecting the token returns the array of all provided values.

```typescript
// Normal: only 'third' is returned
{ provide: TOKEN, useValue: 'first' },
{ provide: TOKEN, useValue: 'second' },
{ provide: TOKEN, useValue: 'third' },
inject(TOKEN); // → 'third'

// Multi: all values returned as array
{ provide: TOKEN, useValue: 'first', multi: true },
{ provide: TOKEN, useValue: 'second', multi: true },
{ provide: TOKEN, useValue: 'third', multi: true },
inject(TOKEN); // → ['first', 'second', 'third']
```

---

### Q50. What happens if you mix `multi: true` and `multi: false` (or omit it) for the same token? (Intermediate)

**Answer:**

It causes an error at runtime: `Error: Mixed multi-provider for [Token]`. Angular requires that ALL providers for a given token are consistently multi or consistently non-multi. You cannot have some registrations with `multi: true` and others without.

---

### Q51. Name three built-in Angular tokens that use multi-providers. (Intermediate)

**Answer:**

1. **`APP_INITIALIZER`**: Multiple initialization functions that run before the app renders
2. **`HTTP_INTERCEPTORS`** (legacy class-based): Multiple interceptors for HTTP requests
3. **`NG_VALIDATORS`**: Multiple validators attached to a form control via DI
4. **`NG_VALUE_ACCESSOR`**: Control value accessor for form integration
5. **`ENVIRONMENT_INITIALIZER`**: Multiple initialization functions per environment injector

---

### Q52. How would you build an extensible validation system using multi-providers? (Advanced)

**Answer:**

```typescript
// validation/validator.model.ts
export interface FieldValidator {
  readonly name: string;
  validate(value: unknown): string | null; // null = valid, string = error message
}

export const FIELD_VALIDATORS = new InjectionToken<FieldValidator[]>('FIELD_VALIDATORS');

// Register validators:
providers: [
  {
    provide: FIELD_VALIDATORS,
    useValue: { name: 'required', validate: (v) => v ? null : 'This field is required' },
    multi: true,
  },
  {
    provide: FIELD_VALIDATORS,
    useValue: { name: 'email', validate: (v) => /^[^\s@]+@[^\s@]+$/.test(String(v)) ? null : 'Invalid email' },
    multi: true,
  },
  {
    provide: FIELD_VALIDATORS,
    useFactory: (config: AppConfig) => ({
      name: 'maxLength',
      validate: (v: string) => v.length > config.maxFieldLength ? `Max ${config.maxFieldLength} chars` : null,
    }),
    deps: [APP_CONFIG],
    multi: true,
  },
]

// Usage:
const validators = inject(FIELD_VALIDATORS);
const errors = validators
  .map(v => v.validate(fieldValue))
  .filter(Boolean);
```

New validators can be added without modifying existing code.

---

### Q53. What is `@Optional()` and when is it critical to use it? (Beginner)

**Answer:**

`@Optional()` (or `{ optional: true }` with `inject()`) returns `null` instead of throwing `NullInjectorError` when a dependency isn't found.

Critical use cases:
1. **Optional features**: Analytics service that might not be configured
2. **Hierarchical lookups**: A component checking if a parent provides a specific service
3. **Library code**: A library service that works with or without an optional dependency
4. **Directive looking for a host**: `inject(FormGroup, { optional: true, host: true })`

```typescript
@Injectable({ providedIn: 'root' })
class NotificationService {
  private readonly sound = inject(SoundService, { optional: true });

  notify(message: string): void {
    this.showToast(message);
    this.sound?.playNotificationSound();  // Only plays if SoundService is provided
  }
}
```

---

### Q54-Q58: Additional Multi-Provider Questions

### Q54. Can multi-providers be overridden at a child injector level? (Advanced)

**Answer:** Yes, but with a nuance. A child injector's multi-providers **replace** (not extend) the parent's array:

```typescript
// Root:
{ provide: PLUGINS, useValue: pluginA, multi: true },
{ provide: PLUGINS, useValue: pluginB, multi: true },

// Child component:
@Component({
  providers: [{ provide: PLUGINS, useValue: pluginC, multi: true }]
})
```

In the child, `inject(PLUGINS)` returns `[pluginC]` — NOT `[pluginA, pluginB, pluginC]`. The child's multi-provider array completely replaces the parent's. If you need to extend, inject from the parent explicitly and merge.

### Q55. How does Angular's `provideHttpClient(withInterceptors([...]))` use DI internally? (Advanced)

**Answer:** The `withInterceptors()` function registers the interceptor functions as multi-providers under an internal token. When `HttpClient` makes a request, it injects all interceptors and chains them. This is a cleaner version of the legacy `HTTP_INTERCEPTORS` multi-provider pattern.

### Q56. What is the difference between `inject(Token, { optional: true })` returning `null` vs `inject(Token)` with a default value? (Intermediate)

**Answer:** `{ optional: true }` returns `null` when the provider isn't found. There's no built-in default value parameter for `inject()`. To provide a default, use the null coalescing operator:
```typescript
const logger = inject(LoggerService, { optional: true }) ?? new ConsoleLogger();
```

### Q57. How would you use multi-providers to implement a middleware-like pattern? (Advanced)

**Answer:** Register multiple middleware functions, inject them as an array, and execute them in sequence:
```typescript
const MIDDLEWARE = new InjectionToken<((ctx: Context) => Context)[]>('MIDDLEWARE');

// Registration:
{ provide: MIDDLEWARE, useValue: addTimestamp, multi: true },
{ provide: MIDDLEWARE, useValue: addCorrelationId, multi: true },
{ provide: MIDDLEWARE, useValue: validatePermissions, multi: true },

// Execution:
const middlewares = inject(MIDDLEWARE);
const finalContext = middlewares.reduce((ctx, fn) => fn(ctx), initialContext);
```

### Q58. Can `useFactory` be used with `multi: true`? (Intermediate)

**Answer:** Yes. Each multi-provider can use any provider type:
```typescript
{ provide: VALIDATORS, useClass: RequiredValidator, multi: true },
{ provide: VALIDATORS, useValue: customValidator, multi: true },
{ provide: VALIDATORS, useFactory: (config) => new ConfigValidator(config), deps: [CONFIG], multi: true },
{ provide: VALIDATORS, useExisting: SharedValidator, multi: true },
```

---

## Section 6: Forward References and Circular Dependencies

### Q59. What is `forwardRef()` and why does Angular need it? (Intermediate)

**Answer:**

`forwardRef()` wraps a reference to a class that hasn't been defined yet at the point of use. JavaScript classes are not hoisted, so referencing a class before its declaration causes a `ReferenceError`.

```typescript
// Without forwardRef — ERROR at runtime:
providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: MyComponent, multi: true }]
// MyComponent class definition comes AFTER this metadata is evaluated

// With forwardRef — works:
providers: [{
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MyComponent),
  multi: true,
}]
```

`forwardRef(() => MyComponent)` creates a lazy reference. Angular calls the arrow function later, when `MyComponent` has been defined.

---

### Q60. What is the most common use case for `forwardRef()` in real Angular applications? (Intermediate)

**Answer:**

`ControlValueAccessor` registration. When building a custom form control, the component must register itself as a provider — but the class isn't fully defined yet:

```typescript
@Component({
  selector: 'app-star-rating',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => StarRatingComponent),  // Self-reference
    multi: true,
  }],
})
class StarRatingComponent implements ControlValueAccessor { ... }
```

Without `forwardRef`, `StarRatingComponent` is referenced before the class statement executes.

---

### Q61. How do circular dependencies manifest in Angular? Give an example. (Intermediate)

**Answer:**

Circular dependency: Service A depends on Service B, and Service B depends on Service A.

```typescript
@Injectable({ providedIn: 'root' })
class AuthService {
  private readonly user = inject(UserService);  // Depends on UserService
  // ...
}

@Injectable({ providedIn: 'root' })
class UserService {
  private readonly auth = inject(AuthService);  // Depends on AuthService — CIRCULAR!
  // ...
}
```

Angular throws: `Error: NG0200: Circular dependency in DI detected for AuthService.`

This happens because Angular tries to create `AuthService`, which needs `UserService`, which needs `AuthService` — infinite loop.

---

### Q62. What are the strategies to resolve circular dependencies? (Advanced)

**Answer:**

**1. Introduce a mediator/shared service:**
Extract the shared logic into a third service that both depend on.
```typescript
@Injectable({ providedIn: 'root' })
class AuthUserMediator {
  // Contains the logic that caused the cycle
}
class AuthService { mediator = inject(AuthUserMediator); }
class UserService { mediator = inject(AuthUserMediator); }
```

**2. Lazy injection via `Injector.get()`:**
```typescript
class AuthService {
  private readonly injector = inject(Injector);
  private _userService?: UserService;

  get userService() {
    return this._userService ??= this.injector.get(UserService);
  }
}
```

**3. Event-based communication:**
```typescript
@Injectable({ providedIn: 'root' })
class EventBus { /* Subject-based pub/sub */ }

class AuthService { bus = inject(EventBus); }  // Emits events
class UserService { bus = inject(EventBus); }  // Listens to events
```

**4. Restructure — separate concerns:** Often the real fix is rethinking the architecture. If two services are so tightly coupled they need each other, they might be one service, or the shared logic should be extracted.

---

### Q63. Does `forwardRef` solve circular dependencies? (Intermediate)

**Answer:**

**No.** `forwardRef` solves **declaration order** issues (referencing a class before it's defined in the file). It does NOT solve **circular injection** issues (Service A needing B and B needing A).

- **Declaration order problem** (forwardRef helps): Class A references Class B which is declared later in the same or another file.
- **Circular dependency** (forwardRef doesn't help): Class A's constructor needs Class B, and Class B's constructor needs Class A. This is a runtime resolution cycle regardless of declaration order.

---

### Q64-Q66: Additional Forward Ref Questions

### Q64. Can circular dependencies happen between a component and a service? (Intermediate)

**Answer:** Yes. If a component provides a service, and that service injects the component (or another service that injects the component), you get a circular dependency. Solution: avoid injecting components into services. Services should be unaware of specific components.

### Q65. How does `forwardRef` interact with AOT compilation? (Advanced)

**Answer:** AOT handles `forwardRef` correctly — the compiler understands it and generates proper factory code. However, complex circular references between files can cause AOT compilation errors even with `forwardRef`, because the compiler needs to resolve metadata at build time. The fix is usually to restructure to avoid the circular file import.

### Q66. In a monorepo, how do circular dependencies between libraries differ from circular DI dependencies? (Expert)

**Answer:** Circular **file/module imports** between libraries prevent compilation entirely (TypeScript/bundler error). Circular **DI dependencies** compile fine but fail at runtime. Nx's `nx lint` and `nx graph` detect circular file imports. Angular's DI error (`NG0200`) catches circular injection. They're different problems requiring different solutions — file restructuring vs DI architecture changes.

---

## Section 7: The `inject()` Function and Modern Patterns

### Q67. What is the `inject()` function and how does it differ from constructor injection? (Beginner)

**Answer:**

`inject()` is a function that resolves a dependency from the current injection context, introduced in Angular 14:

```typescript
// Constructor injection (legacy):
class MyService {
  constructor(
    private http: HttpClient,
    @Optional() private analytics: AnalyticsService | null,
    @Inject(API_URL) private apiUrl: string,
  ) {}
}

// inject() function (modern):
class MyService {
  private readonly http = inject(HttpClient);
  private readonly analytics = inject(AnalyticsService, { optional: true });
  private readonly apiUrl = inject(API_URL);
}
```

**Advantages of `inject()`:**
- No constructor needed
- Works in field initializers (dependencies available immediately)
- Better TypeScript type inference (`{ optional: true }` narrows to `T | null`)
- Enables composable helper functions (like React hooks)
- Simpler inheritance (no `super()` argument forwarding)

---

### Q68. What is an "injection context"? Where can `inject()` be called? (Intermediate)

**Answer:**

An injection context exists during the synchronous creation of a DI-managed object. `inject()` can be called in:

1. **Field initializers** of classes created by DI
2. **Constructors** of classes created by DI
3. **Factory functions** (`useFactory`, `InjectionToken.factory`)
4. **Functions called synchronously** from the above contexts
5. **`runInInjectionContext()`** — an explicit context

**Cannot be called in:**
- Event handlers (`onClick()`)
- `setTimeout`/`setInterval` callbacks
- `ngOnInit` or other lifecycle hooks (AFTER construction)
- Async callbacks (Promise `.then()`, Observable `.subscribe()`)

```typescript
class MyComponent {
  private readonly http = inject(HttpClient);  // ✅ Field initializer

  constructor() {
    const router = inject(Router);  // ✅ Constructor
  }

  onClick() {
    const x = inject(SomeService);  // ❌ ERROR: not in injection context
  }
}
```

---

### Q69. How do you create reusable `inject()` helper functions? (Intermediate)

**Answer:**

Because `inject()` works in field initializers, you can extract it into helper functions:

```typescript
// Reusable "toast" helper — Angular's version of a React hook
function injectToast() {
  const snackBar = inject(MatSnackBar);
  return {
    success: (msg: string) => snackBar.open(msg, '✓', { duration: 3000 }),
    error: (msg: string) => snackBar.open(msg, '✕', { panelClass: 'error' }),
  };
}

// Reusable auto-cleanup helper
function injectDestroy(): Observable<void> {
  const subject = new Subject<void>();
  inject(DestroyRef).onDestroy(() => { subject.next(); subject.complete(); });
  return subject.asObservable();
}

// Usage in any component:
class ProductComponent {
  private readonly toast = injectToast();     // ✅
  private readonly destroy$ = injectDestroy(); // ✅

  save() {
    this.productService.save(this.product).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.toast.success('Saved!'),
      error: () => this.toast.error('Failed'),
    });
  }
}
```

This is the most powerful pattern enabled by `inject()` — composable, reusable DI logic.

---

### Q70. How does `inject()` work with inheritance? Why is it better than constructor injection for base classes? (Advanced)

**Answer:**

With constructor injection, base class dependencies must be forwarded via `super()`:

```typescript
// Constructor injection — painful inheritance:
class BaseComponent {
  constructor(
    protected router: Router,
    protected logger: LoggerService,
    protected config: ConfigService,
  ) {}
}

class ChildComponent extends BaseComponent {
  constructor(
    router: Router,
    logger: LoggerService,
    config: ConfigService,
    private readonly productService: ProductService,  // Child's own dependency
  ) {
    super(router, logger, config);  // Must forward ALL parent deps
  }
}
```

With `inject()` — no forwarding needed:
```typescript
class BaseComponent {
  protected readonly router = inject(Router);
  protected readonly logger = inject(LoggerService);
  protected readonly config = inject(ConfigService);
}

class ChildComponent extends BaseComponent {
  private readonly productService = inject(ProductService);
  // No constructor, no super() — parent deps are resolved automatically
}
```

Adding a new dependency to `BaseComponent` doesn't require changing every subclass.

---

### Q71. What is `DestroyRef` and how does it improve cleanup patterns? (Intermediate)

**Answer:**

`DestroyRef` is an injectable token that provides a `onDestroy()` callback, fired when the current injection context is destroyed:

```typescript
class MyComponent {
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Register cleanup
    this.destroyRef.onDestroy(() => {
      console.log('Component destroyed, cleaning up');
    });

    // Use with takeUntilDestroyed
    someObservable$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }
}
```

**Improvements over `ngOnDestroy`:**
1. Works in services, not just components
2. No interface implementation needed (`implements OnDestroy`)
3. Can register multiple callbacks
4. Enables `takeUntilDestroyed()` operator for RxJS cleanup
5. Can be passed to helper functions for composable cleanup

---

### Q72. Explain `takeUntilDestroyed()`. Can it be used outside a constructor? (Intermediate)

**Answer:**

`takeUntilDestroyed()` is an RxJS operator that unsubscribes when the injection context is destroyed:

```typescript
// In constructor or field initializer — no argument needed:
class MyComponent {
  data$ = this.service.getData().pipe(
    takeUntilDestroyed()  // Uses the current injection context
  );
}

// Outside constructor — must pass DestroyRef:
class MyComponent {
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.getData().pipe(
      takeUntilDestroyed(this.destroyRef)  // Explicit DestroyRef
    ).subscribe();
  }
}
```

Without the `DestroyRef` argument, `takeUntilDestroyed()` can only be called in an injection context (constructor/field init). With the argument, it can be called anywhere.

---

### Q73-Q76: Additional inject() Questions

### Q73. Can you use `inject()` in a pipe or a directive? (Beginner)

**Answer:** Yes. `inject()` works in any class that Angular creates via DI — components, directives, pipes, services, guards, resolvers, and interceptors.

### Q74. What is the performance difference between `inject()` and constructor injection? (Advanced)

**Answer:** None. Both compile to the same generated code (`ɵɵdirectiveInject()`). The `inject()` function is just syntactic sugar that Angular's compiler transforms during AOT compilation. At runtime, the resolution path is identical.

### Q75. How does `inject()` interact with Angular's signal-based APIs like `rxResource`? (Advanced)

**Answer:** Signal-based APIs use `inject()` internally. `rxResource` needs the injection context to set up proper cleanup. That's why these must be called during field initialization:

```typescript
class ProductComponent {
  productId = input.required<string>();

  // rxResource uses inject() internally for HttpClient, DestroyRef, etc.
  product = rxResource({
    request: () => this.productId(),
    loader: ({ request: id }) => inject(HttpClient).get(`/api/products/${id}`),
  });
}
```

### Q76. What happens if you call `inject()` in a `setTimeout()` callback? (Intermediate)

**Answer:** It throws: `Error: NG0203: inject() must be called from an injection context (constructor, factory, or field initializer)`. `setTimeout` callbacks run asynchronously, outside the injection context. Solution: resolve the dependency in the constructor and store it as a field, then use it in the callback.

---

## Section 8: Cross-Topic Scenario and Design Questions

### Q77. You're building a multi-tenant SaaS application. Each tenant needs different configurations, API endpoints, and branding. How do you architect this with DI? (Expert)

**Answer:**

```typescript
// Token for tenant config
export interface TenantConfig {
  id: string;
  name: string;
  apiBaseUrl: string;
  theme: Theme;
  features: Record<string, boolean>;
}
export const TENANT_CONFIG = new InjectionToken<TenantConfig>('TENANT_CONFIG');

// Load tenant config during bootstrap
{
  provide: APP_INITIALIZER,
  useFactory: (http: HttpClient) => async () => {
    const tenantId = window.location.hostname.split('.')[0]; // subdomain-based
    const config = await firstValueFrom(http.get<TenantConfig>(`/api/tenants/${tenantId}/config`));
    return config;
  },
  deps: [HttpClient],
  multi: true,
}

// Provide the loaded config
{
  provide: TENANT_CONFIG,
  useFactory: (configService: TenantConfigService) => configService.config(),
  deps: [TenantConfigService],
}

// Override API base URL per tenant
{
  provide: API_BASE_URL,
  useFactory: (config: TenantConfig) => config.apiBaseUrl,
  deps: [TENANT_CONFIG],
}

// Services that need tenant context:
@Injectable({ providedIn: 'root' })
class ApiService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);

  get<T>(path: string) {
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }
}
```

DI makes this clean: swap the config token's value and every service that depends on it automatically uses the new tenant's settings.

---

### Q78. How would you implement a feature flag system using DI that can be extended by different teams? (Expert)

**Answer:**

```typescript
// Core: feature flag interface and token
export interface FeatureFlag {
  name: string;
  isEnabled: Signal<boolean>;
  description?: string;
}
export const FEATURE_FLAGS = new InjectionToken<FeatureFlag[]>('FEATURE_FLAGS');

// Team A registers their flags:
{ provide: FEATURE_FLAGS, useFactory: () => ({
  name: 'new-checkout', isEnabled: signal(false), description: 'Redesigned checkout flow'
}), multi: true },

// Team B registers their flags:
{ provide: FEATURE_FLAGS, useFactory: (config: AppConfig) => ({
  name: 'dark-mode', isEnabled: signal(config.features['darkMode'] ?? false)
}), deps: [APP_CONFIG], multi: true },

// Feature flag service:
@Injectable({ providedIn: 'root' })
class FeatureFlagService {
  private readonly flags = inject(FEATURE_FLAGS);
  private readonly flagMap = new Map(this.flags.map(f => [f.name, f]));

  isEnabled(name: string): Signal<boolean> {
    return this.flagMap.get(name)?.isEnabled ?? signal(false);
  }
}

// Usage in templates:
@if (featureFlags.isEnabled('new-checkout')()) {
  <app-new-checkout />
} @else {
  <app-legacy-checkout />
}
```

Multi-providers allow each team to register their flags independently without modifying a central configuration.

---

### Q79. Your Angular app needs to work both in the browser and as a server-rendered page. How does DI help? (Expert)

**Answer:**

DI abstracts platform-specific APIs behind tokens. The same application code works on both platforms because different providers are supplied:

```typescript
// SSR-safe document access:
private readonly document = inject(DOCUMENT); // Not window.document

// SSR-safe platform check:
private readonly platformId = inject(PLATFORM_ID);
if (isPlatformBrowser(this.platformId)) {
  // Browser-only code
}

// Custom abstraction for localStorage:
export const STORAGE = new InjectionToken<Storage>('STORAGE', {
  providedIn: 'root',
  factory: () => {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      return inject(DOCUMENT).defaultView!.localStorage;
    }
    return new InMemoryStorage(); // Server fallback
  },
});
```

The server bootstrap provides different implementations for browser-specific services. Components never directly access `window`, `document`, or `localStorage` — they inject abstracted tokens.

---

### Q80. Compare Angular's DI with dependency injection in Spring (Java) and .NET. What are the unique characteristics of Angular's DI? (Expert)

**Answer:**

| Feature | Angular | Spring | .NET (Microsoft.Extensions) |
|---------|---------|--------|-----------------------------|
| Hierarchy | Two trees (element + environment) | Flat (single container) | Scoped (3 lifetimes) |
| DOM-aligned scoping | Yes (element injectors follow DOM) | No | No |
| Tree-shakability | Yes (`providedIn`) | No | No |
| Compilation | AOT factory generation | Runtime reflection | Runtime or source generation |
| View providers | Yes (`viewProviders`) | No equivalent | No equivalent |
| Resolution modifiers | `@Self`, `@SkipSelf`, `@Host`, `@Optional` | `@Qualifier`, `@Primary` | Named registrations |
| Multi-providers | Yes (`multi: true`) | Yes (collection injection) | Yes (`IEnumerable<T>`) |

**Angular-unique features:**
1. **Element injectors aligned with the DOM tree** — no other framework does this
2. **`viewProviders` for content projection scoping** — unique to Angular
3. **`@Host()` modifier** — stops at the host component boundary (DOM-aware)
4. **Tree-shakable providers** — build tooling integration

---

### Q81. You need to test a component that has 5 injected services. Three are simple, two make HTTP calls. What's your testing strategy? (Intermediate)

**Answer:**

```typescript
describe('DashboardComponent', () => {
  let httpServiceSpy: jasmine.SpyObj<DataService>;
  let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;

  beforeEach(() => {
    // Create spies for services with side effects
    httpServiceSpy = jasmine.createSpyObj('DataService', ['fetchDashboard', 'savePreferences']);
    analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['trackPageView']);

    TestBed.configureTestingModule({
      providers: [
        // Two HTTP services → replace with spies
        { provide: DataService, useValue: httpServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy },

        // Three simple services → use real implementations (faster, less brittle)
        // ConfigService, DateFormatService, PermissionService
        // They have no side effects, so real instances are fine
        { provide: APP_CONFIG, useValue: { maxItems: 10, theme: 'light' } },
      ],
    });

    httpServiceSpy.fetchDashboard.and.returnValue(of(mockDashboardData));
  });

  it('should fetch dashboard data on init', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(httpServiceSpy.fetchDashboard).toHaveBeenCalledOnce();
  });
});
```

**Strategy:**
- Mock services with side effects (HTTP, WebSocket, analytics)
- Use real implementations for pure/simple services
- Use `useValue` with spies for fine-grained assertion control
- Use `InjectionToken` values for configuration

---

### Q82. How would you implement a logging system where different modules can add their own log handlers without a central registration? (Advanced)

**Answer:**

Use multi-providers with `ENVIRONMENT_INITIALIZER` at route level:

```typescript
// Core logging:
export const LOG_HANDLER = new InjectionToken<LogHandler[]>('LOG_HANDLER');

export interface LogHandler {
  handle(level: string, message: string, context?: Record<string, unknown>): void;
}

@Injectable({ providedIn: 'root' })
class LogService {
  private readonly handlers = inject(LOG_HANDLER, { optional: true }) ?? [];

  log(level: string, message: string, context?: Record<string, unknown>) {
    this.handlers.forEach(h => h.handle(level, message, context));
  }
}

// Root: console handler
{ provide: LOG_HANDLER, useValue: { handle: (l, m) => console[l](m) }, multi: true }

// Admin feature adds a remote handler:
// admin.routes.ts
providers: [
  { provide: LOG_HANDLER, useClass: RemoteLogHandler, multi: true },
]

// Analytics feature adds an analytics handler:
// analytics.routes.ts
providers: [
  { provide: LOG_HANDLER, useClass: AnalyticsLogHandler, multi: true },
]
```

Each feature registers its handlers. The core `LogService` doesn't know about specific handlers.

---

### Q83. Explain how Angular's DI system achieves Inversion of Control. How does this relate to the SOLID principles? (Expert)

**Answer:**

**Inversion of Control**: Instead of a component creating its dependencies (`new UserService()`), the framework (Angular's injector) controls creation and provides them. The component declares what it needs; the injector decides how to fulfill it.

**SOLID principles in Angular DI:**

1. **S — Single Responsibility**: Each service has one job. DI wires them together.

2. **O — Open/Closed**: Multi-providers allow extension without modification. New plugins/interceptors/validators are added via providers, not by changing existing code.

3. **L — Liskov Substitution**: `useClass` substitutes implementations. Any class satisfying the token's contract can be swapped in.

4. **I — Interface Segregation**: Abstract classes as tokens expose only the methods consumers need. `useExisting` can alias a full service to a narrow interface.

5. **D — Dependency Inversion**: Components depend on abstractions (tokens/abstract classes), not concrete implementations. `{ provide: Logger, useClass: FileLogger }` — the component only knows about `Logger`.

---

### Q84. Design a dynamic widget system where widgets can be registered at runtime and receive their own isolated DI scope. (Expert)

**Answer:**

```typescript
@Injectable({ providedIn: 'root' })
class WidgetManager {
  private readonly parentInjector = inject(EnvironmentInjector);

  createWidget(component: Type<unknown>, config: WidgetConfig): WidgetRef {
    // Each widget gets an isolated injector
    const injector = createEnvironmentInjector([
      { provide: WIDGET_CONFIG, useValue: config },
      { provide: WIDGET_ID, useValue: crypto.randomUUID() },
      WidgetStateService,  // Per-widget state
    ], this.parentInjector);

    const componentRef = createComponent(component, {
      environmentInjector: injector,
    });

    return {
      componentRef,
      destroy: () => {
        componentRef.destroy();
        injector.destroy();
      }
    };
  }
}

// Each widget gets its own WidgetStateService and config
// while still accessing root-level services (HttpClient, Router, etc.)
```

---

### Q85. What are lightweight injection tokens and why do library authors need them? (Expert)

**Answer:**

A lightweight injection token is an abstract class or `InjectionToken` that contains no implementation code — just a type contract. It ensures the implementation class is tree-shakable.

```typescript
// HEAVY token — always includes the full implementation:
@Injectable({ providedIn: 'root' })
export class ChartService {
  // 2000 lines of code... always in the bundle
}

// LIGHTWEIGHT token — implementation is tree-shakable:
export abstract class ChartService {
  abstract render(data: number[]): void;
}

@Injectable()  // NOT providedIn — only included if explicitly provided
class D3ChartService extends ChartService {
  render(data: number[]) { /* 2000 lines of D3 code */ }
}

// Library's provider function:
export function provideCharts(): Provider[] {
  return [{ provide: ChartService, useClass: D3ChartService }];
}
```

If the consumer never calls `provideCharts()`, `D3ChartService` and its 2000 lines are tree-shaken out. The lightweight `ChartService` abstract class has no implementation code to include.

---

### Q86-Q88: Final Scenario Questions

### Q86. You discover that a service meant to be singleton has multiple instances. The app has NgModules and standalone components mixed together. How do you diagnose? (Expert)

**Answer:**
1. Add a static counter to the service constructor to confirm multiple instances
2. Check `providedIn` — if it's `'root'`, there should be one instance. If it's missing, check where it's registered
3. Common causes in mixed codebases: the service is in a lazy-loaded NgModule's `providers`, AND in a standalone component's route `providers` — two injectors, two instances
4. Search for ALL provider registrations of this service across the codebase
5. Fix: use `providedIn: 'root'` and remove all explicit `providers` registrations

### Q87. How would you migrate a large app from constructor injection to `inject()` incrementally? (Expert)

**Answer:**
1. Start with new code — all new services and components use `inject()`
2. Convert leaf components first (no children depending on constructor signature)
3. Convert services bottom-up (services with no subclasses first)
4. For inheritance hierarchies, convert base classes and subclasses together (since `inject()` eliminates the `super()` forwarding problem)
5. Use ESLint rules to enforce `inject()` in new code
6. No need to convert everything at once — both patterns work side by side indefinitely

### Q88. Design an error handling system using DI where different parts of the app can register custom error handlers. (Expert)

**Answer:**
```typescript
export interface ErrorStrategy {
  canHandle(error: unknown): boolean;
  handle(error: unknown): void;
}

export const ERROR_STRATEGIES = new InjectionToken<ErrorStrategy[]>('ERROR_STRATEGIES');

@Injectable()
class CustomErrorHandler extends ErrorHandler {
  private readonly strategies = inject(ERROR_STRATEGIES, { optional: true }) ?? [];
  private readonly defaultHandler = inject(DefaultErrorStrategy);

  handleError(error: unknown): void {
    const strategy = this.strategies.find(s => s.canHandle(error));
    if (strategy) {
      strategy.handle(error);
    } else {
      this.defaultHandler.handle(error);
    }
  }
}

// Register in appConfig:
{ provide: ErrorHandler, useClass: CustomErrorHandler },
{ provide: ERROR_STRATEGIES, useClass: HttpErrorStrategy, multi: true },
{ provide: ERROR_STRATEGIES, useClass: AuthErrorStrategy, multi: true },
{ provide: ERROR_STRATEGIES, useClass: ValidationErrorStrategy, multi: true },
```

Features can add their own strategies via route-level providers. The core error handler doesn't need to change.

---

## Quick Reference: Top 10 DI Concepts for FAANG Interviews

1. **Two injector trees** — element (DOM-aligned) + environment (app-wide)
2. **Resolution algorithm** — element up → environment up → throw or null
3. **Four provider types** — useClass, useValue, useFactory, useExisting
4. **`providedIn: 'root'`** — tree-shakable singleton
5. **`InjectionToken`** — typed tokens for non-class values
6. **Multi-providers** — extensible plugin/interceptor/validator patterns
7. **Resolution modifiers** — Self, SkipSelf, Host, Optional
8. **`inject()` function** — modern DI, composable helpers
9. **`providers` vs `viewProviders`** — content projection visibility
10. **Scoping strategy** — root singleton vs route-scoped vs component-scoped
