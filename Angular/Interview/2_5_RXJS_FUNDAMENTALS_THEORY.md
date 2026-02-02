# RxJS Fundamentals — In-Depth Theory

> **Phase 2 · Section 5** of the Angular Interview Preparation Roadmap
> Target: RxJS 7.x (shipped with Angular 21) · Angular-centric patterns · Beginner to Expert

---

## Table of Contents

1. [What Is RxJS and Why Angular Uses It](#1-what-is-rxjs-and-why-angular-uses-it)
2. [Observable — The Core Primitive](#2-observable--the-core-primitive)
3. [Observer — The Consumer](#3-observer--the-consumer)
4. [Subscription — Lifecycle Management](#4-subscription--lifecycle-management)
5. [Hot vs Cold Observables](#5-hot-vs-cold-observables)
6. [Subject Types](#6-subject-types)
7. [Multicasting and Sharing Strategies](#7-multicasting-and-sharing-strategies)
8. [RxJS in Angular 21 — Integration Points](#8-rxjs-in-angular-21--integration-points)
9. [RxJS vs Signals — When to Use Each](#9-rxjs-vs-signals--when-to-use-each)
10. [Mental Models & Quick-Reference Tables](#10-mental-models--quick-reference-tables)

---

## 1. What Is RxJS and Why Angular Uses It

### Definition

RxJS (**R**eactive E**x**tensions for **J**ava**S**cript) is a library for composing asynchronous and event-based programs using **observable sequences**. It provides a unified API for handling:

- DOM events (click, scroll, keypress)
- HTTP requests and responses
- WebSocket messages
- Timers and intervals
- Any asynchronous data source

### The Reactive Programming Paradigm

```
Imperative (traditional):     Reactive (RxJS):
─────────────────────────     ─────────────────────────
"Pull" data when you need it  "Push" data when it's ready

const data = getData();       getData().subscribe(data => {
process(data);                  process(data);
                              });
```

### Why Angular Chose RxJS

| Reason | Explanation |
|--------|------------|
| **Async composition** | Chain, combine, transform async operations declaratively |
| **Cancellation** | Unsubscribe = cancel HTTP requests, timers, etc. |
| **Error handling** | Built-in retry, catchError, error propagation |
| **Backpressure** | Control how fast data flows (debounce, throttle, buffer) |
| **Testability** | Marble testing for deterministic async tests |
| **HttpClient** | Angular's HTTP layer returns Observables |
| **Router** | Route params, query params, events are Observables |
| **Forms** | `valueChanges`, `statusChanges` are Observables |
| **Event streams** | Natural fit for UI event handling |

### RxJS Version in Angular 21

Angular 21 ships with **RxJS 7.8.x**. Key characteristics:
- Smaller bundle (tree-shakable operators via `import { map } from 'rxjs'`)
- Better TypeScript support
- `firstValueFrom()` and `lastValueFrom()` for Promise interop
- `animationFrames()` creation operator

> **Note**: Angular is gradually reducing RxJS dependency in favor of signals for synchronous state. RxJS remains essential for **async streams, event composition, and complex async workflows**.

---

## 2. Observable — The Core Primitive

### What Is an Observable?

An Observable is a **lazy push collection** of multiple values over time. Think of it as a function that can return multiple values asynchronously.

```typescript
import { Observable } from 'rxjs';

// Creating an Observable from scratch
const numbers$ = new Observable<number>(subscriber => {
  subscriber.next(1);      // Push value 1
  subscriber.next(2);      // Push value 2
  subscriber.next(3);      // Push value 3
  subscriber.complete();   // Signal completion
});

// Nothing happens until subscribe()
numbers$.subscribe(value => console.log(value));
// Output: 1, 2, 3
```

### The Observable Contract

An Observable can push three types of notifications:

| Notification | Method | Occurrences | Meaning |
|-------------|--------|------------|---------|
| **Next** | `subscriber.next(value)` | 0 to ∞ | A new value is available |
| **Error** | `subscriber.error(err)` | 0 or 1 | An error occurred; stream terminates |
| **Complete** | `subscriber.complete()` | 0 or 1 | No more values; stream terminates |

**Rules**:
- After `error()` or `complete()`, no more `next()` values are emitted
- Either `error()` or `complete()` can occur, but not both
- Neither is required — a stream can emit indefinitely (e.g., `interval()`)

### Observable Timeline Notation

```
Cold Observable (HTTP request):
──1──|                         (emits 1 value, completes)

Hot Observable (clicks):
──c──c────c──c───c──>          (emits on each click, never completes)

Interval:
──0──1──2──3──4──5──>          (emits incrementing numbers, never completes)

Error:
──1──2──X                      (emits 2 values, then errors)

Empty:
──|                            (completes immediately, no values)
```

### Lazy Execution

Observables are **lazy** — the producer function runs only when subscribed:

```typescript
const expensive$ = new Observable(subscriber => {
  console.log('Computing...');  // Only runs on subscribe
  const result = heavyComputation();
  subscriber.next(result);
  subscriber.complete();
});

// Nothing happens yet
console.log('Before subscribe');

// NOW the computation runs
expensive$.subscribe(value => console.log(value));
```

This is fundamentally different from Promises, which execute immediately:

```typescript
// Promise: executes immediately
const promise = new Promise(resolve => {
  console.log('Computing...');  // Runs RIGHT NOW
  resolve(42);
});

// Observable: executes on subscribe
const obs$ = new Observable(subscriber => {
  console.log('Computing...');  // Runs only when subscribed
  subscriber.next(42);
});
```

### Tear-down Logic

Observables can return a cleanup function that runs on unsubscribe:

```typescript
const timer$ = new Observable(subscriber => {
  let count = 0;
  const id = setInterval(() => {
    subscriber.next(count++);
  }, 1000);

  // Teardown: runs when subscriber unsubscribes
  return () => {
    clearInterval(id);
    console.log('Timer cleaned up');
  };
});

const sub = timer$.subscribe(v => console.log(v));
// After 5 seconds:
sub.unsubscribe();  // "Timer cleaned up"
```

### Observable vs Promise vs Signal

| Aspect | Observable | Promise | Signal |
|--------|-----------|---------|--------|
| **Values** | 0 to ∞ | Exactly 1 | Always 1 (current) |
| **Execution** | Lazy (on subscribe) | Eager (immediate) | Eager (always has value) |
| **Cancellable** | Yes (unsubscribe) | No (native) | N/A |
| **Async** | Yes | Yes | No (synchronous) |
| **Operators** | 100+ composable | `.then()` chain | `computed()` |
| **Multicasting** | Manual (share, etc.) | Automatic | Automatic |
| **Error handling** | `catchError`, `retry` | `.catch()` | No built-in |
| **Angular use** | HTTP, Router, Forms | Rare | UI state |

---

## 3. Observer — The Consumer

### What Is an Observer?

An Observer is an object that defines how to handle each notification type from an Observable:

```typescript
// Full Observer object
const observer: Observer<number> = {
  next: (value) => console.log('Value:', value),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Complete')
};

source$.subscribe(observer);
```

### Shorthand Syntax

```typescript
// Single callback (next only)
source$.subscribe(value => console.log(value));

// Object with partial callbacks
source$.subscribe({
  next: value => console.log(value),
  error: err => console.error(err)
  // complete is optional
});
```

### Observer Execution Order

```typescript
const source$ = new Observable(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.error(new Error('oops'));
  subscriber.next(3);      // Never delivered (after error)
  subscriber.complete();    // Never delivered (after error)
});

source$.subscribe({
  next: v => console.log('next:', v),      // Prints: 1, 2
  error: e => console.log('error:', e),    // Prints: Error: oops
  complete: () => console.log('complete')  // Never called
});
```

### Partial Observers

You don't need to provide all three callbacks. Unhandled notifications:
- Missing `next`: values are silently ignored
- Missing `error`: error is thrown as unhandled exception
- Missing `complete`: completion is silently ignored

```typescript
// ⚠️ Dangerous: no error handler
source$.subscribe(value => console.log(value));
// If source$ errors → UnhandledError → crashes in dev, swallowed in prod

// ✅ Always handle errors for async sources
source$.subscribe({
  next: value => console.log(value),
  error: err => console.error('Handled:', err)
});
```

---

## 4. Subscription — Lifecycle Management

### What Is a Subscription?

A Subscription represents the execution of an Observable. It's primarily used to **cancel** (unsubscribe from) the execution.

```typescript
const sub: Subscription = interval(1000).subscribe(v => console.log(v));

// Later: stop receiving values and clean up
sub.unsubscribe();
```

### Subscription Properties and Methods

| API | Description |
|-----|------------|
| `sub.unsubscribe()` | Cancels the subscription and runs teardown |
| `sub.closed` | `true` if already unsubscribed |
| `sub.add(otherSub)` | Add a child subscription (auto-unsubscribes together) |
| `sub.remove(otherSub)` | Remove a child subscription |

### Composite Subscriptions

```typescript
const parent = new Subscription();

parent.add(
  interval(1000).subscribe(v => console.log('Timer 1:', v))
);
parent.add(
  interval(2000).subscribe(v => console.log('Timer 2:', v))
);
parent.add(
  fromEvent(document, 'click').subscribe(e => console.log('Click'))
);

// Unsubscribe ALL at once
parent.unsubscribe();
```

### Memory Leaks — The #1 RxJS Pitfall

Forgetting to unsubscribe from long-lived Observables causes memory leaks:

```typescript
// ❌ Memory leak: subscription lives forever
@Component({ ... })
export class LeakyComponent implements OnInit {
  ngOnInit() {
    interval(1000).subscribe(v => {
      this.counter = v;  // This keeps running after component is destroyed
    });
  }
}
```

### Angular Unsubscribe Patterns

#### Pattern 1: takeUntilDestroyed() (Angular 16+, Recommended)

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class SafeComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    interval(1000).pipe(
      takeUntilDestroyed()  // Auto-unsubscribes when component is destroyed
    ).subscribe(v => console.log(v));
  }

  // Can also use outside constructor:
  startTimer() {
    interval(1000).pipe(
      takeUntilDestroyed(this.destroyRef)  // Pass DestroyRef explicitly
    ).subscribe(v => console.log(v));
  }
}
```

#### Pattern 2: toSignal() (Angular 16+)

```typescript
@Component({
  template: `<p>{{ data() | json }}</p>`
})
export class SignalComponent {
  // Auto-subscribes and auto-unsubscribes
  data = toSignal(inject(DataService).getData(), { initialValue: null });
}
```

#### Pattern 3: async Pipe

```typescript
@Component({
  template: `<p>{{ data$ | async | json }}</p>`
})
export class AsyncPipeComponent {
  data$ = inject(DataService).getData();
  // async pipe handles subscribe/unsubscribe
}
```

#### Pattern 4: DestroyRef.onDestroy()

```typescript
@Component({ ... })
export class ManualComponent {
  constructor() {
    const sub = interval(1000).subscribe(v => console.log(v));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
```

### When You DON'T Need to Unsubscribe

| Observable | Auto-completes? | Unsubscribe needed? |
|-----------|----------------|-------------------|
| `HttpClient.get()` | Yes (after response) | No* |
| `route.params` | No (long-lived) | Yes |
| `formControl.valueChanges` | No (long-lived) | Yes |
| `of(1, 2, 3)` | Yes (synchronous) | No |
| `interval(1000)` | No (infinite) | Yes |
| `fromEvent(el, 'click')` | No (infinite) | Yes |
| `Subject.asObservable()` | Depends | Usually yes |

*HttpClient auto-completes, but unsubscribing early **cancels** the in-flight request — useful for search-ahead.

---

## 5. Hot vs Cold Observables

### Cold Observable

A **cold** Observable creates a **new producer** for each subscriber. Each subscriber gets its own independent execution.

```typescript
import { Observable } from 'rxjs';

// Cold: each subscriber gets its own timer
const cold$ = new Observable(subscriber => {
  console.log('New execution started');
  let count = 0;
  const id = setInterval(() => subscriber.next(count++), 1000);
  return () => clearInterval(id);
});

// Subscriber A starts at 0
cold$.subscribe(v => console.log('A:', v));
// "New execution started"

// 2 seconds later, Subscriber B also starts at 0
cold$.subscribe(v => console.log('B:', v));
// "New execution started"

// A: 0, 1, 2, 3, ...
// B: 0, 1, 2, 3, ...  (independent sequence)
```

### Hot Observable

A **hot** Observable shares a **single producer** among all subscribers. Late subscribers miss values emitted before they subscribed.

```typescript
// Hot: mouse clicks happen regardless of subscribers
const hot$ = fromEvent(document, 'click');

// Subscriber A subscribes
hot$.subscribe(e => console.log('A clicked'));

// 5 seconds and 3 clicks later...
// Subscriber B subscribes — missed the 3 clicks
hot$.subscribe(e => console.log('B clicked'));

// Future clicks: both A and B receive them
```

### Visualization

```
COLD Observable (HTTP request):
Subscriber A: ──────[request]──response──|
Subscriber B:            ──────[request]──response──|
(Each gets their own HTTP request)

HOT Observable (WebSocket):
Producer:     ──msg1──msg2──msg3──msg4──msg5──>
Subscriber A: ──msg1──msg2──msg3──msg4──msg5──>  (subscribed from start)
Subscriber B:              ──msg3──msg4──msg5──>  (subscribed late, missed 1,2)
```

### Cold vs Hot Comparison

| Aspect | Cold | Hot |
|--------|------|-----|
| **Producer** | Created per subscriber | Shared, exists independently |
| **Execution** | Starts on subscribe | Already running |
| **Late subscribers** | Get all values from start | Miss past values |
| **Unicast/Multicast** | Unicast (1:1) | Multicast (1:N) |
| **Examples** | `HttpClient.get()`, `of()`, `from()`, `interval()` | `fromEvent()`, `Subject`, `share()` |
| **Analogy** | Watching a recorded video | Watching live TV |

### Cold-to-Hot Conversion

You can make a cold Observable hot by multicasting:

```typescript
import { interval } from 'rxjs';
import { share } from 'rxjs/operators';

// Cold: each subscriber gets independent execution
const cold$ = interval(1000);

// Hot: all subscribers share one execution
const hot$ = cold$.pipe(share());

hot$.subscribe(v => console.log('A:', v));
// 2 seconds later
hot$.subscribe(v => console.log('B:', v));

// A: 0, 1, 2, 3, 4, ...
// B:       2, 3, 4, ...  (missed 0, 1)
```

### Angular Context

| Angular API | Hot or Cold? | Why? |
|------------|-------------|------|
| `HttpClient.get()` | Cold | Each subscribe makes a new HTTP request |
| `ActivatedRoute.params` | Hot | Route params exist independently of subscribers |
| `FormControl.valueChanges` | Hot | Form value changes happen regardless of subscribers |
| `Subject / BehaviorSubject` | Hot | Multicast by nature |
| `fromEvent(el, 'click')` | Hot | DOM events happen regardless |
| `interval(1000)` | Cold | Each subscribe creates its own timer |
| `of(1, 2, 3)` | Cold | Synchronous, replays for each subscriber |

---

## 6. Subject Types

### What Is a Subject?

A Subject is both an **Observable** and an **Observer**. It can:
- Be subscribed to (Observable side)
- Have values pushed into it (Observer side via `next()`, `error()`, `complete()`)

Subjects are always **hot** and **multicast**.

```typescript
import { Subject } from 'rxjs';

const subject = new Subject<number>();

// Subscribe (Observable side)
subject.subscribe(v => console.log('A:', v));
subject.subscribe(v => console.log('B:', v));

// Push values (Observer side)
subject.next(1);  // A: 1, B: 1
subject.next(2);  // A: 2, B: 2
```

### Subject — No Replay

A plain `Subject` does NOT replay past values to late subscribers:

```typescript
const subject = new Subject<number>();

subject.next(1);  // No one listening
subject.next(2);  // No one listening

subject.subscribe(v => console.log(v));

subject.next(3);  // Prints: 3
// 1 and 2 are lost
```

### BehaviorSubject — Always Has a Current Value

`BehaviorSubject` requires an **initial value** and replays the **latest value** to new subscribers:

```typescript
import { BehaviorSubject } from 'rxjs';

const subject = new BehaviorSubject<string>('initial');

// New subscriber immediately receives 'initial'
subject.subscribe(v => console.log('A:', v));  // A: initial

subject.next('hello');   // A: hello

// Late subscriber receives latest value ('hello')
subject.subscribe(v => console.log('B:', v));  // B: hello

subject.next('world');   // A: world, B: world

// Synchronous access to current value
console.log(subject.getValue());  // 'world'
// Or: console.log(subject.value);
```

**Angular use cases**:
- Service state management (current user, theme, auth status)
- Form state sharing between components
- Any "current value" that components need immediately on subscribe

### ReplaySubject — Replays N Past Values

`ReplaySubject` replays a configurable **buffer** of past values to new subscribers:

```typescript
import { ReplaySubject } from 'rxjs';

// Replay last 3 values
const subject = new ReplaySubject<number>(3);

subject.next(1);
subject.next(2);
subject.next(3);
subject.next(4);
subject.next(5);

// Late subscriber gets last 3: 3, 4, 5
subject.subscribe(v => console.log(v));
// Output: 3, 4, 5

// With time window: replay values from last 2 seconds
const timed = new ReplaySubject<number>(Infinity, 2000);
```

**Angular use cases**:
- Chat history (replay last N messages)
- Undo/redo (buffer of past states)
- Audit log (recent events)

### AsyncSubject — Only Emits on Complete

`AsyncSubject` only emits the **last value** and only **when it completes**:

```typescript
import { AsyncSubject } from 'rxjs';

const subject = new AsyncSubject<number>();

subject.subscribe(v => console.log('A:', v));

subject.next(1);  // Nothing yet
subject.next(2);  // Nothing yet
subject.next(3);  // Nothing yet

subject.complete();  // NOW: A: 3

// Late subscriber also gets 3
subject.subscribe(v => console.log('B:', v));  // B: 3
```

**Angular use cases**:
- One-time initialization that multiple consumers need
- API calls that should resolve once and cache
- Configuration loading

### Subject Type Comparison

| Feature | Subject | BehaviorSubject | ReplaySubject | AsyncSubject |
|---------|---------|----------------|---------------|-------------|
| **Initial value** | No | Required | No | No |
| **Late subscriber gets** | Nothing | Latest value | Last N values | Last value (on complete) |
| **Emits before complete** | Yes | Yes | Yes | No |
| **getValue()** | No | Yes | No | No |
| **Buffer size** | 0 | 1 | Configurable | 1 |
| **Best for** | Event bus | Current state | History | Final result |

### Visualization

```
Subject:
  emit: ──1──2──3──4──5──>
  Sub A: ──1──2──3──4──5──>  (subscribed at start)
  Sub B:           ──4──5──>  (subscribed late, missed 1,2,3)

BehaviorSubject(0):
  emit: ──1──2──3──4──5──>
  Sub A: 0─1──2──3──4──5──>  (gets initial 0, then all values)
  Sub B:          3──4──5──>  (gets latest 3, then future values)

ReplaySubject(2):
  emit: ──1──2──3──4──5──>
  Sub A: ──1──2──3──4──5──>  (subscribed at start)
  Sub B:        2,3──4──5──>  (subscribed late, replays 2,3)

AsyncSubject:
  emit: ──1──2──3──|
  Sub A:           3|          (only gets 3 on complete)
  Sub B:           3|          (late sub also gets 3)
```

### Subjects as Services in Angular

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Private: only this service can push values
  private _notifications = new BehaviorSubject<Notification[]>([]);

  // Public: components subscribe to this Observable
  readonly notifications$ = this._notifications.asObservable();

  // Public: signal version for template binding
  readonly notifications = toSignal(this.notifications$, { initialValue: [] });

  add(notification: Notification) {
    const current = this._notifications.getValue();
    this._notifications.next([...current, notification]);
  }

  clear() {
    this._notifications.next([]);
  }
}
```

**Pattern**: Private `BehaviorSubject`, public `asObservable()`. This encapsulates who can push values while exposing a read-only stream.

---

## 7. Multicasting and Sharing Strategies

### The Problem: Duplicate Side Effects

```typescript
// ❌ Each subscriber triggers a separate HTTP request
const users$ = this.http.get<User[]>('/api/users');

users$.subscribe(users => this.grid = users);        // HTTP request #1
users$.subscribe(users => this.count = users.length); // HTTP request #2
```

### share() — Basic Multicasting

```typescript
import { share } from 'rxjs';

const users$ = this.http.get<User[]>('/api/users').pipe(share());

users$.subscribe(users => this.grid = users);        // HTTP request #1
users$.subscribe(users => this.count = users.length); // Shares request #1
```

`share()` is shorthand for `multicast(() => new Subject())` + `refCount()`. It:
- Creates one execution shared among all subscribers
- Starts when the first subscriber subscribes
- Stops when the last subscriber unsubscribes
- **Does NOT replay** to late subscribers

### shareReplay() — Multicasting with Replay

```typescript
import { shareReplay } from 'rxjs';

const config$ = this.http.get('/api/config').pipe(
  shareReplay(1)  // Cache and replay the last emission
);

// First subscriber triggers HTTP
config$.subscribe(c => console.log('A:', c));

// Second subscriber gets cached value (no new HTTP)
config$.subscribe(c => console.log('B:', c));
```

`shareReplay(1)` is the most common caching pattern. It:
- Replays the last `N` values to late subscribers
- By default, keeps the subscription alive even if all subscribers unsubscribe (`refCount: false`)
- Use `shareReplay({ bufferSize: 1, refCount: true })` to auto-unsubscribe when empty

### share() with Configuration (RxJS 7+)

```typescript
import { share, ReplaySubject, timer } from 'rxjs';

const data$ = source$.pipe(
  share({
    connector: () => new ReplaySubject(1),  // Replay last value
    resetOnError: true,                     // Reset on error
    resetOnComplete: false,                 // Keep replay after complete
    resetOnRefCountZero: () => timer(5000)  // Wait 5s before resetting
  })
);
```

### Multicasting Comparison

| Operator | Replay? | Ref counting? | Resubscribe? | Use case |
|----------|---------|--------------|-------------|----------|
| `share()` | No | Yes (auto) | On new subscriber after reset | Event streams |
| `shareReplay(1)` | Yes (last N) | No (stays alive)* | No | API caching |
| `shareReplay({bufferSize:1, refCount:true})` | Yes | Yes (auto) | On new subscriber | Conditional caching |
| `share({connector: () => new ReplaySubject(1)})` | Yes | Yes (auto) | Configurable | Fine-grained control |
| `publish() + refCount()` | No | Yes | Deprecated (use share) | Legacy |

*`shareReplay(1)` without `refCount: true` can cause memory leaks if the source never completes.

### connectable() — Manual Control

```typescript
import { connectable, interval, Subject } from 'rxjs';

const source$ = interval(1000);
const multicast$ = connectable(source$, { connector: () => new Subject() });

// Subscribe but nothing happens yet
multicast$.subscribe(v => console.log('A:', v));
multicast$.subscribe(v => console.log('B:', v));

// Manually start
const connection = multicast$.connect();

// Later: manually stop
connection.unsubscribe();
```

---

## 8. RxJS in Angular 21 — Integration Points

### Where Angular Uses Observables

```typescript
// 1. HttpClient — responses are Observables
this.http.get<User[]>('/api/users')
  .subscribe(users => ...);

// 2. Router — params, queryParams, events
this.route.params
  .subscribe(params => ...);

this.router.events.pipe(
  filter(e => e instanceof NavigationEnd)
).subscribe(event => ...);

// 3. Reactive Forms — valueChanges, statusChanges
this.form.valueChanges
  .subscribe(values => ...);

this.form.get('email')!.statusChanges
  .subscribe(status => ...);

// 4. ViewChildren queries (QueryList.changes)
this.items.changes
  .subscribe(queryList => ...);

// 5. BreakpointObserver (CDK)
inject(BreakpointObserver)
  .observe([Breakpoints.Handset])
  .subscribe(result => ...);
```

### Angular 21: Observable ↔ Signal Interop

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal (for template binding)
const users = toSignal(this.http.get<User[]>('/api/users'), {
  initialValue: []
});

// Signal → Observable (for RxJS operators)
const searchTerm = signal('');
const results$ = toObservable(this.searchTerm).pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.searchService.search(term))
);
const results = toSignal(results$, { initialValue: [] });
```

### rxResource() — Declarative Data Loading

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

@Component({ ... })
export class UserListComponent {
  private http = inject(HttpClient);
  category = signal('all');

  users = rxResource({
    request: () => ({ cat: this.category() }),
    loader: ({ request }) =>
      this.http.get<User[]>(`/api/users?category=${request.cat}`)
  });
  // users.value(), users.isLoading(), users.error() — all signals
}
```

### When Angular Does NOT Use Observables

| Feature | Uses Signals Instead |
|---------|---------------------|
| Component state | `signal()`, `computed()` |
| Component inputs | `input()`, `input.required()` |
| Component outputs | `output()` (not Observable-based) |
| View queries | `viewChild()`, `viewChildren()` — return signals |
| Content queries | `contentChild()`, `contentChildren()` — return signals |
| Template binding | `{{ signal() }}` — reads signal directly |

---

## 9. RxJS vs Signals — When to Use Each

### Decision Framework

```
Is the data async (HTTP, WebSocket, timer)?
  └── Yes → Start with Observable
      ├── Need complex composition (debounce, retry, combine)?
      │   └── Yes → Stay with RxJS, use toSignal() for template
      │   └── No  → Convert to signal via toSignal() or resource()
  └── No → Use signal()
      ├── Is it derived from other signals?
      │   └── Yes → computed()
      │   └── No  → signal()
      └── Does it need to be shared across components?
          └── Yes → Signal in service (or BehaviorSubject → toSignal)
          └── No  → Local signal in component
```

### Side-by-Side Patterns

#### State Management

```typescript
// RxJS pattern
@Injectable({ providedIn: 'root' })
export class CartServiceRxJS {
  private items$ = new BehaviorSubject<CartItem[]>([]);
  readonly items = this.items$.asObservable();
  readonly count$ = this.items$.pipe(map(items => items.length));

  add(item: CartItem) {
    this.items$.next([...this.items$.getValue(), item]);
  }
}

// Signal pattern (Angular 21 preferred)
@Injectable({ providedIn: 'root' })
export class CartServiceSignals {
  readonly items = signal<CartItem[]>([]);
  readonly count = computed(() => this.items().length);

  add(item: CartItem) {
    this.items.update(items => [...items, item]);
  }
}
```

#### Search-Ahead

```typescript
// RxJS is BETTER here — needs debounce, distinctUntilChanged, switchMap
@Component({ ... })
export class SearchComponent {
  searchTerm = signal('');

  results = toSignal(
    toObservable(this.searchTerm).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(term => term.length >= 2),
      switchMap(term => this.searchService.search(term))
    ),
    { initialValue: [] }
  );
}
```

#### WebSocket Stream

```typescript
// RxJS is BETTER — needs retry, share, buffer
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private messages$ = webSocket<Message>('wss://api.example.com').pipe(
    retry({ delay: 3000 }),
    share()
  );

  // Convert to signal for components
  latestMessage = toSignal(this.messages$);
}
```

### Summary Table

| Scenario | Use RxJS | Use Signals |
|----------|---------|-------------|
| Synchronous state | ❌ | ✅ `signal()` |
| Derived state | ❌ | ✅ `computed()` |
| UI event → state | ❌ | ✅ `signal.set()` |
| HTTP request | ✅ | ✅ `resource()` / `toSignal()` |
| Debounced search | ✅ (debounceTime + switchMap) | Bridge via `toObservable()` |
| WebSocket stream | ✅ (retry, share, buffer) | Bridge via `toSignal()` |
| Polling | ✅ (interval + switchMap) | Bridge via `toSignal()` |
| Complex event composition | ✅ (combineLatest, merge, race) | ❌ |
| Retry/backoff | ✅ (retry, retryWhen) | ❌ |
| Cancellation | ✅ (switchMap, takeUntil) | ❌ |
| Template binding | Via `async` pipe | ✅ Direct `{{ signal() }}` |
| Zoneless compatible | Via `toSignal()` | ✅ Native |

---

## 10. Mental Models & Quick-Reference Tables

### Mental Model: Observable as a Water Pipe

```
Source (faucet)                  You turn the handle (subscribe)
    │                               │
    ▼                               ▼
┌──────────┐                   Water starts flowing
│ Operators │  ← filter, map, transform the water as it flows
└──────────┘
    │
    ▼
┌──────────┐
│ Subscriber│  ← receives the processed water
└──────────┘
    │
    ▼
Closing the handle (unsubscribe) = water stops, pipe cleaned up
```

### Mental Model: Subject as a Megaphone

```
Subject = Megaphone in a room

subject.next('hello')  →  Everyone currently in the room hears "hello"
                          (People who left or haven't arrived miss it)

BehaviorSubject = Megaphone + whiteboard
                  New people read the whiteboard (last message)
                  Then hear future announcements

ReplaySubject(3) = Megaphone + tape recorder
                   New people hear the last 3 recorded messages
                   Then hear future announcements

AsyncSubject = Sealed envelope
               Opened only when complete()
               Everyone gets the same final value
```

### Quick-Reference: Choosing a Subject Type

```
Need current state that components read on init?
  └── BehaviorSubject (or signal)

Need event bus with no replay?
  └── Subject

Need to cache/replay recent events?
  └── ReplaySubject(bufferSize)

Need to emit only the final computed result?
  └── AsyncSubject
```

### Quick-Reference: Sharing Strategy

```
Multiple subscribers need same HTTP response?
  └── shareReplay(1)

Multiple subscribers need live event stream?
  └── share()

Need caching with automatic cleanup?
  └── shareReplay({ bufferSize: 1, refCount: true })

Need manual connection control?
  └── connectable()
```

### Quick-Reference: Unsubscribe Patterns (Angular 21)

```
Template binding?
  └── toSignal() or async pipe (auto-managed)

Manual subscribe in component?
  └── takeUntilDestroyed() (recommended)

Service-level subscription?
  └── DestroyRef.onDestroy() or manual unsubscribe

One-time operation (HTTP)?
  └── Usually auto-completes, but switchMap cancels on re-emit
```

---

*Next: Phase 2, Section 6 — RxJS Operators: Creation*
