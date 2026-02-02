# RxJS Fundamentals — Interview Questions & Answers

> **Phase 2 · Section 5** — 90 questions from beginner to expert
> Organized by subtopic · Targeting Angular 21 with RxJS 7.x · FAANG-level depth

---

## Table of Contents

1. [Observable Fundamentals (Q1–Q14)](#1-observable-fundamentals)
2. [Observer & Subscriber (Q15–Q24)](#2-observer--subscriber)
3. [Subscription & Teardown (Q25–Q36)](#3-subscription--teardown)
4. [Hot vs Cold Observables (Q37–Q50)](#4-hot-vs-cold-observables)
5. [Subject Types (Q51–Q64)](#5-subject-types)
6. [Multicasting & Sharing Strategies (Q65–Q74)](#6-multicasting--sharing-strategies)
7. [RxJS in Angular 21 (Q75–Q82)](#7-rxjs-in-angular-21)
8. [RxJS vs Signals (Q83–Q90)](#8-rxjs-vs-signals)

---

## 1. Observable Fundamentals

### Q1. What is an Observable? How does it differ from a Promise? (Beginner)

**Answer**: An Observable is a lazy, push-based collection that can emit zero or more values over time and may or may not complete. Key differences from Promises:

| Feature | Observable | Promise |
|---------|-----------|---------|
| Values | 0 to ∞ | Exactly 1 |
| Laziness | Lazy — nothing happens until `subscribe()` | Eager — executes immediately on creation |
| Cancellation | Supported via `unsubscribe()` | Not natively cancelable |
| Operators | Rich composition with `pipe()` | Limited to `.then()` chaining |
| Multicasting | Configurable (unicast or multicast) | Always multicast (shared result) |
| Error handling | `error` callback + operators like `catchError` | `.catch()` / `try/catch` with `async/await` |

```typescript
// Promise — eager, single value
const promise = new Promise(resolve => {
  console.log('Executing!'); // Runs immediately
  resolve(42);
});

// Observable — lazy, multi-value
const obs$ = new Observable(subscriber => {
  console.log('Executing!'); // Runs only on subscribe
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
});
```

---

### Q2. Explain the Observable contract. What are the valid emission patterns? (Beginner)

**Answer**: The Observable contract defines the rules for emissions:

```
Valid patterns:
  next*(error|complete)?

Meaning:
  - Zero or more `next` notifications
  - Optionally followed by ONE `error` OR ONE `complete`
  - After error or complete, NO more emissions
```

- `next(value)` — delivers a value
- `error(err)` — terminal notification, Observable is done
- `complete()` — terminal notification, Observable is done
- After either terminal notification, the Observable must not call `next`, `error`, or `complete` again
- An Observable that never errors or completes is valid (e.g., `interval()`)

---

### Q3. What does "lazy" mean in the context of Observables? Why is this important? (Beginner)

**Answer**: Lazy means the Observable's producer function (the callback passed to `new Observable(...)`) does not execute until a subscriber calls `.subscribe()`. Each call to `.subscribe()` creates a new, independent execution.

This matters because:
1. **No wasted computation** — if nobody subscribes, no work is done
2. **Each subscriber gets its own execution** — side effects run per subscriber (cold Observable behavior)
3. **Composability** — you can build operator chains without triggering execution, then subscribe when ready

```typescript
const http$ = this.http.get('/api/data');
// No HTTP request fired yet!

http$.subscribe(data => console.log(data));
// NOW the request fires

http$.subscribe(data => console.log(data));
// A SECOND, independent request fires
```

---

### Q4. Walk through what happens internally when you call `subscribe()` on an Observable. (Intermediate)

**Answer**: Step-by-step:

1. A `Subscriber` object is created wrapping the observer callbacks (`next`, `error`, `complete`)
2. The `Subscriber` is wrapped in a `SafeSubscriber` that enforces the Observable contract (no emissions after terminal)
3. The Observable's `_subscribe` method (the producer function) is invoked with the `Subscriber`
4. The producer can call `subscriber.next(value)`, `subscriber.error(err)`, or `subscriber.complete()`
5. The return value from the producer (a `TeardownLogic` — function, `Subscription`, or void) is registered as cleanup
6. When the subscriber unsubscribes or a terminal notification occurs, the teardown logic runs

```typescript
const obs$ = new Observable(subscriber => {
  // Step 3: this runs
  const id = setInterval(() => subscriber.next(Date.now()), 1000);

  // Step 5: teardown registered
  return () => clearInterval(id);
});

const sub = obs$.subscribe(val => console.log(val)); // Steps 1-4
sub.unsubscribe(); // Step 6: clearInterval runs
```

---

### Q5. What is `TeardownLogic`? What forms can it take? (Intermediate)

**Answer**: `TeardownLogic` is the return type of the producer function inside `new Observable(subscriber => { ... })`. It specifies how to clean up resources when the Observable is unsubscribed or completes.

Valid forms:
```typescript
// 1. Function — most common
new Observable(sub => {
  const id = setInterval(() => sub.next(1), 1000);
  return () => clearInterval(id); // teardown function
});

// 2. Subscription object
new Observable(sub => {
  const inner = someOther$.subscribe(val => sub.next(val));
  return inner; // will call inner.unsubscribe()
});

// 3. void / undefined — no cleanup needed
new Observable(sub => {
  sub.next(1);
  sub.complete();
  // no return needed
});
```

Failing to return proper teardown logic when using resources like `setInterval`, `addEventListener`, or WebSockets causes **memory leaks**.

---

### Q6. Create an Observable from scratch that emits 1, 2, 3 and completes. Then create one that errors after emitting 1. (Beginner)

**Answer**:

```typescript
import { Observable } from 'rxjs';

// Emits 1, 2, 3 then completes
const success$ = new Observable<number>(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  subscriber.complete();
});

success$.subscribe({
  next: val => console.log('Value:', val),
  complete: () => console.log('Done!')
});
// Value: 1 → Value: 2 → Value: 3 → Done!

// Emits 1 then errors
const error$ = new Observable<number>(subscriber => {
  subscriber.next(1);
  subscriber.error(new Error('Something broke'));
});

error$.subscribe({
  next: val => console.log('Value:', val),
  error: err => console.log('Error:', err.message)
});
// Value: 1 → Error: Something broke
```

---

### Q7. What happens if an Observable's producer function throws synchronously? (Intermediate)

**Answer**: If the producer throws synchronously, the error is delivered to the subscriber's `error` callback. The subscriber is then unsubscribed and teardown runs.

```typescript
const obs$ = new Observable(subscriber => {
  subscriber.next(1);
  throw new Error('Sync explosion');
  // subscriber.next(2) would never run
});

obs$.subscribe({
  next: v => console.log(v),       // logs 1
  error: e => console.log(e.message) // logs "Sync explosion"
});
```

If the subscriber has no `error` callback, the error is thrown as an unhandled exception. In RxJS 7.x, unhandled Observable errors throw to the global error handler.

---

### Q8. What is the difference between `Observable.create()` and `new Observable()`? (Beginner)

**Answer**: They are functionally identical. `Observable.create()` was a static factory that simply called `new Observable()` internally. **`Observable.create()` was deprecated in RxJS 6 and removed in RxJS 7.** Always use `new Observable()` directly:

```typescript
// Deprecated (removed in RxJS 7):
// const obs$ = Observable.create(subscriber => { ... });

// Current:
const obs$ = new Observable(subscriber => { ... });
```

---

### Q9. Explain how `of()`, `from()`, and `new Observable()` differ. When would you use each? (Intermediate)

**Answer**:

| Creator | Input | Behavior |
|---------|-------|----------|
| `new Observable(fn)` | Producer function | Full control over emission timing, teardown, async behavior |
| `of(a, b, c)` | Inline values | Synchronously emits each argument, then completes |
| `from(iterable)` | Array, Promise, Iterable, Observable-like | Converts the input to an Observable |

```typescript
import { of, from, Observable } from 'rxjs';

of(1, 2, 3);          // sync: 1, 2, 3, complete
from([1, 2, 3]);       // sync: 1, 2, 3, complete (same result, array input)
from(promise);          // async: resolvedValue, complete
from(generator());      // sync: each yielded value, complete

new Observable(sub => {
  // Custom async logic, WebSocket, DOM events, etc.
});
```

**Use `of()`** for known static values. **Use `from()`** to convert existing data structures. **Use `new Observable()`** for custom producer logic.

---

### Q10. What does `EMPTY` do? What about `NEVER`? When are they useful? (Intermediate)

**Answer**:

```typescript
import { EMPTY, NEVER } from 'rxjs';

// EMPTY — immediately completes with no emissions
EMPTY.subscribe({
  next: () => console.log('never called'),
  complete: () => console.log('complete!') // fires immediately
});

// NEVER — never emits, never completes, never errors
NEVER.subscribe({
  next: () => console.log('never called'),
  complete: () => console.log('never called')
});
// Subscription stays open forever (or until unsubscribed)
```

**Use cases:**
- `EMPTY` — default return in `switchMap`/`mergeMap` when you want to skip processing: `switchMap(val => val ? fetchData(val) : EMPTY)`
- `EMPTY` — signaling "nothing to do" in conditional streams
- `NEVER` — keeping a stream alive, testing, placeholder for streams that should never terminate

---

### Q11. What is a `Schedulers` in RxJS? Name the main schedulers. (Advanced)

**Answer**: A Scheduler controls **when** a subscription starts and **when** notifications are delivered. It manages the execution context (synchronous, microtask, macrotask, animation frame).

| Scheduler | Execution | Use Case |
|-----------|-----------|----------|
| `queueScheduler` | Synchronous, breadth-first queue | Recursive synchronous operations |
| `asapScheduler` | Microtask (`Promise.resolve()`) | ASAP but after current synchronous code |
| `asyncScheduler` | Macrotask (`setTimeout`) | Delay-based operations |
| `animationFrameScheduler` | `requestAnimationFrame` | Smooth visual animations |

```typescript
import { of, asyncScheduler } from 'rxjs';
import { observeOn } from 'rxjs/operators';

console.log('before');
of(1, 2, 3).pipe(
  observeOn(asyncScheduler)
).subscribe(v => console.log(v));
console.log('after');

// Output: before → after → 1 → 2 → 3
// Without scheduler: before → 1 → 2 → 3 → after
```

Most Angular developers rarely use schedulers directly because Angular's Zone.js / zoneless scheduler handles timing.

---

### Q12. How does `defer()` work and why is it useful? (Advanced)

**Answer**: `defer()` creates an Observable lazily by calling a factory function on each subscription. The factory runs **per subscriber**, creating a fresh Observable each time.

```typescript
import { defer, of } from 'rxjs';

// Without defer — timestamp captured once at creation
const eager$ = of(Date.now());
// Every subscriber gets the same timestamp

// With defer — timestamp captured per subscription
const lazy$ = defer(() => of(Date.now()));
// Every subscriber gets a fresh timestamp

lazy$.subscribe(t => console.log('Sub1:', t)); // e.g., 1700000000
setTimeout(() => {
  lazy$.subscribe(t => console.log('Sub2:', t)); // e.g., 1700001000
}, 1000);
```

**Key use case in Angular**: Wrapping conditional logic that should re-evaluate per subscription:
```typescript
const data$ = defer(() =>
  this.useCache ? of(this.cachedData) : this.http.get('/api/data')
);
```

---

### Q13. Can you complete an Observable from outside the producer function? (Advanced)

**Answer**: Not directly with a plain Observable. The producer function is the only place that has access to the `Subscriber`. However, you can achieve external control through:

1. **Subjects** — act as both Observable and Observer:
```typescript
const subject = new Subject<number>();
subject.next(1);
subject.complete(); // External control
```

2. **`takeUntil`** — complete based on an external signal:
```typescript
const stop$ = new Subject<void>();
source$.pipe(takeUntil(stop$)).subscribe(...);
stop$.next(); // Completes the stream
```

3. **AbortController pattern** (custom):
```typescript
const obs$ = new Observable(sub => {
  const ctrl = new AbortController();
  fetch('/api', { signal: ctrl.signal }).then(r => { sub.next(r); sub.complete(); });
  return () => ctrl.abort();
});
```

---

### Q14. What is the difference between `finalize()` and the teardown function returned from the producer? (Advanced)

**Answer**: Both run on unsubscription or terminal notifications, but differ in scope:

| Aspect | Producer Teardown | `finalize()` Operator |
|--------|------------------|-----------------------|
| Where defined | Inside `new Observable(sub => { return () => ... })` | Anywhere in the `pipe()` chain |
| Access to | Producer internals (intervals, sockets, etc.) | Nothing from producer |
| When runs | On unsubscribe/error/complete of the raw Observable | On unsubscribe/error/complete at that point in the pipe |
| Use case | Clean up producer resources | Logging, UI state (hide spinner), analytics |

```typescript
const obs$ = new Observable(sub => {
  const ws = new WebSocket('ws://...');
  ws.onmessage = e => sub.next(e.data);
  return () => ws.close(); // Producer teardown — closes socket
}).pipe(
  map(data => JSON.parse(data)),
  finalize(() => console.log('Stream ended')) // Operator teardown — logging
);
```

---

## 2. Observer & Subscriber

### Q15. What is an Observer? What are its three callbacks? (Beginner)

**Answer**: An Observer is an object that defines how to handle the three types of notifications an Observable can deliver:

```typescript
const observer = {
  next: (value) => console.log('Received:', value),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Complete')
};

myObservable$.subscribe(observer);
```

- `next(value)` — called for each emitted value (0 to ∞ times)
- `error(err)` — called when the Observable encounters an error (at most once, terminal)
- `complete()` — called when the Observable finishes successfully (at most once, terminal)

All three callbacks are optional. You can also pass a single function to `subscribe()` which is treated as the `next` handler:

```typescript
myObservable$.subscribe(value => console.log(value));
```

---

### Q16. What is a Subscriber? How does it relate to an Observer? (Intermediate)

**Answer**: A `Subscriber` is the concrete implementation of the `Observer` interface used internally by RxJS. When you call `.subscribe()`, RxJS wraps your observer callbacks in a `Subscriber` (specifically a `SafeSubscriber` in RxJS 7).

The `Subscriber`:
- Extends `Subscription` (so it has `unsubscribe()`)
- Enforces the Observable contract (no emissions after terminal)
- Manages teardown logic
- Wraps unsafe observer callbacks with try/catch

```
Observer (interface)          Subscriber (class)
┌──────────────┐             ┌──────────────────┐
│ next()       │  ─wrapped→  │ next()           │
│ error()      │             │ error()          │
│ complete()   │             │ complete()       │
└──────────────┘             │ unsubscribe()    │
                             │ closed: boolean  │
                             └──────────────────┘
```

---

### Q17. In RxJS 7, what happens if you don't provide an `error` callback and the Observable errors? (Intermediate)

**Answer**: In RxJS 7, if no `error` callback is provided, the error is **thrown as an unhandled exception** which will propagate to the global error handler (`window.onerror` or `process.on('uncaughtException')`).

```typescript
// RxJS 7 — unhandled error throws globally
interval(1000).pipe(
  map(() => { throw new Error('boom'); })
).subscribe({
  next: v => console.log(v)
  // no error handler!
});
// Uncaught Error: boom — thrown globally
```

This is a change from RxJS 6, where unhandled errors were silently swallowed in some cases. **Best practice**: Always provide an error handler for Observables that might error, or use `catchError` in the pipe.

---

### Q18. Can you pass `null` or `undefined` as an observer callback? What about passing nothing? (Intermediate)

**Answer**:

```typescript
// All valid — missing/null/undefined callbacks are ignored
source$.subscribe(null, null, () => console.log('complete'));
// ⚠️ Deprecated in RxJS 7! Positional arguments for error/complete are deprecated

// RxJS 7 preferred — use observer object
source$.subscribe({
  complete: () => console.log('complete')
});

// Also valid — no arguments (fire-and-forget)
source$.subscribe();
```

In RxJS 7, the positional-argument overload `subscribe(nextFn, errorFn, completeFn)` is **deprecated**. Use the observer object form instead:

```typescript
// Deprecated:
obs$.subscribe(
  val => console.log(val),
  err => console.error(err),
  () => console.log('done')
);

// Preferred:
obs$.subscribe({
  next: val => console.log(val),
  error: err => console.error(err),
  complete: () => console.log('done')
});
```

---

### Q19. What is a `PartialObserver`? (Intermediate)

**Answer**: A `PartialObserver` is the TypeScript type for an observer object where all three callbacks are optional:

```typescript
interface Observer<T> {
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

// PartialObserver — all optional
interface PartialObserver<T> {
  next?: (value: T) => void;
  error?: (err: any) => void;
  complete?: () => void;
}
```

The `.subscribe()` method accepts a `PartialObserver<T>`. This is why you can provide only the callbacks you care about:

```typescript
source$.subscribe({ next: v => console.log(v) }); // Just next
source$.subscribe({ error: e => handle(e) });      // Just error
source$.subscribe({ complete: () => cleanup() });   // Just complete
```

---

### Q20. How do you create a custom Observer that logs every notification? (Intermediate)

**Answer**:

```typescript
function createLoggingObserver<T>(label: string): Observer<T> {
  return {
    next: value => console.log(`[${label}] next:`, value),
    error: err => console.error(`[${label}] error:`, err),
    complete: () => console.log(`[${label}] complete`)
  };
}

// Usage
myStream$.subscribe(createLoggingObserver('UserStream'));

// Or as a reusable operator using tap:
function log<T>(label: string) {
  return tap<T>({
    next: v => console.log(`[${label}] next:`, v),
    error: e => console.error(`[${label}] error:`, e),
    complete: () => console.log(`[${label}] complete`),
    subscribe: () => console.log(`[${label}] subscribed`),
    unsubscribe: () => console.log(`[${label}] unsubscribed`),
    finalize: () => console.log(`[${label}] finalized`)
  });
}

// tap in RxJS 7.x supports subscribe/unsubscribe/finalize callbacks
source$.pipe(log('HTTP')).subscribe();
```

---

### Q21. Explain the `tap()` operator's full signature in RxJS 7. (Advanced)

**Answer**: In RxJS 7, `tap()` accepts an extended observer with additional lifecycle callbacks:

```typescript
tap<T>({
  next?: (value: T) => void,
  error?: (err: any) => void,
  complete?: () => void,
  subscribe?: () => void,      // Called when subscribe happens
  unsubscribe?: () => void,    // Called when consumer unsubscribes
  finalize?: () => void         // Called on any teardown (unsubscribe, error, or complete)
})
```

This makes `tap` a powerful debugging and side-effect tool:

```typescript
this.http.get('/api/users').pipe(
  tap({
    subscribe: () => this.loading.set(true),
    next: users => console.log('Fetched', users.length, 'users'),
    error: err => this.errorService.report(err),
    finalize: () => this.loading.set(false)
  })
).subscribe();
```

---

### Q22. What happens if `next` callback throws an error? (Advanced)

**Answer**: If the `next` callback (provided by the subscriber) throws, the error propagates to the `error` callback of the same subscriber. If there's no `error` callback, it becomes an unhandled exception. The subscription is automatically unsubscribed (teardown runs).

```typescript
const obs$ = interval(1000);

obs$.subscribe({
  next: val => {
    if (val === 2) throw new Error('Callback threw!');
    console.log(val);
  },
  error: err => console.log('Caught:', err.message)
});
// 0 → 1 → Caught: Callback threw!
// interval is cleaned up, subscription closed
```

**Important**: The error is NOT re-thrown to the producer. The subscriber is simply terminated. The producer's teardown logic runs normally.

---

### Q23. What is the purpose of `SafeSubscriber` in RxJS internals? (Expert)

**Answer**: `SafeSubscriber` is an internal RxJS class that wraps the user-provided observer to enforce safety guarantees:

1. **Contract enforcement** — prevents `next` after `error` or `complete`
2. **Error routing** — if `next` throws, routes the error to `error` callback
3. **Single terminal** — ensures only one of `error`/`complete` fires
4. **Auto-unsubscribe** — on terminal notification, automatically unsubscribes and runs teardown
5. **Re-entrancy protection** — handles cases where `next` triggers synchronous re-entry

```
subscribe() call chain:
  User observer
    → SafeSubscriber (enforces contract)
      → Subscriber (manages subscription)
        → Connected to producer
```

This is why raw Observables are safe even when user code is messy — the safety layer prevents contract violations.

---

### Q24. Can an Observer be reused across multiple subscriptions? (Intermediate)

**Answer**: Yes, the observer object can be reused. Each `.subscribe()` call creates a new, independent `Subscriber` wrapping the same observer callbacks:

```typescript
const observer = {
  next: (v: number) => console.log(v),
  complete: () => console.log('done')
};

of(1, 2).subscribe(observer);   // 1, 2, done
of(3, 4).subscribe(observer);   // 3, 4, done
from([5]).subscribe(observer);  // 5, done
```

Each subscription is independent — completing one doesn't affect others. The observer is just a bag of callbacks, not stateful.

---

## 3. Subscription & Teardown

### Q25. What is a Subscription? What methods does it have? (Beginner)

**Answer**: A `Subscription` is an object representing an ongoing Observable execution. It has:

```typescript
interface Subscription {
  unsubscribe(): void;     // Cancel the execution, run teardown
  add(teardown): void;     // Add child subscription or teardown logic
  remove(sub): void;       // Remove a child subscription
  readonly closed: boolean; // Whether already unsubscribed
}
```

```typescript
const sub = interval(1000).subscribe(v => console.log(v));
console.log(sub.closed); // false
sub.unsubscribe();
console.log(sub.closed); // true
```

---

### Q26. What happens if you call `unsubscribe()` multiple times? (Beginner)

**Answer**: It's safe — calling `unsubscribe()` on an already-closed subscription is a no-op. The teardown logic runs only once.

```typescript
const sub = interval(1000).subscribe(v => console.log(v));
sub.unsubscribe(); // Teardown runs, closed = true
sub.unsubscribe(); // No-op, no error
sub.unsubscribe(); // Still no-op
```

---

### Q27. How do you combine multiple subscriptions for batch unsubscription? (Beginner)

**Answer**: Use `Subscription.add()` to create a parent-child hierarchy:

```typescript
const parent = new Subscription();

const sub1 = interval(1000).subscribe(v => console.log('A', v));
const sub2 = interval(2000).subscribe(v => console.log('B', v));
const sub3 = interval(3000).subscribe(v => console.log('C', v));

parent.add(sub1);
parent.add(sub2);
parent.add(sub3);

// Later — unsubscribes ALL three
parent.unsubscribe();
```

In Angular, the more idiomatic approach is `takeUntilDestroyed()`:
```typescript
export class MyComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    interval(1000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(v => console.log(v));
  }
}
```

---

### Q28. What is `takeUntilDestroyed()` and how does it work in Angular 21? (Intermediate)

**Answer**: `takeUntilDestroyed()` is an Angular RxJS interop function that automatically completes an Observable when the enclosing context (component, directive, service, pipe) is destroyed.

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class UserListComponent {
  // Option 1: In constructor or field initializer (injection context available)
  users$ = this.http.get<User[]>('/api/users').pipe(
    takeUntilDestroyed() // Uses inject(DestroyRef) internally
  );

  // Option 2: Outside injection context — pass DestroyRef explicitly
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.someService.events$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.handle(event));
  }
}
```

**How it works internally**: It injects `DestroyRef`, registers an `onDestroy` callback that completes an internal Subject, and uses `takeUntil` with that Subject.

**Common mistake**: Calling `takeUntilDestroyed()` without arguments outside an injection context throws `NG0203`.

---

### Q29. Compare all Angular subscription management strategies. (Intermediate)

**Answer**:

| Strategy | Pros | Cons | When to Use |
|----------|------|------|-------------|
| `async` pipe | Auto-subscribe/unsubscribe, works with CD | Template-only, less control | Binding Observable to template |
| `takeUntilDestroyed()` | Clean, one-liner, framework-integrated | Requires injection context | Most imperative subscriptions |
| `DestroyRef.onDestroy()` | Manual but explicit | Verbose | Custom cleanup beyond Observables |
| `Subscription.add()` | Pure RxJS, no Angular dependency | Manual, error-prone | Libraries, non-Angular code |
| `take(n)` / `first()` | Auto-completes after n values | Only for finite cases | HTTP, one-shot operations |
| `toSignal()` | Converts to signal, auto-cleanup | Returns `Signal`, not for side effects | Signal-based components |

**Best practice order**: `async` pipe > `toSignal()` > `takeUntilDestroyed()` > manual

---

### Q30. What memory leaks can occur if subscriptions are not managed? Give a concrete Angular example. (Intermediate)

**Answer**: Unmanaged subscriptions keep the Observable's producer alive, preventing garbage collection of the subscriber, its closure, and everything it references (including the component).

```typescript
// MEMORY LEAK — component never cleaned up
@Component({ template: `<p>{{ data }}</p>` })
export class LeakyComponent implements OnInit {
  data = '';

  ngOnInit() {
    // interval never completes — subscription lives forever
    interval(1000).subscribe(v => {
      this.data = `Count: ${v}`; // Holds reference to component
    });

    // WebSocket stream — never completes
    this.ws.messages$.subscribe(msg => {
      this.data = msg; // Holds reference to component
    });
  }
  // No unsubscribe! Component destroyed but subscriptions live on
}
```

**Symptoms**: Increasing memory usage, duplicate event handlers, stale component callbacks firing after navigation, multiple HTTP requests piling up.

**Fix**:
```typescript
export class FixedComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    interval(1000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(v => this.data = `Count: ${v}`);
  }
}
```

---

### Q31. Does `HttpClient`'s Observable need to be unsubscribed? (Intermediate)

**Answer**: Technically, `HttpClient` Observables complete after the response arrives, so they don't cause **persistent** memory leaks. However, there are still reasons to manage them:

1. **Navigation during pending request** — the request continues, and the callback fires on a destroyed component, potentially causing errors
2. **Rapid repeated requests** — multiple subscriptions to the same endpoint waste bandwidth
3. **`switchMap` or cancellation patterns** — you want to abort in-flight requests

```typescript
// Safe but unnecessary for single one-shot:
this.http.get('/api').subscribe(data => this.data = data);

// Better — prevents callback on destroyed component:
this.http.get('/api').pipe(
  takeUntilDestroyed()
).subscribe(data => this.data = data);

// Best — use async pipe or toSignal, fully declarative:
data = toSignal(this.http.get('/api'), { initialValue: null });
```

**Rule of thumb**: Always manage HTTP subscriptions in components. In services (which are singleton), it's less critical but still good practice.

---

### Q32. Explain `add()` and `remove()` on Subscription. When would you use `remove()`? (Advanced)

**Answer**: `add()` creates a parent-child relationship. When the parent unsubscribes, all children are unsubscribed too. `remove()` detaches a child without unsubscribing it.

```typescript
const parent = new Subscription();
const child = interval(1000).subscribe();

parent.add(child);
// parent.unsubscribe() would also unsubscribe child

parent.remove(child);
// Now parent.unsubscribe() does NOT affect child
// child must be unsubscribed independently
```

**Use case for `remove()`**: Dynamic subscription management where child streams have independent lifecycles:
```typescript
class WebSocketManager {
  private master = new Subscription();

  addChannel(channel$: Observable<any>): Subscription {
    const sub = channel$.subscribe();
    this.master.add(sub);
    return sub;
  }

  removeChannel(sub: Subscription) {
    this.master.remove(sub);
    sub.unsubscribe();
  }

  destroyAll() {
    this.master.unsubscribe();
  }
}
```

---

### Q33. What is the difference between `unsubscribe()`, `complete()`, and `error()` in terms of teardown? (Advanced)

**Answer**: All three trigger teardown, but they differ in semantics:

| Trigger | Who initiates | `next` after? | `error` callback | `complete` callback | Teardown |
|---------|--------------|---------------|-------------------|---------------------|----------|
| `unsubscribe()` | Consumer | No | Not called | Not called | Runs |
| `complete()` | Producer | No | Not called | Called | Runs |
| `error(e)` | Producer | No | Called with `e` | Not called | Runs |

Key distinction: `unsubscribe()` does **not** trigger the `complete` callback. This matters for operators like `finalize()`:

```typescript
source$.pipe(
  finalize(() => console.log('Finalized')) // Runs for ALL three
).subscribe({
  complete: () => console.log('Complete')  // Only on complete()
});

// sub.unsubscribe() → "Finalized" (no "Complete")
// source completes  → "Complete" then "Finalized"
```

---

### Q34. How does `takeUntil` differ from `takeUntilDestroyed` internally? (Advanced)

**Answer**:

`takeUntil(notifier$)`:
- Pure RxJS operator, no Angular dependency
- Completes the source when `notifier$` emits any value
- The source's `complete` callback fires, then teardown runs
- Requires manual Subject creation and `.next()` call

`takeUntilDestroyed(destroyRef?)`:
- Angular-specific, from `@angular/core/rxjs-interop`
- Internally creates a Subject and registers `DestroyRef.onDestroy(() => subject.next())`
- Uses `takeUntil` under the hood with that Subject
- Injection-context aware

```typescript
// takeUntilDestroyed is roughly equivalent to:
function takeUntilDestroyed<T>(destroyRef?: DestroyRef) {
  const ref = destroyRef ?? inject(DestroyRef);
  const destroy$ = new Subject<void>();
  ref.onDestroy(() => {
    destroy$.next();
    destroy$.complete();
  });
  return (source: Observable<T>) => source.pipe(takeUntil(destroy$));
}
```

---

### Q35. What happens to pending async operations inside an Observable after unsubscribe? (Advanced)

**Answer**: The Observable's teardown logic runs, but any already-dispatched async callbacks cannot be "un-scheduled." Teardown should cancel or guard against them:

```typescript
// Problematic — setTimeout callback fires after unsubscribe
new Observable(sub => {
  setTimeout(() => sub.next('too late'), 5000);
  // No teardown — the timeout still fires!
}).subscribe(v => console.log(v));

// Correct — teardown cancels the timeout
new Observable(sub => {
  const id = setTimeout(() => sub.next('value'), 5000);
  return () => clearTimeout(id);
}).subscribe(v => console.log(v));
```

For `fetch`, use `AbortController`:
```typescript
new Observable(sub => {
  const ctrl = new AbortController();
  fetch('/api', { signal: ctrl.signal })
    .then(r => r.json())
    .then(data => { sub.next(data); sub.complete(); })
    .catch(err => { if (!ctrl.signal.aborted) sub.error(err); });
  return () => ctrl.abort();
});
```

---

### Q36. You have a component with 5 different subscriptions. Show the cleanest Angular 21 approach to manage them. (Intermediate)

**Answer**:

**Approach 1 — Declarative (best)**:
```typescript
@Component({
  template: `
    <div>{{ userData() | json }}</div>
    <div>{{ notifications() }}</div>
  `
})
export class DashboardComponent {
  private userService = inject(UserService);
  private notifService = inject(NotificationService);

  // Convert to signals — auto-managed
  userData = toSignal(this.userService.profile$, { initialValue: null });
  notifications = toSignal(this.notifService.count$, { initialValue: 0 });
}
```

**Approach 2 — Imperative with `takeUntilDestroyed`**:
```typescript
@Component({ ... })
export class DashboardComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // All 5 auto-complete on destroy
    this.service.stream1$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
    this.service.stream2$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
    this.service.stream3$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
    this.service.stream4$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
    this.service.stream5$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
  }
}
```

---

## 4. Hot vs Cold Observables

### Q37. Define Hot and Cold Observables with a real-world analogy. (Beginner)

**Answer**:

**Cold Observable** = Netflix movie. Each viewer starts from the beginning. Each subscription creates its own independent execution.

**Hot Observable** = Live TV broadcast. Viewers see whatever is airing now, regardless of when they tuned in. All subscribers share the same execution.

```
Cold Observable:                    Hot Observable:
┌─ Sub1: 1, 2, 3, 4              ┌─ Sub1 joins: ─── 3, 4, 5, 6
│  (independent execution)        │  (shares execution)
└─ Sub2: 1, 2, 3, 4              └─ Sub2 joins: ──────── 5, 6
   (independent execution)           (missed 1-4)
```

---

### Q38. Is `HttpClient.get()` hot or cold? Explain. (Beginner)

**Answer**: **Cold**. Each `.subscribe()` triggers an independent HTTP request. No request is fired until subscription, and two subscribers make two separate requests:

```typescript
const users$ = this.http.get<User[]>('/api/users');

// Two separate HTTP requests to /api/users
users$.subscribe(data => console.log('Request 1', data));
users$.subscribe(data => console.log('Request 2', data));
```

To share a single request among subscribers, convert to hot:
```typescript
const shared$ = this.http.get<User[]>('/api/users').pipe(
  shareReplay(1)
);
// Both share the same HTTP request
shared$.subscribe(data => console.log('Sub 1', data));
shared$.subscribe(data => console.log('Sub 2', data));
```

---

### Q39. Give 3 examples of naturally hot Observables. (Beginner)

**Answer**:

1. **`Subject` / `BehaviorSubject`** — values are pushed externally, all subscribers share
2. **`fromEvent(element, 'click')`** — DOM events happen regardless of subscribers
3. **WebSocket messages** — the server pushes data regardless of who's listening

Other examples: `Router.events`, `ActivatedRoute.params`, `FormControl.valueChanges` (these are backed by Subjects internally).

---

### Q40. Can a cold Observable become hot? Can a hot Observable become cold? (Intermediate)

**Answer**:

**Cold → Hot**: Yes, using multicasting operators:
```typescript
// Cold source
const cold$ = interval(1000);

// Made hot with share()
const hot$ = cold$.pipe(share());

// Both subscribers share the same interval execution
hot$.subscribe(v => console.log('A:', v));
setTimeout(() => hot$.subscribe(v => console.log('B:', v)), 2500);
// A: 0, A: 1, A: 2, A: 2 + B: 2, A: 3 + B: 3 ...
```

**Hot → Cold**: Not directly, but you can "record" hot values and replay them:
```typescript
// Hot subject
const hot$ = new Subject<number>();

// "Cold-ified" with shareReplay — late subscribers get replay
const replayed$ = hot$.pipe(shareReplay(3));
// Not truly cold (doesn't restart), but late subscribers get buffered values
```

True cold conversion requires wrapping in `defer()` with a new producer per subscription.

---

### Q41. What is the difference between `share()` and `shareReplay()` in terms of hot/cold behavior? (Intermediate)

**Answer**:

| Aspect | `share()` | `shareReplay(n)` |
|--------|----------|------------------|
| Multicasting | Yes, via `Subject` | Yes, via `ReplaySubject(n)` |
| Late subscriber replay | No — misses past values | Yes — replays last `n` values |
| Ref counting | Yes — unsubscribes from source when all subscribers leave | Configurable (`refCount: true/false`) |
| Source restart | Re-subscribes to cold source on new subscriber after all left | With `refCount: true`, same; with `false`, keeps buffer forever |

```typescript
// share() — no replay
const s$ = interval(1000).pipe(share());
s$.subscribe(v => console.log('A:', v)); // 0, 1, 2...
setTimeout(() => s$.subscribe(v => console.log('B:', v)), 2500);
// B sees 2, 3, 4... (missed 0, 1)

// shareReplay(1) — replays last value
const sr$ = interval(1000).pipe(shareReplay(1));
sr$.subscribe(v => console.log('A:', v)); // 0, 1, 2...
setTimeout(() => sr$.subscribe(v => console.log('B:', v)), 2500);
// B immediately gets 2 (replay), then 3, 4...
```

---

### Q42. Explain `share()` vs `shareReplay()` with `refCount` behavior. What's the gotcha with `shareReplay({ refCount: false })`? (Advanced)

**Answer**: `refCount` determines what happens when all subscribers unsubscribe:

```typescript
// share() always ref-counts
const s$ = cold$.pipe(share());
// When last subscriber leaves → source unsubscribed → next subscriber restarts source

// shareReplay with refCount: true
const sr$ = cold$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
// When last subscriber leaves → source unsubscribed
// Next subscriber → source restarts, but gets replayed buffer first

// shareReplay with refCount: false (DEFAULT before RxJS 7.1!)
const sr$ = cold$.pipe(shareReplay(1)); // refCount defaults to false in older versions
// When last subscriber leaves → source stays subscribed!
// Buffer persists indefinitely → MEMORY LEAK for long-lived sources
```

**The gotcha**: `shareReplay(1)` without `{ refCount: true }` keeps the source subscription alive even after all subscribers leave. For `HttpClient` this is fine (completes immediately), but for long-lived streams it's a memory leak.

**Best practice**:
```typescript
// Always specify refCount for long-lived streams
source$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

---

### Q43. What is `connectable()` and how does it differ from `share()`? (Advanced)

**Answer**: `connectable()` creates a hot Observable that you manually control when it starts subscribing to the source:

```typescript
import { connectable, interval, Subject } from 'rxjs';

const source$ = interval(1000);
const connected$ = connectable(source$, {
  connector: () => new Subject()
});

// Subscribe observers — NO values yet
connected$.subscribe(v => console.log('A:', v));
connected$.subscribe(v => console.log('B:', v));

// Manually start the source
const connection = connected$.connect();
// Now A and B both receive values

// Later, manually stop
connection.unsubscribe();
```

**Key difference from `share()`**: With `share()`, the source starts on first subscription. With `connectable()`, the source starts only when you call `.connect()`. This gives you control to set up all subscribers before any values flow.

**Note**: `connectable()` replaced the deprecated `publish()` and `multicast()` operators in RxJS 7.

---

### Q44. If `interval(1000)` is cold, how can you prove it by subscribing twice at different times? (Beginner)

**Answer**:

```typescript
const source$ = interval(1000);

// Subscribe at t=0
source$.subscribe(v => console.log('A:', v));

// Subscribe at t=2500
setTimeout(() => {
  source$.subscribe(v => console.log('B:', v));
}, 2500);

// Output:
// t=1000: A: 0
// t=2000: A: 1
// t=2500: (B subscribes — starts its OWN interval)
// t=3000: A: 2
// t=3500: B: 0  ← B starts from 0, independent execution
// t=4000: A: 3
// t=4500: B: 1
```

Each subscription creates its own `setInterval` internally. B doesn't share A's timer.

---

### Q45. What determines whether an Observable is hot or cold? (Intermediate)

**Answer**: The determining factor is **where the producer is created**:

- **Cold**: The producer is created **inside** the Observable's subscribe callback. Each subscriber gets its own producer.
- **Hot**: The producer exists **outside** the Observable. All subscribers tap into the same producer.

```typescript
// COLD — producer (setInterval) created per subscription
const cold$ = new Observable(sub => {
  const id = setInterval(() => sub.next(Date.now()), 1000);
  return () => clearInterval(id);
});

// HOT — producer (WebSocket) exists independently
const ws = new WebSocket('ws://server');
const hot$ = new Observable(sub => {
  const handler = (e: MessageEvent) => sub.next(e.data);
  ws.addEventListener('message', handler);
  return () => ws.removeEventListener('message', handler);
});
```

---

### Q46. What is a "warm" Observable? (Advanced)

**Answer**: A "warm" Observable is informal terminology for an Observable that starts cold but transitions to hot behavior through operators. It has characteristics of both:

```typescript
const warm$ = interval(1000).pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

// First subscriber: cold behavior — creates the interval
warm$.subscribe(v => console.log('A:', v));

// Second subscriber: hot behavior — shares existing interval + gets replay
setTimeout(() => warm$.subscribe(v => console.log('B:', v)), 2500);

// When all unsubscribe: interval stops (refCount)
// Next subscriber: cold again — restarts interval
```

It's "warm" because it's cold on first subscription (activates the source) but hot for subsequent subscribers.

---

### Q47. In Angular, is `ActivatedRoute.params` hot or cold? What about `Router.events`? (Intermediate)

**Answer**: Both are **hot**:

- **`ActivatedRoute.params`**: Backed by a `BehaviorSubject` internally. Emits the current params immediately (replay of 1), then subsequent param changes. All subscribers share the same source.

- **`Router.events`**: Backed by a `Subject`. Emits navigation events as they happen. Late subscribers miss past events. All subscribers share the same source.

```typescript
// params — hot, BehaviorSubject-like (immediate current value)
this.route.params.subscribe(p => console.log(p)); // Immediate current params

// events — hot, Subject-like (no replay)
this.router.events.subscribe(e => console.log(e)); // Only future events
```

**Implications**: You don't need `shareReplay` on these — they're already shared. But you still need subscription management (`takeUntilDestroyed`).

---

### Q48. A team member wraps `HttpClient.get()` in a service method. Multiple components call it. Each gets a separate HTTP request. How do you fix this? (Intermediate)

**Answer**: Use `shareReplay(1)` in the service to cache and share the response:

```typescript
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config$ = this.http.get<Config>('/api/config').pipe(
    shareReplay(1) // refCount: false is OK here — HTTP completes immediately
  );

  getConfig(): Observable<Config> {
    return this.config$;
  }
}

// Component A and B both call getConfig() — only ONE HTTP request
```

For refreshable cache:
```typescript
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private refresh$ = new BehaviorSubject<void>(undefined);

  config$ = this.refresh$.pipe(
    switchMap(() => this.http.get<Config>('/api/config')),
    shareReplay(1)
  );

  refresh() {
    this.refresh$.next();
  }
}
```

---

### Q49. Explain the `publish()` and `multicast()` deprecation in RxJS 7. What replaced them? (Advanced)

**Answer**: In RxJS 7, these multicasting operators were deprecated:
- `publish()` → use `share()` or `connectable()`
- `publishLast()` → use `connectable()` with `AsyncSubject`
- `publishBehavior(init)` → use `connectable()` with `BehaviorSubject`
- `publishReplay(n)` → use `shareReplay(n)` or `connectable()` with `ReplaySubject`
- `multicast(subject)` → use `connectable()` or `share({ connector: () => subject })`
- `refCount()` → use `share()` (always ref-counts)

```typescript
// RxJS 6 (deprecated):
source$.pipe(
  publishReplay(1),
  refCount()
);

// RxJS 7 equivalent:
source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

// Or using connectable():
const hot$ = connectable(source$, {
  connector: () => new ReplaySubject(1)
});
```

The `share()` operator in RxJS 7 gained a configuration object that covers most use cases:
```typescript
share({
  connector: () => new ReplaySubject(1),
  resetOnComplete: true,
  resetOnError: true,
  resetOnRefCountZero: true
})
```

---

### Q50. Design a caching layer using hot/cold Observable concepts for an Angular service. (Expert)

**Answer**:

```typescript
@Injectable({ providedIn: 'root' })
export class CachingDataService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<any>>();

  get<T>(url: string, ttlMs = 30_000): Observable<T> {
    if (!this.cache.has(url)) {
      const shared$ = this.http.get<T>(url).pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
        // When refCount drops to 0, the shared replay resets
        // Next subscriber triggers a fresh request
      );

      this.cache.set(url, shared$);

      // Auto-evict from cache map after TTL
      timer(ttlMs).subscribe(() => this.cache.delete(url));
    }

    return this.cache.get(url)! as Observable<T>;
  }

  invalidate(url: string) {
    this.cache.delete(url);
  }

  invalidateAll() {
    this.cache.clear();
  }
}
```

**How it works**:
1. First call to `get('/api/users')` → creates cold HTTP Observable, wraps with `shareReplay`, stores in Map
2. Concurrent calls → return same shared Observable → single HTTP request
3. After all subscribers leave (`refCount: true`) → shared state resets
4. After TTL → cache entry removed → next call creates fresh Observable
5. `invalidate()` → forces fresh request on next call

---

## 5. Subject Types

### Q51. What is a Subject? How does it differ from a plain Observable? (Beginner)

**Answer**: A `Subject` is both an `Observable` and an `Observer`. It can:
- **Receive** values via `next()`, `error()`, `complete()` (Observer side)
- **Emit** those values to all current subscribers (Observable side)

```
Plain Observable:              Subject:
┌─────────────┐               ┌─────────────┐
│  Producer    │               │ Observer in  │ ← subject.next(val)
│  (internal)  │ → subscriber  │ Observable   │ → subscriber A
│             │               │  out         │ → subscriber B
└─────────────┘               └─────────────┘
```

| Aspect | Observable | Subject |
|--------|-----------|---------|
| Producer | Internal, per-subscriber | External, shared |
| Hot/Cold | Typically cold | Always hot |
| Multicasting | Unicast (default) | Multicast by default |
| `next()` callable | Only inside producer | From anywhere |

```typescript
const subject = new Subject<number>();

subject.subscribe(v => console.log('A:', v));
subject.subscribe(v => console.log('B:', v));

subject.next(1); // A: 1, B: 1
subject.next(2); // A: 2, B: 2
```

---

### Q52. Compare Subject, BehaviorSubject, ReplaySubject, and AsyncSubject with a table. (Beginner)

**Answer**:

| Feature | Subject | BehaviorSubject | ReplaySubject | AsyncSubject |
|---------|---------|-----------------|---------------|--------------|
| Initial value | None | **Required** | None | None |
| Late subscriber gets | Nothing (misses past) | **Last value** immediately | **Last N values** immediately | **Last value only on complete** |
| Current value sync | No | **Yes** — `.getValue()` | No | No |
| Buffer | None | 1 (current) | N (configurable) | 1 (last before complete) |
| Common use case | Event bus | State/current value | Replay history | Final result only |

```typescript
// Subject — no replay
const s = new Subject<number>();
s.next(1);
s.subscribe(v => console.log(v)); // Nothing — missed it
s.next(2); // logs 2

// BehaviorSubject — replays current value
const bs = new BehaviorSubject<number>(0);
bs.next(1);
bs.subscribe(v => console.log(v)); // Immediately logs 1

// ReplaySubject — replays N values
const rs = new ReplaySubject<number>(2);
rs.next(1); rs.next(2); rs.next(3);
rs.subscribe(v => console.log(v)); // Immediately logs 2, 3

// AsyncSubject — only last value on complete
const as = new AsyncSubject<number>();
as.next(1); as.next(2); as.next(3);
as.subscribe(v => console.log(v)); // Nothing yet
as.complete(); // NOW logs 3
```

---

### Q53. When should you use BehaviorSubject vs a Signal in Angular 21? (Intermediate)

**Answer**:

| Use BehaviorSubject when... | Use Signal when... |
|----------------------------|-------------------|
| You need to combine with other Observables in pipes | Simple synchronous state |
| The value is consumed by `async` pipe (legacy templates) | Template binding (preferred in Angular 21) |
| You need operators like `debounceTime`, `distinctUntilChanged` | No complex async transformations |
| Existing RxJS-heavy codebase | New components, signal-first architecture |
| Multi-consumer event stream | Single source of truth for state |

```typescript
// BehaviorSubject — complex async pipeline
private search$ = new BehaviorSubject<string>('');
results$ = this.search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.http.get(`/api/search?q=${query}`))
);

// Signal — simple state
searchQuery = signal('');
results = toSignal(
  toObservable(this.searchQuery).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.http.get(`/api/search?q=${q}`))
  )
);
```

**Trend in Angular 21**: Prefer signals for state. Use BehaviorSubject when deep RxJS pipeline composition is needed.

---

### Q54. What is the danger of using `getValue()` on BehaviorSubject? (Intermediate)

**Answer**: `getValue()` returns the current value synchronously, which breaks the reactive paradigm:

```typescript
const state$ = new BehaviorSubject<User[]>([]);

// ANTI-PATTERN — imperative, synchronous read
function addUser(user: User) {
  const current = state$.getValue(); // Breaks reactivity
  state$.next([...current, user]);
}

// BETTER — use scan() operator
const addUser$ = new Subject<User>();
const state$ = addUser$.pipe(
  scan((acc, user) => [...acc, user], [] as User[])
);
```

**Why it's dangerous**:
1. Encourages imperative patterns in reactive code
2. Creates race conditions — value may change between `getValue()` and `next()`
3. Bypasses the Observable stream — side effects aren't tracked
4. Makes code harder to test and reason about

**When it's acceptable**: Converting Observable state to Signal: `const sig = signal(subject.getValue())` — one-time bridge.

---

### Q55. How does `ReplaySubject` work with a time window? (Intermediate)

**Answer**: `ReplaySubject` can buffer values by count AND time:

```typescript
// Buffer last 3 values, but only from the last 2 seconds
const rs = new ReplaySubject<number>(3, 2000);

rs.next(1); // t=0
rs.next(2); // t=500
rs.next(3); // t=1000
rs.next(4); // t=1500

// Subscribe at t=2500
rs.subscribe(v => console.log(v));
// value 1 was emitted at t=0, which is > 2000ms ago → expired
// Logs: 2, 3, 4 (within time window AND buffer size)
```

**Parameters**: `new ReplaySubject(bufferSize, windowTime)`
- `bufferSize` — max items to keep (default `Infinity`)
- `windowTime` — max age in ms (default `Infinity`)
- Both constraints apply — value must satisfy both to be replayed

**Use case**: Caching recent API responses with expiration:
```typescript
@Injectable({ providedIn: 'root' })
export class PriceService {
  // Replay last price, but only if less than 30s old
  private price$ = new ReplaySubject<number>(1, 30_000);
}
```

---

### Q56. When would you use `AsyncSubject`? Give a concrete Angular example. (Intermediate)

**Answer**: `AsyncSubject` emits only the **last value before `complete()`**. Use it when only the final result matters:

```typescript
// Resolving a config that loads once and never changes
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config$ = new AsyncSubject<AppConfig>();

  constructor() {
    inject(HttpClient).get<AppConfig>('/api/config').subscribe(this.config$);
    // AsyncSubject receives next + complete from HTTP
    // Any future subscriber gets the final config value
  }

  getConfig(): Observable<AppConfig> {
    return this.config$.asObservable();
  }
}

// Component subscribing later:
this.configService.getConfig().subscribe(config => {
  // Gets the config immediately if already loaded
  // Waits if still loading
});
```

**Other use cases**: Long-running computation where you only care about the final result, batch processing status.

---

### Q57. What happens when you call `next()` on a Subject that has already been completed or errored? (Intermediate)

**Answer**: Nothing — the value is silently ignored. A completed or errored Subject is "closed" and will never emit again:

```typescript
const subject = new Subject<number>();
subject.subscribe(v => console.log(v));

subject.next(1);    // logs 1
subject.complete();
subject.next(2);    // silently ignored
subject.next(3);    // silently ignored

// New subscriber after complete:
subject.subscribe(v => console.log('late:', v));
// Immediately receives the complete notification (no values)
```

```typescript
const subject = new Subject<number>();
subject.subscribe({ error: e => console.log('err:', e.message) });

subject.next(1);    // logs 1 (from next handler, not shown above)
subject.error(new Error('fail'));
subject.next(2);    // silently ignored
```

---

### Q58. What is `asObservable()` and why is it important? (Intermediate)

**Answer**: `asObservable()` returns an Observable that hides the Subject's `next()`, `error()`, and `complete()` methods. This enforces encapsulation:

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Private — only this service can push values
  private notifications$ = new BehaviorSubject<string[]>([]);

  // Public — consumers can only subscribe, not push
  readonly notifications = this.notifications$.asObservable();

  addNotification(msg: string) {
    const current = this.notifications$.getValue();
    this.notifications$.next([...current, msg]);
  }
}

// Consumer:
this.notifService.notifications.subscribe(n => console.log(n)); // OK
this.notifService.notifications.next(['hacked']); // Compile error! No next() method
```

**Without `asObservable()`**, any consumer could call `subject.next()` and corrupt state. This is a fundamental encapsulation pattern in Angular services.

---

### Q59. How do you type a Subject correctly in TypeScript? What about `void` Subjects? (Beginner)

**Answer**:

```typescript
// Typed Subject
const numbers$ = new Subject<number>();
const users$ = new BehaviorSubject<User | null>(null);

// Void Subject — for signals/events with no payload
const click$ = new Subject<void>();
click$.next();         // No argument needed
click$.next(undefined); // Also valid

// WRONG:
// click$.next(42); // Type error

// Common Angular pattern:
private destroy$ = new Subject<void>();
ngOnDestroy() {
  this.destroy$.next();    // Signal destruction
  this.destroy$.complete(); // Clean up
}
```

`Subject<void>` is idiomatic for event notifications where you don't need a payload — just "something happened."

---

### Q60. Create a simple state management service using BehaviorSubject. Then show the equivalent with Signals. (Intermediate)

**Answer**:

```typescript
// BehaviorSubject approach
interface AppState {
  users: User[];
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private state$ = new BehaviorSubject<AppState>({
    users: [], loading: false, error: null
  });

  readonly users$ = this.state$.pipe(map(s => s.users), distinctUntilChanged());
  readonly loading$ = this.state$.pipe(map(s => s.loading), distinctUntilChanged());

  loadUsers() {
    this.patchState({ loading: true, error: null });
    this.http.get<User[]>('/api/users').subscribe({
      next: users => this.patchState({ users, loading: false }),
      error: err => this.patchState({ loading: false, error: err.message })
    });
  }

  private patchState(patch: Partial<AppState>) {
    this.state$.next({ ...this.state$.getValue(), ...patch });
  }
}
```

```typescript
// Signal approach (Angular 21)
@Injectable({ providedIn: 'root' })
export class StateService {
  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<User[]>('/api/users').subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: err => { this.loading.set(false); this.error.set(err.message); }
    });
  }
}
```

The Signal approach is simpler — no `distinctUntilChanged` needed (signals are equality-checked by default), no `getValue()`, no `asObservable()` pattern.

---

### Q61. What is the difference between `Subject` and `EventEmitter` in Angular? (Intermediate)

**Answer**: `EventEmitter` extends `Subject` and is Angular's abstraction for component outputs:

```typescript
// EventEmitter — used for @Output()
@Output() clicked = new EventEmitter<string>();
// Internally: extends Subject<string>

// Subject — used for everything else
private refresh$ = new Subject<void>();
```

| Aspect | EventEmitter | Subject |
|--------|-------------|---------|
| Extends | `Subject<T>` | `Observable<T>` + `Observer<T>` |
| Angular-specific | Yes | No (pure RxJS) |
| Use case | Component outputs only | Services, state, events |
| `emit()` method | Yes (alias for `next()`) | No (use `next()`) |
| Sync/Async | Configurable (`new EventEmitter(true)` for async) | Synchronous |

**Important**: Never use `EventEmitter` outside of `@Output()`. Use `Subject` or `output()` (Angular 21's signal-based output):

```typescript
// Angular 21 preferred:
clicked = output<string>(); // No RxJS, signal-based
```

---

### Q62. What happens if you subscribe to a BehaviorSubject inside `ngOnInit` but the service already pushed 5 values? (Intermediate)

**Answer**: You receive only the **most recent** (5th) value immediately, then any future values:

```typescript
// Service
const state$ = new BehaviorSubject<number>(0);
state$.next(1);
state$.next(2);
state$.next(3);
state$.next(4);
state$.next(5);

// Component ngOnInit
state$.subscribe(v => console.log(v));
// Immediately logs: 5 (only the current/last value)
// Then logs any future values pushed via next()
```

If you need the last N values, use `ReplaySubject(N)` instead. If you need all historical values, use `ReplaySubject()` with no limit (but beware memory).

---

### Q63. How would you implement a message bus using Subjects? What are the trade-offs? (Advanced)

**Answer**:

```typescript
interface Message {
  type: string;
  payload: unknown;
}

@Injectable({ providedIn: 'root' })
export class MessageBus {
  private bus$ = new Subject<Message>();

  publish(type: string, payload: unknown) {
    this.bus$.next({ type, payload });
  }

  on<T>(type: string): Observable<T> {
    return this.bus$.pipe(
      filter(msg => msg.type === type),
      map(msg => msg.payload as T)
    );
  }
}

// Publisher
this.bus.publish('user:updated', updatedUser);

// Consumer
this.bus.on<User>('user:updated').pipe(
  takeUntilDestroyed()
).subscribe(user => this.handleUpdate(user));
```

**Trade-offs**:
| Pro | Con |
|-----|-----|
| Decoupled components | Hard to trace data flow |
| Easy to add new message types | No compile-time type safety on type strings |
| Simple implementation | Debugging "who published what" is difficult |
| | Can become a "god service" |

**Angular 21 alternative**: Prefer DI-based services with typed signals/observables over generic message buses.

---

### Q64. You notice a `BehaviorSubject` in a service holds stale data after logout. How do you fix it? (Advanced)

**Answer**: The BehaviorSubject retains its last value unless explicitly reset. Solutions:

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private user$ = new BehaviorSubject<User | null>(null);

  // Option 1: Explicit reset method
  logout() {
    this.user$.next(null); // Reset to initial state
  }

  // Option 2: Complete and recreate (for full cleanup)
  private userSubject = new BehaviorSubject<User | null>(null);

  logout() {
    this.userSubject.complete();
    this.userSubject = new BehaviorSubject<User | null>(null);
    // ⚠️ Problem: existing subscribers are on the OLD subject!
  }
}
```

**Best approach — scoped services**:
```typescript
// Provide at route level — destroyed on navigation
@Component({
  providers: [UserSessionService] // New instance per route
})
export class DashboardComponent { }
```

**Or use signals**:
```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  readonly user = signal<User | null>(null);
  logout() { this.user.set(null); } // Clean, no stale subscription issues
}
```

---

## 6. Multicasting & Sharing Strategies

### Q65. What is multicasting in RxJS? Why does it matter? (Beginner)

**Answer**: Multicasting means sharing a single Observable execution among multiple subscribers instead of creating separate executions for each.

```
Unicast (default):                 Multicast:
source$ ──→ subscriber A           source$ ──┬→ subscriber A
source$ ──→ subscriber B (copy)               └→ subscriber B
(2 executions)                     (1 shared execution)
```

**Why it matters**:
- **HTTP**: Without multicasting, 3 subscribers = 3 HTTP requests
- **WebSocket**: Without multicasting, 3 subscribers = 3 connections
- **Computation**: Without multicasting, expensive calculations run multiple times

```typescript
// Problem: 3 HTTP requests
const users$ = this.http.get('/api/users');
users$.subscribe(sub1);
users$.subscribe(sub2);
users$.subscribe(sub3);

// Solution: 1 HTTP request, shared
const shared$ = this.http.get('/api/users').pipe(shareReplay(1));
shared$.subscribe(sub1);
shared$.subscribe(sub2);
shared$.subscribe(sub3);
```

---

### Q66. Compare all RxJS 7 sharing operators in a single table. (Intermediate)

**Answer**:

| Operator | Internal Subject | Ref Count | Replay | Reset on refCount 0 | Reset on complete | Reset on error |
|----------|-----------------|-----------|--------|---------------------|-------------------|----------------|
| `share()` | `Subject` | Yes | No | Yes | Yes | Yes |
| `shareReplay(n)` | `ReplaySubject(n)` | Configurable | Yes (n) | If refCount:true | No | No |
| `share({ connector })` | Custom | Yes | Custom | Configurable | Configurable | Configurable |
| `connectable()` | Custom | Manual `.connect()` | Custom | N/A | N/A | N/A |

```typescript
// share() — simplest multicast, no replay
obs$.pipe(share())

// shareReplay — multicast with replay buffer
obs$.pipe(shareReplay({ bufferSize: 1, refCount: true }))

// share() with full config — maximum control
obs$.pipe(share({
  connector: () => new ReplaySubject(1),
  resetOnComplete: false,
  resetOnError: false,
  resetOnRefCountZero: true
}))
```

---

### Q67. What does `share({ resetOnRefCountZero: false })` do differently? (Advanced)

**Answer**: When `resetOnRefCountZero` is `false`, the shared execution **persists** even after all subscribers leave:

```typescript
const source$ = interval(1000).pipe(
  tap(v => console.log('source:', v)),
  share({ resetOnRefCountZero: false })
);

const sub1 = source$.subscribe(v => console.log('A:', v));
// source: 0, A: 0 → source: 1, A: 1 → source: 2, A: 2

sub1.unsubscribe();
// refCount drops to 0, but source keeps running!
// source: 3 → source: 4 → source: 5

const sub2 = source$.subscribe(v => console.log('B:', v));
// B: 6, B: 7 ... (picks up where source is, not from 0)
```

With `resetOnRefCountZero: true` (default), the source would stop when sub1 leaves, and sub2 would restart from 0.

**Use case**: WebSocket connections you want to keep alive even if no component is currently consuming data.

---

### Q68. Explain the `share()` operator's full configuration object introduced in RxJS 7. (Advanced)

**Answer**:

```typescript
share<T>({
  connector?: () => SubjectLike<T>,     // Factory for the multicasting Subject
  resetOnComplete?: boolean | (() => Observable<any>),
  resetOnError?: boolean | (() => Observable<any>),
  resetOnRefCountZero?: boolean | (() => Observable<any>)
})
```

**`connector`**: Factory creating the internal Subject. Defaults to `() => new Subject()`. Use `() => new ReplaySubject(1)` for replay.

**`resetOnComplete`**: When source completes, should the internal Subject reset?
- `true`: Next subscriber re-subscribes to source (useful for retrying)
- `false`: Complete is replayed to new subscribers
- Function returning Observable: Resets when Observable emits (delayed reset)

**`resetOnError`**: Same as above, but for errors.

**`resetOnRefCountZero`**: Same, but when all subscribers leave.

```typescript
// Practical: shared HTTP with delayed reset (allows 3s window for re-subscription)
const data$ = this.http.get('/api/data').pipe(
  share({
    connector: () => new ReplaySubject(1),
    resetOnComplete: () => timer(3000),  // Keep cache for 3s after complete
    resetOnRefCountZero: () => timer(3000) // Keep alive for 3s after last unsub
  })
);
```

---

### Q69. How does `shareReplay` handle errors? What is the gotcha? (Advanced)

**Answer**: When the source errors, `shareReplay` **replays the error** to all current and future subscribers:

```typescript
let attempt = 0;
const source$ = defer(() => {
  attempt++;
  if (attempt === 1) return throwError(() => new Error('fail'));
  return of('success');
}).pipe(shareReplay(1));

source$.subscribe({ error: e => console.log('A:', e.message) });
// A: fail

// Later subscriber also gets the error:
source$.subscribe({ error: e => console.log('B:', e.message) });
// B: fail (replayed error, source NOT retried)
```

**The gotcha**: Once errored, `shareReplay` is "stuck" — it keeps replaying the error. The source is never retried.

**Fix**: Use `share()` with reset configuration:
```typescript
const source$ = defer(() => this.http.get('/api/data')).pipe(
  share({
    connector: () => new ReplaySubject(1),
    resetOnError: true // Reset on error, allowing retry
  })
);
```

---

### Q70. What's the difference between these three multicasting approaches? (Advanced)

```typescript
// Approach A
source$.pipe(share());

// Approach B
source$.pipe(shareReplay({ bufferSize: 1, refCount: true }));

// Approach C
source$.pipe(share({
  connector: () => new ReplaySubject(1),
  resetOnRefCountZero: true
}));
```

**Answer**: Approaches B and C are nearly equivalent, but have subtle differences:

| Aspect | A: `share()` | B: `shareReplay({1, refCount})` | C: `share({ReplaySubject})` |
|--------|-------------|--------------------------------|----------------------------|
| Replay to late subscriber | No | Yes (1 value) | Yes (1 value) |
| Reset on refCount 0 | Yes | Yes | Yes |
| Reset on complete | Yes | **No** | **Yes** (default) |
| Reset on error | Yes | **No** | **Yes** (default) |

**Key difference between B and C**: After the source completes, B replays the completion to new subscribers forever. C resets and re-subscribes to source on new subscriber.

```typescript
// B: shareReplay — after complete, new subscribers get cached value + complete
// C: share(ReplaySubject) — after complete, new subscribers restart source
```

Choose B for one-shot data (HTTP). Choose C for repeatable sources.

---

### Q71. When would you use `connectable()` instead of `share()`? (Advanced)

**Answer**: Use `connectable()` when you need to set up all subscribers **before** the source starts emitting. With `share()`, the first subscriber triggers the source immediately.

```typescript
// Problem with share(): first subscriber triggers source before B subscribes
const source$ = of(1, 2, 3).pipe(share());
source$.subscribe(v => console.log('A:', v)); // A gets 1, 2, 3
source$.subscribe(v => console.log('B:', v)); // B gets NOTHING (source already completed)

// Solution with connectable():
const connected$ = connectable(of(1, 2, 3));
connected$.subscribe(v => console.log('A:', v));
connected$.subscribe(v => console.log('B:', v));
connected$.connect(); // NOW both A and B get 1, 2, 3
```

**Use cases**:
- Synchronous sources where you must set up all subscribers first
- Test harnesses where you control emission timing
- Complex stream orchestration with precise initialization order

---

### Q72. How do multicasting operators interact with Angular's `async` pipe? (Intermediate)

**Answer**: The `async` pipe subscribes on component init and unsubscribes on destroy. Without multicasting, multiple `async` pipes on the same Observable create multiple executions:

```typescript
// Template — TWO subscriptions = TWO HTTP requests!
// <div>{{ users$ | async | json }}</div>
// <span>Count: {{ users$ | async | length }}</span>

@Component({ ... })
export class UsersComponent {
  // BAD — each async pipe triggers separate HTTP request
  users$ = this.http.get<User[]>('/api/users');

  // GOOD — shared single request
  users$ = this.http.get<User[]>('/api/users').pipe(shareReplay(1));
}
```

**Or avoid the problem entirely with signals**:
```typescript
users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
// Template: {{ users() | json }} and {{ users().length }} — single computation
```

---

### Q73. Describe a race condition that can occur with `share()` and how to prevent it. (Expert)

**Answer**: Race condition occurs when the source completes synchronously before the second subscriber:

```typescript
const source$ = of(1, 2, 3).pipe(share());

source$.subscribe(v => console.log('A:', v));
// Source emits 1, 2, 3, complete — all synchronous!
// share() resets because source completed

source$.subscribe(v => console.log('B:', v));
// B triggers a NEW subscription to source (share reset)
// B: 1, B: 2, B: 3 — B gets its own copy!
```

This isn't a "race condition" in the traditional sense, but it can cause unexpected behavior — B was supposed to share with A, but got an independent execution.

**Prevention**: Use `shareReplay(1)` or `share({ resetOnComplete: false })` to prevent reset after completion:

```typescript
const source$ = of(1, 2, 3).pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
source$.subscribe(v => console.log('A:', v)); // 1, 2, 3
source$.subscribe(v => console.log('B:', v)); // 3 (replay of last value, then complete)
```

---

### Q74. Design a real-time data sharing strategy for a dashboard with 5 widgets consuming the same WebSocket stream. (Expert)

**Answer**:

```typescript
@Injectable({ providedIn: 'root' })
export class DashboardStreamService {
  private ws$ = webSocket<DashboardEvent>('wss://api/dashboard');

  // Shared stream with replay, persistent connection, error recovery
  readonly events$ = this.ws$.pipe(
    share({
      connector: () => new ReplaySubject<DashboardEvent>(1),
      resetOnError: () => timer(3000),        // Reconnect after 3s on error
      resetOnComplete: () => timer(1000),      // Reconnect after 1s on close
      resetOnRefCountZero: () => timer(5000)   // Keep alive 5s after last widget
    }),
    retry({
      delay: (error, retryCount) => timer(Math.min(1000 * 2 ** retryCount, 30000))
    })
  );

  // Typed per-widget streams
  priceUpdates$ = this.events$.pipe(
    filter((e): e is PriceEvent => e.type === 'price')
  );

  orderUpdates$ = this.events$.pipe(
    filter((e): e is OrderEvent => e.type === 'order')
  );

  alertUpdates$ = this.events$.pipe(
    filter((e): e is AlertEvent => e.type === 'alert')
  );
}
```

**Architecture**:
```
WebSocket ──→ share(ReplaySubject) ──┬→ PriceWidget   (filter: price)
                                      ├→ OrderWidget   (filter: order)
                                      ├→ AlertWidget   (filter: alert)
                                      ├→ ChartWidget   (filter: price)
                                      └→ SummaryWidget  (all events)
```

One WebSocket connection, 5 consumers. The `share()` config ensures: connection stays alive briefly after navigation, auto-reconnects on errors with exponential backoff, new widgets get the last event immediately.

---

## 7. RxJS in Angular 21

### Q75. List all places Angular uses Observables internally. (Beginner)

**Answer**:

| Angular API | Returns Observable of... |
|-------------|------------------------|
| `HttpClient.get/post/put/delete` | Response body |
| `Router.events` | `Event` (NavigationStart, etc.) |
| `ActivatedRoute.params` | Route params object |
| `ActivatedRoute.queryParams` | Query params object |
| `ActivatedRoute.data` | Route data |
| `ActivatedRoute.paramMap` | `ParamMap` |
| `ActivatedRoute.fragment` | URL fragment string |
| `FormControl.valueChanges` | Form value |
| `FormControl.statusChanges` | Form status string |
| `ViewportScroller` events | Scroll positions |
| `BreakpointObserver.observe()` | Media query matches |
| `SwUpdate.versionUpdates` | Service worker updates |

Angular 21 also provides interop bridges: `toSignal()`, `toObservable()`, `rxResource()`.

---

### Q76. How does `toSignal()` work? What are its options? (Intermediate)

**Answer**: `toSignal()` converts an Observable to a read-only Signal that Angular change detection can track:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

@Component({ ... })
export class UserComponent {
  private http = inject(HttpClient);

  // Basic — requires initialValue for sync access before Observable emits
  users = toSignal(this.http.get<User[]>('/api/users'), {
    initialValue: []
  });

  // Without initialValue — signal type includes undefined
  users = toSignal(this.http.get<User[]>('/api/users'));
  // Type: Signal<User[] | undefined>
}
```

**Options**:
```typescript
toSignal(obs$, {
  initialValue?: T,          // Value before first emission
  requireSync?: boolean,     // Asserts Observable emits synchronously (e.g., BehaviorSubject)
  manualCleanup?: boolean,   // Don't auto-unsubscribe on destroy
  injector?: Injector,       // Custom injection context
  equal?: (a, b) => boolean  // Custom equality function
});
```

**`requireSync: true`**: Removes `undefined` from the type but throws if Observable doesn't emit synchronously:
```typescript
const count = toSignal(new BehaviorSubject(0), { requireSync: true });
// Type: Signal<number> (not Signal<number | undefined>)
```

---

### Q77. How does `toObservable()` work? When would you use it? (Intermediate)

**Answer**: `toObservable()` converts a Signal to an Observable, enabling RxJS operator pipelines:

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

@Component({ ... })
export class SearchComponent {
  query = signal('');

  results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.http.get(`/api/search?q=${q}`))
    ),
    { initialValue: [] }
  );
}
```

**How it works internally**: Uses an `effect()` that watches the signal and pushes values to an internal `Subject`. Because `effect()` runs in a microtask, emissions are **asynchronous** (not synchronous like signal reads).

**When to use**: When you need RxJS operators that have no signal equivalent — `debounceTime`, `switchMap`, `retry`, `bufferTime`, etc.

---

### Q78. What is `rxResource()` and how does it relate to `toSignal()`? (Intermediate)

**Answer**: `rxResource()` is Angular 21's declarative data-loading primitive that uses Observables internally but exposes signals:

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

@Component({ ... })
export class UserDetailComponent {
  userId = input.required<number>();

  userResource = rxResource({
    request: () => this.userId(),  // Signal-based request
    loader: ({ request: id }) => this.http.get<User>(`/api/users/${id}`)
  });

  // Exposes signals:
  // this.userResource.value()     — Signal<User | undefined>
  // this.userResource.status()    — Signal<ResourceStatus>
  // this.userResource.isLoading() — Signal<boolean>
  // this.userResource.error()     — Signal<unknown>
}
```

**vs `toSignal()`**:

| Feature | `toSignal()` | `rxResource()` |
|---------|-------------|----------------|
| Auto-reload on dependency change | No (manual) | Yes (reactive request) |
| Loading/error states | No | Built-in signals |
| Cancellation | No | Auto-cancels previous request |
| Local mutation | No | `.update()`, `.set()` |
| SSR support | Basic | PendingTasks integration |

---

### Q79. How do you test an Observable-based service in Angular 21? (Intermediate)

**Answer**:

```typescript
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // Ensure no outstanding requests

  it('should fetch users', () => {
    const mockUsers: User[] = [{ id: 1, name: 'Alice' }];

    service.getUsers().subscribe(users => {
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should handle errors', () => {
    service.getUsers().subscribe({
      error: err => expect(err.status).toBe(500)
    });

    httpMock.expectOne('/api/users').flush('Error', {
      status: 500, statusText: 'Server Error'
    });
  });
});
```

For testing Subject-based services, use `fakeAsync` or marble testing:
```typescript
it('should emit state changes', fakeAsync(() => {
  const values: string[] = [];
  service.state$.subscribe(v => values.push(v));

  service.setState('a');
  service.setState('b');
  tick();

  expect(values).toEqual(['initial', 'a', 'b']);
}));
```

---

### Q80. Explain marble testing syntax. How do you use it? (Advanced)

**Answer**: Marble testing uses ASCII diagrams to represent Observable timelines:

```
Syntax:
  -     = 1 frame of time (virtual)
  a-z   = emission of value
  |     = complete
  #     = error
  ^     = subscription point
  !     = unsubscription point
  ()    = synchronous grouping
  space = ignored (formatting)

Examples:
  '--a--b--c--|'     → emit a at 2, b at 5, c at 8, complete at 11
  '--a--b--#'        → emit a at 2, b at 5, error at 8
  '--(abc)--|'       → emit a, b, c synchronously at 2, complete at 9
  'a'                → emit a then complete (short notation)
```

```typescript
import { TestScheduler } from 'rxjs/testing';

describe('Marble tests', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('should double values', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c--|', { a: 1, b: 2, c: 3 });
      const result$ = source$.pipe(map(x => x * 2));
      expectObservable(result$).toBe('--a--b--c--|', { a: 2, b: 4, c: 6 });
    });
  });

  it('should handle debounceTime', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('-a--bc---d---|');
      const result$ = source$.pipe(debounceTime(2));
      expectObservable(result$).toBe('---a-----c---(d|)');
    });
  });
});
```

---

### Q81. How would you migrate a BehaviorSubject-based service to Signals while maintaining backward compatibility? (Advanced)

**Answer**:

```typescript
// Phase 1: Add signals alongside BehaviorSubject
@Injectable({ providedIn: 'root' })
export class UserService {
  // Existing (keep for consumers using Observables)
  private _users$ = new BehaviorSubject<User[]>([]);
  readonly users$ = this._users$.asObservable();

  // New: Signal mirror
  readonly users = toSignal(this._users$, { requireSync: true });

  setUsers(users: User[]) {
    this._users$.next(users);
    // Signal auto-updates via toSignal
  }
}

// Phase 2: Signal-first, Observable bridge
@Injectable({ providedIn: 'root' })
export class UserService {
  // Primary: Signal
  readonly users = signal<User[]>([]);

  // Bridge: Observable for legacy consumers
  readonly users$ = toObservable(this.users);

  setUsers(users: User[]) {
    this.users.set(users);
  }
}

// Phase 3: Signal-only (remove Observable bridge)
@Injectable({ providedIn: 'root' })
export class UserService {
  readonly users = signal<User[]>([]);
  setUsers(users: User[]) { this.users.set(users); }
}
```

**Key rule**: In Phase 1, the BehaviorSubject is the source of truth. In Phase 2, the Signal is the source of truth with Observable as a derived view. In Phase 3, remove the Observable entirely.

---

### Q82. What are the gotchas of using `toSignal()` and `toObservable()` together? (Expert)

**Answer**:

**Gotcha 1 — Async gap**: `toObservable()` emits asynchronously (via microtask), so there's a 1-tick delay:
```typescript
const sig = signal(1);
const obs$ = toObservable(sig);
obs$.subscribe(v => console.log(v));
sig.set(2);
// Logs: 1, then 2 on next microtask (not synchronous)
```

**Gotcha 2 — Circular dependency**: Don't create signal→observable→signal loops:
```typescript
// INFINITE LOOP!
const sig = signal(0);
const obs$ = toObservable(sig).pipe(map(v => v + 1));
const derived = toSignal(obs$, { initialValue: 0 });
// If derived feeds back into sig, infinite loop
```

**Gotcha 3 — Injection context**: Both require injection context (or explicit injector):
```typescript
// ERROR outside injection context:
ngOnInit() {
  const sig = toSignal(this.obs$); // NG0203!
}

// FIX:
private injector = inject(Injector);
ngOnInit() {
  const sig = toSignal(this.obs$, { injector: this.injector });
}
```

**Gotcha 4 — Memory**: `toSignal()` subscribes immediately and holds the subscription until destroy. If the Observable is expensive and you only need it conditionally, prefer `async` pipe or manual subscription.

---

## 8. RxJS vs Signals

### Q83. When should you use RxJS over Signals in Angular 21? Give 5 scenarios. (Beginner)

**Answer**:

1. **Debouncing/throttling** — `debounceTime`, `throttleTime` have no signal equivalent
   ```typescript
   toObservable(searchQuery).pipe(debounceTime(300), switchMap(...))
   ```

2. **Race conditions / cancellation** — `switchMap`, `exhaustMap` handle this naturally
   ```typescript
   clicks$.pipe(exhaustMap(() => this.http.post(...)))
   ```

3. **Combining async streams with timing** — `combineLatest`, `merge`, `race`, `forkJoin`
   ```typescript
   forkJoin([this.http.get('/a'), this.http.get('/b')])
   ```

4. **Event streams** — DOM events, WebSockets, SSE are inherently Observable
   ```typescript
   fromEvent(el, 'scroll').pipe(throttleTime(100))
   ```

5. **Complex error handling** — `retry`, `retryWhen`, `catchError` with recovery strategies
   ```typescript
   this.http.get('/api').pipe(retry({ count: 3, delay: 1000 }))
   ```

---

### Q84. When should you use Signals over RxJS? Give 5 scenarios. (Beginner)

**Answer**:

1. **Synchronous state** — simple values that change over time
   ```typescript
   count = signal(0);
   increment() { this.count.update(c => c + 1); }
   ```

2. **Derived/computed values** — `computed()` is simpler than `combineLatest` + `map`
   ```typescript
   fullName = computed(() => `${this.first()} ${this.last()}`);
   ```

3. **Component inputs** — `input()` is signal-based in Angular 21
   ```typescript
   name = input.required<string>();
   ```

4. **Template bindings** — no `| async` needed, no subscription management
   ```typescript
   // Template: {{ count() }} vs {{ count$ | async }}
   ```

5. **Two-way binding** — `model()` provides signal-based two-way binding
   ```typescript
   value = model<string>('');
   ```

---

### Q85. A colleague says "Signals will replace RxJS in Angular." Is this accurate? (Intermediate)

**Answer**: No, this is a common misconception. The Angular team has explicitly stated that **Signals and RxJS are complementary, not competing**.

**Signals handle**: Synchronous state, derived values, template bindings, change detection optimization.

**RxJS handles**: Asynchronous event coordination, complex timing (debounce, throttle, buffer), cancellation patterns (switchMap), error recovery, event streams.

**The Angular 21 model**:
```
┌─────────────────────────────────────────┐
│              Angular App                 │
│                                          │
│  Signals: State layer                    │
│    signal(), computed(), effect()        │
│    input(), output(), model()            │
│                                          │
│  RxJS: Async coordination layer          │
│    HTTP, WebSocket, events, timing       │
│                                          │
│  Bridges: toSignal(), toObservable()     │
│           rxResource()                   │
└─────────────────────────────────────────┘
```

The trend is that simple state management moves to Signals, while RxJS remains essential for async coordination. `HttpClient` still returns Observables and will continue to do so.

---

### Q86. Convert this RxJS-only component to a hybrid Signal+RxJS component. (Intermediate)

```typescript
// Original RxJS-only:
@Component({
  template: `
    <input (input)="search($event)">
    <div *ngIf="loading$ | async">Loading...</div>
    <ul>
      <li *ngFor="let user of users$ | async">{{ user.name }}</li>
    </ul>
  `
})
export class SearchComponent implements OnInit, OnDestroy {
  private search$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  loading$ = new BehaviorSubject<boolean>(false);

  users$ = this.search$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    tap(() => this.loading$.next(true)),
    switchMap(q => this.http.get<User[]>(`/api/users?q=${q}`)),
    tap(() => this.loading$.next(false)),
    takeUntil(this.destroy$)
  );

  search(e: Event) { this.search$.next((e.target as HTMLInputElement).value); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
```

**Answer**:

```typescript
@Component({
  template: `
    <input (input)="query.set($any($event.target).value)">
    @if (users.isLoading()) { <div>Loading...</div> }
    <ul>
      @for (user of users.value() ?? []; track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
  `
})
export class SearchComponent {
  query = signal('');

  // RxJS for debounce + switchMap, Signal for state
  private debouncedQuery = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  users = rxResource({
    request: () => this.debouncedQuery(),
    loader: ({ request: q }) => this.http.get<User[]>(`/api/users?q=${q}`)
  });

  private http = inject(HttpClient);
}
```

**Improvements**: No manual subscription management, no `destroy$`, no `loading$` BehaviorSubject, built-in loading/error states via `rxResource`, template uses `@if`/`@for` (Angular 21 control flow).

---

### Q87. What happens to RxJS subscriptions when Angular uses zoneless change detection? (Advanced)

**Answer**: In zoneless mode, RxJS subscriptions **do not automatically trigger change detection**. Zone.js previously intercepted async callbacks (like Observable emissions) to trigger CD. Without Zone.js, you must ensure Angular knows about state changes:

```typescript
// WORKS in zoned Angular (Zone patches setTimeout inside interval):
interval(1000).subscribe(v => this.count = v);
// Zone detects async callback → triggers CD → template updates

// BROKEN in zoneless Angular:
interval(1000).subscribe(v => this.count = v);
// No Zone → no auto CD → template does NOT update!
```

**Solutions for zoneless**:

1. **Use signals** (recommended):
```typescript
count = signal(0);
constructor() {
  interval(1000).pipe(takeUntilDestroyed()).subscribe(v => this.count.set(v));
  // Signal write triggers CD automatically
}
```

2. **Use `toSignal()`**:
```typescript
count = toSignal(interval(1000), { initialValue: 0 });
```

3. **Use `async` pipe** (still works in zoneless — it calls `markForCheck()`):
```html
{{ count$ | async }}
```

4. **Manual `ChangeDetectorRef`**:
```typescript
interval(1000).subscribe(v => {
  this.count = v;
  this.cdr.markForCheck(); // Manually notify Angular
});
```

---

### Q88. Explain the performance characteristics of `toSignal()` vs `async` pipe. (Advanced)

**Answer**:

| Aspect | `toSignal()` | `async` pipe |
|--------|-------------|-------------|
| Subscription timing | Eagerly on creation | On template attach (lazy) |
| Unsubscription | On DestroyRef | On template detach |
| Change detection trigger | Signal-based (fine-grained) | `markForCheck()` (marks component dirty) |
| Multiple template reads | One subscription, O(1) reads | One subscription per pipe usage |
| Type safety | `Signal<T \| undefined>` or `Signal<T>` | `T \| null` |
| Memory | Holds value in signal | Holds value in pipe instance |
| Zoneless compatible | Yes (signals are native) | Yes (calls markForCheck) |

**Performance-critical difference**: In zoneless + OnPush, `toSignal()` participates in fine-grained signal tracking. Angular only re-renders the specific template nodes that read the signal. The `async` pipe marks the entire component as dirty.

```typescript
// toSignal — fine-grained: only {{ count() }} node re-renders
count = toSignal(count$, { initialValue: 0 });

// async pipe — coarse: entire component checked
// {{ count$ | async }}
```

---

### Q89. An architect wants to remove RxJS entirely from an Angular 21 app. What would be lost? Is it possible? (Expert)

**Answer**: It's **technically possible** but **not recommended**. Here's what would be lost:

**Cannot replace with signals**:
- `HttpClient` returns Observables — you'd need wrappers or `resource()`/`rxResource()` for every call
- `Router.events`, `ActivatedRoute.params` are Observables
- `FormControl.valueChanges` / `statusChanges` are Observables
- No `debounceTime`, `switchMap`, `retry`, `bufferTime` equivalent in signals
- WebSocket handling
- Complex async coordination (race, forkJoin, combineLatest with timing)

**What signals CAN replace**:
- BehaviorSubject for simple state → `signal()`
- Computed derived state → `computed()`
- Basic HTTP data loading → `resource()` (uses `fetch`, not HttpClient)
- Simple event notification → `output()`

**Practical assessment**:
```
RxJS removal feasibility:
  Simple CRUD app:    ~80% possible (use resource(), signals)
  Real-time dashboard: ~20% possible (WebSockets, complex streams)
  Enterprise app:      ~40% possible (forms, routing, HTTP interceptors)
```

RxJS is a dependency of `@angular/core` itself. You can minimize direct usage but cannot truly remove it.

---

### Q90. Design a decision flowchart for choosing between RxJS and Signals for a new feature. (Expert)

**Answer**:

```
START: New feature needs state/data
│
├─ Is it synchronous state (counter, toggle, form field)?
│  └─ YES → signal()
│
├─ Is it derived from other signals?
│  └─ YES → computed()
│
├─ Does it need debounce, throttle, buffer, or timing?
│  └─ YES → RxJS operators (bridge with toObservable → pipe → toSignal)
│
├─ Does it need cancellation of previous operations?
│  └─ YES → switchMap / exhaustMap (RxJS)
│
├─ Is it HTTP data loading tied to a reactive parameter?
│  └─ YES → rxResource() (Signal output, Observable loader)
│
├─ Is it a one-shot HTTP call?
│  └─ YES → resource() or toSignal(http.get(...))
│
├─ Is it a continuous event stream (WebSocket, SSE, DOM events)?
│  └─ YES → RxJS Observable (share for multicasting)
│
├─ Does it need complex error recovery (retry, fallback)?
│  └─ YES → RxJS (catchError, retry, retryWhen)
│
├─ Is it combining multiple async sources with specific timing?
│  └─ YES → RxJS (combineLatest, merge, race, forkJoin)
│
└─ Is it simple component input/output?
   └─ YES → input(), output(), model() (Signals)

RULE OF THUMB:
  State → Signals
  Events & async coordination → RxJS
  Bridge → toSignal(), toObservable(), rxResource()
```

---

## Quick Reference: Study Checklist

| Topic | Questions | Status |
|-------|----------|--------|
| Observable Fundamentals | Q1–Q14 | [ ] |
| Observer & Subscriber | Q15–Q24 | [ ] |
| Subscription & Teardown | Q25–Q36 | [ ] |
| Hot vs Cold Observables | Q37–Q50 | [ ] |
| Subject Types | Q51–Q64 | [ ] |
| Multicasting & Sharing | Q65–Q74 | [ ] |
| RxJS in Angular 21 | Q75–Q82 | [ ] |
| RxJS vs Signals | Q83–Q90 | [ ] |

---

> **Next →** [RxJS Operators — Creation](./RXJS_OPERATORS_CREATION_THEORY.md)
