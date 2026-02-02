# Angular Change Detection — Practicals

> **Phase 1 · Section 4** — 8 hands-on exercises from beginner to expert
> Target: Angular 21 · Standalone · Signals · Zone.js & Zoneless

---

## Table of Contents

1. [Exercise 1: Default vs OnPush Visual Comparison](#exercise-1-default-vs-onpush-visual-comparison)
2. [Exercise 2: Zone.js Event Tracker](#exercise-2-zonejs-event-tracker)
3. [Exercise 3: ChangeDetectorRef Methods Lab](#exercise-3-changedetectorref-methods-lab)
4. [Exercise 4: OnPush Pitfalls & Fixes](#exercise-4-onpush-pitfalls--fixes)
5. [Exercise 5: runOutsideAngular Performance](#exercise-5-runoutsideangular-performance)
6. [Exercise 6: Signal-Driven Reactivity](#exercise-6-signal-driven-reactivity)
7. [Exercise 7: Zoneless Change Detection](#exercise-7-zoneless-change-detection)
8. [Exercise 8: Full Dashboard — CD Performance Audit](#exercise-8-full-dashboard--cd-performance-audit)
9. [Exercise 9: Zoneless Bootstrap Lab](#exercise-9-zoneless-bootstrap-lab)
10. [Exercise 10: Signal Dependency Graph Explorer](#exercise-10-signal-dependency-graph-explorer)
11. [Exercise 11: resource() and rxResource() Data Loading](#exercise-11-resource-and-rxresource-data-loading)
12. [Routing Setup](#routing-setup)
13. [Checklist](#checklist)

---

## Exercise 1: Default vs OnPush Visual Comparison

**Goal**: Visualize exactly when components get checked under Default vs OnPush strategies.

### cd-counter.component.ts — Shared counter display

```typescript
import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';

@Component({
  selector: 'app-cd-counter',
  standalone: true,
  template: `
    <div class="counter-card" [class.highlight]="justChecked()">
      <h4>{{ label() }} ({{ strategy() }})</h4>
      <p>Check count: <strong>{{ checkCount }}</strong></p>
      <p>Value: {{ value() }}</p>
    </div>
  `,
  styles: [`
    .counter-card {
      border: 2px solid #ccc; padding: 12px; margin: 8px;
      border-radius: 8px; transition: border-color 0.3s;
    }
    .highlight { border-color: #e74c3c; background: #ffeaa7; }
  `]
})
export class CdCounterDefaultComponent {
  label = input<string>('Component');
  value = input<number>(0);
  strategy = input<string>('Default');

  checkCount = 0;
  private justChecked = signal(false);

  ngDoCheck() {
    this.checkCount++;
    this.justChecked.set(true);
    setTimeout(() => this.justChecked.set(false), 300);
  }
}

// OnPush version
@Component({
  selector: 'app-cd-counter-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="counter-card" [class.highlight]="justChecked()">
      <h4>{{ label() }} (OnPush)</h4>
      <p>Check count: <strong>{{ checkCount }}</strong></p>
      <p>Value: {{ value() }}</p>
    </div>
  `,
  styles: [`
    .counter-card {
      border: 2px solid #ccc; padding: 12px; margin: 8px;
      border-radius: 8px; transition: border-color 0.3s;
    }
    .highlight { border-color: #27ae60; background: #d5f5e3; }
  `]
})
export class CdCounterOnPushComponent {
  label = input<string>('Component');
  value = input<number>(0);

  checkCount = 0;
  private justChecked = signal(false);

  ngDoCheck() {
    this.checkCount++;
    this.justChecked.set(true);
    setTimeout(() => this.justChecked.set(false), 300);
  }
}
```

### exercise1.component.ts

```typescript
import { Component, signal } from '@angular/core';
import { CdCounterDefaultComponent, CdCounterOnPushComponent } from './cd-counter.component';

@Component({
  selector: 'app-exercise1',
  standalone: true,
  imports: [CdCounterDefaultComponent, CdCounterOnPushComponent],
  template: `
    <h2>Exercise 1: Default vs OnPush</h2>
    <p>Click buttons and watch which components get checked (flash).</p>

    <div class="controls">
      <button (click)="incrementA()">Increment A</button>
      <button (click)="incrementB()">Increment B</button>
      <button (click)="noOp()">No-Op Click (triggers CD)</button>
    </div>

    <div class="grid">
      <div class="column">
        <h3>Default Strategy</h3>
        <app-cd-counter label="Parent" [value]="counterA()" strategy="Default" />
        <app-cd-counter label="Sibling" [value]="counterB()" strategy="Default" />
        <app-cd-counter label="Unrelated" [value]="0" strategy="Default" />
      </div>
      <div class="column">
        <h3>OnPush Strategy</h3>
        <app-cd-counter-onpush label="Parent" [value]="counterA()" />
        <app-cd-counter-onpush label="Sibling" [value]="counterB()" />
        <app-cd-counter-onpush label="Unrelated" [value]="0" />
      </div>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li>Default: ALL components flash on every click (even No-Op)</li>
        <li>OnPush: Only components with changed inputs flash</li>
        <li>Compare check counts after 10 clicks on "Increment A"</li>
      </ul>
    </div>
  `,
  styles: [`
    .grid { display: flex; gap: 24px; }
    .column { flex: 1; }
    .controls { margin: 16px 0; display: flex; gap: 8px; }
    .observation { background: #f0f0f0; padding: 16px; margin-top: 16px; border-radius: 8px; }
  `]
})
export class Exercise1Component {
  counterA = signal(0);
  counterB = signal(0);

  incrementA() { this.counterA.update(v => v + 1); }
  incrementB() { this.counterB.update(v => v + 1); }
  noOp() { /* just a click — triggers Zone.js CD */ }
}
```

**What to Observe**:
- Default components: check count increases on **every** button click, including No-Op
- OnPush components: check count only increases when their specific input changes
- The "Unrelated" OnPush component should barely increase its check count

---

## Exercise 2: Zone.js Event Tracker

**Goal**: Visualize what Zone.js intercepts and how many CD cycles different async operations trigger.

### exercise2.component.ts

```typescript
import { Component, signal, inject, NgZone, ApplicationRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ZoneEvent {
  type: string;
  source: string;
  timestamp: number;
  cdTriggered: boolean;
}

@Component({
  selector: 'app-exercise2',
  standalone: true,
  template: `
    <h2>Exercise 2: Zone.js Event Tracker</h2>
    <p>Trigger various async operations and see how Zone.js reacts.</p>

    <div class="controls">
      <button (click)="triggerTimeout()">setTimeout</button>
      <button (click)="triggerInterval()">setInterval (3x)</button>
      <button (click)="triggerPromise()">Promise.resolve</button>
      <button (click)="triggerFetch()">HTTP GET</button>
      <button (click)="triggerOutsideZone()">Outside Zone</button>
      <button (click)="clearLog()">Clear Log</button>
    </div>

    <div class="stats">
      <p>Total CD cycles: <strong>{{ cdCycleCount() }}</strong></p>
      <p>Zone events logged: <strong>{{ events().length }}</strong></p>
    </div>

    <div class="event-log">
      <h3>Event Log</h3>
      @for (event of events(); track event.timestamp) {
        <div class="event" [class.outside]="!event.cdTriggered">
          <span class="type">{{ event.type }}</span>
          <span class="source">{{ event.source }}</span>
          <span class="cd">CD: {{ event.cdTriggered ? '✅ Yes' : '❌ No' }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .stats { background: #e8f4fd; padding: 12px; border-radius: 8px; margin: 8px 0; }
    .event-log { max-height: 400px; overflow-y: auto; }
    .event {
      display: flex; gap: 16px; padding: 8px;
      border-bottom: 1px solid #eee; font-family: monospace; font-size: 13px;
    }
    .type { font-weight: bold; min-width: 100px; }
    .outside { background: #fff3e0; }
  `]
})
export class Exercise2Component {
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);
  private appRef = inject(ApplicationRef);

  events = signal<ZoneEvent[]>([]);
  cdCycleCount = signal(0);

  constructor() {
    // Track CD cycles
    this.appRef.isStable.subscribe(stable => {
      if (stable) {
        this.cdCycleCount.update(c => c + 1);
      }
    });
  }

  private log(type: string, source: string, cdTriggered: boolean) {
    this.events.update(e => [...e, { type, source, timestamp: Date.now(), cdTriggered }]);
  }

  triggerTimeout() {
    this.log('SETUP', 'setTimeout scheduled', true);
    setTimeout(() => {
      this.log('CALLBACK', 'setTimeout fired', true);
    }, 500);
  }

  triggerInterval() {
    this.log('SETUP', 'setInterval scheduled (3 ticks)', true);
    let count = 0;
    const id = setInterval(() => {
      count++;
      this.log('CALLBACK', `setInterval tick #${count}`, true);
      if (count >= 3) clearInterval(id);
    }, 500);
  }

  triggerPromise() {
    this.log('SETUP', 'Promise.resolve() created', true);
    Promise.resolve('data').then(val => {
      this.log('CALLBACK', `Promise resolved: ${val}`, true);
    });
  }

  triggerFetch() {
    this.log('SETUP', 'HTTP GET started', true);
    this.http.get('https://jsonplaceholder.typicode.com/todos/1').subscribe({
      next: () => this.log('CALLBACK', 'HTTP response received', true),
      error: () => this.log('ERROR', 'HTTP request failed', true)
    });
  }

  triggerOutsideZone() {
    this.log('SETUP', 'Running outside zone...', true);
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        // This won't trigger CD!
        console.log('Outside zone timeout fired — no CD triggered');
        // To update UI, we need to re-enter the zone:
        this.ngZone.run(() => {
          this.log('CALLBACK', 'Outside zone → re-entered zone', true);
        });
      }, 500);
    });
  }

  clearLog() {
    this.events.set([]);
  }
}
```

**What to Observe**:
- Each `setTimeout` triggers 1 CD cycle; `setInterval` triggers 3
- The "Outside Zone" button shows that `setTimeout` outside the zone does NOT trigger CD
- Compare the CD cycle count after running the same operations inside vs outside zone

---

## Exercise 3: ChangeDetectorRef Methods Lab

**Goal**: Understand `detectChanges()`, `markForCheck()`, `detach()`, and `reattach()` in action.

### exercise3.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef,
  signal, inject, NgZone
} from '@angular/core';

@Component({
  selector: 'app-exercise3',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 3: ChangeDetectorRef Methods</h2>

    <div class="panel">
      <h3>1. markForCheck() vs detectChanges()</h3>
      <p>Current value: <strong>{{ valueFromOutsideZone }}</strong></p>
      <p>Check count: {{ checkCount }}</p>
      <button (click)="updateOutsideZone('markForCheck')">
        Update outside zone → markForCheck
      </button>
      <button (click)="updateOutsideZone('detectChanges')">
        Update outside zone → detectChanges
      </button>
      <button (click)="updateOutsideZone('none')">
        Update outside zone → No CD (broken)
      </button>
    </div>

    <div class="panel">
      <h3>2. detach() / reattach()</h3>
      <p>Timer value: <strong>{{ timerValue }}</strong></p>
      <p>Detached: <strong>{{ isDetached() }}</strong></p>
      <button (click)="toggleDetach()">
        {{ isDetached() ? 'Reattach' : 'Detach' }}
      </button>
      <button (click)="manualCheck()">Manual detectChanges()</button>
      <button (click)="startTimer()">Start Timer</button>
      <button (click)="stopTimer()">Stop Timer</button>
    </div>

    <div class="panel">
      <h3>3. Batch Update Comparison</h3>
      <p>Items: {{ batchItems.length }}</p>
      <button (click)="batchWithMarkForCheck()">
        Add 100 items with markForCheck (batched)
      </button>
      <button (click)="batchWithDetectChanges()">
        Add 100 items with detectChanges (100 CD cycles!)
      </button>
      <button (click)="batchItems = []">Clear</button>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li>"No CD" button: value updates internally but DOM doesn't change</li>
        <li>markForCheck: async — updates on next tick</li>
        <li>detectChanges: sync — updates immediately</li>
        <li>Detached component: timer updates internally but DOM freezes</li>
        <li>Batch: markForCheck adds all 100 items in 1 CD; detectChanges runs 100 CDs</li>
      </ul>
    </div>
  `,
  styles: [`
    .panel {
      border: 1px solid #ddd; padding: 16px; margin: 12px 0;
      border-radius: 8px;
    }
    button { margin: 4px; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; }
  `]
})
export class Exercise3Component {
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  valueFromOutsideZone = 0;
  checkCount = 0;
  timerValue = 0;
  isDetached = signal(false);
  batchItems: number[] = [];
  private timerInterval: any;

  ngDoCheck() {
    this.checkCount++;
  }

  // --- Section 1: markForCheck vs detectChanges ---
  updateOutsideZone(method: 'markForCheck' | 'detectChanges' | 'none') {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.valueFromOutsideZone++;

        if (method === 'markForCheck') {
          this.cdr.markForCheck();
          // Still need to trigger a CD cycle since we're outside zone
          this.ngZone.run(() => {}); // Empty run to trigger tick
        } else if (method === 'detectChanges') {
          this.cdr.detectChanges(); // Synchronous, works outside zone
        }
        // 'none' — value changes but DOM doesn't update
      }, 100);
    });
  }

  // --- Section 2: detach / reattach ---
  toggleDetach() {
    if (this.isDetached()) {
      this.cdr.reattach();
      this.isDetached.set(false);
    } else {
      this.cdr.detach();
      this.isDetached.set(true);
      this.cdr.detectChanges(); // Update the button text
    }
  }

  manualCheck() {
    this.cdr.detectChanges();
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timerValue++;
      // If detached, this won't show in DOM until manual check
    }, 100);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- Section 3: Batch comparison ---
  batchWithMarkForCheck() {
    for (let i = 0; i < 100; i++) {
      this.batchItems.push(i);
    }
    this.cdr.markForCheck(); // 1 CD cycle for all 100
  }

  batchWithDetectChanges() {
    for (let i = 0; i < 100; i++) {
      this.batchItems.push(i);
      this.cdr.detectChanges(); // 100 CD cycles!
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }
}
```

**What to Observe**:
- "No CD" button updates `valueFromOutsideZone` but DOM stays stale
- Detach the component, start the timer, then click "Manual detectChanges()" to see accumulated value
- Batch comparison: `markForCheck` is much more efficient for bulk updates

---

## Exercise 4: OnPush Pitfalls & Fixes

**Goal**: Experience common OnPush bugs and learn the correct patterns.

### exercise4.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef,
  signal, computed, input, inject
} from '@angular/core';

// --- Child component (OnPush) ---
@Component({
  selector: 'app-user-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="user-card" [class.stale]="stale()">
      <p><strong>{{ label() }}</strong>: {{ user().name }} ({{ user().age }})</p>
      <p class="check">Checks: {{ checkCount }}</p>
    </div>
  `,
  styles: [`
    .user-card { padding: 12px; border: 2px solid #27ae60; margin: 8px; border-radius: 8px; }
    .stale { border-color: #e74c3c; background: #fce4ec; }
    .check { font-size: 12px; color: #888; }
  `]
})
export class UserDisplayComponent {
  label = input<string>('');
  user = input.required<{ name: string; age: number }>();
  stale = input<boolean>(false);

  checkCount = 0;
  ngDoCheck() { this.checkCount++; }
}

// --- Parent component ---
@Component({
  selector: 'app-exercise4',
  standalone: true,
  imports: [UserDisplayComponent],
  template: `
    <h2>Exercise 4: OnPush Pitfalls & Fixes</h2>

    <h3>Pitfall 1: Object Mutation</h3>
    <app-user-display label="Mutated (broken)" [user]="mutatedUser" [stale]="true" />
    <app-user-display label="Immutable (correct)" [user]="immutableUser()" />
    <button (click)="mutateName()">Mutate Name</button>
    <button (click)="immutableUpdateName()">Immutable Update Name</button>

    <h3>Pitfall 2: Array Mutation</h3>
    <p>Items (mutated): {{ mutatedItems.length }} items</p>
    <p>Items (signal): {{ immutableItems().length }} items</p>
    <button (click)="pushToArray()">Push (mutate) — Won't Update</button>
    <button (click)="signalAddItem()">Signal Update — Will Update</button>

    <h3>Pitfall 3: Async Data Without async Pipe</h3>
    <app-user-display
      label="Broken (manual sub)"
      [user]="manualSubUser"
      [stale]="true"
    />
    <app-user-display
      label="Fixed (signal)"
      [user]="asyncUserSignal()"
    />
    <button (click)="loadUser()">Load Async User</button>

    <div class="observation">
      <h3>Pitfall Summary</h3>
      <table>
        <tr><th>Bug</th><th>Fix</th></tr>
        <tr>
          <td>Object mutation</td>
          <td>Spread operator / signal</td>
        </tr>
        <tr>
          <td>Array push</td>
          <td>signal.update with spread</td>
        </tr>
        <tr>
          <td>Manual subscribe</td>
          <td>toSignal() or async pipe</td>
        </tr>
      </table>
    </div>
  `,
  styles: [`
    table { border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
  `]
})
export class Exercise4Component {
  // Pitfall 1: Mutation vs Immutable
  mutatedUser = { name: 'Alice', age: 30 };
  immutableUser = signal({ name: 'Alice', age: 30 });

  mutateName() {
    this.mutatedUser.name = 'Bob';  // ❌ Same reference
  }

  immutableUpdateName() {
    this.immutableUser.update(u => ({ ...u, name: 'Bob' }));  // ✅ New reference
  }

  // Pitfall 2: Array mutation
  mutatedItems = [1, 2, 3];
  immutableItems = signal([1, 2, 3]);

  pushToArray() {
    this.mutatedItems.push(4);  // ❌ Same reference
  }

  signalAddItem() {
    this.immutableItems.update(items => [...items, items.length + 1]);  // ✅
  }

  // Pitfall 3: Async without async pipe
  manualSubUser = { name: 'Loading...', age: 0 };
  asyncUserSignal = signal({ name: 'Loading...', age: 0 });

  loadUser() {
    // Simulated async
    setTimeout(() => {
      const user = { name: 'Carol', age: 28 };
      this.manualSubUser = user;  // ❌ OnPush won't detect
      this.asyncUserSignal.set(user);  // ✅ Signal notifies Angular
    }, 500);
  }
}
```

**What to Observe**:
- "Mutate Name" button: the "broken" card doesn't update; "correct" card does
- "Push (mutate)" doesn't update the count; "Signal Update" does
- "Load Async User": the manual subscription card stays stale; the signal card updates

---

## Exercise 5: runOutsideAngular Performance

**Goal**: Compare performance of high-frequency operations inside vs outside Angular zone.

### exercise5.component.ts

```typescript
import {
  Component, signal, inject, NgZone, ElementRef,
  viewChild, ChangeDetectionStrategy, afterNextRender
} from '@angular/core';

@Component({
  selector: 'app-exercise5',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 5: runOutsideAngular Performance</h2>

    <div class="controls">
      <button (click)="startInsideZone()">Animate INSIDE Zone</button>
      <button (click)="startOutsideZone()">Animate OUTSIDE Zone</button>
      <button (click)="stopAnimation()">Stop</button>
    </div>

    <div class="stats">
      <p>CD cycles triggered: <strong>{{ cdCount() }}</strong></p>
      <p>Frames rendered: <strong>{{ frameCount() }}</strong></p>
      <p>Mode: <strong>{{ mode() }}</strong></p>
    </div>

    <canvas #canvas width="600" height="200"
      style="border: 1px solid #ccc; border-radius: 8px;">
    </canvas>

    <div class="mouse-tracker">
      <h3>Mouse Tracker</h3>
      <p>Position: {{ mousePos().x }}, {{ mousePos().y }}</p>
      <button (click)="toggleMouseTracking()">
        {{ mouseTracking() ? 'Stop' : 'Start' }} Mouse Tracking
        ({{ mouseMode() }})
      </button>
      <button (click)="toggleMouseMode()">
        Switch to {{ mouseMode() === 'inside' ? 'Outside' : 'Inside' }} Zone
      </button>
      <p>Mouse events received: {{ mouseEventCount() }}</p>
      <p>CD cycles from mouse: {{ mouseCdCount() }}</p>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li>Inside zone: CD count increases rapidly (~60/sec) — every frame triggers CD</li>
        <li>Outside zone: CD count stays low — animation runs without CD overhead</li>
        <li>Mouse tracking inside zone: hundreds of CD cycles from mousemove</li>
        <li>Mouse tracking outside zone: 0 extra CD cycles</li>
      </ul>
    </div>
  `,
  styles: [`
    .controls, .stats { margin: 12px 0; }
    .mouse-tracker { border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 8px; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; }
    button { margin: 4px; }
  `]
})
export class Exercise5Component {
  private ngZone = inject(NgZone);
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  cdCount = signal(0);
  frameCount = signal(0);
  mode = signal('idle');
  mousePos = signal({ x: 0, y: 0 });
  mouseTracking = signal(false);
  mouseMode = signal<'inside' | 'outside'>('inside');
  mouseEventCount = signal(0);
  mouseCdCount = signal(0);

  private animationId: number | null = null;
  private ballX = 0;
  private ballDirection = 1;
  private mouseMoveHandler: (() => void) | null = null;

  ngDoCheck() {
    this.cdCount.update(c => c + 1);
  }

  startInsideZone() {
    this.stopAnimation();
    this.mode.set('Inside Zone');
    this.frameCount.set(0);
    // Inside zone: each rAF triggers CD
    this.animateInsideZone();
  }

  startOutsideZone() {
    this.stopAnimation();
    this.mode.set('Outside Zone');
    this.frameCount.set(0);
    // Outside zone: rAF does NOT trigger CD
    this.ngZone.runOutsideAngular(() => {
      this.animateOutsideZone();
    });
  }

  private animateInsideZone() {
    const ctx = this.canvas().nativeElement.getContext('2d')!;
    this.ballX += 3 * this.ballDirection;
    if (this.ballX > 560 || this.ballX < 0) this.ballDirection *= -1;

    ctx.clearRect(0, 0, 600, 200);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(this.ballX + 20, 100, 20, 0, Math.PI * 2);
    ctx.fill();

    this.frameCount.update(f => f + 1);
    this.animationId = requestAnimationFrame(() => this.animateInsideZone());
  }

  private animateOutsideZone() {
    const ctx = this.canvas().nativeElement.getContext('2d')!;
    this.ballX += 3 * this.ballDirection;
    if (this.ballX > 560 || this.ballX < 0) this.ballDirection *= -1;

    ctx.clearRect(0, 0, 600, 200);
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(this.ballX + 20, 100, 20, 0, Math.PI * 2);
    ctx.fill();

    // Update signal from outside zone — still works for signal-based CD
    this.frameCount.update(f => f + 1);
    this.animationId = requestAnimationFrame(() => this.animateOutsideZone());
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.mode.set('idle');
  }

  toggleMouseTracking() {
    if (this.mouseTracking()) {
      this.mouseTracking.set(false);
      // Remove listener
    } else {
      this.mouseTracking.set(true);
      this.mouseEventCount.set(0);
      this.mouseCdCount.set(0);

      if (this.mouseMode() === 'outside') {
        this.ngZone.runOutsideAngular(() => {
          document.addEventListener('mousemove', this.onMouseMove);
        });
      } else {
        document.addEventListener('mousemove', this.onMouseMove);
      }
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    this.mousePos.set({ x: e.clientX, y: e.clientY });
    this.mouseEventCount.update(c => c + 1);
  };

  toggleMouseMode() {
    this.mouseMode.update(m => m === 'inside' ? 'outside' : 'inside');
  }

  ngOnDestroy() {
    this.stopAnimation();
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
```

**What to Observe**:
- Inside zone animation: CD count skyrockets (60+ per second)
- Outside zone animation: CD count stays relatively stable
- Mouse tracking inside zone: massive CD overhead from mousemove events
- Mouse tracking outside zone: events still captured but no CD overhead

---

## Exercise 6: Signal-Driven Reactivity

**Goal**: Build a component that relies entirely on signals for state and CD, comparing with traditional patterns.

### exercise6.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, computed,
  effect, untracked
} from '@angular/core';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

@Component({
  selector: 'app-exercise6',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 6: Signal-Driven Reactivity</h2>

    <div class="controls">
      <input
        [value]="searchTerm()"
        (input)="searchTerm.set($any($event.target).value)"
        placeholder="Search products..."
      />
      <select (change)="selectedCategory.set($any($event.target).value)">
        <option value="">All Categories</option>
        @for (cat of categories(); track cat) {
          <option [value]="cat">{{ cat }}</option>
        }
      </select>
      <label>
        <input
          type="checkbox"
          [checked]="inStockOnly()"
          (change)="inStockOnly.set($any($event.target).checked)"
        />
        In stock only
      </label>
    </div>

    <div class="stats">
      <p>Total: {{ products().length }} | Filtered: {{ filteredProducts().length }} |
         Average price: {{ averagePrice() | number:'1.2-2' }}</p>
      <p>Computed recalculations: {{ computedCount() }}</p>
      <p>Effect runs: {{ effectCount() }}</p>
    </div>

    <div class="product-grid">
      @for (product of filteredProducts(); track product.id) {
        <div class="product-card" [class.out-of-stock]="!product.inStock">
          <h4>{{ product.name }}</h4>
          <p>{{ product.category }} — \${{ product.price }}</p>
          <p>{{ product.inStock ? '✓ In stock' : '✗ Out of stock' }}</p>
          <button (click)="toggleStock(product.id)">Toggle Stock</button>
          <button (click)="adjustPrice(product.id, 5)">+$5</button>
          <button (click)="adjustPrice(product.id, -5)">-$5</button>
        </div>
      }
    </div>

    <div class="add-product">
      <h3>Add Product</h3>
      <button (click)="addRandomProduct()">Add Random Product</button>
      <button (click)="resetProducts()">Reset All</button>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li>Typing in search: filteredProducts recomputes (computed count increases)</li>
        <li>computed() is lazy: only recalculates when read AND dependencies changed</li>
        <li>effect() runs automatically when any read signal changes</li>
        <li>All state updates are through signal.set/update — no manual CD needed</li>
        <li>OnPush works perfectly with signals — no markForCheck needed</li>
      </ul>
    </div>
  `,
  styles: [`
    .controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 16px 0; }
    .stats { background: #e8f4fd; padding: 12px; border-radius: 8px; margin: 8px 0; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .product-card { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
    .out-of-stock { opacity: 0.5; }
    .add-product { margin: 16px 0; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    input[type="text"], select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin: 2px; }
  `]
})
export class Exercise6Component {
  // --- Source signals ---
  products = signal<Product[]>([
    { id: 1, name: 'Laptop', price: 999, category: 'Electronics', inStock: true },
    { id: 2, name: 'Keyboard', price: 79, category: 'Electronics', inStock: true },
    { id: 3, name: 'Desk Chair', price: 299, category: 'Furniture', inStock: false },
    { id: 4, name: 'Monitor', price: 449, category: 'Electronics', inStock: true },
    { id: 5, name: 'Standing Desk', price: 599, category: 'Furniture', inStock: true },
    { id: 6, name: 'Webcam', price: 69, category: 'Electronics', inStock: false },
    { id: 7, name: 'Bookshelf', price: 149, category: 'Furniture', inStock: true },
    { id: 8, name: 'Headphones', price: 199, category: 'Electronics', inStock: true },
  ]);

  searchTerm = signal('');
  selectedCategory = signal('');
  inStockOnly = signal(false);

  // --- Tracking signals for observation ---
  computedCount = signal(0);
  effectCount = signal(0);

  // --- Derived signals ---
  categories = computed(() => {
    return [...new Set(this.products().map(p => p.category))];
  });

  filteredProducts = computed(() => {
    this.computedCount.update(c => c + 1);

    let result = this.products();
    const search = this.searchTerm().toLowerCase();
    const category = this.selectedCategory();
    const stockOnly = this.inStockOnly();

    if (search) {
      result = result.filter(p => p.name.toLowerCase().includes(search));
    }
    if (category) {
      result = result.filter(p => p.category === category);
    }
    if (stockOnly) {
      result = result.filter(p => p.inStock);
    }
    return result;
  });

  averagePrice = computed(() => {
    const filtered = this.filteredProducts();
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, p) => sum + p.price, 0) / filtered.length;
  });

  constructor() {
    // Effect: log filter changes (demonstrates auto-tracking)
    effect(() => {
      const search = this.searchTerm();
      const cat = this.selectedCategory();
      const stock = this.inStockOnly();
      const count = this.filteredProducts().length;

      // Use untracked to avoid creating dependency on effectCount
      untracked(() => this.effectCount.update(c => c + 1));

      console.log(`Filter: search="${search}" cat="${cat}" stock=${stock} → ${count} results`);
    });
  }

  // --- Actions ---
  toggleStock(id: number) {
    this.products.update(products =>
      products.map(p => p.id === id ? { ...p, inStock: !p.inStock } : p)
    );
  }

  adjustPrice(id: number, delta: number) {
    this.products.update(products =>
      products.map(p => p.id === id ? { ...p, price: Math.max(0, p.price + delta) } : p)
    );
  }

  addRandomProduct() {
    const names = ['Tablet', 'Mouse', 'Printer', 'Scanner', 'Lamp', 'Drawer'];
    const categories = ['Electronics', 'Furniture', 'Office'];
    const id = Math.max(...this.products().map(p => p.id)) + 1;

    this.products.update(products => [...products, {
      id,
      name: names[Math.floor(Math.random() * names.length)],
      price: Math.floor(Math.random() * 500) + 50,
      category: categories[Math.floor(Math.random() * categories.length)],
      inStock: Math.random() > 0.3
    }]);
  }

  resetProducts() {
    this.products.set([
      { id: 1, name: 'Laptop', price: 999, category: 'Electronics', inStock: true },
      { id: 2, name: 'Keyboard', price: 79, category: 'Electronics', inStock: true },
    ]);
    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.inStockOnly.set(false);
  }
}
```

**What to Observe**:
- Typing in the search box incrementally filters products — `computed()` re-evaluates only when inputs change
- `effect()` logs every filter change automatically
- `untracked()` prevents `effectCount` from becoming a dependency
- All updates go through `signal.update()` with immutable patterns — no `markForCheck` needed

---

## Exercise 7: Zoneless Change Detection

**Goal**: Experience Angular without Zone.js and understand what breaks and what works.

### exercise7.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, computed,
  inject, ChangeDetectorRef
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-exercise7',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 7: Zoneless-Ready Patterns</h2>
    <p>These patterns work with AND without Zone.js.</p>

    <div class="panel">
      <h3>1. Signal State (works everywhere)</h3>
      <p>Count: {{ count() }}</p>
      <button (click)="count.update(c => c + 1)">Increment</button>
    </div>

    <div class="panel">
      <h3>2. setTimeout — The Zoneless Trap</h3>
      <p>Timer value (signal): {{ timerSignal() }}</p>
      <p>Timer value (plain): {{ timerPlain }}</p>
      <button (click)="startTimers()">Start Both Timers</button>
      <p class="hint">
        With Zone.js: both update. Without Zone.js: only signal updates.
      </p>
    </div>

    <div class="panel">
      <h3>3. Async Data Loading</h3>
      <p>User (toSignal): {{ userData()?.name ?? 'Not loaded' }}</p>
      <p>User (manual): {{ manualUserName }}</p>
      <button (click)="loadData()">Load User</button>
      <p class="hint">
        toSignal() works zoneless. Manual subscribe needs markForCheck().
      </p>
    </div>

    <div class="panel">
      <h3>4. Computed Chains</h3>
      <p>First: {{ firstName() }}</p>
      <p>Last: {{ lastName() }}</p>
      <p>Full (computed): {{ fullName() }}</p>
      <p>Greeting (computed): {{ greeting() }}</p>
      <input [value]="firstName()" (input)="firstName.set($any($event.target).value)" placeholder="First name" />
      <input [value]="lastName()" (input)="lastName.set($any($event.target).value)" placeholder="Last name" />
      <p class="hint">
        Computed chains resolve synchronously — no glitches.
      </p>
    </div>

    <div class="panel">
      <h3>5. Manual CD Control</h3>
      <p>External value: {{ externalValue }}</p>
      <button (click)="simulateExternalUpdate()">Simulate External Update</button>
      <button (click)="forceCd()">Force detectChanges()</button>
      <p class="hint">
        External update changes value but doesn't update DOM.
        Use detectChanges() or convert to signal.
      </p>
    </div>

    <div class="observation">
      <h3>Zoneless Readiness Checklist</h3>
      <ul>
        <li>✅ Use signal() for all component state</li>
        <li>✅ Use computed() for derived values</li>
        <li>✅ Use toSignal() for Observable → Signal conversion</li>
        <li>✅ Use input() / output() / model() for component I/O</li>
        <li>✅ DOM events in templates trigger CD automatically</li>
        <li>❌ Don't rely on setTimeout/setInterval triggering CD</li>
        <li>❌ Don't rely on Promise.then triggering CD</li>
        <li>❌ Don't use plain properties for async state</li>
      </ul>
    </div>
  `,
  styles: [`
    .panel { border: 1px solid #ddd; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .hint { font-size: 13px; color: #666; font-style: italic; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    input { padding: 8px; margin: 4px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin: 4px; }
  `]
})
export class Exercise7Component {
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  // 1. Signal state
  count = signal(0);

  // 2. Timer comparison
  timerSignal = signal(0);
  timerPlain = 0;

  // 3. Async data
  private userData$ = signal<any>(null);
  userData = computed(() => this.userData$());
  manualUserName = 'Not loaded';

  // 4. Computed chains
  firstName = signal('John');
  lastName = signal('Doe');
  fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
  greeting = computed(() => `Hello, ${this.fullName()}!`);

  // 5. External value
  externalValue = 'initial';

  startTimers() {
    this.timerSignal.set(0);
    this.timerPlain = 0;

    let count = 0;
    const id = setInterval(() => {
      count++;
      this.timerSignal.set(count);  // ✅ Signal — works zoneless
      this.timerPlain = count;      // ❌ Plain property — needs Zone.js
      if (count >= 10) clearInterval(id);
    }, 200);
  }

  loadData() {
    // Using toSignal pattern (zoneless-safe)
    this.http.get('https://jsonplaceholder.typicode.com/users/1').subscribe({
      next: (user: any) => {
        this.userData$.set(user);           // ✅ Signal
        this.manualUserName = user.name;    // ❌ Needs markForCheck
        this.cdr.markForCheck();            // Fix for manual property
      },
      error: () => {
        this.userData$.set({ name: 'Error loading' });
      }
    });
  }

  simulateExternalUpdate() {
    // Simulates a callback from a non-Angular source (e.g., WebSocket, third-party lib)
    setTimeout(() => {
      this.externalValue = `Updated at ${new Date().toLocaleTimeString()}`;
      // DOM won't update without zone.js or manual CD
    }, 100);
  }

  forceCd() {
    this.cdr.detectChanges();
  }
}
```

**What to Observe**:
- Signal-based state always works regardless of Zone.js presence
- Plain properties with `setTimeout` only work if Zone.js is present
- `toSignal()` and signal-based state are the path to zoneless

---

## Exercise 8: Full Dashboard — CD Performance Audit

**Goal**: Build a dashboard with intentional performance issues, then audit and fix them.

### exercise8.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, computed,
  inject, NgZone, ChangeDetectorRef
} from '@angular/core';

// --- Slow Widget (intentional performance issues) ---
@Component({
  selector: 'app-slow-widget',
  standalone: true,
  template: `
    <div class="widget">
      <h4>{{ title }}</h4>
      <p>Value: {{ getValue() }}</p>
      <p>Formatted: {{ formatDate(timestamp) }}</p>
      <p>Checks: {{ checkCount }}</p>
    </div>
  `,
  styles: [`
    .widget { border: 1px solid #ddd; padding: 12px; margin: 8px; border-radius: 8px; }
  `]
})
export class SlowWidgetComponent {
  title = 'Slow Widget';
  value = 42;
  timestamp = Date.now();
  checkCount = 0;

  // ❌ Anti-pattern: function call in template
  getValue() {
    // Simulate expensive computation
    let sum = 0;
    for (let i = 0; i < 10000; i++) sum += Math.random();
    return this.value + Math.floor(sum / 10000);
  }

  // ❌ Anti-pattern: function call with parameter in template
  formatDate(ts: number) {
    return new Date(ts).toLocaleString();
  }

  ngDoCheck() { this.checkCount++; }
}

// --- Optimized Widget (fixed version) ---
@Component({
  selector: 'app-fast-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="widget optimized">
      <h4>{{ title }}</h4>
      <p>Value: {{ computedValue() }}</p>
      <p>Formatted: {{ formattedDate() }}</p>
      <p>Checks: {{ checkCount }}</p>
    </div>
  `,
  styles: [`
    .widget { border: 1px solid #ddd; padding: 12px; margin: 8px; border-radius: 8px; }
    .optimized { border-color: #27ae60; }
  `]
})
export class FastWidgetComponent {
  title = 'Fast Widget';
  value = signal(42);
  timestamp = signal(Date.now());
  checkCount = 0;

  // ✅ Computed: only recalculates when value() changes
  computedValue = computed(() => {
    let sum = 0;
    for (let i = 0; i < 10000; i++) sum += Math.random();
    return this.value() + Math.floor(sum / 10000);
  });

  // ✅ Computed: only recalculates when timestamp() changes
  formattedDate = computed(() => new Date(this.timestamp()).toLocaleString());

  ngDoCheck() { this.checkCount++; }
}

// --- Dashboard ---
@Component({
  selector: 'app-exercise8',
  standalone: true,
  imports: [SlowWidgetComponent, FastWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 8: CD Performance Audit</h2>

    <div class="controls">
      <button (click)="triggerCd()">Trigger CD (click event)</button>
      <button (click)="addWidgets()">Add 10 Widgets</button>
      <button (click)="reset()">Reset</button>
    </div>

    <div class="stats">
      <p>Slow widgets: {{ slowCount() }} | Fast widgets: {{ fastCount() }}</p>
      <p>Parent CD checks: {{ parentChecks }}</p>
    </div>

    <div class="grid">
      <div class="column">
        <h3>Unoptimized (Default CD)</h3>
        @for (i of slowWidgets(); track i) {
          <app-slow-widget />
        }
      </div>
      <div class="column">
        <h3>Optimized (OnPush + Signals)</h3>
        @for (i of fastWidgets(); track i) {
          <app-fast-widget />
        }
      </div>
    </div>

    <div class="observation">
      <h3>Performance Audit Findings</h3>
      <table>
        <tr><th>Issue</th><th>Slow Widget</th><th>Fast Widget</th></tr>
        <tr>
          <td>CD Strategy</td>
          <td>❌ Default</td>
          <td>✅ OnPush</td>
        </tr>
        <tr>
          <td>Template functions</td>
          <td>❌ getValue() called every CD</td>
          <td>✅ computed() memoized</td>
        </tr>
        <tr>
          <td>Date formatting</td>
          <td>❌ formatDate() every CD</td>
          <td>✅ computed() only on change</td>
        </tr>
        <tr>
          <td>Check frequency</td>
          <td>Every parent CD cycle</td>
          <td>Only when inputs change</td>
        </tr>
      </table>
      <h4>How to Audit Your Own App</h4>
      <ol>
        <li>Add ngDoCheck counters to suspect components</li>
        <li>Use Angular DevTools profiler (CD tab)</li>
        <li>Search for function calls in templates (grep for {{ and () }})</li>
        <li>Check for Default CD strategy (absence of OnPush)</li>
        <li>Look for missing trackBy/track in loops</li>
        <li>Profile with Chrome DevTools Performance tab</li>
      </ol>
    </div>
  `,
  styles: [`
    .grid { display: flex; gap: 24px; }
    .column { flex: 1; }
    .controls { margin: 12px 0; }
    .stats { background: #e8f4fd; padding: 12px; border-radius: 8px; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    button { margin: 4px; }
  `]
})
export class Exercise8Component {
  slowWidgets = signal([1, 2, 3]);
  fastWidgets = signal([1, 2, 3]);
  slowCount = computed(() => this.slowWidgets().length);
  fastCount = computed(() => this.fastWidgets().length);
  parentChecks = 0;

  ngDoCheck() { this.parentChecks++; }

  triggerCd() {
    // Just a click — triggers CD on all Default components
  }

  addWidgets() {
    const next = this.slowWidgets().length + 1;
    const newItems = Array.from({ length: 10 }, (_, i) => next + i);
    this.slowWidgets.update(w => [...w, ...newItems]);
    this.fastWidgets.update(w => [...w, ...newItems]);
  }

  reset() {
    this.slowWidgets.set([1, 2, 3]);
    this.fastWidgets.set([1, 2, 3]);
  }
}
```

**What to Observe**:
- Click "Trigger CD" multiple times: slow widgets' check count skyrockets, fast widgets barely increment
- Add 10 widgets and click Trigger CD: slow side becomes noticeably laggy
- The "expensive computation" in `getValue()` runs on every CD in the slow widget
- The `computed()` version only recalculates when the dependency (`value()`) changes

---

## Exercise 9: Zoneless Bootstrap Lab

**Goal**: Bootstrap an Angular 21 app without Zone.js and experience first-hand what works and what breaks.

### Setup: main.ts (zoneless)

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { Exercise9Component } from './cd/exercise9.component';

bootstrapApplication(Exercise9Component, {
  providers: [
    provideZonelessChangeDetection(),  // No Zone.js!
    provideHttpClient()
  ]
});
```

### exercise9.component.ts

```typescript
import {
  Component, signal, computed, effect, inject,
  ChangeDetectorRef, linkedSignal, PendingTasks
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface TestResult {
  label: string;
  works: 'yes' | 'no' | 'pending';
  explanation: string;
}

@Component({
  selector: 'app-exercise9',
  standalone: true,
  template: `
    <h2>Exercise 9: Zoneless Bootstrap Lab</h2>
    <p>This app runs WITHOUT Zone.js. Test what triggers CD.</p>

    <!-- Panel 1: Signal state (works) -->
    <div class="panel pass">
      <h3>1. Signal State</h3>
      <p>Count: {{ count() }}</p>
      <button (click)="count.update(c => c + 1)">Increment</button>
      <p class="verdict">WORKS — signals notify the scheduler directly</p>
    </div>

    <!-- Panel 2: Computed chains (works) -->
    <div class="panel pass">
      <h3>2. Computed Chains</h3>
      <input [value]="firstName()" (input)="firstName.set($any($event.target).value)" />
      <input [value]="lastName()" (input)="lastName.set($any($event.target).value)" />
      <p>Full name: {{ fullName() }}</p>
      <p>Greeting: {{ greeting() }}</p>
      <p class="verdict">WORKS — computed propagates through signal graph</p>
    </div>

    <!-- Panel 3: setTimeout with plain property (BROKEN) -->
    <div class="panel fail">
      <h3>3. setTimeout + Plain Property</h3>
      <p>Value: {{ plainTimerValue }}</p>
      <button (click)="startPlainTimer()">Start Timer</button>
      <button (click)="cdr.detectChanges()">Force detectChanges()</button>
      <p class="verdict">BROKEN — no Zone.js to catch setTimeout. Click force CD to see stale value.</p>
    </div>

    <!-- Panel 4: setTimeout with signal (WORKS) -->
    <div class="panel pass">
      <h3>4. setTimeout + Signal</h3>
      <p>Value: {{ signalTimerValue() }}</p>
      <button (click)="startSignalTimer()">Start Timer</button>
      <p class="verdict">WORKS — signal.set() in setTimeout notifies scheduler</p>
    </div>

    <!-- Panel 5: setInterval polling (BROKEN vs WORKS) -->
    <div class="panel mixed">
      <h3>5. setInterval Polling</h3>
      <p>Plain counter: {{ pollingPlain }}</p>
      <p>Signal counter: {{ pollingSignal() }}</p>
      <button (click)="startPolling()">Start Polling</button>
      <button (click)="stopPolling()">Stop</button>
      <p class="verdict">Plain: BROKEN. Signal: WORKS. Same setInterval, different state management.</p>
    </div>

    <!-- Panel 6: Promise.then (BROKEN vs WORKS) -->
    <div class="panel mixed">
      <h3>6. Promise Resolution</h3>
      <p>Plain: {{ promisePlain }}</p>
      <p>Signal: {{ promiseSignal() }}</p>
      <button (click)="resolvePromise()">Resolve Promise</button>
      <p class="verdict">Plain: BROKEN. Signal: WORKS.</p>
    </div>

    <!-- Panel 7: HTTP with toSignal (WORKS) -->
    <div class="panel pass">
      <h3>7. HTTP + toSignal()</h3>
      <p>User: {{ httpUser()?.name ?? 'Not loaded' }}</p>
      <button (click)="loadUser()">Load User</button>
      <p class="verdict">WORKS — toSignal() sets a signal internally</p>
    </div>

    <!-- Panel 8: linkedSignal (WORKS) -->
    <div class="panel pass">
      <h3>8. linkedSignal Cascade</h3>
      <select (change)="selectedCategory.set($any($event.target).value)">
        @for (cat of categories; track cat) {
          <option [value]="cat">{{ cat }}</option>
        }
      </select>
      <p>Auto-selected item: {{ selectedItem() }}</p>
      <button (click)="selectedItem.set('Custom Override')">Override</button>
      <p class="verdict">WORKS — linkedSignal resets on source change, writable for override</p>
    </div>

    <!-- Panel 9: effect() side effects -->
    <div class="panel pass">
      <h3>9. Effect Side Effects</h3>
      <p>Effect log (check console): ran {{ effectRunCount() }} times</p>
      <button (click)="effectSource.update(v => v + 1)">Trigger Effect</button>
      <p class="verdict">WORKS — effects run after CD, triggered by signal deps</p>
    </div>

    <!-- Panel 10: DOM events without signals -->
    <div class="panel pass">
      <h3>10. Template Events</h3>
      <p>Clicks: {{ clickCount() }}</p>
      <button (click)="clickCount.update(c => c + 1)">Click Me</button>
      <p class="verdict">WORKS — Angular template events always trigger CD (even zoneless)</p>
    </div>

    <div class="summary">
      <h3>Zoneless CD Summary</h3>
      <table>
        <tr><th>Pattern</th><th>Zoneless?</th><th>Fix</th></tr>
        <tr><td>signal.set() anywhere</td><td>✅</td><td>—</td></tr>
        <tr><td>computed() chains</td><td>✅</td><td>—</td></tr>
        <tr><td>Template (click) etc.</td><td>✅</td><td>—</td></tr>
        <tr><td>toSignal(observable$)</td><td>✅</td><td>—</td></tr>
        <tr><td>linkedSignal</td><td>✅</td><td>—</td></tr>
        <tr><td>effect()</td><td>✅</td><td>—</td></tr>
        <tr><td>setTimeout + plain prop</td><td>❌</td><td>Use signal</td></tr>
        <tr><td>setInterval + plain prop</td><td>❌</td><td>Use signal</td></tr>
        <tr><td>Promise.then + plain prop</td><td>❌</td><td>Use signal</td></tr>
        <tr><td>HTTP subscribe + plain prop</td><td>❌</td><td>Use toSignal()</td></tr>
      </table>
    </div>
  `,
  styles: [`
    .panel { border: 2px solid #ccc; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .pass { border-color: #27ae60; }
    .fail { border-color: #e74c3c; }
    .mixed { border-color: #f39c12; }
    .verdict { font-size: 13px; font-style: italic; color: #555; margin-top: 8px; }
    .summary { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    input { padding: 6px; margin: 4px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin: 4px; }
  `]
})
export class Exercise9Component {
  cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  // 1. Signal state
  count = signal(0);

  // 2. Computed chains
  firstName = signal('John');
  lastName = signal('Doe');
  fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
  greeting = computed(() => `Hello, ${this.fullName()}!`);

  // 3. Plain timer (broken in zoneless)
  plainTimerValue = 0;
  startPlainTimer() {
    let v = 0;
    setInterval(() => { v++; this.plainTimerValue = v; }, 500);
  }

  // 4. Signal timer (works in zoneless)
  signalTimerValue = signal(0);
  startSignalTimer() {
    let v = 0;
    const id = setInterval(() => {
      v++;
      this.signalTimerValue.set(v);
      if (v >= 10) clearInterval(id);
    }, 500);
  }

  // 5. Polling
  pollingPlain = 0;
  pollingSignal = signal(0);
  private pollingId: any;
  startPolling() {
    this.stopPolling();
    let c = 0;
    this.pollingId = setInterval(() => {
      c++;
      this.pollingPlain = c;
      this.pollingSignal.set(c);
    }, 300);
  }
  stopPolling() { if (this.pollingId) clearInterval(this.pollingId); }

  // 6. Promise
  promisePlain = 'waiting';
  promiseSignal = signal('waiting');
  resolvePromise() {
    Promise.resolve('resolved!').then(val => {
      this.promisePlain = val;
      this.promiseSignal.set(val);
    });
  }

  // 7. HTTP
  httpUser = signal<any>(null);
  loadUser() {
    this.http.get('https://jsonplaceholder.typicode.com/users/1').subscribe(user => {
      this.httpUser.set(user);  // Signal → works zoneless
    });
  }

  // 8. linkedSignal
  categories = ['Electronics', 'Books', 'Clothing'];
  selectedCategory = signal('Electronics');
  private itemsByCategory: Record<string, string[]> = {
    Electronics: ['Laptop', 'Phone', 'Tablet'],
    Books: ['Novel', 'Textbook', 'Comic'],
    Clothing: ['Shirt', 'Pants', 'Hat']
  };
  categoryItems = computed(() => this.itemsByCategory[this.selectedCategory()] ?? []);
  selectedItem = linkedSignal({
    source: this.categoryItems,
    computation: (items) => items[0] ?? ''
  });

  // 9. Effect
  effectSource = signal(0);
  effectRunCount = signal(0);
  constructor() {
    effect(() => {
      const val = this.effectSource();
      console.log(`[Zoneless Effect] Source value: ${val}`);
      this.effectRunCount.update(c => c + 1);
    }, { allowSignalWrites: true });
  }

  // 10. Click counter
  clickCount = signal(0);

  ngOnDestroy() { this.stopPolling(); }
}
```

**What to Observe**:
- Panels 1, 2, 4, 7, 8, 9, 10 work perfectly without Zone.js
- Panels 3, 5 (plain), 6 (plain) stay stale — Zone.js isn't intercepting their callbacks
- Click "Force detectChanges()" on panel 3 to see the stale value catch up
- This exercise is the definitive proof that **signals are the path to zoneless**

---

## Exercise 10: Signal Dependency Graph Explorer

**Goal**: Visualize the signal reactive graph — how changes propagate from source signals through computed signals to component templates.

### exercise10.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, computed,
  effect, untracked
} from '@angular/core';

interface GraphNode {
  id: string;
  type: 'signal' | 'computed' | 'effect';
  value: any;
  dirtyCount: number;
  lastUpdated: number;
}

@Component({
  selector: 'app-exercise10',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 10: Signal Dependency Graph Explorer</h2>

    <div class="graph-visual">
      <h3>Reactive Graph</h3>
      <pre>{{ graphVisualization() }}</pre>
    </div>

    <div class="controls">
      <h3>Source Signals</h3>
      <div class="signal-row">
        <label>price (number):</label>
        <input type="number" [value]="price()" (input)="price.set(+$any($event.target).value)" />
        <span class="dirty-badge">Updates: {{ priceDirtyCount() }}</span>
      </div>
      <div class="signal-row">
        <label>quantity (number):</label>
        <input type="number" [value]="quantity()" (input)="quantity.set(+$any($event.target).value)" />
        <span class="dirty-badge">Updates: {{ quantityDirtyCount() }}</span>
      </div>
      <div class="signal-row">
        <label>taxRate (%):</label>
        <input type="number" [value]="taxRate()" step="0.5"
               (input)="taxRate.set(+$any($event.target).value)" />
        <span class="dirty-badge">Updates: {{ taxRateDirtyCount() }}</span>
      </div>
      <div class="signal-row">
        <label>couponCode:</label>
        <input [value]="couponCode()"
               (input)="couponCode.set($any($event.target).value)" />
        <span class="dirty-badge">Updates: {{ couponDirtyCount() }}</span>
      </div>
    </div>

    <div class="derived">
      <h3>Computed Signals (auto-derived)</h3>
      <div class="computed-row">
        <strong>subtotal</strong> = price × quantity =
        <span class="value">{{ subtotal() | number:'1.2-2' }}</span>
        <span class="recompute">Recomputed: {{ subtotalComputeCount() }}x</span>
      </div>
      <div class="computed-row">
        <strong>discount</strong> = couponCode → lookup =
        <span class="value">{{ discount() | percent }}</span>
        <span class="recompute">Recomputed: {{ discountComputeCount() }}x</span>
      </div>
      <div class="computed-row">
        <strong>discountedPrice</strong> = subtotal × (1 - discount) =
        <span class="value">{{ discountedPrice() | number:'1.2-2' }}</span>
        <span class="recompute">Recomputed: {{ discountedComputeCount() }}x</span>
      </div>
      <div class="computed-row">
        <strong>tax</strong> = discountedPrice × taxRate =
        <span class="value">{{ tax() | number:'1.2-2' }}</span>
        <span class="recompute">Recomputed: {{ taxComputeCount() }}x</span>
      </div>
      <div class="computed-row highlight">
        <strong>total</strong> = discountedPrice + tax =
        <span class="value">{{ total() | number:'1.2-2' }}</span>
        <span class="recompute">Recomputed: {{ totalComputeCount() }}x</span>
      </div>
    </div>

    <div class="experiment">
      <h3>Experiments</h3>
      <button (click)="price.set(price())">Set price to same value</button>
      <button (click)="couponCode.set('SAVE10')">Apply SAVE10</button>
      <button (click)="couponCode.set('SAVE20')">Apply SAVE20</button>
      <button (click)="couponCode.set('INVALID')">Apply INVALID code</button>
      <button (click)="batchUpdate()">Batch: price=50, qty=3, tax=10</button>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li>Change price → subtotal, discountedPrice, tax, total recompute. Discount does NOT.</li>
        <li>Change coupon → discount recomputes. If discount VALUE doesn't change (INVALID→INVALID), downstream does NOT recompute.</li>
        <li>"Set price to same value" → NO recomputation (Object.is equality).</li>
        <li>Batch update → all three signals change, but each computed recalculates only ONCE.</li>
        <li>The "Recomputed" counters prove memoization and selective propagation.</li>
      </ul>
    </div>
  `,
  styles: [`
    .graph-visual { background: #1a1a2e; color: #0f0; padding: 16px; border-radius: 8px;
                    font-family: monospace; font-size: 13px; white-space: pre; overflow-x: auto; }
    .controls, .derived, .experiment { margin: 16px 0; }
    .signal-row, .computed-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
    .dirty-badge { background: #e74c3c; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .recompute { background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .value { font-weight: bold; font-size: 18px; color: #2c3e50; }
    .highlight { background: #d5f5e3; padding: 12px; border-radius: 8px; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    input { padding: 6px; border: 1px solid #ccc; border-radius: 4px; width: 100px; }
    button { margin: 4px; }
  `]
})
export class Exercise10Component {
  // --- Source signals ---
  price = signal(29.99);
  quantity = signal(2);
  taxRate = signal(8.5);
  couponCode = signal('');

  // --- Dirty counters (track signal writes) ---
  priceDirtyCount = signal(0);
  quantityDirtyCount = signal(0);
  taxRateDirtyCount = signal(0);
  couponDirtyCount = signal(0);

  // --- Compute counters ---
  subtotalComputeCount = signal(0);
  discountComputeCount = signal(0);
  discountedComputeCount = signal(0);
  taxComputeCount = signal(0);
  totalComputeCount = signal(0);

  // --- Coupon lookup ---
  private coupons: Record<string, number> = {
    'SAVE10': 0.10,
    'SAVE20': 0.20,
    'HALF': 0.50,
  };

  // --- Computed signals with instrumentation ---
  subtotal = computed(() => {
    this.subtotalComputeCount.update(c => c + 1);
    return this.price() * this.quantity();
  });

  discount = computed(() => {
    this.discountComputeCount.update(c => c + 1);
    return this.coupons[this.couponCode()] ?? 0;
  });

  discountedPrice = computed(() => {
    this.discountedComputeCount.update(c => c + 1);
    return this.subtotal() * (1 - this.discount());
  });

  tax = computed(() => {
    this.taxComputeCount.update(c => c + 1);
    return this.discountedPrice() * (this.taxRate() / 100);
  });

  total = computed(() => {
    this.totalComputeCount.update(c => c + 1);
    return this.discountedPrice() + this.tax();
  });

  // --- Graph visualization ---
  graphVisualization = computed(() => {
    return `
  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐
  │ price    │   │ quantity │   │ taxRate  │   │ couponCode │
  │ ${String(this.price()).padStart(8)} │   │ ${String(this.quantity()).padStart(8)} │   │ ${String(this.taxRate()).padStart(8)} │   │ ${this.couponCode().padStart(10)} │
  └────┬─────┘   └────┬─────┘   └────┬─────┘   └─────┬──────┘
       │              │              │                │
       └──────┬───────┘              │                │
              ▼                      │                ▼
       ┌──────────────┐              │         ┌────────────┐
       │   subtotal   │              │         │  discount  │
       │ ${String(this.subtotal().toFixed(2)).padStart(12)} │              │         │ ${String((this.discount() * 100).toFixed(0) + '%').padStart(10)} │
       └──────┬───────┘              │         └──────┬─────┘
              │                      │                │
              └──────────┬───────────┘────────────────┘
                         ▼
                  ┌───────────────┐
                  │discountedPrice│
                  │ ${String(this.discountedPrice().toFixed(2)).padStart(13)} │
                  └───────┬───────┘
                          │
              ┌───────────┼───────────┐
              ▼                       ▼
       ┌────────────┐         ┌────────────┐
       │    tax     │         │   total    │
       │ ${String(this.tax().toFixed(2)).padStart(10)} │         │ ${String(this.total().toFixed(2)).padStart(10)} │
       └────────────┘         └────────────┘`;
  });

  constructor() {
    // Track writes to source signals via effects
    effect(() => { this.price(); this.priceDirtyCount.update(c => c + 1); }, { allowSignalWrites: true });
    effect(() => { this.quantity(); this.quantityDirtyCount.update(c => c + 1); }, { allowSignalWrites: true });
    effect(() => { this.taxRate(); this.taxRateDirtyCount.update(c => c + 1); }, { allowSignalWrites: true });
    effect(() => { this.couponCode(); this.couponDirtyCount.update(c => c + 1); }, { allowSignalWrites: true });
  }

  batchUpdate() {
    // All three set() calls happen synchronously
    // Angular batches: only ONE CD cycle runs
    this.price.set(50);
    this.quantity.set(3);
    this.taxRate.set(10);
    // After microtask: all computeds re-evaluate once
  }
}
```

**What to Observe**:
- The ASCII graph updates in real-time as you change source signals
- Changing `price` recomputes `subtotal → discountedPrice → tax → total` but NOT `discount`
- Changing `couponCode` to `INVALID` recomputes `discount` to 0; if discount was already 0, downstream does NOT recompute (POTENTIALLY_DIRTY → CLEAN optimization)
- "Set price to same value" triggers zero recomputations (equality check)
- Batch update sets 3 signals synchronously but each computed runs only once

---

## Exercise 11: resource() and rxResource() Data Loading

**Goal**: Use Angular 21's `resource()` and `rxResource()` APIs for declarative async data loading with automatic CD integration.

### exercise11.component.ts

```typescript
import {
  Component, ChangeDetectionStrategy, signal, computed,
  resource, inject
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { delay } from 'rxjs';

interface User {
  id: number;
  name: string;
  email: string;
  company: { name: string };
}

interface Post {
  id: number;
  title: string;
  body: string;
}

@Component({
  selector: 'app-exercise11',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Exercise 11: resource() & rxResource() Data Loading</h2>

    <div class="panel">
      <h3>1. resource() — Fetch API (Promise-based)</h3>
      <div class="controls">
        <label>User ID:</label>
        <input type="number" [value]="userId()" min="1" max="10"
               (input)="userId.set(+$any($event.target).value)" />
        <button (click)="userId.update(id => Math.min(10, id + 1))">Next →</button>
        <button (click)="userResource.reload()">Reload</button>
      </div>

      <div class="status-bar">
        Status: <strong>{{ userResource.status() }}</strong>
        | Loading: {{ userResource.isLoading() }}
      </div>

      @if (userResource.isLoading()) {
        <div class="loading">Loading user...</div>
      }
      @if (userResource.error(); as err) {
        <div class="error">Error: {{ err }}</div>
      }
      @if (userResource.value(); as user) {
        <div class="result">
          <p><strong>{{ user.name }}</strong></p>
          <p>{{ user.email }}</p>
          <p>{{ user.company.name }}</p>
        </div>
      }

      <p class="hint">
        Change User ID → resource auto-cancels previous fetch and reloads.
        All state (isLoading, value, error) are signals → automatic CD.
      </p>
    </div>

    <div class="panel">
      <h3>2. rxResource() — HttpClient (Observable-based)</h3>
      <div class="controls">
        <label>Posts for User:</label>
        <select (change)="postsUserId.set(+$any($event.target).value)">
          @for (id of [1,2,3,4,5]; track id) {
            <option [value]="id" [selected]="id === postsUserId()">User {{ id }}</option>
          }
        </select>
      </div>

      <div class="status-bar">
        Status: <strong>{{ postsResource.status() }}</strong>
        | Loading: {{ postsResource.isLoading() }}
        | Post count: {{ postsResource.value()?.length ?? 0 }}
      </div>

      @if (postsResource.isLoading()) {
        <div class="loading">Loading posts...</div>
      }
      @if (postsResource.value(); as posts) {
        <div class="post-list">
          @for (post of posts | slice:0:5; track post.id) {
            <div class="post">
              <strong>{{ post.title }}</strong>
              <p>{{ post.body | slice:0:80 }}...</p>
            </div>
          }
          @if (posts.length > 5) {
            <p class="more">...and {{ posts.length - 5 }} more posts</p>
          }
        </div>
      }

      <p class="hint">
        rxResource uses HttpClient (Observable). Same CD behavior as resource().
        Switching user auto-cancels previous request.
      </p>
    </div>

    <div class="panel">
      <h3>3. Dependent Resources (cascading loads)</h3>
      <div class="controls">
        <label>Select user to see their latest post details:</label>
        <select (change)="cascadeUserId.set(+$any($event.target).value)">
          @for (id of [1,2,3]; track id) {
            <option [value]="id">User {{ id }}</option>
          }
        </select>
      </div>

      <div class="cascade-status">
        <p>Step 1 — User:
          {{ cascadeUser.isLoading() ? '⏳' : '✅' }}
          {{ cascadeUser.value()?.name ?? '' }}
        </p>
        <p>Step 2 — Posts:
          {{ cascadePosts.isLoading() ? '⏳' : '✅' }}
          {{ cascadePosts.value()?.length ?? 0 }} posts
        </p>
        <p>Step 3 — First post details:
          @if (firstPostTitle()) {
            ✅ "{{ firstPostTitle() }}"
          } @else {
            ⏳
          }
        </p>
      </div>

      <p class="hint">
        Resources can depend on other resources' values.
        Change user → all three resources reload in cascade.
        Each step triggers CD independently via signals.
      </p>
    </div>

    <div class="panel">
      <h3>4. resource() with Error Recovery</h3>
      <div class="controls">
        <label>ID (use 999 for error):</label>
        <input type="number" [value]="errorTestId()" min="1"
               (input)="errorTestId.set(+$any($event.target).value)" />
      </div>

      <div class="status-bar">
        Status: {{ errorResource.status() }}
      </div>

      @switch (errorResource.status()) {
        @case (2) { <div class="loading">Loading...</div> }
        @case (4) { <div class="result">Data: {{ errorResource.value() | json }}</div> }
        @case (5) { <div class="error">Error! {{ errorResource.error() }}</div> }
      }

      <p class="hint">
        resource() exposes status() signal: 0=Idle, 1=Error, 2=Loading, 3=Reloading, 4=Resolved, 5=Error.
        Each status change triggers CD.
      </p>
    </div>

    <div class="observation">
      <h3>What to Observe</h3>
      <ul>
        <li>resource() and rxResource() integrate with CD purely through signals</li>
        <li>No async pipe, no markForCheck(), no subscribe() needed</li>
        <li>Changing the request signal auto-cancels previous request and reloads</li>
        <li>Loading/error/value states each trigger separate CD cycles (fine-grained)</li>
        <li>Works identically with Zone.js or zoneless — 100% signal-based</li>
        <li>Cascading resources create a dependency chain through signals</li>
      </ul>
    </div>
  `,
  styles: [`
    .panel { border: 1px solid #ddd; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .controls { display: flex; gap: 8px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
    .status-bar { background: #e8f4fd; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 8px 0; }
    .loading { color: #f39c12; font-style: italic; }
    .error { color: #e74c3c; font-weight: bold; }
    .result { background: #d5f5e3; padding: 12px; border-radius: 4px; }
    .post { border-bottom: 1px solid #eee; padding: 8px 0; }
    .post strong { color: #2c3e50; }
    .more { color: #888; font-style: italic; }
    .cascade-status { background: #f8f9fa; padding: 12px; border-radius: 4px; font-family: monospace; }
    .hint { font-size: 13px; color: #666; font-style: italic; margin-top: 8px; }
    .observation { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    input, select { padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin: 4px; }
  `]
})
export class Exercise11Component {
  private http = inject(HttpClient);

  // --- 1. resource() with fetch ---
  userId = signal(1);
  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/users/${request.id}`,
        { signal: abortSignal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<User>;
    }
  });

  // --- 2. rxResource() with HttpClient ---
  postsUserId = signal(1);
  postsResource = rxResource({
    request: () => ({ userId: this.postsUserId() }),
    loader: ({ request }) =>
      this.http.get<Post[]>(
        `https://jsonplaceholder.typicode.com/posts?userId=${request.userId}`
      ).pipe(delay(300))  // Artificial delay to see loading state
  });

  // --- 3. Cascading resources ---
  cascadeUserId = signal(1);
  cascadeUser = resource({
    request: () => ({ id: this.cascadeUserId() }),
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/users/${request.id}`,
        { signal: abortSignal }
      );
      return res.json() as Promise<User>;
    }
  });

  cascadePosts = resource({
    request: () => {
      const user = this.cascadeUser.value();
      return user ? { userId: user.id } : undefined;  // undefined = don't load yet
    },
    loader: async ({ request, abortSignal }) => {
      if (!request) return [];
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/posts?userId=${request.userId}`,
        { signal: abortSignal }
      );
      return res.json() as Promise<Post[]>;
    }
  });

  firstPostTitle = computed(() => {
    const posts = this.cascadePosts.value();
    return posts && posts.length > 0 ? posts[0].title : '';
  });

  // --- 4. Error handling ---
  errorTestId = signal(1);
  errorResource = resource({
    request: () => ({ id: this.errorTestId() }),
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/users/${request.id}`,
        { signal: abortSignal }
      );
      if (!res.ok) throw new Error(`User ${request.id} not found`);
      return res.json();
    }
  });
}
```

**What to Observe**:
- resource/rxResource state transitions (Loading → Resolved or Error) each trigger independent CD
- Changing `userId` auto-cancels the in-flight request (check Network tab)
- Cascading resources load sequentially: user → posts → first post title
- Error recovery: set ID to 999, see error state, then set back to 1 — auto-recovers
- No `subscribe()`, no `async` pipe, no `markForCheck()` — purely signal-driven

---

## Routing Setup

Add these routes to your app routing configuration:

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'cd',
    children: [
      {
        path: 'ex1',
        loadComponent: () => import('./cd/exercise1.component').then(m => m.Exercise1Component)
      },
      {
        path: 'ex2',
        loadComponent: () => import('./cd/exercise2.component').then(m => m.Exercise2Component)
      },
      {
        path: 'ex3',
        loadComponent: () => import('./cd/exercise3.component').then(m => m.Exercise3Component)
      },
      {
        path: 'ex4',
        loadComponent: () => import('./cd/exercise4.component').then(m => m.Exercise4Component)
      },
      {
        path: 'ex5',
        loadComponent: () => import('./cd/exercise5.component').then(m => m.Exercise5Component)
      },
      {
        path: 'ex6',
        loadComponent: () => import('./cd/exercise6.component').then(m => m.Exercise6Component)
      },
      {
        path: 'ex7',
        loadComponent: () => import('./cd/exercise7.component').then(m => m.Exercise7Component)
      },
      {
        path: 'ex8',
        loadComponent: () => import('./cd/exercise8.component').then(m => m.Exercise8Component)
      },
      {
        path: 'ex9',
        loadComponent: () => import('./cd/exercise9.component').then(m => m.Exercise9Component)
      },
      {
        path: 'ex10',
        loadComponent: () => import('./cd/exercise10.component').then(m => m.Exercise10Component)
      },
      {
        path: 'ex11',
        loadComponent: () => import('./cd/exercise11.component').then(m => m.Exercise11Component)
      }
    ]
  }
];
```

---

## Checklist

- [ ] **Exercise 1**: Compared Default vs OnPush check counts — understood skipping behavior
- [ ] **Exercise 2**: Tracked Zone.js interceptions — understood which APIs trigger CD
- [ ] **Exercise 3**: Used all 4 ChangeDetectorRef methods — understood sync vs async
- [ ] **Exercise 4**: Experienced OnPush pitfalls — mutation, array push, manual subscribe
- [ ] **Exercise 5**: Measured runOutsideAngular impact on animation and mouse events
- [ ] **Exercise 6**: Built full signal-driven component — no markForCheck needed
- [ ] **Exercise 7**: Identified zoneless-ready vs zoneless-broken patterns
- [ ] **Exercise 8**: Audited dashboard performance — fixed function calls, applied OnPush + signals
- [ ] **Exercise 9**: Bootstrapped zoneless app — identified what works and what breaks without Zone.js
- [ ] **Exercise 10**: Explored signal dependency graph — understood DIRTY vs POTENTIALLY_DIRTY and memoization
- [ ] **Exercise 11**: Used resource() and rxResource() — declarative async data with automatic CD via signals

---

*Next: Phase 2 — RxJS & Reactive Programming*
