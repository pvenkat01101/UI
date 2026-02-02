# RxJS Creation Operators — Practical Exercises

> **Phase 2 · Section 6** of the Angular Interview Preparation Roadmap
> 8 hands-on exercises · Angular 21 · Standalone components · RxJS 7.x

---

## Table of Contents

1. [Exercise 1: of() & from() Explorer](#exercise-1-of--from-explorer)
2. [Exercise 2: interval() & timer() Dashboard](#exercise-2-interval--timer-dashboard)
3. [Exercise 3: fromEvent() Event Lab](#exercise-3-fromevent-event-lab)
4. [Exercise 4: defer() Lazy Evaluation Lab](#exercise-4-defer-lazy-evaluation-lab)
5. [Exercise 5: range() & generate() Number Generators](#exercise-5-range--generate-number-generators)
6. [Exercise 6: forkJoin() Parallel Loading](#exercise-6-forkjoin-parallel-loading)
7. [Exercise 7: Creation Operator Combinator Dashboard](#exercise-7-creation-operator-combinator-dashboard)
8. [Exercise 8: Real-World Polling & Typeahead](#exercise-8-real-world-polling--typeahead)

---

## Routing Setup

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'ex1', loadComponent: () => import('./exercises/ex1-of-from.component').then(m => m.Ex1OfFromComponent) },
  { path: 'ex2', loadComponent: () => import('./exercises/ex2-interval-timer.component').then(m => m.Ex2IntervalTimerComponent) },
  { path: 'ex3', loadComponent: () => import('./exercises/ex3-from-event.component').then(m => m.Ex3FromEventComponent) },
  { path: 'ex4', loadComponent: () => import('./exercises/ex4-defer.component').then(m => m.Ex4DeferComponent) },
  { path: 'ex5', loadComponent: () => import('./exercises/ex5-range-generate.component').then(m => m.Ex5RangeGenerateComponent) },
  { path: 'ex6', loadComponent: () => import('./exercises/ex6-fork-join.component').then(m => m.Ex6ForkJoinComponent) },
  { path: 'ex7', loadComponent: () => import('./exercises/ex7-combinator-dashboard.component').then(m => m.Ex7CombinatorDashboardComponent) },
  { path: 'ex8', loadComponent: () => import('./exercises/ex8-polling-typeahead.component').then(m => m.Ex8PollingTypeaheadComponent) },
  { path: '', redirectTo: 'ex1', pathMatch: 'full' }
];
```

---

## Exercise 1: of() & from() Explorer

**Goal**: Understand the difference between `of()` and `from()` with various input types. Visualize emissions as timeline events.

### Component

```typescript
// exercises/ex1-of-from.component.ts
import { Component, signal } from '@angular/core';
import { of, from } from 'rxjs';
import { toArray, delay, tap } from 'rxjs/operators';

interface Emission {
  source: string;
  value: string;
  index: number;
  timestamp: number;
}

@Component({
  selector: 'app-ex1',
  standalone: true,
  template: `
    <h2>Exercise 1: of() vs from() Explorer</h2>

    <div class="controls">
      <button (click)="runOfArray()">of([1,2,3])</button>
      <button (click)="runFromArray()">from([1,2,3])</button>
      <button (click)="runOfValues()">of(1, 2, 3)</button>
      <button (click)="runFromString()">from('hello')</button>
      <button (click)="runFromSet()">from(new Set)</button>
      <button (click)="runFromMap()">from(new Map)</button>
      <button (click)="runFromPromise()">from(Promise)</button>
      <button (click)="runFromGenerator()">from(generator)</button>
      <button (click)="clearLog()">Clear</button>
    </div>

    <h3>Emission Log</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Source</th>
          <th>Value</th>
          <th>Type</th>
          <th>Time (ms)</th>
        </tr>
      </thead>
      <tbody>
        @for (e of emissions(); track e.timestamp + '' + e.index) {
          <tr>
            <td>{{ e.index }}</td>
            <td>{{ e.source }}</td>
            <td><code>{{ e.value }}</code></td>
            <td>{{ getType(e.value) }}</td>
            <td>{{ e.timestamp }}</td>
          </tr>
        }
      </tbody>
    </table>

    <div class="insight">
      <h3>Key Insight</h3>
      <p><code>of([1,2,3])</code> emits the array as ONE value.</p>
      <p><code>from([1,2,3])</code> emits EACH element as separate values.</p>
      <p><code>of(1,2,3)</code> emits each argument as separate values (same as from for arrays).</p>
    </div>
  `
})
export class Ex1OfFromComponent {
  emissions = signal<Emission[]>([]);
  private startTime = 0;

  private log(source: string, value: any, index: number) {
    const entry: Emission = {
      source,
      value: JSON.stringify(value),
      index,
      timestamp: Date.now() - this.startTime
    };
    this.emissions.update(list => [...list, entry]);
  }

  private start() {
    this.startTime = Date.now();
  }

  runOfArray() {
    this.start();
    let i = 0;
    of([1, 2, 3]).subscribe({
      next: v => this.log('of([1,2,3])', v, i++),
      complete: () => this.log('of([1,2,3])', '--- COMPLETE ---', i++)
    });
  }

  runFromArray() {
    this.start();
    let i = 0;
    from([1, 2, 3]).subscribe({
      next: v => this.log('from([1,2,3])', v, i++),
      complete: () => this.log('from([1,2,3])', '--- COMPLETE ---', i++)
    });
  }

  runOfValues() {
    this.start();
    let i = 0;
    of(1, 2, 3).subscribe({
      next: v => this.log('of(1,2,3)', v, i++),
      complete: () => this.log('of(1,2,3)', '--- COMPLETE ---', i++)
    });
  }

  runFromString() {
    this.start();
    let i = 0;
    from('hello').subscribe({
      next: v => this.log("from('hello')", v, i++),
      complete: () => this.log("from('hello')", '--- COMPLETE ---', i++)
    });
  }

  runFromSet() {
    this.start();
    let i = 0;
    from(new Set([1, 2, 2, 3, 3, 3])).subscribe({
      next: v => this.log('from(Set)', v, i++),
      complete: () => this.log('from(Set)', '--- COMPLETE ---', i++)
    });
  }

  runFromMap() {
    this.start();
    let i = 0;
    from(new Map([['a', 1], ['b', 2]])).subscribe({
      next: v => this.log('from(Map)', v, i++),
      complete: () => this.log('from(Map)', '--- COMPLETE ---', i++)
    });
  }

  runFromPromise() {
    this.start();
    let i = 0;
    const promise = new Promise(resolve =>
      setTimeout(() => resolve('resolved after 500ms'), 500)
    );
    from(promise).subscribe({
      next: v => this.log('from(Promise)', v, i++),
      complete: () => this.log('from(Promise)', '--- COMPLETE ---', i++)
    });
  }

  runFromGenerator() {
    this.start();
    let i = 0;
    function* fib() {
      let a = 0, b = 1;
      while (a < 50) { yield a; [a, b] = [b, a + b]; }
    }
    from(fib()).subscribe({
      next: v => this.log('from(generator)', v, i++),
      complete: () => this.log('from(generator)', '--- COMPLETE ---', i++)
    });
  }

  clearLog() {
    this.emissions.set([]);
  }

  getType(value: string): string {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? 'array' : typeof parsed;
    } catch {
      return 'string';
    }
  }
}
```

### What You'll Learn
- `of()` wraps its arguments directly; `from()` iterates over its input
- `from()` handles arrays, strings, Sets, Maps, Promises, and generators
- Sync vs async timing differences (Promise is async, array is sync)

---

## Exercise 2: interval() & timer() Dashboard

**Goal**: Visualize `interval()` and `timer()` timelines side-by-side. Understand first-emission timing and completion behavior.

### Component

```typescript
// exercises/ex2-interval-timer.component.ts
import { Component, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, timer, Subscription } from 'rxjs';
import { take, map } from 'rxjs/operators';

interface TimelineEntry {
  label: string;
  value: number;
  elapsed: number;
}

@Component({
  selector: 'app-ex2',
  standalone: true,
  template: `
    <h2>Exercise 2: interval() & timer() Dashboard</h2>

    <div class="controls">
      <button (click)="startInterval()" [disabled]="running()">Start interval(1000)</button>
      <button (click)="startTimer()">Start timer(2000)</button>
      <button (click)="startTimerPeriodic()">Start timer(1000, 500)</button>
      <button (click)="startTimerImmediate()">Start timer(0, 1000)</button>
      <button (click)="stopAll()">Stop All</button>
      <button (click)="clearLog()">Clear</button>
    </div>

    <div class="dashboard">
      @for (entry of timeline(); track entry.elapsed + entry.label) {
        <div class="entry" [style.margin-left.px]="entry.elapsed / 10">
          <span class="dot" [class]="entry.label"></span>
          <span class="label">{{ entry.label }}: {{ entry.value }} @ {{ entry.elapsed }}ms</span>
        </div>
      }
    </div>

    <div class="comparison">
      <h3>Key Differences</h3>
      <table>
        <tr>
          <th>Creator</th>
          <th>First Emission</th>
          <th>Completes?</th>
        </tr>
        <tr>
          <td><code>interval(1000)</code></td>
          <td>After 1000ms</td>
          <td>Never</td>
        </tr>
        <tr>
          <td><code>timer(2000)</code></td>
          <td>After 2000ms</td>
          <td>Yes (immediately after)</td>
        </tr>
        <tr>
          <td><code>timer(1000, 500)</code></td>
          <td>After 1000ms</td>
          <td>Never</td>
        </tr>
        <tr>
          <td><code>timer(0, 1000)</code></td>
          <td>Immediately</td>
          <td>Never</td>
        </tr>
      </table>
    </div>
  `
})
export class Ex2IntervalTimerComponent {
  private destroyRef = inject(DestroyRef);
  timeline = signal<TimelineEntry[]>([]);
  running = signal(false);
  private subscriptions: Subscription[] = [];

  private log(label: string, value: number, start: number) {
    this.timeline.update(list => [...list, {
      label, value, elapsed: Date.now() - start
    }]);
  }

  startInterval() {
    this.running.set(true);
    const start = Date.now();
    const sub = interval(1000).pipe(
      take(5)
    ).subscribe({
      next: v => this.log('interval(1000)', v, start),
      complete: () => {
        this.log('interval(1000)', -1, start); // -1 = complete marker
        this.running.set(false);
      }
    });
    this.subscriptions.push(sub);
  }

  startTimer() {
    const start = Date.now();
    const sub = timer(2000).subscribe({
      next: v => this.log('timer(2000)', v, start),
      complete: () => this.log('timer(2000)', -1, start)
    });
    this.subscriptions.push(sub);
  }

  startTimerPeriodic() {
    const start = Date.now();
    const sub = timer(1000, 500).pipe(take(6)).subscribe({
      next: v => this.log('timer(1000,500)', v, start),
      complete: () => this.log('timer(1000,500)', -1, start)
    });
    this.subscriptions.push(sub);
  }

  startTimerImmediate() {
    const start = Date.now();
    const sub = timer(0, 1000).pipe(take(4)).subscribe({
      next: v => this.log('timer(0,1000)', v, start),
      complete: () => this.log('timer(0,1000)', -1, start)
    });
    this.subscriptions.push(sub);
  }

  stopAll() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.running.set(false);
  }

  clearLog() {
    this.timeline.set([]);
  }
}
```

### What You'll Learn
- `interval()` delays the first emission by one period; `timer(0, period)` emits immediately
- `timer(delay)` is a one-shot that completes; `timer(delay, period)` is periodic
- Visual proof that subscriptions to the same `interval()` are independent (cold)

---

## Exercise 3: fromEvent() Event Lab

**Goal**: Capture DOM events as Observables. Apply debounce, throttle, and map operators on event streams.

### Component

```typescript
// exercises/ex3-from-event.component.ts
import { Component, signal, inject, DestroyRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';
import { map, debounceTime, throttleTime, scan, buffer, filter, tap } from 'rxjs/operators';

interface EventLog {
  type: string;
  detail: string;
  time: number;
}

@Component({
  selector: 'app-ex3',
  standalone: true,
  template: `
    <h2>Exercise 3: fromEvent() Event Lab</h2>

    <div class="panels">
      <!-- Panel 1: Click counter -->
      <div class="panel">
        <h3>Click Stream</h3>
        <button #clickTarget style="padding: 20px; font-size: 18px;">
          Click Me! ({{ clickCount() }})
        </button>
        <p>Raw clicks: {{ clickCount() }}</p>
        <p>Throttled (500ms): {{ throttledCount() }}</p>
        <p>Double-clicks: {{ doubleClickCount() }}</p>
      </div>

      <!-- Panel 2: Input with debounce -->
      <div class="panel">
        <h3>Input Debounce</h3>
        <input #searchInput placeholder="Type to search..." style="padding: 10px; width: 300px;">
        <p>Raw keystrokes: {{ keystrokeCount() }}</p>
        <p>Debounced value (300ms): <strong>{{ debouncedValue() }}</strong></p>
      </div>

      <!-- Panel 3: Mouse position -->
      <div class="panel">
        <h3>Mouse Tracker (throttled 100ms)</h3>
        <div #mouseArea style="width:400px; height:200px; background:#f0f0f0; border:1px solid #ccc; position:relative;">
          <div [style.left.px]="mouseX()" [style.top.px]="mouseY()"
               style="width:10px; height:10px; background:red; border-radius:50%; position:absolute;">
          </div>
        </div>
        <p>Position: ({{ mouseX() }}, {{ mouseY() }})</p>
      </div>
    </div>

    <!-- Event log -->
    <h3>Event Log (last 20)</h3>
    <div class="log" style="max-height: 300px; overflow-y: auto; font-family: monospace;">
      @for (entry of eventLog(); track entry.time) {
        <div>[{{ entry.time }}ms] {{ entry.type }}: {{ entry.detail }}</div>
      }
    </div>
  `
})
export class Ex3FromEventComponent implements AfterViewInit {
  @ViewChild('clickTarget') clickTarget!: ElementRef<HTMLButtonElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mouseArea') mouseArea!: ElementRef<HTMLDivElement>;

  private destroyRef = inject(DestroyRef);
  private startTime = Date.now();

  clickCount = signal(0);
  throttledCount = signal(0);
  doubleClickCount = signal(0);
  keystrokeCount = signal(0);
  debouncedValue = signal('');
  mouseX = signal(0);
  mouseY = signal(0);
  eventLog = signal<EventLog[]>([]);

  private addLog(type: string, detail: string) {
    const entry = { type, detail, time: Date.now() - this.startTime };
    this.eventLog.update(log => [entry, ...log].slice(0, 20));
  }

  ngAfterViewInit() {
    // 1. Click stream — raw count
    const click$ = fromEvent(this.clickTarget.nativeElement, 'click');

    click$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.clickCount.update(c => c + 1);
      this.addLog('click', `Raw click #${this.clickCount()}`);
    });

    // 2. Throttled clicks
    click$.pipe(
      throttleTime(500),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.throttledCount.update(c => c + 1);
      this.addLog('throttled-click', `Throttled #${this.throttledCount()}`);
    });

    // 3. Double-click detection using buffer
    click$.pipe(
      buffer(click$.pipe(debounceTime(250))),
      filter(clicks => clicks.length >= 2),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(clicks => {
      this.doubleClickCount.update(c => c + 1);
      this.addLog('double-click', `${clicks.length} rapid clicks detected`);
    });

    // 4. Input with debounce
    const input$ = fromEvent<InputEvent>(this.searchInput.nativeElement, 'input');

    input$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.keystrokeCount.update(c => c + 1);
    });

    input$.pipe(
      map(() => this.searchInput.nativeElement.value),
      debounceTime(300),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.debouncedValue.set(value);
      this.addLog('debounced-input', `"${value}"`);
    });

    // 5. Mouse tracking with throttle
    fromEvent<MouseEvent>(this.mouseArea.nativeElement, 'mousemove').pipe(
      throttleTime(100),
      map(e => ({
        x: e.offsetX,
        y: e.offsetY
      })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(pos => {
      this.mouseX.set(pos.x);
      this.mouseY.set(pos.y);
    });
  }
}
```

### What You'll Learn
- `fromEvent()` wraps addEventListener/removeEventListener
- Combining `fromEvent` with `debounceTime`, `throttleTime`, `buffer`
- Automatic cleanup via `takeUntilDestroyed`
- Double-click detection pattern using `buffer` + `debounceTime`

---

## Exercise 4: defer() Lazy Evaluation Lab

**Goal**: Demonstrate the difference between eager and lazy Observable creation. Prove `defer()` re-evaluates per subscription.

### Component

```typescript
// exercises/ex4-defer.component.ts
import { Component, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, of, from, timer } from 'rxjs';
import { tap, retry, catchError, switchMap } from 'rxjs/operators';

interface TestResult {
  label: string;
  subscriptions: { subId: number; value: string; time: number }[];
}

@Component({
  selector: 'app-ex4',
  standalone: true,
  template: `
    <h2>Exercise 4: defer() Lazy Evaluation Lab</h2>

    <div class="controls">
      <button (click)="testEagerVsLazy()">Test 1: Eager vs Lazy Timestamp</button>
      <button (click)="testConditionalDefer()">Test 2: Conditional Logic</button>
      <button (click)="testRetryWithDefer()">Test 3: Retry with defer()</button>
      <button (click)="testPromiseDefer()">Test 4: Promise Eagerness</button>
      <button (click)="clearResults()">Clear</button>
    </div>

    @for (result of results(); track result.label) {
      <div class="result-card">
        <h3>{{ result.label }}</h3>
        <table>
          <tr>
            <th>Subscription</th>
            <th>Value</th>
            <th>Time (ms)</th>
          </tr>
          @for (sub of result.subscriptions; track sub.subId) {
            <tr>
              <td>Sub {{ sub.subId }}</td>
              <td><code>{{ sub.value }}</code></td>
              <td>{{ sub.time }}</td>
            </tr>
          }
        </table>
      </div>
    }
  `
})
export class Ex4DeferComponent {
  results = signal<TestResult[]>([]);

  testEagerVsLazy() {
    const start = Date.now();
    const eagerResult: TestResult = { label: 'of(Date.now()) — EAGER', subscriptions: [] };
    const lazyResult: TestResult = { label: 'defer(() => of(Date.now())) — LAZY', subscriptions: [] };

    // Eager — timestamp fixed at creation
    const eager$ = of(Date.now());

    // Lazy — timestamp computed per subscribe
    const lazy$ = defer(() => of(Date.now()));

    // Subscribe immediately
    eager$.subscribe(v => eagerResult.subscriptions.push({ subId: 1, value: String(v), time: Date.now() - start }));
    lazy$.subscribe(v => lazyResult.subscriptions.push({ subId: 1, value: String(v), time: Date.now() - start }));

    // Subscribe after 1 second
    setTimeout(() => {
      eager$.subscribe(v => eagerResult.subscriptions.push({ subId: 2, value: String(v), time: Date.now() - start }));
      lazy$.subscribe(v => lazyResult.subscriptions.push({ subId: 2, value: String(v), time: Date.now() - start }));
      this.results.update(r => [...r, eagerResult, lazyResult]);
    }, 1000);

    // Subscribe after 2 seconds
    setTimeout(() => {
      eager$.subscribe(v => eagerResult.subscriptions.push({ subId: 3, value: String(v), time: Date.now() - start }));
      lazy$.subscribe(v => lazyResult.subscriptions.push({ subId: 3, value: String(v), time: Date.now() - start }));
      this.results.set([...this.results()]); // trigger update
    }, 2000);
  }

  testConditionalDefer() {
    let useCache = false;
    const cachedData = { source: 'cache', data: [1, 2, 3] };
    const result: TestResult = { label: 'Conditional defer()', subscriptions: [] };

    const data$ = defer(() => {
      if (useCache) {
        return of(cachedData);
      }
      return of({ source: 'fresh', data: [4, 5, 6] });
    });

    // First subscription — useCache is false
    data$.subscribe(v => result.subscriptions.push({
      subId: 1, value: `source: ${v.source}`, time: 0
    }));

    // Change condition
    useCache = true;

    // Second subscription — useCache is now true
    data$.subscribe(v => result.subscriptions.push({
      subId: 2, value: `source: ${v.source}`, time: 0
    }));

    this.results.update(r => [...r, result]);
  }

  testRetryWithDefer() {
    let attempt = 0;
    const result: TestResult = { label: 'defer() with retry(3)', subscriptions: [] };

    defer(() => {
      attempt++;
      result.subscriptions.push({
        subId: attempt, value: `Attempt ${attempt}...`, time: 0
      });
      if (attempt < 3) {
        throw new Error(`Fail on attempt ${attempt}`);
      }
      return of(`Success on attempt ${attempt}`);
    }).pipe(
      retry(3),
      catchError(err => of(`Failed: ${err.message}`))
    ).subscribe(v => {
      result.subscriptions.push({ subId: 0, value: String(v), time: 0 });
      this.results.update(r => [...r, result]);
    });
  }

  testPromiseDefer() {
    const result: TestResult = { label: 'Promise eager vs defer(Promise) lazy', subscriptions: [] };
    let sideEffect = 0;

    // EAGER — Promise executes immediately
    const eager$ = from(new Promise(resolve => {
      sideEffect++;
      resolve(`eager (side effect ran at creation, count: ${sideEffect})`);
    }));

    // LAZY — Promise created per subscription
    const lazy$ = defer(() => new Promise(resolve => {
      sideEffect++;
      resolve(`lazy (side effect per subscribe, count: ${sideEffect})`);
    }));

    // Don't subscribe yet — but eager Promise already ran!
    result.subscriptions.push({
      subId: 0, value: `Side effects so far: ${sideEffect} (eager already ran!)`, time: 0
    });

    eager$.subscribe(v => result.subscriptions.push({ subId: 1, value: String(v), time: 0 }));
    lazy$.subscribe(v => result.subscriptions.push({ subId: 2, value: String(v), time: 0 }));
    lazy$.subscribe(v => {
      result.subscriptions.push({ subId: 3, value: String(v), time: 0 });
      this.results.update(r => [...r, result]);
    });
  }

  clearResults() {
    this.results.set([]);
  }
}
```

### What You'll Learn
- `defer()` re-evaluates its factory on every subscription
- `from(promise)` is eager; `defer(() => promise)` is lazy
- `defer()` enables retry with fresh state per attempt
- Conditional logic inside `defer()` re-evaluates at subscribe-time

---

## Exercise 5: range() & generate() Number Generators

**Goal**: Explore `range()` and `generate()` for producing sequences. Build custom numeric sequences (Fibonacci, powers, factorials).

### Component

```typescript
// exercises/ex5-range-generate.component.ts
import { Component, signal } from '@angular/core';
import { range, generate } from 'rxjs';
import { toArray, map, take, reduce } from 'rxjs/operators';

@Component({
  selector: 'app-ex5',
  standalone: true,
  template: `
    <h2>Exercise 5: range() & generate() Number Generators</h2>

    <div class="controls">
      <h3>range()</h3>
      <label>Start: <input type="number" #start value="1" style="width:60px"></label>
      <label>Count: <input type="number" #count value="10" style="width:60px"></label>
      <button (click)="runRange(+start.value, +count.value)">Run range()</button>
    </div>

    @if (rangeResult().length) {
      <div class="output">
        <strong>range({{ rangeStart() }}, {{ rangeCount() }}):</strong>
        {{ rangeResult().join(', ') }}
      </div>
    }

    <div class="generators">
      <h3>generate() — Built-in Sequences</h3>
      <button (click)="generatePowersOf2()">Powers of 2</button>
      <button (click)="generateFibonacci()">Fibonacci</button>
      <button (click)="generateFactorials()">Factorials</button>
      <button (click)="generateCollatz()">Collatz(27)</button>
      <button (click)="generateCustom()">Custom: x² (1..10)</button>
    </div>

    @if (genLabel()) {
      <div class="output">
        <strong>{{ genLabel() }}:</strong>
        <div class="sequence">
          @for (item of genResult(); track $index) {
            <span class="badge">{{ item }}</span>
          }
        </div>
        <p>Count: {{ genResult().length }} items</p>
      </div>
    }

    <div class="challenge">
      <h3>Challenge: Sum with range + reduce</h3>
      <button (click)="sumRange()">Sum of 1..100</button>
      @if (sum() !== null) {
        <p>Sum of 1 to 100 = <strong>{{ sum() }}</strong></p>
      }
    </div>
  `
})
export class Ex5RangeGenerateComponent {
  rangeResult = signal<number[]>([]);
  rangeStart = signal(1);
  rangeCount = signal(10);
  genResult = signal<string[]>([]);
  genLabel = signal('');
  sum = signal<number | null>(null);

  runRange(start: number, count: number) {
    this.rangeStart.set(start);
    this.rangeCount.set(count);
    range(start, count).pipe(toArray()).subscribe(arr => this.rangeResult.set(arr));
  }

  generatePowersOf2() {
    this.genLabel.set('Powers of 2 (up to 2^20)');
    generate({
      initialState: 1,
      condition: x => x <= 1_048_576,
      iterate: x => x * 2
    }).pipe(
      map(x => String(x)),
      toArray()
    ).subscribe(arr => this.genResult.set(arr));
  }

  generateFibonacci() {
    this.genLabel.set('Fibonacci (< 1000)');
    generate({
      initialState: [0, 1] as [number, number],
      condition: ([a]) => a < 1000,
      iterate: ([a, b]) => [b, a + b] as [number, number],
      resultSelector: ([a]) => String(a)
    }).pipe(toArray()).subscribe(arr => this.genResult.set(arr));
  }

  generateFactorials() {
    this.genLabel.set('Factorials (1! to 12!)');
    generate({
      initialState: { n: 1, fact: 1 },
      condition: s => s.n <= 12,
      iterate: s => ({ n: s.n + 1, fact: s.fact * (s.n + 1) }),
      resultSelector: s => `${s.n}! = ${s.fact}`
    }).pipe(toArray()).subscribe(arr => this.genResult.set(arr));
  }

  generateCollatz() {
    this.genLabel.set('Collatz sequence starting at 27');
    generate({
      initialState: 27,
      condition: x => x !== 1,
      iterate: x => x % 2 === 0 ? x / 2 : 3 * x + 1,
    }).pipe(
      map(x => String(x)),
      toArray()
    ).subscribe(arr => {
      this.genResult.set([...arr, '1']);
    });
  }

  generateCustom() {
    this.genLabel.set('x² for x = 1 to 10');
    generate({
      initialState: 1,
      condition: x => x <= 10,
      iterate: x => x + 1,
      resultSelector: x => `${x}² = ${x * x}`
    }).pipe(toArray()).subscribe(arr => this.genResult.set(arr));
  }

  sumRange() {
    range(1, 100).pipe(
      reduce((acc, val) => acc + val, 0)
    ).subscribe(total => this.sum.set(total));
  }
}
```

### What You'll Learn
- `range(start, count)` — count is NOT the end value
- `generate()` is a for-loop in Observable form
- `generate()` supports object state for complex sequences
- Using `toArray()` to collect synchronous emissions

---

## Exercise 6: forkJoin() Parallel Loading

**Goal**: Load multiple API resources in parallel using `forkJoin()`. Handle errors and partial failures.

### Component

```typescript
// exercises/ex6-fork-join.component.ts
import { Component, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, timer, throwError } from 'rxjs';
import { delay, map, catchError, tap, finalize } from 'rxjs/operators';

interface LoadResult {
  users: any[] | null;
  posts: any[] | null;
  comments: any[] | null;
  elapsed: number;
  error: string | null;
}

@Component({
  selector: 'app-ex6',
  standalone: true,
  template: `
    <h2>Exercise 6: forkJoin() Parallel Loading</h2>

    <div class="controls">
      <button (click)="loadAll()" [disabled]="loading()">
        {{ loading() ? 'Loading...' : 'Load All (Parallel)' }}
      </button>
      <button (click)="loadSequential()" [disabled]="loading()">
        Load Sequential (for comparison)
      </button>
      <button (click)="loadWithError()" [disabled]="loading()">
        Load with Simulated Error
      </button>
      <button (click)="loadWithErrorRecovery()" [disabled]="loading()">
        Load with Error Recovery
      </button>
    </div>

    @if (result()) {
      <div class="result-card">
        <h3>Result ({{ result()!.elapsed }}ms)</h3>
        @if (result()!.error) {
          <p class="error">Error: {{ result()!.error }}</p>
        }
        <div class="data-grid">
          <div>
            <h4>Users</h4>
            <p>{{ result()!.users ? result()!.users!.length + ' loaded' : 'Failed' }}</p>
          </div>
          <div>
            <h4>Posts</h4>
            <p>{{ result()!.posts ? result()!.posts!.length + ' loaded' : 'Failed' }}</p>
          </div>
          <div>
            <h4>Comments</h4>
            <p>{{ result()!.comments ? result()!.comments!.length + ' loaded' : 'Failed' }}</p>
          </div>
        </div>
      </div>
    }

    <div class="note">
      <h3>Key Points</h3>
      <ul>
        <li><code>forkJoin</code> waits for ALL Observables to complete</li>
        <li>Requests run in parallel — total time = max(individual times)</li>
        <li>If ANY source errors, the entire forkJoin errors</li>
        <li>Use <code>catchError</code> on individual sources for partial failure recovery</li>
      </ul>
    </div>
  `
})
export class Ex6ForkJoinComponent {
  private http = inject(HttpClient);
  loading = signal(false);
  result = signal<LoadResult | null>(null);

  private readonly API = 'https://jsonplaceholder.typicode.com';

  loadAll() {
    this.loading.set(true);
    const start = Date.now();

    forkJoin({
      users: this.http.get<any[]>(`${this.API}/users`),
      posts: this.http.get<any[]>(`${this.API}/posts`).pipe(map(p => p.slice(0, 10))),
      comments: this.http.get<any[]>(`${this.API}/comments`).pipe(map(c => c.slice(0, 10)))
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ users, posts, comments }) => {
        this.result.set({ users, posts, comments, elapsed: Date.now() - start, error: null });
      },
      error: err => {
        this.result.set({ users: null, posts: null, comments: null, elapsed: Date.now() - start, error: err.message });
      }
    });
  }

  loadSequential() {
    this.loading.set(true);
    const start = Date.now();
    let users: any[] = [];
    let posts: any[] = [];

    this.http.get<any[]>(`${this.API}/users`).pipe(
      tap(u => users = u),
      switchMapTo(this.http.get<any[]>(`${this.API}/posts`)),
      tap(p => posts = p.slice(0, 10)),
      switchMapTo(this.http.get<any[]>(`${this.API}/comments`)),
      map(c => c.slice(0, 10)),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: comments => {
        this.result.set({ users, posts, comments, elapsed: Date.now() - start, error: null });
      }
    });
  }

  loadWithError() {
    this.loading.set(true);
    const start = Date.now();

    forkJoin({
      users: this.http.get<any[]>(`${this.API}/users`),
      posts: this.http.get<any[]>(`${this.API}/invalid-endpoint`), // Will 404
      comments: this.http.get<any[]>(`${this.API}/comments`)
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ users, posts, comments }) => {
        this.result.set({ users, posts, comments, elapsed: Date.now() - start, error: null });
      },
      error: err => {
        this.result.set({
          users: null, posts: null, comments: null,
          elapsed: Date.now() - start,
          error: `forkJoin failed entirely: ${err.status} ${err.statusText}`
        });
      }
    });
  }

  loadWithErrorRecovery() {
    this.loading.set(true);
    const start = Date.now();

    forkJoin({
      users: this.http.get<any[]>(`${this.API}/users`).pipe(
        catchError(() => of(null)) // Recover individually
      ),
      posts: this.http.get<any[]>(`${this.API}/invalid-endpoint`).pipe(
        catchError(() => of(null)) // Recover individually
      ),
      comments: this.http.get<any[]>(`${this.API}/comments`).pipe(
        map(c => c.slice(0, 10)),
        catchError(() => of(null))
      )
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe(({ users, posts, comments }) => {
      this.result.set({
        users, posts, comments,
        elapsed: Date.now() - start,
        error: posts === null ? 'Posts failed but others recovered' : null
      });
    });
  }
}

// Helper for sequential (import needed)
import { switchMap as switchMapTo } from 'rxjs/operators';
```

### What You'll Learn
- `forkJoin` runs Observables in parallel and waits for all to complete
- Parallel is faster than sequential (total time = max, not sum)
- One error kills the entire `forkJoin` unless handled with individual `catchError`
- Object syntax `forkJoin({ a: obs$, b: obs$ })` provides named results

---

## Exercise 7: Creation Operator Combinator Dashboard

**Goal**: Combine multiple creation operators in a single real-time dashboard. Use `merge`, `combineLatest`, `concat`, and `race`.

### Component

```typescript
// exercises/ex7-combinator-dashboard.component.ts
import { Component, signal, inject, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge, combineLatest, concat, race, interval, timer, of, Subject } from 'rxjs';
import { map, take, scan, startWith, tap } from 'rxjs/operators';

interface StreamEvent {
  source: string;
  value: string;
  time: number;
  color: string;
}

@Component({
  selector: 'app-ex7',
  standalone: true,
  template: `
    <h2>Exercise 7: Creation Operator Combinators</h2>

    <div class="controls">
      <button (click)="runMerge()">merge()</button>
      <button (click)="runCombineLatest()">combineLatest()</button>
      <button (click)="runConcat()">concat()</button>
      <button (click)="runRace()">race()</button>
      <button (click)="clearLog()">Clear</button>
    </div>

    <p><strong>Active demo:</strong> {{ activeDemo() }}</p>

    <div class="timeline" style="font-family: monospace; line-height: 1.8;">
      @for (event of events(); track event.time + event.source) {
        <div [style.color]="event.color">
          [{{ event.time }}ms] {{ event.source }} → {{ event.value }}
        </div>
      }
    </div>

    <div class="legend">
      <h3>How They Differ</h3>
      <table>
        <tr><th>Operator</th><th>Behavior</th></tr>
        <tr><td><code>merge()</code></td><td>Interleaves all — first come, first served</td></tr>
        <tr><td><code>combineLatest()</code></td><td>Waits for all to emit once, then emits array of latest on any change</td></tr>
        <tr><td><code>concat()</code></td><td>Sequential — each must complete before next starts</td></tr>
        <tr><td><code>race()</code></td><td>First to emit wins, others unsubscribed</td></tr>
      </table>
    </div>
  `
})
export class Ex7CombinatorDashboardComponent {
  private destroyRef = inject(DestroyRef);
  events = signal<StreamEvent[]>([]);
  activeDemo = signal('');
  private stop$ = new Subject<void>();

  private addEvent(source: string, value: string, start: number, color: string) {
    this.events.update(list => [...list, {
      source, value, time: Date.now() - start, color
    }]);
  }

  runMerge() {
    this.clearLog();
    this.activeDemo.set('merge(fast$, medium$, slow$)');
    const start = Date.now();

    const fast$ = interval(300).pipe(take(4), map(i => `fast-${i}`));
    const medium$ = interval(500).pipe(take(3), map(i => `medium-${i}`));
    const slow$ = interval(1000).pipe(take(2), map(i => `slow-${i}`));

    merge(fast$, medium$, slow$).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: v => {
        const source = v.startsWith('fast') ? 'Fast' : v.startsWith('medium') ? 'Medium' : 'Slow';
        const color = v.startsWith('fast') ? 'green' : v.startsWith('medium') ? 'blue' : 'red';
        this.addEvent(source, v, start, color);
      },
      complete: () => this.addEvent('merge', '--- COMPLETE ---', start, 'black')
    });
  }

  runCombineLatest() {
    this.clearLog();
    this.activeDemo.set('combineLatest([a$, b$])');
    const start = Date.now();

    const a$ = timer(0, 1000).pipe(take(4), map(i => `A${i}`));
    const b$ = timer(500, 1000).pipe(take(3), map(i => `B${i}`));

    combineLatest([a$, b$]).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ([a, b]) => this.addEvent('combineLatest', `[${a}, ${b}]`, start, 'purple'),
      complete: () => this.addEvent('combineLatest', '--- COMPLETE ---', start, 'black')
    });
  }

  runConcat() {
    this.clearLog();
    this.activeDemo.set('concat(first$, second$, third$)');
    const start = Date.now();

    const first$ = interval(300).pipe(take(3), map(i => `first-${i}`));
    const second$ = interval(500).pipe(take(2), map(i => `second-${i}`));
    const third$ = of('third-done');

    concat(first$, second$, third$).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: v => {
        const color = v.startsWith('first') ? 'green' : v.startsWith('second') ? 'blue' : 'red';
        this.addEvent('concat', v, start, color);
      },
      complete: () => this.addEvent('concat', '--- COMPLETE ---', start, 'black')
    });
  }

  runRace() {
    this.clearLog();
    this.activeDemo.set('race(slow$, fast$) — fast wins!');
    const start = Date.now();

    const slow$ = timer(2000).pipe(map(() => 'slow-response'));
    const fast$ = timer(500).pipe(map(() => 'fast-response'));

    race(slow$, fast$).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: v => {
        const color = v === 'fast-response' ? 'green' : 'red';
        this.addEvent('race', `Winner: ${v}`, start, color);
      },
      complete: () => this.addEvent('race', '--- COMPLETE ---', start, 'black')
    });
  }

  clearLog() {
    this.events.set([]);
  }
}
```

### What You'll Learn
- `merge` interleaves; `concat` serializes; `combineLatest` combines latest; `race` picks winner
- Visual timing differences between combination strategies
- When `combineLatest` first emits (all sources must emit at least once)
- `race` unsubscribes losers automatically

---

## Exercise 8: Real-World Polling & Typeahead

**Goal**: Build two production patterns using creation operators: API polling with `timer` + `switchMap`, and typeahead search with `fromEvent` + `defer`.

### Component

```typescript
// exercises/ex8-polling-typeahead.component.ts
import { Component, signal, inject, DestroyRef, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { timer, fromEvent, defer, of, Subject, EMPTY } from 'rxjs';
import {
  switchMap, map, debounceTime, distinctUntilChanged,
  catchError, finalize, filter, tap, retry, shareReplay, startWith
} from 'rxjs/operators';

interface PollResult {
  data: any;
  timestamp: Date;
  pollCount: number;
}

@Component({
  selector: 'app-ex8',
  standalone: true,
  template: `
    <h2>Exercise 8: Real-World Polling & Typeahead</h2>

    <!-- Section 1: Polling -->
    <div class="section">
      <h3>1. API Polling with timer() + switchMap()</h3>
      <div class="controls">
        <label>
          Poll interval (ms):
          <input type="number" [value]="pollInterval()" (change)="pollInterval.set(+$any($event.target).value)" style="width:80px">
        </label>
        <button (click)="togglePolling()">
          {{ isPolling() ? 'Stop Polling' : 'Start Polling' }}
        </button>
      </div>

      @if (pollResult()) {
        <div class="poll-data">
          <p>Poll #{{ pollResult()!.pollCount }} at {{ pollResult()!.timestamp | date:'HH:mm:ss' }}</p>
          <p>Random user: {{ pollResult()!.data?.name }} ({{ pollResult()!.data?.email }})</p>
        </div>
      }
      @if (pollError()) {
        <p class="error">{{ pollError() }}</p>
      }
    </div>

    <!-- Section 2: Typeahead -->
    <div class="section">
      <h3>2. Typeahead Search with fromEvent() + defer()</h3>
      <input #searchInput placeholder="Search users by name..." style="padding:10px; width:400px; font-size:16px;">
      <p>Keystrokes: {{ keystrokeCount() }} | API calls: {{ apiCallCount() }}</p>

      @if (searchLoading()) {
        <p>Searching...</p>
      }

      @if (searchResults().length) {
        <ul>
          @for (user of searchResults(); track user.id) {
            <li>{{ user.name }} — {{ user.email }} ({{ user.company.name }})</li>
          }
        </ul>
      } @else if (!searchLoading() && searchQuery()) {
        <p>No results for "{{ searchQuery() }}"</p>
      }
    </div>

    <!-- Section 3: Explanation -->
    <div class="explanation">
      <h3>Patterns Used</h3>
      <table>
        <tr>
          <th>Pattern</th>
          <th>Creation Operators</th>
          <th>Why</th>
        </tr>
        <tr>
          <td>Polling</td>
          <td><code>timer(0, interval)</code></td>
          <td>Immediate first poll, then periodic. <code>switchMap</code> cancels in-flight if new poll triggers.</td>
        </tr>
        <tr>
          <td>Typeahead</td>
          <td><code>fromEvent</code> + <code>defer</code></td>
          <td><code>fromEvent</code> captures keystrokes. <code>defer</code> ensures fresh HTTP per search term.</td>
        </tr>
      </table>
    </div>
  `,
  imports: []
})
export class Ex8PollingTypeaheadComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private readonly API = 'https://jsonplaceholder.typicode.com';

  // Polling state
  pollInterval = signal(5000);
  isPolling = signal(false);
  pollResult = signal<PollResult | null>(null);
  pollError = signal<string | null>(null);
  private pollToggle$ = new Subject<boolean>();
  private pollCount = 0;

  // Typeahead state
  keystrokeCount = signal(0);
  apiCallCount = signal(0);
  searchLoading = signal(false);
  searchResults = signal<any[]>([]);
  searchQuery = signal('');

  constructor() {
    // Polling pipeline
    this.pollToggle$.pipe(
      switchMap(active => {
        if (!active) return EMPTY;
        return timer(0, this.pollInterval()).pipe(
          tap(() => this.pollCount++),
          switchMap(() =>
            defer(() => {
              const randomId = Math.floor(Math.random() * 10) + 1;
              return this.http.get(`${this.API}/users/${randomId}`);
            }).pipe(
              catchError(err => {
                this.pollError.set(err.message);
                return EMPTY;
              })
            )
          )
        );
      }),
      takeUntilDestroyed()
    ).subscribe(data => {
      this.pollError.set(null);
      this.pollResult.set({
        data,
        timestamp: new Date(),
        pollCount: this.pollCount
      });
    });
  }

  togglePolling() {
    const next = !this.isPolling();
    this.isPolling.set(next);
    this.pollToggle$.next(next);
    if (!next) this.pollCount = 0;
  }

  ngAfterViewInit() {
    const input$ = fromEvent<InputEvent>(this.searchInput.nativeElement, 'input');

    // Track raw keystrokes
    input$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.keystrokeCount.update(c => c + 1));

    // Debounced search pipeline
    input$.pipe(
      map(() => this.searchInput.nativeElement.value.trim()),
      tap(q => this.searchQuery.set(q)),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.searchLoading.set(true)),
      switchMap(query => {
        if (query.length < 2) {
          this.searchLoading.set(false);
          return of([]);
        }
        this.apiCallCount.update(c => c + 1);
        return defer(() =>
          this.http.get<any[]>(`${this.API}/users`).pipe(
            map(users => users.filter(u =>
              u.name.toLowerCase().includes(query.toLowerCase())
            )),
            catchError(() => of([])),
            finalize(() => this.searchLoading.set(false))
          )
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => this.searchResults.set(results));
  }
}
```

### What You'll Learn
- Production polling pattern: `timer(0, interval)` + `switchMap` + `retry`
- Typeahead pattern: `fromEvent` + `debounceTime` + `distinctUntilChanged` + `switchMap`
- `defer()` ensures fresh Observable per API call
- `switchMap` cancels in-flight requests when new ones arrive
- Proper loading/error state management with signals

---

## Study Checklist

| Exercise | Operators Covered | Status |
|----------|------------------|--------|
| 1. of() & from() Explorer | `of`, `from` | [ ] |
| 2. interval() & timer() Dashboard | `interval`, `timer` | [ ] |
| 3. fromEvent() Event Lab | `fromEvent`, `merge` | [ ] |
| 4. defer() Lazy Evaluation Lab | `defer`, `from(Promise)` | [ ] |
| 5. range() & generate() Generators | `range`, `generate` | [ ] |
| 6. forkJoin() Parallel Loading | `forkJoin`, `catchError` | [ ] |
| 7. Combinator Dashboard | `merge`, `combineLatest`, `concat`, `race` | [ ] |
| 8. Polling & Typeahead | `timer`, `fromEvent`, `defer`, `switchMap` | [ ] |

---

> **Next →** [RxJS Operators — Transformation](./RXJS_OPERATORS_TRANSFORMATION_PRACTICALS.md)
