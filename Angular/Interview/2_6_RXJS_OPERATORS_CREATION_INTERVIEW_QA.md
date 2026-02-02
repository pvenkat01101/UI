# RxJS Creation Operators — Interview Questions & Answers

> **Phase 2 · Section 6** — 80 questions from beginner to expert
> Organized by subtopic · Targeting Angular 21 with RxJS 7.x · FAANG-level depth

---

## Table of Contents

1. [of() (Q1–Q10)](#1-of)
2. [from() (Q11–Q22)](#2-from)
3. [interval() & timer() (Q23–Q36)](#3-interval--timer)
4. [fromEvent() (Q37–Q48)](#4-fromevent)
5. [defer() (Q49–Q58)](#5-defer)
6. [range() & generate() (Q59–Q66)](#6-range--generate)
7. [Cross-Topic & Combination Scenarios (Q67–Q74)](#7-cross-topic--combination-scenarios)
8. [System Design & Angular Patterns (Q75–Q80)](#8-system-design--angular-patterns)

---

## 1. of()

### Q1. What does `of()` do? Is it synchronous or asynchronous? (Beginner)

**Answer**: `of()` takes any number of arguments, emits each value **synchronously** one after another, then immediately completes.

```typescript
console.log('before');
of(1, 2, 3).subscribe(v => console.log(v));
console.log('after');
// Output: before → 1 → 2 → 3 → after (all synchronous)
```

---

### Q2. What is the output of `of([1, 2, 3]).subscribe(v => console.log(v))`? (Beginner)

**Answer**: It logs `[1, 2, 3]` — the entire array as a **single value**. `of()` emits each argument as-is without iterating. To emit individual array elements, use `from([1, 2, 3])`.

```typescript
of([1, 2, 3]).subscribe(v => console.log(v));
// [1, 2, 3]  ← one emission (the array)

from([1, 2, 3]).subscribe(v => console.log(v));
// 1 → 2 → 3  ← three emissions
```

---

### Q3. What does `of()` with no arguments emit? (Beginner)

**Answer**: Nothing — it completes immediately with zero emissions. It behaves identically to `EMPTY`.

```typescript
of().subscribe({
  next: () => console.log('never called'),
  complete: () => console.log('complete') // fires
});
```

---

### Q4. When would you use `of()` in an Angular application? Give 3 use cases. (Intermediate)

**Answer**:

1. **Fallback in `switchMap`** — return empty results when query is too short:
```typescript
switchMap(q => q.length < 3 ? of([]) : this.http.get(`/api/search?q=${q}`))
```

2. **Mock services in tests** — replace HTTP calls with immediate values:
```typescript
const mockHttp = { get: () => of([{ id: 1, name: 'Test' }]) };
```

3. **Route guard returning synchronous result**:
```typescript
canActivate(): Observable<boolean> {
  return of(this.authService.isLoggedIn());
}
```

---

### Q5. Is `of(promise)` the same as `from(promise)`? (Intermediate)

**Answer**: No.

- `of(promise)` emits the **Promise object itself** as a value, then completes. It does NOT unwrap the Promise.
- `from(promise)` **awaits** the Promise and emits the resolved value (or errors on rejection).

```typescript
const p = Promise.resolve(42);

of(p).subscribe(v => console.log(v));
// Promise { 42 }  ← the Promise object

from(p).subscribe(v => console.log(v));
// 42  ← the resolved value
```

---

### Q6. How is `of(1, 2, 3)` different from `from([1, 2, 3])`? (Beginner)

**Answer**: They produce the same output — emitting 1, 2, 3 individually then completing. The difference is in the API:

- `of()` takes **variadic arguments** — each argument is one emission
- `from()` takes a **single iterable** — each element of the iterable is one emission

```typescript
of(1, 2, 3);       // 1 → 2 → 3 → complete
from([1, 2, 3]);    // 1 → 2 → 3 → complete (same result)
```

Use `of()` for inline known values. Use `from()` when you already have a collection.

---

### Q7. Does `of()` create a cold or hot Observable? (Beginner)

**Answer**: Cold. Each subscriber gets its own independent, synchronous execution:

```typescript
const source$ = of(Date.now());
source$.subscribe(v => console.log('A:', v)); // e.g. 1700000000
source$.subscribe(v => console.log('B:', v)); // same value (sync, same tick)
```

Both get the same value only because `Date.now()` is evaluated once at creation time. The execution itself is independent per subscriber.

---

### Q8. What is the marble diagram for `of('a', 'b', 'c')`? (Beginner)

**Answer**:
```
(abc|)
```
All three values are emitted synchronously in the same frame (grouped in parentheses), followed by immediate completion `|`.

---

### Q9. Can `of()` emit `undefined` or `null`? (Beginner)

**Answer**: Yes. `of()` emits whatever values you pass, including `null`, `undefined`, `NaN`, `0`, `false`, and empty string.

```typescript
of(null, undefined, 0, false, '').subscribe(v => console.log(v));
// null → undefined → 0 → false → ""
```

---

### Q10. A teammate writes `return of(this.http.get('/api'))`. What is wrong? (Intermediate)

**Answer**: This wraps the **Observable** returned by `HttpClient.get()` as a single emission. The subscriber receives the Observable object, not the HTTP response data.

```typescript
// WRONG — emits Observable<User[]> as a value
return of(this.http.get<User[]>('/api'));
// Subscriber gets: Observable<User[]> object

// CORRECT — return the Observable directly
return this.http.get<User[]>('/api');
```

If you need to wrap in an operator context, use `switchMap`, not `of`:
```typescript
someCondition$.pipe(
  switchMap(flag => flag ? this.http.get('/api') : of([]))
);
```

---

## 2. from()

### Q11. What types of inputs can `from()` accept? (Beginner)

**Answer**: `from()` accepts any `ObservableInput<T>`:

1. **Array** — emits each element synchronously
2. **Promise** — emits resolved value asynchronously
3. **Iterable** (string, Set, Map, custom `[Symbol.iterator]`) — emits each element synchronously
4. **AsyncIterable** (async generators, custom `[Symbol.asyncIterator]`) — emits each value asynchronously
5. **Observable / Observable-like** (any object with `subscribe` method) — passes through
6. **ReadableStream** (Web Streams API) — emits each chunk asynchronously

---

### Q12. What is the output of `from('Angular')`? (Beginner)

**Answer**: A string is iterable (iterator of characters), so `from()` emits each character individually:

```typescript
from('Angular').subscribe(v => console.log(v));
// A → n → g → u → l → a → r → complete
```

---

### Q13. Is `from([1, 2, 3])` synchronous or asynchronous? What about `from(Promise.resolve(1))`? (Intermediate)

**Answer**:

- `from([1, 2, 3])` is **synchronous** — array iteration is sync.
- `from(Promise.resolve(1))` is **asynchronous** — even already-resolved Promises deliver via microtask.

```typescript
console.log('start');
from([1, 2, 3]).subscribe(v => console.log('array:', v));
console.log('middle');
from(Promise.resolve(99)).subscribe(v => console.log('promise:', v));
console.log('end');

// start → array: 1 → array: 2 → array: 3 → middle → end → promise: 99
```

---

### Q14. How does `from()` handle a rejected Promise? (Intermediate)

**Answer**: The rejection is delivered as an `error` notification to the subscriber:

```typescript
from(Promise.reject(new Error('fail'))).subscribe({
  next: v => console.log('never called'),
  error: e => console.log('Error:', e.message) // "Error: fail"
});
```

---

### Q15. Can you cancel a `from(promise)` subscription? What actually happens? (Intermediate)

**Answer**: You can call `unsubscribe()`, which stops the subscriber from receiving the value, but the **Promise itself cannot be cancelled** — it continues executing.

```typescript
const promise = new Promise(resolve => {
  console.log('Promise work started');
  setTimeout(() => {
    console.log('Promise resolved'); // STILL runs
    resolve('done');
  }, 5000);
});

const sub = from(promise).subscribe(v => console.log('Received:', v));
sub.unsubscribe(); // Won't receive 'done', but Promise still runs

// Output: "Promise work started" → (5s later) "Promise resolved"
// "Received: done" NEVER logged
```

For true cancellation, use `new Observable()` with `AbortController`.

---

### Q16. Convert a callback-based Node-style API to an Observable using `from()`. (Intermediate)

**Answer**: Wrap in a Promise first, then use `from()`:

```typescript
function readFileObs(path: string): Observable<string> {
  return from(new Promise<string>((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      err ? reject(err) : resolve(data);
    });
  }));
}

// Or use bindNodeCallback (dedicated RxJS utility):
import { bindNodeCallback } from 'rxjs';
const readFile$ = bindNodeCallback(fs.readFile);
readFile$('file.txt', 'utf8').subscribe(content => console.log(content));
```

---

### Q17. How does `from()` handle an async generator? (Advanced)

**Answer**: `from()` subscribes to the async iterator, emitting each yielded value as it becomes available:

```typescript
async function* fetchPages() {
  for (let page = 1; page <= 3; page++) {
    const response = await fetch(`/api/items?page=${page}`);
    yield await response.json();
  }
}

from(fetchPages()).subscribe({
  next: pageData => console.log('Page:', pageData),
  complete: () => console.log('All pages loaded')
});
// Page: [...] → Page: [...] → Page: [...] → All pages loaded
```

---

### Q18. What is the difference between `from(generator())` and `from(generatorFn)`? (Advanced)

**Answer**: You must call the generator function to get the iterator:

```typescript
function* nums() { yield 1; yield 2; yield 3; }

// CORRECT — pass the iterator (result of calling the generator)
from(nums()).subscribe(v => console.log(v)); // 1, 2, 3

// WRONG — passing the function itself
// from(nums) — TypeScript error, generator function is not ObservableInput
```

However, `defer()` combined with `from()` can create lazy generators:
```typescript
const lazy$ = defer(() => from(nums())); // Fresh generator per subscribe
```

---

### Q19. How does `from(ReadableStream)` work? When is this useful? (Advanced)

**Answer**: RxJS 7 supports `ReadableStream` (Web Streams API) as an `ObservableInput`. Each chunk from the stream becomes an emission:

```typescript
// Streaming a large file download
from(
  fetch('/api/large-file').then(r => r.body!)
).subscribe({
  next: (chunk: Uint8Array) => console.log('Chunk:', chunk.length, 'bytes'),
  complete: () => console.log('Download complete')
});
```

**Use case**: Processing Server-Sent Events, streaming AI responses, progressive file uploads.

---

### Q20. You need to process 1000 items through an HTTP API one at a time. How do you use `from()` for this? (Advanced)

**Answer**: Use `from()` to emit each item, then `concatMap` to serialize HTTP calls:

```typescript
from(items).pipe(
  concatMap((item, index) =>
    this.http.post('/api/process', item).pipe(
      tap(() => console.log(`Processed ${index + 1}/${items.length}`)),
      catchError(err => {
        console.error(`Failed item ${index}:`, err);
        return of(null); // Skip failed items
      })
    )
  ),
  filter(result => result !== null),
  toArray()
).subscribe(results => console.log('All done:', results.length));
```

Use `mergeMap` with concurrency limit for parallel processing:
```typescript
from(items).pipe(
  mergeMap(item => this.http.post('/api/process', item), 5) // 5 concurrent
);
```

---

### Q21. What happens when you pass an empty array to `from()`? (Beginner)

**Answer**: It completes immediately with no emissions — identical to `EMPTY`:

```typescript
from([]).subscribe({
  next: () => console.log('never'),
  complete: () => console.log('complete') // fires immediately
});
```

---

### Q22. Compare `from()` with `new Observable()` for Promise wrapping. When would you prefer each? (Advanced)

**Answer**:

| Feature | `from(promise)` | `new Observable()` with Promise |
|---------|----------------|--------------------------------|
| Laziness | Eager (Promise already running) | Lazy (can defer creation) |
| Cancellation | Cannot cancel Promise | Can use AbortController |
| Cleanup | None | Custom teardown |
| Simplicity | One-liner | More code |

```typescript
// from(promise) — simple but eager, no cancellation
const simple$ = from(fetch('/api'));

// new Observable — lazy, cancellable
const advanced$ = new Observable(sub => {
  const ctrl = new AbortController();
  fetch('/api', { signal: ctrl.signal })
    .then(r => r.json())
    .then(data => { sub.next(data); sub.complete(); })
    .catch(err => { if (!ctrl.signal.aborted) sub.error(err); });
  return () => ctrl.abort(); // True cancellation
});
```

Use `from()` for simple cases. Use `new Observable()` when you need cancellation or custom teardown.

---

## 3. interval() & timer()

### Q23. What is the first value emitted by `interval(1000)` and when? (Beginner)

**Answer**: The first value is `0`, emitted **after** 1000ms (one full period). It does NOT emit immediately.

```
interval(1000):
  ----0----1----2----3---->
  ^   ^1s  ^2s  ^3s  ^4s
  (nothing for first 1000ms)
```

---

### Q24. How do you get immediate first emission with periodic behavior? (Beginner)

**Answer**: Use `timer(0, period)` instead of `interval(period)`:

```typescript
// Delay first emission:
interval(1000); // first: 0 at 1s

// Immediate first emission:
timer(0, 1000); // first: 0 at 0ms, then 1 at 1s, 2 at 2s...
```

Or use `startWith` with `interval`:
```typescript
interval(1000).pipe(startWith(-1)); // -1 immediately, then 0 at 1s, 1 at 2s...
```

---

### Q25. Does `interval()` complete? What are the implications? (Beginner)

**Answer**: No, `interval()` **never completes**. It emits forever until unsubscribed. This means:

1. **Memory leak** if subscription isn't managed
2. **Must** use `takeUntilDestroyed()`, `take(n)`, `takeWhile()`, or manual unsubscribe
3. In Angular, failing to unsubscribe causes the interval to run after component destruction

```typescript
// LEAK:
ngOnInit() {
  interval(1000).subscribe(v => this.count = v);
}

// SAFE:
count = toSignal(interval(1000), { initialValue: 0 });
```

---

### Q26. What is the difference between `timer(5000)` and `timer(5000, 1000)`? (Beginner)

**Answer**:

- `timer(5000)` — emits `0` once after 5 seconds, then **completes**
- `timer(5000, 1000)` — emits `0` after 5 seconds, then `1, 2, 3...` every second, **never completes**

```
timer(5000):
  ----------0|           ← single emission, completes

timer(5000, 1000):
  ----------0----1----2----3---->  ← periodic, never completes
```

---

### Q27. How do you build an API polling mechanism that fetches immediately and then every 30 seconds? (Intermediate)

**Answer**:

```typescript
@Component({ ... })
export class PollComponent {
  private http = inject(HttpClient);

  data = toSignal(
    timer(0, 30_000).pipe(
      switchMap(() => this.http.get<Data>('/api/data')),
      retry({ count: 3, delay: 5000 })
    ),
    { initialValue: null }
  );
}
```

**Why `switchMap`**: If the HTTP request takes longer than 30 seconds, `switchMap` cancels the previous in-flight request when the next poll triggers. This prevents request pileup.

---

### Q28. A developer uses `setInterval` in Angular instead of `interval()`. What problems can arise? (Intermediate)

**Answer**:

1. **No auto-cleanup** — `setInterval` doesn't integrate with Angular's lifecycle. You must manually `clearInterval` in `ngOnDestroy`
2. **No RxJS operators** — can't use `switchMap`, `takeUntil`, `debounceTime`, etc.
3. **Zone.js overhead** — `setInterval` is patched by Zone.js, triggering change detection on every tick even if nothing changed
4. **Harder to test** — can't use marble testing or `fakeAsync`
5. **No cancellation patterns** — with `interval()` + `switchMap`, you can cancel in-flight operations

```typescript
// BAD:
private intervalId: any;
ngOnInit() { this.intervalId = setInterval(() => this.poll(), 5000); }
ngOnDestroy() { clearInterval(this.intervalId); }

// GOOD:
data = toSignal(
  timer(0, 5000).pipe(switchMap(() => this.http.get('/api'))),
  { initialValue: null }
);
```

---

### Q29. Can `timer()` accept a `Date` object? What is the use case? (Intermediate)

**Answer**: Yes. `timer(date)` waits until the specified date/time, then emits `0` and completes:

```typescript
const midnight = new Date();
midnight.setHours(24, 0, 0, 0);

timer(midnight).subscribe(() => {
  console.log('It is midnight!');
  this.runDailyCleanup();
});
```

If the Date is in the past, it emits immediately.

---

### Q30. How would you implement an exponential backoff retry using `timer()`? (Advanced)

**Answer**:

```typescript
this.http.get('/api/data').pipe(
  retry({
    count: 5,
    delay: (error, retryCount) => {
      const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30_000);
      console.log(`Retry ${retryCount} in ${delayMs}ms`);
      return timer(delayMs);
    }
  })
);
// Retry 1: 1s, Retry 2: 2s, Retry 3: 4s, Retry 4: 8s, Retry 5: 16s
```

`timer(delayMs)` creates a one-shot Observable that emits after the delay, which `retry` uses as the signal to retry.

---

### Q31. Write a countdown timer Observable that emits remaining seconds from 60 to 0. (Intermediate)

**Answer**:

```typescript
const countdown$ = timer(0, 1000).pipe(
  map(elapsed => 60 - elapsed),
  takeWhile(remaining => remaining >= 0)
);

countdown$.subscribe({
  next: seconds => console.log(`${seconds}s remaining`),
  complete: () => console.log('Time is up!')
});
// 60s remaining → 59s remaining → ... → 0s remaining → Time is up!
```

---

### Q32. How do `interval()` and `timer()` behave in `fakeAsync` tests? (Advanced)

**Answer**: In `fakeAsync`, time-based Observables use the virtual clock controlled by `tick()`:

```typescript
it('should emit 3 values from interval', fakeAsync(() => {
  const values: number[] = [];
  interval(1000).pipe(take(3)).subscribe(v => values.push(v));

  expect(values).toEqual([]); // Nothing yet

  tick(1000);
  expect(values).toEqual([0]);

  tick(1000);
  expect(values).toEqual([0, 1]);

  tick(1000);
  expect(values).toEqual([0, 1, 2]);
}));

it('should work with timer', fakeAsync(() => {
  let result: number | undefined;
  timer(5000).subscribe(v => result = v);

  tick(4999);
  expect(result).toBeUndefined();

  tick(1);
  expect(result).toBe(0);
}));
```

---

### Q33. What scheduler does `interval()` use internally? Can you change it? (Advanced)

**Answer**: `interval()` uses `asyncScheduler` by default (`setInterval` under the hood). You can pass a different scheduler as the second argument:

```typescript
import { interval, animationFrameScheduler, asapScheduler } from 'rxjs';

// Default — macrotask (setInterval)
interval(16); // ~60fps using setInterval

// Animation frame — smoother for visual updates
interval(0, animationFrameScheduler); // requestAnimationFrame

// ASAP — microtask-based
interval(0, asapScheduler); // Promise.resolve()
```

In practice, `animationFrameScheduler` is useful for animations:
```typescript
interval(0, animationFrameScheduler).pipe(
  map(frame => frame / 60), // seconds elapsed
  takeWhile(t => t <= 2)    // 2-second animation
).subscribe(t => this.animate(t));
```

---

### Q34. Is `interval(0)` the same as `timer(0, 0)`? (Advanced)

**Answer**: Both emit as fast as possible (limited by `setInterval` minimum delay, typically 4ms in browsers). However:

- `interval(0)` — first emission after ~4ms, then every ~4ms
- `timer(0, 0)` — first emission immediately (synchronous 0ms), then every ~4ms

```typescript
console.log('start');
timer(0, 0).pipe(take(1)).subscribe(v => console.log('timer:', v));
interval(0).pipe(take(1)).subscribe(v => console.log('interval:', v));
console.log('end');

// start → timer: 0 → end → interval: 0
// (timer's 0 delay is immediate; interval waits for first period)
```

---

### Q35. Build a "smart" polling service that pauses when the browser tab is hidden. (Expert)

**Answer**:

```typescript
@Injectable({ providedIn: 'root' })
export class SmartPollingService {
  private visibilityChange$ = fromEvent(document, 'visibilitychange').pipe(
    map(() => document.visibilityState === 'visible'),
    startWith(true)
  );

  poll<T>(url: string, intervalMs: number): Observable<T> {
    return this.visibilityChange$.pipe(
      switchMap(visible =>
        visible
          ? timer(0, intervalMs).pipe(
              switchMap(() => inject(HttpClient).get<T>(url))
            )
          : EMPTY // Pause polling when tab is hidden
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
```

---

### Q36. How does `interval()` interact with Zone.js? What about zoneless Angular? (Advanced)

**Answer**:

**With Zone.js**: `interval()` uses `setInterval`, which is patched by Zone.js. Every tick triggers Angular change detection via `NgZone` → `ApplicationRef.tick()`. This is wasteful if the interval doesn't affect the template.

```typescript
// Problem: triggers CD every second even if only logging
interval(1000).subscribe(v => console.log(v));

// Fix: run outside Angular zone
inject(NgZone).runOutsideAngular(() => {
  interval(1000).subscribe(v => console.log(v));
});
```

**Zoneless Angular**: `interval()` does NOT trigger change detection at all. You must write to a signal to update the view:

```typescript
// Zoneless — must use signal
count = toSignal(interval(1000), { initialValue: 0 });
// Signal write triggers scheduler → CD runs
```

---

## 4. fromEvent()

### Q37. What does `fromEvent()` return? Does it ever complete? (Beginner)

**Answer**: `fromEvent()` returns a **hot Observable** that emits an event object each time the specified event fires on the target. It **never completes** — DOM events can fire indefinitely. The Observable cleans up (calls `removeEventListener`) only when unsubscribed.

---

### Q38. What happens internally when you `unsubscribe()` from a `fromEvent()` Observable? (Beginner)

**Answer**: RxJS calls `removeEventListener()` on the target, removing the event handler. This is the teardown logic:

```typescript
const sub = fromEvent(button, 'click').subscribe(e => console.log(e));
// Internally: button.addEventListener('click', handler)

sub.unsubscribe();
// Internally: button.removeEventListener('click', handler)
```

---

### Q39. How do you type the event in `fromEvent`? (Beginner)

**Answer**: Use the generic parameter:

```typescript
// Typed as MouseEvent
fromEvent<MouseEvent>(document, 'click').subscribe(e => {
  console.log(e.clientX, e.clientY); // Full type safety
});

// Typed as KeyboardEvent
fromEvent<KeyboardEvent>(document, 'keydown').subscribe(e => {
  console.log(e.key, e.ctrlKey);
});

// Typed as InputEvent (for input elements)
fromEvent<Event>(inputEl, 'input').pipe(
  map(e => (e.target as HTMLInputElement).value)
);
```

---

### Q40. How would you implement a debounced search input using `fromEvent`? (Intermediate)

**Answer**:

```typescript
ngAfterViewInit() {
  fromEvent<Event>(this.searchInput.nativeElement, 'input').pipe(
    map(e => (e.target as HTMLInputElement).value),
    debounceTime(300),
    distinctUntilChanged(),
    filter(q => q.length >= 2),
    switchMap(q => this.http.get<Result[]>(`/api/search?q=${q}`)),
    catchError(() => of([])),
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(results => this.results.set(results));
}
```

Key operators: `debounceTime` waits for 300ms pause, `distinctUntilChanged` prevents duplicate searches, `switchMap` cancels previous in-flight requests.

---

### Q41. Can you use `fromEvent` with `EventTarget`, `NodeList`, or jQuery objects? (Intermediate)

**Answer**:

- **`EventTarget`**: Yes (DOM elements, `document`, `window`) — uses `addEventListener/removeEventListener`
- **`NodeList`/`HTMLCollection`**: Yes — attaches the same listener to every element in the list
- **jQuery objects**: Yes — uses jQuery's `on/off` methods

```typescript
// Single element
fromEvent(document, 'click');

// NodeList — listens on ALL matched elements
const buttons = document.querySelectorAll('.btn');
fromEvent(buttons, 'click').subscribe(e => console.log('Button clicked'));

// jQuery (if available)
fromEvent($('#my-input'), 'input');
```

---

### Q42. How can you pass `addEventListener` options (like `passive` or `capture`) to `fromEvent`? (Intermediate)

**Answer**: Pass options as the third argument:

```typescript
// Passive scroll listener (better scroll performance)
fromEvent(document, 'scroll', { passive: true }).pipe(
  throttleTime(100)
).subscribe(() => this.onScroll());

// Capture phase
fromEvent(document, 'click', { capture: true }).subscribe(e => {
  console.log('Captured in capture phase');
});
```

---

### Q43. Should you use `fromEvent` or template event bindings `(click)` in Angular? (Intermediate)

**Answer**: Prefer template bindings for simple event handling. Use `fromEvent` when you need RxJS operators:

| Use Template Bindings `(click)` | Use `fromEvent()` |
|---------------------------------|-------------------|
| Simple handler: `(click)="save()"` | Need `debounceTime`, `throttleTime` |
| Angular handles cleanup | Need `switchMap`, `exhaustMap` |
| Works with change detection | Need `buffer`, `scan`, `distinctUntilChanged` |
| Signal-friendly | Need to compose with other streams |

```typescript
// Simple — use template binding
// <button (click)="save()">Save</button>

// Complex — use fromEvent
fromEvent(this.el.nativeElement, 'scroll').pipe(
  throttleTime(100),
  map(() => this.el.nativeElement.scrollTop),
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up')
);
```

---

### Q44. How do you detect double-clicks using `fromEvent`? (Intermediate)

**Answer**: Use `buffer` with a debounced signal:

```typescript
const click$ = fromEvent(element, 'click');

click$.pipe(
  buffer(click$.pipe(debounceTime(250))),
  filter(clicks => clicks.length >= 2),
  map(clicks => clicks.length)
).subscribe(count => console.log(`${count}-click detected`));
```

Or use the native `dblclick` event:
```typescript
fromEvent(element, 'dblclick').subscribe(e => console.log('Double clicked'));
```

---

### Q45. How do you handle `fromEvent` in SSR (Server-Side Rendering)? (Advanced)

**Answer**: DOM events don't exist on the server. Guard with platform check:

```typescript
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

private platformId = inject(PLATFORM_ID);

ngAfterViewInit() {
  if (isPlatformBrowser(this.platformId)) {
    fromEvent(window, 'resize').pipe(
      throttleTime(200),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.handleResize());
  }
}
```

Or use `afterNextRender()` which only runs in the browser:
```typescript
afterNextRender(() => {
  fromEvent(window, 'scroll').pipe(...).subscribe();
});
```

---

### Q46. Compare `fromEvent(window, 'resize')` vs Angular's `HostListener('window:resize')`. (Intermediate)

**Answer**:

| Feature | `fromEvent` | `@HostListener` / `host` |
|---------|------------|-------------------------|
| RxJS operators | Yes (throttle, debounce) | No — fires on every event |
| Change detection | Only when you update state | Triggers CD on every event |
| Cleanup | Manual (`takeUntilDestroyed`) | Automatic |
| Flexibility | Full Observable composition | Simple handler only |

```typescript
// HostListener — triggers CD on EVERY resize (wasteful)
@HostListener('window:resize')
onResize() { this.width = window.innerWidth; }

// fromEvent — throttled, efficient
fromEvent(window, 'resize').pipe(
  throttleTime(200),
  takeUntilDestroyed()
).subscribe(() => this.width.set(window.innerWidth));
```

---

### Q47. Can `fromEvent` listen to custom events? (Intermediate)

**Answer**: Yes, any `EventTarget` can dispatch custom events:

```typescript
// Dispatch custom event
element.dispatchEvent(new CustomEvent('app:save', { detail: { id: 42 } }));

// Listen with fromEvent
fromEvent<CustomEvent>(element, 'app:save').subscribe(e => {
  console.log('Saved:', e.detail); // { id: 42 }
});
```

---

### Q48. Build a drag-and-drop Observable stream using `fromEvent`. (Expert)

**Answer**:

```typescript
const mouseDown$ = fromEvent<MouseEvent>(element, 'mousedown');
const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');

const drag$ = mouseDown$.pipe(
  switchMap(start => mouseMove$.pipe(
    map(move => ({
      x: move.clientX - start.offsetX,
      y: move.clientY - start.offsetY
    })),
    takeUntil(mouseUp$)
  ))
);

drag$.pipe(
  takeUntilDestroyed()
).subscribe(pos => {
  element.style.left = `${pos.x}px`;
  element.style.top = `${pos.y}px`;
});
```

Pattern: `mousedown` → `switchMap` to `mousemove` → `takeUntil(mouseup)`.

---

## 5. defer()

### Q49. What problem does `defer()` solve? (Beginner)

**Answer**: `defer()` solves the problem of **eager evaluation**. Without `defer()`, the Observable's content is determined at creation time. With `defer()`, it's determined at subscription time.

```typescript
let count = 0;

// Without defer — of() evaluates count ONCE at creation
const eager$ = of(count);
count = 5;
eager$.subscribe(v => console.log(v)); // 0 (stale!)

// With defer — evaluates count on EACH subscribe
const lazy$ = defer(() => of(count));
count = 10;
lazy$.subscribe(v => console.log(v)); // 10 (fresh!)
```

---

### Q50. Is `defer(() => of(value))` the same as `of(value)` functionally? (Intermediate)

**Answer**: For static literal values, the output is the same. But they differ when:

1. **The value expression has side effects**:
```typescript
of(Math.random());       // Same random number for all subscribers
defer(() => of(Math.random())); // Different random number per subscriber
```

2. **The value depends on external state**:
```typescript
of(this.cache.get('key'));        // Captured once
defer(() => of(this.cache.get('key'))); // Re-evaluated per subscribe
```

3. **The factory returns different Observable types conditionally**:
```typescript
defer(() => condition ? of(cached) : this.http.get('/api'));
```

---

### Q51. Why is `defer()` important for making `from(promise)` lazy? (Intermediate)

**Answer**: Promises are **eager** — they execute immediately when constructed. `from(promise)` just wraps an already-executing Promise:

```typescript
// EAGER — request fires immediately
const obs$ = from(fetch('/api/data'));

// LAZY — request fires only on subscribe
const obs$ = defer(() => fetch('/api/data'));
```

`defer()` ensures the Promise constructor (and therefore the side effect) only runs when a subscriber subscribes.

---

### Q52. How does `defer()` interact with `retry()`? Why is this combination powerful? (Advanced)

**Answer**: `retry()` re-subscribes to the source Observable. With `defer()`, each re-subscription runs the factory fresh:

```typescript
let attempt = 0;

defer(() => {
  attempt++;
  if (attempt < 3) return throwError(() => new Error(`Attempt ${attempt} failed`));
  return of(`Success on attempt ${attempt}`);
}).pipe(
  retry(3)
).subscribe(v => console.log(v));
// "Success on attempt 3"
```

Without `defer()`, the factory runs once, and retry re-subscribes to the same already-determined Observable — retry would never succeed.

---

### Q53. Write a `defer()`-based feature flag guard. (Intermediate)

**Answer**:

```typescript
function featureGuard(flagName: string): Observable<boolean> {
  return defer(() => {
    const flags = inject(FeatureFlagService);
    const isEnabled = flags.isEnabled(flagName);
    return of(isEnabled);
  });
}

// Route config
{
  path: 'new-dashboard',
  canActivate: [() => featureGuard('new-dashboard')],
  component: NewDashboardComponent
}
```

`defer()` ensures the feature flag is checked at navigation time, not route registration time.

---

### Q54. Can `defer()` return a Promise directly (not wrapped in `from()`)? (Intermediate)

**Answer**: Yes. `defer()` accepts a factory that returns any `ObservableInput`, which includes Promises:

```typescript
// All valid:
defer(() => of(42));                    // Returns Observable
defer(() => fetch('/api'));              // Returns Promise
defer(() => [1, 2, 3]);                 // Returns Array (iterable)
defer(() => from(asyncGenerator()));    // Returns Observable from async generator
```

RxJS internally wraps non-Observable returns with `from()`.

---

### Q55. Explain the difference between `defer(() => obs$)` and just `obs$`. (Intermediate)

**Answer**: For a pre-created Observable, there's no difference in output. But `defer()` delays the factory execution:

```typescript
const obs$ = this.http.get('/api'); // HttpClient Observable is already lazy
defer(() => this.http.get('/api')); // Also lazy — functionally same

// BUT for side effects in the factory:
let url = '/api/v1';
const direct$ = this.http.get(url);     // URL captured now
const deferred$ = defer(() => this.http.get(url)); // URL evaluated on subscribe

url = '/api/v2';
direct$.subscribe();   // Fetches /api/v1
deferred$.subscribe(); // Fetches /api/v2
```

---

### Q56. Build a caching service using `defer()` that serves from cache or network. (Advanced)

**Answer**:

```typescript
@Injectable({ providedIn: 'root' })
export class CacheService {
  private http = inject(HttpClient);
  private cache = new Map<string, { data: any; expiry: number }>();

  get<T>(url: string, ttlMs = 60_000): Observable<T> {
    return defer(() => {
      const entry = this.cache.get(url);
      if (entry && entry.expiry > Date.now()) {
        return of(entry.data as T); // Serve from cache
      }
      return this.http.get<T>(url).pipe(
        tap(data => this.cache.set(url, { data, expiry: Date.now() + ttlMs }))
      );
    });
  }
}
```

Each subscription re-evaluates whether cache is valid. Fresh subscribers always get the right behavior.

---

### Q57. What happens if the `defer()` factory throws an error? (Advanced)

**Answer**: The error is caught and delivered to the subscriber's `error` callback:

```typescript
defer(() => {
  throw new Error('Factory exploded');
}).subscribe({
  error: e => console.log('Caught:', e.message) // "Caught: Factory exploded"
});
```

This is safe — `defer()` wraps the factory in a try/catch internally.

---

### Q58. Compare `defer()` vs `iif()` for conditional Observables. (Advanced)

**Answer**: `iif()` is a specialized version of `defer()` for boolean conditions:

```typescript
import { iif, of, defer } from 'rxjs';

// iif — boolean condition, two Observable branches
const result$ = iif(
  () => this.isLoggedIn,
  this.http.get('/api/dashboard'),  // true branch
  of({ error: 'Not logged in' })    // false branch
);

// defer — equivalent but more flexible
const result$ = defer(() =>
  this.isLoggedIn ? this.http.get('/api/dashboard') : of({ error: 'Not logged in' })
);
```

| Feature | `iif()` | `defer()` |
|---------|--------|----------|
| Branches | Exactly 2 (true/false) | Unlimited (any logic) |
| Condition | Boolean function | Any code |
| Flexibility | Limited | Full |
| Readability | Clear for binary choice | Better for complex logic |

---

## 6. range() & generate()

### Q59. What does `range(5, 3)` emit? (Beginner)

**Answer**: `5, 6, 7`. The parameters are `range(start, count)` — starting at 5, emit 3 values. It does **not** mean "5 to 3" or "range from 5 to 3."

```typescript
range(5, 3).subscribe(v => console.log(v));
// 5 → 6 → 7 → complete
```

---

### Q60. Is `range()` synchronous or asynchronous? (Beginner)

**Answer**: **Synchronous**. All values are emitted in a single microtask:

```typescript
console.log('before');
range(1, 3).subscribe(v => console.log(v));
console.log('after');
// before → 1 → 2 → 3 → after
```

---

### Q61. How does `generate()` differ from `range()`? When would you use it? (Intermediate)

**Answer**: `generate()` is a generalized for-loop where you control the initial state, condition, iteration, and optional value transformation:

```typescript
// range can only do +1 increments
range(1, 5); // 1, 2, 3, 4, 5

// generate can do anything
generate({
  initialState: 2,
  condition: x => x <= 256,
  iterate: x => x * 2
});
// 2, 4, 8, 16, 32, 64, 128, 256
```

Use `generate()` when you need custom iteration logic (powers, Fibonacci, exponential backoff delays, etc.).

---

### Q62. Write a `generate()` call that produces the Fibonacci sequence up to 1000. (Intermediate)

**Answer**:

```typescript
generate({
  initialState: [0, 1] as [number, number],
  condition: ([a]) => a <= 1000,
  iterate: ([a, b]) => [b, a + b] as [number, number],
  resultSelector: ([a]) => a
}).subscribe(v => console.log(v));
// 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987
```

---

### Q63. Can `generate()` use object state? Show an example. (Intermediate)

**Answer**: Yes, the state can be any type:

```typescript
generate({
  initialState: { n: 1, factorial: 1 },
  condition: s => s.n <= 10,
  iterate: s => ({ n: s.n + 1, factorial: s.factorial * (s.n + 1) }),
  resultSelector: s => `${s.n}! = ${s.factorial}`
}).subscribe(v => console.log(v));
// "1! = 1", "2! = 2", "3! = 6", "4! = 24", ... "10! = 3628800"
```

---

### Q64. What happens if the `generate()` condition starts as false? (Intermediate)

**Answer**: No values are emitted — the Observable completes immediately (like `EMPTY`):

```typescript
generate({
  initialState: 100,
  condition: x => x < 10, // false from the start
  iterate: x => x + 1
}).subscribe({
  next: v => console.log('never'),
  complete: () => console.log('complete') // fires immediately
});
```

---

### Q65. What happens if the `generate()` condition never becomes false? (Advanced)

**Answer**: The Observable emits indefinitely in a **synchronous loop**, which will **block the main thread** and freeze the browser:

```typescript
// DANGER — infinite synchronous loop!
generate({
  initialState: 0,
  condition: () => true, // always true
  iterate: x => x + 1
}).subscribe(v => console.log(v));
// Browser freezes!
```

**Fix**: Always ensure the condition will eventually return false, or use `take(n)`:
```typescript
generate({
  initialState: 0,
  condition: () => true,
  iterate: x => x + 1
}).pipe(take(100)).subscribe(v => console.log(v));
```

---

### Q66. Compare `range()` + `map()` vs `generate()` with `resultSelector` for producing derived sequences. (Advanced)

**Answer**:

```typescript
// Approach 1: range + map
range(1, 5).pipe(
  map(x => x * x)
).subscribe(v => console.log(v)); // 1, 4, 9, 16, 25

// Approach 2: generate with resultSelector
generate({
  initialState: 1,
  condition: x => x <= 5,
  iterate: x => x + 1,
  resultSelector: x => x * x
}).subscribe(v => console.log(v)); // 1, 4, 9, 16, 25
```

For simple sequences, `range() + map()` is more readable. Use `generate()` when the iteration itself is non-linear (powers of 2, Fibonacci, etc.).

---

## 7. Cross-Topic & Combination Scenarios

### Q67. What is the output of this code? (Intermediate)

```typescript
concat(
  of(1, 2),
  timer(1000).pipe(map(() => 3)),
  from([4, 5])
).subscribe(v => console.log(v));
```

**Answer**:
- `of(1, 2)` emits `1, 2` synchronously, then completes
- `timer(1000)` waits 1 second, emits (mapped to) `3`, then completes
- `from([4, 5])` emits `4, 5` synchronously, then completes

```
Output: 1, 2 (immediately) → 3 (after 1s) → 4, 5 (immediately after 3)
```

`concat` waits for each Observable to complete before subscribing to the next.

---

### Q68. What is the difference between `forkJoin` and `combineLatest` when used with HTTP requests? (Intermediate)

**Answer**:

| Aspect | `forkJoin` | `combineLatest` |
|--------|-----------|-----------------|
| Emits when | All complete | All have emitted at least once, then on any change |
| Number of emissions | Exactly 1 | Multiple (on each source emission) |
| HTTP result | Last value of each | Each intermediate state |
| Typical HTTP use | Parallel requests, get all results once | Reactive parameters that change over time |

```typescript
// forkJoin — ONE emission with ALL results after all complete
forkJoin({
  users: this.http.get('/api/users'),     // completes
  posts: this.http.get('/api/posts')      // completes
}).subscribe(({ users, posts }) => { /* one emission */ });

// combineLatest — emits every time any source changes
combineLatest({
  params: this.route.params,       // emits on navigation
  query: this.route.queryParams    // emits on query change
}).pipe(
  switchMap(({ params, query }) => this.http.get(`/api/${params['id']}?${query}`))
);
```

---

### Q69. You have 3 API calls: A depends on B's result, and C is independent. How do you optimize this? (Advanced)

**Answer**: Run C in parallel with the B→A chain using `forkJoin`:

```typescript
forkJoin({
  a: this.http.get('/api/b').pipe(
    switchMap(bResult => this.http.get(`/api/a/${bResult.id}`))
  ),
  c: this.http.get('/api/c')
}).subscribe(({ a, c }) => {
  // a depends on b (sequential)
  // c runs in parallel with b+a
  // Total time = max(b+a, c) instead of b+a+c
});
```

---

### Q70. What happens if you use `forkJoin` with `interval()` (which never completes)? (Intermediate)

**Answer**: `forkJoin` **never emits** because it waits for all sources to complete. `interval()` never completes, so `forkJoin` hangs forever:

```typescript
forkJoin({
  a: of(1),
  b: interval(1000) // NEVER completes!
}).subscribe(v => console.log(v)); // NEVER fires
```

**Fix**: Ensure all sources complete — use `take()`:
```typescript
forkJoin({
  a: of(1),
  b: interval(1000).pipe(take(3)) // completes after 3 emissions
}).subscribe(({ a, b }) => console.log(a, b)); // 1, 2
```

---

### Q71. How do `race()` and `forkJoin()` represent opposite strategies? (Intermediate)

**Answer**:

- `forkJoin()` = **wait for ALL** — emits when every source has completed (AND logic)
- `race()` = **first wins** — emits from whichever source emits first, unsubscribes from others (OR logic)

```typescript
// forkJoin: all must complete
forkJoin([
  timer(1000).pipe(map(() => 'A')),
  timer(2000).pipe(map(() => 'B'))
]).subscribe(v => console.log(v));
// ['A', 'B'] after 2s (waits for slowest)

// race: first to emit
race([
  timer(1000).pipe(map(() => 'A')),
  timer(2000).pipe(map(() => 'B'))
]).subscribe(v => console.log(v));
// 'A' after 1s (fastest wins, B unsubscribed)
```

**Use case for `race()`**: Timeout pattern — race between HTTP request and a timer:
```typescript
race([
  this.http.get('/api/data'),
  timer(5000).pipe(switchMap(() => throwError(() => new Error('Timeout'))))
]);
```

---

### Q72. Explain this code's behavior: (Advanced)

```typescript
defer(() => {
  console.log('factory called');
  return from(fetch('/api/data'));
}).pipe(
  shareReplay(1)
).subscribe(v => console.log('sub1:', v));
```

**Answer**:

1. `defer()` factory is called on first subscription → logs "factory called"
2. `fetch('/api/data')` fires (eager inside factory, but factory is lazy)
3. Response arrives → `sub1:` logs the response
4. `shareReplay(1)` caches the result
5. Any future subscriber gets the cached value without calling the factory again

If `shareReplay` wasn't there, each subscriber would call the factory → each would fire a new `fetch`.

---

### Q73. What is the output order? (Advanced)

```typescript
console.log('A');
of(1).subscribe(v => console.log('B:', v));
from(Promise.resolve(2)).subscribe(v => console.log('C:', v));
timer(0).subscribe(v => console.log('D:', v));
console.log('E');
```

**Answer**:
```
A
B: 1     ← of() is synchronous
E        ← synchronous code continues
C: 2     ← Promise resolves in microtask
D: 0     ← timer(0) uses setTimeout (macrotask)
```

Execution order: synchronous → microtasks → macrotasks.

---

### Q74. Design an Observable that retries a network request 3 times with exponential backoff using creation operators. (Advanced)

**Answer**:

```typescript
function fetchWithBackoff<T>(url: string): Observable<T> {
  return defer(() => inject(HttpClient).get<T>(url)).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) =>
        timer(Math.min(1000 * 2 ** (retryCount - 1), 10_000))
    })
  );
}
// Retry 1: wait 1s → Retry 2: wait 2s → Retry 3: wait 4s → error if still failing
```

Creation operators used: `defer()` (lazy request), `timer()` (delay between retries).

---

## 8. System Design & Angular Patterns

### Q75. Design an API polling service using creation operators. Requirements: immediate first fetch, configurable interval, pause on tab hidden, stop on error after 3 retries. (Expert)

**Answer**:

```typescript
@Injectable({ providedIn: 'root' })
export class PollingService {
  private http = inject(HttpClient);

  poll<T>(url: string, intervalMs = 30_000): Observable<T> {
    const visible$ = typeof document !== 'undefined'
      ? fromEvent(document, 'visibilitychange').pipe(
          map(() => document.visibilityState === 'visible'),
          startWith(true)
        )
      : of(true); // SSR fallback

    return visible$.pipe(
      switchMap(visible => visible
        ? timer(0, intervalMs).pipe(
            switchMap(() => defer(() => this.http.get<T>(url)).pipe(
              retry({ count: 3, delay: (_, i) => timer(1000 * 2 ** (i - 1)) }),
              catchError(err => {
                console.error(`Polling ${url} failed after 3 retries:`, err);
                return EMPTY; // Skip this poll cycle
              })
            ))
          )
        : EMPTY
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
```

**Creation operators used**: `fromEvent` (visibility), `timer` (polling + retry delay), `defer` (lazy HTTP), `of` (SSR fallback), `EMPTY` (pause/error skip).

---

### Q76. How would you build a typeahead component using only creation operators and basic pipeable operators? (Expert)

**Answer**:

```typescript
@Component({ ... })
export class TypeaheadComponent implements AfterViewInit {
  @ViewChild('input') inputRef!: ElementRef<HTMLInputElement>;
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  results = signal<SearchResult[]>([]);
  loading = signal(false);

  ngAfterViewInit() {
    fromEvent<Event>(this.inputRef.nativeElement, 'input').pipe(
      map(e => (e.target as HTMLInputElement).value.trim()),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.loading.set(true)),
      switchMap(query =>
        query.length < 2
          ? defer(() => of([]))  // defer not strictly needed here, but consistent
          : defer(() => this.http.get<SearchResult[]>(`/api/search?q=${query}`)).pipe(
              catchError(() => of([]))
            )
      ),
      tap(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => this.results.set(results));
  }
}
```

**Creation operators**: `fromEvent` (keystroke capture), `of` (empty fallback), `defer` (lazy HTTP).

---

### Q77. You're building an app initialization that must load config, feature flags, and user profile before rendering. Design the loading strategy. (Expert)

**Answer**:

```typescript
// app.config.ts
export function initializeApp(): Observable<void> {
  const http = inject(HttpClient);

  return forkJoin({
    config: http.get<Config>('/api/config'),
    flags: http.get<FeatureFlags>('/api/flags')
  }).pipe(
    tap(({ config, flags }) => {
      inject(ConfigService).init(config);
      inject(FeatureFlagService).init(flags);
    }),
    switchMap(() =>
      // User profile depends on config (has API base URL)
      defer(() => http.get<User>('/api/me')).pipe(
        retry({ count: 2, delay: () => timer(1000) }),
        catchError(() => of(null)) // Allow anonymous access
      )
    ),
    tap(user => inject(UserService).init(user)),
    map(() => void 0)
  );
}

// APP_INITIALIZER
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const init = initializeApp();
        return () => firstValueFrom(init);
      },
      multi: true
    }
  ]
};
```

**Strategy**: `forkJoin` loads config + flags in parallel → `switchMap` loads user (depends on config) → `retry` with `timer` for resilience.

---

### Q78. Compare the performance implications of `interval(16)` vs `timer(0, 16)` vs `animationFrameScheduler` for animations. (Expert)

**Answer**:

| Approach | Mechanism | Frame sync | CPU when hidden | First frame |
|----------|-----------|-----------|-----------------|-------------|
| `interval(16)` | `setInterval` | No — can drift | Continues running | After 16ms |
| `timer(0, 16)` | `setTimeout` | No — can drift | Continues running | Immediately |
| `interval(0, animationFrameScheduler)` | `rAF` | Yes — synced to display | Paused by browser | Next paint |

```typescript
// Best for animation:
interval(0, animationFrameScheduler).pipe(
  scan(acc => acc + 1, 0), // frame counter
  takeWhile(frame => frame < 120) // 2 seconds at 60fps
).subscribe(frame => this.render(frame));
```

`animationFrameScheduler` is preferred because:
- Syncs with display refresh rate (avoids tearing)
- Automatically pauses when tab is hidden (saves battery/CPU)
- Provides smooth 60fps updates

---

### Q79. How do creation operators differ in their teardown behavior? Fill in the table. (Advanced)

**Answer**:

| Operator | Has teardown? | What cleanup? |
|----------|:------------:|---------------|
| `of()` | No | None needed (sync, completes immediately) |
| `from(array)` | No | None needed (sync) |
| `from(promise)` | No | Cannot cancel Promise |
| `interval()` | **Yes** | `clearInterval()` |
| `timer()` | **Yes** | `clearTimeout()` |
| `fromEvent()` | **Yes** | `removeEventListener()` |
| `defer()` | Depends | Delegates to inner Observable |
| `range()` | No | None needed (sync) |
| `generate()` | No | None needed (sync) |

Key insight: Only async creation operators that allocate resources (timers, event listeners) need teardown. Sync operators complete before unsubscription could happen.

---

### Q80. You need to build a "race condition detector" — an Observable that warns if two API calls overlap. Design it using creation operators. (Expert)

**Answer**:

```typescript
function createRaceDetector(name: string) {
  let inFlight = 0;

  return function <T>(source$: Observable<T>): Observable<T> {
    return defer(() => {
      inFlight++;
      if (inFlight > 1) {
        console.warn(`[RaceDetector] ${name}: ${inFlight} concurrent requests detected!`);
      }

      return source$.pipe(
        finalize(() => inFlight--)
      );
    });
  };
}

// Usage
this.http.get('/api/users').pipe(
  createRaceDetector('UserAPI')
).subscribe();

// If called again before first completes:
// [RaceDetector] UserAPI: 2 concurrent requests detected!
```

**Creation operators used**: `defer()` (per-subscription side effect tracking). This pattern helps detect bugs where `switchMap` or `exhaustMap` should have been used.

---

## Quick Reference: Study Checklist

| Topic | Questions | Status |
|-------|----------|--------|
| of() | Q1–Q10 | [ ] |
| from() | Q11–Q22 | [ ] |
| interval() & timer() | Q23–Q36 | [ ] |
| fromEvent() | Q37–Q48 | [ ] |
| defer() | Q49–Q58 | [ ] |
| range() & generate() | Q59–Q66 | [ ] |
| Cross-Topic & Combinations | Q67–Q74 | [ ] |
| System Design & Angular | Q75–Q80 | [ ] |

---

> **Next →** [RxJS Operators — Transformation](./RXJS_OPERATORS_TRANSFORMATION_INTERVIEW_QA.md)
