# TypeScript for Angular - Interview Guide

## Table of Contents
1. [Practical Exercises](#practical-exercises)
2. [Interview Questions & Answers](#interview-questions)
3. [Coding Challenges](#coding-challenges)
4. [Real-World Scenarios](#real-world-scenarios)

---

## Practical Exercises

### Exercise 1: Advanced Type System

#### Task: Build a Type-Safe API Client
```typescript
// Step 1: Define API response types
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}

// Step 2: Create conditional types
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type RequestBody<M extends ApiMethod> = 
  M extends 'GET' | 'DELETE' ? never : 
  M extends 'POST' | 'PUT' ? Record<string, any> : 
  never;

// Step 3: Build the API client
class TypeSafeApiClient {
  async request<T, M extends ApiMethod>(
    method: M,
    endpoint: string,
    body?: RequestBody<M>
  ): Promise<ApiResponse<T>> {
    // Implementation
    const response = await fetch(endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.json();
  }
  
  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T, 'GET'>('GET', endpoint);
  }
  
  post<T>(endpoint: string, body: Record<string, any>) {
    return this.request<T, 'POST'>('POST', endpoint, body);
  }
}

// Usage
const api = new TypeSafeApiClient();

// TypeScript enforces: GET cannot have body
// api.request('GET', '/users', { name: 'John' }); // ❌ Error!
api.request('GET', '/users'); // ✅ OK

// POST requires body
api.request('POST', '/users', { name: 'John' }); // ✅ OK
// api.request('POST', '/users'); // ❌ Error!
```

**Your Task:**
1. Add `PATCH` method support
2. Create `ApiError` type with proper error handling
3. Add request/response interceptor types
4. Implement retry logic with exponential backoff types

---

### Exercise 2: Utility Types Mastery

```typescript
// Scenario: Building a form system with type safety

interface UserForm {
  username: string;
  email: string;
  age: number;
  isActive: boolean;
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// Task 1: Create DeepPartial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object 
    ? DeepPartial<T[P]> 
    : T[P];
};

// Usage
const partialUpdate: DeepPartial<UserForm> = {
  profile: {
    firstName: 'John' // Only updating firstName, not required to provide lastName
  }
};

// Task 2: Create DeepReadonly type
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

// Task 3: Create PickByType
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

// Get only string fields
type StringFields = PickByType<UserForm, string>; // { username: string; email: string }

// Task 4: Create RequiredKeys and OptionalKeys
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Task 5: Create Mutable (opposite of Readonly)
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
```

**Your Practice Tasks:**
1. Create `DeepNonNullable` type
2. Create `Paths` type that generates all possible paths in an object
3. Create `Get` type that retrieves value at a given path
4. Create `Flatten` type for nested objects

---

### Exercise 3: Advanced Generics

```typescript
// Task: Build a generic Repository pattern

interface Entity {
  id: string | number;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends Entity {
  username: string;
  email: string;
}

interface Product extends Entity {
  name: string;
  price: number;
}

// Generic Repository
class Repository<T extends Entity> {
  private items: Map<T['id'], T> = new Map();
  
  create(item: Omit<T, keyof Entity>): T {
    const entity = {
      ...item,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as T;
    
    this.items.set(entity.id, entity);
    return entity;
  }
  
  findById(id: T['id']): T | undefined {
    return this.items.get(id);
  }
  
  update(id: T['id'], updates: Partial<Omit<T, keyof Entity>>): T | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const updated = {
      ...item,
      ...updates,
      updatedAt: new Date()
    };
    
    this.items.set(id, updated);
    return updated;
  }
  
  delete(id: T['id']): boolean {
    return this.items.delete(id);
  }
  
  find(predicate: (item: T) => boolean): T[] {
    return Array.from(this.items.values()).filter(predicate);
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Usage
const userRepo = new Repository<User>();
const user = userRepo.create({
  username: 'john_doe',
  email: 'john@example.com'
});

// Type-safe updates
userRepo.update(user.id, { username: 'jane_doe' }); // ✅
// userRepo.update(user.id, { id: 'new-id' }); // ❌ Cannot update Entity fields

const productRepo = new Repository<Product>();
const product = productRepo.create({
  name: 'Laptop',
  price: 999
});
```

**Your Tasks:**
1. Add generic query builder with type safety
2. Implement pagination with generic types
3. Add sorting with typed field names
4. Create relationships (one-to-many, many-to-many) with generics

---

### Exercise 4: Template Literal Types

```typescript
// Task: Build type-safe event system

type EventMap = {
  'user:created': { userId: string; username: string };
  'user:updated': { userId: string; changes: Record<string, any> };
  'user:deleted': { userId: string };
  'product:created': { productId: string; name: string };
  'product:updated': { productId: string };
};

// Extract namespace from event name
type EventNamespace<T extends string> = T extends `${infer NS}:${string}` ? NS : never;

// Extract all events for a namespace
type EventsForNamespace<NS extends string> = {
  [K in keyof EventMap as K extends `${NS}:${string}` ? K : never]: EventMap[K];
};

// Type-safe event emitter
class TypedEventEmitter {
  private listeners = new Map<keyof EventMap, Array<(data: any) => void>>();
  
  on<E extends keyof EventMap>(
    event: E,
    callback: (data: EventMap[E]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  emit<E extends keyof EventMap>(
    event: E,
    data: EventMap[E]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
  
  // Namespace-specific subscription
  onNamespace<NS extends EventNamespace<keyof EventMap>>(
    namespace: NS,
    callback: <E extends keyof EventsForNamespace<NS>>(
      event: E,
      data: EventsForNamespace<NS>[E]
    ) => void
  ): void {
    // Implementation
  }
}

// Usage
const emitter = new TypedEventEmitter();

// Type-safe event listening
emitter.on('user:created', (data) => {
  console.log(data.userId, data.username); // ✅ TypeScript knows the shape
  // console.log(data.productId); // ❌ Error!
});

// Type-safe event emission
emitter.emit('user:created', { 
  userId: '123', 
  username: 'john' 
}); // ✅

// emitter.emit('user:created', { wrong: 'data' }); // ❌ Error!
```

**Your Tasks:**
1. Add wildcard event listeners (e.g., `user:*`)
2. Create type-safe once() method
3. Add event removal with proper typing
4. Implement event priority system

---

### Exercise 5: Conditional Types & Infer

```typescript
// Task: Build a type-safe function composition system

// Extract function return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract function parameters
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Function composition
type Compose<F1, F2> = 
  F1 extends (arg: infer A) => infer B 
    ? F2 extends (arg: B) => infer C
      ? (arg: A) => C
      : never
    : never;

// Implementation
function compose<A, B, C>(
  f1: (arg: A) => B,
  f2: (arg: B) => C
): (arg: A) => C {
  return (arg: A) => f2(f1(arg));
}

// Usage
const addOne = (x: number) => x + 1;
const toString = (x: number) => x.toString();

const addOneThenString = compose(addOne, toString);
const result = addOneThenString(5); // Type: string

// Multi-function composition
type Pipe<Fns extends Array<(arg: any) => any>> = 
  Fns extends [infer First, ...infer Rest]
    ? First extends (arg: infer A) => infer B
      ? Rest extends Array<(arg: any) => any>
        ? Rest extends []
          ? (arg: A) => B
          : Pipe<Rest> extends (arg: B) => infer C
            ? (arg: A) => C
            : never
        : never
      : never
    : never;

function pipe<Fns extends Array<(arg: any) => any>>(
  ...fns: Fns
): Pipe<Fns> {
  return ((arg: any) => 
    fns.reduce((acc, fn) => fn(acc), arg)
  ) as Pipe<Fns>;
}

// Usage
const process = pipe(
  (x: number) => x + 1,
  (x: number) => x * 2,
  (x: number) => x.toString(),
  (x: string) => `Result: ${x}`
);

const output = process(5); // Type: string, Value: "Result: 12"
```

**Your Tasks:**
1. Add async function composition
2. Create type-safe middleware system
3. Build currying with proper types
4. Implement function overloading utilities

---

## Interview Questions & Answers

### Beginner Level (Years 0-2)

**Q1: What are the basic types in TypeScript?**

**A:** TypeScript provides several basic types:

```typescript
// Primitive types
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;
let nul: null = null;
let undef: undefined = undefined;
let sym: symbol = Symbol("unique");
let big: bigint = 100n;

// Special types
let any: any = "can be anything";
let unknown: unknown = "safer than any";
let never: never; // Function that never returns
let void_: void = undefined; // Function returns nothing

// Object types
let obj: object = {};
let arr: number[] = [1, 2, 3];
let tuple: [string, number] = ["age", 30];
let enm: { name: string } = { name: "John" };
```

**Follow-up Q: Difference between `any` and `unknown`?**

**A:** 
- `any`: Opts out of type checking completely. Dangerous.
- `unknown`: Type-safe version of `any`. Must narrow type before use.

```typescript
let anyValue: any = "hello";
anyValue.toUpperCase(); // ✅ No error (but might fail at runtime)

let unknownValue: unknown = "hello";
// unknownValue.toUpperCase(); // ❌ Error
if (typeof unknownValue === 'string') {
  unknownValue.toUpperCase(); // ✅ OK after type guard
}
```

---

**Q2: Explain interfaces vs type aliases. When to use which?**

**A:** Both define object shapes, but with differences:

```typescript
// Interface
interface User {
  name: string;
  age: number;
}

// Can extend
interface Admin extends User {
  role: string;
}

// Can merge (declaration merging)
interface User {
  email: string; // Merges with above
}

// Type Alias
type Product = {
  id: string;
  price: number;
};

// Can use unions, intersections
type StringOrNumber = string | number;
type Combined = User & Product;

// Can use with primitives, tuples
type ID = string | number;
type Coordinate = [number, number];
```

**When to use:**
- **Interface**: For object shapes, public APIs, when you need declaration merging or extending
- **Type**: For unions, intersections, tuples, primitives, complex types

**Best Practice**: Use interfaces for object shapes by default, types for everything else.

---

**Q3: What are generics and why use them?**

**A:** Generics allow writing reusable, type-safe code that works with multiple types.

```typescript
// Without generics (not reusable)
function identityString(arg: string): string {
  return arg;
}
function identityNumber(arg: number): number {
  return arg;
}

// With generics (reusable)
function identity<T>(arg: T): T {
  return arg;
}

const str = identity<string>("hello"); // Type: string
const num = identity<number>(42);      // Type: number
const auto = identity("auto");         // Type inferred: string

// Real-world example: Type-safe array wrapper
class Container<T> {
  private items: T[] = [];
  
  add(item: T): void {
    this.items.push(item);
  }
  
  get(index: number): T | undefined {
    return this.items[index];
  }
  
  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }
}

const numbers = new Container<number>();
numbers.add(1);
numbers.add(2);
// numbers.add("3"); // ❌ Error: string not assignable to number
```

**Benefits:**
1. Code reusability
2. Type safety
3. Better IDE support
4. Catch errors at compile time

---

**Q4: Explain type assertions and when to use them.**

**A:** Type assertions tell TypeScript to treat a value as a specific type.

```typescript
// Two syntaxes
const value: any = "hello";
const length1 = (value as string).length;
const length2 = (<string>value).length; // Not used in JSX

// Use cases

// 1. DOM manipulation
const input = document.getElementById('username') as HTMLInputElement;
input.value = 'john'; // ✅ OK

// Without assertion
const input2 = document.getElementById('username'); // Type: HTMLElement | null
// input2.value = 'john'; // ❌ Error: Property 'value' doesn't exist

// 2. API responses
interface ApiResponse {
  data: User[];
}

const response: any = await fetch('/api/users').then(r => r.json());
const users = (response as ApiResponse).data;

// 3. Type narrowing when you know better than TypeScript
function getLength(value: string | number) {
  if (typeof value === 'string') {
    return value.length;
  }
  // TypeScript knows this is number
  return (value as number).toString().length;
}
```

**Warning:** Assertions bypass type checking. Use sparingly!

```typescript
// Dangerous
const num = "hello" as any as number;
num.toFixed(); // Runtime error!

// Better: Use type guards
function isString(value: any): value is string {
  return typeof value === 'string';
}
```

---

**Q5: What are utility types in TypeScript?**

**A:** Built-in generic types that transform other types.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

// Partial<T> - Makes all properties optional
type PartialUser = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number; }

function updateUser(id: string, updates: Partial<User>) {
  // Can pass any subset of User properties
}

// Required<T> - Makes all properties required
type RequiredUser = Required<Partial<User>>;

// Readonly<T> - Makes all properties readonly
type ReadonlyUser = Readonly<User>;
const user: ReadonlyUser = { id: '1', name: 'John', email: 'j@e.com', age: 30 };
// user.name = 'Jane'; // ❌ Error

// Pick<T, K> - Select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string; }

// Omit<T, K> - Exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;
// { id: string; name: string; age: number; }

// Record<K, T> - Create object type with specific keys
type UserRoles = Record<'admin' | 'user' | 'guest', User>;
// { admin: User; user: User; guest: User; }

// Exclude<T, U> - Remove types from union
type NoString = Exclude<string | number | boolean, string>;
// number | boolean

// Extract<T, U> - Extract types from union
type OnlyString = Extract<string | number | boolean, string>;
// string

// NonNullable<T> - Remove null and undefined
type NoNulls = NonNullable<string | number | null | undefined>;
// string | number

// ReturnType<T> - Extract function return type
function getUser() {
  return { id: '1', name: 'John' };
}
type User2 = ReturnType<typeof getUser>;
// { id: string; name: string; }

// Parameters<T> - Extract function parameters
function createUser(name: string, age: number) {}
type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number]
```

---

### Intermediate Level (Years 3-5)

**Q6: Explain mapped types and provide practical examples.**

**A:** Mapped types transform properties of existing types.

```typescript
// Basic syntax
type Mapped<T> = {
  [P in keyof T]: T[P];
};

// Practical Example 1: Make properties nullable
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

interface User {
  name: string;
  age: number;
}

type NullableUser = Nullable<User>;
// { name: string | null; age: number | null; }

// Practical Example 2: Create getters
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number; }

// Practical Example 3: Validation schema
type ValidationSchema<T> = {
  [P in keyof T]: {
    required: boolean;
    validate?: (value: T[P]) => boolean;
    message?: string;
  };
};

const userSchema: ValidationSchema<User> = {
  name: {
    required: true,
    validate: (name) => name.length > 2,
    message: 'Name must be at least 3 characters'
  },
  age: {
    required: true,
    validate: (age) => age >= 18,
    message: 'Must be 18 or older'
  }
};

// Practical Example 4: Deep transformation
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object 
    ? DeepReadonly<T[P]> 
    : T[P];
};

interface Config {
  api: {
    url: string;
    timeout: number;
  };
  features: {
    darkMode: boolean;
  };
}

type ReadonlyConfig = DeepReadonly<Config>;
const config: ReadonlyConfig = {
  api: { url: 'https://api.com', timeout: 5000 },
  features: { darkMode: true }
};
// config.api.url = 'new'; // ❌ Error: readonly
```

**Advanced mapping modifiers:**
```typescript
// Remove readonly
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Remove optional
type Concrete<T> = {
  [P in keyof T]-?: T[P];
};

// Combine modifiers
type MutableRequired<T> = {
  -readonly [P in keyof T]-?: T[P];
};
```

---

**Q7: What are conditional types? Provide complex examples.**

**A:** Conditional types select types based on conditions (like ternary operators).

```typescript
// Basic syntax
type IsString<T> = T extends string ? true : false;

type Test1 = IsString<string>; // true
type Test2 = IsString<number>; // false

// Practical Example 1: Extract array element type
type ElementType<T> = T extends Array<infer E> ? E : never;

type Num = ElementType<number[]>; // number
type Str = ElementType<string[]>; // string
type Any = ElementType<string>;   // never

// Practical Example 2: Function return type extractor
type PromiseType<T> = T extends Promise<infer R> ? R : T;

async function fetchUser() {
  return { id: '1', name: 'John' };
}

type User = PromiseType<ReturnType<typeof fetchUser>>;
// { id: string; name: string; }

// Practical Example 3: Flatten nested arrays
type Flatten<T> = T extends Array<infer U>
  ? U extends Array<any>
    ? Flatten<U>
    : U
  : T;

type Flat1 = Flatten<number[]>;        // number
type Flat2 = Flatten<number[][]>;      // number
type Flat3 = Flatten<number[][][]>;    // number

// Practical Example 4: Type-safe form field types
type FormField = {
  type: 'text' | 'number' | 'date' | 'select';
  name: string;
};

type FieldValue<F extends FormField> = 
  F['type'] extends 'text' ? string :
  F['type'] extends 'number' ? number :
  F['type'] extends 'date' ? Date :
  F['type'] extends 'select' ? string :
  never;

type TextField = { type: 'text'; name: 'username' };
type NumberField = { type: 'number'; name: 'age' };

type TextValue = FieldValue<TextField>;   // string
type NumberValue = FieldValue<NumberField>; // number

// Practical Example 5: Distributive conditional types
type ToArray<T> = T extends any ? T[] : never;

type StrOrNum = string | number;
type Result = ToArray<StrOrNum>; // string[] | number[]

// Non-distributive (using tuple)
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDist<StrOrNum>; // (string | number)[]
```

---

**Q8: Explain `infer` keyword with real-world examples.**

**A:** `infer` extracts types within conditional types.

```typescript
// Example 1: Extract function parameters
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function createUser(name: string, age: number, email: string) {
  return { name, age, email };
}

type Params = Parameters<typeof createUser>;
// [name: string, age: number, email: string]

// Example 2: Extract return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type UserType = ReturnType<typeof createUser>;
// { name: string; age: number; email: string; }

// Example 3: Extract Promise type
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

async function getData() {
  return { data: [1, 2, 3] };
}

type Data = UnwrapPromise<ReturnType<typeof getData>>;
// { data: number[]; }

// Example 4: Extract class constructor parameters
type ConstructorParameters<T> = T extends new (...args: infer P) => any ? P : never;

class User {
  constructor(public name: string, public age: number) {}
}

type UserConstructorParams = ConstructorParameters<typeof User>;
// [name: string, age: number]

// Example 5: Deep property path extraction
type PathValue<T, P extends string> = 
  P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? PathValue<T[Key], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type User = {
  profile: {
    name: string;
    address: {
      city: string;
      zip: number;
    };
  };
};

type City = PathValue<User, 'profile.address.city'>; // string
type Zip = PathValue<User, 'profile.address.zip'>;   // number

// Example 6: Extract Observable value type (RxJS)
type ObservableValue<T> = T extends Observable<infer V> ? V : never;

import { Observable } from 'rxjs';

const users$: Observable<User[]> = of([]);
type UsersArray = ObservableValue<typeof users$>; // User[]
```

---

**Q9: How do you create type-safe exhaustive checks?**

**A:** Using `never` type to ensure all cases are handled.

```typescript
// Example 1: Basic exhaustive check
type Status = 'pending' | 'approved' | 'rejected';

function handleStatus(status: Status): string {
  switch (status) {
    case 'pending':
      return 'Processing...';
    case 'approved':
      return 'Approved!';
    case 'rejected':
      return 'Rejected!';
    default:
      // Exhaustive check
      const _exhaustive: never = status;
      return _exhaustive;
  }
}

// If we add new status without handling it:
type Status2 = 'pending' | 'approved' | 'rejected' | 'cancelled';
// TypeScript will error at 'default' case

// Example 2: Discriminated unions
type Shape = 
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.size ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      const _exhaustive: never = shape;
      throw new Error(`Unknown shape: ${JSON.stringify(_exhaustive)}`);
  }
}

// Example 3: With type guard
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT':
      return state + action.payload;
    case 'DECREMENT':
      return state - action.payload;
    case 'RESET':
      return 0;
    default:
      return assertNever(action);
  }
}

// Example 4: Object-based exhaustive mapping
type EventHandlers = {
  [K in Status]: (data: any) => void;
};

const handlers: EventHandlers = {
  pending: (data) => console.log('Pending:', data),
  approved: (data) => console.log('Approved:', data),
  rejected: (data) => console.log('Rejected:', data),
  // If Status changes, TypeScript will error here
};
```

---

**Q10: Explain variance in TypeScript (covariance, contravariance).**

**A:** Variance determines how type relationships work in subtyping.

```typescript
// Covariance: Child type can be used where parent type is expected
// (used in return types)

class Animal {
  name: string;
}

class Dog extends Animal {
  bark() {}
}

// Function return types are covariant
type AnimalProducer = () => Animal;
type DogProducer = () => Dog;

const dogProducer: DogProducer = () => new Dog();
const animalProducer: AnimalProducer = dogProducer; // ✅ OK - covariant

// Contravariance: Parent type can be used where child type is expected
// (used in parameter types)

type AnimalConsumer = (animal: Animal) => void;
type DogConsumer = (dog: Dog) => void;

const animalConsumer: AnimalConsumer = (animal) => {
  console.log(animal.name);
};

const dogConsumer: DogConsumer = animalConsumer; // ✅ OK - contravariant

// Real-world example: Event handlers
interface MouseEvent {
  x: number;
  y: number;
}

interface ClickEvent extends MouseEvent {
  button: number;
}

type EventHandler<T> = (event: T) => void;

const handleMouse: EventHandler<MouseEvent> = (e) => {
  console.log(e.x, e.y);
};

// Can use general handler for specific event
const handleClick: EventHandler<ClickEvent> = handleMouse; // ✅ OK

// Array variance
const dogs: Dog[] = [new Dog()];
const animals: Animal[] = dogs; // ✅ OK - arrays are covariant (but mutable!)

// This is why TypeScript has readonly arrays
const readonlyDogs: readonly Dog[] = [new Dog()];
const readonlyAnimals: readonly Animal[] = readonlyDogs; // ✅ Safe

// Function parameter bivariance (historical TypeScript quirk)
type Comparer<T> = (a: T, b: T) => boolean;

const animalComparer: Comparer<Animal> = (a, b) => a.name === b.name;
const dogComparer: Comparer<Dog> = animalComparer; // ✅ OK in TypeScript

// With strict function types flag, this would error (proper contravariance)
```

---

### Advanced Level (Years 6-8)

**Q11: Design a type-safe state machine using TypeScript.**

**A:** Complete implementation with type safety:

```typescript
// Define states and events
type State = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

type Event =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; data: string }
  | { type: 'ERROR'; error: Error }
  | { type: 'RETRY' };

// Valid transitions
type Transitions = {
  idle: { FETCH: 'loading' };
  loading: { SUCCESS: 'success'; ERROR: 'error' };
  success: { FETCH: 'loading' };
  error: { RETRY: 'loading'; FETCH: 'loading' };
};

// Extract valid events for each state
type ValidEvents<S extends State['status']> = keyof Transitions[S];

// State machine implementation
class StateMachine<S extends State = State> {
  constructor(private state: S) {}
  
  getState(): S {
    return this.state;
  }
  
  // Type-safe transition
  send<E extends Event>(
    event: E
  ): E['type'] extends ValidEvents<S['status']> ? void : never {
    const newState = this.transition(this.state, event);
    if (newState) {
      this.state = newState as S;
    }
    return undefined as any;
  }
  
  private transition(state: State, event: Event): State | null {
    switch (state.status) {
      case 'idle':
        if (event.type === 'FETCH') {
          return { status: 'loading' };
        }
        break;
      case 'loading':
        if (event.type === 'SUCCESS') {
          return { status: 'success', data: event.data };
        }
        if (event.type === 'ERROR') {
          return { status: 'error', error: event.error };
        }
        break;
      case 'success':
        if (event.type === 'FETCH') {
          return { status: 'loading' };
        }
        break;
      case 'error':
        if (event.type === 'RETRY' || event.type === 'FETCH') {
          return { status: 'loading' };
        }
        break;
    }
    return null;
  }
}

// Usage
const machine = new StateMachine({ status: 'idle' });

machine.send({ type: 'FETCH' }); // ✅ Valid
// machine.send({ type: 'SUCCESS', data: 'test' }); // ❌ Error: not valid from idle

machine.send({ type: 'FETCH' });
machine.send({ type: 'SUCCESS', data: 'result' }); // ✅ Valid from loading
```

---

**Q12: Implement a type-safe dependency injection system.**

**A:**

```typescript
// Token system for services
const InjectionToken = Symbol;

interface Type<T> extends Function {
  new (...args: any[]): T;
}

type Token<T> = Type<T> | symbol;

// Provider types
type ClassProvider<T> = {
  provide: Token<T>;
  useClass: Type<T>;
};

type ValueProvider<T> = {
  provide: Token<T>;
  useValue: T;
};

type FactoryProvider<T> = {
  provide: Token<T>;
  useFactory: () => T;
  deps?: Token<any>[];
};

type Provider<T = any> = 
  | ClassProvider<T> 
  | ValueProvider<T> 
  | FactoryProvider<T>;

// Injector implementation
class Injector {
  private instances = new Map<Token<any>, any>();
  private providers = new Map<Token<any>, Provider>();
  
  register<T>(provider: Provider<T>): void {
    this.providers.set(provider.provide, provider);
  }
  
  get<T>(token: Token<T>): T {
    // Check if already instantiated
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }
    
    // Get provider
    const provider = this.providers.get(token);
    if (!provider) {
      throw new Error(`No provider for ${token.toString()}`);
    }
    
    // Create instance based on provider type
    let instance: T;
    
    if ('useClass' in provider) {
      instance = new provider.useClass();
    } else if ('useValue' in provider) {
      instance = provider.useValue;
    } else if ('useFactory' in provider) {
      const deps = provider.deps?.map(dep => this.get(dep)) || [];
      instance = provider.useFactory(...deps);
    } else {
      throw new Error('Invalid provider');
    }
    
    this.instances.set(token, instance);
    return instance;
  }
}

// Example services
class Logger {
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}

class ApiService {
  constructor(private logger: Logger) {}
  
  async fetchData() {
    this.logger.log('Fetching data...');
    return { data: 'result' };
  }
}

// Configuration
interface Config {
  apiUrl: string;
  timeout: number;
}

const CONFIG_TOKEN = Symbol('Config');

// Usage
const injector = new Injector();

injector.register({
  provide: Logger,
  useClass: Logger
});

injector.register({
  provide: CONFIG_TOKEN,
  useValue: { apiUrl: 'https://api.com', timeout: 5000 }
});

injector.register({
  provide: ApiService,
  useFactory: () => new ApiService(injector.get(Logger)),
  deps: [Logger]
});

const apiService = injector.get(ApiService);
apiService.fetchData();
```

---

## Coding Challenges

### Challenge 1: Type-Safe Query Builder
Build a SQL query builder with full type safety.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Expected usage:
const query = from<User>('users')
  .select('name', 'email')
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .limit(10);

// Should return: SELECT name, email FROM users WHERE age > 18 ORDER BY name ASC LIMIT 10
```

### Challenge 2: React-like Hooks with TypeScript
Implement `useState` and `useEffect` with proper typing.

### Challenge 3: EventEmitter with TypeScript
Create a fully type-safe event emitter supporting:
- Typed events
- Wildcard listeners
- Once listeners
- Event namespaces

### Challenge 4: Validation Library
Build a type-safe validation library like Zod.

**Expected solution in next files...**

---

## Real-World Scenarios

### Scenario 1: API Client Refactoring
You have a legacy API client with `any` types. Refactor it to be fully type-safe.

### Scenario 2: Migration Path
Your team is migrating from JavaScript to TypeScript. Design a gradual adoption strategy.

### Scenario 3: Performance Optimization
Type checking is slow. How would you optimize?

**Interview Tip:** Always explain your reasoning and trade-offs!
