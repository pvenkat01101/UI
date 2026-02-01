# Angular Interview Preparation Guide
## From Beginner to 10-Year Experience Level

---

## 📋 Table of Contents
1. [Week-by-Week Study Plan](#week-by-week-study-plan)
2. [Core Topics with Practicals](#core-topics-with-practicals)
3. [Interview Questions (Beginner → FAANG)](#interview-questions)
4. [Hands-On Projects](#hands-on-projects)
5. [Common Pitfalls & Pro Tips](#common-pitfalls)

---

## Week-by-Week Study Plan

### **Week 1-2: TypeScript & Angular Fundamentals**
- Day 1-3: TypeScript Deep Dive
- Day 4-7: Angular Architecture & Components
- Day 8-10: Data Binding & Directives
- Day 11-14: Services & Dependency Injection

### **Week 3-4: Advanced Components & State Management**
- Day 15-18: Component Communication
- Day 19-21: RxJS & Observables
- Day 22-25: State Management (NgRx/Signals)
- Day 26-28: Advanced RxJS Patterns

### **Week 5-6: Routing, Forms & HTTP**
- Day 29-32: Advanced Routing
- Day 33-36: Reactive Forms
- Day 37-40: HTTP Client & Interceptors
- Day 41-42: Error Handling

### **Week 7-8: Performance & Advanced Patterns**
- Day 43-46: Change Detection Strategies
- Day 47-50: Performance Optimization
- Day 51-54: Advanced Patterns (Dynamic Components, CDK)
- Day 55-56: Testing Strategies

### **Week 9-10: Architecture & System Design**
- Day 57-60: Micro-frontends & Scalable Architecture
- Day 61-63: Security Best Practices
- Day 64-66: Mock Interviews
- Day 67-70: Final Review & System Design Practice

---

## Core Topics with Practicals

### **1. TypeScript Fundamentals**

#### Practical Exercise 1: Type System Mastery
```typescript
// Task: Create a generic API service with proper typing

// Step 1: Define response types
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// Step 2: Create utility types
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// Step 3: Implement generic service
class ApiService<T> {
  async fetch(url: string): Promise<ApiResponse<T>> {
    // Implementation
  }
}

// YOUR TASK: Extend this with:
// - Conditional types for error handling
// - Mapped types for partial updates
// - Template literal types for API endpoints
```

#### Practical Exercise 2: Advanced Types
```typescript
// Task: Build a type-safe form builder

type FormField = {
  name: string;
  type: 'text' | 'number' | 'email';
  validators: Array<(value: any) => boolean>;
};

// YOUR TASK:
// 1. Create a type that extracts form values
// 2. Build type-safe validators
// 3. Implement a builder pattern with proper types
```

---

### **2. Components & Templates**

#### Practical Exercise 3: Dynamic Component Creation
```typescript
// Step-by-step: Build a notification system

// Step 1: Create notification component
@Component({
  selector: 'app-notification',
  template: `
    <div [class]="'notification notification--' + type">
      {{ message }}
      <button (click)="close.emit()">×</button>
    </div>
  `
})
export class NotificationComponent {
  @Input() message!: string;
  @Input() type: 'success' | 'error' | 'warning' = 'success';
  @Output() close = new EventEmitter<void>();
}

// Step 2: Create dynamic service
@Injectable()
export class NotificationService {
  constructor(
    private viewContainerRef: ViewContainerRef,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}

  // YOUR TASK: Implement createNotification method
  // that dynamically creates and destroys components
}
```

#### Practical Exercise 4: Smart vs Presentational Components
```typescript
// Task: Refactor a component following best practices

// BEFORE (Anti-pattern):
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngFor="let user of users">
      {{ user.name }} - {{ user.email }}
      <button (click)="deleteUser(user.id)">Delete</button>
    </div>
  `
})
export class UserListComponent {
  users: User[] = [];
  
  ngOnInit() {
    this.http.get<User[]>('/api/users').subscribe(users => {
      this.users = users;
    });
  }
  
  deleteUser(id: number) {
    this.http.delete(`/api/users/${id}`).subscribe();
  }
}

// YOUR TASK: Refactor into Smart + Presentational pattern
// - Smart component handles logic and state
// - Presentational component only displays data
// - Use proper OnPush change detection
```

---

### **3. RxJS & Observables**

#### Practical Exercise 5: Complex Observable Chains
```typescript
// Task: Build a search feature with autocomplete

// Requirements:
// - Debounce user input (300ms)
// - Cancel previous requests
// - Handle errors gracefully
// - Cache results
// - Show loading state

export class SearchComponent {
  searchControl = new FormControl('');
  results$: Observable<SearchResult[]>;
  loading$ = new BehaviorSubject<boolean>(false);

  constructor(private searchService: SearchService) {
    // YOUR TASK: Implement the complete observable chain
    this.results$ = this.searchControl.valueChanges.pipe(
      // Add operators here
    );
  }
}
```

#### Practical Exercise 6: Advanced RxJS Patterns
```typescript
// Task: Implement polling with exponential backoff

// Requirements:
// - Poll API every 5 seconds
// - On error, retry with exponential backoff
// - Stop after 3 failures
// - Allow manual refresh

class PollingService {
  private refresh$ = new Subject<void>();
  
  data$ = // YOUR IMPLEMENTATION
  
  // Hints: Use interval, retry, catchError, shareReplay
}
```

---

### **4. State Management (NgRx/Signals)**

#### Practical Exercise 7: NgRx Feature Implementation
```typescript
// Step-by-step: Build a shopping cart feature

// Step 1: Define State
export interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

// Step 2: Create Actions
export const CartActions = createActionGroup({
  source: 'Cart',
  events: {
    'Add Item': props<{ item: CartItem }>(),
    'Remove Item': props<{ itemId: string }>(),
    'Load Cart Success': props<{ items: CartItem[] }>(),
    // YOUR TASK: Add more actions
  }
});

// Step 3: Implement Reducer
export const cartReducer = createReducer(
  initialState,
  on(CartActions.addItem, (state, { item }) => ({
    // YOUR IMPLEMENTATION
  }))
  // Add more reducers
);

// Step 4: Create Effects
export class CartEffects {
  loadCart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.loadCart),
      // YOUR TASK: Complete the effect
    )
  );
}

// Step 5: Create Selectors
export const selectCartTotal = createSelector(
  selectCartItems,
  (items) => // YOUR IMPLEMENTATION
);
```

#### Practical Exercise 8: Angular Signals (v16+)
```typescript
// Task: Rebuild cart with Signals

export class CartService {
  private cartItems = signal<CartItem[]>([]);
  
  // Computed signals
  total = computed(() => {
    // YOUR IMPLEMENTATION
  });
  
  itemCount = computed(() => {
    // YOUR IMPLEMENTATION
  });
  
  // Methods
  addItem(item: CartItem) {
    // YOUR IMPLEMENTATION using update()
  }
  
  // YOUR TASK: Add more methods and effects
}
```

---

### **5. Advanced Routing**

#### Practical Exercise 9: Route Guards & Resolvers
```typescript
// Task: Implement authentication flow

// Step 1: Auth Guard
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // YOUR TASK:
    // 1. Check authentication status
    // 2. Redirect to login if not authenticated
    // 3. Store intended URL for post-login redirect
  }
}

// Step 2: Data Resolver
@Injectable()
export class UserResolver implements Resolve<User> {
  // YOUR TASK: Fetch user data before route activates
}

// Step 3: Route Configuration
const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    resolve: { user: UserResolver },
    // Add lazy loading
  }
];
```

#### Practical Exercise 10: Lazy Loading Strategy
```typescript
// Task: Implement custom preloading strategy

export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // YOUR TASK:
    // 1. Preload modules marked with data: { preload: true }
    // 2. Delay preloading for low-priority modules
    // 3. Consider network conditions
  }
}
```

---

### **6. Reactive Forms**

#### Practical Exercise 11: Dynamic Form Builder
```typescript
// Task: Build a configurable form generator

interface FieldConfig {
  type: 'input' | 'select' | 'checkbox' | 'textarea';
  name: string;
  label: string;
  validators?: ValidatorFn[];
  options?: { value: any; label: string }[];
}

@Component({
  selector: 'app-dynamic-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div *ngFor="let field of fields">
        <!-- YOUR TASK: Render different field types -->
      </div>
    </form>
  `
})
export class DynamicFormComponent {
  @Input() fields: FieldConfig[] = [];
  form!: FormGroup;
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit() {
    // YOUR TASK: Dynamically build form
  }
}
```

#### Practical Exercise 12: Custom Form Validators
```typescript
// Task: Create reusable custom validators

// Async validator for unique email
export class EmailValidator {
  static createValidator(userService: UserService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      // YOUR IMPLEMENTATION
    };
  }
}

// Cross-field validator
export function passwordMatchValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    // YOUR IMPLEMENTATION
  };
}

// YOUR TASK: Create validators for:
// - Credit card numbers
// - Phone numbers (international)
// - Date ranges
```

---

### **7. Performance Optimization**

#### Practical Exercise 13: Change Detection Optimization
```typescript
// Task: Optimize a slow component

// BEFORE (Problematic):
@Component({
  selector: 'app-user-table',
  template: `
    <table>
      <tr *ngFor="let user of users">
        <td>{{ user.name }}</td>
        <td>{{ formatDate(user.createdAt) }}</td>
        <td>{{ calculateAge(user.birthDate) }}</td>
      </tr>
    </table>
  `
})
export class UserTableComponent {
  users: User[] = [];
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }
  
  calculateAge(birthDate: Date): number {
    // Expensive calculation
  }
}

// YOUR TASK:
// 1. Convert to OnPush change detection
// 2. Use pipes instead of method calls
// 3. Implement trackBy for ngFor
// 4. Use virtual scrolling for large lists
```

#### Practical Exercise 14: Lazy Loading Images
```typescript
// Task: Create an optimized image directive

@Directive({
  selector: 'img[appLazyLoad]'
})
export class LazyLoadDirective {
  @Input() appLazyLoad!: string; // Image URL
  
  constructor(private el: ElementRef) {}
  
  // YOUR TASK:
  // 1. Use IntersectionObserver
  // 2. Show placeholder while loading
  // 3. Handle errors gracefully
  // 4. Add fade-in animation
}
```

---

### **8. Testing**

#### Practical Exercise 15: Component Testing
```typescript
// Task: Write comprehensive tests

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let userService: jasmine.SpyObj<UserService>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('UserService', ['createUser']);
    
    TestBed.configureTestingModule({
      declarations: [UserFormComponent],
      providers: [
        { provide: UserService, useValue: spy }
      ]
    });
    
    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });
  
  // YOUR TASK: Write tests for:
  // 1. Form validation
  // 2. Successful submission
  // 3. Error handling
  // 4. Async validators
  // 5. Component interaction
});
```

---

## Interview Questions

### **LEVEL 1: Junior (0-2 Years)**

#### Basic Concepts
**Q1:** What is Angular and what are its key features?
**A:** Angular is a TypeScript-based web application framework. Key features include:
- Component-based architecture
- Two-way data binding
- Dependency injection
- Directives for DOM manipulation
- Built-in routing and forms
- RxJS for reactive programming

**Q2:** Explain the difference between Component and Directive.
**A:** Components are directives with a template. Directives add behavior to elements without templates (structural or attribute directives).

**Q3:** What are the different types of data binding?
**A:** 
- Interpolation: `{{ value }}`
- Property binding: `[property]="value"`
- Event binding: `(event)="handler()"`
- Two-way binding: `[(ngModel)]="value"`

**Q4:** What is Dependency Injection?
**A:** Design pattern where dependencies are injected rather than created. Angular's DI system provides instances to components/services.

**Q5:** Explain Component Lifecycle Hooks.
**A:** Methods called at specific moments in component life:
- ngOnInit, ngOnChanges, ngOnDestroy, ngAfterViewInit, etc.

---

### **LEVEL 2: Mid-Level (3-5 Years)**

**Q6:** How does Change Detection work in Angular?
**A:** Angular checks component tree for changes. Strategies:
- Default: Check entire tree
- OnPush: Check only when inputs change or events fire
- Manual: Programmatic control with ChangeDetectorRef

**Q7:** Explain the difference between ViewChild and ContentChild.
**A:** 
- ViewChild: Query elements in component's template
- ContentChild: Query projected content (<ng-content>)

**Q8:** How would you optimize a large list rendering?
**A:** 
- Use trackBy with ngFor
- Implement virtual scrolling (CDK)
- Use OnPush change detection
- Paginate or infinite scroll
- Avoid function calls in templates

**Q9:** Explain RxJS operators: switchMap, mergeMap, concatMap.
**A:**
- switchMap: Cancel previous, switch to new observable
- mergeMap: Run all concurrently
- concatMap: Queue and run sequentially

**Q10:** How do you handle errors in HTTP requests?
**A:** Use catchError operator, retry logic, global error handling with interceptors.

---

### **LEVEL 3: Senior (6-8 Years)**

**Q11:** Design a scalable folder structure for a large Angular application.
**A:**
```
src/
├── app/
│   ├── core/              # Singleton services, guards
│   ├── shared/            # Shared components, pipes, directives
│   ├── features/          # Feature modules
│   │   ├── users/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── users.module.ts
│   ├── layout/            # Shell components
│   └── app-routing.module.ts
```

**Q12:** Explain memory leak scenarios and prevention.
**A:**
- Unsubscribed observables
- Event listeners not removed
- Detached DOM references
Prevention: takeUntil, async pipe, OnDestroy cleanup

**Q13:** How would you implement micro-frontend architecture?
**A:** 
- Module Federation (Webpack 5)
- Web Components
- Angular Elements
- iframe communication
- Shared routing and state management

**Q14:** Explain Zone.js and how Angular uses it.
**A:** Zone.js patches async APIs to trigger change detection. Angular runs in NgZone. Can run outside zone for performance.

**Q15:** Design a caching strategy for HTTP requests.
**A:**
- Interceptor-based caching
- TTL-based invalidation
- Cache on demand vs preloading
- Memory vs localStorage
- Cache key generation strategies

---

### **LEVEL 4: FAANG Level (9-10+ Years)**

**Q16:** System Design: Design a real-time collaborative text editor.
**A:** Key considerations:
- WebSocket connection management
- Operational Transform or CRDT for conflict resolution
- Cursor position synchronization
- Presence awareness
- Offline support with sync
- State management for collaborative features
- Performance with large documents
- Undo/redo with collaborative changes

**Q17:** How would you handle a table with 100,000 rows?
**A:**
- Virtual scrolling (CDK)
- Server-side pagination/filtering
- Web Workers for data processing
- IndexedDB for client-side storage
- Incremental rendering
- Request cancellation on rapid scrolling
- Memory profiling and optimization

**Q18:** Design an enterprise-grade authentication system.
**A:**
- OAuth 2.0 / OIDC implementation
- JWT token management (access + refresh)
- Token storage strategy (memory vs storage)
- Automatic token refresh
- Interceptor for auth headers
- Multi-tab synchronization
- Silent renewal with hidden iframe
- PKCE for public clients
- CSRF protection

**Q19:** Explain how you would migrate a large AngularJS app to Angular.
**A:**
- Hybrid approach with ngUpgrade
- Incremental migration strategy
- Dual router setup
- Shared services between versions
- Component by component migration
- Testing strategy during migration
- Performance monitoring
- Team training and documentation

**Q20:** How would you debug a memory leak in production?
**A:**
- Chrome DevTools memory profiling
- Heap snapshots comparison
- Allocation timeline
- Detached DOM nodes inspection
- Source maps for minified code
- Custom monitoring (Angular DevTools)
- Reproduce in production build locally
- Progressive rollout with monitoring

**Q21:** Design a plugin architecture for an Angular application.
**A:**
- Dynamic module loading
- Plugin interface/contract
- Lazy loaded plugins
- Sandboxed execution
- Plugin lifecycle management
- Event bus for communication
- Version compatibility
- Security considerations

**Q22:** How would you implement SSR with state transfer?
**A:**
- Angular Universal setup
- TransferState for data sharing
- Avoid window/document in SSR
- Different tokens for platform-specific code
- Caching strategy for server
- Hydration process optimization
- SEO meta tags management

**Q23:** Design a framework-agnostic component library.
**A:**
- Angular Elements for Web Components
- Custom element registry
- Shadow DOM encapsulation
- Framework-independent API
- Build system for multiple outputs
- Testing across frameworks
- Documentation and examples

**Q24:** Explain your approach to A/B testing in Angular.
**A:**
- Feature flag service
- User segmentation
- Lazy loaded variants
- Analytics integration
- SSR considerations
- Gradual rollout strategy
- Metrics collection and analysis

**Q25:** How would you optimize bundle size for a large app?
**A:**
- Lazy loading all routes
- Dynamic imports for heavy libraries
- Tree shaking configuration
- Remove unused dependencies
- Code splitting strategies
- Differential loading
- Compression (gzip/brotli)
- CDN for third-party libraries
- Bundle analysis tools
- Dead code elimination

---

## Hands-On Projects

### **Project 1: E-commerce Dashboard (Week 1-3)**
Build a complete admin dashboard with:
- Product management (CRUD)
- Real-time inventory updates
- Chart visualizations
- Role-based access control
- Advanced filtering and search

**Tech Stack:**
- Angular 17+ with Signals
- Angular Material
- NgRx or standalone Signals
- Chart.js

---

### **Project 2: Real-time Chat Application (Week 4-5)**
- WebSocket integration
- User presence
- Typing indicators
- Message history with pagination
- File uploads
- Push notifications

**Tech Stack:**
- Socket.io client
- RxJS for real-time streams
- Service Workers

---

### **Project 3: Code Editor Clone (Week 6-7)**
Build a simplified VS Code:
- Monaco Editor integration
- File tree navigation
- Syntax highlighting
- Multi-tab support
- Local storage persistence

**Focus:** Performance, complex state management

---

### **Project 4: Micro-frontend Architecture (Week 8-9)**
- Shell application
- 2-3 micro-apps
- Shared authentication
- Routing coordination
- Module Federation

---

## Common Pitfalls & Pro Tips

### **Anti-patterns to Avoid**

1. **Subscribing in templates**
```typescript
// BAD
{{ getData().subscribe(...) }}

// GOOD
data$ = this.service.getData();
{{ data$ | async }}
```

2. **Not unsubscribing**
```typescript
// BAD
ngOnInit() {
  this.subscription = this.obs$.subscribe();
}

// GOOD
destroy$ = new Subject<void>();

ngOnInit() {
  this.obs$.pipe(
    takeUntil(this.destroy$)
  ).subscribe();
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

3. **Mutating state directly**
```typescript
// BAD
this.user.name = 'New Name';

// GOOD (immutable)
this.user = { ...this.user, name: 'New Name' };
```

---

## Interview Day Checklist

### **Before Interview:**
- [ ] Review core concepts
- [ ] Practice whiteboarding
- [ ] Prepare questions to ask
- [ ] Test tech setup (for remote)

### **During Interview:**
- [ ] Think out loud
- [ ] Ask clarifying questions
- [ ] Discuss trade-offs
- [ ] Consider edge cases
- [ ] Mention testing

### **Common Behavioral Questions:**
- Describe your most complex Angular project
- How do you stay updated with Angular?
- Explain a performance issue you solved
- How do you handle technical debt?
- Describe your code review process

---

## Additional Resources

1. **Official Docs:** angular.io/docs
2. **RxJS Learn:** rxjs.dev/guide/overview
3. **NgRx Docs:** ngrx.io
4. **Testing:** angular.io/guide/testing
5. **Performance:** web.dev/angular

---

## Study Schedule Example

**Daily Routine (2-3 hours):**
- Morning (1 hour): Theory + Documentation
- Evening (1 hour): Hands-on coding
- Weekend (3-4 hours): Project work

**Weekly Goals:**
- Complete 2-3 practical exercises
- Build 1 mini-feature for project
- Review 10-15 interview questions
- Practice 1 system design scenario

---

## Final Tips

1. **Master the fundamentals** - Interviewers test depth
2. **Build real projects** - Portfolio matters
3. **Understand "why"** - Not just "how"
4. **Practice whiteboarding** - Explain while coding
5. **Stay current** - Know latest Angular features
6. **System design** - For senior roles
7. **Be honest** - Say "I don't know" when needed
8. **Ask questions** - Shows thinking process

Good luck with your preparation! 🚀
