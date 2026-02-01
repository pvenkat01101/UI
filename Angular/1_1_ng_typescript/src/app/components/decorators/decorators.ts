import { Component, signal } from '@angular/core';
// =====================================================
// SCENARIO 1: Method Decorator — Logging
// =====================================================
// Interview Q: "How do decorators work at runtime?"
function Log(target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: unknown[]) {
    const result = originalMethod.apply(this, args);
    // In a real app, this would go to a logging service
    console.log(`[LOG] ${propertyKey}(${JSON.stringify(args)}) => ${JSON.stringify(result)}`);
    return result;
  };
  return descriptor;
}

// =====================================================
// SCENARIO 2: Method Decorator — Memoize
// =====================================================
function Memoize(target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const cache = new Map<string, unknown>();
  descriptor.value = function (...args: unknown[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log(`[MEMOIZE] Cache hit for ${propertyKey}(${key})`);
      return cache.get(key);
    }
    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    console.log(`[MEMOIZE] Cache miss for ${propertyKey}(${key}), stored result`);
    return result;
  };
  return descriptor;
}

// =====================================================
// SCENARIO 3: Property Decorator — Tracking Properties
// =====================================================
// Note: Reflect.getOwnMetadata/defineMetadata requires 'reflect-metadata' polyfill.
// In this demo we use a simple Map-based approach instead.
const requiredFields = new Map<object, string[]>();

function Required(target: object, propertyKey: string): void {
  const existing = requiredFields.get(target) ?? [];
  existing.push(propertyKey);
  requiredFields.set(target, existing);
}

function getRequiredProperties(target: object): string[] {
  return requiredFields.get(target) ?? [];
}

// =====================================================
// SCENARIO 4: Class Decorator — Sealed
// =====================================================
// Interview Q: "What does a class decorator receive as parameter?"
function Sealed(constructor: Function): void {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

// =====================================================
// SCENARIO 5: Decorator Factory — with parameters
// =====================================================
function Throttle(ms: number) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    let lastCall = 0;
    descriptor.value = function (...args: unknown[]) {
      const now = Date.now();
      if (now - lastCall >= ms) {
        lastCall = now;
        return originalMethod.apply(this, args);
      }
      console.log(`[THROTTLE] ${propertyKey} called within ${ms}ms, skipped`);
      return undefined;
    };
    return descriptor;
  };
}

// Demo class using decorators
@Sealed
class CalculatorService {
  callCount = 0;

  @Log
  add(a: number, b: number): number {
    this.callCount++;
    return a + b;
  }

  @Memoize
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }

  @Log
  multiply(a: number, b: number): number {
    return a * b;
  }
}

@Component({
  selector: 'app-decorators',
  imports: [],
  template: `
    <div class="component-container">
      <h2>3. Decorators & Metadata Reflection</h2>
      <p class="intro">
        Decorators are the foundation of Angular's DI system, component metadata, and lifecycle management.
        Understanding how they work internally is critical for senior roles.
      </p>

      <!-- SCENARIO 1: Method Decorator — Logging -->
      <section class="scenario">
        <h3>Scenario 1: Method Decorator — &#64;Log</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> A method decorator that wraps the original method to add logging.</p>
          <pre><code>function Log(
  target: object,           // prototype (instance) or constructor (static)
  propertyKey: string,      // method name
  descriptor: PropertyDescriptor  // property descriptor
): PropertyDescriptor &#123;
  const original = descriptor.value;
  descriptor.value = function (...args: unknown[]) &#123;
    const result = original.apply(this, args);
    console.log(&#96;[$&#123;propertyKey&#125;] called with&#96;, args, &#96;=> &#96;, result);
    return result;
  &#125;;
  return descriptor;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Calculator with &#64;Log</h4>
          <div>
            <button (click)="runAdd()">calc.add(3, 4)</button>
            <button (click)="runMultiply()">calc.multiply(5, 6)</button>
            <p>Result: <strong>{{ calcResult() }}</strong></p>
            <p class="muted">Check browser console for [LOG] output</p>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What are the three parameters a method decorator receives?"<br>
          <strong>A:</strong> (1) <code>target</code>: the prototype of the class for instance methods, or the constructor for static methods.
          (2) <code>propertyKey</code>: the name of the method as a string.
          (3) <code>descriptor</code>: the PropertyDescriptor containing <code>value</code> (the function), <code>writable</code>,
          <code>enumerable</code>, and <code>configurable</code>. The decorator can modify or replace the descriptor.
          <br><br>
          <strong>Twisted Q:</strong> "In what order are multiple decorators on the same method evaluated?"<br>
          <strong>A:</strong> Decorator <em>factories</em> are evaluated top-to-bottom, but the resulting decorators are
          applied <em>bottom-to-top</em> (like function composition). So <code>&#64;A &#64;B method()</code> evaluates factories
          as A then B, but applies as B(A(method)) — B wraps A's result.
        </div>
      </section>

      <!-- SCENARIO 2: Memoize Decorator -->
      <section class="scenario">
        <h3>Scenario 2: Method Decorator — &#64;Memoize</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Cache method results based on arguments to avoid redundant computation.</p>
          <pre><code>function Memoize(target, key, descriptor) &#123;
  const original = descriptor.value;
  const cache = new Map&lt;string, unknown&gt;();
  descriptor.value = function (...args) &#123;
    const cacheKey = JSON.stringify(args);
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const result = original.apply(this, args);
    cache.set(cacheKey, result);
    return result;
  &#125;;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Fibonacci with &#64;Memoize</h4>
          <div>
            <button (click)="runFib(10)">fib(10)</button>
            <button (click)="runFib(20)">fib(20)</button>
            <button (click)="runFib(30)">fib(30)</button>
            <button (click)="runFib(10)">fib(10) again (cached)</button>
            <p>Result: <strong>{{ fibResult() }}</strong></p>
            <p class="muted">Check console: first call = cache miss, second = cache hit</p>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What's the problem with using <code>JSON.stringify</code> as a cache key?"<br>
          <strong>A:</strong> (1) Objects with same properties in different order produce different keys.
          (2) It can't handle circular references. (3) Functions and Symbols are stripped.
          (4) It's slow for large objects. A better approach: use a <code>WeakMap</code> for object arguments
          or a custom hashing function.
        </div>
      </section>

      <!-- SCENARIO 3: Decorator Factory with Params -->
      <section class="scenario">
        <h3>Scenario 3: Decorator Factory — &#64;Throttle(ms)</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> A decorator factory returns a decorator. Allows configuration via parameters.</p>
          <pre><code>function Throttle(ms: number) &#123;
  return function(target, key, descriptor) &#123;
    const original = descriptor.value;
    let lastCall = 0;
    descriptor.value = function (...args) &#123;
      const now = Date.now();
      if (now - lastCall >= ms) &#123;
        lastCall = now;
        return original.apply(this, args);
      &#125;
    &#125;;
  &#125;;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Throttled Button (1000ms)</h4>
          <button (click)="throttledAction()">Click Rapidly (throttled 1s)</button>
          <p>Executed count: <strong>{{ throttleCount() }}</strong></p>
          <p>Skipped count: <strong>{{ throttleSkipped() }}</strong></p>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is the difference between a decorator and a decorator factory?"<br>
          <strong>A:</strong> A <em>decorator</em> is a function directly applied to a class/method/property:
          <code>&#64;Log</code>. A <em>decorator factory</em> is a function that <em>returns</em> a decorator:
          <code>&#64;Throttle(1000)</code>. The factory is called first, and its return value is used as the actual decorator.
          Angular's <code>&#64;Component(&#123;...&#125;)</code> is a decorator factory — the <code>(&#123;...&#125;)</code> invokes it.
        </div>
      </section>

      <!-- SCENARIO 4: Class Decorator -->
      <section class="scenario">
        <h3>Scenario 4: Class Decorator — &#64;Sealed</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Prevent adding/removing properties from a class and its prototype.</p>
          <pre><code>function Sealed(constructor: Function): void &#123;
  Object.seal(constructor);
  Object.seal(constructor.prototype);
&#125;

&#64;Sealed
class CalculatorService &#123;
  // Cannot add new properties at runtime
  // Cannot delete existing properties
&#125;</code></pre>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What does a class decorator receive as a parameter?"<br>
          <strong>A:</strong> The constructor function of the class. A class decorator can optionally return a new constructor
          function to <em>replace</em> the original class. If it returns void/undefined, the original is used.
          <br><br>
          <strong>Twisted Q:</strong> "Can a class decorator change the type of the class?"<br>
          <strong>A:</strong> At runtime, yes — you can return a new class. But TypeScript's type system does NOT reflect
          this change. The declared type remains the original class. This is a known limitation (TS issue #4881).
          Workaround: use interface merging or cast the decorated class.
        </div>
      </section>

      <!-- SCENARIO 5: How Angular Uses Decorators -->
      <section class="scenario">
        <h3>Scenario 5: How Angular Uses Decorators Internally</h3>
        <div class="explanation">
          <p><strong>Angular's decorator architecture:</strong></p>
          <pre><code>// What &#64;Component(&#123;...&#125;) actually does (simplified):
function Component(metadata: ComponentMetadata) &#123;
  return function(target: Function) &#123;
    // 1. Stores metadata on the class using a static property
    (target as any).ɵcmp = defineComponent(&#123;
      type: target,
      selectors: [[metadata.selector]],
      template: metadata.template,
      // ... compiles template, sets up change detection
    &#125;);

    // 2. For &#64;Injectable: stores factory function
    (target as any).ɵprov = defineInjectable(&#123;
      token: target,
      providedIn: metadata.providedIn,
      factory: () => new target(...inject(deps)),
    &#125;);
  &#125;;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Key Angular Decorators & Their Roles</h4>
          <div class="type-demo">
            <strong>&#64;Component</strong> → Stores template, styles, selector, change detection strategy as static <code>ɵcmp</code><br>
            <strong>&#64;Injectable</strong> → Stores provider factory as static <code>ɵprov</code><br>
            <strong>&#64;Input / &#64;Output</strong> → In Ivy, compiled to static <code>ɵinp</code> definitions<br>
            <strong>&#64;ViewChild</strong> → Stores query definition in component metadata<br>
            <strong>&#64;HostListener</strong> → Compiled into the component's host bindings function<br>
            <strong>&#64;Pipe</strong> → Stores pipe name and pure flag as static <code>ɵpipe</code>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "Why does Angular use decorators instead of base classes or configuration objects?"<br>
          <strong>A:</strong> (1) Decorators keep metadata co-located with the class. (2) They enable static analysis
          by the AOT compiler without executing code. (3) They allow tree-shaking — unused decorated classes can be removed.
          (4) They provide a clean DX while the compiler does the heavy lifting at build time.
          <br><br>
          <strong>Twisted Q:</strong> "Are decorators executed at import time or instantiation time?"<br>
          <strong>A:</strong> <em>Import time</em> (module evaluation). When the module containing the class is loaded,
          the decorator runs immediately. This is why Angular can collect all component metadata before any component
          is instantiated. It's also why you can't use runtime values in decorator metadata (they must be statically analyzable).
          <br><br>
          <strong>Twisted Q:</strong> "What is the TC39 Stage 3 decorator proposal and how does it differ from TypeScript's experimental decorators?"<br>
          <strong>A:</strong> The Stage 3 proposal (2023) uses a different API: decorators receive a <code>context</code> object
          instead of <code>(target, key, descriptor)</code>. It supports <code>accessor</code> keyword for auto-accessor properties.
          TypeScript 5.0+ supports both — <code>experimentalDecorators: true</code> for legacy, or omit it for Stage 3.
          Angular still uses the legacy format with <code>experimentalDecorators</code>.
        </div>
      </section>
      <!-- SCENARIO 6: Decorator Execution Order Visualizer -->
      <section class="scenario">
        <h3>Scenario 6: Decorator Execution Order — Visual Demo</h3>
        <div class="explanation">
          <p><strong>Key Concept:</strong> Decorator <em>factories</em> evaluate top-to-bottom, decorators <em>apply</em> bottom-to-top.</p>
          <pre><code>&#64;First()   // 1. Factory called first
&#64;Second()  // 2. Factory called second
&#64;Third()   // 3. Factory called third
method() {{'{'}} {{'}'}}  // Applied: Third(Second(First(method)))</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Watch the execution order</h4>
          <button (click)="runDecoratorOrder()">Run Stacked Decorators</button>
          <button (click)="clearLog()" class="btn-small">Clear</button>
          @if (decoratorLog().length > 0) {
            <div class="decorator-log">
              @for (entry of decoratorLog(); track entry.id) {
                <div class="log-entry" [class]="entry.phase">
                  <span class="log-phase">{{ entry.phase === 'factory' ? 'FACTORY' : 'APPLY' }}</span>
                  <span class="log-name">{{ entry.name }}</span>
                  <span class="log-detail">{{ entry.detail }}</span>
                </div>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "In what order do different decorator types execute on the same class?"<br>
          <strong>A:</strong> The order is: (1) Parameter decorators, (2) Method/accessor/property decorators (in declaration order),
          (3) Constructor parameter decorators, (4) Class decorator. Within method decorators, evaluation is top-to-bottom
          for factories, bottom-to-top for application. This is rarely tested but demonstrates deep understanding.
        </div>
      </section>

      <!-- SCENARIO 7: Console Capture — See @Log Output In-Page -->
      <section class="scenario">
        <h3>Scenario 7: Console Capture — &#64;Log Output In-Page</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Intercept console.log to display decorator output directly in the UI instead of browser devtools.</p>
        </div>
        <div class="demo-box">
          <h4>Interactive Calculator with Captured Logs</h4>
          <div class="calc-row">
            <input #calcA type="number" value="7" />
            <select #calcOp>
              <option value="add">+</option>
              <option value="multiply">x</option>
            </select>
            <input #calcB type="number" value="3" />
            <button (click)="runCalcWithCapture(calcOp.value, +calcA.value, +calcB.value)">Calculate</button>
          </div>
          <div class="calc-row" style="margin-top:0.5rem">
            <button (click)="runFibWithCapture(15)">fib(15)</button>
            <button (click)="runFibWithCapture(15)">fib(15) again</button>
            <button (click)="runFibWithCapture(25)">fib(25)</button>
          </div>
          @if (capturedLogs().length > 0) {
            <div class="console-capture">
              <div class="console-header">Captured Console Output:</div>
              @for (log of capturedLogs(); track log.id) {
                <div class="console-line" [class]="log.type">{{ log.message }}</div>
              }
            </div>
          }
          @if (capturedResult()) {
            <p>Result: <strong>{{ capturedResult() }}</strong></p>
          }
        </div>
      </section>

      <!-- SCENARIO 8: Practical Decorator — Debounce -->
      <section class="scenario">
        <h3>Scenario 8: Practical Decorator — &#64;Measure (Performance Timer)</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Measure method execution time — useful for performance profiling in Angular services.</p>
          <pre><code>function Measure(target, key, descriptor) {{'{'}}
  const original = descriptor.value;
  descriptor.value = function (...args) {{'{'}}
    const start = performance.now();
    const result = original.apply(this, args);
    const duration = performance.now() - start;
    console.log(&#96;[$&#123;key&#125;] took $&#123;duration.toFixed(3)&#125;ms&#96;);
    return result;
  {{'}'}};
{{'}'}}</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Measure Expensive Operations</h4>
          <div class="btn-group">
            <button (click)="measureSort(1000)">Sort 1,000 items</button>
            <button (click)="measureSort(10000)">Sort 10,000 items</button>
            <button (click)="measureSort(100000)">Sort 100,000 items</button>
            <button (click)="measureFib(35)">fib(35) recursive</button>
          </div>
          @if (measureResults().length > 0) {
            <div class="measure-results">
              @for (m of measureResults(); track m.id) {
                <div class="measure-row">
                  <span class="measure-op">{{ m.operation }}</span>
                  <span class="measure-time" [class]="m.speed">{{ m.duration }}</span>
                </div>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How would you implement an &#64;AutoUnsubscribe decorator for Angular components?"<br>
          <strong>A:</strong> Wrap the <code>ngOnDestroy</code> lifecycle hook to automatically unsubscribe from all subscriptions
          stored in a class property:
          <pre><code>function AutoUnsubscribe(constructor: Function) {{'{'}}
  const original = constructor.prototype.ngOnDestroy;
  constructor.prototype.ngOnDestroy = function () {{'{'}}
    for (const key in this) {{'{'}}
      const prop = this[key];
      if (prop?.unsubscribe) prop.unsubscribe();
    {{'}'}}
    original?.apply(this);
  {{'}'}};
{{'}'}}</code></pre>
          In modern Angular, prefer <code>DestroyRef</code> + <code>takeUntilDestroyed()</code> over decorator-based approaches.
        </div>
      </section>
    </div>
  `,
  styles: [`
    .component-container { max-width: 960px; margin: 0 auto; padding: 1.5rem; color: #e0e0e0; }
    h2 { color: #90caf9; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h3 { color: #ce93d8; margin-top: 2rem; }
    .intro { color: #999; line-height: 1.6; margin-bottom: 2rem; }
    .scenario { margin-bottom: 2.5rem; padding: 1.5rem; background: #1a1a2e; border-radius: 10px; border-left: 4px solid #7c4dff; }
    .explanation { margin-bottom: 1rem; }
    .explanation p { margin: 0.3rem 0; line-height: 1.5; }
    pre { background: #0d1117; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; line-height: 1.5; }
    code { color: #c9d1d9; }
    .demo-box { background: #16213e; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .demo-box h4 { color: #64b5f6; margin: 0 0 0.75rem; font-size: 0.95rem; }
    .muted { color: #666; font-style: italic; }
    button { margin: 0.5rem 0.5rem 0 0; padding: 0.4rem 1rem; background: #7c4dff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    button:hover { background: #651fff; }
    .btn-small { padding: 0.2rem 0.5rem; font-size: 0.75rem; background: #555; margin-left: 0.5rem; }
    .btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .type-demo { font-size: 0.9rem; line-height: 2; }
    input, select { background: #0d1117; color: #e0e0e0; border: 1px solid #444; padding: 0.3rem 0.6rem; border-radius: 4px; width: 70px; }
    .calc-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .decorator-log { margin-top: 0.75rem; }
    .log-entry { display: flex; gap: 0.75rem; padding: 0.25rem 0; font-size: 0.8rem; font-family: monospace; }
    .log-phase { min-width: 60px; font-weight: bold; }
    .factory .log-phase { color: #64b5f6; }
    .apply .log-phase { color: #66bb6a; }
    .log-name { color: #ce93d8; min-width: 80px; }
    .log-detail { color: #999; }
    .console-capture { margin-top: 0.75rem; background: #0d1117; border-radius: 6px; padding: 0.75rem; max-height: 200px; overflow-y: auto; }
    .console-header { color: #666; font-size: 0.75rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .console-line { font-family: monospace; font-size: 0.8rem; padding: 0.15rem 0; }
    .console-line.log { color: #81c784; }
    .console-line.memoize { color: #64b5f6; }
    .measure-results { margin-top: 0.75rem; }
    .measure-row { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.85rem; border-bottom: 1px solid #1a1a2e; }
    .measure-op { color: #e0e0e0; }
    .measure-time { font-family: monospace; font-weight: bold; }
    .measure-time.fast { color: #66bb6a; }
    .measure-time.medium { color: #ffb74d; }
    .measure-time.slow { color: #ef5350; }
    .interview-note { margin-top: 1rem; padding: 1rem; background: #1b1b2f; border-left: 3px solid #ff9800; border-radius: 0 6px 6px 0; font-size: 0.9rem; line-height: 1.6; }
    .interview-note strong { color: #ffb74d; }
  `],
})
export class DecoratorsComponent {
  private calc = new CalculatorService();

  calcResult = signal<number | string>('—');
  fibResult = signal<number | string>('—');
  throttleCount = signal(0);
  throttleSkipped = signal(0);
  private lastThrottleCall = 0;
  private readonly throttleMs = 1000;

  // Scenario 6: Decorator order
  decoratorLog = signal<{ id: number; phase: string; name: string; detail: string }[]>([]);
  private logId = 0;

  // Scenario 7: Console capture
  capturedLogs = signal<{ id: number; message: string; type: string }[]>([]);
  capturedResult = signal<string>('');
  private captureId = 0;

  // Scenario 8: Performance measure
  measureResults = signal<{ id: number; operation: string; duration: string; speed: string }[]>([]);
  private measureId = 0;

  runAdd(): void {
    this.calcResult.set(this.calc.add(3, 4));
  }

  runMultiply(): void {
    this.calcResult.set(this.calc.multiply(5, 6));
  }

  runFib(n: number): void {
    this.fibResult.set(this.calc.fibonacci(n));
  }

  throttledAction(): void {
    const now = Date.now();
    if (now - this.lastThrottleCall >= this.throttleMs) {
      this.lastThrottleCall = now;
      this.throttleCount.update(c => c + 1);
    } else {
      this.throttleSkipped.update(c => c + 1);
    }
  }

  // --- Scenario 6: Decorator Order ---
  runDecoratorOrder(): void {
    const log: { id: number; phase: string; name: string; detail: string }[] = [];
    const addLog = (phase: string, name: string, detail: string) => {
      log.push({ id: this.logId++, phase, name, detail });
    };

    // Simulate factory evaluation (top-to-bottom)
    addLog('factory', '@First()', 'Factory evaluated — returns decorator function');
    addLog('factory', '@Second()', 'Factory evaluated — returns decorator function');
    addLog('factory', '@Third()', 'Factory evaluated — returns decorator function');

    // Simulate decorator application (bottom-to-top)
    addLog('apply', '@Third()', 'Applied FIRST (closest to method) — wraps original');
    addLog('apply', '@Second()', 'Applied SECOND — wraps @Third\'s result');
    addLog('apply', '@First()', 'Applied LAST (outermost) — wraps @Second\'s result');

    this.decoratorLog.set(log);
  }

  clearLog(): void {
    this.decoratorLog.set([]);
  }

  // --- Scenario 7: Console Capture ---
  runCalcWithCapture(op: string, a: number, b: number): void {
    const logs: { id: number; message: string; type: string }[] = [];
    const originalLog = console.log;

    console.log = (...args: unknown[]) => {
      logs.push({ id: this.captureId++, message: args.join(' '), type: 'log' });
      originalLog.apply(console, args);
    };

    const result = op === 'add' ? this.calc.add(a, b) : this.calc.multiply(a, b);
    this.capturedResult.set(`${a} ${op === 'add' ? '+' : 'x'} ${b} = ${result}`);

    console.log = originalLog;
    this.capturedLogs.set(logs);
  }

  runFibWithCapture(n: number): void {
    const logs: { id: number; message: string; type: string }[] = [];
    const originalLog = console.log;

    console.log = (...args: unknown[]) => {
      const msg = args.join(' ');
      const type = msg.includes('Cache hit') ? 'memoize' : msg.includes('Cache miss') ? 'memoize' : 'log';
      logs.push({ id: this.captureId++, message: msg, type });
      originalLog.apply(console, args);
    };

    const start = performance.now();
    const result = this.calc.fibonacci(n);
    const dur = performance.now() - start;

    console.log = originalLog;
    logs.push({ id: this.captureId++, message: `Result: fib(${n}) = ${result} [${dur.toFixed(3)}ms]`, type: 'log' });
    this.capturedResult.set(`fib(${n}) = ${result}`);
    this.capturedLogs.set(logs);
  }

  // --- Scenario 8: Performance Measurement ---
  measureSort(size: number): void {
    const arr = Array.from({ length: size }, () => Math.random());
    const start = performance.now();
    arr.sort((a, b) => a - b);
    const dur = performance.now() - start;
    const speed = dur < 5 ? 'fast' : dur < 50 ? 'medium' : 'slow';
    this.measureResults.update(r => [
      ...r,
      { id: this.measureId++, operation: `Array.sort(${size.toLocaleString()} items)`, duration: `${dur.toFixed(3)}ms`, speed },
    ]);
  }

  measureFib(n: number): void {
    // Intentionally NOT using the memoized version to show raw cost
    const fib = (x: number): number => x <= 1 ? x : fib(x - 1) + fib(x - 2);
    const start = performance.now();
    const result = fib(n);
    const dur = performance.now() - start;
    const speed = dur < 50 ? 'fast' : dur < 500 ? 'medium' : 'slow';
    this.measureResults.update(r => [
      ...r,
      { id: this.measureId++, operation: `fib(${n}) recursive = ${result}`, duration: `${dur.toFixed(3)}ms`, speed },
    ]);
  }
}
