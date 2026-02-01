import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { TypescriptApiService } from '../../services/typescript-api.service';
import {
  User,
  ApiResponse,
  AuditableUser,
  Notification,
  ApiRequest,
  ExtractArrayType,
} from '../../models/typescript-types';

// =====================================================
// SCENARIO 1: Discriminated Unions for State Management
// =====================================================
// This is the most common interview pattern - modeling async state
type LoadingState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; data: T }
  | { kind: 'error'; error: string };

// =====================================================
// SCENARIO 2: Conditional Types - Extract return types
// =====================================================
// Interview Q: "What does infer do in conditional types?"
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type UnwrapArray<T> = T extends (infer U)[] ? U : T;
// Recursive unwrap - advanced interview topic
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T extends (infer V)[] ? V : T;

// =====================================================
// SCENARIO 3: Template Literal Types
// =====================================================
type EventName = 'click' | 'hover' | 'focus';
type EventHandler = `on${Capitalize<EventName>}`;
// Result: "onClick" | "onHover" | "onFocus"

// =====================================================
// SCENARIO 4: Mapped Types with Conditional
// =====================================================
// Interview Q: "Create a type that makes all string properties optional"
type OptionalStrings<T> = {
  [K in keyof T]: T[K] extends string ? T[K] | undefined : T[K];
};

// Interview Q: "Create a type that extracts only methods from a class"
type MethodsOnly<T> = {
  [K in keyof T as T[K] extends (...args: unknown[]) => unknown ? K : never]: T[K];
};

// =====================================================
// SCENARIO 5: Intersection Types - Mixin Pattern
// =====================================================
type Loggable = { log: () => string };
type Serializable = { serialize: () => string };
type LoggableSerializableUser = User & Loggable & Serializable;

@Component({
  selector: 'app-advanced-types',
  imports: [JsonPipe],
  template: `
    <div class="component-container">
      <h2>1. Advanced Types — Union, Intersection, Conditional</h2>
      <p class="intro">
        Advanced TypeScript types are fundamental to Angular development. They enable
        type-safe API responses, state management, and component communication patterns.
      </p>

      <!-- SCENARIO 1: Discriminated Unions -->
      <section class="scenario">
        <h3>Scenario 1: Discriminated Unions for Async State</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Model loading/success/error states with a discriminant property.</p>
          <p><strong>Why it matters:</strong> This is how you type-safely handle API responses in Angular services and components.</p>
          <pre><code>type LoadingState&lt;T&gt; =
  | {{'{'}} kind: 'idle' {{'}'}}
  | {{'{'}} kind: 'loading' {{'}'}}
  | {{'{'}} kind: 'loaded'; data: T {{'}'}}
  | {{'{'}} kind: 'error'; error: string {{'}'}}</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: User List State</h4>
          @switch (userState().kind) {
            @case ('idle') {
              <p class="state-badge idle">State: IDLE — Click "Load Users" to start</p>
            }
            @case ('loading') {
              <p class="state-badge loading">State: LOADING...</p>
            }
            @case ('loaded') {
              <p class="state-badge success">State: LOADED — {{ loadedUsers().length }} users</p>
              <ul>
                @for (user of loadedUsers(); track user.id) {
                  <li>{{ user.name }} ({{ user.role }}) — {{ user.isActive ? 'Active' : 'Inactive' }}</li>
                }
              </ul>
            }
            @case ('error') {
              <p class="state-badge error">State: ERROR — {{ errorMessage() }}</p>
            }
          }
          <button (click)="loadUsers()">Load Users</button>
          <button (click)="simulateError()">Simulate Error</button>
          <button (click)="resetState()">Reset</button>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is a discriminated union and how does TypeScript narrow types with it?"<br>
          <strong>A:</strong> A discriminated union uses a common literal-typed property (the "discriminant") shared across all
          union members. TypeScript uses control flow analysis on that property to narrow the type in each branch.
          The <code>kind</code> property here acts as the discriminant. Inside a <code>switch</code> or <code>if</code> block
          checking <code>kind</code>, TypeScript knows exactly which fields are available.
        </div>
      </section>

      <!-- SCENARIO 2: Intersection Types -->
      <section class="scenario">
        <h3>Scenario 2: Intersection Types — Composing Behaviors</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Combine multiple interfaces using <code>&amp;</code> to create composed types.</p>
          <pre><code>type AuditableUser = User & Timestamped & SoftDeletable;
// Has ALL properties from User, Timestamped, and SoftDeletable</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Auditable User</h4>
          <pre>{{ auditableUser | json }}</pre>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What happens when intersection types have conflicting properties?"<br>
          <strong>A:</strong> If two intersected types have the same property with different types, the resulting property type
          is the <em>intersection</em> of those types. For primitives like <code>string & number</code>, this results in <code>never</code>,
          making the property impossible to satisfy. This is different from union types where conflicting properties become unions.
          <br><br>
          <strong>Twisted Q:</strong> "What is the difference between <code>A | B</code> and <code>A & B</code> when accessing properties?"<br>
          <strong>A:</strong> With <code>A | B</code> you can only access properties common to BOTH A and B (without narrowing).
          With <code>A & B</code> you can access ALL properties from both A and B. This is counterintuitive —
          union restricts access, intersection expands it.
        </div>
      </section>

      <!-- SCENARIO 3: Conditional Types -->
      <section class="scenario">
        <h3>Scenario 3: Conditional Types with <code>infer</code></h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Use <code>T extends U ? X : Y</code> to create types that depend on other types.</p>
          <pre><code>type UnwrapPromise&lt;T&gt; = T extends Promise&lt;infer U&gt; ? U : T;
// UnwrapPromise&lt;Promise&lt;string&gt;&gt; = string
// UnwrapPromise&lt;number&gt; = number

type ExtractArrayType&lt;T&gt; = T extends Array&lt;infer U&gt; ? U : T;
// ExtractArrayType&lt;string[]&gt; = string</code></pre>
        </div>
        <div class="demo-box">
          <h4>Compile-Time Type Examples</h4>
          <div class="type-demo">
            <code>UnwrapPromise&lt;Promise&lt;User[]&gt;&gt;</code> → <span class="type-result">User[]</span><br>
            <code>UnwrapArray&lt;User[]&gt;</code> → <span class="type-result">User</span><br>
            <code>DeepUnwrap&lt;Promise&lt;string[]&gt;&gt;</code> → <span class="type-result">string</span><br>
            <code>ExtractArrayType&lt;number&gt;</code> → <span class="type-result">number (passthrough)</span>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What does <code>infer</code> do and where can it be used?"<br>
          <strong>A:</strong> <code>infer</code> declares a type variable within a conditional type's <code>extends</code> clause.
          It lets TypeScript "infer" (extract) a type from a pattern. It can ONLY be used inside the extends clause of
          a conditional type. Common uses: extracting return types, parameter types, promise wrapped types, array element types.
          <br><br>
          <strong>Twisted Q:</strong> "What happens with <code>UnwrapPromise&lt;string | Promise&lt;number&gt;&gt;</code>?"<br>
          <strong>A:</strong> Conditional types distribute over unions! The result is <code>string | number</code>.
          TypeScript evaluates it as <code>UnwrapPromise&lt;string&gt; | UnwrapPromise&lt;Promise&lt;number&gt;&gt;</code> = <code>string | number</code>.
          To prevent distribution, wrap both sides: <code>[T] extends [Promise&lt;infer U&gt;] ? U : T</code>.
        </div>
      </section>

      <!-- SCENARIO 4: Template Literal Types -->
      <section class="scenario">
        <h3>Scenario 4: Template Literal Types</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Create string types from combinations using template syntax.</p>
          <pre><code>type EventName = 'click' | 'hover' | 'focus';
type EventHandler = &#96;on$&#123;Capitalize&lt;EventName&gt;&#125;&#96;;
// Result: "onClick" | "onHover" | "onFocus"

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiPath = &#96;/api/typescript/$&#123;string&#125;&#96;;
type ApiRequest = &#96;$&#123;HttpMethod&#125; $&#123;ApiPath&#125;&#96;;
// "GET /api/typescript/users" ✓
// "FETCH /api/typescript/users" ✗</code></pre>
        </div>
        <div class="demo-box">
          <h4>Valid API Requests (compile-time enforcement)</h4>
          <div class="type-demo">
            @for (req of validApiRequests; track req) {
              <div class="valid-req">✓ {{ req }}</div>
            }
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How do template literal types distribute over unions?"<br>
          <strong>A:</strong> When a template literal contains union types, TypeScript creates the cartesian product.
          <code>&#96;$&#123;'a'|'b'&#125;-$&#123;'x'|'y'&#125;&#96;</code> produces <code>'a-x' | 'a-y' | 'b-x' | 'b-y'</code>.
          Intrinsic string manipulation types like <code>Uppercase</code>, <code>Lowercase</code>, <code>Capitalize</code>,
          <code>Uncapitalize</code> are built into the compiler (not defined in lib.d.ts).
        </div>
      </section>

      <!-- SCENARIO 5: Mapped Types -->
      <section class="scenario">
        <h3>Scenario 5: Mapped Types with Key Remapping</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Transform all properties of a type using <code>[K in keyof T]</code>.</p>
          <pre><code>// Make all string properties optional
type OptionalStrings&lt;T&gt; = &#123;
  [K in keyof T]: T[K] extends string ? T[K] | undefined : T[K];
&#125;;

// Extract only methods (key remapping with 'as')
type MethodsOnly&lt;T&gt; = &#123;
  [K in keyof T as T[K] extends (...args: unknown[]) =&gt; unknown ? K : never]: T[K];
&#125;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Applied to User interface:</h4>
          <div class="type-demo">
            <code>OptionalStrings&lt;User&gt;</code>:<br>
            — <code>name</code>: <span class="type-result">string | undefined</span><br>
            — <code>email</code>: <span class="type-result">string | undefined</span><br>
            — <code>id</code>: <span class="type-result">number (unchanged)</span><br>
            — <code>isActive</code>: <span class="type-result">boolean (unchanged)</span>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is key remapping with <code>as</code> in mapped types?"<br>
          <strong>A:</strong> Since TS 4.1, you can remap keys using <code>as</code> in mapped types.
          Mapping a key to <code>never</code> filters it out. You can also rename keys using template literal types:
          <code>[K in keyof T as &#96;get$&#123;Capitalize&lt;K&gt;&#125;&#96;]: () =&gt; T[K]</code> creates getter methods.
          <br><br>
          <strong>Twisted Q:</strong> "How does <code>-readonly</code> and <code>-?</code> work in mapped types?"<br>
          <strong>A:</strong> The <code>-</code> modifier removes a modifier. <code>-readonly</code> makes properties mutable,
          <code>-?</code> makes optional properties required. This is how <code>Required&lt;T&gt;</code> is implemented internally:
          <code>&#123; [K in keyof T]-?: T[K] &#125;</code>.
        </div>
      </section>
      <!-- SCENARIO 6: Interactive Type Transformer -->
      <section class="scenario">
        <h3>Scenario 6: Interactive Conditional Type Resolver</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> See how conditional types resolve at compile time by examining runtime equivalents.</p>
        </div>
        <div class="demo-box">
          <h4>Type Resolution Playground</h4>
          <p class="muted">Select an input type to see how conditional types resolve it:</p>
          <div class="btn-group">
            <button (click)="resolveType('Promise<string>')">Promise&lt;string&gt;</button>
            <button (click)="resolveType('Promise<User[]>')">Promise&lt;User[]&gt;</button>
            <button (click)="resolveType('number[]')">number[]</button>
            <button (click)="resolveType('string')">string</button>
            <button (click)="resolveType('string | Promise<number>')">string | Promise&lt;number&gt;</button>
          </div>
          @if (typeResolution()) {
            <div class="resolution-output">
              <div class="resolution-row">
                <span class="label">Input:</span>
                <code>{{ typeResolution()!.input }}</code>
              </div>
              <div class="resolution-row">
                <span class="label">UnwrapPromise&lt;T&gt;:</span>
                <code class="type-result">{{ typeResolution()!.unwrapPromise }}</code>
              </div>
              <div class="resolution-row">
                <span class="label">UnwrapArray&lt;T&gt;:</span>
                <code class="type-result">{{ typeResolution()!.unwrapArray }}</code>
              </div>
              <div class="resolution-row">
                <span class="label">DeepUnwrap&lt;T&gt;:</span>
                <code class="type-result">{{ typeResolution()!.deepUnwrap }}</code>
              </div>
              @if (typeResolution()!.note) {
                <p class="resolution-note">{{ typeResolution()!.note }}</p>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How do you prevent conditional types from distributing over unions?"<br>
          <strong>A:</strong> Wrap both sides in square brackets: <code>[T] extends [Promise&lt;infer U&gt;] ? U : T</code>.
          Without brackets, <code>string | Promise&lt;number&gt;</code> distributes into <code>UnwrapPromise&lt;string&gt; | UnwrapPromise&lt;Promise&lt;number&gt;&gt;</code> = <code>string | number</code>.
          With brackets, the union is checked as a whole: <code>[string | Promise&lt;number&gt;] extends [Promise&lt;infer U&gt;]</code> is false, so result is <code>string | Promise&lt;number&gt;</code> unchanged.
        </div>
      </section>

      <!-- SCENARIO 7: Mapped Type Object Transformer -->
      <section class="scenario">
        <h3>Scenario 7: Runtime Mapped Type Transformer</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Transform object shapes at runtime to mirror what mapped types do at compile time.</p>
        </div>
        <div class="demo-box">
          <h4>Transform User Object</h4>
          <div class="btn-group">
            <button (click)="transformUser('original')">Original User</button>
            <button (click)="transformUser('nullable')">NullableStrings&lt;User&gt;</button>
            <button (click)="transformUser('getters')">Getterify&lt;User&gt;</button>
            <button (click)="transformUser('readonly')">DeepFreeze (Readonly)</button>
          </div>
          @if (transformedResult()) {
            <div class="transform-output">
              <div class="transform-label">{{ transformedResult()!.label }}</div>
              <pre>{{ transformedResult()!.output }}</pre>
              <p class="transform-note">{{ transformedResult()!.explanation }}</p>
            </div>
          }
        </div>
      </section>

      <!-- SCENARIO 8: Discriminated Union Exhaustiveness Checker -->
      <section class="scenario">
        <h3>Scenario 8: Exhaustiveness Checking in Practice</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Ensure all union members are handled. If a new member is added, the compiler catches unhandled cases.</p>
          <pre><code>// The assertNever trick:
function handleShape(s: Shape): number {{'{'}}
  if (s instanceof Circle) return s.area();
  if (s instanceof Rectangle) return s.area();
  if (s instanceof Triangle) return s.area();
  // If we add Pentagon to Shape union and forget to handle it,
  // assertNever(s) would error: 'Pentagon' is not assignable to 'never'
  return assertNever(s);
{{'}'}}</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Handle All Payment Methods</h4>
          <div class="btn-group">
            <button (click)="processPayment('credit_card')">Credit Card</button>
            <button (click)="processPayment('paypal')">PayPal</button>
            <button (click)="processPayment('crypto')">Crypto</button>
            <button (click)="processPayment('bank_transfer')">Bank Transfer</button>
          </div>
          @if (paymentResult()) {
            <div class="payment-output">
              <span class="payment-icon">{{ paymentResult()!.icon }}</span>
              <span>{{ paymentResult()!.message }}</span>
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Twisted Q:</strong> "What is the difference between exhaustiveness checking with <code>never</code> vs using a <code>default</code> case?"<br>
          <strong>A:</strong> A <code>default</code> case silently handles new union members — the compiler won't warn you.
          Using <code>assertNever</code> (or assigning to a <code>never</code> variable) forces a compile error when new
          members are added. This is safer in a team environment where the union type and the switch statement
          may be in different files maintained by different developers.
        </div>
      </section>
    </div>
  `,
  styles: [`
    .component-container { max-width: 960px; margin: 0 auto; padding: 1.5rem; color: #e0e0e0; }
    h2 { color: #90caf9; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h3 { color: #ce93d8; margin-top: 2rem; }
    .intro { color: #999; line-height: 1.6; margin-bottom: 2rem; }

    .scenario {
      margin-bottom: 2.5rem;
      padding: 1.5rem;
      background: #1a1a2e;
      border-radius: 10px;
      border-left: 4px solid #7c4dff;
    }

    .explanation { margin-bottom: 1rem; }
    .explanation p { margin: 0.3rem 0; line-height: 1.5; }

    pre {
      background: #0d1117;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    code { color: #c9d1d9; }

    .demo-box {
      background: #16213e;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .demo-box h4 { color: #64b5f6; margin: 0 0 0.75rem; font-size: 0.95rem; }

    .state-badge {
      display: inline-block;
      padding: 0.3rem 0.8rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .idle { background: #333; color: #aaa; }
    .loading { background: #1565c0; color: #fff; }
    .success { background: #2e7d32; color: #fff; }
    .error { background: #c62828; color: #fff; }

    button {
      margin: 0.5rem 0.5rem 0 0;
      padding: 0.4rem 1rem;
      background: #7c4dff;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    button:hover { background: #651fff; }

    ul { padding-left: 1.5rem; margin: 0.5rem 0; }
    li { margin: 0.2rem 0; font-size: 0.9rem; }

    .type-demo { font-size: 0.9rem; line-height: 1.8; }
    .type-result { color: #66bb6a; font-weight: bold; }
    .valid-req { color: #81c784; font-family: monospace; font-size: 0.85rem; margin: 0.2rem 0; }

    .interview-note {
      margin-top: 1rem;
      padding: 1rem;
      background: #1b1b2f;
      border-left: 3px solid #ff9800;
      border-radius: 0 6px 6px 0;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .interview-note strong { color: #ffb74d; }
    .muted { color: #666; font-style: italic; font-size: 0.85rem; }
    .btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0; }
    .resolution-output { margin-top: 1rem; }
    .resolution-row { display: flex; align-items: center; gap: 0.5rem; margin: 0.3rem 0; font-size: 0.9rem; }
    .resolution-row .label { color: #999; min-width: 160px; }
    .resolution-note { color: #ffb74d; font-size: 0.85rem; margin-top: 0.5rem; font-style: italic; }
    .transform-output { margin-top: 1rem; }
    .transform-label { color: #ce93d8; font-weight: bold; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .transform-note { color: #999; font-size: 0.85rem; font-style: italic; margin-top: 0.5rem; }
    .payment-output { margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; }
    .payment-icon { font-size: 1.3rem; }
  `],
})
export class AdvancedTypesComponent implements OnInit {
  private readonly api = inject(TypescriptApiService);

  // Scenario 1: Discriminated union state
  userState = signal<LoadingState<User[]>>({ kind: 'idle' });

  // Computed helpers for template (Angular strict templates don't narrow inside @switch)
  loadedUsers = computed(() => {
    const state = this.userState();
    return state.kind === 'loaded' ? state.data : [];
  });

  errorMessage = computed(() => {
    const state = this.userState();
    return state.kind === 'error' ? state.error : '';
  });

  // Scenario 2: Intersection type demo
  auditableUser: AuditableUser = {
    id: 1,
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2025-01-20T14:30:00Z',
    isDeleted: false,
  };

  // Scenario 4: Template literal type demo
  validApiRequests: ApiRequest[] = [
    'GET /api/typescript/users',
    'POST /api/typescript/validate',
    'PATCH /api/typescript/users',
    'DELETE /api/typescript/users',
  ];

  // Scenario 6: Conditional type resolver
  typeResolution = signal<{
    input: string; unwrapPromise: string; unwrapArray: string; deepUnwrap: string; note?: string;
  } | null>(null);

  // Scenario 7: Mapped type transformer
  transformedResult = signal<{ label: string; output: string; explanation: string } | null>(null);

  // Scenario 8: Exhaustiveness
  paymentResult = signal<{ icon: string; message: string } | null>(null);

  ngOnInit(): void {
    this.typeCheckExamples();
  }

  loadUsers(): void {
    this.userState.set({ kind: 'loading' });
    this.api.getUsers().subscribe({
      next: (users) => this.userState.set({ kind: 'loaded', data: users }),
      error: (err) => this.userState.set({ kind: 'error', error: err.message }),
    });
  }

  simulateError(): void {
    this.userState.set({ kind: 'error', error: 'Network timeout: Failed to fetch users from /api/typescript/users' });
  }

  resetState(): void {
    this.userState.set({ kind: 'idle' });
  }

  // --- Scenario 6: Conditional Type Resolver ---
  resolveType(input: string): void {
    const resolutions: Record<string, { unwrapPromise: string; unwrapArray: string; deepUnwrap: string; note?: string }> = {
      'Promise<string>': {
        unwrapPromise: 'string',
        unwrapArray: 'Promise<string> (passthrough — not an array)',
        deepUnwrap: 'string',
      },
      'Promise<User[]>': {
        unwrapPromise: 'User[]',
        unwrapArray: 'Promise<User[]> (passthrough)',
        deepUnwrap: 'User (recursively unwraps Promise then Array)',
        note: 'DeepUnwrap first matches Promise<infer U> → U = User[], then matches User[] → User',
      },
      'number[]': {
        unwrapPromise: 'number[] (passthrough — not a Promise)',
        unwrapArray: 'number',
        deepUnwrap: 'number',
      },
      'string': {
        unwrapPromise: 'string (passthrough)',
        unwrapArray: 'string (passthrough)',
        deepUnwrap: 'string (passthrough)',
      },
      'string | Promise<number>': {
        unwrapPromise: 'string | number',
        unwrapArray: 'string | Promise<number> (passthrough)',
        deepUnwrap: 'string | number',
        note: 'Conditional types DISTRIBUTE over unions! Each member is evaluated separately: UnwrapPromise<string> | UnwrapPromise<Promise<number>> = string | number',
      },
    };
    this.typeResolution.set({ input, ...resolutions[input]! });
  }

  // --- Scenario 7: Mapped Type Transformer ---
  transformUser(mode: 'original' | 'nullable' | 'getters' | 'readonly'): void {
    const user = { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', isActive: true };
    switch (mode) {
      case 'original':
        this.transformedResult.set({
          label: 'Original User',
          output: JSON.stringify(user, null, 2),
          explanation: 'Plain User interface — all properties have their declared types.',
        });
        break;
      case 'nullable':
        // Runtime equivalent of: { [K in keyof T]: T[K] extends string ? T[K] | null : T[K] }
        const nullable = Object.fromEntries(
          Object.entries(user).map(([k, v]) => [k, typeof v === 'string' ? `${v} | null` : v])
        );
        this.transformedResult.set({
          label: 'NullableStrings<User> — string props become T | null',
          output: JSON.stringify(nullable, null, 2),
          explanation: 'Mapped type: [K in keyof T]: T[K] extends string ? T[K] | null : T[K]. Only string-typed properties are affected.',
        });
        break;
      case 'getters': {
        // Runtime equivalent of: { [K in keyof T as `get${Capitalize<K>}`]: () => T[K] }
        const getters = Object.fromEntries(
          Object.entries(user).map(([k, v]) => [`get${k.charAt(0).toUpperCase() + k.slice(1)}()`, `=> ${JSON.stringify(v)}`])
        );
        this.transformedResult.set({
          label: 'Getterify<User> — key remapping with template literals',
          output: JSON.stringify(getters, null, 2),
          explanation: 'Mapped type with key remapping: [K in keyof T as `get${Capitalize<K>}`]: () => T[K]. Creates getter-style methods.',
        });
        break;
      }
      case 'readonly':
        this.transformedResult.set({
          label: 'DeepFreeze (runtime Readonly<User>)',
          output: JSON.stringify(user, null, 2) + '\n\n// Object.freeze(user) applied\n// user.name = "Bob" → throws TypeError in strict mode\n// Readonly<T> is compile-time only, Object.freeze is runtime',
          explanation: 'Readonly<T> prevents mutations at compile time. Object.freeze() prevents at runtime. Neither is deep — nested objects remain mutable unless you use DeepReadonly + recursive freeze.',
        });
        break;
    }
  }

  // --- Scenario 8: Exhaustiveness Checking ---
  processPayment(method: 'credit_card' | 'paypal' | 'crypto' | 'bank_transfer'): void {
    switch (method) {
      case 'credit_card':
        this.paymentResult.set({ icon: '💳', message: 'Processing credit card payment via Stripe...' });
        break;
      case 'paypal':
        this.paymentResult.set({ icon: '🅿️', message: 'Redirecting to PayPal checkout...' });
        break;
      case 'crypto':
        this.paymentResult.set({ icon: '₿', message: 'Generating crypto wallet address...' });
        break;
      case 'bank_transfer':
        this.paymentResult.set({ icon: '🏦', message: 'Initiating SEPA bank transfer...' });
        break;
      default: {
        // Exhaustiveness check: if we add a new payment method and forget to handle it,
        // TypeScript will error here because `method` won't be assignable to `never`
        const _exhaustive: never = method;
        this.paymentResult.set({ icon: '❌', message: `Unknown method: ${_exhaustive}` });
      }
    }
  }

  private typeCheckExamples(): void {
    // These are compile-time demonstrations — they verify the types work correctly

    // Conditional type: UnwrapPromise
    type Test1 = UnwrapPromise<Promise<string>>; // string
    type Test2 = UnwrapPromise<number>; // number
    type Test3 = UnwrapArray<User[]>; // User

    // Discriminated union narrowing
    const state: LoadingState<User[]> = { kind: 'loaded', data: [] };
    if (state.kind === 'loaded') {
      // TypeScript knows state.data exists here
      const count: number = state.data.length;
    }

    // Template literal types
    const handler: EventHandler = 'onClick'; // ✓
    // const bad: EventHandler = 'onScroll'; // ✗ Would not compile

    // Extract array type
    type Elem = ExtractArrayType<string[]>; // string
    type Pass = ExtractArrayType<number>; // number (passthrough)
  }
}
