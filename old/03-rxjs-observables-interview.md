# RxJS & Observables - Interview Guide

## Critical Interview Topic - Master This!

---

## Quick Reference

### Most Common Interview Questions
1. Difference between Observable, Subject, BehaviorSubject
2. switchMap vs mergeMap vs concatMap vs exhaustMap  
3. How to handle unsubscriptions
4. Cold vs Hot observables
5. Error handling in observables
6. Common RxJS operators and use cases

---

## Practical Exercises

### Exercise 1: Observable Creation Patterns

```typescript
import { Observable, Observer, of, from, interval, fromEvent } from 'rxjs';

// 1. Create Observable from scratch
const custom$ = new Observable((observer: Observer<number>) => {
  console.log('Observable started');
  
  observer.next(1);
  observer.next(2);
  observer.next(3);
  
  setTimeout(() => {
    observer.next(4);
    observer.complete();
  }, 1000);
  
  // Cleanup function
  return () => {
    console.log('Observable cleaned up');
  };
});

// Subscribe
const subscription = custom$.subscribe({
  next: (value) => console.log('Value:', value),
  error: (error) => console.error('Error:', error),
  complete: () => console.log('Complete')
});

// 2. From array
const fromArray$ = from([1, 2, 3, 4, 5]);

// 3. From promise
const fromPromise$ = from(fetch('/api/data'));

// 4. From event
const click$ = fromEvent(document, 'click');

// 5. Interval/Timer
const interval$ = interval(1000); // Emits every second
const timer$ = timer(2000, 1000); // First after 2s, then every 1s

// 6. Of (static values)
const of$ = of(1, 2, 3);
```

**Your Task:**
Create observables for:
1. WebSocket connection
2. Geolocation updates
3. File upload progress
4. Polling API every 5 seconds

---

### Exercise 2: Subject Types - Master This!

```typescript
import { Subject, BehaviorSubject, ReplaySubject, AsyncSubject } from 'rxjs';

// 1. Subject - No initial value, multicasts to subscribers
const subject = new Subject<number>();

subject.subscribe(val => console.log('Sub A:', val));
subject.next(1); // Sub A: 1

subject.subscribe(val => console.log('Sub B:', val));
subject.next(2); // Sub A: 2, Sub B: 2

// 2. BehaviorSubject - Has initial value, emits last value to new subscribers
const behavior = new BehaviorSubject<number>(0);

behavior.subscribe(val => console.log('Behavior A:', val)); // Immediately logs: 0
behavior.next(1); // Behavior A: 1

behavior.subscribe(val => console.log('Behavior B:', val)); // Immediately logs: 1
behavior.next(2); // Behavior A: 2, Behavior B: 2

// Get current value
console.log(behavior.value); // 2

// 3. ReplaySubject - Replays last N values to new subscribers
const replay = new ReplaySubject<number>(2); // Buffer size 2

replay.next(1);
replay.next(2);
replay.next(3);

replay.subscribe(val => console.log('Replay:', val)); 
// Logs: 2, 3 (last 2 values)

// 4. AsyncSubject - Only emits last value when complete
const async = new AsyncSubject<number>();

async.subscribe(val => console.log('Async:', val));

async.next(1);
async.next(2);
async.next(3);
// Nothing logged yet

async.complete();
// Now logs: 3 (only last value before complete)
```

**Real-World Example: Message Bus**
```typescript
@Injectable({ providedIn: 'root' })
export class MessageBus {
  // Use BehaviorSubject for current state
  private userState = new BehaviorSubject<User | null>(null);
  user$ = this.userState.asObservable();
  
  // Use Subject for events
  private events = new Subject<AppEvent>();
  events$ = this.events.asObservable();
  
  // Use ReplaySubject for notifications (show last 5)
  private notifications = new ReplaySubject<Notification>(5);
  notifications$ = this.notifications.asObservable();
  
  setUser(user: User): void {
    this.userState.next(user);
  }
  
  emit(event: AppEvent): void {
    this.events.next(event);
  }
  
  notify(notification: Notification): void {
    this.notifications.next(notification);
  }
}
```

---

### Exercise 3: The Four Horsemen - switchMap, mergeMap, concatMap, exhaustMap

This is THE most asked RxJS interview question!

```typescript
import { fromEvent, interval } from 'rxjs';
import { switchMap, mergeMap, concatMap, exhaustMap, take } from 'rxjs/operators';

// Scenario: Button click triggers API call
const button = document.getElementById('btn')!;
const click$ = fromEvent(button, 'click');

// 1. switchMap - CANCEL previous, use latest
// Use case: Autocomplete search, latest value wins
click$.pipe(
  switchMap(() => {
    console.log('Starting new request, cancelling previous');
    return this.http.get('/api/data');
  })
).subscribe(data => console.log(data));

// Click 1 → Request 1 starts
// Click 2 → Request 1 CANCELLED, Request 2 starts
// Click 3 → Request 2 CANCELLED, Request 3 starts

// 2. mergeMap - Run ALL concurrently
// Use case: Independent requests that all matter
click$.pipe(
  mergeMap(() => {
    console.log('Starting concurrent request');
    return this.http.get('/api/data');
  })
).subscribe(data => console.log(data));

// Click 1 → Request 1 starts
// Click 2 → Request 2 starts (Request 1 still running)
// Click 3 → Request 3 starts (Requests 1,2 still running)
// All requests complete independently

// 3. concatMap - Queue and run sequentially
// Use case: Ordered operations (save then upload)
click$.pipe(
  concatMap(() => {
    console.log('Queuing request');
    return this.http.post('/api/data', {});
  })
).subscribe(data => console.log(data));

// Click 1 → Request 1 starts
// Click 2 → Request 2 QUEUED
// Click 3 → Request 3 QUEUED
// Request 1 completes → Request 2 starts
// Request 2 completes → Request 3 starts

// 4. exhaustMap - IGNORE new while current runs
// Use case: Prevent double-submit, login button
click$.pipe(
  exhaustMap(() => {
    console.log('Processing, ignoring new clicks');
    return this.http.post('/api/submit', {});
  })
).subscribe(data => console.log(data));

// Click 1 → Request 1 starts
// Click 2 → IGNORED (Request 1 still running)
// Click 3 → IGNORED (Request 1 still running)
// Request 1 completes → Now ready for new clicks
```

**Visual Decision Tree:**
```
Need to cancel previous? 
  Yes → switchMap (autocomplete)
  No → Continue

Need specific order?
  Yes → concatMap (sequential operations)
  No → Continue

Want to ignore while busy?
  Yes → exhaustMap (prevent double-submit)
  No → mergeMap (concurrent independent requests)
```

---

### Exercise 4: Error Handling Patterns

```typescript
import { catchError, retry, retryWhen, tap, delay, scan } from 'rxjs/operators';
import { throwError, of, timer } from 'rxjs';

// 1. Basic catchError
this.http.get('/api/data').pipe(
  catchError(error => {
    console.error('Error occurred:', error);
    return of([]); // Return fallback value
  })
).subscribe(data => console.log(data));

// 2. Retry on error
this.http.get('/api/data').pipe(
  retry(3), // Retry up to 3 times
  catchError(error => {
    console.error('Failed after 3 retries');
    return throwError(() => error);
  })
).subscribe();

// 3. Retry with delay
this.http.get('/api/data').pipe(
  retryWhen(errors => 
    errors.pipe(
      delay(1000), // Wait 1 second between retries
      take(3) // Max 3 retries
    )
  )
).subscribe();

// 4. Exponential backoff retry
this.http.get('/api/data').pipe(
  retryWhen(errors =>
    errors.pipe(
      scan((retryCount, error) => {
        if (retryCount >= 3) {
          throw error;
        }
        return retryCount + 1;
      }, 0),
      tap(retryCount => console.log(`Retry attempt ${retryCount}`)),
      delay(retryCount => Math.pow(2, retryCount) * 1000) // 1s, 2s, 4s
    )
  )
).subscribe();

// 5. Global error handling service
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Log to analytics
      this.logger.error(error);
      
      // Show user-friendly message
      this.snackbar.open(`Error: ${operation} failed`);
      
      // Return safe value
      return of(result as T);
    };
  }
}

// Usage
this.http.get<User[]>('/api/users').pipe(
  catchError(this.errorHandler.handleError<User[]>('getUsers', []))
).subscribe(users => console.log(users));
```

---

### Exercise 5: Common Operators - Know These Cold!

```typescript
import { of, interval, fromEvent } from 'rxjs';
import { 
  map, filter, tap, debounceTime, distinctUntilChanged,
  shareReplay, combineLatest, withLatestFrom, startWith,
  scan, reduce, takeUntil, takeWhile, skip, take
} from 'rxjs/operators';

// 1. map - Transform values
of(1, 2, 3).pipe(
  map(x => x * 2)
).subscribe(console.log); // 2, 4, 6

// 2. filter - Filter values
of(1, 2, 3, 4, 5).pipe(
  filter(x => x % 2 === 0)
).subscribe(console.log); // 2, 4

// 3. tap - Side effects (debugging)
of(1, 2, 3).pipe(
  tap(x => console.log('Before:', x)),
  map(x => x * 2),
  tap(x => console.log('After:', x))
).subscribe();

// 4. debounceTime - Wait for pause
const search$ = fromEvent(input, 'input').pipe(
  debounceTime(300), // Wait 300ms after last keystroke
  map(event => (event.target as HTMLInputElement).value)
);

// 5. distinctUntilChanged - Only emit when value changes
search$.pipe(
  distinctUntilChanged() // Skip if same as previous
).subscribe(console.log);

// 6. shareReplay - Cache and share result
const data$ = this.http.get('/api/data').pipe(
  shareReplay(1) // Cache last value, share among all subscribers
);

// Multiple subscriptions use same HTTP request
data$.subscribe(console.log);
data$.subscribe(console.log); // Doesn't trigger new request

// 7. combineLatest - Combine multiple sources
combineLatest([
  this.form.get('firstName').valueChanges,
  this.form.get('lastName').valueChanges
]).pipe(
  map(([first, last]) => `${first} ${last}`)
).subscribe(fullName => console.log(fullName));

// 8. withLatestFrom - Combine with latest from other source
click$.pipe(
  withLatestFrom(this.currentUser$),
  map(([event, user]) => ({ event, user }))
).subscribe();

// 9. startWith - Emit initial value
this.form.valueChanges.pipe(
  startWith(this.form.value) // Emit current value immediately
).subscribe(console.log);

// 10. scan - Accumulator (like reduce but emits each step)
click$.pipe(
  scan((count, event) => count + 1, 0)
).subscribe(count => console.log('Click count:', count));

// 11. takeUntil - Unsubscribe pattern
private destroy$ = new Subject<void>();

ngOnInit() {
  interval(1000).pipe(
    takeUntil(this.destroy$)
  ).subscribe(console.log);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// 12. take / skip
interval(1000).pipe(
  skip(3), // Skip first 3 emissions
  take(5)  // Take next 5 emissions
).subscribe(console.log); // 3, 4, 5, 6, 7
```

---

## Interview Questions & Answers

### Beginner Level

**Q1: What is an Observable? How is it different from a Promise?**

**A:**

Observable:
- Lazy (doesn't execute until subscribed)
- Can emit multiple values over time
- Cancellable (via unsubscribe)
- Rich operators (map, filter, etc.)
- Can be both sync and async

Promise:
- Eager (executes immediately)
- Emits single value
- Not cancellable
- Limited operators (then, catch)
- Always async

```typescript
// Promise - Eager
const promise = new Promise((resolve) => {
  console.log('Promise started'); // Logs immediately
  resolve('value');
});

// Observable - Lazy
const observable = new Observable((observer) => {
  console.log('Observable started'); // Only logs when subscribed
  observer.next('value');
});

observable.subscribe(); // Now it logs
```

**Q2: What is the difference between Hot and Cold observables?**

**A:**

**Cold Observable:**
- Starts producing values when subscribed
- Each subscriber gets independent execution
- Example: HTTP requests, created observables

```typescript
// Cold - Each subscriber triggers new HTTP request
const cold$ = this.http.get('/api/data');

cold$.subscribe(); // Request 1
cold$.subscribe(); // Request 2 (separate request!)
```

**Hot Observable:**
- Produces values regardless of subscribers
- Subscribers share the same execution
- Example: Subjects, DOM events, WebSocket

```typescript
// Hot - Shared execution
const subject = new Subject();

subject.subscribe(console.log);
subject.next(1); // Logged

subject.subscribe(console.log);
subject.next(2); // Logged by both subscribers

// Make cold observable hot
const hot$ = cold$.pipe(shareReplay(1)); // Now shared!
```

**Q3: How do you unsubscribe from observables?**

**A:**

```typescript
// Method 1: Manual unsubscribe
export class Component implements OnDestroy {
  subscription!: Subscription;
  
  ngOnInit() {
    this.subscription = this.data$.subscribe(console.log);
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

// Method 2: takeUntil pattern (preferred)
export class Component implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(console.log);
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// Method 3: async pipe (automatic)
@Component({
  template: '{{ data$ | async }}'
})
export class Component {
  data$ = this.service.getData(); // No manual unsubscribe needed!
}

// Method 4: take operator
this.data$.pipe(
  take(1) // Automatically unsubscribes after 1 emission
).subscribe(console.log);
```

---

### Intermediate Level

**Q4: Explain the difference between switchMap, mergeMap, concatMap, and exhaustMap.**

**A:** (See Exercise 3 above for detailed examples)

**Quick Reference:**
- **switchMap**: Cancel previous, use latest (autocomplete)
- **mergeMap**: All concurrent (independent requests)
- **concatMap**: Sequential queue (ordered operations)
- **exhaustMap**: Ignore new until complete (prevent double-click)

**Q5: How do you handle errors in RxJS?**

**A:**

```typescript
// 1. catchError - Handle and recover
this.http.get('/api/data').pipe(
  catchError(error => {
    if (error.status === 404) {
      return of([]); // Return empty array
    }
    return throwError(() => error); // Re-throw
  })
).subscribe();

// 2. retry - Automatic retry
this.http.get('/api/data').pipe(
  retry(3) // Retry up to 3 times
).subscribe();

// 3. retryWhen - Custom retry logic
this.http.get('/api/data').pipe(
  retryWhen(errors => errors.pipe(
    delay(1000),
    take(3)
  ))
).subscribe();

// 4. Error at operator level
this.http.get('/api/data').pipe(
  map(data => data.results),
  catchError(error => {
    console.error('Map error:', error);
    return of([]);
  })
).subscribe();
```

**Q6: What is shareReplay and when would you use it?**

**A:**

```typescript
// Problem: Multiple subscriptions = multiple HTTP requests
const data$ = this.http.get('/api/data');

data$.subscribe(console.log); // HTTP Request 1
data$.subscribe(console.log); // HTTP Request 2 ❌

// Solution: shareReplay
const shared$ = this.http.get('/api/data').pipe(
  shareReplay(1) // Cache last 1 value
);

shared$.subscribe(console.log); // HTTP Request 1
shared$.subscribe(console.log); // Uses cached value ✅

// Use cases:
// - Expensive HTTP requests
// - Configuration data
// - User authentication state
// - Master data (countries, categories)
```

**Q7: How do you combine multiple observables?**

**A:**

```typescript
// 1. combineLatest - Wait for all, emit on any change
combineLatest([
  this.firstName$,
  this.lastName$,
  this.email$
]).pipe(
  map(([first, last, email]) => ({ first, last, email }))
).subscribe(console.log);

// 2. forkJoin - Wait for all to complete (like Promise.all)
forkJoin({
  users: this.http.get('/api/users'),
  products: this.http.get('/api/products'),
  orders: this.http.get('/api/orders')
}).subscribe(({ users, products, orders }) => {
  console.log('All loaded');
});

// 3. withLatestFrom - Combine with latest from other
click$.pipe(
  withLatestFrom(this.currentUser$),
  map(([click, user]) => ({ click, user }))
).subscribe();

// 4. merge - Merge emissions from multiple
merge(
  save$.pipe(map(() => 'Saving...')),
  load$.pipe(map(() => 'Loading...')),
  delete$.pipe(map(() => 'Deleting...'))
).subscribe(status => console.log(status));

// 5. zip - Combine corresponding emissions
zip(
  interval(1000), // 0, 1, 2...
  of('a', 'b', 'c') // a, b, c
).subscribe(console.log); // [0, 'a'], [1, 'b'], [2, 'c']
```

---

### Advanced Level

**Q8: Implement a search with debounce, distinctUntilChanged, and switchMap.**

**A:**

```typescript
@Component({
  selector: 'app-search',
  template: `
    <input [formControl]="searchControl" placeholder="Search...">
    <div *ngIf="loading">Loading...</div>
    <div *ngFor="let result of results$ | async">
      {{ result.name }}
    </div>
  `
})
export class SearchComponent implements OnInit {
  searchControl = new FormControl('');
  results$!: Observable<SearchResult[]>;
  loading = false;
  
  constructor(private searchService: SearchService) {}
  
  ngOnInit() {
    this.results$ = this.searchControl.valueChanges.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only if value changed
      tap(() => this.loading = true),
      switchMap(query => {
        if (!query || query.length < 3) {
          return of([]);
        }
        return this.searchService.search(query).pipe(
          catchError(error => {
            console.error('Search error:', error);
            return of([]);
          })
        );
      }),
      tap(() => this.loading = false)
    );
  }
}
```

**Q9: Create a polling mechanism that can be started/stopped.**

**A:**

```typescript
@Injectable({ providedIn: 'root' })
export class PollingService {
  private start$ = new Subject<void>();
  private stop$ = new Subject<void>();
  
  poll<T>(
    request: () => Observable<T>,
    interval: number = 5000
  ): Observable<T> {
    return this.start$.pipe(
      switchMap(() =>
        timer(0, interval).pipe(
          switchMap(() => request()),
          retry({
            delay: interval,
            count: 3
          }),
          takeUntil(this.stop$)
        )
      )
    );
  }
  
  start(): void {
    this.start$.next();
  }
  
  stop(): void {
    this.stop$.next();
  }
}

// Usage
export class DashboardComponent {
  data$ = this.polling.poll(
    () => this.http.get('/api/stats'),
    5000 // Poll every 5 seconds
  );
  
  constructor(private polling: PollingService) {}
  
  ngOnInit() {
    this.polling.start();
  }
  
  ngOnDestroy() {
    this.polling.stop();
  }
}
```

**Q10: Implement a caching service with expiration.**

**A:**

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  get<T>(
    key: string,
    request: () => Observable<T>,
    ttl: number = this.DEFAULT_TTL
  ): Observable<T> {
    const cached = this.cache.get(key);
    
    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < ttl) {
      return of(cached.data as T);
    }
    
    // Fetch new data
    return request().pipe(
      tap(data => {
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });
      }),
      shareReplay(1) // Share result among concurrent requests
    );
  }
  
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Usage
export class UserService {
  constructor(
    private http: HttpClient,
    private cache: CacheService
  ) {}
  
  getUser(id: string): Observable<User> {
    return this.cache.get(
      `user-${id}`,
      () => this.http.get<User>(`/api/users/${id}`),
      5 * 60 * 1000 // Cache for 5 minutes
    );
  }
}
```

---

## Common Mistakes to Avoid

```typescript
// ❌ 1. Not unsubscribing
ngOnInit() {
  this.data$.subscribe(); // Memory leak!
}

// ✅ Fix
private destroy$ = new Subject<void>();
ngOnInit() {
  this.data$.pipe(takeUntil(this.destroy$)).subscribe();
}
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// ❌ 2. Nested subscribes
this.service.getUser().subscribe(user => {
  this.service.getOrders(user.id).subscribe(orders => {
    // Callback hell!
  });
});

// ✅ Fix with switchMap
this.service.getUser().pipe(
  switchMap(user => this.service.getOrders(user.id))
).subscribe(orders => console.log(orders));

// ❌ 3. Not handling errors
this.http.get('/api/data').subscribe(); // Error breaks stream!

// ✅ Fix
this.http.get('/api/data').pipe(
  catchError(error => of([]))
).subscribe();

// ❌ 4. Multiple subscriptions to same observable
const data$ = this.http.get('/api/data');
data$.subscribe(); // Request 1
data$.subscribe(); // Request 2

// ✅ Fix with shareReplay
const data$ = this.http.get('/api/data').pipe(shareReplay(1));

// ❌ 5. Using subject as observable
public data = new Subject(); // Exposes next()

// ✅ Fix
private dataSubject = new Subject();
public data$ = this.dataSubject.asObservable();
```

---

## Quick Interview Cheat Sheet

**When interviewer asks about operators:**

1. **Transformation**: map, pluck, scan
2. **Filtering**: filter, take, skip, debounceTime, distinctUntilChanged
3. **Combination**: combineLatest, forkJoin, merge, zip
4. **Flattening**: switchMap, mergeMap, concatMap, exhaustMap
5. **Error Handling**: catchError, retry, retryWhen
6. **Utility**: tap, delay, shareReplay
7. **Conditional**: takeUntil, takeWhile

**Always mention:**
- Unsubscription strategy (takeUntil)
- Error handling (catchError)
- Performance (shareReplay for caching)
- Type safety with generics

This is one of the most tested topics - master it!
