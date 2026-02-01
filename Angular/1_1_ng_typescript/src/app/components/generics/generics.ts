import { Component, inject, OnInit, signal } from '@angular/core';
import { JsonPipe, DecimalPipe } from '@angular/common';
import { TypescriptApiService } from '../../services/typescript-api.service';
import {
  User,
  Product,
  PaginatedResponse,
  SearchResult,
} from '../../models/typescript-types';

// =====================================================
// SCENARIO 1: Generic HTTP Service Wrapper
// =====================================================
// Interview Q: "How would you create a type-safe generic CRUD service?"
interface CrudOperations<T, ID = number> {
  getAll(): T[];
  getById(id: ID): T | undefined;
  create(entity: Omit<T, 'id'>): T;
  update(id: ID, entity: Partial<T>): T;
  delete(id: ID): boolean;
}

// =====================================================
// SCENARIO 2: Generic with Constraints
// =====================================================
// Interview Q: "What are generic constraints and why do we need them?"
interface HasId {
  id: number;
}

interface HasName {
  name: string;
}

// Constrained generic - T must have both id and name
function findByName<T extends HasId & HasName>(items: T[], name: string): T | undefined {
  return items.find(item => item.name.toLowerCase().includes(name.toLowerCase()));
}

// Multiple type parameters with constraints
function merge<T extends object, U extends object>(target: T, source: U): T & U {
  return { ...target, ...source };
}

// =====================================================
// SCENARIO 3: Generic State Store Pattern
// =====================================================
class SimpleStore<T extends HasId> {
  private items: Map<number, T> = new Map();

  add(item: T): void {
    this.items.set(item.id, item);
  }

  get(id: number): T | undefined {
    return this.items.get(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  update(id: number, updates: Partial<T>): T | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.items.set(id, updated);
    return updated;
  }

  remove(id: number): boolean {
    return this.items.delete(id);
  }

  query(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }
}

// =====================================================
// SCENARIO 4: Mapped Types with Generics
// =====================================================
// Interview Q: "Create a type that makes all properties of T observable"
type Observable<T> = {
  [K in keyof T]: {
    get(): T[K];
    set(value: T[K]): void;
    subscribe(callback: (value: T[K]) => void): void;
  };
};

// Create readonly version at type level
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Make specific keys required, rest optional
type RequireKeys<T, K extends keyof T> = Omit<Partial<T>, K> & Required<Pick<T, K>>;

// =====================================================
// SCENARIO 5: Generic Function Overloads
// =====================================================
// Interview Q: "When do you prefer overloads vs generics vs union types?"
function parseInput(input: string): string;
function parseInput(input: number): number;
function parseInput(input: boolean): string;
function parseInput(input: string | number | boolean): string | number {
  if (typeof input === 'string') return input.trim();
  if (typeof input === 'number') return input * 2;
  return input ? 'yes' : 'no';
}

@Component({
  selector: 'app-generics',
  imports: [JsonPipe, DecimalPipe],
  template: `
    <div class="component-container">
      <h2>2. Generics & Constraints</h2>
      <p class="intro">
        Generics are the backbone of reusable, type-safe code in TypeScript.
        Angular heavily uses generics in HttpClient, Forms, Observables, and Signals.
      </p>

      <!-- SCENARIO 1: Generic CRUD Interface -->
      <section class="scenario">
        <h3>Scenario 1: Generic CRUD Service Interface</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Define a generic interface for CRUD operations reusable across entities.</p>
          <pre><code>interface CrudOperations&lt;T, ID = number&gt; &#123;
  getAll(): T[];
  getById(id: ID): T | undefined;
  create(entity: Omit&lt;T, 'id'&gt;): T;
  update(id: ID, entity: Partial&lt;T&gt;): T;
  delete(id: ID): boolean;
&#125;
// Default type parameter: ID defaults to number</code></pre>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What are default type parameters and when are they useful?"<br>
          <strong>A:</strong> Default type parameters (like <code>ID = number</code>) work like default function parameters.
          They're inferred from usage or fall back to the default. Useful when 90% of use cases share the same type
          but you want flexibility. Angular's <code>EventEmitter&lt;T = void&gt;</code> is a real-world example.
          <br><br>
          <strong>Twisted Q:</strong> "Can you use a default type parameter that references another type parameter?"<br>
          <strong>A:</strong> Yes! <code>interface Foo&lt;T, U = T[]&gt;</code> is valid. <code>U</code> defaults to <code>T[]</code>.
          Parameters can reference earlier parameters (left-to-right), similar to function default values.
        </div>
      </section>

      <!-- SCENARIO 2: Constraints -->
      <section class="scenario">
        <h3>Scenario 2: Generic Constraints</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Restrict what types can be passed using <code>extends</code>.</p>
          <pre><code>interface HasId &#123; id: number; &#125;
interface HasName &#123; name: string; &#125;

function findByName&lt;T extends HasId & HasName&gt;(
  items: T[], name: string
): T | undefined &#123;
  return items.find(i => i.name.includes(name));
&#125;
// T must have BOTH id and name properties</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: findByName with Users and Products</h4>
          <div>
            <strong>Search Users:</strong>
            <input #userSearch value="alice" />
            <button (click)="searchUser(userSearch.value)">Find</button>
            @if (foundUser()) {
              <pre>{{ foundUser() | json }}</pre>
            } @else {
              <p class="muted">No user found</p>
            }
          </div>
          <div style="margin-top: 1rem;">
            <strong>Search Products:</strong>
            <input #productSearch value="angular" />
            <button (click)="searchProduct(productSearch.value)">Find</button>
            @if (foundProduct()) {
              <pre>{{ foundProduct() | json }}</pre>
            } @else {
              <p class="muted">No product found</p>
            }
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is the difference between <code>&lt;T extends U&gt;</code> and <code>&lt;T extends keyof U&gt;</code>?"<br>
          <strong>A:</strong> <code>T extends U</code> means T must be assignable to U (structural subtype).
          <code>T extends keyof U</code> means T must be one of U's property names (a string/number/symbol literal type).
          Example: <code>function getProperty&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K]</code> — K is constrained to
          valid property names of T, and the return type <code>T[K]</code> is the indexed access type.
        </div>
      </section>

      <!-- SCENARIO 3: Generic State Store -->
      <section class="scenario">
        <h3>Scenario 3: Generic State Store Pattern</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> A reusable in-memory store that works with any entity having an <code>id</code>.</p>
          <pre><code>class SimpleStore&lt;T extends HasId&gt; &#123;
  private items: Map&lt;number, T&gt; = new Map();
  add(item: T): void &#123; ... &#125;
  get(id: number): T | undefined &#123; ... &#125;
  query(predicate: (item: T) =&gt; boolean): T[] &#123; ... &#125;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: User Store & Product Store</h4>
          <div>
            <strong>User Store ({{ userStoreItems().length }} items):</strong>
            <button (click)="addUserToStore()">Add Random User</button>
            <button (click)="queryActiveUsers()">Query Active</button>
            @if (userStoreItems().length > 0) {
              <ul>
                @for (u of userStoreItems(); track u.id) {
                  <li>{{ u.name }} — {{ u.isActive ? 'Active' : 'Inactive' }}
                    <button (click)="removeFromStore(u.id)" class="btn-small">Remove</button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "Why use <code>Map&lt;number, T&gt;</code> instead of an object/Record?"<br>
          <strong>A:</strong> Maps preserve insertion order, have O(1) lookups, don't have prototype chain pollution,
          support any key type (not just strings), and have a <code>.size</code> property. Objects coerce keys to strings.
          For entity stores indexed by numeric IDs, Map is more appropriate.
          <br><br>
          <strong>Twisted Q:</strong> "If <code>T extends HasId</code>, can you assign <code>User</code> to <code>SimpleStore&lt;HasId&gt;</code>?"<br>
          <strong>A:</strong> Yes, because TypeScript uses structural typing. <code>User extends HasId</code> structurally
          (User has an <code>id: number</code>). However, the store will only know about <code>id</code> — you lose
          type information about other properties. This is covariance of generic types.
        </div>
      </section>

      <!-- SCENARIO 4: Mapped Types with Generics -->
      <section class="scenario">
        <h3>Scenario 4: Advanced Mapped Types</h3>
        <div class="explanation">
          <pre><code>// Deep readonly - recursively makes all properties readonly
type DeepReadonly&lt;T&gt; = &#123;
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly&lt;T[K]&gt; : T[K];
&#125;;

// Require specific keys, rest optional
type RequireKeys&lt;T, K extends keyof T&gt; =
  Omit&lt;Partial&lt;T&gt;, K&gt; & Required&lt;Pick&lt;T, K&gt;&gt;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Type-Level Demonstrations</h4>
          <div class="type-demo">
            <code>DeepReadonly&lt;User&gt;</code>:<br>
            — All properties are <span class="type-result">readonly</span>, including nested metadata<br><br>
            <code>RequireKeys&lt;User, 'id' | 'email'&gt;</code>:<br>
            — <code>id, email</code>: <span class="type-result">required</span><br>
            — <code>name, role, isActive, metadata</code>: <span class="type-result">optional</span>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How would you implement <code>DeepPartial&lt;T&gt;</code>?"<br>
          <strong>A:</strong> <code>type DeepPartial&lt;T&gt; = &#123; [K in keyof T]?: T[K] extends object ? DeepPartial&lt;T[K]&gt; : T[K] &#125;</code>.
          The <code>?</code> makes each property optional, and the conditional recursion handles nested objects.
          <br><br>
          <strong>Twisted Q:</strong> "Does <code>DeepReadonly</code> work correctly with arrays?"<br>
          <strong>A:</strong> Not perfectly — <code>T[K] extends object</code> is true for arrays, so it recurses into them.
          You'd need to add: <code>T[K] extends (infer U)[] ? readonly U[] : T[K] extends object ? DeepReadonly&lt;T[K]&gt; : T[K]</code>
          to properly handle arrays as <code>readonly</code> arrays.
        </div>
      </section>

      <!-- SCENARIO 5: Paginated API with Generics -->
      <section class="scenario">
        <h3>Scenario 5: Generic API Patterns</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> Generic paginated responses and search results from API.</p>
          <pre><code>interface PaginatedResponse&lt;T&gt; &#123;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
&#125;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Paginated Users & Product Search</h4>
          <div>
            <strong>Paginated Users (Page {{ currentPage() }}):</strong>
            <button (click)="loadPage(1)">Page 1</button>
            <button (click)="loadPage(2)">Page 2</button>
            <button (click)="loadPage(3)">Page 3</button>
            @if (paginatedUsers()) {
              <pre>{{ paginatedUsers() | json }}</pre>
            }
          </div>
          <div style="margin-top: 1rem;">
            <strong>Product Search:</strong>
            <input #searchInput value="typescript" />
            <button (click)="searchProducts(searchInput.value)">Search</button>
            @if (searchResults()) {
              <pre>{{ searchResults() | json }}</pre>
            }
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How does Angular's <code>HttpClient.get&lt;T&gt;()</code> use generics?"<br>
          <strong>A:</strong> <code>HttpClient.get&lt;T&gt;(url)</code> returns <code>Observable&lt;T&gt;</code>. The generic parameter
          tells TypeScript what the response body type is. However, this is a <em>trust-based</em> assertion — TypeScript does
          NOT validate the runtime response matches T. You should use type guards or validation libraries (like Zod) for
          runtime safety. This is a common interview trap: generics are compile-time only.
        </div>
      </section>
      <!-- SCENARIO 6: Generic CRUD Implementation Demo -->
      <section class="scenario">
        <h3>Scenario 6: Generic CRUD Service — Full Implementation</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> A concrete implementation of the generic CRUD interface that works with any entity.</p>
          <pre><code>class InMemoryCrud&lt;T extends HasId&gt; implements CrudOperations&lt;T&gt; {{'{'}}
  private items = new Map&lt;number, T&gt;();
  getAll(): T[] {{'{'}} return [...this.items.values()]; {{'}'}}
  getById(id: number): T | undefined {{'{'}} return this.items.get(id); {{'}'}}
  create(entity: Omit&lt;T, 'id'&gt;): T {{'{'}} ... {{'}'}} // auto-assigns id
  update(id: number, partial: Partial&lt;T&gt;): T {{'{'}} ... {{'}'}}
  delete(id: number): boolean {{'{'}} return this.items.delete(id); {{'}'}}
{{'}'}}</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Product CRUD</h4>
          <div>
            <input #pName placeholder="Product name" value="New Widget" />
            <input #pPrice placeholder="Price" value="19.99" type="number" />
            <input #pCat placeholder="Category" value="tools" />
            <button (click)="createProduct(pName.value, +pPrice.value, pCat.value)">Create</button>
            <button (click)="resetProductCrud()">Reset</button>
          </div>
          @if (crudProducts().length > 0) {
            <table class="crud-table">
              <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Category</th><th>Actions</th></tr></thead>
              <tbody>
                @for (p of crudProducts(); track p.id) {
                  <tr>
                    <td>{{ p.id }}</td>
                    <td>{{ p.name }}</td>
                    <td>{{ p.price | number:'1.2-2' }}</td>
                    <td>{{ p.category }}</td>
                    <td>
                      <button class="btn-small" (click)="toggleStock(p.id)">{{ p.inStock ? 'Out of Stock' : 'In Stock' }}</button>
                      <button class="btn-small btn-danger" (click)="deleteProduct(p.id)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How does <code>Omit&lt;T, 'id'&gt;</code> in the <code>create</code> method help API design?"<br>
          <strong>A:</strong> It prevents callers from specifying an <code>id</code> for new entities since the server generates it.
          This is a common pattern: <code>CreateDto = Omit&lt;Entity, 'id' | 'createdAt' | 'updatedAt'&gt;</code>.
          The generic constraint <code>T extends HasId</code> guarantees the id property exists for all other operations.
        </div>
      </section>

      <!-- SCENARIO 7: Generic keyof Accessor -->
      <section class="scenario">
        <h3>Scenario 7: Generic Property Accessor (<code>keyof</code> constraint)</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> The classic <code>getProperty&lt;T, K extends keyof T&gt;</code> pattern with indexed access types.</p>
          <pre><code>function getProperty&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K] {{'{'}}
  return obj[key];
{{'}'}}
// Return type is exactly T[K] — not T[string] or unknown
// getProperty(user, 'name') returns string
// getProperty(user, 'id') returns number
// getProperty(user, 'invalid') → COMPILE ERROR</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Type-Safe Property Extractor</h4>
          <p class="muted">Pick a user and property — the accessor is fully type-safe:</p>
          <div>
            <select #propSelect>
              <option value="id">id (number)</option>
              <option value="name">name (string)</option>
              <option value="email">email (string)</option>
              <option value="role">role ('admin'|'editor'|'viewer')</option>
              <option value="isActive">isActive (boolean)</option>
            </select>
            <button (click)="extractProperty(propSelect.value)">Extract from first user</button>
          </div>
          @if (extractedProp()) {
            <div class="extract-result">
              <span class="label">Property:</span> <code>{{ extractedProp()!.key }}</code><br>
              <span class="label">Value:</span> <strong>{{ extractedProp()!.value }}</strong><br>
              <span class="label">Type at compile time:</span> <code class="type-result">{{ extractedProp()!.type }}</code>
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Twisted Q:</strong> "What is the return type of <code>getProperty(user, Math.random() > 0.5 ? 'name' : 'id')</code>?"<br>
          <strong>A:</strong> <code>string | number</code>. When K is a union (<code>'name' | 'id'</code>), the indexed access type
          <code>T[K]</code> distributes: <code>T['name'] | T['id']</code> = <code>string | number</code>. This is how
          TypeScript maintains type safety even with dynamic property access.
        </div>
      </section>

      <!-- SCENARIO 8: Generic Event System -->
      <section class="scenario">
        <h3>Scenario 8: Type-Safe Generic Event Emitter</h3>
        <div class="explanation">
          <p><strong>Pattern:</strong> A generic event system where event names map to specific payload types.</p>
          <pre><code>interface EventMap {{'{'}}
  userLogin: {{'{'}} userId: string; timestamp: Date {{'}'}};
  dataLoaded: {{'{'}} count: number {{'}'}};
  error: {{'{'}} message: string; code: number {{'}'}};
{{'}'}}

class TypedEmitter&lt;T extends Record&lt;string, unknown&gt;&gt; {{'{'}}
  on&lt;K extends keyof T&gt;(event: K, cb: (payload: T[K]) =&gt; void): void;
  emit&lt;K extends keyof T&gt;(event: K, payload: T[K]): void;
{{'}'}}</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Application Event Bus</h4>
          <div class="btn-group">
            <button (click)="emitEvent('userLogin')">Emit: userLogin</button>
            <button (click)="emitEvent('dataLoaded')">Emit: dataLoaded</button>
            <button (click)="emitEvent('error')">Emit: error</button>
            <button (click)="clearEventLog()" class="btn-small">Clear Log</button>
          </div>
          @if (eventLog().length > 0) {
            <div class="event-log">
              @for (entry of eventLog(); track entry.id) {
                <div class="log-entry" [class]="entry.type">
                  <span class="log-time">{{ entry.time }}</span>
                  <span class="log-event">{{ entry.event }}</span>
                  <span class="log-payload">{{ entry.payload }}</span>
                </div>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How does this pattern compare to Angular's <code>EventEmitter&lt;T&gt;</code>?"<br>
          <strong>A:</strong> Angular's <code>EventEmitter&lt;T&gt;</code> is a single-event emitter (one type parameter per instance).
          The typed event bus maps <em>multiple</em> event names to payload types via a generic record.
          This is similar to Node.js <code>EventEmitter</code> but type-safe. In Angular, you'd implement this
          as an injectable service using <code>Subject</code> internally for each event channel.
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
    .muted { color: #666; font-style: italic; font-size: 0.85rem; }
    input { background: #0d1117; color: #e0e0e0; border: 1px solid #444; padding: 0.3rem 0.6rem; border-radius: 4px; margin: 0 0.5rem; }
    select { background: #0d1117; color: #e0e0e0; border: 1px solid #444; padding: 0.3rem 0.6rem; border-radius: 4px; }
    button { margin: 0.5rem 0.5rem 0 0; padding: 0.4rem 1rem; background: #7c4dff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    button:hover { background: #651fff; }
    .btn-small { padding: 0.2rem 0.5rem; font-size: 0.75rem; background: #c62828; margin-left: 0.5rem; }
    .btn-danger { background: #c62828; }
    .btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    ul { padding-left: 1.5rem; margin: 0.5rem 0; }
    li { margin: 0.2rem 0; font-size: 0.9rem; }
    .type-demo { font-size: 0.9rem; line-height: 1.8; }
    .type-result { color: #66bb6a; font-weight: bold; }
    .crud-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.85rem; }
    .crud-table th { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #444; color: #90caf9; }
    .crud-table td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #222; }
    .extract-result { margin-top: 0.75rem; font-size: 0.9rem; line-height: 1.8; }
    .extract-result .label { color: #999; }
    .event-log { margin-top: 0.75rem; max-height: 200px; overflow-y: auto; }
    .log-entry { display: flex; gap: 0.75rem; padding: 0.3rem 0; font-size: 0.8rem; font-family: monospace; border-bottom: 1px solid #1a1a2e; }
    .log-time { color: #666; min-width: 80px; }
    .log-event { font-weight: bold; min-width: 100px; }
    .log-entry.userLogin .log-event { color: #66bb6a; }
    .log-entry.dataLoaded .log-event { color: #64b5f6; }
    .log-entry.error .log-event { color: #ef5350; }
    .log-payload { color: #999; }
    .interview-note { margin-top: 1rem; padding: 1rem; background: #1b1b2f; border-left: 3px solid #ff9800; border-radius: 0 6px 6px 0; font-size: 0.9rem; line-height: 1.6; }
    .interview-note strong { color: #ffb74d; }
  `],
})
export class GenericsComponent implements OnInit {
  private readonly api = inject(TypescriptApiService);

  // Scenario 2: Search results
  foundUser = signal<User | undefined>(undefined);
  foundProduct = signal<Product | undefined>(undefined);

  // Scenario 3: Store demos
  private userStore = new SimpleStore<User>();
  userStoreItems = signal<User[]>([]);
  private nextId = 10;

  // Scenario 5: Paginated & search
  currentPage = signal(1);
  paginatedUsers = signal<PaginatedResponse<User> | null>(null);
  searchResults = signal<SearchResult<Product> | null>(null);

  // Scenario 6: CRUD demo
  private productCrud = new SimpleStore<Product>();
  crudProducts = signal<Product[]>([]);
  private crudNextId = 100;

  // Scenario 7: Property extractor
  extractedProp = signal<{ key: string; value: string; type: string } | null>(null);

  // Scenario 8: Event emitter
  eventLog = signal<{ id: number; time: string; event: string; payload: string; type: string }[]>([]);
  private eventCounter = 0;

  private users: User[] = [];
  private products: Product[] = [];

  ngOnInit(): void {
    this.api.getUsers().subscribe(users => {
      this.users = users;
      users.forEach(u => this.userStore.add(u));
      this.userStoreItems.set(this.userStore.getAll());
    });
    this.api.getProducts().subscribe(products => this.products = products);
  }

  searchUser(name: string): void {
    // Using the constrained generic function
    this.foundUser.set(findByName(this.users, name));
  }

  searchProduct(name: string): void {
    this.foundProduct.set(findByName(this.products, name));
  }

  addUserToStore(): void {
    const user: User = {
      id: this.nextId++,
      name: `User_${this.nextId}`,
      email: `user${this.nextId}@example.com`,
      role: ['admin', 'editor', 'viewer'][Math.floor(Math.random() * 3)] as User['role'],
      isActive: Math.random() > 0.3,
    };
    this.userStore.add(user);
    this.userStoreItems.set(this.userStore.getAll());
  }

  removeFromStore(id: number): void {
    this.userStore.remove(id);
    this.userStoreItems.set(this.userStore.getAll());
  }

  queryActiveUsers(): void {
    const active = this.userStore.query(u => u.isActive);
    this.userStoreItems.set(active);
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.api.getUsersPaginated(page, 2).subscribe(res => this.paginatedUsers.set(res));
  }

  searchProducts(query: string): void {
    this.api.searchProducts(query).subscribe(res => this.searchResults.set(res));
  }

  // --- Scenario 6: CRUD ---
  createProduct(name: string, price: number, category: string): void {
    const product: Product = {
      id: this.crudNextId++,
      name: name || 'Unnamed Product',
      price: price || 0,
      category: category || 'misc',
      inStock: true,
      tags: [category],
    };
    this.productCrud.add(product);
    this.crudProducts.set(this.productCrud.getAll());
  }

  toggleStock(id: number): void {
    const product = this.productCrud.get(id);
    if (product) {
      this.productCrud.update(id, { inStock: !product.inStock });
      this.crudProducts.set(this.productCrud.getAll());
    }
  }

  deleteProduct(id: number): void {
    this.productCrud.remove(id);
    this.crudProducts.set(this.productCrud.getAll());
  }

  resetProductCrud(): void {
    this.productCrud = new SimpleStore<Product>();
    this.crudNextId = 100;
    this.crudProducts.set([]);
  }

  // --- Scenario 7: Property Extractor ---
  extractProperty(key: string): void {
    if (this.users.length === 0) return;
    const user = this.users[0];
    const value = (user as Record<string, unknown>)[key];
    const typeMap: Record<string, string> = {
      id: 'number', name: 'string', email: 'string',
      role: "'admin' | 'editor' | 'viewer'", isActive: 'boolean',
    };
    this.extractedProp.set({
      key,
      value: JSON.stringify(value),
      type: typeMap[key] ?? 'unknown',
    });
  }

  // --- Scenario 8: Event Emitter ---
  emitEvent(event: 'userLogin' | 'dataLoaded' | 'error'): void {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    let payload: string;
    switch (event) {
      case 'userLogin':
        payload = `{ userId: "user_${Math.floor(Math.random() * 1000)}", timestamp: "${now.toISOString()}" }`;
        break;
      case 'dataLoaded':
        payload = `{ count: ${Math.floor(Math.random() * 100)} }`;
        break;
      case 'error':
        payload = `{ message: "Connection refused", code: ${[500, 503, 408][Math.floor(Math.random() * 3)]} }`;
        break;
    }
    this.eventLog.update(log => [
      ...log,
      { id: this.eventCounter++, time, event, payload, type: event },
    ]);
  }

  clearEventLog(): void {
    this.eventLog.set([]);
  }
}
