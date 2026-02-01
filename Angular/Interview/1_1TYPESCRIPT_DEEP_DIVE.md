# TypeScript Deep Dive — Senior Angular Developer Interview Preparation

> **Phase 1, Topic 1** of the Angular Preparation Roadmap
> Target audience: 10+ year senior developers preparing for Staff / Principal / Architect-level interviews

---

## Table of Contents

1. [Advanced Types (Union, Intersection, Conditional)](#1-advanced-types)
   - [Theory](#11-theory)
   - [Angular Context](#12-angular-context)
   - [Interview Questions](#13-interview-questions)
   - [Pitfalls & Gotchas](#14-pitfalls--gotchas)
2. [Generics and Constraints](#2-generics-and-constraints)
   - [Theory](#21-theory)
   - [Angular Context](#22-angular-context)
   - [Interview Questions](#23-interview-questions)
   - [Pitfalls & Gotchas](#24-pitfalls--gotchas)
3. [Decorators and Metadata Reflection](#3-decorators-and-metadata-reflection)
   - [Theory](#31-theory)
   - [Angular Context](#32-angular-context)
   - [Interview Questions](#33-interview-questions)
   - [Pitfalls & Gotchas](#34-pitfalls--gotchas)
4. [Type Guards and Type Narrowing](#4-type-guards-and-type-narrowing)
   - [Theory](#41-theory)
   - [Angular Context](#42-angular-context)
   - [Interview Questions](#43-interview-questions)
   - [Pitfalls & Gotchas](#44-pitfalls--gotchas)
5. [Utility Types (Partial, Pick, Omit, Record)](#5-utility-types)
   - [Theory](#51-theory)
   - [Angular Context](#52-angular-context)
   - [Interview Questions](#53-interview-questions)
   - [Pitfalls & Gotchas](#54-pitfalls--gotchas)
6. [Module Resolution Strategies](#6-module-resolution-strategies)
   - [Theory](#61-theory)
   - [Angular Context](#62-angular-context)
   - [Interview Questions](#63-interview-questions)
   - [Pitfalls & Gotchas](#64-pitfalls--gotchas)
7. [Cross-Topic Twisted Interview Questions](#7-cross-topic-twisted-interview-questions)
8. [Real-World Scenario Questions](#8-real-world-scenario-questions)
9. [Common Mistakes and How to Avoid Them](#9-common-mistakes-and-how-to-avoid-them)

---

## 1. Advanced Types

### 1.1 Theory

#### Union Types (`A | B`)

A union type describes a value that can be one of several types. The variable holds **one type at a time**, and TypeScript narrows the type based on control flow analysis.

```typescript
type ApiResponse = SuccessResponse | ErrorResponse | LoadingState;

interface SuccessResponse {
  status: 'success';
  data: unknown;
}

interface ErrorResponse {
  status: 'error';
  message: string;
  code: number;
}

interface LoadingState {
  status: 'loading';
}
```

**Key principle**: With union types, you can only access members that are **common to all types** in the union unless you narrow the type first. This is a deliberate safety mechanism.

```typescript
function handle(response: ApiResponse) {
  // response.data   --> ERROR: 'data' does not exist on ErrorResponse | LoadingState
  // response.status --> OK: 'status' exists on all three
}
```

**Discriminated Unions** (also called Tagged Unions) use a common literal-type property (the "discriminant") so TypeScript can narrow automatically:

```typescript
function handle(response: ApiResponse) {
  switch (response.status) {
    case 'success':
      console.log(response.data);    // narrowed to SuccessResponse
      break;
    case 'error':
      console.log(response.message); // narrowed to ErrorResponse
      break;
    case 'loading':
      // narrowed to LoadingState
      break;
  }
}
```

#### Intersection Types (`A & B`)

An intersection type combines multiple types into one. The resulting type has **all properties** from every constituent type.

```typescript
interface HasId {
  id: string;
}

interface HasTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface HasAuthor {
  authorId: string;
}

type BlogPost = HasId & HasTimestamps & HasAuthor & {
  title: string;
  content: string;
};
```

**Key principle**: Intersection of two primitive types that have no overlap produces `never`:

```typescript
type Impossible = string & number; // never
```

When intersecting object types with the same property name but different types, that property becomes an intersection of the two property types:

```typescript
type A = { name: string; age: number };
type B = { name: string; age: string };
type C = A & B;
// C['age'] is number & string which is never
// So effectively you cannot assign a valid value to age
```

#### Conditional Types (`T extends U ? X : Y`)

Conditional types select one of two types based on a condition expressed as a type relationship. They are the `if/else` of the type system.

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
```

**Distributive conditional types**: When the checked type is a naked type parameter, the conditional type distributes over union members:

```typescript
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>;
// Distributes: ToArray<string> | ToArray<number>
// Result: string[] | number[]

// To prevent distribution, wrap in tuple:
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDist<string | number>;
// Result2: (string | number)[]
```

**The `infer` keyword** lets you extract types from within conditional types:

```typescript
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

type Unpacked<T> =
  T extends (infer U)[] ? U :
  T extends Promise<infer U> ? U :
  T extends Set<infer U> ? U :
  T;

type A = Unpacked<Promise<string>>;  // string
type B = Unpacked<string[]>;          // string
type C = Unpacked<number>;            // number
```

### 1.2 Angular Context

**How Angular uses these internally:**

- **Union types** are everywhere in Angular's template type checking. The `NgIf` structural directive input is typed as `T | undefined`. The `AsyncPipe` returns `T | null`.

- **Discriminated unions** are the backbone of NgRx actions:

```typescript
// NgRx uses discriminated unions for actions
type UserActions =
  | { type: '[User] Load'; }
  | { type: '[User] Load Success'; payload: User[] }
  | { type: '[User] Load Failure'; error: string };
```

- **Intersection types** are used in Angular's `Renderer2` and in combining component metadata. Angular's dependency injection token types often use intersections.

- **Conditional types** power Angular's `Signal` infrastructure. The `WritableSignal<T>` vs `Signal<T>` distinction uses conditional type logic internally. Angular's template type checker uses conditional types to infer template variable types.

```typescript
// Angular uses conditional types in its type system for forms
type FormControl<T> = T extends object ? FormGroup<{
  [K in keyof T]: FormControl<T[K]>;
}> : FormControlPrimitive<T>;
```

### 1.3 Interview Questions

**Q1 (Basic): What is the difference between a union type and an intersection type?**

**Answer**: A union (`A | B`) means the value is **either** type A **or** type B. You can only access members common to both. An intersection (`A & B`) means the value is **both** type A **and** type B simultaneously. You can access all members from both types. Think of union as "OR" and intersection as "AND" from the value perspective, but note the access rules are reversed: union restricts access (only shared members), intersection expands access (all members).

---

**Q2 (Intermediate): What happens when you intersect two object types that have the same property with different types?**

**Answer**:

```typescript
type A = { x: string };
type B = { x: number };
type C = A & B;
// C is { x: string & number } which is { x: never }
```

The property `x` becomes `never` because no value can be both `string` and `number` simultaneously. You can technically create a variable of type `C`, but you can never assign a valid value to `x`. This is a common source of bugs when merging configuration types.

---

**Q3 (Advanced): Explain distributive conditional types. How do you prevent distribution?**

**Answer**: When a conditional type acts on a generic type parameter directly (a "naked" type parameter), it distributes over union members:

```typescript
type Wrap<T> = T extends any ? { value: T } : never;
type Distributed = Wrap<string | number>;
// = { value: string } | { value: number }  (distributed)
```

To prevent distribution, wrap the type parameter in a tuple:

```typescript
type WrapNoDistribute<T> = [T] extends [any] ? { value: T } : never;
type NonDistributed = WrapNoDistribute<string | number>;
// = { value: string | number }  (not distributed)
```

This matters in Angular when building generic type utilities for services or state management.

---

**Q4 (Twisted): What is the type of `never` in a union? What about in an intersection?**

**Answer**:
- `never` in a **union** is absorbed: `string | never` = `string`. Think of `never` as the empty set. Union with empty is unchanged.
- `never` in an **intersection** absorbs everything: `string & never` = `never`. Intersection with empty set is empty.

This is not just theoretical. When conditional types distribute over `never` (an empty union), the result is `never`:

```typescript
type Test<T> = T extends string ? true : false;
type Result = Test<never>; // never (not true or false!)
```

This surprises many developers debugging generic utilities.

---

**Q5 (Twisted): Given the following, what is `Result`?**

```typescript
type A = { name: string; age: number };
type B = { name: string; email: string };
type Result = keyof (A & B);
```

**Answer**: `Result` is `"name" | "age" | "email"`. The `keyof` of an intersection is the **union** of keys from both types. Conversely, `keyof (A | B)` would be `"name"` (only the common key). The rule is:

```
keyof (A & B) = (keyof A) | (keyof B)
keyof (A | B) = (keyof A) & (keyof B)
```

This is counterintuitive but mathematically consistent with set theory.

---

**Q6 (Advanced): How would you use `infer` to extract the type of a resolved Observable?**

**Answer**:

```typescript
import { Observable } from 'rxjs';

type ObservedType<T> = T extends Observable<infer U> ? U : never;

// Usage
type UserData = ObservedType<Observable<{ name: string; id: number }>>;
// UserData = { name: string; id: number }

// Practical Angular use: extracting response type from a service method
class UserService {
  getUsers(): Observable<User[]> { /* ... */ }
}

type Users = ObservedType<ReturnType<UserService['getUsers']>>;
// Users = User[]
```

### 1.4 Pitfalls & Gotchas

1. **Union access trap**: Trying to access a non-shared property on a union without narrowing first. TypeScript will error, and many developers resort to `as` casting instead of proper narrowing.

2. **Intersection of functions**: Intersecting function types creates an overloaded function, not a function that accepts all argument types:

```typescript
type F = ((x: string) => void) & ((x: number) => void);
// F is an overloaded function, not (x: string | number) => void
```

3. **Empty object type `{}`**: The type `{}` does not mean "empty object". It means "any non-null, non-undefined value". Use `Record<string, never>` for truly empty objects.

4. **Excess property checking** only works on object literals. If you assign an object variable to a union type, excess properties silently pass.

---

## 2. Generics and Constraints

### 2.1 Theory

Generics allow you to write reusable code that works across multiple types while preserving type information. The type becomes a **parameter** that is supplied at call site or inferred by the compiler.

#### Basic Generics

```typescript
function identity<T>(value: T): T {
  return value;
}

const str = identity('hello');  // T inferred as 'hello' (literal type)
const num = identity(42);       // T inferred as 42
```

#### Generic Constraints (`extends`)

Constraints restrict what types a generic parameter can accept:

```typescript
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
  console.log(arg.length); // safe because T must have 'length'
  return arg;
}

logLength('hello');     // OK, string has length
logLength([1, 2, 3]);  // OK, array has length
logLength(42);          // ERROR: number has no 'length'
```

#### The `keyof` Constraint Pattern

One of the most powerful patterns:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
const name = getProperty(user, 'name');  // type: string
const age = getProperty(user, 'age');    // type: number
getProperty(user, 'email');              // ERROR: 'email' is not in keyof user
```

#### Generic Classes and Interfaces

```typescript
class Repository<T extends { id: string }> {
  private items = new Map<string, T>();

  add(item: T): void {
    this.items.set(item.id, item);
  }

  getById(id: string): T | undefined {
    return this.items.get(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }
}
```

#### Default Type Parameters

```typescript
interface ApiResponse<TData = unknown, TError = Error> {
  data?: TData;
  error?: TError;
  status: number;
}

// All valid:
const r1: ApiResponse = { status: 200 };
const r2: ApiResponse<User> = { data: user, status: 200 };
const r3: ApiResponse<User, CustomError> = { status: 500, error: customErr };
```

#### Mapped Types with Generics

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Optional<T> = {
  [P in keyof T]?: T[P];
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

#### Recursive Generics

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface Config {
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  logging: {
    level: string;
  };
}

// All properties at every depth become optional
type PartialConfig = DeepPartial<Config>;
```

### 2.2 Angular Context

**Angular's DI system is fundamentally generic:**

```typescript
// Angular's Inject function signature (simplified)
function inject<T>(token: ProviderToken<T>): T;

// InjectionToken is generic
const API_URL = new InjectionToken<string>('API_URL');
const CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

**HttpClient methods are generic:**

```typescript
// Angular HttpClient
class HttpClient {
  get<T>(url: string, options?: HttpOptions): Observable<T>;
  post<T>(url: string, body: any, options?: HttpOptions): Observable<T>;
}

// Usage preserves type info
this.http.get<User[]>('/api/users').subscribe(users => {
  // users is User[] -- fully typed
});
```

**Angular Signals use generics:**

```typescript
const count = signal<number>(0);           // WritableSignal<number>
const doubled = computed(() => count() * 2); // Signal<number>
```

**Reactive Forms use generics (Angular 14+):**

```typescript
interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

const form = new FormGroup<LoginForm>({
  email: new FormControl('', { nonNullable: true }),
  password: new FormControl('', { nonNullable: true }),
  rememberMe: new FormControl(false, { nonNullable: true }),
});

// form.value is Partial<{ email: string; password: string; rememberMe: boolean }>
```

### 2.3 Interview Questions

**Q1 (Basic): What problem do generics solve that `any` does not?**

**Answer**: Both `any` and generics accept all types, but generics **preserve type information** through the call chain, while `any` discards it. With `any`, you lose all type safety downstream. With generics, TypeScript tracks the actual type:

```typescript
function withAny(x: any): any { return x; }
function withGeneric<T>(x: T): T { return x; }

const a = withAny('hello');    // a: any -- no autocomplete, no safety
const b = withGeneric('hello'); // b: "hello" -- full type info preserved
```

---

**Q2 (Intermediate): Explain how `T extends keyof U` works and provide a real use case.**

**Answer**: `T extends keyof U` constrains T to be one of the property names of U. This enables type-safe property access patterns:

```typescript
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key]);
}

const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
];

const names = pluck(users, 'name');  // string[]
const ages = pluck(users, 'age');    // number[]
pluck(users, 'email');               // ERROR at compile time
```

In Angular, this pattern is used in generic table components:

```typescript
@Component({ /* ... */ })
class DataTableComponent<T> {
  @Input() data: T[] = [];
  @Input() columns: (keyof T)[] = [];
}
```

---

**Q3 (Advanced): What is the difference between `<T extends string>` and `<T extends string | number>` when T receives a union?**

**Answer**: The constraint checks each member of the union independently:

```typescript
function test<T extends string>(x: T): T { return x; }
test('hello' as string | number); // ERROR: number does not extend string
```

The constraint `T extends string` means **the entire type assigned to T** must be assignable to `string`. If you pass `string | number`, TypeScript checks: is `string | number` assignable to `string`? No, because `number` is not assignable to `string`.

For `T extends string | number`, both `string` and `number` individually satisfy the constraint, so `string | number` as a whole is valid.

---

**Q4 (Advanced): How do you create a generic type that makes specific properties required while keeping the rest optional?**

**Answer**:

```typescript
type RequireOnly<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

type CreateUserDto = RequireOnly<User, 'name' | 'email'>;
// name and email are required, everything else is optional
```

This is extremely useful in Angular for form types and API DTOs.

---

**Q5 (Twisted): What does this evaluate to and why?**

```typescript
type Foo<T> = T extends { a: infer U; b: infer U } ? U : never;
type Result = Foo<{ a: string; b: number }>;
```

**Answer**: `Result` is `string | number`. When the same type variable `U` is inferred in multiple **covariant** positions, the result is a **union** of the inferred types. If U were in **contravariant** positions (e.g., function parameters), the result would be an **intersection**:

```typescript
type Bar<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
type Result2 = Bar<{ a: (x: string) => void; b: (x: number) => void }>;
// Result2 = string & number = never
```

This covariant/contravariant inference behavior is critical for building advanced type utilities.

---

**Q6 (Twisted): Can you constrain a generic to be a specific shape while also allowing extra properties?**

**Answer**: Yes, this is the default behavior. Generic constraints use structural typing:

```typescript
function process<T extends { id: string }>(item: T): T {
  console.log(item.id);
  return item;
}

// Extra properties are allowed and preserved in return type
const user = process({ id: '1', name: 'Alice', age: 30 });
// user is { id: string; name: string; age: number }
```

The constraint `T extends { id: string }` means T must have at least an `id: string` property, but can have anything else. The full type is preserved because T captures the entire input type.

### 2.4 Pitfalls & Gotchas

1. **Generic parameter defaults are not constraints**: `<T = string>` does NOT mean T must be string. It means if T is not provided, use string. You still need `<T extends string = string>` to constrain.

2. **Over-generifying**: Not everything needs generics. If a function only ever works with one type, a generic adds complexity without benefit.

3. **Generic inference failure**: Sometimes TS infers a wider type than expected. Use `const` assertions or explicit type arguments:

```typescript
function make<T>(x: T) { return { value: x }; }
const r = make('hello');  // T = string (not "hello")
const r2 = make('hello' as const); // T = "hello"
```

4. **Constraint narrowing does not propagate**: Inside a generic function, even with `T extends string | number`, you cannot use `typeof` to narrow `T` — it narrows the value but TypeScript does not narrow the type parameter itself.

---

## 3. Decorators and Metadata Reflection

### 3.1 Theory

Decorators are a **stage 3 ECMAScript proposal** (TC39) and have been available in TypeScript via `experimentalDecorators`. TypeScript 5.0 introduced support for the **TC39 standard decorators** which differ from the legacy/experimental decorators that Angular has historically used.

#### Legacy (Experimental) Decorators — What Angular Uses

These require `"experimentalDecorators": true` in tsconfig.json. There are five types:

1. **Class Decorators**: Applied to the class constructor.
2. **Method Decorators**: Applied to method property descriptors.
3. **Accessor Decorators**: Applied to getter/setter descriptors.
4. **Property Decorators**: Applied to property definitions.
5. **Parameter Decorators**: Applied to individual parameters.

```typescript
// Class decorator
function Sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

// Method decorator
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with`, args);
    const result = original.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };
  return descriptor;
}

// Property decorator
function DefaultValue(value: any) {
  return function (target: any, propertyKey: string) {
    target[propertyKey] = value;
  };
}

// Parameter decorator
function Required(target: any, propertyKey: string, parameterIndex: number) {
  const existingRequired: number[] = Reflect.getOwnMetadata('required', target, propertyKey) || [];
  existingRequired.push(parameterIndex);
  Reflect.defineMetadata('required', existingRequired, target, propertyKey);
}
```

#### Decorator Factories

A decorator factory is a function that **returns** a decorator. This allows passing configuration:

```typescript
function Component(config: { selector: string; template: string }) {
  return function (constructor: Function) {
    // Store metadata on the class
    Reflect.defineMetadata('component', config, constructor);
  };
}

@Component({
  selector: 'app-root',
  template: '<h1>Hello</h1>'
})
class AppComponent {}
```

#### Decorator Execution Order

This is a **very common interview question**:

```typescript
function classDecorator(constructor: Function) { console.log('class'); }
function methodDecorator(t: any, k: string, d: PropertyDescriptor) { console.log('method'); }
function propertyDecorator(t: any, k: string) { console.log('property'); }
function paramDecorator(t: any, k: string, i: number) { console.log('param'); }

@classDecorator
class Example {
  @propertyDecorator
  name: string = '';

  @methodDecorator
  greet(@paramDecorator message: string) {}
}

// Output order:
// property
// param
// method
// class
```

**Rules**:
1. Instance members before static members.
2. Parameter decorators, then method/accessor/property decorators (for each member).
3. Class decorators last.
4. When multiple decorators are on the same declaration, they evaluate top-to-bottom but execute **bottom-to-top** (like function composition):

```typescript
@f
@g
class X {}
// Equivalent to: f(g(X))
```

#### Metadata Reflection (`reflect-metadata`)

The `reflect-metadata` polyfill enables storing and retrieving metadata on classes and their members:

```typescript
import 'reflect-metadata';

// Design-time type metadata (automatically emitted with emitDecoratorMetadata)
// Three built-in metadata keys:
// - 'design:type'        -> property type
// - 'design:paramtypes'  -> constructor/method parameter types
// - 'design:returntype'  -> method return type

class UserService {
  constructor(private http: HttpClient, private logger: Logger) {}
}

// With emitDecoratorMetadata: true, TypeScript emits:
// Reflect.metadata('design:paramtypes', [HttpClient, Logger])
// This is HOW Angular's DI knows what to inject!
```

### 3.2 Angular Context

**Decorators are the DNA of Angular.** Every Angular construct uses them:

```typescript
@Component({...})    // Class decorator - defines a component
@Directive({...})    // Class decorator - defines a directive
@Pipe({...})         // Class decorator - defines a pipe
@Injectable({...})   // Class decorator - marks class for DI
@NgModule({...})     // Class decorator - defines a module

@Input()             // Property decorator - marks input binding
@Output()            // Property decorator - marks output event
@ViewChild(...)      // Property decorator - queries template
@HostListener(...)   // Method decorator - listens to host events
@HostBinding(...)    // Property decorator - binds to host property
@Inject(TOKEN)       // Parameter decorator - specifies DI token
```

**How Angular's DI uses metadata reflection:**

When you write:

```typescript
@Injectable()
class UserService {
  constructor(private http: HttpClient) {}
}
```

Angular's compiler (with `emitDecoratorMetadata: true`) emits code that calls `Reflect.metadata('design:paramtypes', [HttpClient])`. At runtime, Angular's injector reads this metadata to know that `UserService` requires `HttpClient` as a dependency.

**Angular Ivy changed this**: With Ivy (Angular 9+), the Angular compiler (ngc) generates static fields (`ɵfac`, `ɵcmp`, `ɵdir`, etc.) directly on the class. These contain factory functions that explicitly reference dependencies, reducing reliance on `reflect-metadata` at runtime. However, the decorator syntax remains the same for developers.

### 3.3 Interview Questions

**Q1 (Basic): What is the difference between a decorator and a decorator factory?**

**Answer**: A decorator is a function that directly receives the target (class, method, etc.). A decorator factory is a function that **returns** a decorator, allowing you to pass configuration:

```typescript
// Decorator (no parentheses when applied)
function Sealed(constructor: Function) { /* ... */ }

@Sealed
class A {}

// Decorator factory (parentheses when applied, even without args)
function Injectable(config?: { providedIn?: string }) {
  return function (constructor: Function) { /* ... */ };
}

@Injectable({ providedIn: 'root' })
class B {}
```

Angular's `@Injectable()` uses parentheses because it is a factory. `@Injectable` without parentheses would fail because the class constructor would be passed as the `config` parameter.

---

**Q2 (Intermediate): In what order do decorators execute on a single class?**

**Answer**: Bottom-to-top, inside-to-outside:
1. Parameter decorators (for each method, left to right parameters)
2. Method / Accessor / Property decorators (order of appearance in class body)
3. Parameter decorators for the constructor
4. Class decorator

For multiple decorators on the same target, they are **evaluated** top-to-bottom but **applied** bottom-to-top (like mathematical function composition `f(g(x))`).

---

**Q3 (Advanced): How does Angular resolve dependencies without `reflect-metadata` in Ivy?**

**Answer**: With Ivy, the Angular compiler (ngc) processes decorators at **compile time** and generates static factory functions. For example:

```typescript
@Injectable()
class UserService {
  constructor(private http: HttpClient) {}
}

// Ivy compiler generates (simplified):
class UserService {
  static ɵfac = () => new UserService(inject(HttpClient));
  static ɵprov = { providedIn: 'root' };
}
```

The `ɵfac` (factory) function explicitly calls `inject()` for each dependency. This is why Ivy does not strictly need `emitDecoratorMetadata` at runtime. The metadata is baked into the compiled output. This also enables tree-shaking because unused providers can be removed.

---

**Q4 (Advanced): Can you modify a class's prototype in a class decorator? What are the implications?**

**Answer**: Yes, class decorators receive the constructor function and can modify or replace it:

```typescript
function AddTimestamp<T extends new (...args: any[]) => {}>(constructor: T) {
  return class extends constructor {
    createdAt = new Date();
  };
}

@AddTimestamp
class User {
  name = 'Alice';
}

const u = new User();
// u.createdAt exists at runtime but TypeScript does NOT know about it
// This is a known limitation: class decorators cannot change the type
console.log((u as any).createdAt); // works, but requires cast
```

**Major pitfall**: TypeScript does not update the type of the class based on what the decorator returns. This means properties added by decorators are invisible to the type system. This is a known limitation and one reason the TC39 proposal introduced a different approach.

---

**Q5 (Twisted): What happens if you apply `@Injectable()` to a class that has no constructor?**

**Answer**: It works perfectly. If a class has no explicit constructor, it has zero dependencies. Angular's compiler generates a factory that simply calls `new ClassName()`. The `@Injectable()` decorator's primary purpose is to signal to Angular's DI system that this class participates in dependency injection. Without it (in strict mode), Angular would not create a provider for the class. The decorator is about **registration**, not about constructor analysis.

---

**Q6 (Twisted): Why does Angular require `@Inject(TOKEN)` for `InjectionToken` but not for class-based providers?**

**Answer**: Class-based providers have a runtime representation (the class constructor function) that can be used as a DI token. With `emitDecoratorMetadata`, the constructor parameter types are emitted as references to these class constructors. But `InjectionToken` instances are runtime values that do not appear as TypeScript types:

```typescript
const API_URL = new InjectionToken<string>('API_URL');

@Injectable()
class ApiService {
  // HttpClient is a class -> constructor function exists at runtime
  // API_URL is a const value -> its TYPE is 'string', which is erased at runtime
  constructor(
    private http: HttpClient,          // No @Inject needed
    @Inject(API_URL) private url: string  // @Inject required
  ) {}
}
```

Without `@Inject(API_URL)`, Angular would only see `String` as the parameter type metadata and would not know which `InjectionToken` to resolve.

### 3.4 Pitfalls & Gotchas

1. **`emitDecoratorMetadata` emits `Object` for interfaces**: Since interfaces are erased at compile time, injecting by interface does not work. This is why Angular uses `InjectionToken` or abstract classes instead.

2. **Circular dependency in decorators**: If class A's decorator references class B and B's decorator references A, you get `undefined` at runtime because one class has not been defined yet when the other's decorator runs.

3. **TC39 decorators vs legacy**: Angular still uses legacy (`experimentalDecorators`). TC39 decorators have a different API (they receive a `context` object instead of `target, key, descriptor`). Do not confuse the two.

4. **Decorator metadata and minification**: Minifiers can rename constructor parameters, breaking DI metadata. Angular's AOT compilation avoids this by generating explicit factory functions.

---

## 4. Type Guards and Type Narrowing

### 4.1 Theory

Type narrowing is TypeScript's ability to refine a broad type to a more specific type within a code branch. Type guards are expressions that trigger narrowing.

#### Built-in Type Guards

```typescript
// typeof guard (works for primitives)
function process(value: string | number) {
  if (typeof value === 'string') {
    value.toUpperCase(); // narrowed to string
  } else {
    value.toFixed(2); // narrowed to number
  }
}

// instanceof guard (works for classes)
function handleError(error: Error | HttpErrorResponse) {
  if (error instanceof HttpErrorResponse) {
    console.log(error.status); // narrowed to HttpErrorResponse
  } else {
    console.log(error.message); // narrowed to Error
  }
}

// in guard (checks property existence)
function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim(); // narrowed to Fish
  } else {
    animal.fly(); // narrowed to Bird
  }
}

// Truthiness narrowing
function processName(name: string | null | undefined) {
  if (name) {
    name.toUpperCase(); // narrowed to string (non-empty)
  }
}

// Equality narrowing
function compare(a: string | number, b: string | boolean) {
  if (a === b) {
    // Both narrowed to string (only common type)
    a.toUpperCase();
    b.toUpperCase();
  }
}
```

#### User-Defined Type Guards (`is` keyword)

When built-in guards are insufficient, you can write custom predicate functions:

```typescript
interface Cat {
  meow(): void;
  purr(): void;
}

interface Dog {
  bark(): void;
  fetch(): void;
}

function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}

function interact(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.purr(); // narrowed to Cat
  } else {
    animal.fetch(); // narrowed to Dog
  }
}
```

#### Assertion Functions (`asserts` keyword)

Assertion functions narrow types by throwing if the condition fails:

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`);
  }
}

function process(input: unknown) {
  assertIsString(input);
  // After this line, input is narrowed to string
  input.toUpperCase(); // OK
}
```

#### Discriminated Union Narrowing

The most powerful narrowing pattern in Angular applications:

```typescript
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function renderState<T>(state: LoadingState<T>) {
  switch (state.status) {
    case 'idle':
      return 'Not started';
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Data: ${JSON.stringify(state.data)}`; // data is accessible
    case 'error':
      return `Error: ${state.error}`; // error is accessible
  }
}
```

#### Exhaustiveness Checking with `never`

Ensure all cases are handled:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function handleAction(action: 'create' | 'update' | 'delete') {
  switch (action) {
    case 'create': return;
    case 'update': return;
    case 'delete': return;
    default:
      assertNever(action); // compile error if a case is missing
  }
}
```

### 4.2 Angular Context

**Template type narrowing with `*ngIf` and `@if`:**

```typescript
// Angular narrows types in templates
@Component({
  template: `
    @if (user$ | async; as user) {
      <!-- user is narrowed from User | null to User -->
      <span>{{ user.name }}</span>
    }
  `
})
class ProfileComponent {
  user$: Observable<User | null> = this.store.select(selectUser);
}
```

**Route guard type narrowing:**

```typescript
// Type guard for route data
function hasRequiredData(data: Data): data is Data & { user: User } {
  return 'user' in data && data['user'] != null;
}
```

**NgRx reducer narrowing:**

```typescript
// NgRx actions use discriminated unions
const userReducer = createReducer(
  initialState,
  on(loadUsersSuccess, (state, { users }) => ({
    // action.type narrows to the specific action
    ...state,
    users,
    loading: false,
  })),
  on(loadUsersFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
```

**Angular's `inject()` function return type narrowing:**

```typescript
// When optional, inject returns T | null
const router = inject(Router);                      // Router
const optional = inject(SomeToken, { optional: true }); // SomeType | null
```

### 4.3 Interview Questions

**Q1 (Basic): Name four built-in type guard expressions in TypeScript.**

**Answer**: (1) `typeof x === 'string'` for primitive types, (2) `x instanceof MyClass` for class instances, (3) `'property' in x` for checking property existence, (4) `x === null` / `x !== undefined` equality checks. Additionally, truthiness checks (`if (x)`) and `Array.isArray(x)` also narrow types.

---

**Q2 (Intermediate): What is the difference between a type predicate (`is`) and an assertion function (`asserts`)?**

**Answer**:

```typescript
// Type predicate: returns boolean, narrows in the truthy branch
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
// Usage: if (isString(x)) { /* x is string here */ }

// Assertion function: throws or returns void, narrows after the call
function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error('Not a string');
}
// Usage: assertString(x); /* x is string from here onward */
```

Key differences:
- Type predicate is used in `if` conditions and narrows only within the branch.
- Assertion function narrows **after** the call for the rest of the scope.
- Assertion function throws on failure; type predicate just returns false.
- Assertion functions cannot be used in ternary expressions or short-circuit evaluations.

---

**Q3 (Advanced): Why does this code not narrow properly?**

```typescript
interface A { type: 'a'; value: string }
interface B { type: 'b'; count: number }

function process(items: (A | B)[]) {
  const filtered = items.filter(item => item.type === 'a');
  // filtered is still (A | B)[] -- not narrowed to A[]
  filtered[0].value; // ERROR
}
```

**Answer**: `Array.filter()` does not narrow types unless you use a type predicate as the callback. The default filter signature returns the same array type. Fix:

```typescript
const filtered = items.filter((item): item is A => item.type === 'a');
// Now filtered is A[]
filtered[0].value; // OK
```

This is one of the most common pitfalls in Angular codebases when filtering collections of discriminated union types.

---

**Q4 (Advanced): How does `typeof` narrowing fail with `null`?**

**Answer**: `typeof null` returns `'object'` in JavaScript (a historical bug). So:

```typescript
function process(x: object | null) {
  if (typeof x === 'object') {
    // x is still object | null -- NOT narrowed!
    // Because null also has typeof 'object'
  }
}

// Correct approach:
function process(x: object | null) {
  if (x !== null && typeof x === 'object') {
    // Now x is narrowed to object
  }
}
```

---

**Q5 (Twisted): Can narrowing be "undone"? When does TypeScript reset the narrowed type?**

**Answer**: Yes, narrowing is reset (widened back) in several scenarios:

```typescript
function example(x: string | number) {
  if (typeof x === 'string') {
    // x is string here

    someFunction(); // If someFunction could reassign x (closures), TS may widen

    x = 42; // Direct reassignment resets narrowing
    // x is now number
  }
}

// Narrowing also does not survive callbacks:
function example2(x: string | number) {
  if (typeof x === 'string') {
    setTimeout(() => {
      // x could have been reassigned before this callback runs
      // In newer TS versions, x stays narrowed if it's const or not reassigned
      x.toUpperCase(); // May or may not error depending on TS version and mutation
    }, 0);
  }
}
```

As of TypeScript 5.x, narrowing is preserved in closures if the variable is not reassigned after the narrowing point. But if you reassign the variable anywhere in the function, narrowing in closures is lost.

---

**Q6 (Twisted): What is "control flow analysis" and how does it differ from type guards?**

**Answer**: Control flow analysis (CFA) is the **engine** that powers all narrowing. Type guards are **inputs** to that engine. CFA tracks variable types through every branch, assignment, return, and throw in a function. Type guards are specific expressions (typeof, instanceof, in, user-defined predicates) that CFA recognizes as narrowing triggers.

CFA also handles:
- Assignment narrowing: `let x: string | number = 'hello';` (x is string)
- Unreachable code detection: after `throw` or `return`, remaining code sees narrowed types
- Definite assignment analysis: variables must be assigned before use

The distinction matters because CFA can narrow without explicit type guards (e.g., `x = 'hello'` narrows x to string), and some patterns that look like they should narrow do not because CFA does not recognize them (e.g., storing the result of typeof in a variable and checking that variable).

### 4.4 Pitfalls & Gotchas

1. **`typeof` in a variable does not narrow**:

```typescript
const t = typeof x;
if (t === 'string') {
  x.toUpperCase(); // ERROR: x not narrowed
}
// Must use inline: if (typeof x === 'string')
```

2. **Type guards do not narrow object properties deeply**: If you narrow `obj.type`, TypeScript narrows `obj`, but if you access `obj.nested.type`, the narrowing may not flow to `obj`.

3. **Async boundaries break narrowing**: After `await`, the variable could have been mutated by another part of the code (in theory), so TypeScript may widen the type.

4. **Custom type guards can lie**: TypeScript trusts your `is` predicate. If your implementation is wrong, you get runtime errors that the type system cannot catch:

```typescript
function isNumber(x: unknown): x is number {
  return true; // LIES! Always returns true
}
```

---

## 5. Utility Types

### 5.1 Theory

TypeScript ships with built-in utility types that perform common type transformations. Understanding their **implementation** is key for interviews.

#### `Partial<T>` — Makes all properties optional

```typescript
// Implementation:
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Usage:
interface User {
  id: string;
  name: string;
  email: string;
}

function updateUser(id: string, updates: Partial<User>) {
  // updates can have any subset of User properties
}

updateUser('1', { name: 'Bob' }); // OK
updateUser('1', {});               // OK
```

#### `Required<T>` — Makes all properties required

```typescript
// Implementation:
type Required<T> = {
  [P in keyof T]-?: T[P];
};
// The -? modifier REMOVES optionality
```

#### `Readonly<T>` — Makes all properties readonly

```typescript
// Implementation:
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

#### `Pick<T, K>` — Selects a subset of properties

```typescript
// Implementation:
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Usage:
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }
```

#### `Omit<T, K>` — Removes properties

```typescript
// Implementation:
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// Usage:
type CreateUserDto = Omit<User, 'id'>;
// { name: string; email: string }
```

Note: `Omit`'s constraint is `K extends keyof any` (not `keyof T`), meaning you can omit keys that do not exist on T without error. This is by design but can mask typos.

#### `Record<K, V>` — Creates an object type with keys K and values V

```typescript
// Implementation:
type Record<K extends keyof any, T> = {
  [P in K]: T;
};

// Usage:
type PageRoutes = Record<'home' | 'about' | 'contact', RouteConfig>;
type UserMap = Record<string, User>;
```

#### `Exclude<T, U>` and `Extract<T, U>`

```typescript
// Exclude: Remove members of T that are assignable to U
type Exclude<T, U> = T extends U ? never : T;

type T1 = Exclude<'a' | 'b' | 'c', 'a'>;
// 'b' | 'c'

// Extract: Keep only members of T that are assignable to U
type Extract<T, U> = T extends U ? T : never;

type T2 = Extract<string | number | boolean, string | number>;
// string | number
```

#### `NonNullable<T>` — Removes null and undefined

```typescript
type NonNullable<T> = T & {};
// In older versions: T extends null | undefined ? never : T

type T3 = NonNullable<string | null | undefined>;
// string
```

#### `ReturnType<T>` and `Parameters<T>`

```typescript
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

// Usage:
function createUser(name: string, age: number): User { /* ... */ }

type CreateReturn = ReturnType<typeof createUser>;   // User
type CreateParams = Parameters<typeof createUser>;   // [string, number]
```

#### `Awaited<T>` (TypeScript 4.5+)

```typescript
// Recursively unwraps Promises
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type A = Awaited<Promise<Promise<string>>>;  // string
```

### 5.2 Angular Context

**`Partial<T>` in forms and state management:**

```typescript
// Partial is everywhere in Angular forms
@Component({...})
class UserFormComponent {
  updateForm(changes: Partial<UserForm>) {
    this.form.patchValue(changes); // patchValue accepts Partial
  }
}

// NgRx state updates
on(updateUser, (state, { changes }: { changes: Partial<User> }) => ({
  ...state,
  user: { ...state.user, ...changes },
}))
```

**`Pick` and `Omit` for API DTOs:**

```typescript
// Server returns full User, but create endpoint only needs:
type CreateUserRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// List view only shows:
type UserListItem = Pick<User, 'id' | 'name' | 'email'>;
```

**`Record` for lookup maps and configuration:**

```typescript
// Route configuration
const ROUTE_TITLES: Record<string, string> = {
  '/home': 'Dashboard',
  '/users': 'User Management',
  '/settings': 'Settings',
};

// Component registry
type ComponentMap = Record<string, Type<any>>;
```

**`ReturnType` for extracting service method types:**

```typescript
// Type a resolver's return based on service method
type UserResolverData = Awaited<ReturnType<UserService['getUser']>>;
// If getUser returns Observable<User>, you might combine with a custom ObservedType
```

### 5.3 Interview Questions

**Q1 (Basic): What is the difference between `Omit` and `Pick`?**

**Answer**: `Pick<T, K>` creates a type with **only** the specified keys K from T. `Omit<T, K>` creates a type with **all** keys from T **except** the specified keys K. They are inverses:

```typescript
interface User { id: string; name: string; email: string; }

type A = Pick<User, 'name' | 'email'>; // { name: string; email: string }
type B = Omit<User, 'id'>;              // { name: string; email: string }
// A and B are structurally identical
```

---

**Q2 (Intermediate): Implement `DeepReadonly<T>` that makes nested properties readonly too.**

**Answer**:

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]  // Don't make functions readonly
      : DeepReadonly<T[P]>
    : T[P];
};

interface Config {
  db: {
    host: string;
    credentials: {
      user: string;
      pass: string;
    };
  };
}

type ImmutableConfig = DeepReadonly<Config>;
// All nested properties are readonly
```

---

**Q3 (Advanced): Why does `Omit` use `keyof any` instead of `keyof T` as the constraint for K?**

**Answer**: `Omit<T, K extends keyof any>` allows omitting keys that may not exist on `T`. `keyof any` is `string | number | symbol` — any valid property key. This was a deliberate design choice to allow:

```typescript
type A = Omit<User, 'nonExistentProp'>; // No error
```

This is useful when building generic utilities where K comes from another source and might not match T exactly. However, it means typos are not caught:

```typescript
type B = Omit<User, 'nmae'>; // No error! But 'nmae' is a typo
```

If you want strict omit:

```typescript
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type C = StrictOmit<User, 'nmae'>; // ERROR: 'nmae' not in keyof User
```

---

**Q4 (Advanced): How would you type a function that accepts an object and returns the same object but with specified keys made required?**

**Answer**:

```typescript
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Or more explicitly:
type WithRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Usage:
interface Config {
  host?: string;
  port?: number;
  database?: string;
  ssl?: boolean;
}

type ProdConfig = WithRequired<Config, 'host' | 'database'>;
// host and database are required, port and ssl remain optional
```

---

**Q5 (Twisted): What does `Partial<Required<T>>` produce? Is it the same as just `Partial<T>`?**

**Answer**: `Partial<Required<T>>` first makes ALL properties required (removing `?`), then makes ALL properties optional (adding `?`). So the result is: every property exists and is optional. This is NOT the same as `Partial<T>` when T has properties that were already required — the final behavior is identical in structure, but there is a subtle difference: if T had readonly modifiers, `Required` preserves them and `Partial` preserves them, so the readonly-ness is unchanged.

Actually, structurally, `Partial<Required<T>>` and `Partial<T>` produce the same type for any T, because both result in all properties being optional with their original value types. The `Required` in the middle is effectively a no-op because `Partial` overrides it. This is a trick question designed to test whether you understand that mapped type modifiers compose sequentially.

---

**Q6 (Twisted): Implement a utility type `Mutable<T>` that removes `readonly` from all properties.**

**Answer**:

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// The -readonly modifier removes readonly, just as -? removes optionality

interface FrozenUser {
  readonly id: string;
  readonly name: string;
}

type EditableUser = Mutable<FrozenUser>;
// { id: string; name: string } -- no readonly
```

This is useful in Angular when you receive immutable state from NgRx and need to create a mutable draft for editing.

### 5.4 Pitfalls & Gotchas

1. **`Partial` makes ALL properties optional**: Including required ones you might still need. For "update" DTOs, consider `Partial<Pick<T, 'mutable' | 'fields'>> & Pick<T, 'id'>` to keep id required.

2. **`Record<string, T>` vs index signature**: They are equivalent: `Record<string, T>` is `{ [key: string]: T }`. But `Record<'a' | 'b', T>` enforces that both 'a' and 'b' exist.

3. **`Omit` does not work well with union types**: `Omit` distributes differently than you might expect:

```typescript
type A = { type: 'a'; x: number };
type B = { type: 'b'; y: string };
type Union = A | B;

type Result = Omit<Union, 'type'>;
// Result is { } -- NOT { x: number } | { y: string }!
// Because Omit works on the union as a whole, not distributively
```

Fix with a distributive version:

```typescript
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type Fixed = DistributiveOmit<Union, 'type'>;
// { x: number } | { y: string }
```

4. **Nested utility types compound complexity**: `Readonly<Partial<Pick<T, K>>>` is hard to read. Create named type aliases for clarity.

---

## 6. Module Resolution Strategies

### 6.1 Theory

Module resolution is how the TypeScript compiler locates the file that a module import refers to. There are two main strategies, and Angular projects use specific configurations.

#### Classic Resolution (legacy)

The `"moduleResolution": "classic"` strategy is TypeScript's original algorithm. It is rarely used today but may appear in interview questions.

For **relative imports** (`import { x } from './module'`):
1. `./module.ts`
2. `./module.d.ts`

For **non-relative imports** (`import { x } from 'module'`):
1. Starting from the importing file's directory, walk up, checking:
   - `<dir>/module.ts`
   - `<dir>/module.d.ts`

No `node_modules` lookup. No `package.json` inspection.

#### Node Resolution (most common in Angular)

The `"moduleResolution": "node"` strategy mimics Node.js's `require()` algorithm.

For **relative imports** (`import { x } from './module'`):
1. `./module.ts`
2. `./module.tsx`
3. `./module.d.ts`
4. `./module/package.json` (check `"types"` field)
5. `./module/index.ts`
6. `./module/index.tsx`
7. `./module/index.d.ts`

For **non-relative imports** (`import { x } from 'module'`):
Starting from the importing file's directory, walk up the tree checking `node_modules` at each level:
1. `node_modules/module.ts`
2. `node_modules/module.tsx`
3. `node_modules/module.d.ts`
4. `node_modules/module/package.json` (check `"types"` or `"typings"`)
5. `node_modules/module/index.ts`
6. `node_modules/module/index.tsx`
7. `node_modules/module/index.d.ts`
8. Move to parent directory and repeat

#### Node16 / NodeNext Resolution (TypeScript 4.7+)

Supports Node.js ESM resolution with `package.json` `"exports"` field:

```json
{
  "name": "my-lib",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs"
    }
  }
}
```

This strategy respects `exports` maps, conditional exports, and the distinction between CJS and ESM.

#### Bundler Resolution (TypeScript 5.0+)

The `"moduleResolution": "bundler"` strategy is designed for projects that use bundlers (Webpack, Vite, esbuild). It combines the best of Node resolution with bundler-specific behaviors:
- Resolves `package.json` `"exports"` like NodeNext
- But does NOT require file extensions in relative imports (unlike NodeNext)
- Supports `"imports"` field in `package.json`

**Angular 17+ defaults to `"moduleResolution": "bundler"`** in new projects.

#### Key `tsconfig.json` Settings for Module Resolution

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",     // or "node", "node16", "nodenext"
    "baseUrl": "./",                    // Base for non-relative imports
    "paths": {                          // Path aliases
      "@app/*": ["src/app/*"],
      "@env/*": ["src/environments/*"],
      "@shared/*": ["src/app/shared/*"]
    },
    "typeRoots": ["./node_modules/@types", "./src/typings"],
    "types": ["node", "jest"]           // Only include these @types packages
  }
}
```

#### `paths` vs `baseUrl`

- `baseUrl`: Sets the root for non-relative module resolution. If set to `"./"`, then `import 'src/app/utils'` resolves from the project root.
- `paths`: Maps import patterns to file locations. IMPORTANT: `paths` requires `baseUrl` to be set. `paths` is purely a compile-time mapping — at runtime, you need a corresponding Webpack/bundler alias or a tool like `tsconfig-paths`.

#### `typeRoots` and `types`

- `typeRoots`: Directories where TypeScript looks for `@types` packages. Default is `["./node_modules/@types"]`.
- `types`: If specified, ONLY these `@types` packages are included. All others are excluded. If not specified, ALL packages in `typeRoots` are included.

### 6.2 Angular Context

**Angular CLI's default tsconfig:**

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "module": "es2022",
    "moduleResolution": "bundler",
    "paths": {
      "@app/*": ["src/app/*"],
      "@environments/*": ["src/environments/*"]
    }
  }
}
```

**How Angular libraries are resolved:**

When you `import { Component } from '@angular/core'`, the resolution follows:
1. Check `paths` in tsconfig (no match for `@angular/core`).
2. Check `node_modules/@angular/core/package.json`.
3. The `package.json` has `"types"` or `"typings"` pointing to the declaration file.
4. With `exports` field, the bundler resolves the correct entry point.

**Angular library `ng-package.json` and `package.json`:**

Angular libraries built with `ng-packagr` generate a `package.json` with multiple entry points:

```json
{
  "name": "@myorg/my-lib",
  "module": "./fesm2022/my-lib.mjs",
  "typings": "./index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "esm2022": "./esm2022/my-lib.mjs",
      "default": "./fesm2022/my-lib.mjs"
    },
    "./testing": {
      "types": "./testing/index.d.ts",
      "default": "./fesm2022/my-lib-testing.mjs"
    }
  }
}
```

**Secondary entry points** (`@angular/common/http`, `@angular/material/button`) are resolved through the `exports` field or through sub-directory `package.json` files.

### 6.3 Interview Questions

**Q1 (Basic): What are the main module resolution strategies in TypeScript?**

**Answer**: There are four strategies:
1. **Classic**: Legacy strategy, walks up directories. No `node_modules`. Rarely used.
2. **Node** (also called "node10"): Mimics Node.js `require()`. Checks `node_modules`, `package.json` `types` field, index files. Most common historically.
3. **Node16/NodeNext**: Supports ESM `exports` maps, requires file extensions for relative ESM imports. For pure Node.js projects.
4. **Bundler** (TS 5.0+): Like NodeNext but without requiring file extensions. Designed for Webpack/Vite/esbuild. **Angular 17+ default**.

---

**Q2 (Intermediate): What is the `paths` option in tsconfig.json and what is its runtime implication?**

**Answer**: `paths` creates compile-time module aliases:

```json
{
  "baseUrl": "./",
  "paths": {
    "@shared/*": ["src/app/shared/*"]
  }
}
```

This lets you write `import { Utils } from '@shared/utils'` instead of `import { Utils } from '../../../shared/utils'`.

**Critical runtime implication**: `paths` is a COMPILE-TIME ONLY feature. TypeScript resolves the types, but the emitted JavaScript still contains the original import path. You need a corresponding runtime resolver:
- **Webpack**: `resolve.alias` in webpack config (Angular CLI handles this automatically)
- **Node.js**: Use `tsconfig-paths` package or configure `package.json` `imports`
- **Jest**: Configure `moduleNameMapper`

Angular CLI reads `tsconfig.json` paths and configures Webpack aliases automatically.

---

**Q3 (Advanced): How does Angular resolve secondary entry points like `@angular/common/http`?**

**Answer**: Secondary entry points are resolved through **subpath exports** in `package.json`:

```json
// node_modules/@angular/common/package.json
{
  "exports": {
    ".": { "types": "./index.d.ts", "default": "./fesm2022/common.mjs" },
    "./http": { "types": "./http/index.d.ts", "default": "./fesm2022/http.mjs" },
    "./http/testing": { "types": "./http/testing/index.d.ts", "default": "./fesm2022/http-testing.mjs" }
  }
}
```

With older module resolution (pre-bundler), Angular used a different approach: each secondary entry point had its own `package.json` in a subdirectory (`node_modules/@angular/common/http/package.json`).

The `exports` field approach is more modern and is what `moduleResolution: "bundler"` uses. It also enables tree-shaking because bundlers can resolve the exact file rather than the entire package.

---

**Q4 (Advanced): What happens when `typeRoots` is set but `types` is not?**

**Answer**: When `typeRoots` is set, TypeScript looks for `@types` packages in the specified directories instead of the default `node_modules/@types`. When `types` is NOT set, ALL type packages found in `typeRoots` are automatically included.

When `types` IS set, only the listed packages are included:

```json
{
  "typeRoots": ["./node_modules/@types", "./src/custom-types"],
  "types": ["node", "jest"]
}
```

This means `@types/lodash` would NOT be included even if installed. This is useful to avoid type conflicts (e.g., between `@types/jest` and `@types/mocha` which both declare global `describe` and `it`).

Common Angular gotcha: If you set `"types": []`, you get NO global type declarations (no `window`, no `document` unless you add `"dom"` to `lib`). Types and lib serve different purposes — `types` controls `@types` packages, `lib` controls built-in declarations.

---

**Q5 (Twisted): You set `paths` in tsconfig.json but imports fail at runtime. Why?**

**Answer**: `paths` is compile-time only. The emitted JavaScript still contains the original aliased paths. At runtime, Node.js or the bundler does not know about TypeScript's `paths`. Solutions:
1. **Angular CLI** (automatic): The CLI reads tsconfig `paths` and configures Webpack automatically.
2. **Custom Webpack**: Add matching `resolve.alias` configuration.
3. **Node.js**: Use `tsconfig-paths/register` to resolve paths at runtime, or configure `package.json` `"imports"` field.
4. **Jest**: Configure `moduleNameMapper` in jest config to match tsconfig paths.

A common symptom: TypeScript compiles without errors, but you get `Module not found` at runtime.

---

**Q6 (Twisted): What is the difference between `module` and `moduleResolution` in tsconfig?**

**Answer**: These are two **completely different** settings:

- **`module`**: Controls what **module system** TypeScript emits in the output JavaScript. Options include `commonjs` (require/module.exports), `es2015/es2020/es2022/esnext` (import/export), `node16`, `nodenext`. This affects the **output** code.

- **`moduleResolution`**: Controls how TypeScript **finds** the file for an import. Options include `classic`, `node`, `node16`, `nodenext`, `bundler`. This affects the **lookup** algorithm.

They are often confused because they share some option names (`node16`, `nodenext`). In Angular:
- `module: "es2022"` — emit ES module syntax
- `moduleResolution: "bundler"` — use bundler-style resolution

Setting `module: "commonjs"` with `moduleResolution: "bundler"` is technically valid but unusual. The settings are orthogonal.

### 6.4 Pitfalls & Gotchas

1. **`baseUrl` and `paths` coupling**: `paths` requires `baseUrl` to be set. If you change `baseUrl`, all `paths` mappings shift relative to the new base.

2. **`moduleResolution: "node"` does not support `exports`**: If a package only exposes entry points via `package.json` `exports` and you use `moduleResolution: "node"`, TypeScript cannot resolve the import. Upgrade to `"bundler"` or `"node16"`.

3. **Multiple tsconfig files**: Angular projects often have `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.spec.json`. They extend each other, and `paths` must be defined in the base config or repeated in each. IDE resolution uses the root tsconfig; build uses the specific one.

4. **Relative import extensions**: With `moduleResolution: "node16"` or `"nodenext"`, relative imports MUST include the `.js` extension (even for `.ts` files): `import { x } from './utils.js'`. This catches many developers by surprise. The `"bundler"` strategy does not require this.

---

## 7. Cross-Topic Twisted Interview Questions

These questions intentionally blend multiple concepts to test deep understanding.

---

**Q1: You have a generic service that fetches data. The response can be either a success with data of type T, or an error. How would you type this using union types, generics, and type guards?**

**Answer**:

```typescript
// Discriminated union with generic
interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: Date;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: number;
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Type guard
function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

// Generic service
class ApiService {
  async fetch<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(url);
      const data = await res.json();
      return { success: true, data: data as T, timestamp: new Date() };
    } catch (e) {
      return { success: false, error: String(e), code: 500 };
    }
  }
}

// Usage with narrowing
async function loadUsers(api: ApiService) {
  const result = await api.fetch<User[]>('/api/users');
  if (isSuccess(result)) {
    result.data.forEach(user => console.log(user.name)); // fully typed
  } else {
    console.error(`Error ${result.code}: ${result.error}`);
  }
}
```

---

**Q2: How would you implement a type-safe event emitter using generics, mapped types, and conditional types?**

**Answer**:

```typescript
type EventMap = {
  userLogin: { userId: string; timestamp: Date };
  userLogout: { userId: string };
  error: { message: string; code: number };
  ping: void;
};

class TypedEventEmitter<T extends Record<string, any>> {
  private handlers = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(
    event: K,
    handler: T[K] extends void ? () => void : (payload: T[K]) => void
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  emit<K extends keyof T>(
    ...args: T[K] extends void ? [event: K] : [event: K, payload: T[K]]
  ): void {
    const handlers = this.handlers.get(args[0]);
    if (handlers) {
      handlers.forEach(fn => fn(args[1]));
    }
  }
}

const emitter = new TypedEventEmitter<EventMap>();
emitter.on('userLogin', (payload) => {
  console.log(payload.userId); // fully typed
});
emitter.emit('ping');                // no payload required
emitter.emit('error', { message: 'fail', code: 500 }); // payload required
emitter.emit('error');               // ERROR: missing payload
```

---

**Q3: You need to type a configuration object where certain keys depend on the value of a `type` property. How do you enforce this with conditional types?**

**Answer**:

```typescript
interface BaseConfig {
  name: string;
  type: 'database' | 'cache' | 'queue';
}

interface DatabaseConfig extends BaseConfig {
  type: 'database';
  connectionString: string;
  poolSize: number;
}

interface CacheConfig extends BaseConfig {
  type: 'cache';
  ttl: number;
  maxItems: number;
}

interface QueueConfig extends BaseConfig {
  type: 'queue';
  concurrency: number;
  retryAttempts: number;
}

type ServiceConfig = DatabaseConfig | CacheConfig | QueueConfig;

// Utility to extract config by type
type ConfigForType<T extends ServiceConfig['type']> =
  Extract<ServiceConfig, { type: T }>;

type DbConfig = ConfigForType<'database'>; // DatabaseConfig

// Factory function
function createService<T extends ServiceConfig['type']>(
  type: T,
  config: Omit<ConfigForType<T>, 'type'>
): void {
  // ...
}

createService('database', { name: 'main', connectionString: 'pg://...', poolSize: 10 });
createService('cache', { name: 'redis', ttl: 300, maxItems: 1000 });
```

---

**Q4: What is the output of this decorator execution, and what types does TypeScript infer?**

```typescript
function First() {
  console.log('First factory');
  return function (target: any, key: string, desc: PropertyDescriptor) {
    console.log('First decorator');
  };
}

function Second() {
  console.log('Second factory');
  return function (target: any, key: string, desc: PropertyDescriptor) {
    console.log('Second decorator');
  };
}

class Example {
  @First()
  @Second()
  method() {}
}
```

**Answer**:
```
First factory
Second factory
Second decorator
First decorator
```

Factories are evaluated **top-to-bottom** (First, then Second). Decorators are applied **bottom-to-top** (Second, then First). This is like function composition: `First(Second(method))`.

---

**Q5: How would you type Angular's `FormBuilder.group()` to automatically infer control types?**

**Answer**:

```typescript
type FormGroupConfig<T> = {
  [K in keyof T]: T[K] extends Array<any>
    ? [T[K][0], ...any[]]  // FormControl with initial value and validators
    : T[K] extends object
      ? FormGroupConfig<T[K]>  // Nested FormGroup
      : [T[K], ...any[]];     // FormControl with initial value
};

interface TypedFormBuilder {
  group<T extends Record<string, any>>(
    controls: FormGroupConfig<T>
  ): FormGroup<{ [K in keyof T]: FormControl<T[K]> }>;
}

// Usage:
interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

const fb: TypedFormBuilder = inject(FormBuilder) as any;
const form = fb.group<LoginForm>({
  email: ['', Validators.required],
  password: ['', Validators.minLength(8)],
  remember: [false],
});
// form.controls.email is FormControl<string>
```

---

**Q6: Explain why this code compiles but fails at runtime. Which TypeScript concepts are involved?**

```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

const animals: Animal[] = [];
const dogs: Dog[] = [{ name: 'Rex', breed: 'German Shepherd' }];

const animalRef: Animal[] = dogs; // No error! Covariance.
animalRef.push({ name: 'Cat' }); // No error at compile time!
// But now dogs[1] is { name: 'Cat' } -- a Dog array has a non-Dog!
console.log(dogs[1].breed); // undefined at runtime, no compile error
```

**Answer**: This demonstrates **unsound covariance of arrays** in TypeScript. TypeScript allows `Dog[]` to be assigned to `Animal[]` because arrays are treated as covariant (Dog extends Animal, so Dog[] extends Animal[]). This is known to be unsound — it allows writing non-Dog values into what is actually a Dog array. TypeScript makes this tradeoff for pragmatism. In a perfectly sound system, arrays would be **invariant** (neither covariant nor contravariant). This relates to generics (array is `Array<T>`), type guards (the missing breed does not trigger an error), and the structural type system. The `readonly` modifier on arrays prevents this: `readonly Dog[]` cannot be mutated via an `Animal[]` reference.

---

**Q7: Build a type that extracts all method names from a class (excluding properties).**

**Answer**:

```typescript
type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

class UserService {
  name: string = '';
  age: number = 0;
  getName(): string { return this.name; }
  setName(name: string): void { this.name = name; }
  getAge(): number { return this.age; }
}

type Methods = MethodNames<UserService>;
// "getName" | "setName" | "getAge"
```

This combines mapped types, conditional types, and indexed access types.

---

**Q8: Why does this `Omit` not distribute over a union, and how do you fix it?**

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };

type WithoutKind = Omit<Shape, 'kind'>;
// Expected: { radius: number } | { side: number }
// Actual: {} -- only common properties remain after union collapse
```

**Answer**: `Omit` operates on the union **as a whole**. `keyof Shape` is `"kind"` (the only common key). After removing `kind`, the result is `Pick<Shape, never>` which is `{}`.

Fix with distributive conditional type:

```typescript
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

type Fixed = DistributiveOmit<Shape, 'kind'>;
// { radius: number } | { side: number }
```

The `T extends any` triggers distribution: the Omit is applied to each union member individually.

---

**Q9: How does `moduleResolution` affect which types are available from a library, and how can this cause build failures when switching Angular versions?**

**Answer**: Different module resolution strategies read different fields from `package.json`:
- `"node"` reads `"types"` or `"typings"` field
- `"bundler"` reads `"exports"` → `"types"` condition, falling back to `"types"` field
- `"node16"` reads `"exports"` with strict ESM/CJS conditions

When Angular upgraded default `moduleResolution` from `"node"` to `"bundler"` (Angular 17), libraries that only declared types via the root `"types"` field but had misconfigured `"exports"` would break. The fix is ensuring the library's `package.json` exports include proper `"types"` conditions.

This also affects `@types` packages: with `"bundler"` resolution, the `"exports"` field can prevent TypeScript from finding declaration files that were previously resolved through index-file fallbacks.

---

**Q10: Implement a fully type-safe `pipe()` function that composes functions, where the output type of each function feeds into the input type of the next.**

**Answer**:

```typescript
// Overloaded for up to N functions:
function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
function pipe<A, B, C, D>(
  fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D
): (a: A) => D;
function pipe<A, B, C, D, E>(
  fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D, fn4: (d: D) => E
): (a: A) => E;
function pipe(...fns: Function[]) {
  return (input: any) => fns.reduce((acc, fn) => fn(acc), input);
}

// Usage:
const transform = pipe(
  (x: string) => x.length,        // string -> number
  (x: number) => x > 5,            // number -> boolean
  (x: boolean) => x ? 'yes' : 'no' // boolean -> string
);

const result = transform('Hello World'); // "yes" -- fully typed as string
```

This demonstrates generics, type inference, overloads, and function composition. RxJS's `pipe()` uses a similar approach with up to 9 overloads.

---

## 8. Real-World Scenario Questions

### Scenario 1: Typing a Generic Form Builder

**Question**: Design a type system for a form builder that maps an interface to form controls with validation.

```typescript
// Define the mapping
type FormControlType<T> =
  T extends string ? FormControl<string> :
  T extends number ? FormControl<number> :
  T extends boolean ? FormControl<boolean> :
  T extends Date ? FormControl<Date> :
  T extends Array<infer U> ? FormArray<FormControlType<U>> :
  T extends object ? FormGroup<FormGroupType<T>> :
  FormControl<T>;

type FormGroupType<T> = {
  [K in keyof T]: FormControlType<T[K]>;
};

// Usage
interface UserProfile {
  name: string;
  age: number;
  isActive: boolean;
  addresses: Array<{
    street: string;
    city: string;
    zip: string;
  }>;
  preferences: {
    theme: string;
    notifications: boolean;
  };
}

type UserForm = FormGroupType<UserProfile>;
// Fully recursive: addresses becomes FormArray<FormGroup<...>>
```

### Scenario 2: Typing a Plugin System

**Question**: How would you type a plugin architecture where plugins can register hooks with specific payloads?

```typescript
interface PluginHooks {
  'before:request': { url: string; method: string };
  'after:request': { url: string; status: number; data: unknown };
  'error': { message: string; stack?: string };
}

interface Plugin<T extends Partial<PluginHooks> = PluginHooks> {
  name: string;
  hooks: {
    [K in keyof T]?: (payload: T[K]) => T[K] | void;
  };
}

class PluginManager {
  private plugins: Plugin[] = [];

  register(plugin: Plugin): void {
    this.plugins.push(plugin);
  }

  async trigger<K extends keyof PluginHooks>(
    hook: K,
    payload: PluginHooks[K]
  ): Promise<PluginHooks[K]> {
    let result = payload;
    for (const plugin of this.plugins) {
      const handler = plugin.hooks[hook];
      if (handler) {
        const modified = handler(result as any);
        if (modified) result = modified as PluginHooks[K];
      }
    }
    return result;
  }
}
```

### Scenario 3: Typing an API Client with Path Parameters

**Question**: How would you create a type-safe API client that extracts path parameters from URL templates?

```typescript
// Extract path params from a URL pattern
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractParams<'/users/:userId/posts/:postId'>;
// "userId" | "postId"

// Build the params object type
type ParamsObject<T extends string> = {
  [K in ExtractParams<T>]: string;
};

// Type-safe API client
class ApiClient {
  get<T extends string>(
    path: T,
    params: ExtractParams<T> extends never ? void : ParamsObject<T>
  ): Promise<unknown> {
    let url: string = path;
    if (params) {
      Object.entries(params as Record<string, string>).forEach(([key, value]) => {
        url = url.replace(`:${key}`, value);
      });
    }
    return fetch(url).then(r => r.json());
  }
}

const client = new ApiClient();
client.get('/users/:userId/posts/:postId', { userId: '1', postId: '42' }); // OK
client.get('/users/:userId/posts/:postId', { userId: '1' }); // ERROR: missing postId
client.get('/health', void 0); // OK: no params needed
```

---

## 9. Common Mistakes and How to Avoid Them

### Mistake 1: Using `any` Instead of `unknown`

```typescript
// BAD
function parse(input: any) {
  return input.name.toUpperCase(); // No error, crashes at runtime
}

// GOOD
function parse(input: unknown) {
  if (typeof input === 'object' && input !== null && 'name' in input) {
    const obj = input as { name: string };
    return obj.name.toUpperCase();
  }
  throw new Error('Invalid input');
}
```

### Mistake 2: Forgetting That `Partial` Makes Everything Optional

```typescript
// BAD: Accidentally made id optional
function updateUser(id: string, data: Partial<User>) { /* ... */ }
// A caller could pass {} and that's valid

// GOOD: Be explicit about what's optional
function updateUser(id: string, data: Pick<User, 'name'> & Partial<Pick<User, 'email' | 'phone'>>) {
  // name is required, email and phone are optional
}
```

### Mistake 3: Type Assertions Instead of Type Guards

```typescript
// BAD: Trusting the developer
const user = response as User; // Might not be a User at runtime

// GOOD: Verify at runtime
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' && obj !== null &&
    'id' in obj && typeof (obj as any).id === 'string' &&
    'name' in obj && typeof (obj as any).name === 'string'
  );
}

if (isUser(response)) {
  // Safely narrowed
}
```

### Mistake 4: Overcomplicating Types

```typescript
// BAD: Unreadable type gymnastics
type Result = Pick<Omit<Partial<Required<Readonly<User>>>, 'id'>, 'name' | 'email'>;

// GOOD: Named intermediate types
type EditableUser = Omit<User, 'id'>;
type UserNameAndEmail = Pick<EditableUser, 'name' | 'email'>;
```

### Mistake 5: Not Using `const` Assertions for Literal Types

```typescript
// BAD: Type widens to string
const config = { mode: 'production' }; // { mode: string }

// GOOD: Preserves literal type
const config = { mode: 'production' } as const; // { readonly mode: "production" }

// Essential for discriminated unions:
function createAction(type: 'increment' | 'decrement') { /* ... */ }
const action = { type: 'increment' }; // type: string -- fails
const action = { type: 'increment' } as const; // type: "increment" -- works
```

### Mistake 6: Ignoring Strict Mode Flags

```typescript
// Always enable these in tsconfig.json:
{
  "compilerOptions": {
    "strict": true,                    // Enables all strict checks
    "strictNullChecks": true,          // null/undefined are their own types
    "strictFunctionTypes": true,       // Contravariant function params
    "strictPropertyInitialization": true, // Class properties must be initialized
    "noUncheckedIndexedAccess": true,  // Index signatures return T | undefined
    "exactOptionalPropertyTypes": true // Distinguishes missing vs undefined
  }
}
```

### Mistake 7: Misunderstanding Structural Typing

```typescript
interface Point2D { x: number; y: number; }
interface Point3D { x: number; y: number; z: number; }

// This works because TypeScript is structural, not nominal
const p3d: Point3D = { x: 1, y: 2, z: 3 };
const p2d: Point2D = p3d; // OK! Point3D has all properties of Point2D

// But this fails (excess property check on object literals):
const p2d2: Point2D = { x: 1, y: 2, z: 3 }; // ERROR: 'z' does not exist
```

### Mistake 8: Using `enum` When Union Types Suffice

```typescript
// Unnecessary complexity
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

// Simpler, no runtime artifact, better tree-shaking
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Use const enum if you truly need enum syntax (inlined at compile time)
const enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
```

### Mistake 9: Not Leveraging Template Literal Types

```typescript
// Manual approach (error-prone)
type EventName = 'onClick' | 'onHover' | 'onFocus' | 'onBlur';

// Automated with template literals
type UIEvent = 'Click' | 'Hover' | 'Focus' | 'Blur';
type EventName = `on${UIEvent}`;
// "onClick" | "onHover" | "onFocus" | "onBlur"

// Even more powerful:
type CSSProperty = 'margin' | 'padding';
type CSSDirection = 'Top' | 'Right' | 'Bottom' | 'Left';
type CSSSpacing = `${CSSProperty}${CSSDirection}`;
// "marginTop" | "marginRight" | ... | "paddingLeft" (8 combinations)
```

### Mistake 10: Forgetting That Interfaces Merge, Types Do Not

```typescript
// Interfaces merge (declaration merging)
interface Window {
  myCustomProp: string;
}
// Now window.myCustomProp is valid globally

// Type aliases do NOT merge
type User = { name: string };
type User = { age: number }; // ERROR: Duplicate identifier 'User'

// Use this knowledge:
// - Interfaces for public APIs (extendable by consumers)
// - Type aliases for unions, intersections, and internal types
```

---

## Quick Reference: Key Takeaways

| Concept | One-Liner |
|---------|-----------|
| Union | Value is one of several types; access only shared members |
| Intersection | Value is all types simultaneously; access all members |
| Conditional Type | Type-level if/else; distributes over unions by default |
| Generics | Type parameters that preserve type info through call chains |
| Constraints | `extends` limits what types a generic accepts |
| Decorators | Functions that modify classes/members at definition time |
| Metadata | `reflect-metadata` stores type info; Angular DI reads it |
| Type Guards | Expressions that narrow types in control flow branches |
| `is` keyword | Custom predicate for narrowing in if-branches |
| `asserts` keyword | Throws or narrows for remaining scope |
| `Partial<T>` | All props optional |
| `Required<T>` | All props required |
| `Pick<T,K>` | Subset of props |
| `Omit<T,K>` | All except specified props |
| `Record<K,V>` | Object with keys K and values V |
| Module Resolution | How TS finds files for imports; "bundler" is Angular 17+ default |
| `paths` | Compile-time aliases; need runtime resolver too |

---

*Last updated: February 2026. Covers TypeScript 5.x and Angular 17+/18+.*
