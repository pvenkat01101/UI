# Complete JavaScript Interview Preparation Guide
## For 10-Year Senior FAANG Role

I'll create a comprehensive preparation package covering everything you need for senior JavaScript interviews at FAANG companies.

---

## **OVERVIEW: What FAANG Expects from 10-Year JavaScript Engineers**

### Interview Components:
1. **JavaScript Fundamentals & Advanced Concepts** (40%)
2. **Data Structures & Algorithms** (25%)
3. **System Design (HLD + LLD)** (20%)
4. **Design Patterns & Architecture** (10%)
5. **Performance & Optimization** (5%)

---

# SECTION 1: JAVASCRIPT CORE CONCEPTS

## **Module 1: JavaScript Fundamentals (Deep Dive)**

### Topics to Master:

#### 1.1 Execution Context & Scope
- Global, Function, and Block Scope
- Lexical Environment
- Scope Chain
- Variable Shadowing
- Temporal Dead Zone (TDZ)

#### 1.2 Hoisting Mechanics
- Variable Hoisting (var, let, const)
- Function Hoisting
- Class Hoisting
- Import Hoisting

#### 1.3 Closures (Critical for FAANG)
- Closure Creation & Memory
- Practical Use Cases
- Module Pattern
- Private Variables
- Common Pitfalls

#### 1.4 The `this` Keyword
- `this` in Different Contexts
- Call, Apply, Bind
- Arrow Functions & `this`
- Class Methods & `this`

#### 1.5 Prototypes & Inheritance
- Prototype Chain
- `__proto__` vs `prototype`
- Prototypal Inheritance
- Constructor Functions
- Object.create()

---

### **Practical Exercises - Module 1**

#### **Exercise 1.1: Scope Chain Visualization**
```javascript
// Implement and explain the output
let globalVar = 'global';

function outer() {
  let outerVar = 'outer';
  
  function middle() {
    let middleVar = 'middle';
    
    function inner() {
      let innerVar = 'inner';
      console.log(globalVar, outerVar, middleVar, innerVar);
    }
    
    return inner;
  }
  
  return middle;
}

const result = outer()();
result();

// TASK: Draw the scope chain diagram
// TASK: Explain variable lookup process
```

#### **Exercise 1.2: Closure Memory Management**
```javascript
// Problem: Fix the memory leak
function createHeavyClosures() {
  const closures = [];
  for (let i = 0; i < 1000000; i++) {
    const heavyData = new Array(1000).fill(i);
    closures.push(() => {
      return heavyData[0];
    });
  }
  return closures;
}

// TASK 1: Identify the memory issue
// TASK 2: Implement a solution
// TASK 3: Use Chrome DevTools to verify fix
```

#### **Exercise 1.3: Advanced `this` Binding**
```javascript
// Implement a custom bind function
Function.prototype.myBind = function(context, ...args) {
  // Your implementation here
};

// Test cases
const obj = {
  name: 'Alice',
  greet: function(greeting, punctuation) {
    return `${greeting}, ${this.name}${punctuation}`;
  }
};

const boundGreet = obj.greet.myBind({ name: 'Bob' }, 'Hello');
console.log(boundGreet('!')); // Should output: "Hello, Bob!"

// TASK: Implement myBind to pass all test cases
```

#### **Exercise 1.4: Prototype Chain Implementation**
```javascript
// Create a deep inheritance chain
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function() {
  return `${this.name} is eating`;
};

// TASK 1: Create Mammal extending Animal
// TASK 2: Create Dog extending Mammal
// TASK 3: Add method override with super call
// TASK 4: Implement instanceof check manually
```

#### **Exercise 1.5: Closure-based Module Pattern**
```javascript
// Create a private counter module
const CounterModule = (function() {
  // TASK: Implement private variables and methods
  // - count (private)
  // - increment() (public)
  // - decrement() (public)
  // - getCount() (public)
  // - reset() (public)
  // - setStep(step) (public) - increment/decrement by step
})();

// Should work:
CounterModule.increment();
CounterModule.increment();
console.log(CounterModule.getCount()); // 2
console.log(CounterModule.count); // undefined (private)
```

---

### **Interview Questions - Module 1**

#### **Beginner Level:**
1. What is the difference between `var`, `let`, and `const`?
2. Explain hoisting with examples.
3. What is a closure? Provide a use case.
4. How does `this` work in arrow functions vs regular functions?
5. What is the prototype chain?

#### **Intermediate Level:**
6. Explain the Temporal Dead Zone.
7. What's the difference between `__proto__` and `prototype`?
8. How would you implement private variables before ES6 classes?
9. Explain the difference between call, apply, and bind.
10. What happens when you access a property that doesn't exist in the prototype chain?

#### **Advanced/FAANG Level:**
11. How do closures affect garbage collection? Explain with memory management.
12. Implement a polyfill for `Function.prototype.bind` that handles edge cases.
13. Explain how the scope chain is created and resolved at runtime.
14. What are the performance implications of deep prototype chains?
15. How would you debug a closure-related memory leak in production?

---

## **Module 2: Asynchronous JavaScript**

### Topics to Master:

#### 2.1 Event Loop & Task Queue
- Call Stack
- Microtask Queue
- Macrotask Queue
- Event Loop Phases
- Job Queue

#### 2.2 Callbacks
- Callback Pattern
- Callback Hell
- Error-first Callbacks
- Inversion of Control

#### 2.3 Promises
- Promise States
- Promise Chaining
- Error Handling
- Promise.all, allSettled, race, any
- Promise Implementation

#### 2.4 Async/Await
- Async Functions
- Error Handling
- Parallel Execution
- Sequential vs Parallel

#### 2.5 Advanced Async Patterns
- Generator Functions
- Async Iterators
- Event Emitters
- Observable Pattern

---

### **Practical Exercises - Module 2**

#### **Exercise 2.1: Event Loop Prediction**
```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

Promise.resolve().then(() => {
  console.log('4');
  setTimeout(() => console.log('5'), 0);
});

console.log('6');

// TASK 1: Predict the output order
// TASK 2: Explain why each logs in that order
// TASK 3: Draw the event loop diagram at each step
```

#### **Exercise 2.2: Implement Promise from Scratch**
```javascript
class MyPromise {
  constructor(executor) {
    // TASK: Implement complete Promise functionality
    // - Handle resolve/reject
    // - Implement then/catch/finally
    // - Handle chaining
    // - Handle errors properly
  }
  
  then(onFulfilled, onRejected) {
    // Your implementation
  }
  
  catch(onRejected) {
    // Your implementation
  }
  
  static all(promises) {
    // Your implementation
  }
  
  static race(promises) {
    // Your implementation
  }
}

// Test cases
const p1 = new MyPromise((resolve) => setTimeout(() => resolve('1'), 1000));
const p2 = new MyPromise((resolve) => setTimeout(() => resolve('2'), 500));

MyPromise.all([p1, p2]).then(console.log); // Should log ['1', '2']
```

#### **Exercise 2.3: Async Control Flow**
```javascript
// Implement these utilities:

// 1. asyncMap - map over array with async function
async function asyncMap(array, asyncFn) {
  // Your implementation
}

// 2. asyncFilter - filter array with async predicate
async function asyncFilter(array, asyncPredicate) {
  // Your implementation
}

// 3. asyncReduce - reduce array with async reducer
async function asyncReduce(array, asyncReducer, initialValue) {
  // Your implementation
}

// Test cases
const urls = ['url1', 'url2', 'url3'];
const results = await asyncMap(urls, async (url) => {
  const response = await fetch(url);
  return response.json();
});
```

#### **Exercise 2.4: Rate Limiter**
```javascript
// Implement a rate limiter that limits function calls
class RateLimiter {
  constructor(maxCalls, timeWindow) {
    // TASK: Implement rate limiting
    // maxCalls: maximum number of calls allowed
    // timeWindow: time window in milliseconds
  }
  
  async execute(fn) {
    // TASK: Execute fn respecting rate limits
    // Should queue requests if limit exceeded
    // Should process queue as time windows expire
  }
}

// Usage
const limiter = new RateLimiter(5, 1000); // 5 calls per second

for (let i = 0; i < 20; i++) {
  limiter.execute(() => console.log(`Call ${i}`));
}

// Should execute 5 calls immediately, then 5 per second
```

#### **Exercise 2.5: Retry Logic with Exponential Backoff**
```javascript
async function fetchWithRetry(url, options = {}) {
  const {
    retries = 3,
    backoff = 'exponential', // 'linear' or 'exponential'
    delay = 1000,
    onRetry = () => {}
  } = options;
  
  // TASK: Implement retry logic
  // - Try fetch, retry on failure
  // - Implement exponential backoff: delay * 2^attempt
  // - Implement linear backoff: delay * attempt
  // - Call onRetry callback before each retry
  // - Throw error after all retries exhausted
}

// Test
try {
  const data = await fetchWithRetry('https://api.example.com/data', {
    retries: 5,
    backoff: 'exponential',
    delay: 1000,
    onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
  });
} catch (error) {
  console.error('All retries failed:', error);
}
```

---

### **Interview Questions - Module 2**

#### **Beginner Level:**
1. What is the event loop?
2. What's the difference between microtasks and macrotasks?
3. How do Promises differ from callbacks?
4. What is async/await syntactic sugar for?
5. What happens when a Promise is rejected and not caught?

#### **Intermediate Level:**
6. Explain the order of execution for setTimeout, Promise, and sync code.
7. What's the difference between Promise.all and Promise.race?
8. How do you handle errors in async/await?
9. What is Promise.allSettled useful for?
10. How would you run promises in parallel vs sequential?

#### **Advanced/FAANG Level:**
11. Implement a Promise scheduler that runs max N promises concurrently.
12. How would you implement cancellable Promises?
13. Explain the differences between Promise.any and Promise.race with failure scenarios.
14. Design a retry mechanism with circuit breaker pattern.
15. How do you debug memory leaks caused by unresolved promises?

---

## **Module 3: ES6+ Features & Modern JavaScript**

### Topics to Master:

#### 3.1 Destructuring & Spread/Rest
- Object Destructuring
- Array Destructuring
- Nested Destructuring
- Spread Operator
- Rest Parameters

#### 3.2 Template Literals & Tagged Templates
- String Interpolation
- Multi-line Strings
- Tagged Template Functions

#### 3.3 Classes & Modules
- Class Syntax
- Inheritance
- Static Methods
- Private Fields
- ES Modules

#### 3.4 Iterators & Generators
- Iterator Protocol
- Generator Functions
- Yield & Delegation
- Async Generators

#### 3.5 Symbols, Maps, Sets, WeakMap, WeakSet
- Symbol Use Cases
- Map vs Object
- Set Operations
- Weak Collections

---

### **Practical Exercises - Module 3**

#### **Exercise 3.1: Advanced Destructuring**
```javascript
// Solve these destructuring challenges

// 1. Extract nested values
const user = {
  id: 1,
  name: 'John',
  address: {
    city: 'NYC',
    coordinates: {
      lat: 40.7128,
      lng: -74.0060
    }
  },
  hobbies: ['reading', 'coding', 'gaming']
};

// TASK: Extract city, lat, lng, and first hobby using destructuring

// 2. Function parameter destructuring
function processUser(/* destructure here */) {
  // TASK: Access name, city, and provide default age of 25
}

// 3. Swap variables without temp
let a = 1, b = 2;
// TASK: Swap using destructuring

// 4. Array destructuring with rest
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// TASK: Get first, second, and rest in separate variables
```

#### **Exercise 3.2: Custom Iterator**
```javascript
// Create a custom range iterator
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }
  
  [Symbol.iterator]() {
    // TASK: Implement iterator protocol
    // Should work with for...of loop
  }
}

// Usage
for (const num of new Range(1, 10, 2)) {
  console.log(num); // 1, 3, 5, 7, 9
}

// BONUS: Make it work with spread operator
const arr = [...new Range(0, 5)]; // [0, 1, 2, 3, 4, 5]
```

#### **Exercise 3.3: Generator-based Async Control**
```javascript
// Implement generator-based async flow
function* fetchUsers() {
  const users = yield fetch('/api/users').then(r => r.json());
  const details = yield Promise.all(
    users.map(user => fetch(`/api/users/${user.id}`).then(r => r.json()))
  );
  return details;
}

// TASK: Implement runner function
function runGenerator(generatorFn) {
  // Should handle yielded promises
  // Should pass resolved values back to generator
  // Should handle errors
}

// Usage
runGenerator(fetchUsers).then(console.log).catch(console.error);
```

#### **Exercise 3.4: WeakMap for Private Data**
```javascript
// Implement truly private data using WeakMap
const privateData = new WeakMap();

class BankAccount {
  constructor(initialBalance) {
    // TASK: Store balance privately using WeakMap
    // Public methods: deposit, withdraw, getBalance
    // Private data should not be accessible outside
  }
  
  deposit(amount) {
    // Your implementation
  }
  
  withdraw(amount) {
    // Your implementation
  }
  
  getBalance() {
    // Your implementation
  }
}

// Test
const account = new BankAccount(1000);
account.deposit(500);
console.log(account.getBalance()); // 1500
console.log(account.balance); // undefined
```

#### **Exercise 3.5: Module Pattern with ES6**
```javascript
// Create a modular application structure

// TASK 1: Create logger.js module
// - Exports log, warn, error methods
// - Each method adds timestamp
// - Private variable to store log level

// TASK 2: Create apiClient.js module
// - Uses logger module
// - Exports get, post, put, delete methods
// - Implements request/response interceptors
// - Error handling with retry

// TASK 3: Create main.js
// - Import and use both modules
// - Demonstrate module isolation
```

---

### **Interview Questions - Module 3**

#### **Beginner Level:**
1. What's the difference between `const`, `let`, and `var`?
2. Explain the spread operator with examples.
3. What are template literals?
4. How do ES6 classes differ from constructor functions?
5. What is the purpose of Symbols?

#### **Intermediate Level:**
6. How does destructuring work with default values?
7. What's the difference between Map and Object?
8. When would you use WeakMap over Map?
9. Explain generator functions and their use cases.
10. How do ES6 modules differ from CommonJS?

#### **Advanced/FAANG Level:**
11. Implement a custom iterable that works with for...of and spread.
12. How would you use generators to implement async control flow?
13. Design a memory-efficient caching system using WeakMap.
14. Explain the benefits and drawbacks of ES6 classes vs factory functions.
15. How do you handle circular dependencies in ES modules?

---

## **Module 4: Functional Programming in JavaScript**

### Topics to Master:

#### 4.1 Pure Functions & Immutability
- Pure Function Principles
- Side Effects
- Immutable Data Structures
- Immutable Updates

#### 4.2 Higher-Order Functions
- Function as Arguments
- Function as Return Values
- Common HOFs (map, filter, reduce)
- Function Composition

#### 4.3 Currying & Partial Application
- Currying Pattern
- Partial Application
- Use Cases

#### 4.4 Function Composition & Pipe
- Compose Function
- Pipe Function
- Point-free Style

#### 4.5 Functional Utilities
- Memoization
- Debounce/Throttle
- Once Function
- Recursive Patterns

---

### **Practical Exercises - Module 4**

#### **Exercise 4.1: Implement Core FP Utilities**
```javascript
// 1. Compose function (right to left)
const compose = (...fns) => {
  // TASK: Implement function composition
  // compose(f, g, h)(x) === f(g(h(x)))
};

// 2. Pipe function (left to right)
const pipe = (...fns) => {
  // TASK: Implement pipe
  // pipe(f, g, h)(x) === h(g(f(x)))
};

// 3. Curry function
const curry = (fn) => {
  // TASK: Auto-curry any function
  // const add = (a, b, c) => a + b + c;
  // const curriedAdd = curry(add);
  // curriedAdd(1)(2)(3) === 6
  // curriedAdd(1, 2)(3) === 6
};

// Test cases
const add = (a, b) => a + b;
const multiply = (a, b) => a * b;
const subtract = (a, b) => a - b;

const calculate = pipe(
  x => add(x, 5),
  x => multiply(x, 2),
  x => subtract(x, 3)
);

console.log(calculate(10)); // (10 + 5) * 2 - 3 = 27
```

#### **Exercise 4.2: Immutable Data Operations**
```javascript
// Implement immutable array operations
const ImmutableArray = {
  push: (arr, item) => {
    // TASK: Return new array with item added
  },
  
  pop: (arr) => {
    // TASK: Return [newArray, poppedItem]
  },
  
  update: (arr, index, value) => {
    // TASK: Return new array with updated value
  },
  
  remove: (arr, index) => {
    // TASK: Return new array with item removed
  },
  
  insertAt: (arr, index, item) => {
    // TASK: Return new array with item inserted
  }
};

// Implement immutable object operations
const ImmutableObject = {
  set: (obj, path, value) => {
    // TASK: Set nested value immutably
    // set({ a: { b: 1 } }, 'a.b', 2) => { a: { b: 2 } }
  },
  
  delete: (obj, path) => {
    // TASK: Delete nested key immutably
  },
  
  merge: (obj1, obj2) => {
    // TASK: Deep merge two objects immutably
  }
};
```

#### **Exercise 4.3: Memoization**
```javascript
// Implement a memoization function
function memoize(fn, options = {}) {
  const {
    maxSize = Infinity,
    keyGenerator = (...args) => JSON.stringify(args),
    ttl = null // time to live in ms
  } = options;
  
  // TASK: Implement memoization with:
  // - Custom key generation
  // - Cache size limit (LRU eviction)
  // - TTL for cached values
  // - Cache statistics (hits, misses)
}

// Test with expensive function
const fibonacci = memoize((n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}, { maxSize: 100 });

console.time('First call');
console.log(fibonacci(40));
console.timeEnd('First call');

console.time('Cached call');
console.log(fibonacci(40));
console.timeEnd('Cached call');

// BONUS: Add cache.clear(), cache.stats() methods
```

#### **Exercise 4.4: Debounce & Throttle**
```javascript
// Implement debounce
function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true, maxWait = null } = options;
  
  // TASK: Implement debounce with:
  // - Leading edge execution
  // - Trailing edge execution
  // - Maximum wait time
  // - cancel() method
}

// Implement throttle
function throttle(fn, limit, options = {}) {
  const { leading = true, trailing = true } = options;
  
  // TASK: Implement throttle with:
  // - Leading edge execution
  // - Trailing edge execution
  // - cancel() method
}

// Test cases
const debouncedSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 300);

const throttledScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100);

// Simulate rapid calls
for (let i = 0; i < 10; i++) {
  setTimeout(() => debouncedSearch(`query${i}`), i * 50);
}
```

#### **Exercise 4.5: Transducers**
```javascript
// Implement transducers for efficient data transformation
const map = (fn) => (reducer) => {
  return (acc, val) => reducer(acc, fn(val));
};

const filter = (predicate) => (reducer) => {
  return (acc, val) => predicate(val) ? reducer(acc, val) : acc;
};

const transduce = (transducer, reducer, initial, collection) => {
  // TASK: Implement transduce
  // Should compose transformations and reduce in single pass
};

// Usage - single pass through array!
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const result = transduce(
  pipe(
    filter(x => x % 2 === 0),
    map(x => x * 2)
  ),
  (acc, val) => acc + val,
  0,
  numbers
);

console.log(result); // (2 + 4 + 6 + 8 + 10) * 2 = 60
```

---

### **Interview Questions - Module 4**

#### **Beginner Level:**
1. What is a pure function?
2. What's the difference between map and forEach?
3. Explain reduce with an example.
4. What is function composition?
5. Why is immutability important?

#### **Intermediate Level:**
6. What's the difference between currying and partial application?
7. Implement your own map, filter, and reduce.
8. Explain the difference between debounce and throttle.
9. What are the benefits of memoization?
10. How do you avoid mutating arrays and objects?

#### **Advanced/FAANG Level:**
11. Implement a curry function that handles functions with any arity.
12. Design a memoization system with LRU cache and TTL.
13. Explain transducers and their performance benefits.
14. How would you implement lazy evaluation in JavaScript?
15. Design a functional reactive programming library from scratch.

---

# SECTION 2: DATA STRUCTURES & ALGORITHMS (DSA)

## **Module 5: Arrays & Strings**

### Topics to Master:
- Two Pointer Technique
- Sliding Window
- Prefix Sum
- Kadane's Algorithm
- String Manipulation
- Palindromes
- Anagrams
- Subsequence Problems

### **Must-Know Problems (Practice All):**

#### **Arrays:**
1. Two Sum (HashMap approach)
2. Three Sum
3. Container With Most Water
4. Product of Array Except Self
5. Maximum Subarray (Kadane's)
6. Merge Intervals
7. Rotate Array
8. Find Minimum in Rotated Sorted Array
9. Search in Rotated Sorted Array
10. Best Time to Buy and Sell Stock (all variants)

#### **Strings:**
11. Longest Substring Without Repeating Characters
12. Longest Palindromic Substring
13. Valid Anagram
14. Group Anagrams
15. Longest Common Prefix
16. String to Integer (atoi)
17. Implement strStr()
18. Valid Parentheses
19. Generate Parentheses
20. Word Break

### **FAANG-Level Problems:**

```javascript
// Problem 1: Sliding Window Maximum
/*
Given an array and window size k, find max in each window.
Input: nums = [1,3,-1,-3,5,3,6,7], k = 3
Output: [3,3,5,5,6,7]

Optimal: O(n) using deque
*/
function maxSlidingWindow(nums, k) {
  // TASK: Implement with deque for O(n)
}

// Problem 2: Minimum Window Substring
/*
Find smallest window in s containing all chars of t.
s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"

Optimal: O(m + n) using sliding window
*/
function minWindow(s, t) {
  // TASK: Implement optimal solution
}

// Problem 3: Trapping Rain Water
/*
Calculate water trapped between bars.
height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6

Optimal: O(n) time, O(1) space with two pointers
*/
function trap(height) {
  // TASK: Implement two-pointer solution
}

// Problem 4: Find All Anagrams in a String
/*
s = "cbaebabacd", p = "abc"
Output: [0,6]

Optimal: O(n) using sliding window
*/
function findAnagrams(s, p) {
  // TASK: Implement optimal solution
}

// Problem 5: Longest Repeating Character Replacement
/*
s = "AABABBA", k = 1
Output: 4 (replace one B to get "AAAA")

Optimal: O(n) using sliding window
*/
function characterReplacement(s, k) {
  // TASK: Implement optimal solution
}
```

---

## **Module 6: Linked Lists**

### Topics to Master:
- Singly Linked List Operations
- Doubly Linked List
- Fast & Slow Pointers
- Reverse Operations
- Cycle Detection
- Merge Operations

### **Must-Know Problems:**

```javascript
// Node definition
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Problem 1: Reverse Linked List (Iterative & Recursive)
function reverseList(head) {
  // TASK: Implement both approaches
}

// Problem 2: Detect Cycle (Floyd's Algorithm)
function hasCycle(head) {
  // TASK: Use fast/slow pointers
}

// Problem 3: Find Cycle Start
function detectCycle(head) {
  // TASK: Return node where cycle begins
}

// Problem 4: Merge Two Sorted Lists
function mergeTwoLists(l1, l2) {
  // TASK: Optimal merge
}

// Problem 5: Remove Nth Node From End
function removeNthFromEnd(head, n) {
  // TASK: One-pass solution
}

// Problem 6: Reorder List
/*
L0 → L1 → L2 → L3 → L4 → L5
becomes
L0 → L5 → L1 → L4 → L2 → L3
*/
function reorderList(head) {
  // TASK: In-place reordering
}

// Problem 7: Copy List with Random Pointer
class Node {
  constructor(val, next = null, random = null) {
    this.val = val;
    this.next = next;
    this.random = random;
  }
}

function copyRandomList(head) {
  // TASK: Deep copy with O(1) space
}

// Problem 8: Merge K Sorted Lists
function mergeKLists(lists) {
  // TASK: Optimal O(N log k) solution
}

// Problem 9: Reverse Nodes in k-Group
/*
1->2->3->4->5, k = 2
Output: 2->1->4->3->5
*/
function reverseKGroup(head, k) {
  // TASK: Reverse in groups of k
}

// Problem 10: LRU Cache Implementation
class LRUCache {
  constructor(capacity) {
    // TASK: Implement using doubly linked list + hash map
    // get(key) - O(1)
    // put(key, value) - O(1)
  }
  
  get(key) {}
  put(key, value) {}
}
```

---

## **Module 7: Trees & Binary Search Trees**

### Topics to Master:
- Tree Traversals (Inorder, Preorder, Postorder, Level Order)
- BST Properties
- Lowest Common Ancestor
- Tree Construction
- Serialization/Deserialization
- Path Problems
- Balanced Tree

### **Must-Know Problems:**

```javascript
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Problem 1: All Traversals (Recursive & Iterative)
function inorderTraversal(root) {
  // TASK: Both approaches
}

function preorderTraversal(root) {
  // TASK: Iterative with stack
}

function postorderTraversal(root) {
  // TASK: Iterative (two-stack method)
}

// Problem 2: Level Order Traversal
function levelOrder(root) {
  // TASK: BFS with queue
}

// Problem 3: Maximum Depth
function maxDepth(root) {
  // TASK: Recursive & iterative
}

// Problem 4: Validate BST
function isValidBST(root) {
  // TASK: Validate BST properties
}

// Problem 5: Lowest Common Ancestor
function lowestCommonAncestor(root, p, q) {
  // TASK: Optimal solution
}

// Problem 6: Serialize and Deserialize Binary Tree
class Codec {
  serialize(root) {
    // TASK: Convert tree to string
  }
  
  deserialize(data) {
    // TASK: Reconstruct tree from string
  }
}

// Problem 7: Binary Tree Maximum Path Sum
function maxPathSum(root) {
  // TASK: Find max path sum (can start/end anywhere)
}

// Problem 8: Construct Binary Tree from Preorder and Inorder
function buildTree(preorder, inorder) {
  // TASK: Reconstruct tree
}

// Problem 9: Vertical Order Traversal
function verticalTraversal(root) {
  // TASK: Return columns from left to right
}

// Problem 10: Binary Tree Right Side View
function rightSideView(root) {
  // TASK: Values visible from right side
}
```

---

## **Module 8: Graphs**

### Topics to Master:
- Graph Representation (Adjacency List/Matrix)
- DFS & BFS
- Topological Sort
- Shortest Path (Dijkstra, Bellman-Ford)
- Minimum Spanning Tree
- Union Find (Disjoint Set)
- Cycle Detection

### **Must-Know Problems:**

```javascript
// Problem 1: Number of Islands
function numIslands(grid) {
  // TASK: DFS/BFS to count islands
  // grid[i][j] = '1' (land) or '0' (water)
}

// Problem 2: Clone Graph
class Node {
  constructor(val, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

function cloneGraph(node) {
  // TASK: Deep copy graph
}

// Problem 3: Course Schedule (Cycle Detection)
function canFinish(numCourses, prerequisites) {
  // TASK: Detect cycle in directed graph
  // prerequisites = [[1,0],[0,1]] => false (cycle)
}

// Problem 4: Course Schedule II (Topological Sort)
function findOrder(numCourses, prerequisites) {
  // TASK: Return valid course order
}

// Problem 5: Word Ladder
/*
beginWord = "hit", endWord = "cog"
wordList = ["hot","dot","dog","lot","log","cog"]
Output: 5 (hit -> hot -> dot -> dog -> cog)
*/
function ladderLength(beginWord, endWord, wordList) {
  // TASK: BFS for shortest transformation
}

// Problem 6: Alien Dictionary
function alienOrder(words) {
  // TASK: Derive character order from sorted alien words
  // Topological sort
}

// Problem 7: Network Delay Time (Dijkstra)
function networkDelayTime(times, n, k) {
  // TASK: Shortest path from source k to all nodes
}

// Problem 8: Min Cost to Connect All Points (MST)
function minCostConnectPoints(points) {
  // TASK: Prim's or Kruskal's algorithm
}

// Problem 9: Number of Connected Components (Union Find)
function countComponents(n, edges) {
  // TASK: Use union-find
}

// Problem 10: Graph Valid Tree
function validTree(n, edges) {
  // TASK: Check if edges form valid tree
  // No cycles + all connected
}
```

---

## **Module 9: Dynamic Programming**

### Topics to Master:
- 1D DP
- 2D DP
- Knapsack Problems
- LCS/LIS
- Palindrome Problems
- State Machine DP
- Memoization vs Tabulation

### **Must-Know Problems:**

```javascript
// Problem 1: Climbing Stairs
function climbStairs(n) {
  // TASK: Ways to reach nth stair (1 or 2 steps)
}

// Problem 2: House Robber
function rob(nums) {
  // TASK: Max money without robbing adjacent houses
}

// Problem 3: Coin Change
function coinChange(coins, amount) {
  // TASK: Minimum coins to make amount
}

// Problem 4: Longest Increasing Subsequence
function lengthOfLIS(nums) {
  // TASK: O(n log n) solution using binary search
}

// Problem 5: Longest Common Subsequence
function longestCommonSubsequence(text1, text2) {
  // TASK: 2D DP solution
}

// Problem 6: Edit Distance
function minDistance(word1, word2) {
  // TASK: Min operations to convert word1 to word2
}

// Problem 7: Decode Ways
/*
"226" can be decoded as "BZ" (2 26) or "BBF" (2 2 6) or "VF" (22 6)
*/
function numDecodings(s) {
  // TASK: Count decode ways
}

// Problem 8: Unique Paths
function uniquePaths(m, n) {
  // TASK: Paths from top-left to bottom-right
}

// Problem 9: Jump Game
function canJump(nums) {
  // TASK: Can reach last index?
}

// Problem 10: Word Break
function wordBreak(s, wordDict) {
  // TASK: Can segment s using wordDict?
}

// Problem 11: Partition Equal Subset Sum
function canPartition(nums) {
  // TASK: Can partition into two equal sum subsets?
}

// Problem 12: Regular Expression Matching
function isMatch(s, p) {
  // TASK: Implement regex matching with '.' and '*'
}
```

---

## **Module 10: Heaps & Priority Queues**

### **Implementation & Problems:**

```javascript
// Implement Min Heap
class MinHeap {
  constructor() {
    this.heap = [];
  }
  
  // TASK: Implement all operations
  insert(val) {}
  extractMin() {}
  peek() {}
  heapifyUp(index) {}
  heapifyDown(index) {}
  size() {}
}

// Problem 1: Kth Largest Element
function findKthLargest(nums, k) {
  // TASK: Use min-heap of size k
}

// Problem 2: Top K Frequent Elements
function topKFrequent(nums, k) {
  // TASK: Use heap + frequency map
}

// Problem 3: Merge K Sorted Lists
function mergeKLists(lists) {
  // TASK: Use min-heap
}

// Problem 4: Find Median from Data Stream
class MedianFinder {
  constructor() {
    // TASK: Use two heaps (max-heap and min-heap)
  }
  
  addNum(num) {}
  findMedian() {}
}

// Problem 5: Task Scheduler
/*
tasks = ["A","A","A","B","B","B"], n = 2
Output: 8 (A -> B -> idle -> A -> B -> idle -> A -> B)
*/
function leastInterval(tasks, n) {
  // TASK: Use heap for greedy scheduling
}
```

---

## **Module 11: Tries & Advanced Data Structures**

### **Problems:**

```javascript
// Implement Trie
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }
  
  insert(word) {
    // TASK: Implement
  }
  
  search(word) {
    // TASK: Implement
  }
  
  startsWith(prefix) {
    // TASK: Implement
  }
}

// Problem 1: Word Search II
function findWords(board, words) {
  // TASK: Find all words in board using Trie
}

// Problem 2: Design Add and Search Words Data Structure
class WordDictionary {
  constructor() {
    // TASK: Support '.' wildcard
  }
  
  addWord(word) {}
  search(word) {}
}

// Problem 3: Implement Autocomplete
class AutocompleteSystem {
  constructor(sentences, times) {
    // TASK: Return top 3 suggestions as user types
  }
  
  input(c) {}
}
```

---

# SECTION 3: SYSTEM DESIGN

## **Module 12: Low-Level Design (LLD)**

### Topics to Master:
- SOLID Principles
- Design Patterns (23 GoF patterns)
- UML Diagrams
- Object-Oriented Design
- Code Organization

### **Design Patterns to Master:**

#### **Creational Patterns:**

```javascript
// 1. Singleton Pattern
class Singleton {
  static instance = null;
  
  constructor() {
    if (Singleton.instance) {
      return Singleton.instance;
    }
    Singleton.instance = this;
  }
  
  // TASK: Implement thread-safe singleton
}

// 2. Factory Pattern
class ShapeFactory {
  createShape(type) {
    // TASK: Return Circle, Rectangle, or Triangle based on type
  }
}

// 3. Abstract Factory Pattern
class UIFactory {
  // TASK: Create different UI component families (Windows, Mac)
}

// 4. Builder Pattern
class QueryBuilder {
  // TASK: Build SQL queries fluently
  // new QueryBuilder().select('*').from('users').where('age', '>', 18).build()
}

// 5. Prototype Pattern
class Prototype {
  // TASK: Implement deep cloning
  clone() {}
}
```

#### **Structural Patterns:**

```javascript
// 6. Adapter Pattern
class OldAPI {
  oldMethod() {
    return 'old data';
  }
}

class NewAPIAdapter {
  // TASK: Adapt OldAPI to NewAPI interface
}

// 7. Decorator Pattern
class Coffee {
  cost() {
    return 5;
  }
}

class MilkDecorator {
  constructor(coffee) {
    this.coffee = coffee;
  }
  
  cost() {
    return this.coffee.cost() + 2;
  }
}

// TASK: Add Sugar, Caramel decorators

// 8. Proxy Pattern
class ImageProxy {
  // TASK: Lazy load actual image
  constructor(filename) {}
  display() {}
}

// 9. Facade Pattern
class HomeTheaterFacade {
  // TASK: Simplify complex subsystem (DVD, Projector, Lights)
  watchMovie(movie) {}
  endMovie() {}
}

// 10. Composite Pattern
class FileSystemNode {
  // TASK: Treat files and folders uniformly
}
```

#### **Behavioral Patterns:**

```javascript
// 11. Observer Pattern (Pub/Sub)
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    // TASK: Subscribe to event
  }
  
  emit(event, ...args) {
    // TASK: Notify all listeners
  }
  
  off(event, listener) {
    // TASK: Unsubscribe
  }
}

// 12. Strategy Pattern
class PaymentStrategy {
  // TASK: Implement different payment methods (Credit, PayPal, Crypto)
}

// 13. Command Pattern
class Command {
  // TASK: Encapsulate actions with undo/redo
  execute() {}
  undo() {}
}

// 14. Iterator Pattern
class CustomIterator {
  // TASK: Implement custom iteration logic
  [Symbol.iterator]() {}
}

// 15. State Pattern
class TrafficLight {
  // TASK: Different behavior based on state (Red, Yellow, Green)
  constructor() {
    this.state = new RedState(this);
  }
  
  change() {
    this.state.change();
  }
}
```

### **LLD Interview Problems:**

#### **Problem 1: Design a Parking Lot**
```javascript
/*
Requirements:
- Multiple floors
- Different vehicle types (Car, Bike, Truck)
- Different spot sizes (Compact, Large, Handicapped)
- Entry/Exit tracking
- Payment calculation
- Availability checking

TASK: Design complete system with classes
*/

class ParkingLot {}
class Floor {}
class ParkingSpot {}
class Vehicle {}
class Ticket {}
class Payment {}
```

#### **Problem 2: Design an ATM**
```javascript
/*
Requirements:
- Check balance
- Withdraw cash
- Deposit cash
- State management
- Dispensing strategy
- Card validation

TASK: Implement with appropriate patterns
*/
```

#### **Problem 3: Design a Library Management System**
```javascript
/*
Requirements:
- Book search
- Issue/Return books
- Member management
- Late fee calculation
- Reservation system
- Notification system

TASK: Complete OOP design
*/
```

#### **Problem 4: Design an Elevator System**
```javascript
/*
Requirements:
- Multiple elevators
- Optimal elevator selection
- Request queuing
- Direction management
- Door control
- Emergency handling

TASK: Implement scheduling algorithm
*/
```

#### **Problem 5: Design a Vending Machine**
```javascript
/*
Requirements:
- Product inventory
- Payment processing
- Change dispensing
- State machine
- Error handling

TASK: Use State pattern
*/
```

---

## **Module 13: High-Level Design (HLD)**

### Topics to Master:
- Scalability Principles
- Load Balancing
- Caching Strategies
- Database Design
- Microservices
- Message Queues
- CDN
- Rate Limiting
- Sharding & Partitioning
- CAP Theorem
- Consistency Patterns

### **HLD Problems (Study Approach):**

#### **Problem 1: Design URL Shortener (like bit.ly)**
```
Requirements:
- Shorten long URLs
- Redirect to original URL
- Custom aliases
- Analytics tracking
- 100M daily requests

Key Decisions:
- How to generate short URLs? (Base62 encoding, Hash, Counter)
- Database choice? (NoSQL for scalability)
- Caching strategy? (Redis for hot URLs)
- How to handle collisions?
- Partitioning strategy?

Components:
1. API Gateway
2. Application Servers
3. Database (Cassandra/DynamoDB)
4. Cache (Redis)
5. Analytics Service
6. Load Balancer

Capacity Estimation:
- Storage: 100M * 365 * 5 years * 500 bytes = ?
- Bandwidth: ?
- Cache size: 20% of daily requests

TASK: Draw architecture diagram
TASK: Estimate capacity
TASK: Identify bottlenecks
TASK: Propose solutions
```

#### **Problem 2: Design Twitter/Social Media Feed**
```
Requirements:
- Post tweets
- Follow/Unfollow users
- Timeline generation (home feed)
- Search functionality
- 300M users, 200M DAU
- 100M tweets/day

Key Challenges:
- Fan-out service (push vs pull vs hybrid)
- Timeline generation performance
- Celebrity problem (millions of followers)
- Real-time updates
- Ranking/Recommendation

Components:
1. Tweet Service
2. Timeline Service
3. Fan-out Service
4. Search Service
5. User Graph Service
6. Notification Service

Database Design:
- Users table
- Tweets table
- Followers table
- Timeline cache

TASK: Design complete system
TASK: Explain fan-out strategies
TASK: Handle celebrity users
```

#### **Problem 3: Design YouTube/Video Streaming**
```
Requirements:
- Upload videos
- Stream videos (different qualities)
- Search videos
- Recommendations
- 1.5B users

Key Challenges:
- Video encoding/transcoding
- Storage (petabytes)
- CDN strategy
- Buffering/adaptive streaming
- Thumbnail generation

Components:
1. Upload Service
2. Transcoding Service (Video processor cluster)
3. CDN
4. Metadata DB
5. Object Storage (S3)
6. Recommendation Engine
7. Search Service

TASK: Design architecture
TASK: Explain video processing pipeline
TASK: CDN strategy
```

#### **Problem 4: Design Uber/Ride-Sharing App**
```
Requirements:
- Real-time matching
- Location tracking
- ETA calculation
- Payment processing
- Surge pricing
- 100M riders, 5M drivers

Key Challenges:
- Real-time location updates
- Efficient matching algorithm
- Geospatial indexing
- WebSocket connections
- High availability

Components:
1. Location Service
2. Matching Service
3. Routing Service (Maps)
4. Payment Service
5. Notification Service
6. WebSocket servers
7. Geospatial database

Database Design:
- QuadTree or S2 for location indexing
- Redis for real-time data

TASK: Design complete system
TASK: Explain matching algorithm
TASK: Handle peak load
```

#### **Problem 5: Design WhatsApp/Chat System**
```
Requirements:
- One-to-one chat
- Group chat
- Online/offline status
- Message delivery guarantees
- End-to-end encryption
- 2B users

Key Challenges:
- Real-time messaging
- Message ordering
- Delivery acknowledgments
- Handling offline users
- Scaling WebSocket connections

Components:
1. WebSocket servers
2. Message Queue (Kafka)
3. Chat Service
4. User Service
5. Group Service
6. Media Service
7. Notification Service

Database Design:
- Message table (partitioned by user_id)
- User status (Redis)
- Message queues for offline users

TASK: Design architecture
TASK: Explain message flow
TASK: Handle group messages
```

#### **Additional HLD Problems to Study:**
6. Design Instagram
7. Design Netflix
8. Design Google Drive/Dropbox
9. Design Rate Limiter
10. Design Web Crawler
11. Design Notification System
12. Design Autocomplete/Typeahead
13. Design Payment System
14. Design E-commerce Platform
15. Design Online Judge (LeetCode)

### **HLD Interview Framework:**

```
1. Clarify Requirements (5 min)
   - Functional requirements
   - Non-functional requirements (scale, performance, availability)
   - Out of scope

2. Back-of-envelope Estimation (5 min)
   - Users, QPS, Storage, Bandwidth

3. API Design (5 min)
   - Define key APIs
   - Request/Response formats

4. Database Schema (5 min)
   - Tables/Collections
   - Relationships
   - Indexes

5. High-Level Design (10 min)
   - Draw architecture diagram
   - Major components
   - Data flow

6. Detailed Design (15 min)
   - Deep dive into 2-3 components
   - Algorithms/Data structures
   - Optimization

7. Identify Bottlenecks & Scale (5 min)
   - Single points of failure
   - Scaling strategies
   - Monitoring

8. Wrap Up (5 min)
   - Trade-offs
   - Alternative approaches
```

---

# SECTION 4: PERFORMANCE & OPTIMIZATION

## **Module 14: Performance Optimization**

### Topics to Master:

#### 14.1 Runtime Performance
- Time Complexity Analysis
- Space Complexity
- Algorithm Optimization
- Data Structure Selection

#### 14.2 Memory Management
- Garbage Collection
- Memory Leaks
- Weak References
- Memory Profiling

#### 14.3 Browser Performance
- Critical Rendering Path
- Reflow/Repaint
- Layout Thrashing
- Composite Layers
- requestAnimationFrame

#### 14.4 Network Performance
- HTTP/2, HTTP/3
- Resource Hints (preload, prefetch)
- Code Splitting
- Lazy Loading
- Service Workers

#### 14.5 Profiling & Debugging
- Chrome DevTools Performance
- Memory Profiler
- Network Waterfall
- Lighthouse Audits

### **Practical Exercises:**

```javascript
// Exercise 1: Optimize this function
function findDuplicates(arr) {
  // Current: O(n²)
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

// TASK: Optimize to O(n)

// Exercise 2: Fix memory leak
class DataFetcher {
  constructor() {
    this.listeners = [];
  }
  
  subscribe(callback) {
    this.listeners.push(callback);
    // TASK: Add unsubscribe mechanism
  }
  
  fetch() {
    const data = /* fetch data */;
    this.listeners.forEach(cb => cb(data));
  }
}

// Exercise 3: Optimize rendering
function renderList(items) {
  const container = document.getElementById('list');
  items.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item;
    container.appendChild(div); // Causes reflow each time!
  });
}

// TASK: Optimize to reduce reflows

// Exercise 4: Debounce implementation comparison
// TASK: Compare performance of different debounce implementations
```

---

# SECTION 5: COMPREHENSIVE STUDY PLAN

## **12-Week Study Schedule for FAANG Preparation**

### **Week 1-2: JavaScript Fundamentals**
**Daily Tasks:**
- **Day 1:** Scope, Hoisting, TDZ (2 hours theory + 2 hours practice)
- **Day 2:** Closures (10 exercises)
- **Day 3:** `this` keyword (15 problems)
- **Day 4:** Prototypes (10 implementations)
- **Day 5:** Event Loop (visualization + 20 problems)
- **Day 6:** Promises (implement from scratch)
- **Day 7:** Review + Mock Interview

**Weekend Project:** Build a JavaScript runtime visualizer

### **Week 3-4: DSA - Arrays, Strings, Linked Lists**
**Daily Tasks:**
- **Day 8-10:** 5 Array problems/day (Easy to Medium)
- **Day 11-12:** 5 String problems/day
- **Day 13-14:** 5 Linked List problems/day
- **Weekend:** 10 Hard problems

**Target:** 50+ problems solved

### **Week 5-6: DSA - Trees, Graphs, DP**
**Daily Tasks:**
- **Day 15-17:** Tree problems (traversals, BST, LCA)
- **Day 18-20:** Graph problems (DFS, BFS, Topological Sort)
- **Day 21-23:** DP problems (1D, 2D, optimization)
- **Weekend:** Mixed hard problems

**Target:** 60+ problems solved

### **Week 7-8: Design Patterns & LLD**
**Daily Tasks:**
- **Day 24-26:** Study 5 patterns/day + implementation
- **Day 27-29:** Solve 1 LLD problem/day
- **Day 30:** Complete Parking Lot design
- **Weekend:** Design Library + ATM systems

### **Week 9-10: System Design (HLD)**
**Daily Tasks:**
- **Day 31:** Study URL Shortener
- **Day 32:** Design Twitter
- **Day 33:** Design YouTube
- **Day 34:** Design Uber
- **Day 35:** Design WhatsApp
- **Day 36-37:** Design 2 more systems
- **Weekend:** Mock interviews

### **Week 11: Performance & Advanced Topics**
**Daily Tasks:**
- Optimize 10 algorithms
- Study V8 internals
- Memory profiling
- Browser performance
- Network optimization

### **Week 12: Mock Interviews & Revision**
**Daily Tasks:**
- 2 DSA mock interviews/day
- 1 LLD mock interview
- 1 HLD mock interview
- Review weak areas
- Practice whiteboarding

---

## **QUICK REFERENCE CHEAT SHEETS**

### **Big O Complexity Chart**
```
O(1)       - Constant     - Hash access
O(log n)   - Logarithmic  - Binary search
O(n)       - Linear       - Array traversal
O(n log n) - Linearithmic - Merge sort
O(n²)      - Quadratic    - Nested loops
O(2^n)     - Exponential  - Fibonacci (naive)
O(n!)      - Factorial    - Permutations
```

### **Common Time Complexities:**
```javascript
// Array Methods
arr.push()         // O(1)
arr.pop()          // O(1)
arr.shift()        // O(n)
arr.unshift()      // O(n)
arr.splice()       // O(n)
arr.slice()        // O(n)
arr.indexOf()      // O(n)
arr.includes()     // O(n)
arr.sort()         // O(n log n)

// Object/Map Methods
obj[key]           // O(1)
Object.keys()      // O(n)
map.get()          // O(1)
map.set()          // O(1)
map.has()          // O(1)

// Set Methods
set.has()          // O(1)
set.add()          // O(1)
set.delete()       // O(1)
```

### **Essential Patterns Recognition:**

```javascript
// Two Pointers
function twoSum(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    sum < target ? left++ : right--;
  }
}

// Sliding Window
function maxSubarraySum(arr, k) {
  let maxSum = 0, windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];
  maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum = windowSum - arr[i - k] + arr[i];
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

// Fast & Slow Pointers
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

// Backtracking
function permute(nums) {
  const result = [];
  function backtrack(path) {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let num of nums) {
      if (path.includes(num)) continue;
      path.push(num);
      backtrack(path);
      path.pop();
    }
  }
  backtrack([]);
  return result;
}
```

---

## **Interview Questions by Difficulty**

### **BEGINNER (50 questions)**
*Focus: Syntax, basic concepts, common methods*

1-10: Variables, data types, operators, conditionals, loops
11-20: Functions, scope, hoisting, closures basics
21-30: Arrays, strings, objects manipulation
31-40: ES6 features, destructuring, spread/rest
41-50: Basic async (callbacks, promises)

### **INTERMEDIATE (60 questions)**
*Focus: Deeper understanding, practical implementation*

51-70: Advanced closures, `this` binding, prototypes
71-90: Async patterns, event loop deep dive
91-110: Functional programming, higher-order functions

### **ADVANCED (50 questions)**
*Focus: Performance, edge cases, optimization*

111-130: Memory management, optimization techniques
131-150: Design patterns implementation
151-160: System design concepts

---

## **Resources & Practice Platforms**

### **Coding Practice:**
1. **LeetCode** - 300+ problems (focus on top 150)
2. **HackerRank** - JavaScript track
3. **CodeSignal** - Interview practice
4. **Pramp** - Mock interviews

### **System Design:**
1. **Grokking the System Design Interview**
2. **System Design Primer (GitHub)**
3. **ByteByteGo**

### **Books:**
1. **"You Don't Know JS" series**
2. **"JavaScript: The Good Parts"**
3. **"Eloquent JavaScript"**
4. **"Cracking the Coding Interview"**

---

This preparation guide covers **everything** you need for a senior 10-year FAANG JavaScript role. Focus on **practical implementation** over theory, and **practice daily**. The combination of strong JavaScript fundamentals, DSA mastery, and system design knowledge will make you interview-ready.

Would you like me to:
1. Expand any specific module with more exercises?
2. Create solution guides for the practice problems?
3. Generate additional mock interview scenarios?
4. Create a detailed daily tracker spreadsheet?