# Angular Interview Prep - Daily Task Tracker

## How to Use This Guide
1. Each day has specific tasks with checkboxes
2. Complete code exercises in order
3. Mark ✅ when completed
4. Build the mini-projects as you progress

---

## Week 1: TypeScript & Angular Fundamentals

### Day 1: TypeScript Basics
- [ ] Study generics, utility types, conditional types
- [ ] **Code Exercise:** Build a type-safe API wrapper
```typescript
// Create this in your IDE:
// 1. Generic HTTP service with proper types
// 2. Conditional types for GET vs POST
// 3. Utility types for partial updates
```
- [ ] **Practice Questions:** Q1, Q2 from the guide
- [ ] **Evening:** Setup Angular project for week 1 exercises

### Day 2: Advanced TypeScript
- [ ] Study decorators, mapped types, template literals
- [ ] **Code Exercise:** Create custom decorators
```typescript
// Build:
// @Debounce(300) decorator for methods
// @Cache() decorator for expensive functions
// @Log() decorator for debugging
```
- [ ] **Mini Project:** Type-safe form builder (start)

### Day 3: Component Fundamentals
- [ ] Study component lifecycle, data binding
- [ ] **Code Exercise:** Create component with all lifecycle hooks
```typescript
// Build a dashboard widget that:
// - Fetches data on init
// - Cleans up on destroy
// - Responds to input changes
// - Detects view changes
```
- [ ] **Practice:** Q3, Q4, Q5

### Day 4: Directives Deep Dive
- [ ] Study structural vs attribute directives
- [ ] **Code Exercise:** Build custom directives
```typescript
// Create:
// 1. appHighlight - highlights on hover
// 2. appPermission - shows/hides based on role
// 3. appLazyLoad - lazy loads images
```
- [ ] **Test:** Write unit tests for directives

### Day 5: Pipes & Templates
- [ ] Study pure vs impure pipes, custom pipes
- [ ] **Code Exercise:** Build utility pipes
```typescript
// Create pipes for:
// - Currency formatting with locale
// - Date relative time (2 hours ago)
// - Text truncation with ellipsis
// - Filter/search arrays
```

### Day 6: Services & DI
- [ ] Study DI system, providers, injection tokens
- [ ] **Code Exercise:** Build hierarchical services
```typescript
// Create:
// - Root logger service
// - Feature-level data service
// - Component-level state service
// Test different provider scopes
```
- [ ] **Practice:** Q4 in depth

### Day 7: Week 1 Project
- [ ] **Build:** User Management Dashboard
  - [ ] User list with custom pipes
  - [ ] Add/Edit forms
  - [ ] Custom directives for validation
  - [ ] Service for data management
- [ ] **Review:** All Week 1 concepts
- [ ] **Self-test:** Explain concepts to camera/friend

---

## Week 2: RxJS & Observables

### Day 8: RxJS Basics
- [ ] Study Observable, Observer, Subject
- [ ] **Code Exercise:** Build basic observables
```typescript
// Create:
// 1. Custom observable from scratch
// 2. Hot vs Cold observables comparison
// 3. Subject, BehaviorSubject, ReplaySubject examples
```
- [ ] **Practice:** Q9

### Day 9: RxJS Operators Part 1
- [ ] Study map, filter, tap, take, skip
- [ ] **Code Exercise:** Data transformation pipeline
```typescript
// Build a search feature:
// - debounceTime for input
// - distinctUntilChanged to avoid duplicates
// - filter out empty searches
// - map to API call format
```

### Day 10: RxJS Operators Part 2
- [ ] Study switchMap, mergeMap, concatMap, exhaustMap
- [ ] **Code Exercise:** API call scenarios
```typescript
// Implement:
// 1. Autocomplete with switchMap
// 2. File upload queue with concatMap
// 3. Multiple simultaneous searches with mergeMap
```
- [ ] **Deep dive:** Q9 - explain with diagrams

### Day 11: Error Handling & Retry Logic
- [ ] Study catchError, retry, retryWhen
- [ ] **Code Exercise:** Robust HTTP service
```typescript
// Build service with:
// - Exponential backoff retry
// - Error logging
// - Fallback data
// - User-friendly error messages
```

### Day 12: Advanced RxJS Patterns
- [ ] Study shareReplay, combineLatest, forkJoin
- [ ] **Code Exercise:** Complex data scenarios
```typescript
// Build:
// 1. Caching service with shareReplay
// 2. Form combining multiple sources (combineLatest)
// 3. Parallel API calls with forkJoin
```

### Day 13: Custom Operators
- [ ] Study how to create custom operators
- [ ] **Code Exercise:** Build reusable operators
```typescript
// Create:
// - filterNullish() operator
// - tapOnce() for one-time side effects
// - retryWithBackoff() operator
```

### Day 14: Week 2 Project
- [ ] **Build:** Real-time Dashboard
  - [ ] Live data updates with WebSocket
  - [ ] Search with autocomplete
  - [ ] Multiple API data merging
  - [ ] Error handling with retry
- [ ] **Review:** RxJS operator decision tree
- [ ] **Practice:** Debug observable chains

---

## Week 3-4: State Management & Advanced Patterns

### Day 15: Component Communication
- [ ] Study @Input, @Output, ViewChild, Services
- [ ] **Code Exercise:** Parent-child scenarios
```typescript
// Build component tree:
// - Parent with multiple children
// - Sibling communication via service
// - Deep nesting communication
```

### Day 16-18: NgRx Fundamentals
- [ ] Study Store, Actions, Reducers, Selectors
- [ ] **Code Exercise:** Shopping cart feature
```typescript
// Implement complete NgRx flow:
// Day 16: Actions + Reducers
// Day 17: Effects + API integration
// Day 18: Selectors + Component integration
```
- [ ] **Practice:** Q14 (state management)

### Day 19-20: Angular Signals (v16+)
- [ ] Study signals, computed, effect
- [ ] **Code Exercise:** Rebuild cart with Signals
```typescript
// Migrate NgRx cart to Signals:
// - Signal-based state
// - Computed derived values
// - Effects for side effects
```
- [ ] **Compare:** NgRx vs Signals trade-offs

### Day 21: Advanced State Patterns
- [ ] Study Entity adapter, Router store
- [ ] **Code Exercise:** Normalized state
```typescript
// Build feature with:
// - @ngrx/entity for normalized data
// - Optimistic updates
// - Undo/redo functionality
```

### Day 22-24: Routing Advanced
- [ ] Study guards, resolvers, lazy loading
- [ ] **Code Exercise:** Complete routing setup
```typescript
// Day 22: Auth guards + route protection
// Day 23: Data resolvers + preloading
// Day 24: Custom preloading strategy
```
- [ ] **Practice:** Q9 (routing optimization)

### Day 25-26: Reactive Forms Mastery
- [ ] Study FormBuilder, validators, FormArray
- [ ] **Code Exercise:** Dynamic form builder
```typescript
// Build configurable form generator:
// - JSON-driven forms
// - Custom validators
// - Async validation
// - Cross-field validation
// - Dynamic field addition/removal
```

### Day 27-28: Week 3-4 Project
- [ ] **Build:** Task Management App
  - [ ] NgRx for state
  - [ ] Advanced routing with guards
  - [ ] Dynamic forms
  - [ ] Drag-and-drop (CDK)
  - [ ] Real-time updates
- [ ] **Review:** All concepts
- [ ] **Mock interview:** Record yourself explaining architecture

---

## Week 5-6: Performance & Testing

### Day 29: Change Detection
- [ ] Study zones, ChangeDetectorRef, OnPush
- [ ] **Code Exercise:** Performance comparison
```typescript
// Build components showing:
// - Default vs OnPush performance
// - Manual change detection
// - Zone-free components
// - Benchmark with Chrome DevTools
```
- [ ] **Practice:** Q6 (change detection)

### Day 30: Performance Profiling
- [ ] Study Chrome DevTools, Lighthouse
- [ ] **Exercise:** Optimize slow component
```typescript
// Take slow component and:
// 1. Profile with DevTools
// 2. Identify bottlenecks
// 3. Apply optimizations
// 4. Measure improvements
```

### Day 31-32: Bundle Optimization
- [ ] Study lazy loading, code splitting
- [ ] **Exercise:** Optimize bundle size
```typescript
// Optimize existing app:
// - Lazy load all routes
// - Dynamic imports for heavy libs
// - Analyze with webpack-bundle-analyzer
// - Achieve <200KB initial bundle
```

### Day 33: Virtual Scrolling
- [ ] Study CDK virtual scroll
- [ ] **Exercise:** Large list optimization
```typescript
// Build:
// - Virtual scrolling table (10k rows)
// - Infinite scroll
// - Dynamic row heights
// Compare performance vs regular ngFor
```

### Day 34-35: Unit Testing
- [ ] Study TestBed, jasmine, karma
- [ ] **Exercise:** Comprehensive test suite
```typescript
// Day 34: Component tests
// Day 35: Service tests with mocks
// Achieve >80% code coverage
```

### Day 36-37: E2E Testing
- [ ] Study Cypress/Playwright
- [ ] **Exercise:** E2E test scenarios
```typescript
// Write E2E tests for:
// - User login flow
// - CRUD operations
// - Form validation
// - Error scenarios
```

### Day 38-40: Week 5-6 Project
- [ ] **Build:** Optimized Data Grid
  - [ ] 100k row handling
  - [ ] Virtual scrolling
  - [ ] Advanced filtering
  - [ ] Export functionality
  - [ ] Full test coverage
- [ ] **Performance goal:** <100ms render time

---

## Week 7-8: Architecture & Advanced Topics

### Day 41: Micro-frontends Theory
- [ ] Study Module Federation, Web Components
- [ ] **Exercise:** Setup shell application
```typescript
// Create:
// - Shell app with routing
// - Remote app 1 (users module)
// - Remote app 2 (products module)
// - Shared authentication
```

### Day 42-43: Micro-frontend Implementation
- [ ] **Exercise:** Build complete micro-frontend
```typescript
// Implement:
// Day 42: Module Federation config
// Day 43: Cross-app communication
```

### Day 44: Security Best Practices
- [ ] Study XSS, CSRF, security headers
- [ ] **Exercise:** Security hardening
```typescript
// Implement:
// - Content Security Policy
// - Sanitization service
// - Security interceptor
// - Audit existing code
```
- [ ] **Practice:** Q18 (authentication)

### Day 45: SSR with Angular Universal
- [ ] Study server-side rendering
- [ ] **Exercise:** Add SSR to existing app
```typescript
// Implement:
// - Angular Universal setup
// - State transfer
// - Meta tags management
// - Prerendering strategy
```

### Day 46-47: Custom Libraries
- [ ] Study library creation, ng-packagr
- [ ] **Exercise:** Build reusable library
```typescript
// Day 46: Create component library
// Day 47: Publish to npm (or private registry)
```

### Day 48-50: Week 7-8 Project
- [ ] **Build:** Enterprise Admin Platform
  - [ ] Micro-frontend architecture
  - [ ] SSR for landing pages
  - [ ] Custom component library
  - [ ] Advanced security
  - [ ] Complete documentation
- [ ] **Deliverable:** Production-ready architecture

---

## Week 9-10: Interview Prep & System Design

### Day 51-53: System Design Practice
- [ ] **Day 51:** Design collaborative text editor (Q16)
- [ ] **Day 52:** Design social media feed
- [ ] **Day 53:** Design notification system
```
For each:
1. Requirements gathering (15 min)
2. Architecture diagram (20 min)
3. API design (15 min)
4. Database schema (10 min)
5. Scaling considerations (10 min)
```

### Day 54-56: Mock Interviews
- [ ] **Day 54:** Technical coding (friend/camera)
- [ ] **Day 55:** System design (whiteboard)
- [ ] **Day 56:** Behavioral questions
```
Record yourself and review:
- Clarity of explanation
- Code quality
- Communication
- Problem-solving approach
```

### Day 57-59: Question Deep Dives
- [ ] **Day 57:** Review questions 1-10
- [ ] **Day 58:** Review questions 11-20
- [ ] **Day 59:** Review questions 21-25
```
For each question:
1. Write answer without looking
2. Code example if applicable
3. Explain trade-offs
4. Discuss alternatives
```

### Day 60-63: Final Projects Portfolio
- [ ] Polish all projects
- [ ] Write comprehensive READMEs
- [ ] Deploy to production
- [ ] Create demo videos
- [ ] GitHub portfolio cleanup

### Day 64-66: Weak Area Focus
- [ ] Identify your weakest topics
- [ ] Deep dive into those areas
- [ ] Build mini-projects for weak areas
- [ ] Practice explaining them

### Day 67-70: Final Review
- [ ] **Day 67:** Angular fundamentals rapid review
- [ ] **Day 68:** Advanced patterns review
- [ ] **Day 69:** Full mock interview
- [ ] **Day 70:** Relax, review notes, prepare mentally

---

## Daily Best Practices

### Morning Routine (30-45 min)
1. Review previous day's notes
2. Read 2-3 Angular/RxJS articles
3. Quick coding warm-up (Leetcode style)

### Study Session (1-2 hours)
1. Theory study (30 min)
2. Hands-on coding (60-90 min)
3. Notes and review (15 min)

### Evening (30 min)
1. Practice interview questions
2. Record yourself explaining a concept
3. Review and plan next day

### Weekend Deep Dive (3-4 hours)
1. Project work
2. System design practice
3. Week review and adjustment

---

## Progress Tracking

### Week 1 Completion: ____%
- Concepts understood: 
- Exercises completed:
- Weak areas:

### Week 2 Completion: ____%
- Concepts understood:
- Exercises completed:
- Weak areas:

[Continue for all weeks...]

---

## Resources Checklist

### Must Read
- [ ] Angular Official Docs (angular.io)
- [ ] RxJS Documentation
- [ ] NgRx Documentation
- [ ] Angular Performance Guide

### Must Watch
- [ ] Angular Connect talks (YouTube)
- [ ] NG-CONF sessions
- [ ] "Angular in Depth" articles

### Must Practice
- [ ] LeetCode (Data structures for interviews)
- [ ] System Design Primer (GitHub)
- [ ] Angular challenges (angular-challenges.vercel.app)

---

## Interview Day Preparation

### 1 Week Before
- [ ] Review all projects
- [ ] Practice whiteboarding
- [ ] Prepare questions for interviewer
- [ ] Review company tech stack

### 1 Day Before
- [ ] Light review only
- [ ] Test tech setup (camera, mic)
- [ ] Prepare workspace
- [ ] Good sleep

### Interview Day
- [ ] Arrive/login 10 min early
- [ ] Have water nearby
- [ ] Notebook for notes
- [ ] Stay calm and confident

---

## Success Metrics

By the end of 10 weeks, you should:
- [ ] Have 4-5 polished projects
- [ ] Answer all 25 questions confidently
- [ ] Complete 3+ system designs
- [ ] Understand Angular internals deeply
- [ ] Be comfortable with whiteboarding
- [ ] Have production-ready code portfolio

---

## Motivation & Tips

**When stuck:**
- Take 10 min break
- Draw diagrams
- Explain to rubber duck
- Search GitHub for examples
- Ask in Angular Discord/Reddit

**When overwhelmed:**
- Focus on fundamentals first
- One concept at a time
- It's okay to not know everything
- Quality > Quantity

**Remember:**
- 10 weeks is enough for solid prep
- Consistent daily practice wins
- Projects > Theory
- Understanding > Memorization
- You've got this! 💪

---

Start with Day 1 and track your progress. Good luck! 🚀
