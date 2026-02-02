# RxJS Fundamentals — Practicals

> **Phase 2 · Section 5** — 8 hands-on exercises from beginner to expert
> Target: RxJS 7.x · Angular 21 · Standalone · Signals interop

---

## Table of Contents

1. [Exercise 1: Observable from Scratch](#exercise-1-observable-from-scratch)
2. [Exercise 2: Hot vs Cold Explorer](#exercise-2-hot-vs-cold-explorer)
3. [Exercise 3: Subject Types Lab](#exercise-3-subject-types-lab)
4. [Exercise 4: Subscription Management & Memory Leaks](#exercise-4-subscription-management--memory-leaks)
5. [Exercise 5: Multicasting & Sharing Strategies](#exercise-5-multicasting--sharing-strategies)
6. [Exercise 6: Observable ↔ Signal Interop](#exercise-6-observable--signal-interop)
7. [Exercise 7: Real-Time Event Stream Dashboard](#exercise-7-real-time-event-stream-dashboard)
8. [Exercise 8: RxJS Service Pattern — State Management](#exercise-8-rxjs-service-pattern--state-management)
9. [Routing Setup](#routing-setup)
10. [Checklist](#checklist)

---

## Exercise 1: Observable from Scratch

**Goal**: Understand Observable internals by creating Observables manually and observing their lifecycle (next, error, complete, teardown).

### exercise1.component.ts

```typescript
import { Component, signal } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

interface LogEntry {
  time: number;
  type: 'next' | 'error' | 'complete' | 'subscribe' | 'unsubscribe' | 'teardown';
  value?: any;
}

@Component({
  selector: 'app-rxjs-ex1',
  standalone: true,
  template: `
    <h2>Exercise 1: Observable from Scratch</h2>

    <div class="controls">
      <button (click)="runSynchronous()">1. Synchronous Observable</button>
      <button (click)="runAsync()">2. Async Observable (timer)</button>
      <button (click)="runError()">3. Observable with Error</button>
      <button (click)="runTeardown()">4. Teardown on Unsubscribe</button>
      <button (click)="runLazy()">5. Lazy Execution Proof</button>
      <button (click)="clearLog()">Clear</button>
    </div>

    <div class="log">
      <h3>Event Log</h3>
      @for (entry of log(); track entry.time) {
        <div class="entry" [class]="entry.type">
          <span class="time">{{ entry.time }}ms</span>
          <span class="type">{{ entry.type }}</span>
          <span class="value">{{ entry.value ?? '' }}</span>
        </div>
      }
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li><strong>Sync</strong>: All next + complete happen before subscribe returns</li>
        <li><strong>Async</strong>: next arrives over time; complete at end</li>
        <li><strong>Error</strong>: After error, no more next/complete</li>
        <li><strong>Teardown</strong>: Cleanup runs on unsubscribe; stops async work</li>
        <li><strong>Lazy</strong>: Producer function runs ONLY on subscribe, not on creation</li>
      </ul>
    </div>
  `,
  styles: [`
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .log { max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 13px; }
    .entry { display: flex; gap: 12px; padding: 4px 8px; border-bottom: 1px solid #eee; }
    .time { color: #888; min-width: 60px; }
    .type { font-weight: bold; min-width: 100px; }
    .next { color: #27ae60; }
    .error { color: #e74c3c; }
    .complete { color: #3498db; }
    .subscribe, .unsubscribe { color: #f39c12; }
    .teardown { color: #9b59b6; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    button { margin: 4px; }
  `]
})
export class Exercise1Component {
  log = signal<LogEntry[]>([]);
  private startTime = 0;

  private addLog(type: LogEntry['type'], value?: any) {
    const time = Date.now() - this.startTime;
    this.log.update(l => [...l, { time, type, value }]);
  }

  clearLog() { this.log.set([]); }

  // 1. Synchronous Observable
  runSynchronous() {
    this.log.set([]);
    this.startTime = Date.now();

    const sync$ = new Observable<number>(subscriber => {
      this.addLog('next', 1);
      subscriber.next(1);
      this.addLog('next', 2);
      subscriber.next(2);
      this.addLog('next', 3);
      subscriber.next(3);
      this.addLog('complete');
      subscriber.complete();
    });

    this.addLog('subscribe', 'calling subscribe()...');
    sync$.subscribe({
      next: v => {},  // Already logged in producer
      complete: () => {}
    });
    this.addLog('subscribe', 'subscribe() returned (sync!)');
  }

  // 2. Async Observable
  runAsync() {
    this.log.set([]);
    this.startTime = Date.now();

    const async$ = new Observable<number>(subscriber => {
      let count = 0;
      const id = setInterval(() => {
        if (count < 5) {
          this.addLog('next', count);
          subscriber.next(count++);
        } else {
          this.addLog('complete');
          subscriber.complete();
          clearInterval(id);
        }
      }, 500);

      return () => {
        clearInterval(id);
        this.addLog('teardown', 'interval cleared');
      };
    });

    this.addLog('subscribe', 'subscribing...');
    async$.subscribe({
      next: () => {},
      complete: () => this.addLog('subscribe', 'observer.complete() called')
    });
  }

  // 3. Error Observable
  runError() {
    this.log.set([]);
    this.startTime = Date.now();

    const error$ = new Observable<number>(subscriber => {
      this.addLog('next', 1);
      subscriber.next(1);
      this.addLog('next', 2);
      subscriber.next(2);
      this.addLog('error', 'Something broke!');
      subscriber.error(new Error('Something broke!'));
      // These should NOT execute:
      this.addLog('next', '3 (should not appear if contract is correct)');
      subscriber.next(3);
    });

    error$.subscribe({
      next: () => {},
      error: (err) => this.addLog('subscribe', `observer.error: ${err.message}`)
    });
  }

  // 4. Teardown
  runTeardown() {
    this.log.set([]);
    this.startTime = Date.now();

    const teardown$ = new Observable<number>(subscriber => {
      let count = 0;
      this.addLog('subscribe', 'producer started, creating interval');
      const id = setInterval(() => {
        this.addLog('next', count);
        subscriber.next(count++);
      }, 300);

      return () => {
        clearInterval(id);
        this.addLog('teardown', 'interval cleared, resources freed');
      };
    });

    this.addLog('subscribe', 'subscribing...');
    const sub = teardown$.subscribe();

    // Unsubscribe after 1.5 seconds
    setTimeout(() => {
      this.addLog('unsubscribe', 'calling unsubscribe()');
      sub.unsubscribe();
    }, 1500);
  }

  // 5. Lazy Execution
  runLazy() {
    this.log.set([]);
    this.startTime = Date.now();

    this.addLog('subscribe', 'creating Observable...');
    const lazy$ = new Observable<string>(subscriber => {
      this.addLog('next', 'PRODUCER RUNNING — only because of subscribe()');
      subscriber.next('data');
      subscriber.complete();
    });
    this.addLog('subscribe', 'Observable created. Nothing executed yet.');

    setTimeout(() => {
      this.addLog('subscribe', 'NOW subscribing after 1 second...');
      lazy$.subscribe({
        next: () => {},
        complete: () => this.addLog('complete', 'done')
      });
    }, 1000);
  }
}
```

**What to Observe**:
- Sync: all events happen at 0ms — subscribe is synchronous
- Async: events are spread across time; teardown runs on complete
- Error: after error, the `next(3)` call in the producer is ignored
- Teardown: unsubscribe triggers the cleanup function
- Lazy: 1 second gap between creation and producer execution

---

## Exercise 2: Hot vs Cold Explorer

**Goal**: Demonstrate the difference between hot and cold Observables with visual timelines.

### exercise2.component.ts

```typescript
import {
  Component, signal, inject, DestroyRef, OnDestroy
} from '@angular/core';
import {
  Observable, interval, Subject, Subscription, fromEvent, share, timestamp
} from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface TimelineEvent {
  subscriber: string;
  value: number;
  time: number;
}

@Component({
  selector: 'app-rxjs-ex2',
  standalone: true,
  template: `
    <h2>Exercise 2: Hot vs Cold Observables</h2>

    <div class="panel">
      <h3>Cold Observable (interval — each subscriber gets own stream)</h3>
      <div class="controls">
        <button (click)="subscribeColdA()">Subscribe A</button>
        <button (click)="subscribeColdB()">Subscribe B (2s later)</button>
        <button (click)="unsubscribeCold()">Unsubscribe All</button>
      </div>
      <div class="timeline">
        @for (e of coldEvents(); track e.time + e.subscriber) {
          <span class="event" [class]="e.subscriber === 'A' ? 'sub-a' : 'sub-b'">
            {{ e.subscriber }}:{{ e.value }}
          </span>
        }
      </div>
      <p class="hint">A and B have independent sequences — both start at 0.</p>
    </div>

    <div class="panel">
      <h3>Hot Observable (shared interval — subscribers share stream)</h3>
      <div class="controls">
        <button (click)="subscribeHotA()">Subscribe A</button>
        <button (click)="subscribeHotB()">Subscribe B (2s later)</button>
        <button (click)="unsubscribeHot()">Unsubscribe All</button>
      </div>
      <div class="timeline">
        @for (e of hotEvents(); track e.time + e.subscriber) {
          <span class="event" [class]="e.subscriber === 'A' ? 'sub-a' : 'sub-b'">
            {{ e.subscriber }}:{{ e.value }}
          </span>
        }
      </div>
      <p class="hint">B joins mid-stream — gets same values as A (no replay).</p>
    </div>

    <div class="panel">
      <h3>Subject (manual hot — you push values)</h3>
      <div class="controls">
        <button (click)="subjectSubscribeA()">Subscribe A</button>
        <button (click)="subjectPush()">Push Value</button>
        <button (click)="subjectSubscribeB()">Subscribe B (late)</button>
        <button (click)="subjectComplete()">Complete</button>
      </div>
      <div class="timeline">
        @for (e of subjectEvents(); track e.time + e.subscriber) {
          <span class="event" [class]="e.subscriber === 'A' ? 'sub-a' : 'sub-b'">
            {{ e.subscriber }}:{{ e.value }}
          </span>
        }
      </div>
      <p class="hint">Values pushed before B subscribes are missed by B.</p>
      <p>Values pushed: {{ subjectCount() }}</p>
    </div>

    <div class="observation">
      <h3>Key Differences</h3>
      <table>
        <tr><th></th><th>Cold</th><th>Hot</th><th>Subject</th></tr>
        <tr><td>Producer</td><td>Per subscriber</td><td>Shared</td><td>External</td></tr>
        <tr><td>Start</td><td>On subscribe</td><td>On first subscribe (share)</td><td>On next()</td></tr>
        <tr><td>Late join</td><td>Gets all from start</td><td>Misses past</td><td>Misses past</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .panel { border: 1px solid #ddd; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .controls { display: flex; gap: 8px; margin: 8px 0; }
    .timeline { display: flex; flex-wrap: wrap; gap: 4px; min-height: 40px; padding: 8px;
                background: #f8f9fa; border-radius: 4px; }
    .event { padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    .sub-a { background: #d5f5e3; }
    .sub-b { background: #d6eaf8; }
    .hint { font-size: 13px; color: #666; font-style: italic; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    button { margin: 2px; }
  `]
})
export class Exercise2Component implements OnDestroy {
  // Cold
  coldEvents = signal<TimelineEvent[]>([]);
  private coldSubs: Subscription[] = [];
  private coldStart = 0;

  subscribeColdA() {
    this.coldStart = Date.now();
    this.coldEvents.set([]);
    const sub = interval(500).pipe(take(10)).subscribe(v =>
      this.coldEvents.update(e => [...e, { subscriber: 'A', value: v, time: Date.now() - this.coldStart }])
    );
    this.coldSubs.push(sub);
  }

  subscribeColdB() {
    const sub = interval(500).pipe(take(10)).subscribe(v =>
      this.coldEvents.update(e => [...e, { subscriber: 'B', value: v, time: Date.now() - this.coldStart }])
    );
    this.coldSubs.push(sub);
  }

  unsubscribeCold() {
    this.coldSubs.forEach(s => s.unsubscribe());
    this.coldSubs = [];
  }

  // Hot
  hotEvents = signal<TimelineEvent[]>([]);
  private hotSource$ = interval(500).pipe(take(20), share());
  private hotSubs: Subscription[] = [];
  private hotStart = 0;

  subscribeHotA() {
    this.hotStart = Date.now();
    this.hotEvents.set([]);
    const sub = this.hotSource$.subscribe(v =>
      this.hotEvents.update(e => [...e, { subscriber: 'A', value: v, time: Date.now() - this.hotStart }])
    );
    this.hotSubs.push(sub);
  }

  subscribeHotB() {
    const sub = this.hotSource$.subscribe(v =>
      this.hotEvents.update(e => [...e, { subscriber: 'B', value: v, time: Date.now() - this.hotStart }])
    );
    this.hotSubs.push(sub);
  }

  unsubscribeHot() {
    this.hotSubs.forEach(s => s.unsubscribe());
    this.hotSubs = [];
  }

  // Subject
  subjectEvents = signal<TimelineEvent[]>([]);
  private subject = new Subject<number>();
  subjectCount = signal(0);
  private subjectSubs: Subscription[] = [];
  private subjectStart = Date.now();

  subjectSubscribeA() {
    this.subjectStart = Date.now();
    this.subjectEvents.set([]);
    this.subjectCount.set(0);
    const sub = this.subject.subscribe(v =>
      this.subjectEvents.update(e => [...e, { subscriber: 'A', value: v, time: Date.now() - this.subjectStart }])
    );
    this.subjectSubs.push(sub);
  }

  subjectSubscribeB() {
    const sub = this.subject.subscribe(v =>
      this.subjectEvents.update(e => [...e, { subscriber: 'B', value: v, time: Date.now() - this.subjectStart }])
    );
    this.subjectSubs.push(sub);
  }

  subjectPush() {
    this.subjectCount.update(c => c + 1);
    this.subject.next(this.subjectCount());
  }

  subjectComplete() {
    this.subject.complete();
  }

  ngOnDestroy() {
    this.unsubscribeCold();
    this.unsubscribeHot();
    this.subjectSubs.forEach(s => s.unsubscribe());
  }
}
```

**What to Observe**:
- Cold: A starts at 0, B also starts at 0 (independent timers)
- Hot: B joins and gets same values as A (shared timer, B misses earlier values)
- Subject: push 3 values, then subscribe B — B only sees future values

---

## Exercise 3: Subject Types Lab

**Goal**: Compare all 4 Subject types side-by-side with identical operations.

### exercise3.component.ts

```typescript
import { Component, signal } from '@angular/core';
import { Subject, BehaviorSubject, ReplaySubject, AsyncSubject } from 'rxjs';

interface SubjectLog {
  type: string;
  values: number[];
}

@Component({
  selector: 'app-rxjs-ex3',
  standalone: true,
  template: `
    <h2>Exercise 3: Subject Types Lab</h2>
    <p>Same sequence of operations on all 4 Subject types. Compare results.</p>

    <div class="controls">
      <button (click)="runExperiment()">Run Experiment</button>
      <button (click)="clearAll()">Clear</button>
    </div>

    <div class="grid">
      @for (result of results(); track result.type) {
        <div class="card">
          <h3>{{ result.type }}</h3>
          <p>Late subscriber received: <strong>[{{ result.values.join(', ') }}]</strong></p>
        </div>
      }
    </div>

    <div class="sequence">
      <h3>Sequence of Operations</h3>
      <ol>
        <li>Create each Subject</li>
        <li>Emit values: 1, 2, 3</li>
        <li><strong>Subscribe LATE subscriber</strong></li>
        <li>Emit values: 4, 5</li>
        <li>Complete</li>
      </ol>
      <p>What does the late subscriber receive?</p>
    </div>

    <div class="custom-experiment">
      <h3>Custom Experiment</h3>
      <div class="controls">
        <button (click)="customEmit()">Emit {{ customCounter() }}</button>
        <button (click)="customSubscribe()">Add Late Subscriber</button>
        <button (click)="customComplete()">Complete</button>
        <button (click)="customReset()">Reset</button>
      </div>
      <div class="grid">
        <div class="card">
          <h4>BehaviorSubject (init: 0)</h4>
          @for (log of bsLog(); track $index) {
            <p class="log-entry">Sub {{ $index }}: [{{ log.join(', ') }}]</p>
          }
        </div>
        <div class="card">
          <h4>ReplaySubject(2)</h4>
          @for (log of rsLog(); track $index) {
            <p class="log-entry">Sub {{ $index }}: [{{ log.join(', ') }}]</p>
          }
        </div>
      </div>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <table>
        <tr><th>Subject Type</th><th>Late Subscriber Gets</th></tr>
        <tr><td>Subject</td><td>Only 4, 5 (missed 1, 2, 3)</td></tr>
        <tr><td>BehaviorSubject(0)</td><td>3 (latest), then 4, 5</td></tr>
        <tr><td>ReplaySubject(2)</td><td>2, 3 (last 2), then 4, 5</td></tr>
        <tr><td>AsyncSubject</td><td>5 (only on complete)</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; }
    .card { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
    .card h3 { margin-top: 0; color: #2c3e50; }
    .controls { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
    .sequence { background: #e8f4fd; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .log-entry { font-family: monospace; font-size: 13px; margin: 4px 0; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    button { margin: 2px; }
  `]
})
export class Exercise3Component {
  results = signal<SubjectLog[]>([]);

  runExperiment() {
    const logs: SubjectLog[] = [];

    // Subject
    const subject = new Subject<number>();
    subject.next(1); subject.next(2); subject.next(3);
    const subValues: number[] = [];
    subject.subscribe(v => subValues.push(v));
    subject.next(4); subject.next(5);
    subject.complete();
    logs.push({ type: 'Subject', values: [...subValues] });

    // BehaviorSubject
    const bs = new BehaviorSubject<number>(0);
    bs.next(1); bs.next(2); bs.next(3);
    const bsValues: number[] = [];
    bs.subscribe(v => bsValues.push(v));
    bs.next(4); bs.next(5);
    bs.complete();
    logs.push({ type: 'BehaviorSubject(0)', values: [...bsValues] });

    // ReplaySubject
    const rs = new ReplaySubject<number>(2);
    rs.next(1); rs.next(2); rs.next(3);
    const rsValues: number[] = [];
    rs.subscribe(v => rsValues.push(v));
    rs.next(4); rs.next(5);
    rs.complete();
    logs.push({ type: 'ReplaySubject(2)', values: [...rsValues] });

    // AsyncSubject
    const as = new AsyncSubject<number>();
    as.next(1); as.next(2); as.next(3);
    const asValues: number[] = [];
    as.subscribe(v => asValues.push(v));
    as.next(4); as.next(5);
    as.complete();
    logs.push({ type: 'AsyncSubject', values: [...asValues] });

    this.results.set(logs);
  }

  clearAll() { this.results.set([]); this.customReset(); }

  // Custom experiment
  customCounter = signal(1);
  bsLog = signal<number[][]>([]);
  rsLog = signal<number[][]>([]);
  private customBS = new BehaviorSubject<number>(0);
  private customRS = new ReplaySubject<number>(2);

  customEmit() {
    const val = this.customCounter();
    this.customBS.next(val);
    this.customRS.next(val);
    this.customCounter.update(c => c + 1);
  }

  customSubscribe() {
    const bsValues: number[] = [];
    const rsValues: number[] = [];
    this.customBS.subscribe(v => bsValues.push(v));
    this.customRS.subscribe(v => rsValues.push(v));
    // Show what the late subscriber received immediately
    this.bsLog.update(l => [...l, [...bsValues]]);
    this.rsLog.update(l => [...l, [...rsValues]]);

    // Continue tracking
    this.customBS.subscribe(v => {
      bsValues.push(v);
      this.bsLog.update(l => { l[l.length - 1] = [...bsValues]; return [...l]; });
    });
    this.customRS.subscribe(v => {
      rsValues.push(v);
      this.rsLog.update(l => { l[l.length - 1] = [...rsValues]; return [...l]; });
    });
  }

  customComplete() {
    this.customBS.complete();
    this.customRS.complete();
  }

  customReset() {
    this.customBS = new BehaviorSubject<number>(0);
    this.customRS = new ReplaySubject<number>(2);
    this.customCounter.set(1);
    this.bsLog.set([]);
    this.rsLog.set([]);
  }
}
```

**What to Observe**:
- Subject: late subscriber gets `[4, 5]` — missed everything before subscribe
- BehaviorSubject: late subscriber gets `[3, 4, 5]` — replays latest (3), then future
- ReplaySubject(2): late subscriber gets `[2, 3, 4, 5]` — replays last 2, then future
- AsyncSubject: late subscriber gets `[5]` — only the last value, only on complete

---

## Exercise 4: Subscription Management & Memory Leaks

**Goal**: Demonstrate memory leaks from unmanaged subscriptions and learn all Angular unsubscribe patterns.

### exercise4.component.ts

```typescript
import {
  Component, signal, inject, DestroyRef, OnDestroy
} from '@angular/core';
import { interval, Subscription, Subject } from 'rxjs';
import { takeUntil, take, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-rxjs-ex4',
  standalone: true,
  template: `
    <h2>Exercise 4: Subscription Management</h2>

    <div class="panel danger">
      <h3>1. Memory Leak (❌ No Unsubscribe)</h3>
      <p>Active subscriptions: {{ leakyCount() }}</p>
      <p>Values received: {{ leakyValues() }}</p>
      <button (click)="createLeak()">Create Leaky Subscription</button>
      <p class="hint">
        These subscriptions keep running even after component destruction.
        Check console — values keep printing after navigating away.
      </p>
    </div>

    <div class="panel safe">
      <h3>2. takeUntilDestroyed() (✅ Recommended)</h3>
      <p>Values: {{ takeUntilValues() }}</p>
      <button (click)="useTakeUntilDestroyed()">Start</button>
      <p class="hint">Auto-unsubscribes on component destroy.</p>
    </div>

    <div class="panel safe">
      <h3>3. toSignal() (✅ Best for Templates)</h3>
      <p>Timer: {{ timerSignal() }}</p>
      <p class="hint">toSignal() handles subscribe/unsubscribe automatically.</p>
    </div>

    <div class="panel safe">
      <h3>4. Composite Subscription (✅ Manual Grouping)</h3>
      <p>Active: {{ compositeActive() }}</p>
      <button (click)="addComposite()">Add Subscription</button>
      <button (click)="unsubscribeAll()">Unsubscribe All</button>
      <p class="hint">Subscription.add() groups multiple subs for batch cleanup.</p>
    </div>

    <div class="panel safe">
      <h3>5. DestroyRef.onDestroy (✅ Explicit Cleanup)</h3>
      <p>Values: {{ destroyRefValues() }}</p>
      <button (click)="useDestroyRef()">Start</button>
      <p class="hint">Register cleanup callback with DestroyRef.</p>
    </div>

    <div class="panel safe">
      <h3>6. take(N) — Auto-Complete</h3>
      <p>Values (first 5): {{ takeNValues() }}</p>
      <button (click)="useTakeN()">Start (takes 5)</button>
      <p class="hint">Completes after N values — subscription auto-cleans up.</p>
    </div>

    <div class="summary">
      <h3>Unsubscribe Strategy Guide</h3>
      <table>
        <tr><th>Pattern</th><th>Best For</th><th>Auto-Cleanup?</th></tr>
        <tr><td>takeUntilDestroyed()</td><td>Any component subscription</td><td>Yes (on destroy)</td></tr>
        <tr><td>toSignal()</td><td>Template-bound data</td><td>Yes (on destroy)</td></tr>
        <tr><td>async pipe</td><td>Template-only consumption</td><td>Yes (on destroy)</td></tr>
        <tr><td>Composite Subscription</td><td>Multiple subs in services</td><td>Manual .unsubscribe()</td></tr>
        <tr><td>DestroyRef.onDestroy()</td><td>Explicit cleanup needed</td><td>Yes (on destroy)</td></tr>
        <tr><td>take(N)</td><td>Limited value count</td><td>Yes (after N values)</td></tr>
        <tr><td>first()</td><td>Single value needed</td><td>Yes (after first value)</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .panel { border: 2px solid #ccc; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .danger { border-color: #e74c3c; }
    .safe { border-color: #27ae60; }
    .hint { font-size: 13px; color: #666; font-style: italic; }
    .summary { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    button { margin: 4px; }
  `]
})
export class Exercise4Component implements OnDestroy {
  private destroyRef = inject(DestroyRef);

  // 1. Leaky
  leakyCount = signal(0);
  leakyValues = signal(0);
  createLeak() {
    this.leakyCount.update(c => c + 1);
    interval(500).subscribe(v => {
      this.leakyValues.update(c => c + 1);
      console.log(`[LEAK] Sub #${this.leakyCount()} value: ${v}`);
    });
  }

  // 2. takeUntilDestroyed
  takeUntilValues = signal(0);
  useTakeUntilDestroyed() {
    interval(500).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(v => this.takeUntilValues.set(v));
  }

  // 3. toSignal
  timerSignal = toSignal(interval(1000), { initialValue: 0 });

  // 4. Composite
  compositeActive = signal(0);
  private composite = new Subscription();
  addComposite() {
    const sub = interval(500).subscribe(v =>
      console.log(`[Composite] Sub value: ${v}`)
    );
    this.composite.add(sub);
    this.compositeActive.update(c => c + 1);
  }
  unsubscribeAll() {
    this.composite.unsubscribe();
    this.composite = new Subscription();
    this.compositeActive.set(0);
  }

  // 5. DestroyRef
  destroyRefValues = signal(0);
  useDestroyRef() {
    const sub = interval(500).subscribe(v => this.destroyRefValues.set(v));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  // 6. take(N)
  takeNValues = signal<number[]>([]);
  useTakeN() {
    this.takeNValues.set([]);
    interval(300).pipe(take(5)).subscribe({
      next: v => this.takeNValues.update(a => [...a, v]),
      complete: () => console.log('[take(5)] Auto-completed')
    });
  }

  ngOnDestroy() {
    this.composite.unsubscribe();
    console.log('[Exercise4] Component destroyed. Check if leaky subs still run!');
  }
}
```

---

## Exercise 5: Multicasting & Sharing Strategies

**Goal**: Compare `share()`, `shareReplay()`, and `connectable()` with HTTP request simulation.

### exercise5.component.ts

```typescript
import {
  Component, signal
} from '@angular/core';
import {
  Observable, Subscription, connectable, Subject, timer
} from 'rxjs';
import {
  share, shareReplay, delay, tap, take, finalize
} from 'rxjs/operators';

@Component({
  selector: 'app-rxjs-ex5',
  standalone: true,
  template: `
    <h2>Exercise 5: Multicasting & Sharing</h2>

    <div class="panel">
      <h3>1. No Sharing (Cold — duplicate requests)</h3>
      <button (click)="runNoShare()">Subscribe Twice</button>
      <p>HTTP calls made: {{ noShareCalls() }}</p>
      <p>Sub A: {{ noShareA() }} | Sub B: {{ noShareB() }}</p>
      <p class="hint">Each subscribe triggers a new "HTTP request".</p>
    </div>

    <div class="panel">
      <h3>2. share() — No replay</h3>
      <button (click)="runShare()">Subscribe A, then B (1s later)</button>
      <p>HTTP calls made: {{ shareCalls() }}</p>
      <p>Sub A: {{ shareA() }} | Sub B: {{ shareB() }}</p>
      <p class="hint">One request. B subscribes after emission → gets nothing (no replay).</p>
    </div>

    <div class="panel">
      <h3>3. shareReplay(1) — Cached replay</h3>
      <button (click)="runShareReplay()">Subscribe A, then B (1s later)</button>
      <p>HTTP calls made: {{ shareReplayCalls() }}</p>
      <p>Sub A: {{ shareReplayA() }} | Sub B: {{ shareReplayB() }}</p>
      <p class="hint">One request. B subscribes late → gets cached value immediately.</p>
    </div>

    <div class="panel">
      <h3>4. shareReplay with refCount</h3>
      <button (click)="runRefCount()">Subscribe, unsub all, re-subscribe</button>
      <p>HTTP calls: {{ refCountCalls() }}</p>
      <p>Results: {{ refCountResults() }}</p>
      <p class="hint">
        refCount:true → unsubscribe all → cache cleared → re-subscribe triggers new request.
        refCount:false → cache persists forever.
      </p>
    </div>

    <div class="observation">
      <h3>Sharing Strategy Decision</h3>
      <table>
        <tr><th>Strategy</th><th>Replays?</th><th>HTTP calls</th><th>Use case</th></tr>
        <tr><td>No sharing</td><td>Each sub gets own</td><td>N per subscriber</td><td>Independent requests</td></tr>
        <tr><td>share()</td><td>No</td><td>1 while active</td><td>Live event streams</td></tr>
        <tr><td>shareReplay(1)</td><td>Yes (last)</td><td>1 total</td><td>API caching</td></tr>
        <tr><td>shareReplay({refCount:true})</td><td>Yes while active</td><td>1 per active period</td><td>Conditional caching</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .panel { border: 1px solid #ddd; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .hint { font-size: 13px; color: #666; font-style: italic; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    button { margin: 4px; }
  `]
})
export class Exercise5Component {
  // Simulate HTTP request
  private fakeHttp(callCounter: ReturnType<typeof signal>) {
    return new Observable<string>(sub => {
      callCounter.update(c => c + 1);
      console.log(`[HTTP] Request #${callCounter()}`);
      setTimeout(() => {
        sub.next(`Response #${callCounter()}`);
        sub.complete();
      }, 500);
    });
  }

  // 1. No sharing
  noShareCalls = signal(0);
  noShareA = signal('waiting');
  noShareB = signal('waiting');
  runNoShare() {
    this.noShareCalls.set(0);
    const source$ = this.fakeHttp(this.noShareCalls);
    source$.subscribe(v => this.noShareA.set(v));
    source$.subscribe(v => this.noShareB.set(v));
  }

  // 2. share()
  shareCalls = signal(0);
  shareA = signal('waiting');
  shareB = signal('waiting');
  runShare() {
    this.shareCalls.set(0);
    const source$ = this.fakeHttp(this.shareCalls).pipe(share());
    source$.subscribe(v => this.shareA.set(v));
    // B subscribes 1 second later — after emission
    setTimeout(() => source$.subscribe(v => this.shareB.set(v)), 1000);
  }

  // 3. shareReplay(1)
  shareReplayCalls = signal(0);
  shareReplayA = signal('waiting');
  shareReplayB = signal('waiting');
  runShareReplay() {
    this.shareReplayCalls.set(0);
    const source$ = this.fakeHttp(this.shareReplayCalls).pipe(shareReplay(1));
    source$.subscribe(v => this.shareReplayA.set(v));
    setTimeout(() => source$.subscribe(v => this.shareReplayB.set(v)), 1000);
  }

  // 4. refCount
  refCountCalls = signal(0);
  refCountResults = signal<string[]>([]);
  runRefCount() {
    this.refCountCalls.set(0);
    this.refCountResults.set([]);
    const source$ = this.fakeHttp(this.refCountCalls).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Subscribe and immediately unsubscribe
    const sub1 = source$.subscribe(v =>
      this.refCountResults.update(r => [...r, `sub1: ${v}`])
    );
    setTimeout(() => {
      sub1.unsubscribe();
      // Cache cleared (refCount dropped to 0)
      // Re-subscribe triggers NEW request
      source$.subscribe(v =>
        this.refCountResults.update(r => [...r, `re-sub: ${v}`])
      );
    }, 1000);
  }
}
```

---

## Exercise 6: Observable ↔ Signal Interop

**Goal**: Practice converting between Observables and Signals using `toSignal()`, `toObservable()`, and `rxResource()`.

### exercise6.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, computed, inject
} from '@angular/core';
import { toSignal, toObservable, rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { interval, Subject } from 'rxjs';
import {
  debounceTime, distinctUntilChanged, switchMap, map, filter, take
} from 'rxjs/operators';

@Component({
  selector: 'app-rxjs-ex6',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 6: Observable ↔ Signal Interop</h2>

    <div class="panel">
      <h3>1. toSignal() — Observable → Signal</h3>
      <p>Timer (from interval): {{ timer() }}</p>
      <p class="hint">interval(1000) converted to signal. No async pipe needed.</p>
    </div>

    <div class="panel">
      <h3>2. toObservable() → RxJS Operators → toSignal()</h3>
      <input [value]="searchInput()"
             (input)="searchInput.set($any($event.target).value)"
             placeholder="Type to search (debounced)..." />
      <p>Debounced: {{ debouncedSearch() }}</p>
      <p class="hint">signal → toObservable → debounceTime → distinctUntilChanged → toSignal</p>
    </div>

    <div class="panel">
      <h3>3. rxResource() — Declarative Async Loading</h3>
      <input type="number" [value]="userId()" min="1" max="10"
             (input)="userId.set(+$any($event.target).value)" />
      @if (userResource.isLoading()) {
        <p>Loading...</p>
      }
      @if (userResource.value(); as user) {
        <p><strong>{{ user.name }}</strong> — {{ user.email }}</p>
      }
      <p class="hint">rxResource auto-reloads when userId signal changes.</p>
    </div>

    <div class="panel">
      <h3>4. Search-Ahead (Full Pattern)</h3>
      <input [value]="searchAhead()"
             (input)="searchAhead.set($any($event.target).value)"
             placeholder="Search users..." />
      @if (searchResults().length > 0) {
        <ul>
          @for (user of searchResults(); track user.id) {
            <li>{{ user.name }} ({{ user.email }})</li>
          }
        </ul>
      } @else if (searchAhead().length >= 2) {
        <p>No results.</p>
      }
      <p class="hint">
        Signal → toObservable → debounce → distinctUntilChanged → switchMap(HTTP) → toSignal
      </p>
    </div>

    <div class="observation">
      <h3>Interop Patterns</h3>
      <table>
        <tr><th>From</th><th>To</th><th>API</th></tr>
        <tr><td>Observable</td><td>Signal</td><td>toSignal(obs$, { initialValue })</td></tr>
        <tr><td>Signal</td><td>Observable</td><td>toObservable(signal)</td></tr>
        <tr><td>Signal request → Observable loader</td><td>Resource signals</td><td>rxResource()</td></tr>
        <tr><td>Signal request → Promise loader</td><td>Resource signals</td><td>resource()</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .panel { border: 1px solid #ddd; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .hint { font-size: 13px; color: #666; font-style: italic; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    input { padding: 8px; width: 300px; border: 1px solid #ccc; border-radius: 4px; margin: 8px 0; }
    ul { list-style: none; padding: 0; }
    li { padding: 4px 0; }
  `]
})
export class Exercise6Component {
  private http = inject(HttpClient);

  // 1. toSignal()
  timer = toSignal(interval(1000).pipe(take(60)), { initialValue: 0 });

  // 2. toObservable + debounce + toSignal
  searchInput = signal('');
  debouncedSearch = toSignal(
    toObservable(this.searchInput).pipe(
      debounceTime(500),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // 3. rxResource
  userId = signal(1);
  userResource = rxResource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) =>
      this.http.get<any>(`https://jsonplaceholder.typicode.com/users/${request.id}`)
  });

  // 4. Search-ahead
  searchAhead = signal('');
  searchResults = toSignal(
    toObservable(this.searchAhead).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(term => term.length >= 2),
      switchMap(term =>
        this.http.get<any[]>(`https://jsonplaceholder.typicode.com/users`).pipe(
          map(users => users.filter(u =>
            u.name.toLowerCase().includes(term.toLowerCase())
          ))
        )
      )
    ),
    { initialValue: [] as any[] }
  );
}
```

---

## Exercise 7: Real-Time Event Stream Dashboard

**Goal**: Build a dashboard that processes multiple event streams using Subjects and multicasting.

### exercise7.component.ts

```typescript
import {
  Component, signal, computed, OnDestroy
} from '@angular/core';
import { Subject, BehaviorSubject, interval, merge, Subscription } from 'rxjs';
import { map, scan, share, bufferTime, filter } from 'rxjs/operators';

interface AppEvent {
  type: 'click' | 'error' | 'api' | 'user';
  message: string;
  timestamp: number;
}

@Component({
  selector: 'app-rxjs-ex7',
  standalone: true,
  template: `
    <h2>Exercise 7: Real-Time Event Stream Dashboard</h2>

    <div class="controls">
      <button (click)="emitClick()">Simulate Click</button>
      <button (click)="emitError()">Simulate Error</button>
      <button (click)="emitApiCall()">Simulate API Call</button>
      <button (click)="emitUserAction()">Simulate User Action</button>
      <button (click)="startAutoEvents()">Auto-Generate Events</button>
      <button (click)="stopAutoEvents()">Stop</button>
    </div>

    <div class="stats">
      <div class="stat">Total: {{ totalEvents() }}</div>
      <div class="stat">Clicks: {{ clickCount() }}</div>
      <div class="stat">Errors: {{ errorCount() }}</div>
      <div class="stat">API: {{ apiCount() }}</div>
      <div class="stat">User: {{ userCount() }}</div>
      <div class="stat">Events/sec: {{ eventsPerSecond() }}</div>
    </div>

    <div class="stream">
      <h3>Live Event Stream (last 20)</h3>
      @for (event of recentEvents(); track event.timestamp) {
        <div class="event-row" [class]="event.type">
          <span class="type">{{ event.type }}</span>
          <span class="msg">{{ event.message }}</span>
        </div>
      }
    </div>

    <div class="batched">
      <h3>Batched Events (every 2 seconds)</h3>
      <p>Last batch size: {{ lastBatchSize() }}</p>
    </div>
  `,
  styles: [`
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
    .stat { background: #e8f4fd; padding: 8px 16px; border-radius: 8px; font-weight: bold; }
    .stream { max-height: 300px; overflow-y: auto; }
    .event-row { display: flex; gap: 12px; padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
    .type { font-weight: bold; min-width: 60px; }
    .click { border-left: 3px solid #27ae60; }
    .error { border-left: 3px solid #e74c3c; }
    .api { border-left: 3px solid #3498db; }
    .user { border-left: 3px solid #f39c12; }
    .batched { background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 16px; }
    button { margin: 2px; }
  `]
})
export class Exercise7Component implements OnDestroy {
  // Event source — Subject (hot, multicast)
  private eventBus = new Subject<AppEvent>();
  private shared$ = this.eventBus.asObservable().pipe(share());
  private autoSub: Subscription | null = null;

  // Derived streams
  totalEvents = signal(0);
  clickCount = signal(0);
  errorCount = signal(0);
  apiCount = signal(0);
  userCount = signal(0);
  recentEvents = signal<AppEvent[]>([]);
  lastBatchSize = signal(0);
  eventsPerSecond = signal(0);

  private subs = new Subscription();

  constructor() {
    // Count all events
    this.subs.add(this.shared$.pipe(
      scan((count) => count + 1, 0)
    ).subscribe(c => this.totalEvents.set(c)));

    // Count by type
    this.subs.add(this.shared$.pipe(filter(e => e.type === 'click'), scan((c) => c + 1, 0))
      .subscribe(c => this.clickCount.set(c)));
    this.subs.add(this.shared$.pipe(filter(e => e.type === 'error'), scan((c) => c + 1, 0))
      .subscribe(c => this.errorCount.set(c)));
    this.subs.add(this.shared$.pipe(filter(e => e.type === 'api'), scan((c) => c + 1, 0))
      .subscribe(c => this.apiCount.set(c)));
    this.subs.add(this.shared$.pipe(filter(e => e.type === 'user'), scan((c) => c + 1, 0))
      .subscribe(c => this.userCount.set(c)));

    // Recent events (last 20)
    this.subs.add(this.shared$.pipe(
      scan((acc, event) => [event, ...acc].slice(0, 20), [] as AppEvent[])
    ).subscribe(events => this.recentEvents.set(events)));

    // Batched events (every 2 seconds)
    this.subs.add(this.shared$.pipe(
      bufferTime(2000),
      filter(batch => batch.length > 0)
    ).subscribe(batch => this.lastBatchSize.set(batch.length)));

    // Events per second
    this.subs.add(this.shared$.pipe(
      bufferTime(1000),
      map(batch => batch.length)
    ).subscribe(rate => this.eventsPerSecond.set(rate)));
  }

  emitClick() { this.emit('click', 'Button clicked'); }
  emitError() { this.emit('error', `Error: ${['404', '500', 'Timeout'][Math.floor(Math.random() * 3)]}`); }
  emitApiCall() { this.emit('api', `GET /api/${['users', 'products', 'orders'][Math.floor(Math.random() * 3)]}`); }
  emitUserAction() { this.emit('user', `User ${['login', 'logout', 'navigate', 'search'][Math.floor(Math.random() * 4)]}`); }

  private emit(type: AppEvent['type'], message: string) {
    this.eventBus.next({ type, message, timestamp: Date.now() });
  }

  startAutoEvents() {
    this.stopAutoEvents();
    this.autoSub = interval(200).subscribe(() => {
      const types: AppEvent['type'][] = ['click', 'error', 'api', 'user'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.emit(type, `Auto ${type}`);
    });
  }

  stopAutoEvents() {
    this.autoSub?.unsubscribe();
    this.autoSub = null;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.stopAutoEvents();
  }
}
```

---

## Exercise 8: RxJS Service Pattern — State Management

**Goal**: Build a complete Angular service using BehaviorSubject for state management, then compare with a signal-based equivalent.

### todo.service.ts

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// RxJS-based service
@Injectable({ providedIn: 'root' })
export class TodoServiceRxJS {
  private _todos$ = new BehaviorSubject<Todo[]>([]);

  readonly todos$ = this._todos$.asObservable();
  readonly completedCount$ = this.todos$.pipe(map(t => t.filter(x => x.completed).length));
  readonly pendingCount$ = this.todos$.pipe(map(t => t.filter(x => !x.completed).length));

  add(text: string) {
    const current = this._todos$.getValue();
    this._todos$.next([...current, { id: Date.now(), text, completed: false }]);
  }

  toggle(id: number) {
    const current = this._todos$.getValue();
    this._todos$.next(current.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  remove(id: number) {
    const current = this._todos$.getValue();
    this._todos$.next(current.filter(t => t.id !== id));
  }
}

// Signal-based service (Angular 21 preferred)
@Injectable({ providedIn: 'root' })
export class TodoServiceSignals {
  readonly todos = signal<Todo[]>([]);
  readonly completedCount = computed(() => this.todos().filter(t => t.completed).length);
  readonly pendingCount = computed(() => this.todos().filter(t => !t.completed).length);

  add(text: string) {
    this.todos.update(t => [...t, { id: Date.now(), text, completed: false }]);
  }

  toggle(id: number) {
    this.todos.update(t => t.map(x => x.id === id ? { ...x, completed: !x.completed } : x));
  }

  remove(id: number) {
    this.todos.update(t => t.filter(x => x.id !== id));
  }
}
```

### exercise8.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { TodoServiceRxJS, TodoServiceSignals, Todo } from './todo.service';

@Component({
  selector: 'app-rxjs-ex8',
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 8: RxJS vs Signal State Management</h2>

    <div class="input-row">
      <input [value]="newTodo()" (input)="newTodo.set($any($event.target).value)"
             (keyup.enter)="addToBoth()" placeholder="Add todo..." />
      <button (click)="addToBoth()">Add to Both</button>
    </div>

    <div class="grid">
      <div class="column">
        <h3>RxJS (BehaviorSubject)</h3>
        <p>Completed: {{ rxCompleted() }} | Pending: {{ rxPending() }}</p>
        @for (todo of rxTodos(); track todo.id) {
          <div class="todo" [class.done]="todo.completed">
            <input type="checkbox" [checked]="todo.completed"
                   (change)="rxService.toggle(todo.id)" />
            <span>{{ todo.text }}</span>
            <button (click)="rxService.remove(todo.id)">×</button>
          </div>
        }
      </div>

      <div class="column">
        <h3>Signals</h3>
        <p>Completed: {{ sigService.completedCount() }} | Pending: {{ sigService.pendingCount() }}</p>
        @for (todo of sigService.todos(); track todo.id) {
          <div class="todo" [class.done]="todo.completed">
            <input type="checkbox" [checked]="todo.completed"
                   (change)="sigService.toggle(todo.id)" />
            <span>{{ todo.text }}</span>
            <button (click)="sigService.remove(todo.id)">×</button>
          </div>
        }
      </div>
    </div>

    <div class="observation">
      <h3>Comparison</h3>
      <table>
        <tr><th>Aspect</th><th>RxJS Service</th><th>Signal Service</th></tr>
        <tr><td>State</td><td>BehaviorSubject + getValue()</td><td>signal()</td></tr>
        <tr><td>Derived</td><td>pipe(map(...))</td><td>computed()</td></tr>
        <tr><td>Template</td><td>toSignal() or async pipe</td><td>Direct signal()</td></tr>
        <tr><td>Boilerplate</td><td>More (asObservable, pipe)</td><td>Less</td></tr>
        <tr><td>Zoneless</td><td>Needs toSignal()</td><td>Native</td></tr>
        <tr><td>Async ops</td><td>Natural (operators)</td><td>Needs rxResource/toSignal</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .grid { display: flex; gap: 24px; }
    .column { flex: 1; border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
    .input-row { display: flex; gap: 8px; margin: 16px 0; }
    input[type="text"], input:not([type]) { padding: 8px; flex: 1; border: 1px solid #ccc; border-radius: 4px; }
    .todo { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eee; }
    .done span { text-decoration: line-through; color: #999; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    button { margin: 2px; }
  `]
})
export class Exercise8Component {
  rxService = inject(TodoServiceRxJS);
  sigService = inject(TodoServiceSignals);
  newTodo = signal('');

  // Convert RxJS observables to signals for template
  rxTodos = toSignal(this.rxService.todos$, { initialValue: [] as Todo[] });
  rxCompleted = toSignal(this.rxService.completedCount$, { initialValue: 0 });
  rxPending = toSignal(this.rxService.pendingCount$, { initialValue: 0 });

  addToBoth() {
    const text = this.newTodo().trim();
    if (!text) return;
    this.rxService.add(text);
    this.sigService.add(text);
    this.newTodo.set('');
  }
}
```

---

## Routing Setup

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'rxjs',
    children: [
      { path: 'ex1', loadComponent: () => import('./rxjs/exercise1.component').then(m => m.Exercise1Component) },
      { path: 'ex2', loadComponent: () => import('./rxjs/exercise2.component').then(m => m.Exercise2Component) },
      { path: 'ex3', loadComponent: () => import('./rxjs/exercise3.component').then(m => m.Exercise3Component) },
      { path: 'ex4', loadComponent: () => import('./rxjs/exercise4.component').then(m => m.Exercise4Component) },
      { path: 'ex5', loadComponent: () => import('./rxjs/exercise5.component').then(m => m.Exercise5Component) },
      { path: 'ex6', loadComponent: () => import('./rxjs/exercise6.component').then(m => m.Exercise6Component) },
      { path: 'ex7', loadComponent: () => import('./rxjs/exercise7.component').then(m => m.Exercise7Component) },
      { path: 'ex8', loadComponent: () => import('./rxjs/exercise8.component').then(m => m.Exercise8Component) }
    ]
  }
];
```

---

## Checklist

- [ ] **Exercise 1**: Created Observable from scratch — understood next/error/complete/teardown lifecycle
- [ ] **Exercise 2**: Compared hot vs cold — understood producer sharing and late subscriber behavior
- [ ] **Exercise 3**: Tested all 4 Subject types — understood replay behavior differences
- [ ] **Exercise 4**: Identified memory leaks — mastered takeUntilDestroyed, toSignal, composite patterns
- [ ] **Exercise 5**: Compared share/shareReplay/refCount — understood multicasting strategies
- [ ] **Exercise 6**: Bridged Observable ↔ Signal — mastered toSignal, toObservable, rxResource
- [ ] **Exercise 7**: Built event stream dashboard — used Subject, share, scan, bufferTime
- [ ] **Exercise 8**: Compared RxJS vs Signal state management — understood trade-offs

---

*Next: Phase 2, Section 6 — RxJS Operators: Creation*
