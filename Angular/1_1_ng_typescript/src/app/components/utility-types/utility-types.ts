import { Component, inject, signal, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { TypescriptApiService } from '../../services/typescript-api.service';
import { User, Product, AppConfig } from '../../models/typescript-types';

// =====================================================
// SCENARIO 1: Partial<T> — for PATCH / partial updates
// =====================================================
// How Partial is implemented:
// type Partial<T> = { [K in keyof T]?: T[K] };

// =====================================================
// SCENARIO 2: Pick<T,K> & Omit<T,K> — for DTOs
// =====================================================
// How Pick is implemented:
// type Pick<T, K extends keyof T> = { [P in K]: T[P] };
// How Omit is implemented:
// type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type UserPreview = Pick<User, 'id' | 'name' | 'role'>;
type UserWithoutMetadata = Omit<User, 'metadata'>;
type CreateUserDto = Omit<User, 'id'>; // id is auto-generated

// =====================================================
// SCENARIO 3: Record<K,V> — for lookup maps
// =====================================================
type RolePermissions = Record<User['role'], string[]>;
type FeatureFlags = Record<string, boolean>;

const rolePermissions: RolePermissions = {
  admin: ['read', 'write', 'delete', 'manage-users'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

// =====================================================
// SCENARIO 4: Required<T>, Readonly<T>, NonNullable<T>
// =====================================================
type RequiredUser = Required<User>; // all props required, including metadata
type ReadonlyUser = Readonly<User>; // all props readonly
type StrictEmail = NonNullable<string | null | undefined>; // string

// Deep utility types
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K];
};

// =====================================================
// SCENARIO 5: Custom Utility Types
// =====================================================
// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Mutable version of Readonly
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Extract string keys only
type StringKeys<T> = Extract<keyof T, string>;

// Create a type where at least one property from K is required
type AtLeastOne<T, K extends keyof T = keyof T> = Omit<T, K> &
  { [P in K]: Required<Pick<T, P>> & Partial<Omit<Pick<T, K>, P>> }[K];

// =====================================================
// SCENARIO 6: Combining Utility Types for Real Patterns
// =====================================================
// API request type: id required, everything else optional (for PATCH)
type PatchRequest<T extends { id: number }> = Pick<T, 'id'> & Partial<Omit<T, 'id'>>;

// Form state type: all fields optional with dirty/touched tracking
type FormField<T> = {
  value: T;
  dirty: boolean;
  touched: boolean;
  errors: string[];
};
type FormState<T> = { [K in keyof T]: FormField<T[K]> };

@Component({
  selector: 'app-utility-types',
  imports: [JsonPipe],
  template: `
    <div class="component-container">
      <h2>5. Utility Types</h2>
      <p class="intro">
        TypeScript's built-in utility types are the building blocks for constructing precise types.
        Knowing their implementation and how to compose them is a frequent interview topic.
      </p>

      <!-- SCENARIO 1: Partial<T> -->
      <section class="scenario">
        <h3>Scenario 1: Partial&lt;T&gt; — PATCH Requests</h3>
        <div class="explanation">
          <pre><code>// Implementation:
type Partial&lt;T&gt; = &#123; [K in keyof T]?: T[K] &#125;;

// Usage: Send only changed fields to the API
function updateUser(id: number, changes: Partial&lt;User&gt;): void &#123;
  this.http.patch(&#96;/api/users/$&#123;id&#125;&#96;, changes);
&#125;

// Valid: only sending name
updateUser(1, &#123; name: 'Alice Updated' &#125;); // ✓
// Valid: sending nothing
updateUser(1, &#123;&#125;); // ✓ (all optional)
// Invalid: wrong type
updateUser(1, &#123; id: 'string' &#125;); // ✗ compile error</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Partial Update User</h4>
          <div>
            <label>User ID: </label>
            <select #userId>
              <option value="1">1 - Alice</option>
              <option value="2">2 - Bob</option>
              <option value="3">3 - Charlie</option>
            </select>
            <label> New Name: </label>
            <input #newName value="Updated Name" />
            <button (click)="partialUpdate(+userId.value, newName.value)">PATCH Update</button>
          </div>
          @if (updatedUser()) {
            <pre>{{ updatedUser() | json }}</pre>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How is <code>Partial</code> implemented internally?"<br>
          <strong>A:</strong> <code>&#123; [K in keyof T]?: T[K] &#125;</code> — it's a mapped type that iterates over all keys of T
          and adds the <code>?</code> modifier to make each optional. The <code>?</code> modifier also adds <code>undefined</code>
          to the value type.
          <br><br>
          <strong>Twisted Q:</strong> "Is <code>Partial&lt;T&gt;</code> the same as <code>&#123; [K in keyof T]: T[K] | undefined &#125;</code>?"<br>
          <strong>A:</strong> No! <code>Partial</code> makes properties <em>optional</em> (they can be missing).
          <code>T[K] | undefined</code> means the property must exist but can be <code>undefined</code>.
          With <code>exactOptionalPropertyTypes</code> in tsconfig, TypeScript distinguishes between "missing" and "present but undefined".
        </div>
      </section>

      <!-- SCENARIO 2: Pick & Omit -->
      <section class="scenario">
        <h3>Scenario 2: Pick&lt;T,K&gt; & Omit&lt;T,K&gt; — DTOs</h3>
        <div class="explanation">
          <pre><code>// Pick only what you need for display
type UserPreview = Pick&lt;User, 'id' | 'name' | 'role'&gt;;
// &#123; id: number; name: string; role: 'admin'|'editor'|'viewer' &#125;

// Remove sensitive fields for API responses
type UserWithoutMetadata = Omit&lt;User, 'metadata'&gt;;

// Auto-generated id shouldn't be in create request
type CreateUserDto = Omit&lt;User, 'id'&gt;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: User Preview Cards (Pick)</h4>
          <button (click)="loadUserPreviews()">Load User Previews</button>
          @if (userPreviews().length > 0) {
            <div class="preview-grid">
              @for (p of userPreviews(); track p.id) {
                <div class="preview-card">
                  <span class="role-badge" [class]="p.role">{{ p.role }}</span>
                  <strong>{{ p.name }}</strong> (ID: {{ p.id }})
                </div>
              }
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How is <code>Omit</code> implemented using <code>Pick</code> and <code>Exclude</code>?"<br>
          <strong>A:</strong> <code>type Omit&lt;T, K&gt; = Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code>.
          <code>Exclude</code> removes K from the union of keys, then <code>Pick</code> selects the remaining keys.
          <br><br>
          <strong>Twisted Q:</strong> "What happens with <code>Omit&lt;User, 'nonExistentKey'&gt;</code>?"<br>
          <strong>A:</strong> It compiles without error! <code>Omit</code>'s second parameter is <code>string | number | symbol</code>,
          NOT <code>keyof T</code>. It's intentionally loose. If you want strict checking, create:
          <code>type StrictOmit&lt;T, K extends keyof T&gt; = Omit&lt;T, K&gt;</code>.
        </div>
      </section>

      <!-- SCENARIO 3: Record -->
      <section class="scenario">
        <h3>Scenario 3: Record&lt;K,V&gt; — Lookup Maps</h3>
        <div class="explanation">
          <pre><code>// Implementation:
type Record&lt;K extends keyof any, V&gt; = &#123; [P in K]: V &#125;;

// Type-safe role-to-permissions mapping
type RolePermissions = Record&lt;User['role'], string[]&gt;;
// &#123; admin: string[]; editor: string[]; viewer: string[] &#125;

// Feature flags
type FeatureFlags = Record&lt;string, boolean&gt;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Role Permissions Lookup</h4>
          <button (click)="showPermissions('admin')">Admin Permissions</button>
          <button (click)="showPermissions('editor')">Editor Permissions</button>
          <button (click)="showPermissions('viewer')">Viewer Permissions</button>
          @if (currentPermissions()) {
            <pre>{{ currentPermissions() | json }}</pre>
          }
        </div>
        <div class="demo-box">
          <h4>Live Demo: Feature Flags from Config API</h4>
          <button (click)="loadFeatureFlags()">Load Feature Flags</button>
          @if (featureFlags()) {
            <pre>{{ featureFlags() | json }}</pre>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is the difference between <code>Record&lt;string, T&gt;</code> and <code>&#123;[key: string]: T&#125;</code>?"<br>
          <strong>A:</strong> They're structurally identical — both create an index signature.
          <code>Record</code> is more readable and composable. The real power is with union keys:
          <code>Record&lt;'a'|'b'|'c', number&gt;</code> requires ALL three keys to be present,
          while an index signature allows any keys.
          <br><br>
          <strong>Twisted Q:</strong> "What does <code>keyof any</code> resolve to?"<br>
          <strong>A:</strong> <code>string | number | symbol</code> — the valid types for object keys.
          This is why Record's K constraint is <code>extends keyof any</code> instead of <code>extends string</code>.
        </div>
      </section>

      <!-- SCENARIO 4: Required, Readonly, NonNullable -->
      <section class="scenario">
        <h3>Scenario 4: Required, Readonly, NonNullable</h3>
        <div class="explanation">
          <pre><code>// Required: removes optional modifier
type Required&lt;T&gt; = &#123; [K in keyof T]-?: T[K] &#125;;

// Readonly: adds readonly modifier
type Readonly&lt;T&gt; = &#123; readonly [K in keyof T]: T[K] &#125;;

// NonNullable: excludes null and undefined
type NonNullable&lt;T&gt; = T & &#123;&#125;;
// Effectively: T extends null | undefined ? never : T

// Deep versions:
type DeepPartial&lt;T&gt; = &#123;
  [K in keyof T]?: T[K] extends object ? DeepPartial&lt;T[K]&gt; : T[K];
&#125;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Type-Level Demonstrations</h4>
          <div class="type-demo">
            <code>Required&lt;User&gt;</code> → <span class="type-result">metadata is now required (was optional)</span><br>
            <code>Readonly&lt;User&gt;</code> → <span class="type-result">all props readonly, no mutations allowed</span><br>
            <code>NonNullable&lt;string | null&gt;</code> → <span class="type-result">string</span><br>
            <code>DeepPartial&lt;AppConfig&gt;</code> → <span class="type-result">even nested features object is partial</span>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How does the <code>-?</code> modifier work in <code>Required</code>?"<br>
          <strong>A:</strong> The <code>-</code> prefix removes a modifier. <code>-?</code> removes optionality.
          Similarly, <code>-readonly</code> removes readonly. You can also use <code>+?</code> and <code>+readonly</code>
          explicitly, but they're the default so rarely used.
          <br><br>
          <strong>Twisted Q:</strong> "Does <code>Readonly</code> make objects truly immutable?"<br>
          <strong>A:</strong> No! <code>Readonly</code> is shallow — nested objects are still mutable.
          <code>readonly</code> is also purely a compile-time check. At runtime, nothing prevents mutation.
          For deep immutability, you need <code>DeepReadonly</code> (custom type) + <code>Object.freeze</code> (runtime).
          Even <code>Object.freeze</code> is shallow — you'd need a recursive freeze function.
        </div>
      </section>

      <!-- SCENARIO 5: Custom Utility Types -->
      <section class="scenario">
        <h3>Scenario 5: Custom Utility Types</h3>
        <div class="explanation">
          <pre><code>// Make specific properties optional
type PartialBy&lt;T, K extends keyof T&gt; = Omit&lt;T, K&gt; & Partial&lt;Pick&lt;T, K&gt;&gt;;
// PartialBy&lt;User, 'metadata' | 'isActive'&gt;
// = &#123; id, name, email, role required; metadata?, isActive? optional &#125;

// Make specific properties required
type RequiredBy&lt;T, K extends keyof T&gt; = Omit&lt;T, K&gt; & Required&lt;Pick&lt;T, K&gt;&gt;;

// At least one property required (great for search filters)
type AtLeastOne&lt;T, K extends keyof T = keyof T&gt; =
  Omit&lt;T, K&gt; & &#123; [P in K]: Required&lt;Pick&lt;T, P&gt;&gt; & Partial&lt;Omit&lt;Pick&lt;T, K&gt;, P&gt;&gt; &#125;[K];</code></pre>
        </div>
        <div class="demo-box">
          <h4>Type-Level Demonstrations</h4>
          <div class="type-demo">
            <code>PartialBy&lt;User, 'metadata'&gt;</code> → <span class="type-result">only metadata is optional</span><br>
            <code>RequiredBy&lt;Partial&lt;User&gt;, 'id' | 'name'&gt;</code> → <span class="type-result">id & name required, rest optional</span><br>
            <code>Mutable&lt;Readonly&lt;User&gt;&gt;</code> → <span class="type-result">back to mutable User</span><br>
            <code>StringKeys&lt;User&gt;</code> → <span class="type-result">'id' | 'name' | 'email' | 'role' | 'isActive' | 'metadata'</span>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "Build a utility type that makes all properties of type string into optional."<br>
          <strong>A:</strong>
          <code>type OptionalStrings&lt;T&gt; = &#123; [K in keyof T as T[K] extends string ? K : never]?: T[K] &#125; & &#123; [K in keyof T as T[K] extends string ? never : K]: T[K] &#125;</code>.
          This uses key remapping: string properties get <code>?</code>, non-string properties stay required.
          <br><br>
          <strong>Twisted Q:</strong> "How does <code>AtLeastOne</code> work? Walk through the implementation."<br>
          <strong>A:</strong> It creates a union of types where each member has ONE specific property required and the rest optional.
          For <code>AtLeastOne&lt;&#123;a: 1, b: 2&#125;&gt;</code>: <code>&#123; a: 1; b?: 2 &#125; | &#123; a?: 1; b: 2 &#125;</code>.
          The mapped type iterates over K, for each P creates <code>Required&lt;Pick&lt;T,P&gt;&gt; & Partial&lt;rest&gt;</code>,
          then the <code>[K]</code> indexed access produces a union of all these.
        </div>
      </section>

      <!-- SCENARIO 6: Combined Real Patterns -->
      <section class="scenario">
        <h3>Scenario 6: Combining Utility Types for Real Patterns</h3>
        <div class="explanation">
          <pre><code>// PATCH request: id required, everything else optional
type PatchRequest&lt;T extends &#123; id: number &#125;&gt; =
  Pick&lt;T, 'id'&gt; & Partial&lt;Omit&lt;T, 'id'&gt;&gt;;

// Form state with field-level metadata
type FormField&lt;T&gt; = &#123;
  value: T; dirty: boolean; touched: boolean; errors: string[];
&#125;;
type FormState&lt;T&gt; = &#123; [K in keyof T]: FormField&lt;T[K]&gt; &#125;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>PatchRequest&lt;User&gt; example:</h4>
          <pre>{{ patchRequestExample | json }}</pre>
          <h4>FormState&lt;Pick&lt;User, 'name'|'email'&gt;&gt; example:</h4>
          <pre>{{ formStateExample | json }}</pre>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How would you type a function that accepts any utility type combination?"<br>
          <strong>A:</strong> Use generic constraints: <code>function update&lt;T extends &#123;id: number&#125;&gt;(patch: PatchRequest&lt;T&gt;)</code>.
          The constraint ensures T has an id, and the utility type constructs the right shape.
          This is how Angular's <code>FormBuilder.group()</code> internally uses mapped types to produce
          <code>FormGroup&lt;&#123;[K in keyof T]: FormControl&lt;T[K]&gt;&#125;&gt;</code>.
        </div>
      </section>

      <!-- SCENARIO 7: Interactive Form with FormState<T> -->
      <section class="scenario">
        <h3>Scenario 7: Interactive Form with FormState&lt;T&gt;</h3>
        <div class="explanation">
          <pre><code>// FormState tracks each field's value, dirty, touched, errors
type FormField&lt;T&gt; = &#123; value: T; dirty: boolean; touched: boolean; errors: string[] &#125;;
type FormState&lt;T&gt; = &#123; [K in keyof T]: FormField&lt;T[K]&gt; &#125;;

// Usage: every field gets its own metadata automatically
const form: FormState&lt;&#123; name: string; email: string &#125;&gt; = &#123;
  name: &#123; value: '', dirty: false, touched: false, errors: [] &#125;,
  email: &#123; value: '', dirty: false, touched: false, errors: [] &#125;,
&#125;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Type-Safe User Form</h4>
          <p style="color: #999; font-size: 0.8rem;">Edit fields below — dirty/touched states track automatically via the FormState&lt;T&gt; mapped type.</p>
          <div class="form-grid">
            <div class="form-field">
              <label>Name:</label>
              <input #formName value="Alice" (input)="onFormInput('name', formName.value)" (blur)="onFormBlur('name')" />
              <div class="field-meta">
                dirty: <span [class]="liveForm().name.dirty ? 'val-true' : 'val-false'">{{ liveForm().name.dirty }}</span>
                | touched: <span [class]="liveForm().name.touched ? 'val-true' : 'val-false'">{{ liveForm().name.touched }}</span>
                @if (liveForm().name.errors.length > 0) {
                  | <span class="val-error">{{ liveForm().name.errors[0] }}</span>
                }
              </div>
            </div>
            <div class="form-field">
              <label>Email:</label>
              <input #formEmail value="alice@example.com" (input)="onFormInput('email', formEmail.value)" (blur)="onFormBlur('email')" />
              <div class="field-meta">
                dirty: <span [class]="liveForm().email.dirty ? 'val-true' : 'val-false'">{{ liveForm().email.dirty }}</span>
                | touched: <span [class]="liveForm().email.touched ? 'val-true' : 'val-false'">{{ liveForm().email.touched }}</span>
                @if (liveForm().email.errors.length > 0) {
                  | <span class="val-error">{{ liveForm().email.errors[0] }}</span>
                }
              </div>
            </div>
            <div class="form-field">
              <label>Role:</label>
              <select #formRole (change)="onFormInput('role', formRole.value)" (blur)="onFormBlur('role')">
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
              <div class="field-meta">
                dirty: <span [class]="liveForm().role.dirty ? 'val-true' : 'val-false'">{{ liveForm().role.dirty }}</span>
                | touched: <span [class]="liveForm().role.touched ? 'val-true' : 'val-false'">{{ liveForm().role.touched }}</span>
              </div>
            </div>
          </div>
          <button (click)="resetForm()">Reset Form</button>
          <button (click)="submitForm()">Submit (shows dirty fields only)</button>
          @if (formSubmitResult()) {
            <pre>{{ formSubmitResult() | json }}</pre>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How would you extract only dirty fields from FormState&lt;T&gt; for a PATCH request?"<br>
          <strong>A:</strong> Combine <code>FormState</code> with a runtime filter:
          <code>Object.entries(form).filter(([_, f]) =&gt; f.dirty).reduce((acc, [k, f]) =&gt; (&#123;...acc, [k]: f.value&#125;), &#123;&#125;)</code>.
          The result type would be <code>Partial&lt;T&gt;</code>, since only a subset of fields may be dirty.
        </div>
      </section>

      <!-- SCENARIO 8: Interactive Pick/Omit Builder -->
      <section class="scenario">
        <h3>Scenario 8: Interactive Pick/Omit Builder</h3>
        <div class="explanation">
          <pre><code>// Pick and Omit are inverses:
// Pick&lt;User, 'id' | 'name'&gt; keeps only id, name
// Omit&lt;User, 'id' | 'name'&gt; keeps everything except id, name

// Practical: building DTOs interactively
type CreateDto = Omit&lt;User, 'id'&gt;;        // id auto-generated
type ListDto = Pick&lt;User, 'id'|'name'|'role'&gt;; // minimal for lists
type UpdateDto = Partial&lt;Omit&lt;User, 'id'&gt;&gt; & Pick&lt;User, 'id'&gt;; // id + optional rest</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Select fields to Pick from User</h4>
          <p style="color: #999; font-size: 0.8rem;">Toggle fields to see the resulting Pick&lt;User, ...&gt; type and value.</p>
          <div class="toggle-group">
            @for (field of allUserFields; track field) {
              <button
                [class]="pickedFields().includes(field) ? 'toggle-active' : 'toggle-inactive'"
                (click)="togglePickField(field)">
                {{ field }}
              </button>
            }
          </div>
          @if (pickedResult()) {
            <div style="margin-top: 0.75rem;">
              <code style="color: #ce93d8;">Pick&lt;User, {{ pickedFieldsDisplay() }}&gt;</code>
              <pre>{{ pickedResult() | json }}</pre>
              <code style="color: #ef5350;">Omit&lt;User, {{ pickedFieldsDisplay() }}&gt;</code> (inverse)
              <pre>{{ omittedResult() | json }}</pre>
            </div>
          }
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "How would you create a type that makes picked properties required and the rest optional?"<br>
          <strong>A:</strong> <code>type PickRequired&lt;T, K extends keyof T&gt; = Required&lt;Pick&lt;T, K&gt;&gt; & Partial&lt;Omit&lt;T, K&gt;&gt;</code>.
          This is the inverse of <code>PartialBy</code>. It's useful for form wizards where some steps have required fields
          and later steps are optional until the user gets to them.
        </div>
      </section>

      <!-- SCENARIO 9: DeepPartial vs Partial Comparison -->
      <section class="scenario">
        <h3>Scenario 9: DeepPartial vs Partial — Nested Config Demo</h3>
        <div class="explanation">
          <pre><code>// Partial is SHALLOW — nested objects stay required
type Partial&lt;T&gt; = &#123; [K in keyof T]?: T[K] &#125;;

// DeepPartial recursively makes everything optional
type DeepPartial&lt;T&gt; = &#123;
  [K in keyof T]?: T[K] extends object ? DeepPartial&lt;T[K]&gt; : T[K];
&#125;;

// Example: AppConfig has nested features object
const shallowPatch: Partial&lt;AppConfig&gt; = &#123;
  features: &#123; darkMode: true, notifications: true, analytics: false &#125;
  // ^ Must provide ALL features — it's not partial inside!
&#125;;

const deepPatch: DeepPartial&lt;AppConfig&gt; = &#123;
  features: &#123; darkMode: true &#125;
  // ^ Only override what changed — notifications & analytics keep defaults
&#125;;</code></pre>
        </div>
        <div class="demo-box">
          <h4>Live Demo: Config Override with DeepPartial</h4>
          <p style="color: #999; font-size: 0.8rem;">Toggle individual features — the deep partial patch only includes changed values.</p>
          <div class="config-grid">
            <div class="config-item">
              <label>App Name:</label>
              <input #cfgName value="MyApp" (input)="updateConfigOverride('appName', cfgName.value)" />
            </div>
            <div class="config-item">
              <label>Dark Mode:</label>
              <button [class]="configOverride().features?.darkMode === true ? 'toggle-active' : 'toggle-inactive'"
                (click)="toggleConfigFeature('darkMode')">
                {{ configOverride().features?.darkMode === true ? 'ON' : configOverride().features?.darkMode === false ? 'OFF' : 'default' }}
              </button>
            </div>
            <div class="config-item">
              <label>Notifications:</label>
              <button [class]="configOverride().features?.notifications === true ? 'toggle-active' : 'toggle-inactive'"
                (click)="toggleConfigFeature('notifications')">
                {{ configOverride().features?.notifications === true ? 'ON' : configOverride().features?.notifications === false ? 'OFF' : 'default' }}
              </button>
            </div>
            <div class="config-item">
              <label>Analytics:</label>
              <button [class]="configOverride().features?.analytics === true ? 'toggle-active' : 'toggle-inactive'"
                (click)="toggleConfigFeature('analytics')">
                {{ configOverride().features?.analytics === true ? 'ON' : configOverride().features?.analytics === false ? 'OFF' : 'default' }}
              </button>
            </div>
          </div>
          <div style="margin-top: 1rem;">
            <h4>DeepPartial patch sent to API:</h4>
            <pre>{{ configOverride() | json }}</pre>
            <h4>Merged result (defaults + overrides):</h4>
            <pre>{{ mergedConfig() | json }}</pre>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What's the problem with <code>DeepPartial</code> and arrays?"<br>
          <strong>A:</strong> The naive <code>T[K] extends object</code> check is true for arrays too, so
          <code>DeepPartial</code> would make array elements optional: <code>string[]</code> becomes <code>(string | undefined)[]</code>.
          Fix: <code>T[K] extends (infer U)[] ? DeepPartial&lt;U&gt;[] : T[K] extends object ? DeepPartial&lt;T[K]&gt; : T[K]</code>.
          Also watch out for <code>Date</code>, <code>Map</code>, <code>Set</code> — they're objects too. Production implementations
          add explicit exclusions for these.
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
    input, select { background: #0d1117; color: #e0e0e0; border: 1px solid #444; padding: 0.3rem 0.6rem; border-radius: 4px; margin: 0 0.5rem; }
    button { margin: 0.5rem 0.5rem 0 0; padding: 0.4rem 1rem; background: #7c4dff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    button:hover { background: #651fff; }
    .type-demo { font-size: 0.9rem; line-height: 1.8; }
    .type-result { color: #66bb6a; font-weight: bold; }
    .preview-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .preview-card { background: #0d1117; padding: 0.5rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .role-badge { padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
    .admin { background: #c62828; color: #fff; }
    .editor { background: #1565c0; color: #fff; }
    .viewer { background: #2e7d32; color: #fff; }
    .interview-note { margin-top: 1rem; padding: 1rem; background: #1b1b2f; border-left: 3px solid #ff9800; border-radius: 0 6px 6px 0; font-size: 0.9rem; line-height: 1.6; }
    .interview-note strong { color: #ffb74d; }
    .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .form-field label { display: inline-block; width: 60px; color: #90caf9; font-size: 0.85rem; }
    .form-field input, .form-field select { width: 220px; }
    .field-meta { font-size: 0.75rem; color: #777; margin-top: 0.25rem; margin-left: 64px; }
    .val-true { color: #66bb6a; }
    .val-false { color: #777; }
    .val-error { color: #ef5350; }
    .toggle-group { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .toggle-active { background: #7c4dff !important; color: #fff; }
    .toggle-inactive { background: #333 !important; color: #999; }
    .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .config-item { display: flex; align-items: center; gap: 0.5rem; }
    .config-item label { color: #90caf9; font-size: 0.85rem; min-width: 100px; }
  `],
})
export class UtilityTypesComponent {
  private readonly api = inject(TypescriptApiService);

  // Scenario 1
  updatedUser = signal<User | null>(null);

  // Scenario 2
  userPreviews = signal<UserPreview[]>([]);

  // Scenario 3
  currentPermissions = signal<{ role: string; permissions: string[] } | null>(null);
  featureFlags = signal<FeatureFlags | null>(null);

  // Scenario 6: Examples
  patchRequestExample: PatchRequest<User> = {
    id: 1,
    name: 'Alice Updated',
    // email, role, isActive, metadata are all optional
  };

  formStateExample: FormState<Pick<User, 'name' | 'email'>> = {
    name: { value: 'Alice', dirty: false, touched: false, errors: [] },
    email: { value: 'alice@example.com', dirty: true, touched: true, errors: ['Email already taken'] },
  };

  partialUpdate(id: number, name: string): void {
    const changes: Partial<User> = { name };
    this.api.updateUser(id, changes).subscribe(user => this.updatedUser.set(user));
  }

  loadUserPreviews(): void {
    this.api.getUsers().subscribe(users => {
      // Pick only preview fields — TypeScript enforces we only use id, name, role
      const previews: UserPreview[] = users.map(({ id, name, role }) => ({ id, name, role }));
      this.userPreviews.set(previews);
    });
  }

  showPermissions(role: User['role']): void {
    this.currentPermissions.set({
      role,
      permissions: rolePermissions[role],
    });
  }

  loadFeatureFlags(): void {
    this.api.getConfig().subscribe(config => {
      this.featureFlags.set(config.features);
    });
  }

  // ===== Scenario 7: Interactive FormState<T> =====
  liveForm = signal<FormState<Pick<User, 'name' | 'email' | 'role'>>>({
    name: { value: 'Alice', dirty: false, touched: false, errors: [] },
    email: { value: 'alice@example.com', dirty: false, touched: false, errors: [] },
    role: { value: 'viewer' as User['role'], dirty: false, touched: false, errors: [] },
  });
  formSubmitResult = signal<Record<string, unknown> | null>(null);

  onFormInput(field: 'name' | 'email' | 'role', value: string): void {
    const current = this.liveForm();
    const errors: string[] = [];
    if (field === 'name' && value.trim().length < 2) errors.push('Name must be at least 2 chars');
    if (field === 'email' && !value.includes('@')) errors.push('Invalid email format');
    this.liveForm.set({
      ...current,
      [field]: { ...current[field], value, dirty: true, errors },
    });
  }

  onFormBlur(field: 'name' | 'email' | 'role'): void {
    const current = this.liveForm();
    this.liveForm.set({
      ...current,
      [field]: { ...current[field], touched: true },
    });
  }

  resetForm(): void {
    this.liveForm.set({
      name: { value: 'Alice', dirty: false, touched: false, errors: [] },
      email: { value: 'alice@example.com', dirty: false, touched: false, errors: [] },
      role: { value: 'viewer' as User['role'], dirty: false, touched: false, errors: [] },
    });
    this.formSubmitResult.set(null);
  }

  submitForm(): void {
    const form = this.liveForm();
    const dirtyFields: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(form)) {
      if (field.dirty) dirtyFields[key] = field.value;
    }
    this.formSubmitResult.set(
      Object.keys(dirtyFields).length > 0
        ? { patchPayload: dirtyFields, note: 'Only dirty fields included — Partial<User>' }
        : { note: 'No fields changed — nothing to send' }
    );
  }

  // ===== Scenario 8: Interactive Pick/Omit Builder =====
  readonly allUserFields: (keyof User)[] = ['id', 'name', 'email', 'role', 'isActive', 'metadata'];
  pickedFields = signal<(keyof User)[]>(['id', 'name', 'role']);

  private readonly sampleUser: User = {
    id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', isActive: true,
    metadata: { lastLogin: '2025-01-15', loginCount: 42 },
  };

  pickedResult = computed(() => {
    const fields = this.pickedFields();
    if (fields.length === 0) return null;
    const result: Record<string, unknown> = {};
    for (const f of fields) result[f] = this.sampleUser[f];
    return result;
  });

  omittedResult = computed(() => {
    const picked = this.pickedFields();
    const result: Record<string, unknown> = {};
    for (const f of this.allUserFields) {
      if (!picked.includes(f)) result[f] = this.sampleUser[f];
    }
    return result;
  });

  pickedFieldsDisplay = computed(() =>
    this.pickedFields().map(f => `'${f}'`).join(' | ')
  );

  togglePickField(field: keyof User): void {
    const current = this.pickedFields();
    if (current.includes(field)) {
      this.pickedFields.set(current.filter(f => f !== field));
    } else {
      this.pickedFields.set([...current, field]);
    }
  }

  // ===== Scenario 9: DeepPartial Config Override =====
  private readonly defaultConfig = {
    appName: 'MyApp',
    version: '1.0.0',
    features: { darkMode: false, notifications: true, analytics: false },
  };

  configOverride = signal<DeepPartial<typeof this.defaultConfig>>({});

  mergedConfig = computed(() => {
    const override = this.configOverride();
    return {
      appName: override.appName ?? this.defaultConfig.appName,
      version: this.defaultConfig.version,
      features: {
        darkMode: override.features?.darkMode ?? this.defaultConfig.features.darkMode,
        notifications: override.features?.notifications ?? this.defaultConfig.features.notifications,
        analytics: override.features?.analytics ?? this.defaultConfig.features.analytics,
      },
    };
  });

  updateConfigOverride(field: string, value: string): void {
    this.configOverride.set({ ...this.configOverride(), [field]: value });
  }

  toggleConfigFeature(feature: 'darkMode' | 'notifications' | 'analytics'): void {
    const current = this.configOverride();
    const currentVal = current.features?.[feature];
    const nextVal = currentVal === true ? false : currentVal === false ? undefined : true;
    const features = { ...current.features };
    if (nextVal === undefined) {
      delete features[feature];
    } else {
      features[feature] = nextVal;
    }
    this.configOverride.set({ ...current, features });
  }
}
