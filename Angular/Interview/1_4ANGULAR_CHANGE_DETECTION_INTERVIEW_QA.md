# Angular Change Detection — Interview Questions & Answers

> **Phase 1 · Section 4** — 115 questions from beginner to expert
> Organized by subtopic · Targeting Angular 21 · FAANG-level depth

---

## Table of Contents

1. [Zone.js Fundamentals (Q1–Q12)](#1-zonejs-fundamentals)
2. [Default vs OnPush Strategies (Q13–Q28)](#2-default-vs-onpush-strategies)
3. [ChangeDetectorRef Methods (Q29–Q42)](#3-changedetectorref-methods)
4. [NgZone & Running Outside Angular (Q43–Q54)](#4-ngzone--running-outside-angular)
5. [Performance Implications (Q55–Q66)](#5-performance-implications)
6. [Signals & Change Detection (Q67–Q78)](#6-signals--change-detection)
7. [Cross-Topic Scenario Questions (Q79–Q85)](#7-cross-topic-scenario-questions)
8. [System Design & Architecture (Q86–Q90)](#8-system-design--architecture)
9. [Zoneless Angular — Deep Dive (Q91–Q105)](#9-zoneless-angular--deep-dive-q91q105)
10. [Advanced Signal CD Patterns (Q106–Q115)](#10-advanced-signal-cd-patterns-q106q115)

---

## 1. Zone.js Fundamentals

### Q1. What is Zone.js and why does Angular use it? (Beginner)

**Answer**: Zone.js is a library that monkey-patches browser async APIs (`setTimeout`, `Promise`, `addEventListener`, `fetch`, `XMLHttpRequest`, etc.) to create execution contexts called "zones." Angular uses it to automatically detect when async operations complete so it can trigger change detection without developers manually telling Angular when state has changed.

Angular creates its own zone called `NgZone`. When any async callback fires inside this zone, Angular's `ApplicationRef.tick()` is called, which walks the component tree and updates the DOM where bindings have changed.

---

### Q2. List at least 5 browser APIs that Zone.js patches. (Beginner)

**Answer**:
1. `setTimeout` / `clearTimeout`
2. `setInterval` / `clearInterval`
3. `Promise.then` / `Promise.catch` / `Promise.finally`
4. `addEventListener` / `removeEventListener`
5. `XMLHttpRequest` (open, send)
6. `fetch`
7. `requestAnimationFrame`
8. `MutationObserver`
9. `queueMicrotask`

---

### Q3. Name at least 3 browser APIs that Zone.js does NOT patch. Why does this matter? (Intermediate)

**Answer**:
- `ResizeObserver`
- `IntersectionObserver`
- `WebSocket` (partially — connection events are patched but message handling varies)
- Web Audio API callbacks
- WebGL rendering callbacks
- `PerformanceObserver`

This matters because callbacks from these APIs fire **outside** Angular's zone. Angular won't know about state changes inside these callbacks, so the DOM won't update. You must either:
1. Wrap the callback in `NgZone.run()`, or
2. Use signals (which notify Angular regardless of zone), or
3. Call `ChangeDetectorRef.detectChanges()` manually

---

### Q4. Explain the difference between microtasks and macrotasks in Zone.js context. (Intermediate)

**Answer**:
- **Microtasks**: `Promise.then`, `queueMicrotask`, `MutationObserver`. They execute after the current synchronous code completes but before the browser renders or processes the next macrotask. Zone.js triggers CD when the microtask queue empties.
- **Macrotasks**: `setTimeout`, `setInterval`, `requestAnimationFrame`, `XMLHttpRequest`. They are scheduled in the browser's event loop. Each macrotask callback can trigger a CD cycle.

Zone.js tracks both queues. Angular triggers CD primarily when the microtask queue drains (`onMicrotaskEmpty` event), which coalesces multiple synchronous changes into a single CD cycle.

---

### Q5. What is the `onHasTask` hook in Zone.js? How does Angular use it? (Advanced)

**Answer**: `onHasTask` is a Zone.js lifecycle hook that fires when the task tracking state changes — specifically when the zone transitions from having tasks to having no tasks (or vice versa). It receives a `HasTaskState` object with `macroTask`, `microTask`, `eventTask`, and `change` properties.

Angular's `NgZone` uses this hook to detect when all pending async work is complete. When `microTask` and `macroTask` are both false, it emits `onMicrotaskEmpty` and `onStable` events. `ApplicationRef` subscribes to `onMicrotaskEmpty` to trigger `tick()`, which runs change detection.

---

### Q6. What is the bundle size impact of Zone.js? How can you measure it? (Intermediate)

**Answer**: Zone.js adds approximately **35KB minified** (~13KB gzipped) to the bundle. You can measure it by:
1. `webpack-bundle-analyzer` — visualizes bundle composition
2. `source-map-explorer` — shows per-module sizes
3. Comparing build output with and without Zone.js in polyfills
4. Angular 21's build output shows the polyfills chunk size which is dominated by Zone.js

---

### Q7. How does Zone.js handle `async/await`? (Advanced)

**Answer**: Native `async/await` compiles to `Promise` usage in older targets (ES5/ES2015), so Zone.js patches work through Promise interception. However, with modern targets (ES2017+), the browser may handle `async/await` natively, which Zone.js intercepts through its `Promise` patch since `await` internally uses Promises.

The key concern is when `async/await` is used with Zone.js-unpatched APIs (like `ResizeObserver`). The `await` itself is patched, but the source observable event that triggers the async function may not be.

---

### Q8. Explain event coalescing in Angular. What problem does it solve? (Intermediate)

**Answer**: Event coalescing (enabled by default in Angular 21 via `provideZoneChangeDetection({ eventCoalescing: true })`) batches multiple events that fire within the same browser event loop tick into a single CD cycle.

Without coalescing, if a click handler triggers a synchronous chain that fires multiple events (e.g., focus change, value change, blur), each event would trigger a separate CD cycle. With coalescing, all events in the same tick produce just one CD cycle, reducing unnecessary rendering.

---

### Q9. Can you configure which APIs Zone.js patches? How? (Advanced)

**Answer**: Yes, via Zone.js configuration flags set **before** Zone.js loads:

```typescript
// In polyfills.ts or a script loaded before zone.js
(window as any).__Zone_disable_requestAnimationFrame = true;
(window as any).__Zone_disable_timers = true;
(window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'mousemove'];
```

You can also use `zone.js/plugins/zone-patch-*` to selectively patch only what you need. This is an advanced optimization to reduce Zone.js overhead for high-frequency events you don't need triggering CD.

---

### Q10. What happens when an error is thrown inside a Zone.js callback? (Intermediate)

**Answer**: Zone.js catches the error via its `onHandleError` hook. Angular's `NgZone` uses this to forward errors to Angular's `ErrorHandler` service. The error is logged but doesn't crash the application by default. However, the CD cycle that was in progress may produce inconsistent state.

In production, you should implement a custom `ErrorHandler` to report errors to monitoring services (Sentry, LogRocket). The default handler just logs to console.

---

### Q11. How does Zone.js affect unit testing in Angular? (Intermediate)

**Answer**: Zone.js provides `fakeAsync` and `tick` test utilities that let you control async timing in tests:

```typescript
it('should update after timeout', fakeAsync(() => {
  component.startTimer();
  tick(1000);  // Advance virtual time by 1 second
  expect(component.value).toBe(expected);
}));
```

`fakeAsync` creates a special zone that tracks all timers and microtasks. `tick()` advances the virtual clock. `flush()` drains all pending macrotasks. `flushMicrotasks()` drains only microtasks. This makes async code testable synchronously.

---

### Q12. What is the relationship between Zone.js and Angular's `isStable` observable? (Advanced)

**Answer**: `ApplicationRef.isStable` is an Observable that emits `true` when Angular's zone has no pending microtasks or macrotasks. It relies on Zone.js's task tracking.

This is critical for:
- **SSR**: Angular Universal waits for `isStable` to serialize the rendered HTML
- **E2E testing**: Protractor/Playwright use it to know when Angular is done processing
- **Service Workers**: Angular's service worker registration waits for `isStable`

A common bug is having a `setInterval` that never clears — this prevents `isStable` from ever emitting `true`, breaking SSR and E2E tests.

---

## 2. Default vs OnPush Strategies

### Q13. Explain the Default change detection strategy. When is every component checked? (Beginner)

**Answer**: With Default strategy, Angular checks **every component** in the tree from root to leaves during each CD cycle. A CD cycle is triggered whenever Zone.js detects an async operation completing (click event, HTTP response, timer, etc.).

Every template expression is re-evaluated, every binding is compared with its previous value, and the DOM is updated where changes are detected. This is simple but wasteful for large applications.

---

### Q14. Explain the OnPush change detection strategy. What conditions trigger a check? (Beginner)

**Answer**: OnPush tells Angular to skip checking a component (and its entire subtree) unless one of these conditions is met:

1. An `@Input()` or `input()` signal receives a **new reference** (not mutation)
2. A DOM event bound in the template fires (click, keyup, etc.)
3. The `async` pipe receives a new value
4. A signal read in the template changes (Angular 17+)
5. `ChangeDetectorRef.markForCheck()` is called
6. `ChangeDetectorRef.detectChanges()` is called

---

### Q15. Why doesn't object mutation trigger OnPush? Explain with an example. (Beginner)

**Answer**: OnPush uses **reference equality** (`===`) to compare input values. Mutating an object changes its internal state but not its reference.

```typescript
// Parent component
user = { name: 'Alice', age: 30 };

updateUser() {
  this.user.name = 'Bob';  // Same reference → OnPush child won't detect
}

// Fix:
updateUser() {
  this.user = { ...this.user, name: 'Bob' };  // New reference → OnPush detects
}
```

This is why OnPush encourages immutable data patterns.

---

### Q16. Can an OnPush component be checked even if none of its inputs changed? How? (Intermediate)

**Answer**: Yes, in several ways:
1. A DOM event fires within the component's template
2. `markForCheck()` is called (e.g., by `async` pipe)
3. `detectChanges()` is called manually
4. A signal read in the template changes its value
5. A child component triggers an event that bubbles up

The most common case is the `async` pipe: it subscribes to an Observable and calls `markForCheck()` internally whenever a new value arrives, triggering CD on the OnPush component.

---

### Q17. What happens to child components when a parent OnPush component is skipped? (Intermediate)

**Answer**: The **entire subtree** is skipped. If a parent OnPush component is not dirty, Angular does not descend into any of its children, regardless of the children's own CD strategy. Even a child with Default strategy won't be checked if its OnPush parent is skipped.

This is why OnPush is most effective when applied consistently throughout the component tree.

---

### Q18. How does the `async` pipe work with OnPush? (Intermediate)

**Answer**: The `async` pipe:
1. Subscribes to the Observable/Promise in `ngOnInit`
2. Stores the latest emitted value
3. Calls `ChangeDetectorRef.markForCheck()` on every emission
4. Returns the stored value to the template
5. Unsubscribes in `ngOnDestroy`

Because it calls `markForCheck()`, it works perfectly with OnPush — each new emission marks the component dirty, and Angular checks it on the next CD cycle.

---

### Q19. Compare OnPush behavior with `@Input()` decorator vs `input()` signal. (Intermediate)

**Answer**:
- **`@Input()` decorator**: OnPush checks if the input reference changed using `===`. If the parent passes the same object reference (even if mutated), OnPush skips the component.
- **`input()` signal**: Returns a `Signal<T>`. When the parent passes a new value, the signal updates. If the template reads `input()()`, Angular's signal tracking marks the component dirty automatically. This is more reliable because signals also work with zoneless change detection.

Signal inputs also support `transform` functions and are type-safe at the template level.

---

### Q20. What is the `ExpressionChangedAfterItHasBeenCheckedError`? When does it occur? (Intermediate)

**Answer**: This error occurs in **development mode only** when Angular detects that a template binding's value changed between the first and second CD check. Angular runs CD twice in dev mode to enforce unidirectional data flow.

Common causes:
1. A getter/function that returns a new object each call
2. Modifying parent state in a child's lifecycle hook
3. Calling `detectChanges()` in `ngAfterViewInit` that changes a parent binding
4. Using `Date.now()` or `Math.random()` in templates

Fix: Ensure bindings return stable values during a single CD cycle.

---

### Q21. Does OnPush prevent a component from being destroyed and recreated? (Beginner)

**Answer**: No. OnPush only controls whether Angular **checks bindings** during a CD cycle. It doesn't affect component creation/destruction. If a parent's `@if` or `@for` removes the component from the DOM, it's destroyed regardless of its CD strategy.

---

### Q22. How do structural directives (`@if`, `@for`) interact with OnPush? (Intermediate)

**Answer**: Structural control flow (`@if`, `@for`, `@switch`) runs during the **parent's** CD check. If the parent is OnPush and is being checked, Angular evaluates the control flow conditions. If the condition changes, components are created/destroyed accordingly.

If the parent OnPush component is **skipped**, the control flow conditions are NOT re-evaluated, so child components won't be created/destroyed even if the underlying data changed.

---

### Q23. Should you use OnPush on EVERY component? Are there downsides? (Intermediate)

**Answer**: For production applications, yes — OnPush should be the default. The Angular team recommends it as best practice.

Potential downsides:
- **Learning curve**: Developers must understand immutability and reference equality
- **Mutation bugs**: Existing code that relies on object mutation will break silently
- **Manual CD**: Some edge cases require `markForCheck()` or `detectChanges()`
- **Third-party components**: Some libraries may not work correctly with OnPush parents

The benefits (performance, predictability, zoneless readiness) far outweigh the downsides.

---

### Q24. How does OnPush interact with `@ViewChild` / `viewChild()`? (Advanced)

**Answer**: `@ViewChild` / `viewChild()` provides a reference to a child component instance. With OnPush:
- Reading child state via `viewChild()` signal works in the template — signals auto-track
- Reading child properties directly (e.g., `child.value`) in the parent template only updates when the parent is checked
- Calling methods on the child doesn't automatically trigger the parent's CD

If a parent OnPush component reads a child's non-signal property in its template, it won't update unless the parent itself is triggered for CD.

---

### Q25. Explain the dirty-checking path when `markForCheck()` is called on a deeply nested OnPush component. (Advanced)

**Answer**: When `markForCheck()` is called on a nested component:

```
Root        ← marked dirty
  └── A     ← marked dirty
    └── B   ← marked dirty
      └── C ← markForCheck() called here
```

Angular walks UP from C to Root, marking each ancestor as "dirty." On the next CD cycle, Angular traverses DOWN from Root. Because Root is dirty, it checks A. Because A is dirty, it checks B. Because B is dirty, it checks C. Without this upward marking, A and B (being OnPush) would have been skipped, and C would never be reached.

---

### Q26. How does `@defer` interact with OnPush change detection? (Advanced)

**Answer**: `@defer` blocks create lazy-loaded component boundaries. The defer block itself is evaluated during the parent's CD check. Once the trigger condition is met (viewport, idle, timer, interaction), the lazy component is loaded and rendered.

The lazy component's CD strategy is independent of the defer block. If the lazy component uses OnPush, it follows standard OnPush rules. The `@placeholder`, `@loading`, and `@error` templates are checked as part of the parent's CD.

---

### Q27. What is "local change detection" and how does it relate to OnPush? (Expert)

**Answer**: Local change detection is an evolving concept in Angular (experimental in later versions) where CD is scoped to individual components rather than requiring tree traversal. Instead of marking ancestors dirty and traversing down, local CD only re-renders the specific component whose state changed.

Signals enable this because they create a direct dependency graph: signal → component. When a signal changes, Angular can dirty-mark only the components that read that signal, without walking up to the root. This is the future of Angular CD and makes OnPush's tree-based dirty marking obsolete.

---

### Q28. How do you migrate a large Default CD codebase to OnPush? What's the strategy? (Expert)

**Answer**:

1. **Bottom-up approach**: Start with leaf components (no children). Add `ChangeDetectionStrategy.OnPush` and verify they still work. Leaf components are safest because they can't break children.

2. **Audit mutations**: Search for patterns like `this.array.push()`, `this.obj.prop = value`. Replace with immutable patterns or signals.

3. **Audit subscriptions**: Find manual `.subscribe()` calls. Ensure they use `async` pipe or call `markForCheck()`.

4. **Signal migration**: Convert `@Input()` to `input()`, properties to `signal()`, derived values to `computed()`.

5. **Test each component**: Run existing tests after adding OnPush. Broken tests reveal mutation dependencies.

6. **Move upward**: Once leaves work, move to their parents, then grandparents, working toward root.

7. **Lint rule**: Add a lint rule requiring OnPush on all new components.

---

## 3. ChangeDetectorRef Methods

### Q29. What is `ChangeDetectorRef` and how do you obtain it? (Beginner)

**Answer**: `ChangeDetectorRef` is an abstract class that gives you direct control over a component's change detection. Each component has its own instance. You obtain it via dependency injection:

```typescript
private cdr = inject(ChangeDetectorRef);
// or
constructor(private cdr: ChangeDetectorRef) {}
```

---

### Q30. What does `detectChanges()` do? When would you use it? (Beginner)

**Answer**: `detectChanges()` synchronously runs change detection on the current component and all its children, immediately updating the DOM. Use it when:
- You've updated state outside Angular's zone and need immediate DOM update
- You're in a `detach()`-ed component and need a manual refresh
- You need synchronous DOM update (e.g., measuring DOM after state change)

```typescript
this.data = newValue;
this.cdr.detectChanges();
// DOM is now updated — can measure elements
const height = this.element.nativeElement.offsetHeight;
```

---

### Q31. What does `markForCheck()` do? How is it different from `detectChanges()`? (Beginner)

**Answer**:
- `markForCheck()`: Marks the component AND all ancestors as dirty. Does NOT run CD immediately. The actual rendering happens on the next CD cycle (next tick).
- `detectChanges()`: Runs CD immediately and synchronously on this component and children only. Does NOT mark ancestors.

Key difference: `markForCheck()` is asynchronous (batches with next tick), `detectChanges()` is synchronous (runs NOW).

---

### Q32. What does `detach()` do? Give a real-world use case. (Intermediate)

**Answer**: `detach()` completely removes the component from Angular's CD tree. Angular will never check this component during normal CD cycles.

Real-world use case: A stock ticker widget that receives updates every 100ms but only needs to display updates every 5 seconds:

```typescript
ngOnInit() {
  this.cdr.detach();
  setInterval(() => {
    this.cdr.detectChanges();  // Manual update every 5s
  }, 5000);
}
```

This avoids checking the component on every Zone.js-triggered CD cycle while still allowing periodic updates.

---

### Q33. What happens if you call `detectChanges()` on a detached component? (Intermediate)

**Answer**: It works — `detectChanges()` runs CD on the component and its children regardless of whether the component is attached or detached. This is the intended pattern: detach the component to remove it from automatic CD, then manually call `detectChanges()` when you know the component needs to update.

---

### Q34. Can calling `detectChanges()` cause `ExpressionChangedAfterItHasBeenCheckedError`? (Advanced)

**Answer**: Yes. If you call `detectChanges()` inside a lifecycle hook like `ngAfterViewInit`, it triggers a CD cycle within another CD cycle. If this causes a parent binding to change, the second dev-mode check will detect the discrepancy and throw the error.

Common fix: Wrap the `detectChanges()` call in a `setTimeout` or use `afterNextRender`:

```typescript
afterNextRender(() => {
  this.measuredHeight = this.el.nativeElement.offsetHeight;
  this.cdr.detectChanges();
});
```

---

### Q35. What is `reattach()`? When is it useful? (Intermediate)

**Answer**: `reattach()` reverses `detach()`, adding the component back into Angular's normal CD tree. Useful when a previously static component needs to become dynamic again:

```typescript
// User opens edit mode → reattach for live updates
onEdit() {
  this.cdr.reattach();
  this.editing = true;
}

// User saves → detach for performance
onSave() {
  this.cdr.detach();
  this.editing = false;
  this.cdr.detectChanges(); // One last update
}
```

---

### Q36. What is `checkNoChanges()`? When would you use it? (Advanced)

**Answer**: `checkNoChanges()` is a dev-mode utility that verifies no bindings have changed since the last CD check. It throws `ExpressionChangedAfterItHasBeenCheckedError` if any have.

Angular calls this automatically in dev mode (the "second check"). You might call it manually in unit tests to verify your component doesn't violate unidirectional data flow:

```typescript
it('should not cause change-after-check errors', () => {
  fixture.detectChanges();
  expect(() => fixture.checkNoChanges()).not.toThrow();
});
```

---

### Q37. Is it safe to call `markForCheck()` from within `ngOnChanges`? (Intermediate)

**Answer**: It's safe but usually unnecessary. `ngOnChanges` fires when inputs change, which already triggers CD for OnPush components (since input reference changed). Calling `markForCheck()` here is redundant.

The exception: if you're subscribing to a new Observable inside `ngOnChanges` based on an input change, you might need `markForCheck()` for the async callback:

```typescript
ngOnChanges(changes: SimpleChanges) {
  if (changes['userId']) {
    this.userService.getUser(this.userId).subscribe(user => {
      this.user = user;
      this.cdr.markForCheck();  // Needed here
    });
  }
}
```

---

### Q38. What happens if you call `detectChanges()` in a loop? (Advanced)

**Answer**: Each call triggers a full synchronous CD cycle on the component subtree. In a tight loop, this means:
- Multiple DOM reads and writes (layout thrashing)
- Repeated template expression evaluation
- Lifecycle hooks (`ngDoCheck`, `ngAfterContentChecked`, `ngAfterViewChecked`) fire multiple times
- Severe performance degradation

Always batch changes and call `detectChanges()` once:

```typescript
// ❌ Bad
for (const item of items) {
  this.data.push(item);
  this.cdr.detectChanges();
}

// ✅ Good
this.data.push(...items);
this.cdr.detectChanges();
```

---

### Q39. How do signals reduce the need for ChangeDetectorRef? (Intermediate)

**Answer**: Signals automatically notify Angular when their values change, eliminating most manual CD triggers:

| Scenario | Without Signals | With Signals |
|----------|----------------|-------------|
| Async data | `markForCheck()` in subscribe | `signal.set()` — auto |
| Computed values | Pipe or getter + markForCheck | `computed()` — auto |
| Outside zone | `detectChanges()` or `ngZone.run()` | `signal.set()` — auto |
| Timer updates | `markForCheck()` in callback | `signal.update()` — auto |

The only remaining use case for manual `detectChanges()` is when you need synchronous DOM measurement.

---

### Q40. Compare `markForCheck()` vs `ngZone.run()` for triggering CD from outside the zone. (Advanced)

**Answer**:
- `ngZone.run(fn)`: Executes `fn` inside Angular's zone, which triggers `ApplicationRef.tick()` → full CD cycle from root. All components are checked (or all dirty OnPush components).
- `markForCheck()`: Only marks the specific component and ancestors as dirty. Requires a CD cycle to actually render — which won't happen automatically if you're outside the zone.

For outside-zone scenarios:
```typescript
// Option 1: Re-enter zone (triggers full tick)
this.ngZone.run(() => { this.data = newValue; });

// Option 2: markForCheck (need to also trigger tick)
this.data = newValue;
this.cdr.markForCheck();
// Still need something to trigger tick...

// Option 3: detectChanges (works alone, synchronous)
this.data = newValue;
this.cdr.detectChanges();

// Option 4: Use a signal (best — works everywhere)
this.data.set(newValue);
```

---

### Q41. What is the internal implementation of `markForCheck()`? (Expert)

**Answer**: Internally, `markForCheck()` walks up the view hierarchy (LView tree) from the current component to the root, setting a "dirty" flag on each view. The simplified logic:

```
function markForCheck(view: LView): void {
  let current = view;
  while (current) {
    current[FLAGS] |= LViewFlags.Dirty;
    current = current[PARENT];
  }
}
```

During the next `tick()`, Angular's `refreshView()` function checks these flags. When it encounters a dirty OnPush component, it proceeds to check it. When it encounters a clean OnPush component, it skips the entire subtree.

---

### Q42. Can you use `ChangeDetectorRef` in a service? (Advanced)

**Answer**: No. `ChangeDetectorRef` is bound to a specific component view. It's only available via injection in components, directives, and pipes — not in services.

If a service needs to trigger CD, it should:
1. Expose a signal that components read
2. Use a `Subject` that components subscribe to via `async` pipe
3. Inject `ApplicationRef` and call `applicationRef.tick()` (global CD trigger — use sparingly)
4. Accept a `ChangeDetectorRef` as a parameter from the calling component (anti-pattern)

---

## 4. NgZone & Running Outside Angular

### Q43. What is `NgZone`? How does it differ from raw Zone.js? (Beginner)

**Answer**: `NgZone` is Angular's wrapper around Zone.js that manages two zones:
1. **Angular zone** (`_inner`): Where Angular code runs. Async events here trigger CD.
2. **Outer zone** (`_outer`): The parent zone. Async events here do NOT trigger CD.

`NgZone` adds Angular-specific behavior: emitting `onMicrotaskEmpty`, `onStable`, `onUnstable` events, and connecting to `ApplicationRef.tick()`.

---

### Q44. What does `ngZone.runOutsideAngular()` do? (Beginner)

**Answer**: It executes a function in the outer zone, outside Angular's change detection zone. Any async operations started inside this function (setTimeout, addEventListener, requestAnimationFrame) will NOT trigger Angular CD cycles.

Use it for performance-critical code that doesn't need to update the UI: animations, canvas rendering, scroll handlers, polling, etc.

---

### Q45. How do you re-enter Angular's zone after running outside it? (Beginner)

**Answer**: Use `ngZone.run()`:

```typescript
this.ngZone.runOutsideAngular(() => {
  someExternalLib.onCallback((data) => {
    // Back to Angular zone:
    this.ngZone.run(() => {
      this.result.set(data);  // CD will trigger
    });
  });
});
```

`ngZone.run()` executes the callback inside Angular's zone, causing `ApplicationRef.tick()` to fire afterward.

---

### Q46. What is the difference between `ngZone.run()` and `ngZone.runTask()`? (Advanced)

**Answer**:
- `ngZone.run()`: Executes a function inside Angular's zone. It's the public API for re-entering the zone.
- `ngZone.runTask()`: A lower-level Zone.js API for executing a previously scheduled task. Not part of Angular's public API.

For application code, always use `ngZone.run()`. `runTask` is used internally by Zone.js's task scheduling mechanism.

---

### Q47. When should you use `runOutsideAngular` for scroll events? (Intermediate)

**Answer**: When you have scroll-based logic that runs frequently but doesn't need to update Angular UI on every scroll event:

```typescript
ngAfterViewInit() {
  this.ngZone.runOutsideAngular(() => {
    window.addEventListener('scroll', () => {
      // Runs ~60 times/second — no CD triggered
      const scrollY = window.scrollY;

      if (scrollY > 500 && !this.headerCollapsed) {
        this.headerCollapsed = true;
        this.ngZone.run(() => {
          this.isCollapsed.set(true);  // Update UI only on threshold
        });
      }
    });
  });
}
```

This avoids 60 CD cycles per second while still updating the UI when a threshold is crossed.

---

### Q48. How does `NgZone.isStable` work and when would you check it? (Intermediate)

**Answer**: `NgZone.isStable` is a boolean that's `true` when the Angular zone has no pending microtasks or macrotasks. `ApplicationRef.isStable` is an Observable version.

Check it when:
- **SSR**: Wait for stability before serializing HTML
- **E2E tests**: Wait for stability before assertions
- **Performance monitoring**: Track how long until stability after route change
- **Service Worker registration**: Register after app stabilizes

```typescript
inject(ApplicationRef).isStable.pipe(
  first(stable => stable === true)
).subscribe(() => {
  console.log('App is stable — safe to perform background work');
});
```

---

### Q49. What is `NgZone.runGuarded()`? (Advanced)

**Answer**: `runGuarded()` is similar to `run()` but wraps the execution in a try-catch within the zone. If an error occurs, it's handled by the zone's `onHandleError` hook (which Angular routes to `ErrorHandler`).

Use it when executing code that might throw and you want Angular's error handling to catch it:

```typescript
this.ngZone.runGuarded(() => {
  riskyOperation();  // If throws, ErrorHandler catches it
});
```

---

### Q50. How do third-party libraries like Google Maps interact with Angular's zone? (Intermediate)

**Answer**: Libraries like Google Maps register their own event listeners and callbacks. If initialized inside Angular's zone, every map event (pan, zoom, tile load) triggers CD, potentially causing hundreds of unnecessary cycles.

Best practice: Initialize outside Angular's zone:

```typescript
ngAfterViewInit() {
  this.ngZone.runOutsideAngular(() => {
    this.map = new google.maps.Map(this.mapEl.nativeElement, options);
    this.map.addListener('click', (event) => {
      this.ngZone.run(() => {
        this.selectedLocation.set(event.latLng);
      });
    });
  });
}
```

---

### Q51. Explain the difference between `onStable` and `onMicrotaskEmpty`. (Advanced)

**Answer**:
- `onMicrotaskEmpty`: Fires when the microtask queue drains. This is when `ApplicationRef.tick()` runs. It can fire multiple times during a single stabilization cycle if new microtasks are queued.
- `onStable`: Fires when the zone transitions from unstable (has pending tasks) to stable (no pending tasks). This fires once after all micro and macro tasks complete.

`onMicrotaskEmpty` is more granular and fires more frequently. `onStable` fires only when truly idle.

---

### Q52. What happens if you nest `runOutsideAngular` calls? (Advanced)

**Answer**: The outermost `runOutsideAngular` establishes the execution context. Nesting has no additional effect — you're already outside Angular's zone:

```typescript
this.ngZone.runOutsideAngular(() => {
  // Outside zone
  this.ngZone.runOutsideAngular(() => {
    // Still outside zone — no change
  });
});
```

However, nesting `run()` inside `runOutsideAngular()` DOES switch back:

```typescript
this.ngZone.runOutsideAngular(() => {
  // Outside zone
  this.ngZone.run(() => {
    // Inside zone again
  });
  // Back outside zone
});
```

---

### Q53. How do Web Workers interact with NgZone? (Advanced)

**Answer**: Web Workers run in a separate thread and are not patched by Zone.js (they have their own execution context). Messages from Web Workers arrive via `postMessage`, which is patched in the main thread.

So: `worker.onmessage` callbacks fire inside Angular's zone by default. If the worker sends frequent messages, wrap the listener:

```typescript
this.ngZone.runOutsideAngular(() => {
  this.worker.onmessage = (event) => {
    this.buffer.push(event.data);
    if (this.buffer.length >= BATCH_SIZE) {
      this.ngZone.run(() => {
        this.results.set([...this.buffer]);
        this.buffer = [];
      });
    }
  };
});
```

---

### Q54. How would you profile Zone.js overhead in a production app? (Expert)

**Answer**:
1. **Chrome DevTools Performance tab**: Record a session, look for Zone.js frames in the flame chart
2. **Custom instrumentation**: Wrap `ApplicationRef.tick()` to measure duration:
   ```typescript
   const originalTick = appRef.tick.bind(appRef);
   let tickCount = 0;
   appRef.tick = () => {
     tickCount++;
     const start = performance.now();
     originalTick();
     const duration = performance.now() - start;
     if (duration > 16) console.warn(`Slow tick #${tickCount}: ${duration}ms`);
   };
   ```
3. **Zone.js task tracking**: Log task creation/completion to identify high-frequency sources
4. **Compare with zoneless**: Enable experimental zoneless and measure the difference
5. **Angular DevTools profiler**: Shows per-component check times

---

## 5. Performance Implications

### Q55. Why are function calls in templates a performance problem? (Beginner)

**Answer**: Template functions are re-evaluated on **every** CD cycle, even if their inputs haven't changed. Angular has no way to know if the function's return value changed without calling it.

```html
<!-- Called every CD cycle (potentially 60+ times/sec during animation) -->
<p>{{ getFullName() }}</p>
```

Fix with `computed()` (memoized — only recalculates when dependencies change):
```typescript
fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

---

### Q56. Explain how pure pipes help with CD performance. (Beginner)

**Answer**: Pure pipes are memoized by Angular. They only re-execute when their input values change (reference equality). Angular caches the last input/output pair.

```typescript
@Pipe({ name: 'multiply', pure: true })  // pure: true is default
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor;  // Only called when value or factor changes
  }
}
```

Impure pipes (`pure: false`) are called on every CD cycle, like template functions.

---

### Q57. What is `trackBy` / `track` and why is it important? (Beginner)

**Answer**: Without tracking, Angular's `@for` / `*ngFor` uses object identity to match DOM nodes. When the array reference changes (even with the same items), Angular destroys and recreates all DOM nodes.

With `track`, Angular matches items by a stable identifier:

```html
@for (user of users(); track user.id) {
  <app-user-card [user]="user" />
}
```

Now Angular reuses existing DOM nodes for items with the same `id`, only creating/destroying nodes for added/removed items. This dramatically reduces DOM operations.

---

### Q58. How does virtual scrolling improve CD performance? (Intermediate)

**Answer**: Virtual scrolling (from `@angular/cdk/scrolling`) only renders DOM nodes for items visible in the viewport, plus a small buffer. A list of 10,000 items might only render ~20 DOM nodes.

This reduces CD cost because:
1. Fewer components in the tree → fewer bindings to check
2. Fewer DOM nodes → faster DOM updates
3. Component lifecycle hooks only run for visible items

```html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items; trackBy: trackById">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

---

### Q59. How does `@defer` help with CD performance? (Intermediate)

**Answer**: `@defer` blocks delay component loading and rendering until a trigger condition is met:

```html
@defer (on viewport) {
  <app-heavy-chart [data]="chartData" />
} @placeholder {
  <div class="placeholder">Chart loading...</div>
}
```

Performance benefits:
1. **Initial load**: Heavy components aren't compiled/rendered on page load
2. **CD scope**: Deferred components don't exist in the CD tree until triggered
3. **Bundle splitting**: Deferred components are code-split automatically
4. **Idle loading**: `(on idle)` loads during browser idle time

---

### Q60. Explain layout thrashing and how it relates to CD. (Advanced)

**Answer**: Layout thrashing occurs when JavaScript alternates between reading and writing DOM properties, forcing the browser to recalculate layout multiple times:

```typescript
// ❌ Layout thrashing during CD
ngAfterViewChecked() {
  const height = this.el.nativeElement.offsetHeight;  // Read → forces layout
  this.el.nativeElement.style.width = height + 'px';   // Write → invalidates layout
  const width = this.el.nativeElement.offsetWidth;      // Read → forces layout again
}
```

This is amplified during CD because `ngAfterViewChecked` runs for every checked component. Fix: batch reads and writes, or use `requestAnimationFrame` / `afterNextRender`.

---

### Q61. How do you identify which component is causing slow CD? (Intermediate)

**Answer**:
1. **Angular DevTools Profiler**: Shows a flame chart of component check times per CD cycle
2. **`ngDoCheck` timing**: Add performance marks in `ngDoCheck`:
   ```typescript
   ngDoCheck() {
     performance.mark(`check-${this.constructor.name}-start`);
     // ...
     performance.mark(`check-${this.constructor.name}-end`);
     performance.measure(this.constructor.name,
       `check-${this.constructor.name}-start`,
       `check-${this.constructor.name}-end`);
   }
   ```
3. **Chrome Performance tab**: Record and look for long "Recalculate Style" or "Layout" tasks
4. **Grep for anti-patterns**: Function calls in templates, missing trackBy, impure pipes

---

### Q62. What is the performance difference between `ngDoCheck` and signal-based change detection? (Advanced)

**Answer**:
- `ngDoCheck` fires on **every CD cycle** for the component, regardless of whether anything changed. It's O(n) where n is the number of components with `ngDoCheck`.
- Signal-based CD only marks components dirty when a specific signal changes. It's O(k) where k is the number of components that read the changed signal.

For a tree of 500 components where 1 signal changes: `ngDoCheck` fires 500 times, signal CD only checks 1 component.

---

### Q63. How does immutability help with OnPush performance? (Intermediate)

**Answer**: Immutability means creating new object references for every change instead of mutating existing objects. This enables:

1. **Fast equality check**: `===` comparison is O(1) — just compare references. No deep comparison needed.
2. **Reliable OnPush**: New reference → OnPush detects change. Same reference → safely skipped.
3. **Predictable CD**: No hidden mutations that bypass OnPush.
4. **Undo/redo**: Previous states are preserved (useful for NgRx).

Libraries like `immer` can help create immutable updates with mutable syntax.

---

### Q64. What is the cost of having too many `detectChanges()` calls? (Advanced)

**Answer**: Each `detectChanges()` triggers a full synchronous CD cycle on the component subtree:
1. All template expressions re-evaluated
2. All bindings compared
3. All lifecycle hooks fired (`ngDoCheck`, `ngAfterContentChecked`, `ngAfterViewChecked`)
4. DOM updated synchronously
5. Browser may be forced to recalculate layout

Multiple `detectChanges()` calls per frame can exceed the 16ms budget, causing visible jank. Use `markForCheck()` instead to batch updates, and reserve `detectChanges()` for cases requiring synchronous DOM access.

---

### Q65. How would you optimize a real-time dashboard that receives 100 updates/second? (Expert)

**Answer**:
1. **runOutsideAngular**: Receive WebSocket messages outside zone
2. **Buffer updates**: Collect updates in a buffer outside zone
3. **Batch rendering**: Use `requestAnimationFrame` to flush buffer at 60fps max
4. **Signal-based state**: Use `signal.set()` for the batched update
5. **OnPush + track**: All widgets OnPush, lists use track by unique ID
6. **Virtual scrolling**: For any lists within widgets
7. **detach() idle widgets**: Widgets not in viewport are detached
8. **Web Worker**: Process/aggregate data in a worker thread

```typescript
this.ngZone.runOutsideAngular(() => {
  this.ws.onMessage(data => {
    this.buffer.push(data);
  });

  const flush = () => {
    if (this.buffer.length > 0) {
      const batch = [...this.buffer];
      this.buffer = [];
      this.dashboardData.set(batch);  // Signal → minimal CD
    }
    requestAnimationFrame(flush);
  };
  requestAnimationFrame(flush);
});
```

---

### Q66. Compare the CD performance characteristics of: Default, OnPush, OnPush+Signals, Zoneless+Signals. (Expert)

**Answer**:

| Aspect | Default | OnPush | OnPush+Signals | Zoneless+Signals |
|--------|---------|--------|----------------|------------------|
| **CD trigger** | Any async | Zone + dirty flag | Zone + signal notify | Signal notify only |
| **Components checked** | All | Dirty branch | Dirty branch (finer) | Only signal readers |
| **Zone.js overhead** | Full | Full | Full | None |
| **Bundle size** | +35KB (zone) | +35KB (zone) | +35KB (zone) | No zone.js |
| **Binding check** | All bindings | All bindings | Signal bindings optimize | Signal bindings only |
| **Over-triggering** | High | Medium | Low | Minimal |
| **Manual CD needed** | Rarely | Sometimes | Rarely | Never (if all signals) |
| **Best for** | Prototypes | Production | Production (modern) | Future default |

---

## 6. Signals & Change Detection

### Q67. How do signals notify Angular about changes? (Beginner)

**Answer**: When a signal's value changes (via `set()` or `update()`), Angular's reactive graph marks all **consumers** (components that read the signal in their template) as dirty. This is a direct notification — no Zone.js involved.

The component is then checked during the next CD cycle. With zoneless Angular, the CD cycle is triggered by the signal change itself via a scheduler.

---

### Q68. What is the difference between `signal.set()` and `signal.update()`? (Beginner)

**Answer**:
- `set(newValue)`: Replaces the current value entirely
- `update(fn)`: Takes a function that receives the current value and returns the new value

```typescript
const count = signal(0);
count.set(5);           // Now 5
count.update(c => c + 1); // Now 6
```

Both trigger the same CD notification. `update` is preferred when the new value depends on the old value (avoids race conditions).

---

### Q69. Explain how `computed()` signals work with CD. (Intermediate)

**Answer**: `computed()` creates a derived signal that:
1. **Lazily evaluates**: Only computes when read for the first time
2. **Memoizes**: Caches the result and only recomputes when a dependency changes
3. **Auto-tracks**: Automatically detects which signals are read inside it
4. **Glitch-free**: All dependencies resolve before the computed value is read by the template

For CD, `computed()` signals participate in the dependency graph like any other signal. If a component's template reads a computed signal, the component is marked dirty when any of the computed's dependencies change AND the computed result is different.

---

### Q70. What is `untracked()` and when would you use it? (Intermediate)

**Answer**: `untracked()` reads a signal's value without creating a dependency:

```typescript
effect(() => {
  const items = this.items();  // Dependency — effect re-runs when items changes
  const config = untracked(() => this.config());  // NOT a dependency
  this.process(items, config);
});
```

Use it when you need to read a signal's current value inside an `effect()` or `computed()` without re-triggering when that signal changes. Common for logging, one-time reads, or accessing configuration.

---

### Q71. How does `toSignal()` interact with change detection? (Intermediate)

**Answer**: `toSignal()` converts an Observable to a Signal:

```typescript
const users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
```

When the Observable emits, `toSignal` calls `signal.set()` internally, which marks consuming components as dirty. This eliminates the need for `async` pipe or manual `markForCheck()`.

Important: `toSignal()` subscribes immediately and unsubscribes when the injection context is destroyed. The `initialValue` provides a synchronous default before the first emission.

---

### Q72. What is signal equality and how does it affect CD? (Advanced)

**Answer**: Signals use an equality function to determine if a new value is "different" from the current value. By default, `Object.is()` is used (similar to `===` but also handles `NaN`).

```typescript
// Default: Object.is
const user = signal({ name: 'Alice' });
user.set({ name: 'Alice' });  // Different reference → notifies consumers

// Custom equality
const user = signal({ name: 'Alice' }, {
  equal: (a, b) => a.name === b.name && a.age === b.age
});
user.set({ name: 'Alice' });  // Same semantic value → does NOT notify
```

Custom equality prevents unnecessary CD cycles when you know the value hasn't meaningfully changed despite a new reference.

---

### Q73. How do signal inputs (`input()`) differ from `@Input()` for change detection? (Intermediate)

**Answer**:
- `@Input()`: Angular compares old and new values during CD. With OnPush, only reference changes trigger a check.
- `input()`: Returns a `Signal<T>`. The parent writes to it during CD, and the signal's change notification marks the child dirty. The child reads `input()()` in the template, creating a direct dependency.

Signal inputs are more precise because they participate in the reactive graph. They also work with zoneless CD since signals don't depend on Zone.js.

---

### Q74. Can signals cause infinite loops in change detection? (Advanced)

**Answer**: Yes, if you create circular dependencies:

```typescript
// ❌ Infinite loop
const a = signal(1);
const b = computed(() => a() + 1);
effect(() => {
  a.set(b());  // a depends on b, b depends on a
});
```

Angular detects this and throws a `SIGNAL_WRITE_FROM_COMPUTED` error for computed signals. For effects, it may cause an infinite loop. Design your signal graph as a DAG (directed acyclic graph).

Also, writing to signals inside `computed()` is not allowed:
```typescript
// ❌ Error
const doubled = computed(() => {
  count.set(10);  // Cannot write to signals inside computed
  return value() * 2;
});
```

---

### Q75. How does `effect()` scheduling work with change detection? (Advanced)

**Answer**: Effects are scheduled to run **after** the current CD cycle completes. They use a microtask-based scheduler:

1. Signal value changes
2. Components that read the signal are marked dirty
3. CD runs and updates the DOM
4. Effects that depend on the changed signals run
5. If effects change other signals → repeat from step 1

This ordering ensures the DOM is consistent before side effects run. Effects are also batched — if multiple dependencies change simultaneously, the effect runs once with all changes applied.

---

### Q76. What is `linkedSignal` and how does it relate to CD? (Expert)

**Answer**: `linkedSignal` (Angular 19+) creates a writable signal that resets when a source signal changes:

```typescript
const selectedIndex = linkedSignal({
  source: items,
  computation: (items) => 0  // Reset to 0 when items change
});
```

For CD, it behaves like a regular writable signal — changes mark consuming components dirty. The "linked" behavior means it automatically recomputes when the source changes, combining the behavior of `computed()` (auto-tracking) with `signal()` (writability).

---

### Q77. How would you debug a signal that's not triggering CD? (Advanced)

**Answer**:
1. **Verify signal is read in template**: `{{ mySignal() }}` — if it's not read, no dependency is created
2. **Check equality function**: Custom `equal` may be returning `true`
3. **Verify the signal actually changed**: Log in an `effect()`
4. **Check for `untracked()` reads**: Signal reads inside `untracked()` don't create dependencies
5. **Check component CD strategy**: Even with signals, a detached component won't update
6. **Check for intermediate computed**: If reading through a `computed()`, the computed may not have changed
7. **Use Angular DevTools**: Inspect the component's signal dependencies

---

### Q78. Compare the mental model of "dirty checking" (Zone.js) vs "reactive push" (Signals). (Expert)

**Answer**:

**Dirty checking (Zone.js)**:
- "Something happened somewhere. Let me check everything."
- Triggered by any async event
- Traverses the entire component tree (or dirty branches with OnPush)
- Compares all template expressions with stored values
- No knowledge of WHAT changed, only THAT something happened
- Over-checks by design

**Reactive push (Signals)**:
- "This specific value changed. Only these components care."
- Triggered by `signal.set()` / `signal.update()`
- Direct producer → consumer notification
- Only components that read the changed signal are notified
- Knows exactly WHAT changed and WHO cares
- Minimal checking by design

Signals move Angular from a "poll" model (check everything periodically) to a "push" model (notify exactly who needs updating).

---

## 7. Cross-Topic Scenario Questions

### Q79. You have a chat application where messages arrive via WebSocket every 100ms. The UI becomes laggy. How do you fix it? (Expert)

**Answer**:
1. **Receive outside zone**: `ngZone.runOutsideAngular()` for WebSocket handler
2. **Buffer messages**: Collect in an array outside the reactive system
3. **Throttled flush**: Use `requestAnimationFrame` to batch updates at 60fps:
   ```typescript
   this.ngZone.runOutsideAngular(() => {
     ws.onmessage = (msg) => buffer.push(JSON.parse(msg.data));
     const flush = () => {
       if (buffer.length) {
         this.messages.update(m => [...m, ...buffer.splice(0)]);
       }
       requestAnimationFrame(flush);
     };
     requestAnimationFrame(flush);
   });
   ```
4. **Virtual scrolling**: Only render visible messages
5. **OnPush + track by message ID**: Minimize DOM operations
6. **Consider `detach()`**: For inactive chat windows

---

### Q80. A component has `ChangeDetectionStrategy.OnPush` but uses a service that emits data via a BehaviorSubject. The component doesn't update. Why? What are 3 ways to fix it? (Intermediate)

**Answer**: The component subscribes manually and sets a plain property. OnPush doesn't detect this because no input reference changed and no DOM event fired.

Fixes:
1. **async pipe**: `{{ data$ | async }}` — async pipe calls `markForCheck()` internally
2. **toSignal()**: `data = toSignal(this.service.data$)` then `{{ data() }}` in template
3. **markForCheck()**: `this.service.data$.subscribe(d => { this.data = d; this.cdr.markForCheck(); })`

Best practice: Use `toSignal()` for Angular 21 codebases.

---

### Q81. You're migrating a large NgModule-based app to standalone components. What change detection considerations should you account for? (Expert)

**Answer**:
1. **Provider scoping changes**: Standalone components can have `providers` that create new injector boundaries. Services that were singleton (module-level) may accidentally become multi-instance.
2. **OnPush migration**: Good time to add OnPush to migrated components
3. **Signal adoption**: Replace `@Input()` with `input()`, `@Output()` with `output()`
4. **Remove NgModule CD workarounds**: Code that called `markForCheck()` due to module-level services may no longer need it with signal-based state
5. **Lazy boundary changes**: `loadComponent` replaces `loadChildren` — affects when components enter the CD tree
6. **Test CD behavior**: Standalone components in different injector hierarchies may have different CD timing

---

### Q82. Explain how `@defer` blocks interact with Zone.js, OnPush, and signals for a component that loads on viewport intersection. (Expert)

**Answer**:
1. **Zone.js**: The `IntersectionObserver` used by `@defer (on viewport)` is NOT patched by Zone.js. Angular handles this internally through its own scheduling.
2. **OnPush parent**: The defer block's trigger is evaluated during the parent's CD. If the parent is OnPush and skipped, the defer trigger won't be re-evaluated. However, viewport intersection is handled by the framework outside CD.
3. **Signal in defer content**: Once loaded, the deferred component's signals work normally. If the component reads signals, it's marked dirty when they change.
4. **Loading lifecycle**: `@placeholder` → `@loading` → `<actual component>`. Each state change triggers CD on the parent.

---

### Q83. A developer puts `console.log(Date.now())` inside `ngDoCheck` of a Default strategy component and sees it printing 200 times on a single button click. Explain why and how to fix it. (Intermediate)

**Answer**: Reasons for 200 calls:
1. The component tree likely has many sibling/parent/child components
2. Zone.js may trigger multiple CD cycles per event (event + microtask drain)
3. The button click may trigger additional async operations (HTTP, timers)
4. Dev mode runs CD twice per cycle (for ExpressionChangedAfterItHasBeenChecked detection)

Fixes:
1. **OnPush** on this component and siblings — eliminates unnecessary checks
2. **Event coalescing** — `provideZoneChangeDetection({ eventCoalescing: true })`
3. **Remove `ngDoCheck`** if it's just for logging — it adds overhead
4. **Signal-based state** — reduces components that need checking

---

### Q84. How do you implement efficient drag-and-drop with Angular's change detection? (Advanced)

**Answer**:
1. **Outside zone for mousemove/touchmove**: These fire at 60+ Hz
   ```typescript
   this.ngZone.runOutsideAngular(() => {
     el.addEventListener('mousemove', this.onDrag);
   });
   ```
2. **Direct DOM manipulation during drag**: Update `transform` directly, bypassing Angular:
   ```typescript
   onDrag = (e: MouseEvent) => {
     this.dragEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
   };
   ```
3. **Re-enter zone on drop**: Update Angular state only when drag ends:
   ```typescript
   onDrop = () => {
     this.ngZone.run(() => {
       this.position.set({ x: this.lastX, y: this.lastY });
     });
   };
   ```
4. **Use CDK DragDrop**: It already handles these optimizations internally

---

### Q85. Your Angular Universal (SSR) app hangs during rendering. Server-side `isStable` never becomes `true`. What are common causes? (Expert)

**Answer**:
1. **Uncanceled `setInterval`**: Creates an infinite macrotask queue
2. **Long-running HTTP request**: Server waits for completion
3. **Infinite polling**: `timer(0, 5000)` keeps the zone unstable
4. **Uncanceled Observable subscriptions**: subscriptions that never complete
5. **`setTimeout` with long delay**: Zone tracks it as a pending macrotask

Diagnosis:
- Use `NgZone.hasPendingMacrotasks` / `hasPendingMicrotasks` to identify
- Add a timeout to SSR rendering
- Use `isPlatformServer()` to skip browser-only operations

Fixes:
- Use `takeUntilDestroyed()` for all subscriptions
- Conditional logic with `isPlatformServer()`
- Use `provideServerRendering()` with `renderTimeout`
- Replace `setInterval` with `timer()` + `takeUntil()`

---

## 8. System Design & Architecture

### Q86. Design a change detection strategy for a trading dashboard with 500 live-updating widgets. (Expert)

**Answer**:

**Architecture**:
```
WebSocket (outside zone)
    ↓
MessageBroker Service (buffers)
    ↓  (requestAnimationFrame batch)
Signal Store (per-widget signals)
    ↓  (signal notification)
Widget Components (OnPush + signals)
    ↓  (virtual viewport)
Only visible widgets render
```

**Key decisions**:
1. **Zoneless**: Use `provideExperimentalZonelessChangeDetection()` — Zone.js overhead unacceptable at this scale
2. **Signal store**: One writable signal per widget data feed
3. **Buffered updates**: WebSocket messages buffered, flushed at 60fps via `requestAnimationFrame`
4. **Virtual viewport**: Only render visible widgets (~20 of 500)
5. **`detach()` off-screen widgets**: Widgets scrolled out of view are detached
6. **Web Worker**: Data normalization/aggregation in worker thread
7. **Custom equality**: Prevent updates when values haven't meaningfully changed
8. **Priority queue**: Critical widgets (alerts) update before informational ones

---

### Q87. Design a change detection strategy for a complex form wizard with 20 steps, conditional validation, and auto-save. (Expert)

**Answer**:

**Architecture**:
1. **Each step is a lazy-loaded standalone component** with OnPush
2. **Form state stored in signals**: `currentStep = signal(0)`, `formData = signal<FormData>({})`
3. **Conditional validation via computed**:
   ```typescript
   isStep3Valid = computed(() => {
     const data = this.formData();
     if (data.type === 'business') return !!data.taxId;
     return true;
   });
   ```
4. **Auto-save with debounce**: `effect()` watches form data, debounces writes
5. **Inactive steps detached**: Only the current step is in the CD tree
6. **Cross-step validation**: Computed signals that read multiple steps' data
7. **Navigation guard**: `canDeactivate` checks dirty signal state

**CD implications**:
- Only 1 of 20 step components is checked during normal typing
- Computed validations are lazy — only evaluated when read
- Auto-save effect runs after CD, not during

---

### Q88. How would you architect change detection for a collaborative real-time document editor? (Expert)

**Answer**:

**Challenges**: Multiple users editing simultaneously, cursor positions, selection highlighting, undo/redo.

**Architecture**:
1. **CRDT/OT engine in Web Worker**: All merge logic off main thread
2. **Zoneless + signals**: Latency-sensitive operations can't afford Zone overhead
3. **Three signal layers**:
   - `documentContent`: Full document signal, updated on worker message
   - `cursorPositions`: Map of user → cursor position signals
   - `selections`: Map of user → selection range signals
4. **Virtualized rendering**: Only visible paragraphs/lines rendered
5. **Cursor updates outside zone**: High-frequency, direct DOM manipulation for local cursor
6. **Batched remote updates**: Remote changes buffered and applied per animation frame
7. **Optimistic local updates**: Local edits applied immediately to signals, reconciled with server

**CD flow**:
```
Local keystroke → immediate signal update → component dirty → CD
Remote change → Worker → buffer → rAF → signal update → component dirty → CD
Cursor move → outside zone → direct DOM → no CD
```

---

### Q89. How would you implement a performance monitoring system for CD in a large Angular application? (Expert)

**Answer**:

```typescript
@Injectable({ providedIn: 'root' })
export class CdMonitorService {
  private ngZone = inject(NgZone);
  private appRef = inject(ApplicationRef);

  private metrics = signal({
    tickCount: 0,
    avgTickDuration: 0,
    maxTickDuration: 0,
    slowTicks: 0  // > 16ms
  });

  init() {
    // 1. Monitor tick duration
    const originalTick = this.appRef.tick.bind(this.appRef);
    this.appRef.tick = () => {
      const start = performance.now();
      originalTick();
      const duration = performance.now() - start;
      this.recordTick(duration);
    };

    // 2. Monitor zone stability
    this.ngZone.onUnstable.subscribe(() => {
      performance.mark('zone-unstable');
    });
    this.ngZone.onStable.subscribe(() => {
      performance.mark('zone-stable');
      performance.measure('zone-busy', 'zone-unstable', 'zone-stable');
    });

    // 3. PerformanceObserver for long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry.duration);
        }
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  }

  private tickDurations: number[] = [];
  private recordTick(duration: number) {
    this.tickDurations.push(duration);
    if (this.tickDurations.length > 100) this.tickDurations.shift();

    this.metrics.update(m => ({
      tickCount: m.tickCount + 1,
      avgTickDuration: this.tickDurations.reduce((a, b) => a + b) / this.tickDurations.length,
      maxTickDuration: Math.max(m.maxTickDuration, duration),
      slowTicks: m.slowTicks + (duration > 16 ? 1 : 0)
    }));
  }
}
```

Components expose `ngDoCheck` counters; a dashboard visualizes metrics in real-time using the monitoring service's signals.

---

### Q90. You're joining a team with a large Angular app that has severe CD performance issues. Walk through your diagnosis and remediation approach. (Expert)

**Answer**:

**Phase 1: Diagnosis**
1. **Profile with Angular DevTools**: Record CD cycles, identify most-checked components
2. **Chrome Performance tab**: Look for long frames (>16ms), layout thrashing
3. **Audit CD strategies**: `grep -r "ChangeDetectionStrategy" --include="*.ts"` — count Default vs OnPush
4. **Find template anti-patterns**: `grep -rn "{{ .*() }}" --include="*.html"` — function calls in templates
5. **Check Zone.js events**: Add NgZone monitoring to count CD triggers per user action
6. **Bundle analysis**: Check Zone.js size contribution, identify heavy components

**Phase 2: Quick Wins**
1. Add `track` to all `@for` loops
2. Convert template function calls to `computed()` signals or pure pipes
3. Add OnPush to leaf components (lowest risk)
4. Enable event coalescing
5. Move high-frequency event handlers outside zone

**Phase 3: Systematic Fix**
1. Bottom-up OnPush migration with tests
2. Signal adoption for state management
3. Replace `async` pipe patterns with `toSignal()`
4. Virtual scrolling for long lists
5. `@defer` for below-fold content

**Phase 4: Prevention**
1. Lint rule: require OnPush on all new components
2. Lint rule: ban function calls in templates
3. CD performance budget in CI (lighthouse, custom metrics)
4. Angular DevTools profiling in code review checklist
5. Team training on reactive patterns

---

## 9. Zoneless Angular — Deep Dive (Q91–Q105)

### Q91. What is the status of zoneless change detection in Angular 21? Is it production-ready? (Intermediate)

**Answer**: In Angular 21, `provideZonelessChangeDetection()` has graduated from the `provideExperimentalZonelessChangeDetection()` API. The core scheduler is stable and suitable for production use for applications that follow signal-based patterns.

Key maturity points:
- Stable API name: `provideZonelessChangeDetection()`
- TestBed works without Zone.js
- SSR support via `PendingTasks`
- `resource()` and `rxResource()` integrate seamlessly
- Angular Material and CDK are zoneless-compatible
- The experimental alias still works for backward compatibility

The main limitation: third-party libraries that depend on Zone.js for CD (e.g., some older Angular libraries) may not work correctly without additional `markForCheck()` calls.

---

### Q92. How does the zoneless scheduler work internally? (Advanced)

**Answer**: The zoneless scheduler uses a `ChangeDetectionScheduler` that's notified by the signal reactive graph:

1. A signal value changes → producers notify consumers
2. If a consumer is a component template view → `ChangeDetectionScheduler.notify()` is called
3. The scheduler coalesces multiple notifications within the same synchronous block
4. It schedules ONE `ApplicationRef.tick()` via `queueMicrotask()`
5. `tick()` only checks components marked as dirty

The coalescing is critical: if you call `signal.set()` three times synchronously, only ONE CD cycle runs. This is similar to React's batched state updates.

```typescript
// All three happen synchronously:
this.name.set('Alice');
this.age.set(30);
this.role.set('Admin');
// → scheduler.notify() called 3 times
// → but only ONE queueMicrotask scheduled
// → ONE CD cycle checks all three changes
```

---

### Q93. What is `PendingTasks` and why is it needed for zoneless SSR? (Advanced)

**Answer**: Without Zone.js, Angular can't automatically track pending async work (HTTP requests, timers, etc.) for server-side rendering stability. `PendingTasks` is the replacement:

```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private pendingTasks = inject(PendingTasks);

  async fetchData(): Promise<Data> {
    const done = this.pendingTasks.add();  // "I'm busy"
    try {
      const response = await fetch('/api/data');
      return await response.json();
    } finally {
      done();  // "I'm done" — SSR can proceed
    }
  }
}
```

`resource()` and `rxResource()` automatically manage `PendingTasks` — you only need manual management for raw `fetch()` or custom async operations.

SSR uses `ApplicationRef.whenStable()` which in zoneless mode waits for all `PendingTasks` to complete (plus signal-based CD to settle) before serializing HTML.

---

### Q94. How do template events (click, input, etc.) trigger CD in zoneless mode? (Intermediate)

**Answer**: Angular's template event bindings (`(click)="handler()"`) are **not** reliant on Zone.js. Angular wraps each event listener in its own notification mechanism:

1. User clicks → native DOM event fires
2. Angular's event listener calls the component handler
3. After the handler executes, Angular calls `markForCheck()` on the component
4. This notifies the `ChangeDetectionScheduler`
5. Scheduler triggers `tick()` via microtask

This is why template events work identically in zone and zoneless mode. The key difference: raw `addEventListener()` outside Angular's template system does NOT trigger CD in zoneless mode.

---

### Q95. How do you test zoneless components? What changes from zone-based testing? (Intermediate)

**Answer**:

```typescript
describe('ZonelessComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });

  it('updates on signal change', async () => {
    const fixture = TestBed.createComponent(MyComponent);
    fixture.detectChanges();  // Initial render

    fixture.componentInstance.count.set(5);

    // Option 1: Manual CD (synchronous)
    fixture.detectChanges();

    // Option 2: Wait for scheduler (async)
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('5');
  });

  it('handles async operations', async () => {
    const fixture = TestBed.createComponent(MyComponent);
    fixture.detectChanges();

    fixture.componentInstance.loadData();

    // Wait for async + CD
    await fixture.whenStable();

    expect(fixture.componentInstance.data()).toBeTruthy();
  });
});
```

Key differences from zone testing:
- `fakeAsync()` / `tick()` / `flush()` are NOT available (they require Zone.js)
- Use `await fixture.whenStable()` instead
- Use `fixture.detectChanges()` for synchronous checks
- `setTimeout` in components must use signals to trigger CD

---

### Q96. Can you mix zone-based and zoneless components in the same application? (Advanced)

**Answer**: No. Zone.js presence is a global, application-wide configuration. Either the entire app uses Zone.js or it doesn't. You cannot have some components use zone-based CD and others use zoneless CD.

However, during migration, you can:
1. Keep Zone.js in polyfills but use signals everywhere → Zone.js is just overhead, not needed
2. Remove Zone.js from polyfills → if any component relies on Zone.js-triggered CD, it breaks
3. Use OnPush + signals as an intermediate step → works with both zone and zoneless

---

### Q97. What happens to `NgZone.runOutsideAngular()` in zoneless mode? (Intermediate)

**Answer**: In zoneless mode, `NgZone` is replaced with a `NoopNgZone` — a no-op implementation. Calling `runOutsideAngular()` or `run()` simply executes the function synchronously. There's no concept of "inside" or "outside" the zone because there is no zone.

```typescript
// In zoneless mode:
this.ngZone.runOutsideAngular(() => {
  // This just runs the callback immediately
  // No zone switching, no CD implications
});

this.ngZone.run(() => {
  // Also just runs the callback
  // Does NOT trigger CD (no zone)
});
```

If you need to trigger CD in zoneless code that used to use `ngZone.run()`, use `markForCheck()` or signals instead.

---

### Q98. How does `async` pipe work in zoneless mode? (Intermediate)

**Answer**: The `async` pipe works identically in zoneless mode because it internally calls `markForCheck()` on each emission, not `ngZone.run()`. Since `markForCheck()` notifies the zoneless scheduler, CD is triggered.

```typescript
// async pipe internal (simplified):
class AsyncPipe {
  transform(observable$) {
    observable$.subscribe(value => {
      this.latestValue = value;
      this.cdr.markForCheck();  // Works in both zone and zoneless
    });
    return this.latestValue;
  }
}
```

However, `toSignal()` is preferred over `async` pipe in Angular 21 because:
- More concise syntax (no `| async` everywhere)
- Better type inference
- Easier to compose with other signals

---

### Q99. How does `afterRender()` / `afterNextRender()` work in zoneless mode? (Intermediate)

**Answer**: These APIs hook into Angular's CD lifecycle, not Zone.js, so they work identically in zoneless mode:

- `afterRender()` runs after every CD cycle that checks the component
- `afterNextRender()` runs once after the next CD cycle

```typescript
constructor() {
  afterRender(() => {
    // Runs after each CD cycle — safe for DOM measurement
    const height = this.el().nativeElement.offsetHeight;
    this.measuredHeight.set(height);
  });

  afterNextRender(() => {
    // Runs once — safe for initialization
    this.initializeChart();
  });
}
```

These are the recommended replacement for `ngAfterViewInit` + `setTimeout` patterns, and are future-proof for zoneless.

---

### Q100. What is `whenStable()` in zoneless mode and how does it differ from zone-based? (Advanced)

**Answer**:
- **Zone-based**: `ApplicationRef.isStable` emits `true` when the zone has no pending microtasks or macrotasks (tracked by Zone.js).
- **Zoneless**: `ApplicationRef.whenStable()` resolves when there are no pending `PendingTasks` AND the scheduler has no pending CD cycles.

The key difference: in zone-based mode, any `setInterval` or unfulfilled `Promise` prevents stability. In zoneless mode, only explicitly registered `PendingTasks` prevent stability — making it more predictable.

---

### Q101. How do you handle third-party libraries that rely on Zone.js in a zoneless app? (Expert)

**Answer**: Most third-party callback patterns won't trigger CD in zoneless mode. Solutions:

1. **Wrap callbacks with signal updates**:
   ```typescript
   thirdPartyLib.onEvent((data) => {
     this.result.set(data);  // Signal notifies scheduler
   });
   ```

2. **Use `markForCheck()`**:
   ```typescript
   thirdPartyLib.onEvent((data) => {
     this.data = data;
     this.cdr.markForCheck();
   });
   ```

3. **Create a wrapper service with signals**:
   ```typescript
   @Injectable({ providedIn: 'root' })
   export class GoogleMapsWrapper {
     mapClick = signal<LatLng | null>(null);

     init(element: HTMLElement) {
       const map = new google.maps.Map(element, options);
       map.addListener('click', (e) => this.mapClick.set(e.latLng));
     }
   }
   ```

4. **For libraries that use Observables**: `toSignal()` converts them automatically.

---

### Q102. Compare the full CD lifecycle in Zone.js vs Zoneless with a concrete example. (Expert)

**Answer**: Scenario: User types "hello" in an input field that triggers an HTTP search.

**Zone.js mode**:
```
1. Input event → Zone.js intercepts addEventListener
2. Handler: searchTerm = 'hello' → Zone.js schedules tick
3. tick() → checks ALL dirty components
4. debounce timer fires → Zone.js intercepts setTimeout
5. HTTP request sent → Zone.js intercepts XHR
6. HTTP response → Zone.js intercepts, schedules tick
7. tick() → checks ALL dirty components
Total CD cycles: 3+ (input, debounce, response)
Zone.js interceptions: 4 (event, timeout, XHR send, XHR response)
```

**Zoneless mode**:
```
1. Input event → Angular template event binding
2. Handler: searchTerm.set('hello') → scheduler.notify()
3. queueMicrotask → tick() → only components reading searchTerm checked
4. debounce: effect() with setTimeout — signal.set triggers scheduler
5. HTTP via rxResource: request signal changed → resource reloads
6. Response: resource.value signal set → scheduler.notify()
7. queueMicrotask → tick() → only components reading resource.value checked
Total CD cycles: 2-3 (batched/coalesced)
Zone.js interceptions: 0
```

---

### Q103. How do you gradually migrate a large Zone.js app to zoneless? Give a step-by-step strategy. (Expert)

**Answer**:

**Phase 1: Preparation (with Zone.js still active)**
1. Add `ChangeDetectionStrategy.OnPush` to all components (bottom-up)
2. Replace `@Input()` with `input()`, `@Output()` with `output()`
3. Replace mutable state properties with `signal()`
4. Replace getters/functions in templates with `computed()`
5. Replace `async` pipe with `toSignal()` where possible
6. Replace manual `.subscribe()` + `markForCheck()` with `toSignal()`
7. Add lint rule: no new components without OnPush

**Phase 2: Audit (still with Zone.js)**
8. Add `provideZoneChangeDetection({ eventCoalescing: true })` — closer to zoneless behavior
9. Audit for Zone.js-dependent patterns: `setTimeout` with plain properties, `setInterval` for UI updates
10. Audit third-party library callbacks — wrap with signals
11. Replace `ngZone.run()` / `runOutsideAngular()` with signal-based patterns
12. Run full test suite — all tests should pass

**Phase 3: Switch**
13. Replace `provideZoneChangeDetection()` with `provideZonelessChangeDetection()`
14. Remove `zone.js` from `polyfills` in `angular.json`
15. Run full test suite — fix any failing tests (update to `fixture.whenStable()` pattern)
16. E2E tests — replace Protractor stability waits with explicit waits

**Phase 4: Cleanup**
17. Remove all `NgZone` injections (they're now NoopNgZone)
18. Remove `runOutsideAngular()` / `run()` calls (they're no-ops)
19. Remove unnecessary `markForCheck()` calls (signals handle it)
20. Remove Zone.js from `package.json` dependencies

---

### Q104. What are the performance numbers: Zone.js vs Zoneless in a real app? (Expert)

**Answer**: Typical improvements (varies by app):

| Metric | Zone.js | Zoneless | Improvement |
|--------|---------|----------|-------------|
| **Bundle size** | +35KB (zone.js) | 0 | ~13KB gzipped savings |
| **Initial load (TTI)** | Baseline | -5-15% | Zone.js bootstrap + patching eliminated |
| **CD cycles per user action** | 2-5 (over-triggering) | 1 (precise) | 50-80% fewer CD cycles |
| **Scroll handler overhead** | ~60 CD/sec | 0 (signals only) | ~100% reduction |
| **Stack trace depth** | +10-15 frames (Zone) | Clean | Better debugging |
| **SSR render time** | Baseline | -10-20% | No Zone.js task tracking overhead |
| **Memory (long-running)** | Zone.js task bookkeeping | Lower | Less GC pressure |

The biggest win is eliminating **over-triggering**: in Zone.js mode, a `setInterval` for a clock widget triggers CD on the entire app every second. In zoneless mode, only the clock component's signal update triggers CD on that one component.

---

### Q105. Describe a scenario where moving to zoneless would cause a regression. How do you detect and fix it? (Expert)

**Answer**: **Scenario**: A dashboard component displays real-time data from a WebSocket. The existing code uses `onmessage` to set a plain property:

```typescript
// Old code — works with Zone.js, breaks without
ngOnInit() {
  this.ws.onmessage = (msg) => {
    this.latestPrice = JSON.parse(msg.data).price;  // Plain property
    // Zone.js intercepted this → triggered CD → DOM updated
  };
}
```

**Detection**:
1. UI freezes/stale data after switching to zoneless
2. Add temporary `ngDoCheck` counters — counter stops incrementing
3. Angular DevTools shows component never checked after init

**Fix**:
```typescript
// Fixed — works with and without Zone.js
latestPrice = signal(0);

ngOnInit() {
  this.ws.onmessage = (msg) => {
    this.latestPrice.set(JSON.parse(msg.data).price);  // Signal → notifies scheduler
  };
}
```

**Systematic detection approach**: Before switching to zoneless, search for:
- `this.someProperty = ` inside `subscribe()`, `onmessage`, `setTimeout`, `addEventListener`
- Missing `markForCheck()` after async property updates
- `ngZone.run()` usage (indicates Zone dependency)

---

## 10. Advanced Signal CD Patterns (Q106–Q115)

### Q106. How does `resource()` integrate with change detection? Walk through the full lifecycle. (Intermediate)

**Answer**:
```
1. Component creates resource({ request: () => ..., loader: ... })
2. resource reads request signal → creates dependency
3. resource.status set to 'loading' → component dirty → CD → shows loading UI
4. loader function executes (fetch/HTTP)
5. Loader resolves → resource.value set → component dirty → CD → shows data
6. If loader rejects → resource.error set → component dirty → CD → shows error
7. request signal changes → resource auto-cancels previous loader (AbortController)
8. Cycle repeats from step 3

All state transitions (isLoading, value, error, status) are signals:
- isLoading(): Signal<boolean>
- value(): Signal<T | undefined>
- error(): Signal<unknown>
- status(): Signal<ResourceStatus>
```

Each signal change independently triggers CD — so a fast-loading request might show loading UI for just one frame.

---

### Q107. What is the DIRTY vs POTENTIALLY_DIRTY optimization in the signal reactive graph? (Expert)

**Answer**: This is a two-phase dirty checking optimization:

1. **Source signal changes** → marked `DIRTY` (value definitely changed)
2. **Computed consumers** → marked `POTENTIALLY_DIRTY` (dependency changed, but MY value might not)
3. **Component template consumers** → marked for CD (scheduled)

During CD, when Angular reads a `POTENTIALLY_DIRTY` computed:
- It re-evaluates the computation
- If the new result equals the old result (via equality check) → computed becomes `CLEAN`
- Downstream consumers of this computed are NOT notified → their CD is skipped

```typescript
const items = signal([1, 2, 3, 4, 5]);
const hasItems = computed(() => items().length > 0);  // true

// Component A reads hasItems() in template
// Component B reads items() in template

items.set([10, 20, 30]);
// items: DIRTY
// hasItems: POTENTIALLY_DIRTY
// Component A: scheduled
// Component B: scheduled

// During CD:
// hasItems re-evaluates: length > 0 → still true → CLEAN
// Component A: hasItems didn't change → DOM NOT updated (optimization!)
// Component B: items changed → DOM updated
```

This prevents unnecessary DOM updates for components that read computed signals whose output didn't actually change.

---

### Q108. How does `linkedSignal` differ from `computed` in its CD notification behavior? (Advanced)

**Answer**:

| Aspect | `computed()` | `linkedSignal()` |
|--------|-------------|-----------------|
| **On source change** | Re-evaluates; notifies only if result differs | Resets to computation; always notifies (new write) |
| **On manual write** | N/A (read-only) | Notifies consumers (writable) |
| **Equality check** | Applied on re-evaluation | Applied on both reset and manual write |
| **CD trigger** | Only if computed value actually changed | On every source change (reset is a write) |

```typescript
const items = signal(['a', 'b', 'c']);

// computed: only notifies if selected index would be different
const firstItem = computed(() => items()[0]);

// linkedSignal: resets on every items change (even if first item is same)
const selectedItem = linkedSignal({
  source: items,
  computation: (items) => items[0]
});

items.set(['a', 'x', 'y']);
// firstItem: POTENTIALLY_DIRTY → re-evaluates → 'a' === 'a' → CLEAN (no CD)
// selectedItem: resets to 'a' → but 'a' === 'a' → with default equality, also no CD
// Note: linkedSignal ALSO uses equality, so behavior is similar here
// Difference shows when user has overridden:

selectedItem.set('z');  // Manual override
items.set(['a', 'x', 'y']);
// selectedItem resets to 'a' (overriding 'z') → CD triggered
```

---

### Q109. How do signal writes batch within a single synchronous execution context? (Advanced)

**Answer**: When multiple signals are written synchronously, the scheduler coalesces them:

```typescript
handleFormSubmit() {
  this.name.set('Alice');           // notify → scheduler marks pending
  this.email.set('alice@test.com'); // notify → scheduler already pending (no-op)
  this.role.set('admin');           // notify → scheduler already pending (no-op)
  // End of synchronous block
  // → ONE queueMicrotask fires
  // → ONE ApplicationRef.tick()
  // → ALL three changes reflected in ONE CD cycle
}
```

The key mechanism: the scheduler uses a boolean flag (`pending`). The first `notify()` sets it to `true` and schedules a microtask. Subsequent `notify()` calls see `pending === true` and do nothing. The microtask resets the flag and runs `tick()`.

This is why Angular signals are "glitch-free" — intermediate states (e.g., name updated but email not yet) never reach the template.

---

### Q110. Can `effect()` trigger change detection? If so, how? (Advanced)

**Answer**: Effects run AFTER CD completes. If an effect writes to a signal (with `allowSignalWrites: true`), that signal write notifies the scheduler, which schedules ANOTHER CD cycle:

```typescript
effect(() => {
  const items = this.cart();
  this.itemCount.set(items.length);  // Signal write → schedules new CD
}, { allowSignalWrites: true });

// Flow:
// 1. cart.set([...]) → CD cycle 1 runs
// 2. Effect runs (post-CD) → itemCount.set(3)
// 3. New CD cycle 2 scheduled → runs
// 4. No more effects fire → stable
```

This is generally an anti-pattern — prefer `computed()` for derived state. Signal writes in effects are a code smell; `allowSignalWrites` exists as an escape hatch for legitimate cases like logging/analytics side effects that update UI counters.

---

### Q111. Explain the `toSignal()` options and their CD implications: `initialValue`, `requireSync`, `rejectErrors`. (Intermediate)

**Answer**:

```typescript
// 1. initialValue — provides synchronous default
const users = toSignal(users$, { initialValue: [] });
// CD: Component renders immediately with []. When Observable emits, signal updates → new CD.

// 2. requireSync — requires Observable to emit synchronously
const config = toSignal(configSubject$, { requireSync: true });
// CD: No initial CD with empty state. If Observable doesn't emit sync, throws error.
// Useful with BehaviorSubject (always has a value).

// 3. rejectErrors — signal becomes undefined on error
const data = toSignal(data$, { initialValue: null, rejectErrors: true });
// CD: On error, signal is set to undefined → component re-renders with null state.
// Without rejectErrors, errors propagate and crash the subscription.

// 4. manualCleanup — don't auto-unsubscribe
const events = toSignal(globalEvents$, { manualCleanup: true });
// CD: Same behavior, but subscription persists beyond component destruction.
// Useful for global singleton signals.
```

---

### Q112. How do `viewChild()` and `contentChildren()` signals interact with CD? (Intermediate)

**Answer**: `viewChild()` and `contentChildren()` return signals that Angular updates during CD:

```typescript
@Component({
  template: `
    <div #myDiv>{{ content() }}</div>
    <app-child />
  `
})
export class ParentComponent {
  myDiv = viewChild<ElementRef>('myDiv');        // Signal<ElementRef | undefined>
  child = viewChild(ChildComponent);              // Signal<ChildComponent | undefined>
  items = contentChildren(ItemComponent);          // Signal<readonly ItemComponent[]>

  // These signals update DURING CD (after view/content init)
  // Reading them in computed/effect creates dependencies:
  childValue = computed(() => this.child()?.someSignal() ?? 'none');
}
```

CD implications:
- `viewChild()` signal is `undefined` before `afterViewInit` phase
- Signal updates when the referenced element/component is created or destroyed (e.g., inside `@if`)
- Reading `viewChild()` in a `computed()` creates a reactive chain

---

### Q113. What is "signal-based component authoring" and how does it change the CD model? (Expert)

**Answer**: Signal-based component authoring is Angular's vision where ALL component state is expressed through signals:

```typescript
@Component({
  template: `
    <h1>{{ title() }}</h1>
    @for (item of filteredItems(); track item.id) {
      <app-item [item]="item" (selected)="onSelect($event)" />
    }
    <p>Total: {{ total() }}</p>
  `
})
export class CatalogComponent {
  // Inputs are signals
  items = input.required<Item[]>();
  filter = input<string>('');

  // State is signals
  selectedId = signal<number | null>(null);

  // Derived state is computed
  filteredItems = computed(() =>
    this.items().filter(i => i.name.includes(this.filter()))
  );
  total = computed(() => this.filteredItems().length);

  // Outputs
  selected = output<Item>();

  // Side effects
  constructor() {
    effect(() => {
      console.log(`Showing ${this.filteredItems().length} items`);
    });
  }

  onSelect(item: Item) {
    this.selectedId.set(item.id);
    this.selected.emit(item);
  }
}
```

CD model changes:
1. **No ChangeDetectionStrategy needed** — signals provide automatic fine-grained updates
2. **No markForCheck/detectChanges** — signals handle all notifications
3. **No async pipe** — `toSignal()` or `resource()` for async data
4. **No ngOnChanges** — use `effect()` or `computed()` to react to input changes
5. **Zoneless-ready by default** — no Zone.js dependency
6. **Local CD** — only the component and its direct signal consumers are checked

---

### Q114. How do you handle `@HostListener` events in zoneless mode? (Intermediate)

**Answer**: `@HostListener` works the same as template event bindings — Angular wraps them to trigger CD:

```typescript
@Component({ ... })
export class KeyboardComponent {
  lastKey = signal('');

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    this.lastKey.set(event.key);  // Signal → works zoneless
  }
}
```

However, for host listeners with the `host` property in `@Component`:
```typescript
@Component({
  host: {
    '(window:resize)': 'onResize($event)'
  }
})
```

These also work in zoneless mode. Angular registers all template-defined and host-defined event listeners through its event system, which notifies the scheduler.

---

### Q115. Compare all Angular 21 reactive primitives and their CD behavior in a single table. (Expert)

**Answer**:

| Primitive | Type | Triggers CD? | Zoneless? | When |
|-----------|------|-------------|-----------|------|
| `signal()` | Writable | Yes | Yes | On `set()` / `update()` if value changes |
| `computed()` | Read-only | Yes | Yes | When dependency changes AND result differs |
| `input()` | Read-only signal | Yes | Yes | When parent passes new value |
| `input.required()` | Read-only signal | Yes | Yes | When parent passes new value |
| `output()` | Event emitter | Indirect | Yes | Parent handles event → parent's CD |
| `model()` | Two-way signal | Yes | Yes | On parent write OR component write |
| `linkedSignal()` | Writable + linked | Yes | Yes | On source reset OR manual write |
| `viewChild()` | Query signal | Yes | Yes | When target element created/destroyed |
| `viewChildren()` | Query signal | Yes | Yes | When target list changes |
| `contentChild()` | Query signal | Yes | Yes | When projected target changes |
| `contentChildren()` | Query signal | Yes | Yes | When projected list changes |
| `toSignal()` | Observable→Signal | Yes | Yes | When Observable emits |
| `resource()` | Async resource | Yes | Yes | On status/value/error change |
| `rxResource()` | Async resource | Yes | Yes | On status/value/error change |
| `effect()` | Side effect | Indirect | Yes | Can write signals → triggers CD |
| `afterRender()` | Lifecycle | No (post-CD) | Yes | Runs after CD, doesn't trigger it |
| `afterNextRender()` | Lifecycle | No (post-CD) | Yes | Runs once after next CD |

---

*Next: Phase 2 — RxJS & Reactive Programming*
