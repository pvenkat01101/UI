import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { TypescriptApiService } from '../../services/typescript-api.service';
import {
  User,
  AdminUser,
  EditorUser,
  ViewerUser,
  Notification,
  Shape,
  Circle,
  Rectangle,
  Triangle,
  ApiResponse,
  ValidationResult,
} from '../../models/typescript-types';

// =====================================================
// SCENARIO 1: Custom Type Guard Functions (is keyword)
// =====================================================
function isAdminUser(user: User): user is AdminUser {
  return user.role === 'admin';
}

function isEditorUser(user: User): user is EditorUser {
  return user.role === 'editor';
}

function isViewerUser(user: User): user is ViewerUser {
  return user.role === 'viewer';
}

// =====================================================
// SCENARIO 2: Generic Type Guard
// =====================================================
function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

function isArrayOf<T>(arr: unknown, guard: (item: unknown) => item is T): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// =====================================================
// SCENARIO 3: Assertion Functions (asserts keyword)
// =====================================================
function assertIsUser(value: unknown): asserts value is User {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Expected an object');
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['id'] !== 'number') throw new Error('User must have numeric id');
  if (typeof obj['name'] !== 'string') throw new Error('User must have string name');
  if (typeof obj['email'] !== 'string') throw new Error('User must have string email');
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// =====================================================
// SCENARIO 4: Discriminated Union Type Guard
// =====================================================
function handleNotification(notification: Notification): string {
  switch (notification.type) {
    case 'email':
      return `Email to ${notification.to}: ${notification.subject}`;
    case 'sms':
      return `SMS to ${notification.phoneNumber}: ${notification.message}`;
    case 'push':
      return `Push to device ${notification.deviceToken}: ${notification.title}`;
    default:
      // exhaustiveness check — if we add a new type and forget to handle it,
      // TypeScript will error here because notification won't be 'never'
      return assertNever(notification);
  }
}

// =====================================================
// SCENARIO 5: 'in' Operator Narrowing
// =====================================================
interface Fish { swim(): string; name: string; }
interface Bird { fly(): string; name: string; }
interface Dog { bark(): string; name: string; }

type Animal = Fish | Bird | Dog;

function describeAnimal(animal: Animal): string {
  if ('swim' in animal) return `${animal.name} can swim: ${animal.swim()}`;
  if ('fly' in animal) return `${animal.name} can fly: ${animal.fly()}`;
  if ('bark' in animal) return `${animal.name} barks: ${animal.bark()}`;
  return 'Unknown animal';
}

@Component({
  selector: 'app-type-guards',
  imports: [],
  template: `
    <div class="component-container">
      <h2>4. Type Guards & Type Narrowing</h2>
      <p class="intro">
        Type narrowing is how TypeScript refines a broad type into a more specific one within a control flow block.
        Mastering type guards is essential for safe API response handling and polymorphic code.
      </p>

      <!-- SCENARIO 1: typeof and instanceof -->
      <section class="scenario">
        <h3>Scenario 1: typeof & instanceof Guards</h3>
        <div class="explanation">
          <pre><code>// typeof narrows primitives
function process(value: string | number | boolean) &#123;
  if (typeof value === 'string') &#123;
    value.toUpperCase(); // TS knows it's string
  &#125; else if (typeof value === 'number') &#123;
    value.toFixed(2);    // TS knows it's number
  &#125;
&#125;

// instanceof narrows class instances
function calcArea(shape: Shape) &#123;
  if (shape instanceof Circle) &#123;
    return Math.PI * shape.radius ** 2; // TS knows radius exists
  &#125;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Shape Area Calculator (instanceof)</h4>
          <button (click)="calcCircle()">Circle(r=5)</button>
          <button (click)="calcRectangle()">Rectangle(4x6)</button>
          <button (click)="calcTriangle()">Triangle(b=8, h=3)</button>
          <p>Shape: <strong>{{ shapeType() }}</strong> — Area: <strong>{{ shapeArea() }}</strong></p>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What types does <code>typeof</code> narrow?"<br>
          <strong>A:</strong> <code>typeof</code> works for: <code>"string"</code>, <code>"number"</code>, <code>"bigint"</code>,
          <code>"boolean"</code>, <code>"symbol"</code>, <code>"undefined"</code>, <code>"object"</code>, <code>"function"</code>.
          It does NOT narrow to specific interfaces or classes — for that you need <code>instanceof</code> or custom guards.
          <br><br>
          <strong>Twisted Q:</strong> "Why does <code>typeof null === 'object'</code> and how does TS handle it?"<br>
          <strong>A:</strong> It's a known JS bug since ES1. TypeScript is aware of this. When you check
          <code>typeof x === 'object'</code>, TS narrows to <code>object | null</code>. You still need a null check.
          <code>typeof x === 'object' && x !== null</code> narrows to <code>object</code>.
        </div>
      </section>

      <!-- SCENARIO 2: Custom Type Guards -->
      <section class="scenario">
        <h3>Scenario 2: Custom Type Guard Functions (<code>is</code> keyword)</h3>
        <div class="explanation">
          <pre><code>function isAdminUser(user: User): user is AdminUser &#123;
  return user.role === 'admin';
&#125;

// Usage:
const user: User = getUser();
if (isAdminUser(user)) &#123;
  // TS knows user is AdminUser here
  console.log(user.permissions); // ✓ accessible
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: User Role Classification</h4>
          <button (click)="loadAndClassifyUsers()">Load & Classify Users</button>
          @if (classifiedUsers().length > 0) {
            @for (cu of classifiedUsers(); track cu.name) {
              <div class="classified-user">
                <span class="role-badge" [class]="cu.roleClass">{{ cu.role }}</span>
                {{ cu.name }} — {{ cu.detail }}
              </div>
            }
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is the return type <code>user is AdminUser</code> called?"<br>
          <strong>A:</strong> It's called a <em>type predicate</em>. The syntax is <code>paramName is Type</code>.
          When the function returns <code>true</code>, TypeScript narrows the parameter to <code>Type</code> in the calling scope.
          The function must return a <code>boolean</code>.
          <br><br>
          <strong>Twisted Q:</strong> "What happens if your type guard returns true incorrectly?"<br>
          <strong>A:</strong> TypeScript <em>trusts</em> your type predicate — it doesn't verify the implementation.
          If <code>isAdmin</code> returns true for a non-admin, TS will narrow incorrectly and you'll get runtime errors.
          Type predicates are a form of <em>type assertion</em> — the developer is responsible for correctness.
          This is why Zod and io-ts are popular: they validate at runtime AND produce types.
        </div>
      </section>

      <!-- SCENARIO 3: Discriminated Union Narrowing -->
      <section class="scenario">
        <h3>Scenario 3: Discriminated Union Narrowing</h3>
        <div class="explanation">
          <pre><code>type Notification =
  | &#123; type: 'email'; to: string; subject: string; body: string &#125;
  | &#123; type: 'sms'; phoneNumber: string; message: string &#125;
  | &#123; type: 'push'; deviceToken: string; title: string &#125;;

function handle(n: Notification): string &#123;
  switch (n.type) &#123;
    case 'email': return n.subject;  // TS knows 'to', 'subject', 'body' exist
    case 'sms':   return n.message;  // TS knows 'phoneNumber', 'message' exist
    case 'push':  return n.title;    // TS knows 'deviceToken', 'title' exist
    default: assertNever(n);         // exhaustiveness check!
  &#125;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Notification Handler</h4>
          <button (click)="sendEmail()">Send Email</button>
          <button (click)="sendSms()">Send SMS</button>
          <button (click)="sendPush()">Send Push</button>
          @if (notificationResult()) {
            <p class="result">{{ notificationResult() }}</p>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is exhaustiveness checking and how does <code>assertNever</code> work?"<br>
          <strong>A:</strong> After all cases of a discriminated union are handled, TypeScript narrows the remaining type to <code>never</code>.
          <code>assertNever(x: never): never</code> takes <code>never</code> as parameter — if you add a new union member
          without handling it, the default branch receives a non-<code>never</code> type and TypeScript reports a compile error.
          This ensures you never forget to handle new cases.
          <br><br>
          <strong>Twisted Q:</strong> "What happens with exhaustiveness checking in a function that has no return type annotation?"<br>
          <strong>A:</strong> Without a return type annotation, TS infers the return type from all branches. The default
          <code>assertNever</code> branch returns <code>never</code>, which doesn't affect the inferred union. But if you
          forget a case AND don't have <code>assertNever</code>, TS won't error — it'll just infer <code>undefined</code>
          as a possible return. Always annotate return types for functions handling unions.
        </div>
      </section>

      <!-- SCENARIO 4: 'in' Operator -->
      <section class="scenario">
        <h3>Scenario 4: <code>in</code> Operator Narrowing</h3>
        <div class="explanation">
          <pre><code>interface Fish &#123; swim(): string; &#125;
interface Bird &#123; fly(): string; &#125;

function move(animal: Fish | Bird) &#123;
  if ('swim' in animal) &#123;
    animal.swim(); // narrowed to Fish
  &#125; else &#123;
    animal.fly();  // narrowed to Bird
  &#125;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Animal Identification</h4>
          <button (click)="descFish()">Fish (Nemo)</button>
          <button (click)="descBird()">Bird (Eagle)</button>
          <button (click)="descDog()">Dog (Rex)</button>
          @if (animalDesc()) {
            <p class="result">{{ animalDesc() }}</p>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "When should you use <code>in</code> vs <code>instanceof</code> vs custom type guards?"<br>
          <strong>A:</strong> Use <code>instanceof</code> for class instances (it checks the prototype chain).
          Use <code>in</code> for checking if a property exists on an object — works with interfaces since they're erased at runtime.
          Use custom type guards when the check logic is complex or involves multiple conditions.
          <code>in</code> is the go-to for interface-based unions since <code>instanceof</code> doesn't work with interfaces.
        </div>
      </section>

      <!-- SCENARIO 5: Assertion Functions -->
      <section class="scenario">
        <h3>Scenario 5: Assertion Functions (<code>asserts</code> keyword)</h3>
        <div class="explanation">
          <pre><code>function assertIsUser(value: unknown): asserts value is User &#123;
  if (typeof value !== 'object' || value === null)
    throw new Error('Expected an object');
  if (typeof (value as any).id !== 'number')
    throw new Error('User must have numeric id');
  if (typeof (value as any).name !== 'string')
    throw new Error('User must have string name');
&#125;

// Usage:
const data: unknown = await fetch('/api/user').then(r => r.json());
assertIsUser(data);
// After this line, TS knows data is User (or function threw)</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Validate Unknown API Data</h4>
          <button (click)="validateGoodData()">Validate Good Data</button>
          <button (click)="validateBadData()">Validate Bad Data</button>
          <p>Result: <span [class]="validationStatus()">{{ validationMessage() }}</span></p>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What's the difference between <code>value is Type</code> and <code>asserts value is Type</code>?"<br>
          <strong>A:</strong> A type predicate (<code>is</code>) returns a boolean and narrows in the truthy branch.
          An assertion function (<code>asserts</code>) returns void and narrows the type <em>after</em> the call.
          If the assertion fails, it must throw. The narrowing persists for the rest of the scope.
          Think of it as: type predicates are for <code>if</code> blocks, assertion functions are for imperative validation.
          <br><br>
          <strong>Twisted Q:</strong> "Can assertion functions be async?"<br>
          <strong>A:</strong> No. TypeScript requires assertion functions to have a <code>void</code> or <code>never</code> return type.
          <code>async</code> functions return <code>Promise&lt;void&gt;</code>, which doesn't satisfy this constraint.
          If you need async validation, use a type predicate that returns <code>Promise&lt;boolean&gt;</code>
          and narrow manually after awaiting.
        </div>
      </section>

      <!-- SCENARIO 6: API Response Validation -->
      <section class="scenario">
        <h3>Scenario 6: API Response Validation with Type Guards</h3>
        <div class="explanation">
          <p><strong>Real-world pattern:</strong> Validate API responses before using them in the application.</p>
          <pre><code>// Combine type guards with API calls
this.http.get('/api/users').pipe(
  map(response => &#123;
    assertIsUserArray(response);
    return response; // TS knows it's User[]
  &#125;),
  catchError(err => &#123;
    // Handle validation failures
    return of([]);
  &#125;)
);</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Validated API Call</h4>
          <button (click)="fetchAndValidate()">Fetch & Validate Users</button>
          @if (validatedUsers().length > 0) {
            <ul>
              @for (u of validatedUsers(); track u.id) {
                <li>{{ u.name }} ({{ u.email }}) — validated ✓</li>
              }
            </ul>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "HttpClient.get&lt;User[]&gt;() already types the response. Why do we need runtime validation?"<br>
          <strong>A:</strong> <code>get&lt;User[]&gt;()</code> is a <em>compile-time</em> assertion. The generic parameter tells TS
          to <em>trust</em> that the response matches <code>User[]</code>, but it does zero runtime checking.
          If the backend changes a field from <code>number</code> to <code>string</code>, your code will break at runtime
          with no compile-time warning. Runtime validation with type guards catches these mismatches.
          Libraries like Zod, io-ts, and Valibot automate this: define a schema, get both runtime validation AND TypeScript types.
        </div>
      </section>

      <!-- SCENARIO 7: Narrowing Flow Visualizer -->
      <section class="scenario">
        <h3>Scenario 7: Type Narrowing Flow Visualizer</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> See how TypeScript progressively narrows a type through each control flow branch.</p>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Step through narrowing of <code>unknown</code></h4>
          <button (click)="runNarrowingFlow()">Run Narrowing Sequence</button>
          <button (click)="narrowingSteps.set([])" class="btn-small">Reset</button>
          @if (narrowingSteps().length > 0) {
            <div class="narrowing-flow">
              @for (step of narrowingSteps(); track step.id) {
                <div class="narrow-step">
                  <div class="narrow-check">{{ step.check }}</div>
                  <div class="narrow-arrow">↓</div>
                  <div class="narrow-type">
                    <span class="label">Type is now:</span>
                    <code class="type-result">{{ step.narrowedTo }}</code>
                  </div>
                  <div class="narrow-access">Can access: <code>{{ step.availableProps }}</code></div>
                </div>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "Does TypeScript narrow types after throwing? What about after <code>return</code>?"<br>
          <strong>A:</strong> Yes! Both <code>throw</code> and <code>return</code> terminate the current branch. TypeScript
          uses <em>control flow analysis</em>: after an <code>if (x === null) return;</code>, TS knows x is non-null
          for the rest of the function. This is called <em>type narrowing via control flow</em> and works with
          <code>throw</code>, <code>return</code>, <code>break</code>, and <code>continue</code>.
        </div>
      </section>

      <!-- SCENARIO 8: Nested Object Validation -->
      <section class="scenario">
        <h3>Scenario 8: Nested Object Validation with Composable Guards</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Build complex type guards by composing smaller, reusable ones.</p>
          <pre><code>// Composable guards for nested validation
function hasProperty&lt;K extends string&gt;(
  obj: unknown, key: K
): obj is Record&lt;K, unknown&gt; {{'{'}}
  return typeof obj === 'object' && obj !== null && key in obj;
{{'}'}}

function isValidAddress(obj: unknown): obj is Address {{'{'}}
  return hasProperty(obj, 'street')
    && hasProperty(obj, 'city')
    && typeof obj.street === 'string'
    && typeof obj.city === 'string';
{{'}'}}</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Validate Complex Nested Data</h4>
          <div class="btn-group">
            <button (click)="validateNested('valid')">Valid Order</button>
            <button (click)="validateNested('missing_address')">Missing Address</button>
            <button (click)="validateNested('bad_items')">Bad Items Array</button>
            <button (click)="validateNested('null_input')">Null Input</button>
          </div>
          @if (nestedValidation()) {
            <div class="validation-result" [class]="nestedValidation()!.valid ? 'valid' : 'invalid'">
              <div class="validation-status">{{ nestedValidation()!.valid ? '✓ VALID' : '✗ INVALID' }}</div>
              @for (step of nestedValidation()!.steps; track step) {
                <div class="validation-step">{{ step }}</div>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How would you use type guards with Array.filter to narrow array types?"<br>
          <strong>A:</strong> <code>array.filter(isString)</code> returns <code>(string | number)[]</code> by default — filter doesn't narrow.
          But if <code>isString</code> has a type predicate return type: <code>(x: unknown): x is string</code>,
          then <code>array.filter(isString)</code> correctly returns <code>string[]</code>.
          This is a common interview question because many developers don't know filter supports type predicates.
          <br><br>
          <strong>Twisted Q:</strong> "Why does <code>[1, 'a', 2, 'b'].filter(x =&gt; typeof x === 'string')</code> NOT narrow to <code>string[]</code>?"<br>
          <strong>A:</strong> Arrow functions don't have implicit type predicates. You need to explicitly annotate:
          <code>.filter((x): x is string =&gt; typeof x === 'string')</code>. TypeScript can't infer type predicates
          from arrow function bodies — this is by design to prevent unsound narrowing.
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
    pre { background: #0d1117; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; line-height: 1.5; }
    code { color: #c9d1d9; }
    .demo-box { background: #16213e; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .demo-box h4 { color: #64b5f6; margin: 0 0 0.75rem; font-size: 0.95rem; }
    button { margin: 0.5rem 0.5rem 0 0; padding: 0.4rem 1rem; background: #7c4dff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    button:hover { background: #651fff; }
    ul { padding-left: 1.5rem; margin: 0.5rem 0; }
    li { margin: 0.2rem 0; font-size: 0.9rem; }
    .result { color: #81c784; font-family: monospace; margin-top: 0.5rem; }
    .classified-user { margin: 0.4rem 0; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
    .role-badge { padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .admin { background: #c62828; color: #fff; }
    .editor { background: #1565c0; color: #fff; }
    .viewer { background: #2e7d32; color: #fff; }
    .success { color: #66bb6a; }
    .error { color: #ef5350; }
    .btn-small { padding: 0.2rem 0.5rem; font-size: 0.75rem; background: #555; margin-left: 0.5rem; }
    .btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .narrowing-flow { margin-top: 0.75rem; }
    .narrow-step { padding: 0.5rem; margin: 0.25rem 0; background: #0d1117; border-radius: 4px; font-size: 0.85rem; }
    .narrow-check { color: #ce93d8; font-weight: bold; }
    .narrow-arrow { color: #555; font-size: 0.7rem; padding: 0.1rem 0; }
    .narrow-type { display: flex; gap: 0.5rem; align-items: center; }
    .narrow-type .label { color: #999; font-size: 0.8rem; }
    .narrow-access { color: #666; font-size: 0.8rem; margin-top: 0.2rem; }
    .validation-result { margin-top: 0.75rem; padding: 0.75rem; border-radius: 6px; }
    .validation-result.valid { background: rgba(102, 187, 106, 0.1); border: 1px solid #2e7d32; }
    .validation-result.invalid { background: rgba(239, 83, 80, 0.1); border: 1px solid #c62828; }
    .validation-status { font-weight: bold; font-size: 1rem; margin-bottom: 0.5rem; }
    .validation-step { font-size: 0.8rem; font-family: monospace; padding: 0.15rem 0; color: #999; }
    .interview-note { margin-top: 1rem; padding: 1rem; background: #1b1b2f; border-left: 3px solid #ff9800; border-radius: 0 6px 6px 0; font-size: 0.9rem; line-height: 1.6; }
    .interview-note strong { color: #ffb74d; }
  `],
})
export class TypeGuardsComponent {
  private readonly api = inject(TypescriptApiService);

  // Scenario 1
  shapeType = signal('—');
  shapeArea = signal('—');

  // Scenario 2
  classifiedUsers = signal<{ name: string; role: string; roleClass: string; detail: string }[]>([]);

  // Scenario 3
  notificationResult = signal('');

  // Scenario 4
  animalDesc = signal('');

  // Scenario 7: Narrowing flow
  narrowingSteps = signal<{ id: number; check: string; narrowedTo: string; availableProps: string }[]>([]);

  // Scenario 8: Nested validation
  nestedValidation = signal<{ valid: boolean; steps: string[] } | null>(null);

  // Scenario 5
  validationMessage = signal('Click a button to validate');
  validationStatus = signal('');

  // Scenario 6
  validatedUsers = signal<User[]>([]);

  // --- Scenario 1: instanceof ---
  private calculateArea(shape: Shape): void {
    if (shape instanceof Circle) {
      this.shapeType.set('Circle');
      this.shapeArea.set(shape.area().toFixed(2));
    } else if (shape instanceof Rectangle) {
      this.shapeType.set('Rectangle');
      this.shapeArea.set(shape.area().toFixed(2));
    } else if (shape instanceof Triangle) {
      this.shapeType.set('Triangle');
      this.shapeArea.set(shape.area().toFixed(2));
    }
  }

  calcCircle(): void { this.calculateArea(new Circle(5)); }
  calcRectangle(): void { this.calculateArea(new Rectangle(4, 6)); }
  calcTriangle(): void { this.calculateArea(new Triangle(8, 3)); }

  // --- Scenario 2: Custom Type Guards ---
  loadAndClassifyUsers(): void {
    this.api.getUsers().subscribe(users => {
      this.classifiedUsers.set(users.map(user => {
        if (isAdminUser(user)) {
          return { name: user.name, role: 'admin', roleClass: 'admin', detail: 'Has admin privileges' };
        } else if (isEditorUser(user)) {
          return { name: user.name, role: 'editor', roleClass: 'editor', detail: 'Can edit content' };
        } else if (isViewerUser(user)) {
          return { name: user.name, role: 'viewer', roleClass: 'viewer', detail: 'Read-only access' };
        }
        return { name: user.name, role: 'unknown', roleClass: '', detail: 'Unknown role' };
      }));
    });
  }

  // --- Scenario 3: Discriminated Unions ---
  sendEmail(): void {
    this.notificationResult.set(handleNotification({
      type: 'email', to: 'dev@angular.io', subject: 'TypeScript Deep Dive', body: 'Learning type guards!',
    }));
  }

  sendSms(): void {
    this.notificationResult.set(handleNotification({
      type: 'sms', phoneNumber: '+1234567890', message: 'Type guards are powerful!',
    }));
  }

  sendPush(): void {
    this.notificationResult.set(handleNotification({
      type: 'push', deviceToken: 'abc-123-xyz', title: 'New Lesson Available', payload: { lesson: 'type-guards' },
    }));
  }

  // --- Scenario 4: 'in' operator ---
  descFish(): void {
    const fish: Fish = { name: 'Nemo', swim: () => 'Swimming gracefully' };
    this.animalDesc.set(describeAnimal(fish));
  }

  descBird(): void {
    const bird: Bird = { name: 'Eagle', fly: () => 'Soaring high' };
    this.animalDesc.set(describeAnimal(bird));
  }

  descDog(): void {
    const dog: Dog = { name: 'Rex', bark: () => 'Woof woof!' };
    this.animalDesc.set(describeAnimal(dog));
  }

  // --- Scenario 5: Assertion Functions ---
  validateGoodData(): void {
    try {
      const data: unknown = { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', isActive: true };
      assertIsUser(data);
      // After assertion, TS knows data is User
      this.validationMessage.set(`Valid User: ${data.name} (${data.email})`);
      this.validationStatus.set('success');
    } catch (e) {
      this.validationMessage.set(`Validation failed: ${(e as Error).message}`);
      this.validationStatus.set('error');
    }
  }

  validateBadData(): void {
    try {
      const data: unknown = { id: 'not-a-number', name: 42 };
      assertIsUser(data);
      this.validationMessage.set(`Valid User: ${data.name}`);
      this.validationStatus.set('success');
    } catch (e) {
      this.validationMessage.set(`Validation failed: ${(e as Error).message}`);
      this.validationStatus.set('error');
    }
  }

  // --- Scenario 6: API Validation ---
  fetchAndValidate(): void {
    this.api.getUsers().subscribe(users => {
      const validated = users.filter((u): u is User => {
        try {
          assertIsUser(u);
          return true;
        } catch {
          return false;
        }
      });
      this.validatedUsers.set(validated);
    });
  }

  // --- Scenario 7: Narrowing Flow ---
  runNarrowingFlow(): void {
    let id = 0;
    this.narrowingSteps.set([
      {
        id: id++,
        check: 'const value: string | number | null | undefined = getData();',
        narrowedTo: 'string | number | null | undefined',
        availableProps: 'nothing (must narrow first)',
      },
      {
        id: id++,
        check: 'if (value == null) return;  // checks both null and undefined',
        narrowedTo: 'string | number',
        availableProps: '.toString(), .valueOf()',
      },
      {
        id: id++,
        check: 'if (typeof value === "string") { ... }',
        narrowedTo: 'string (inside if block)',
        availableProps: '.toUpperCase(), .trim(), .split(), .length, ...',
      },
      {
        id: id++,
        check: 'else { ... }  // TypeScript knows: not null, not undefined, not string',
        narrowedTo: 'number (in else block)',
        availableProps: '.toFixed(), .toPrecision(), .toString(radix), ...',
      },
      {
        id: id++,
        check: 'After if/else: TypeScript knows all branches returned or narrowed',
        narrowedTo: 'never (unreachable if both branches return)',
        availableProps: 'N/A — code is unreachable',
      },
    ]);
  }

  // --- Scenario 8: Nested Validation ---
  validateNested(scenario: 'valid' | 'missing_address' | 'bad_items' | 'null_input'): void {
    const testData: Record<string, unknown> = {
      valid: {
        id: 1,
        customer: { name: 'Alice', email: 'alice@example.com' },
        items: [{ product: 'Widget', qty: 2 }, { product: 'Gadget', qty: 1 }],
        address: { street: '123 Main St', city: 'Springfield', zip: '62701' },
      },
      missing_address: {
        id: 2,
        customer: { name: 'Bob', email: 'bob@example.com' },
        items: [{ product: 'Widget', qty: 1 }],
      },
      bad_items: {
        id: 3,
        customer: { name: 'Charlie', email: 'charlie@example.com' },
        items: 'not-an-array',
        address: { street: '456 Oak Ave', city: 'Shelbyville', zip: '62702' },
      },
      null_input: null,
    };

    const data = testData[scenario];
    const steps: string[] = [];
    let valid = true;

    // Step 1: null check
    steps.push(`typeof data === 'object' && data !== null → ${typeof data === 'object' && data !== null}`);
    if (typeof data !== 'object' || data === null) {
      steps.push('FAIL: data is null or not an object');
      this.nestedValidation.set({ valid: false, steps });
      return;
    }

    // Step 2: Check required top-level properties
    const obj = data as Record<string, unknown>;
    const hasId = 'id' in obj && typeof obj['id'] === 'number';
    steps.push(`'id' in data && typeof id === 'number' → ${hasId}`);
    if (!hasId) valid = false;

    // Step 3: Check customer
    const hasCust = 'customer' in obj && typeof obj['customer'] === 'object' && obj['customer'] !== null;
    steps.push(`'customer' in data && typeof customer === 'object' → ${hasCust}`);
    if (!hasCust) valid = false;

    // Step 4: Check items array
    const hasItems = 'items' in obj && Array.isArray(obj['items']);
    steps.push(`'items' in data && Array.isArray(items) → ${hasItems}`);
    if (!hasItems) valid = false;

    // Step 5: Check address
    const hasAddr = 'address' in obj && typeof obj['address'] === 'object' && obj['address'] !== null;
    steps.push(`'address' in data && typeof address === 'object' → ${hasAddr}`);
    if (!hasAddr) valid = false;

    if (valid) {
      steps.push('All checks passed — data is a valid Order');
    }

    this.nestedValidation.set({ valid, steps });
  }
}
