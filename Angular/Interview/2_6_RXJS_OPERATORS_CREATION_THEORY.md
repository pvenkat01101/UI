# RxJS Creation Operators — In-Depth Theory

> **Phase 2 · Section 6** of the Angular Interview Preparation Roadmap
> Target: RxJS 7.x (shipped with Angular 21) · Angular-centric patterns · Beginner to Expert

---

## Table of Contents

1. [What Are Creation Operators?](#1-what-are-creation-operators)
2. [of()](#2-of)
3. [from()](#3-from)
4. [interval() & timer()](#4-interval--timer)
5. [fromEvent()](#5-fromevent)
6. [defer()](#6-defer)
7. [range() & generate()](#7-range--generate)
8. [Other Useful Creators](#8-other-useful-creators)
9. [Angular 21 Patterns with Creation Operators](#9-angular-21-patterns-with-creation-operators)
10. [Mental Models & Quick-Reference Tables](#10-mental-models--quick-reference-tables)

---

## 1. What Are Creation Operators?

### Definition

Creation operators are **standalone functions** (not pipeable operators) that produce new Observables from various data sources. They are the entry points into the reactive world — every RxJS pipeline starts with a creation operator.

```
Data Source ──→ Creation Operator ──→ Observable ──→ pipe(operators) ──→ subscribe()
```

### Creation vs Pipeable Operators

| Aspect | Creation Operator | Pipeable Operator |
|--------|------------------|-------------------|
| Import | `import { of } from 'rxjs'` | `import { map } from 'rxjs/operators'` (or `'rxjs'`) |
| Usage | Called standalone: `of(1, 2, 3)` | Called inside `.pipe()`: `.pipe(map(x => x * 2))` |
| Returns | A new Observable | A function that returns an Observable |
| Purpose | Create an Observable from scratch | Transform an existing Observable |

### All RxJS 7 Creation Operators at a Glance

| Operator | Input | Output | Sync/Async | Completes? |
|----------|-------|--------|------------|------------|
| `of()` | Values | Emits each value | Sync | Yes |
| `from()` | Array, Promise, Iterable, ObservableInput | Emits each element | Sync* | Yes |
| `interval()` | Period (ms) | Incrementing numbers | Async | No |
| `timer()` | Delay, [period] | 0 or incrementing numbers | Async | Yes/No |
| `fromEvent()` | Target, event name | Event objects | Async | No |
| `defer()` | Factory function | Whatever factory returns | Depends | Depends |
| `range()` | Start, count | Incrementing numbers | Sync | Yes |
| `generate()` | Seed, condition, iterate | Generated values | Sync | Yes |
| `EMPTY` | — | Nothing | Sync | Yes (immediately) |
| `NEVER` | — | Nothing | — | No |
| `throwError()` | Error factory | Nothing | Sync | Error |
| `forkJoin()` | Observables | Last value of each | Async | Yes |
| `combineLatest()` | Observables | Latest of each | Async | When all complete |
| `merge()` | Observables | Interleaved values | Async | When all complete |
| `concat()` | Observables | Sequential values | Depends | When all complete |
| `race()` | Observables | First to emit wins | Async | When winner completes |

*`from(Promise)` is async; `from(Array)` is sync.

---

## 2. of()

### Signature

```typescript
of<T>(...values: T[]): Observable<T>
```

### Behavior

`of()` takes any number of arguments, emits each **synchronously** in sequence, then completes.

```typescript
import { of } from 'rxjs';

of(1, 2, 3).subscribe({
  next: v => console.log(v),
  complete: () => console.log('done')
});
// 1 → 2 → 3 → done (all synchronous, no delay)
```

### Timeline

```
of(1, 2, 3):
  (123|)     ← synchronous burst, then complete
```

### Key Characteristics

| Property | Value |
|----------|-------|
| Synchronous | Yes |
| Cold | Yes (each subscription replays) |
| Completes | Yes (immediately after last value) |
| Teardown | None needed |

### Common Patterns in Angular

```typescript
// 1. Default/fallback values
getData(): Observable<User[]> {
  if (this.cache.has('users')) {
    return of(this.cache.get('users')!); // Immediate, sync
  }
  return this.http.get<User[]>('/api/users');
}

// 2. Mock data in tests
const mockService = {
  getUsers: () => of([{ id: 1, name: 'Test' }])
};

// 3. switchMap fallback
searchResults$ = this.query$.pipe(
  switchMap(q => q.length < 3 ? of([]) : this.http.get(`/api/search?q=${q}`))
);

// 4. Conditional streams
canActivate(): Observable<boolean> {
  return this.auth.isLoggedIn ? of(true) : of(false);
}
```

### Edge Cases

```typescript
// No arguments — emits nothing, completes immediately (same as EMPTY)
of().subscribe({
  next: () => console.log('never'),
  complete: () => console.log('complete') // fires
});

// Single value — common for wrapping static data
of(null).subscribe(v => console.log(v)); // null

// Objects — emits the reference, not a clone
const obj = { a: 1 };
of(obj).subscribe(v => { v.a = 2; });
console.log(obj.a); // 2 — same reference!
```

---

## 3. from()

### Signature

```typescript
from<T>(input: ObservableInput<T>): Observable<T>
```

### Accepted Inputs (ObservableInput)

`from()` is the Swiss Army knife — it converts many types into Observables:

| Input Type | Behavior | Sync/Async |
|-----------|----------|------------|
| `Array<T>` | Emits each element, completes | Sync |
| `Promise<T>` | Emits resolved value, completes; or errors | Async |
| `Iterable<T>` (Set, Map, string) | Emits each element, completes | Sync |
| `Generator` | Emits each yielded value, completes | Sync |
| `AsyncIterable<T>` | Emits each value, completes | Async |
| `Observable<T>` | Passes through | Depends |
| `ReadableStream<T>` | Emits each chunk, completes | Async |

### Examples

```typescript
import { from } from 'rxjs';

// Array
from([10, 20, 30]).subscribe(v => console.log(v));
// 10 → 20 → 30 → complete (sync)

// Promise
from(fetch('/api/data').then(r => r.json())).subscribe(v => console.log(v));
// { data: ... } → complete (async)

// String (iterable of characters)
from('hello').subscribe(v => console.log(v));
// h → e → l → l → o → complete (sync)

// Set
from(new Set([1, 2, 2, 3])).subscribe(v => console.log(v));
// 1 → 2 → 3 → complete (deduplicated)

// Map
from(new Map([['a', 1], ['b', 2]])).subscribe(v => console.log(v));
// ['a', 1] → ['b', 2] → complete

// Generator
function* fibonacci() {
  let a = 0, b = 1;
  while (true) { yield a; [a, b] = [b, a + b]; }
}
from(fibonacci()).pipe(take(7)).subscribe(v => console.log(v));
// 0 → 1 → 1 → 2 → 3 → 5 → 8

// AsyncIterable (e.g., async generator)
async function* asyncNums() {
  for (let i = 0; i < 3; i++) {
    await delay(100);
    yield i;
  }
}
from(asyncNums()).subscribe(v => console.log(v));
// 0 → 1 → 2 → complete (async, ~100ms apart)
```

### from() vs of()

```typescript
// of — emits the ENTIRE array as a single value
of([1, 2, 3]).subscribe(v => console.log(v));
// [1, 2, 3] → complete (one emission)

// from — emits EACH element individually
from([1, 2, 3]).subscribe(v => console.log(v));
// 1 → 2 → 3 → complete (three emissions)
```

This is one of the most common interview questions and source of bugs.

### Angular Patterns

```typescript
// Convert Promise-based API to Observable
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  getPosition(): Observable<GeolocationPosition> {
    return from(new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    }));
  }
}

// Process array items through an async pipeline
processItems(items: Item[]): Observable<ProcessedItem> {
  return from(items).pipe(
    concatMap(item => this.http.post<ProcessedItem>('/api/process', item))
  );
}

// Convert fetch Response ReadableStream
streamResponse(url: string): Observable<Uint8Array> {
  return from(fetch(url)).pipe(
    switchMap(response => from(response.body!)) // ReadableStream → Observable
  );
}
```

### from(Promise) Gotchas

```typescript
// Gotcha 1: Promise is EAGER — work starts immediately, not on subscribe
const promise = fetch('/api/data'); // Request fires NOW
const obs$ = from(promise); // Just wraps the already-executing promise
// Each subscriber gets the same resolved value

// Fix: Use defer() to make it lazy
const lazy$ = defer(() => from(fetch('/api/data')));
// Request fires on SUBSCRIBE

// Gotcha 2: Promise cannot be cancelled
const sub = from(longRunningPromise).subscribe(v => console.log(v));
sub.unsubscribe(); // Observable unsubscribes, but Promise keeps running!

// Fix: Use AbortController inside new Observable()
```

---

## 4. interval() & timer()

### interval()

```typescript
interval(period: number): Observable<number>
```

Emits incrementing integers (0, 1, 2, ...) at a fixed time interval. The first emission is **after** the first period.

```typescript
import { interval } from 'rxjs';

interval(1000).subscribe(v => console.log(v));
// t=1s: 0, t=2s: 1, t=3s: 2, t=4s: 3 ...
```

**Timeline**:
```
interval(1000):
  ----0----1----2----3----4---->  (never completes)
  ^1s  ^2s  ^3s  ^4s  ^5s
```

| Property | Value |
|----------|-------|
| Synchronous | No (uses `setInterval`) |
| Cold | Yes |
| Completes | Never (must unsubscribe or use `take`/`takeUntil`) |
| First emission | After 1 period |

### timer()

```typescript
// Single emission after delay
timer(delay: number): Observable<0>

// Emission after delay, then periodic
timer(delay: number, period: number): Observable<number>

// Date-based delay
timer(dueDate: Date): Observable<0>
```

**Single-shot timer** — emits `0` after the delay, then completes:
```typescript
timer(3000).subscribe({
  next: v => console.log(v),    // 0 (at t=3s)
  complete: () => console.log('done') // immediately after
});
```

**Periodic timer** — emits `0` after initial delay, then increments at period:
```typescript
timer(2000, 1000).subscribe(v => console.log(v));
// t=2s: 0, t=3s: 1, t=4s: 2, t=5s: 3 ...
```

**Timelines**:
```
timer(3000):           single shot
  ---------0|
           ^3s

timer(2000, 1000):     initial delay + periodic
  ------0----1----2----3---->
        ^2s  ^3s  ^4s  ^5s

timer(0):              emit immediately, then complete
  (0|)
```

### interval() vs timer()

| Feature | `interval(1000)` | `timer(0, 1000)` | `timer(1000)` |
|---------|-----------------|-------------------|---------------|
| First emission | After 1000ms | Immediately (0ms) | After 1000ms |
| Subsequent | Every 1000ms | Every 1000ms | None (completes) |
| Completes | Never | Never | Yes |
| Emits | 0, 1, 2, ... | 0, 1, 2, ... | 0 |

**Tip**: If you need `interval()` but with an immediate first emission, use `timer(0, period)`.

### Angular Patterns

```typescript
// Polling an API every 30 seconds
@Component({ ... })
export class DashboardComponent {
  private http = inject(HttpClient);

  // Start immediately, then every 30s
  stats = toSignal(
    timer(0, 30_000).pipe(
      switchMap(() => this.http.get<Stats>('/api/stats'))
    ),
    { initialValue: null }
  );
}

// Auto-logout countdown
@Injectable({ providedIn: 'root' })
export class SessionService {
  private timeout = 15 * 60; // 15 minutes in seconds

  countdown$ = timer(0, 1000).pipe(
    map(elapsed => this.timeout - elapsed),
    takeWhile(remaining => remaining >= 0),
    finalize(() => this.logout())
  );
}

// Debounce-like delay (one-shot)
timer(300).pipe(
  switchMap(() => this.http.get('/api/search'))
);

// Animation timing
timer(0, 16).pipe( // ~60fps
  map(frame => frame * (1000 / 60)), // elapsed ms
  takeWhile(ms => ms <= 2000) // 2 second animation
);
```

### Memory Leak Warning

```typescript
// LEAK — interval never completes!
ngOnInit() {
  interval(1000).subscribe(v => this.count = v);
}

// FIX — always manage the subscription
private destroyRef = inject(DestroyRef);

ngOnInit() {
  interval(1000).pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(v => this.count.set(v));
}

// BETTER — use toSignal
count = toSignal(interval(1000), { initialValue: 0 });
```

---

## 5. fromEvent()

### Signature

```typescript
fromEvent<T extends Event>(
  target: EventTarget | ArrayLike<EventTarget>,
  eventName: string,
  options?: EventListenerOptions | ((...args: any[]) => T)
): Observable<T>
```

### Behavior

Wraps `addEventListener`/`removeEventListener` into an Observable. Each event emission calls `next()`. The Observable **never completes** (events can keep firing).

```typescript
import { fromEvent } from 'rxjs';

// Basic click listener
const clicks$ = fromEvent(document, 'click');
clicks$.subscribe(event => console.log('Clicked at:', event.clientX, event.clientY));

// Unsubscribe removes the event listener
const sub = clicks$.subscribe(...);
sub.unsubscribe(); // removeEventListener called
```

**Timeline**:
```
fromEvent(button, 'click'):
  ------c-----------c----c---------->  (never completes)
        ^click      ^click ^click
```

### Supported Targets

`fromEvent()` works with any object that has an event-listening pattern:

| Target Type | Method Pattern |
|------------|---------------|
| DOM `EventTarget` | `addEventListener` / `removeEventListener` |
| Node.js `EventEmitter` | `addListener` / `removeListener` |
| jQuery-like | `on` / `off` |
| Any with `addEventListener` | Custom events |

### Options

```typescript
// With capture option
fromEvent(document, 'click', { capture: true, passive: true });

// With result selector (deprecated in favor of pipe + map)
fromEvent(input, 'input').pipe(
  map((e: Event) => (e.target as HTMLInputElement).value)
);
```

### Angular Patterns

```typescript
@Component({
  template: `<input #searchInput>`
})
export class SearchComponent implements AfterViewInit {
  @ViewChild('searchInput') inputRef!: ElementRef<HTMLInputElement>;
  private destroyRef = inject(DestroyRef);

  ngAfterViewInit() {
    fromEvent<InputEvent>(this.inputRef.nativeElement, 'input').pipe(
      map(e => (e.target as HTMLInputElement).value),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.searchService.search(query)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => this.results.set(results));
  }
}

// Window resize with throttle
windowSize = toSignal(
  fromEvent(window, 'resize').pipe(
    throttleTime(200),
    map(() => ({ width: window.innerWidth, height: window.innerHeight })),
    startWith({ width: window.innerWidth, height: window.innerHeight })
  )
);

// Keyboard shortcuts
fromEvent<KeyboardEvent>(document, 'keydown').pipe(
  filter(e => e.ctrlKey && e.key === 's'),
  tap(e => e.preventDefault()),
  takeUntilDestroyed()
).subscribe(() => this.save());

// Scroll tracking with passive listener
fromEvent(document, 'scroll', { passive: true }).pipe(
  throttleTime(100),
  map(() => window.scrollY),
  takeUntilDestroyed()
).subscribe(y => this.scrollPosition.set(y));
```

### Angular 21 Consideration: Prefer HostListener or Template Events

In Angular 21, direct DOM access via `fromEvent` is sometimes discouraged in favor of:

```typescript
// Option 1: Template event binding (Angular handles cleanup)
// <button (click)="handleClick($event)">

// Option 2: host listener
@Component({
  host: { '(window:resize)': 'onResize($event)' }
})

// Option 3: Signal-based with output()
// Use fromEvent only when you need RxJS operators (debounce, throttle, etc.)
```

**Rule**: Use `fromEvent()` when you need **RxJS operators** on the event stream. Use template bindings for simple event handling.

### fromEvent with Non-DOM Targets

```typescript
// Node.js EventEmitter pattern
import { fromEvent } from 'rxjs';

const ws = new WebSocket('wss://api.example.com');
const messages$ = fromEvent<MessageEvent>(ws, 'message').pipe(
  map(e => JSON.parse(e.data))
);
const errors$ = fromEvent(ws, 'error');
const close$ = fromEvent(ws, 'close');

messages$.pipe(
  takeUntil(close$)
).subscribe(data => console.log(data));
```

---

## 6. defer()

### Signature

```typescript
defer<T>(observableFactory: () => ObservableInput<T>): Observable<T>
```

### Behavior

`defer()` does NOT create the Observable at call time. Instead, it calls the factory function **each time a subscriber subscribes**, creating a fresh Observable per subscription.

```typescript
import { defer, of } from 'rxjs';

// Without defer — timestamp captured ONCE at creation
const eager$ = of(Date.now());
eager$.subscribe(v => console.log('A:', v)); // e.g., 1700000000
eager$.subscribe(v => console.log('B:', v)); // same: 1700000000

// With defer — timestamp captured PER subscription
const lazy$ = defer(() => of(Date.now()));
lazy$.subscribe(v => console.log('A:', v)); // e.g., 1700000000
setTimeout(() => {
  lazy$.subscribe(v => console.log('B:', v)); // e.g., 1700001000
}, 1000);
```

### Mental Model

```
of(value):                    defer(() => of(value)):
┌─────────────┐              ┌──────────────────────┐
│ value fixed  │              │ factory called on     │
│ at creation  │              │ EACH subscribe()      │
└──────┬──────┘              └──────────┬───────────┘
       │                                │
  subscribe() → same value         subscribe() → fresh value
  subscribe() → same value         subscribe() → fresh value
```

### Why defer() Is Essential

#### Problem 1: Eager Promise

```typescript
// BUG: fetch() fires immediately, NOT on subscribe
const obs$ = from(fetch('/api/data'));
// The HTTP request already started!

// FIX: defer wraps it lazily
const obs$ = defer(() => fetch('/api/data'));
// No request until subscribe()
```

#### Problem 2: Conditional Logic Evaluated Once

```typescript
// BUG: condition evaluated once at creation
function getData(useCache: boolean): Observable<Data> {
  return useCache ? of(cachedData) : this.http.get<Data>('/api');
  // If useCache changes later, this doesn't re-evaluate
}

// FIX: defer re-evaluates per subscription
function getData(): Observable<Data> {
  return defer(() =>
    this.useCache ? of(this.cachedData) : this.http.get<Data>('/api')
  );
}
```

#### Problem 3: Retry with Fresh State

```typescript
// With defer, retry creates a FRESH Observable each attempt
let attempt = 0;
defer(() => {
  attempt++;
  console.log(`Attempt ${attempt}`);
  return attempt < 3
    ? throwError(() => new Error('fail'))
    : of('success');
}).pipe(
  retry(3)
).subscribe(v => console.log(v));
// Attempt 1 → Attempt 2 → Attempt 3 → success
```

### Angular Patterns

```typescript
// Lazy HTTP request with conditional logic
@Injectable({ providedIn: 'root' })
export class DataService {
  private cache = new Map<string, any>();

  get<T>(url: string): Observable<T> {
    return defer(() => {
      if (this.cache.has(url)) {
        return of(this.cache.get(url) as T);
      }
      return this.http.get<T>(url).pipe(
        tap(data => this.cache.set(url, data))
      );
    });
  }
}

// Feature flag-based routing
canActivate(): Observable<boolean> {
  return defer(() => {
    const flags = inject(FeatureFlagService);
    return flags.isEnabled('new-dashboard') ? of(true) : of(false);
  });
}

// Testing — fresh state per test
function createMockStream() {
  return defer(() => {
    let count = 0;
    return interval(100).pipe(map(() => ++count));
  });
}
```

---

## 7. range() & generate()

### range()

```typescript
range(start: number, count: number): Observable<number>
```

Emits `count` sequential integers starting from `start`, **synchronously**, then completes.

```typescript
import { range } from 'rxjs';

range(1, 5).subscribe(v => console.log(v));
// 1 → 2 → 3 → 4 → 5 → complete (all sync)

range(10, 3).subscribe(v => console.log(v));
// 10 → 11 → 12 → complete
```

**Timeline**:
```
range(1, 5):
  (12345|)   ← synchronous burst
```

**Note**: The second argument is `count`, NOT the end value:
```typescript
range(5, 3);  // Emits 5, 6, 7 (NOT 5, 6, 7, 8 or 3, 4, 5)
```

### Angular Pattern with range()

```typescript
// Generate page numbers for pagination
@Component({ ... })
export class PaginationComponent {
  totalPages = input.required<number>();

  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // Or with RxJS:
  // pages$ = range(1, this.totalPages).pipe(toArray());
}

// Batch processing
range(0, 10).pipe(
  concatMap(page => this.http.get(`/api/items?page=${page}`)),
  reduce((acc, items) => [...acc, ...items], [] as Item[])
).subscribe(allItems => console.log(allItems));
```

### generate()

```typescript
generate<S, T>(
  initialState: S,
  condition: (state: S) => boolean,
  iterate: (state: S) => S,
  resultSelector?: (state: S) => T
): Observable<T>
```

Works like a `for` loop turned into an Observable. Emits values **synchronously** until the condition is false.

```typescript
import { generate } from 'rxjs';

// Equivalent to: for (let i = 0; i < 5; i++) emit(i)
generate(
  0,              // initial state
  x => x < 5,    // condition
  x => x + 1     // iterate
).subscribe(v => console.log(v));
// 0 → 1 → 2 → 3 → 4 → complete

// With result selector (transform)
generate(
  1,              // start
  x => x <= 32,  // condition
  x => x * 2,    // iterate (powers of 2)
  x => `2^${Math.log2(x)} = ${x}` // result selector
).subscribe(v => console.log(v));
// "2^0 = 1" → "2^1 = 2" → "2^2 = 4" → "2^3 = 8" → "2^4 = 16" → "2^5 = 32"

// Object form (RxJS 7 preferred)
generate({
  initialState: 2,
  condition: x => x < 100,
  iterate: x => x * x,
  resultSelector: x => x
}).subscribe(v => console.log(v));
// 2 → 4 → 16 → complete (next would be 256, fails condition)
```

### generate() vs range()

| Feature | `range()` | `generate()` |
|---------|----------|-------------|
| Increment | Always +1 | Custom (any function) |
| State | Integer only | Any type |
| Condition | Count-based | Custom predicate |
| Transform | None (use pipe + map) | Built-in `resultSelector` |
| Complexity | Simple | Flexible |

```typescript
// range — simple sequential numbers
range(1, 5); // 1, 2, 3, 4, 5

// generate — Fibonacci sequence
generate({
  initialState: [0, 1],
  condition: ([a]) => a < 100,
  iterate: ([a, b]) => [b, a + b] as [number, number],
  resultSelector: ([a]) => a
});
// 0 → 1 → 1 → 2 → 3 → 5 → 8 → 13 → 21 → 34 → 55 → 89
```

### Angular Patterns with generate()

```typescript
// Generate retry delays with exponential backoff
const retryDelays$ = generate({
  initialState: 1000,
  condition: delay => delay <= 30_000,
  iterate: delay => delay * 2
});
// 1000 → 2000 → 4000 → 8000 → 16000 → complete

// Generate test data
generate({
  initialState: 1,
  condition: i => i <= 100,
  iterate: i => i + 1,
  resultSelector: i => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`
  })
}).pipe(toArray()).subscribe(users => console.log(users));
```

---

## 8. Other Useful Creators

### throwError()

```typescript
throwError(() => new Error('Something failed')): Observable<never>
```

Creates an Observable that immediately errors without emitting any values:

```typescript
import { throwError } from 'rxjs';

// Used in conditional pipelines
this.http.get('/api/data').pipe(
  switchMap(data =>
    data.valid ? of(data) : throwError(() => new Error('Invalid data'))
  ),
  catchError(err => of({ fallback: true }))
);
```

**Important**: Always pass a **factory function** (not a raw error). This ensures a fresh error object per subscription with an accurate stack trace:
```typescript
// CORRECT — factory
throwError(() => new Error('fail'));

// DEPRECATED — raw error
throwError(new Error('fail')); // Same Error instance reused across subscriptions
```

### EMPTY

```typescript
import { EMPTY } from 'rxjs';

// Completes immediately with no emissions
EMPTY.subscribe({
  next: () => console.log('never'),
  complete: () => console.log('complete') // fires
});
```

Common pattern — skip processing in `switchMap`:
```typescript
source$.pipe(
  switchMap(val => val ? processValue(val) : EMPTY)
);
```

### NEVER

```typescript
import { NEVER } from 'rxjs';

// Never emits, never completes, never errors
NEVER.subscribe(() => console.log('never called'));
```

Used in testing and to keep a stream alive:
```typescript
// Replace a stream with silence during certain conditions
condition ? sourceStream$ : NEVER
```

### forkJoin()

```typescript
forkJoin([obs1$, obs2$, obs3$]): Observable<[T1, T2, T3]>
forkJoin({ a: obs1$, b: obs2$ }): Observable<{ a: T1, b: T2 }>
```

Waits for **all** Observables to **complete**, then emits the **last value** of each:

```typescript
import { forkJoin } from 'rxjs';

// Parallel HTTP requests — wait for all
forkJoin({
  users: this.http.get<User[]>('/api/users'),
  roles: this.http.get<Role[]>('/api/roles'),
  config: this.http.get<Config>('/api/config')
}).subscribe(({ users, roles, config }) => {
  // All three responses available here
});
```

**Gotcha**: If ANY source never completes, `forkJoin` never emits. If ANY source errors, the entire `forkJoin` errors.

### combineLatest()

```typescript
combineLatest([obs1$, obs2$]): Observable<[T1, T2]>
```

Emits whenever ANY source emits (after all have emitted at least once), combining the latest value from each:

```typescript
combineLatest([
  this.route.params,
  this.route.queryParams
]).pipe(
  switchMap(([params, query]) =>
    this.http.get(`/api/items/${params['id']}?sort=${query['sort']}`)
  )
);
```

### merge()

```typescript
merge(obs1$, obs2$, obs3$): Observable<T>
```

Interleaves emissions from all sources into a single stream:

```typescript
// Listen to multiple event sources
merge(
  fromEvent(saveBtn, 'click').pipe(map(() => 'save')),
  fromEvent(document, 'keydown').pipe(
    filter((e: KeyboardEvent) => e.ctrlKey && e.key === 's'),
    map(() => 'save')
  )
).pipe(
  exhaustMap(() => this.http.post('/api/save', this.data))
);
```

### concat()

```typescript
concat(obs1$, obs2$, obs3$): Observable<T>
```

Subscribes to each Observable **sequentially** — waits for the previous to complete before subscribing to the next:

```typescript
// Sequential operations
concat(
  this.http.post('/api/validate', data),
  this.http.post('/api/save', data),
  this.http.post('/api/notify', { saved: true })
).subscribe();
// validate → then save → then notify
```

---

## 9. Angular 21 Patterns with Creation Operators

### Pattern 1: Polling with Automatic Cleanup

```typescript
@Component({ ... })
export class LiveStatsComponent {
  private http = inject(HttpClient);

  stats = toSignal(
    timer(0, 10_000).pipe(
      switchMap(() => this.http.get<Stats>('/api/stats')),
      retry({ delay: 5000 }) // Retry on error after 5s
    ),
    { initialValue: null }
  );
}
```

### Pattern 2: Typeahead Search with Signal Input

```typescript
@Component({
  template: `
    <input [ngModel]="query()" (ngModelChange)="query.set($event)">
    @if (results.isLoading()) { <spinner/> }
    @for (item of results.value() ?? []; track item.id) {
      <result-card [item]="item"/>
    }
  `
})
export class TypeaheadComponent {
  query = signal('');
  private http = inject(HttpClient);

  private debouncedQuery = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.length >= 2)
    ),
    { initialValue: '' }
  );

  results = rxResource({
    request: () => this.debouncedQuery(),
    loader: ({ request: q }) =>
      q ? this.http.get<Item[]>(`/api/search?q=${q}`) : of([])
  });
}
```

### Pattern 3: Parallel Data Loading on Route

```typescript
// Route resolver using forkJoin
export const dashboardResolver: ResolveFn<DashboardData> = (route) => {
  const http = inject(HttpClient);
  return forkJoin({
    user: http.get<User>('/api/me'),
    stats: http.get<Stats>('/api/stats'),
    notifications: http.get<Notification[]>('/api/notifications')
  });
};

// Route config
{
  path: 'dashboard',
  component: DashboardComponent,
  resolve: { data: dashboardResolver }
}
```

### Pattern 4: fromEvent for Intersection Observer

```typescript
@Directive({ selector: '[appLazyLoad]' })
export class LazyLoadDirective {
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    const observer = new IntersectionObserver(entries => {
      // handled via fromEvent-like pattern
    });

    // Custom Observable wrapping IntersectionObserver
    const visible$ = new Observable<boolean>(sub => {
      const io = new IntersectionObserver(
        entries => sub.next(entries[0]?.isIntersecting ?? false),
        { threshold: 0.1 }
      );
      io.observe(this.el.nativeElement);
      return () => io.disconnect();
    });

    visible$.pipe(
      filter(visible => visible),
      take(1), // Only load once
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadContent());
  }
}
```

### Pattern 5: defer() for Environment-Aware Services

```typescript
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private platform = inject(PLATFORM_ID);

  trackPageView(url: string): Observable<void> {
    return defer(() => {
      if (isPlatformBrowser(this.platform)) {
        // Browser — send analytics
        return from(window.analytics.page(url));
      }
      // SSR — skip silently
      return EMPTY;
    });
  }
}
```

---

## 10. Mental Models & Quick-Reference Tables

### Decision Tree: Which Creator Do I Use?

```
What do I have?
│
├─ Static values known at code time?
│  ├─ Single value → of(value)
│  ├─ Multiple values → of(a, b, c)
│  └─ Need each array element separately → from([a, b, c])
│
├─ Promise? → from(promise) or defer(() => from(promise)) for laziness
│
├─ Array / Set / Map / string? → from(iterable)
│
├─ DOM event? → fromEvent(target, eventName)
│
├─ Timer or interval?
│  ├─ Repeated → interval(period) or timer(delay, period)
│  └─ One-shot delay → timer(delay)
│
├─ Sequential integers? → range(start, count)
│
├─ Custom iteration logic? → generate(init, condition, iterate)
│
├─ Conditional / lazy? → defer(() => ...)
│
├─ Multiple Observables?
│  ├─ Wait for all to complete → forkJoin([...])
│  ├─ Latest from each → combineLatest([...])
│  ├─ Merge all into one → merge(...)
│  └─ One after another → concat(...)
│
├─ Nothing (no-op)? → EMPTY
│
├─ Error immediately? → throwError(() => new Error())
│
└─ Custom producer? → new Observable(subscriber => { ... })
```

### Sync vs Async Matrix

| Operator | Synchronous | Asynchronous |
|----------|:-----------:|:------------:|
| `of()` | ✅ | |
| `from(array)` | ✅ | |
| `from(promise)` | | ✅ |
| `from(asyncIterable)` | | ✅ |
| `interval()` | | ✅ |
| `timer()` | | ✅ |
| `fromEvent()` | | ✅ |
| `defer()` | depends | depends |
| `range()` | ✅ | |
| `generate()` | ✅ | |
| `EMPTY` | ✅ | |
| `throwError()` | ✅ | |

### Completion Matrix

| Operator | Completes? | When? |
|----------|-----------|-------|
| `of()` | Yes | After last value |
| `from(array)` | Yes | After last element |
| `from(promise)` | Yes | After resolve |
| `interval()` | **No** | Never (manual cleanup required) |
| `timer(delay)` | Yes | After single emission |
| `timer(delay, period)` | **No** | Never |
| `fromEvent()` | **No** | Never |
| `defer()` | Depends | Depends on inner Observable |
| `range()` | Yes | After last number |
| `generate()` | Yes | When condition fails |
| `EMPTY` | Yes | Immediately |
| `NEVER` | **No** | Never |

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| `of([1,2,3])` emits array as single value | Use `from([1,2,3])` for individual elements |
| `from(promise)` is eager | Wrap in `defer(() => from(promise))` |
| `interval()` without cleanup → memory leak | Use `takeUntilDestroyed()` or `toSignal()` |
| `fromEvent()` without cleanup → memory leak | Use `takeUntilDestroyed()` |
| `throwError(new Error())` deprecated | Use `throwError(() => new Error())` |
| `forkJoin` with never-completing source → hangs | Ensure all sources complete |

---

> **Next →** [RxJS Operators — Transformation](./RXJS_OPERATORS_TRANSFORMATION_THEORY.md)
