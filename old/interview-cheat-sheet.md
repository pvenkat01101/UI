# Angular Interview Cheat Sheet - Quick Reference

## 🚀 Last Minute Review (Read before interview!)

---

## Core Concepts (Must Know Cold)

### 1. Component Lifecycle (In Order)
```
Constructor → ngOnChanges → ngOnInit → ngDoCheck → 
ngAfterContentInit → ngAfterContentChecked → 
ngAfterViewInit → ngAfterViewChecked → ngOnDestroy
```

**Most Common:**
- `ngOnInit()` - Initialize component, fetch data
- `ngOnChanges()` - Respond to @Input changes
- `ngOnDestroy()` - Cleanup, unsubscribe
- `ngAfterViewInit()` - Access @ViewChild elements

---

### 2. Change Detection Strategies

**Default:** Checks entire component tree on every event
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.Default
})
```

**OnPush:** Only checks when:
- @Input reference changes
- Event fires from component
- Observable emits (with async pipe)
- Manual trigger (markForCheck)

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {
  constructor(private cdr: ChangeDetectorRef) {}
  
  manualUpdate() {
    this.cdr.markForCheck(); // Manual trigger
  }
}
```

---

### 3. Dependency Injection Scopes

```typescript
// Root level (Singleton)
@Injectable({ providedIn: 'root' })
export class GlobalService {}

// Module level
@NgModule({
  providers: [FeatureService]
})

// Component level (New instance per component)
@Component({
  providers: [LocalService]
})
```

---

### 4. RxJS Operators Quick Guide

| Operator | Use Case | Example |
|----------|----------|---------|
| `switchMap` | Cancel previous, use latest | Autocomplete search |
| `mergeMap` | Run all concurrently | Multiple file uploads |
| `concatMap` | Queue sequentially | Sequential API calls |
| `exhaustMap` | Ignore new until current completes | Prevent double submit |
| `debounceTime` | Wait for pause in events | Search input |
| `distinctUntilChanged` | Only emit when value changes | Avoid duplicate requests |
| `catchError` | Handle errors | API error handling |
| `shareReplay` | Cache and share | HTTP response caching |
| `combineLatest` | Combine multiple sources | Multiple form fields |
| `forkJoin` | Wait for all to complete | Parallel API calls |

---

### 5. Common Patterns

#### Unsubscribe Pattern
```typescript
export class MyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### Async Pipe (No unsubscribe needed!)
```typescript
// Component
data$ = this.service.getData();

// Template
{{ data$ | async }}
```

#### Smart vs Presentational Components
```typescript
// Smart (Container) - Has logic, injects services
@Component({
  selector: 'app-user-container',
  template: '<app-user-list [users]="users$ | async"></app-user-list>'
})
export class UserContainerComponent {
  users$ = this.userService.getUsers();
  constructor(private userService: UserService) {}
}

// Presentational (Dumb) - Only @Input/@Output
@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  @Input() users: User[];
  @Output() userClick = new EventEmitter<User>();
}
```

---

## Performance Optimization Checklist

- ✅ Use OnPush change detection
- ✅ Lazy load all routes
- ✅ Use trackBy with ngFor
- ✅ Avoid function calls in templates
- ✅ Use pure pipes instead of methods
- ✅ Virtual scrolling for large lists
- ✅ Preload critical modules
- ✅ Tree shaking and code splitting
- ✅ Compress assets (gzip/brotli)
- ✅ Use Web Workers for heavy computation
- ✅ Avoid memory leaks (unsubscribe!)
- ✅ Use async pipe when possible

---

## NgRx Quick Reference

```typescript
// 1. Actions
export const loadUsers = createAction('[Users] Load Users');
export const loadUsersSuccess = createAction(
  '[Users] Load Users Success',
  props<{ users: User[] }>()
);

// 2. Reducer
export const userReducer = createReducer(
  initialState,
  on(loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    loading: false
  }))
);

// 3. Effects
@Injectable()
export class UserEffects {
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() => 
        this.userService.getUsers().pipe(
          map(users => loadUsersSuccess({ users })),
          catchError(error => of(loadUsersFailure({ error })))
        )
      )
    )
  );
  
  constructor(
    private actions$: Actions,
    private userService: UserService
  ) {}
}

// 4. Selectors
export const selectUsers = createSelector(
  selectUserState,
  (state: UserState) => state.users
);

// 5. Component Usage
export class UsersComponent {
  users$ = this.store.select(selectUsers);
  
  constructor(private store: Store) {
    this.store.dispatch(loadUsers());
  }
}
```

---

## Angular Signals (v16+)

```typescript
// Signal
count = signal(0);

// Computed (derived state)
doubleCount = computed(() => this.count() * 2);

// Effect (side effects)
effect(() => {
  console.log('Count changed:', this.count());
});

// Update
this.count.set(5);        // Set new value
this.count.update(n => n + 1); // Update based on current

// In template
{{ count() }}  // Note the function call!
```

---

## Forms Quick Reference

### Reactive Forms
```typescript
// FormBuilder
form = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(3)]],
  email: ['', [Validators.required, Validators.email]],
  age: [null, [Validators.min(18), Validators.max(100)]]
});

// Access controls
get name() { return this.form.get('name'); }

// Custom validator
function ageValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value < 18 ? { underage: true } : null;
  };
}

// Async validator
function emailExistsValidator(service: UserService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return service.checkEmail(control.value).pipe(
      map(exists => exists ? { emailExists: true } : null)
    );
  };
}
```

---

## Routing Quick Reference

```typescript
// Route config with guards
const routes: Routes = [
  {
    path: 'admin',
    canActivate: [AuthGuard],
    canActivateChild: [RoleGuard],
    resolve: { data: DataResolver },
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  }
];

// Guard
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    return this.authService.isAuthenticated();
  }
}

// Resolver
@Injectable()
export class DataResolver implements Resolve<Data> {
  resolve(route: ActivatedRouteSnapshot): Observable<Data> {
    return this.dataService.getData(route.params['id']);
  }
}

// Programmatic navigation
this.router.navigate(['/users', userId]);
this.router.navigate(['/users'], { queryParams: { page: 1 } });
```

---

## Testing Quick Reference

```typescript
// Component test
describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserComponent],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should display user name', () => {
    component.user = { name: 'John' };
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('.name');
    expect(element.textContent).toBe('John');
  });
});

// Service test
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch users', () => {
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
    });
    
    const req = httpMock.expectOne('/api/users');
    req.flush([{ id: 1 }, { id: 2 }]);
  });
});
```

---

## Common Interview Mistakes to Avoid

❌ Subscribing in templates
❌ Not unsubscribing from observables
❌ Using function calls in templates (performance)
❌ Mutating state directly
❌ Not using trackBy with ngFor
❌ Mixing business logic in components
❌ Not using OnPush when possible
❌ Forgetting to handle errors
❌ Not considering edge cases
❌ Over-engineering simple solutions

---

## Interview Communication Tips

### Problem Solving Approach
1. **Clarify requirements** - Ask questions!
2. **Think out loud** - Explain your thought process
3. **Start simple** - Get basic solution first
4. **Optimize** - Discuss trade-offs
5. **Test** - Mention edge cases
6. **Discuss alternatives** - Show you know multiple approaches

### Good Phrases to Use
- "Let me clarify the requirements..."
- "I'm thinking about two approaches..."
- "The trade-off here is..."
- "For production, I would also consider..."
- "To handle edge cases like..."
- "For better performance, we could..."
- "I'm not 100% sure, but I would approach it by..."

---

## System Design Template

### 1. Requirements (5 min)
- Functional requirements
- Non-functional (scale, performance)
- Constraints

### 2. High-Level Design (10 min)
- Component architecture diagram
- Data flow
- Key decisions

### 3. API Design (5 min)
- Endpoints
- Request/Response formats

### 4. Data Model (5 min)
- State structure
- Relationships

### 5. Deep Dive (15 min)
- Critical components
- Performance optimizations
- Error handling
- Security considerations

### 6. Scaling (5 min)
- Bottlenecks
- Solutions
- Trade-offs

---

## Angular Version Features Timeline

**Angular 14:**
- Standalone components
- Typed forms

**Angular 15:**
- Directive composition API
- Image directive (NgOptimizedImage)

**Angular 16:**
- Signals (developer preview)
- Required inputs
- DestroyRef

**Angular 17:**
- New control flow syntax (@if, @for)
- Deferred loading (@defer)
- Signals stable

**Angular 18+:**
- Signal inputs/outputs
- Zoneless change detection

---

## Quick Answers to Common Questions

**Q: Why Angular over React/Vue?**
A: TypeScript first-class, built-in DI, comprehensive solution (routing, forms, HTTP), enterprise-ready, backed by Google.

**Q: What's the difference between AngularJS and Angular?**
A: Complete rewrite. Angular is component-based, uses TypeScript, better performance, mobile-friendly.

**Q: How do you optimize bundle size?**
A: Lazy loading, tree shaking, AOT compilation, remove unused dependencies, code splitting, compression.

**Q: Explain Zone.js**
A: Patches async operations to trigger change detection automatically. Can go zone-less for better performance.

**Q: When to use template-driven vs reactive forms?**
A: Template-driven for simple forms, reactive for complex validation, dynamic forms, testability.

---

## Emergency Quick Review (5 min before interview)

1. **Change Detection:** Default vs OnPush
2. **DI:** providedIn: 'root' vs providers array
3. **RxJS:** switchMap, mergeMap, concatMap differences
4. **Performance:** trackBy, OnPush, lazy loading
5. **Lifecycle:** ngOnInit, ngOnDestroy most important
6. **Smart/Dumb:** Container vs presentational pattern
7. **Unsubscribe:** takeUntil pattern or async pipe
8. **Forms:** Reactive forms for complex scenarios
9. **Testing:** TestBed, fixture, detectChanges
10. **Think out loud!** Communication is key

---

## Good Luck! 🍀

Remember:
- Stay calm and confident
- Ask clarifying questions
- Explain your reasoning
- Admit when you don't know
- Show eagerness to learn
- Be yourself!

You've got this! 💪
