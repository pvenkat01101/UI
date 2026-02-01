# Angular Components & Templates - Interview Guide

## Table of Contents
1. [Practical Exercises](#practical-exercises)
2. [Interview Questions & Answers](#interview-questions)
3. [Coding Challenges](#coding-challenges)
4. [Common Pitfalls](#common-pitfalls)

---

## Practical Exercises

### Exercise 1: Component Lifecycle Mastery

#### Task: Build a Data Loading Component
```typescript
import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, 
         AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  template: `
    <div class="profile" #profileContainer>
      <h2>{{ user?.name }}</h2>
      <p>Loading: {{ isLoading }}</p>
      <div *ngIf="error" class="error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .profile { padding: 20px; }
    .error { color: red; }
  `]
})
export class UserProfileComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() userId!: string;
  @ViewChild('profileContainer', { static: false }) container!: ElementRef;
  
  user: any;
  isLoading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();
  
  constructor(private userService: UserService) {
    console.log('1. Constructor called');
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log('2. ngOnChanges:', changes);
    
    // Detect userId changes
    if (changes['userId'] && !changes['userId'].firstChange) {
      console.log('UserId changed from', changes['userId'].previousValue, 
                  'to', changes['userId'].currentValue);
      this.loadUser();
    }
  }
  
  ngOnInit(): void {
    console.log('3. ngOnInit called');
    this.loadUser();
    
    // Subscribe to data streams
    this.userService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        console.log('Notification:', notification);
      });
  }
  
  ngAfterViewInit(): void {
    console.log('4. ngAfterViewInit called');
    console.log('Container element:', this.container.nativeElement);
    
    // Can safely access ViewChild here
    this.container.nativeElement.style.border = '2px solid blue';
  }
  
  ngOnDestroy(): void {
    console.log('5. ngOnDestroy called');
    
    // Cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cleanup any other resources
    console.log('Cleaning up resources...');
  }
  
  private loadUser(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getUser(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = error.message;
          this.isLoading = false;
        }
      });
  }
}
```

**Your Tasks:**
1. Add ngDoCheck to detect changes not caught by default change detection
2. Implement ngAfterContentInit and ngAfterContentChecked for content projection
3. Add performance optimization with OnPush change detection
4. Implement proper error boundary pattern

---

### Exercise 2: Component Communication Patterns

#### Parent-Child Communication
```typescript
// Parent Component
@Component({
  selector: 'app-parent',
  template: `
    <div>
      <h1>Parent Component</h1>
      <button (click)="updateMessage()">Update Message</button>
      
      <app-child 
        [message]="parentMessage"
        [config]="config"
        (messageChange)="onChildMessageChange($event)"
        (notify)="onChildNotification($event)">
      </app-child>
    </div>
  `
})
export class ParentComponent {
  parentMessage = 'Hello from parent';
  config = { theme: 'dark', fontSize: 14 };
  
  updateMessage(): void {
    this.parentMessage = `Updated at ${new Date().toISOString()}`;
  }
  
  onChildMessageChange(newMessage: string): void {
    console.log('Child message changed:', newMessage);
  }
  
  onChildNotification(event: any): void {
    console.log('Child notification:', event);
  }
}

// Child Component
@Component({
  selector: 'app-child',
  template: `
    <div>
      <h2>Child Component</h2>
      <p>Received: {{ message }}</p>
      <input [(ngModel)]="childMessage" (input)="onMessageChange()">
      <button (click)="sendNotification()">Notify Parent</button>
    </div>
  `
})
export class ChildComponent implements OnChanges {
  @Input() message!: string;
  @Input() config!: { theme: string; fontSize: number };
  @Output() messageChange = new EventEmitter<string>();
  @Output() notify = new EventEmitter<{ type: string; data: any }>();
  
  childMessage = '';
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      console.log('Message input changed:', 
                  changes['message'].previousValue, 
                  '→', 
                  changes['message'].currentValue);
    }
    
    if (changes['config']) {
      // Detect deep changes in objects
      console.log('Config changed:', changes['config'].currentValue);
    }
  }
  
  onMessageChange(): void {
    this.messageChange.emit(this.childMessage);
  }
  
  sendNotification(): void {
    this.notify.emit({
      type: 'CHILD_ACTION',
      data: { message: this.childMessage, timestamp: Date.now() }
    });
  }
}
```

#### Sibling Communication via Service
```typescript
// Shared Service
@Injectable({ providedIn: 'root' })
export class MessageBus {
  private messageSubject = new Subject<Message>();
  message$ = this.messageSubject.asObservable();
  
  sendMessage(message: Message): void {
    this.messageSubject.next(message);
  }
}

// Sibling 1
@Component({
  selector: 'app-sibling-one',
  template: `
    <button (click)="sendToSibling()">Send to Sibling 2</button>
  `
})
export class SiblingOneComponent {
  constructor(private messageBus: MessageBus) {}
  
  sendToSibling(): void {
    this.messageBus.sendMessage({
      from: 'Sibling1',
      content: 'Hello Sibling 2!',
      timestamp: Date.now()
    });
  }
}

// Sibling 2
@Component({
  selector: 'app-sibling-two',
  template: `
    <div *ngFor="let msg of messages">
      {{ msg.from }}: {{ msg.content }}
    </div>
  `
})
export class SiblingTwoComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  private destroy$ = new Subject<void>();
  
  constructor(private messageBus: MessageBus) {}
  
  ngOnInit(): void {
    this.messageBus.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.messages.push(message);
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### ViewChild and ContentChild
```typescript
// Child component to query
@Component({
  selector: 'app-alert',
  template: `<div class="alert">{{ message }}</div>`
})
export class AlertComponent {
  @Input() message!: string;
  
  show(): void {
    console.log('Alert shown');
  }
  
  hide(): void {
    console.log('Alert hidden');
  }
}

// Parent using ViewChild
@Component({
  selector: 'app-container',
  template: `
    <app-alert #myAlert [message]="alertMessage"></app-alert>
    <button (click)="showAlert()">Show Alert</button>
  `
})
export class ContainerComponent implements AfterViewInit {
  @ViewChild('myAlert') alert!: AlertComponent;
  @ViewChild('myAlert', { read: ElementRef }) alertElement!: ElementRef;
  
  alertMessage = 'Important message';
  
  ngAfterViewInit(): void {
    // Can access child component methods
    console.log('Alert component:', this.alert);
  }
  
  showAlert(): void {
    this.alert.show();
  }
}

// Content Projection with ContentChild
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="card-header">
        <ng-content select="[card-header]"></ng-content>
      </div>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
      <div class="card-footer">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `
})
export class CardComponent implements AfterContentInit {
  @ContentChild('headerContent') headerContent!: ElementRef;
  
  ngAfterContentInit(): void {
    console.log('Projected content:', this.headerContent);
  }
}

// Usage
@Component({
  template: `
    <app-card>
      <h2 card-header #headerContent>Card Title</h2>
      <p>Card body content</p>
      <button card-footer>Action</button>
    </app-card>
  `
})
export class AppComponent {}
```

---

### Exercise 3: Template Syntax Mastery

#### Data Binding Examples
```typescript
@Component({
  selector: 'app-binding-demo',
  template: `
    <!-- 1. Interpolation -->
    <h1>{{ title }}</h1>
    <p>{{ 1 + 1 }}</p>
    <p>{{ getMessage() }}</p>
    
    <!-- 2. Property Binding -->
    <img [src]="imageUrl" [alt]="imageAlt">
    <button [disabled]="isDisabled">Click Me</button>
    <div [class.active]="isActive"></div>
    <div [style.color]="textColor"></div>
    
    <!-- 3. Attribute Binding (for SVG, ARIA, data-*) -->
    <button [attr.aria-label]="ariaLabel">Icon</button>
    <svg><circle [attr.cx]="centerX"></circle></svg>
    
    <!-- 4. Event Binding -->
    <button (click)="onClick()">Click</button>
    <input (input)="onInput($event)">
    <div (mouseenter)="onHover()" (mouseleave)="onLeave()">Hover me</div>
    
    <!-- 5. Two-way Binding -->
    <input [(ngModel)]="username">
    <p>Username: {{ username }}</p>
    
    <!-- Custom two-way binding -->
    <app-custom [(value)]="customValue"></app-custom>
    
    <!-- 6. Template Reference Variables -->
    <input #nameInput type="text">
    <button (click)="logValue(nameInput.value)">Log</button>
    
    <!-- 7. Multiple bindings -->
    <div 
      [class.active]="isActive"
      [class.disabled]="isDisabled"
      [style.width.px]="width"
      (click)="handleClick($event)">
      Content
    </div>
    
    <!-- 8. NgClass and NgStyle -->
    <div [ngClass]="{ 'active': isActive, 'disabled': isDisabled }"></div>
    <div [ngStyle]="{ 'color': textColor, 'font-size.px': fontSize }"></div>
  `
})
export class BindingDemoComponent {
  title = 'Binding Demo';
  imageUrl = 'assets/image.jpg';
  imageAlt = 'Demo image';
  isDisabled = false;
  isActive = true;
  textColor = 'blue';
  ariaLabel = 'Close dialog';
  centerX = 50;
  username = '';
  customValue = '';
  width = 100;
  fontSize = 16;
  
  getMessage(): string {
    return 'Dynamic message';
  }
  
  onClick(): void {
    console.log('Clicked');
  }
  
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log('Input value:', input.value);
  }
  
  onHover(): void {
    console.log('Mouse entered');
  }
  
  onLeave(): void {
    console.log('Mouse left');
  }
  
  logValue(value: string): void {
    console.log('Value:', value);
  }
  
  handleClick(event: MouseEvent): void {
    console.log('Click position:', event.clientX, event.clientY);
  }
}

// Custom two-way binding component
@Component({
  selector: 'app-custom',
  template: `
    <input [value]="value" (input)="onChange($event)">
  `
})
export class CustomComponent {
  @Input() value!: string;
  @Output() valueChange = new EventEmitter<string>();
  
  onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(input.value);
  }
}
```

---

### Exercise 4: Structural Directives Deep Dive

```typescript
@Component({
  selector: 'app-directives',
  template: `
    <!-- ngIf -->
    <div *ngIf="isVisible">Visible content</div>
    <div *ngIf="user; else loading">
      Welcome {{ user.name }}
    </div>
    <ng-template #loading>
      <div>Loading...</div>
    </ng-template>
    
    <!-- ngIf with as -->
    <div *ngIf="user$ | async as user">
      {{ user.name }}
    </div>
    
    <!-- ngFor -->
    <ul>
      <li *ngFor="let item of items; let i = index; let first = first; let last = last">
        {{ i }}: {{ item }} (First: {{ first }}, Last: {{ last }})
      </li>
    </ul>
    
    <!-- ngFor with trackBy -->
    <div *ngFor="let user of users; trackBy: trackByUserId">
      {{ user.name }}
    </div>
    
    <!-- ngSwitch -->
    <div [ngSwitch]="status">
      <p *ngSwitchCase="'loading'">Loading...</p>
      <p *ngSwitchCase="'success'">Success!</p>
      <p *ngSwitchCase="'error'">Error occurred</p>
      <p *ngSwitchDefault>Unknown status</p>
    </div>
    
    <!-- Multiple structural directives (using ng-container) -->
    <ng-container *ngIf="isVisible">
      <div *ngFor="let item of items">
        {{ item }}
      </div>
    </ng-container>
    
    <!-- New control flow (Angular 17+) -->
    @if (isVisible) {
      <div>Visible</div>
    } @else if (isLoading) {
      <div>Loading...</div>
    } @else {
      <div>Hidden</div>
    }
    
    @for (item of items; track item.id) {
      <div>{{ item.name }}</div>
    } @empty {
      <div>No items</div>
    }
    
    @switch (status) {
      @case ('loading') { <div>Loading...</div> }
      @case ('success') { <div>Success!</div> }
      @default { <div>Unknown</div> }
    }
  `
})
export class DirectivesComponent {
  isVisible = true;
  isLoading = false;
  user = { name: 'John' };
  user$ = of({ name: 'Jane' });
  items = ['Apple', 'Banana', 'Cherry'];
  users = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
    { id: 3, name: 'Bob' }
  ];
  status = 'loading';
  
  trackByUserId(index: number, user: { id: number; name: string }): number {
    return user.id;
  }
}
```

---

### Exercise 5: Custom Directives

#### Attribute Directive
```typescript
import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

// Highlight directive
@Directive({
  selector: '[appHighlight]'
})
export class HighlightDirective {
  @Input() appHighlight = 'yellow'; // Default color
  @Input() defaultColor = 'transparent';
  
  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {
    this.setBackgroundColor(this.defaultColor);
  }
  
  @HostListener('mouseenter') onMouseEnter(): void {
    this.setBackgroundColor(this.appHighlight);
  }
  
  @HostListener('mouseleave') onMouseLeave(): void {
    this.setBackgroundColor(this.defaultColor);
  }
  
  private setBackgroundColor(color: string): void {
    this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', color);
  }
}

// Usage: <p appHighlight="lightblue">Hover over me</p>
```

#### Structural Directive
```typescript
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

// Custom *ngIf alternative
@Directive({
  selector: '[appUnless]'
})
export class UnlessDirective {
  private hasView = false;
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}
  
  @Input() set appUnless(condition: boolean) {
    if (!condition && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (condition && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

// Usage: <p *appUnless="isHidden">Visible when isHidden is false</p>

// Advanced structural directive with context
@Directive({
  selector: '[appRepeat]'
})
export class RepeatDirective {
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}
  
  @Input() set appRepeat(times: number) {
    this.viewContainer.clear();
    for (let i = 0; i < times; i++) {
      this.viewContainer.createEmbeddedView(this.templateRef, {
        $implicit: i,
        index: i,
        count: times
      });
    }
  }
}

// Usage with context
/*
<div *appRepeat="3; let i; let count = count">
  Item {{ i + 1 }} of {{ count }}
</div>
*/
```

#### Advanced Directive: Permission-based
```typescript
@Directive({
  selector: '[appHasPermission]'
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permissions: string[] = [];
  private destroy$ = new Subject<void>();
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}
  
  @Input() set appHasPermission(permissions: string | string[]) {
    this.permissions = Array.isArray(permissions) ? permissions : [permissions];
    this.updateView();
  }
  
  ngOnInit(): void {
    this.authService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private updateView(): void {
    const hasPermission = this.permissions.some(p => 
      this.authService.hasPermission(p)
    );
    
    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}

// Usage: <button *appHasPermission="'admin'">Delete</button>
```

---

## Interview Questions & Answers

### Beginner Level

**Q1: What is a component in Angular? What are its key parts?**

**A:** A component is a TypeScript class decorated with `@Component` that controls a view (HTML template).

Key parts:
```typescript
@Component({
  selector: 'app-user',        // 1. CSS selector
  template: '<h1>{{name}}</h1>', // 2. HTML template (or templateUrl)
  styles: ['h1 { color: blue }'] // 3. Styles (or styleUrls)
})
export class UserComponent {    // 4. Component class
  name = 'John';               // 5. Component properties
  
  greet() {                     // 6. Component methods
    console.log('Hello');
  }
}
```

**Q2: Explain the component lifecycle hooks in order.**

**A:** Lifecycle hooks execute in this order:

1. **constructor()** - Dependency injection, basic initialization
2. **ngOnChanges()** - When `@Input()` properties change
3. **ngOnInit()** - After first `ngOnChanges()`, initialize component
4. **ngDoCheck()** - Custom change detection
5. **ngAfterContentInit()** - After content projection initialized
6. **ngAfterContentChecked()** - After every content check
7. **ngAfterViewInit()** - After component's view initialized
8. **ngAfterViewChecked()** - After every view check
9. **ngOnDestroy()** - Cleanup before component is destroyed

Most commonly used: `ngOnInit()`, `ngOnChanges()`, `ngOnDestroy()`

**Q3: What's the difference between @ViewChild and @ContentChild?**

**A:**

```typescript
// ViewChild - queries elements in component's own template
@Component({
  template: '<input #myInput>'
})
export class Parent {
  @ViewChild('myInput') input!: ElementRef;
}

// ContentChild - queries projected content (<ng-content>)
@Component({
  selector: 'app-wrapper',
  template: '<ng-content></ng-content>'
})
export class Wrapper {
  @ContentChild('projected') content!: ElementRef;
}

// Usage
@Component({
  template: `
    <app-wrapper>
      <div #projected>This is projected</div>
    </app-wrapper>
  `
})
export class App {}
```

**Q4: What are the different types of data binding?**

**A:**

```typescript
// 1. Interpolation (Component → Template)
{{ value }}

// 2. Property Binding (Component → Template)
[property]="value"

// 3. Event Binding (Template → Component)
(event)="handler()"

// 4. Two-way Binding (Both directions)
[(ngModel)]="value"

// Custom two-way binding: combine property + event
[value]="data"
(valueChange)="data=$event"
// Shorthand: [(value)]="data"
```

**Q5: How does ngFor work? What is trackBy?**

**A:**

```typescript
@Component({
  template: `
    <!-- Basic ngFor -->
    <div *ngFor="let item of items">{{ item }}</div>
    
    <!-- With index and other variables -->
    <div *ngFor="let item of items; let i = index; let first = first">
      {{ i }}: {{ item }} (First: {{ first }})
    </div>
    
    <!-- With trackBy for performance -->
    <div *ngFor="let item of items; trackBy: trackById">
      {{ item.name }}
    </div>
  `
})
export class MyComponent {
  items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ];
  
  // trackBy function prevents unnecessary re-renders
  trackById(index: number, item: any): number {
    return item.id; // Use unique identifier
  }
}
```

**Why trackBy?** Without it, Angular re-creates DOM elements when array changes. With trackBy, Angular only updates changed items.

---

### Intermediate Level

**Q6: Explain OnPush change detection strategy.**

**A:** OnPush makes change detection more efficient by only checking component when:
1. `@Input()` reference changes
2. Event originates from component
3. Observable emits (with `async` pipe)
4. Manual trigger (`ChangeDetectorRef.markForCheck()`)

```typescript
@Component({
  selector: 'app-user',
  template: '<h1>{{ user.name }}</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush // Enable OnPush
})
export class UserComponent {
  @Input() user!: User;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // This won't trigger change detection with OnPush
  updateName() {
    this.user.name = 'New Name'; // Mutation - won't work!
  }
  
  // This will trigger change detection
  updateUser() {
    this.user = { ...this.user, name: 'New Name' }; // New reference ✅
  }
  
  // Manual trigger
  forceUpdate() {
    this.cdr.markForCheck(); // Manually mark for check
  }
}
```

**Benefits:** Better performance, forces immutable patterns

**Q7: How do you create a custom two-way binding?**

**A:**

```typescript
@Component({
  selector: 'app-counter',
  template: `
    <button (click)="decrement()">-</button>
    <span>{{ value }}</span>
    <button (click)="increment()">+</button>
  `
})
export class CounterComponent {
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();
  
  increment(): void {
    this.value++;
    this.valueChange.emit(this.value);
  }
  
  decrement(): void {
    this.value--;
    this.valueChange.emit(this.value);
  }
}

// Usage: <app-counter [(value)]="count"></app-counter>
```

**Pattern:** Property name + "Change" event = two-way binding

**Q8: What is content projection and how does it work?**

**A:** Content projection allows inserting content from parent into child component.

```typescript
// Single-slot projection
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {}

// Usage
<app-card>
  <h1>Title</h1>
  <p>Content</p>
</app-card>

// Multi-slot projection with select
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="header">
        <ng-content select="[card-header]"></ng-content>
      </div>
      <div class="body">
        <ng-content select="[card-body]"></ng-content>
      </div>
      <div class="footer">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {}

// Usage
<app-card>
  <h1 card-header>Title</h1>
  <p card-body>Body content</p>
  <button card-footer>Action</button>
</app-card>

// Conditional projection
@Component({
  template: `
    <ng-content *ngIf="show"></ng-content>
  `
})
export class ConditionalComponent {
  @Input() show = true;
}
```

**Q9: Difference between Renderer2 and direct DOM manipulation?**

**A:**

```typescript
// ❌ Bad: Direct DOM manipulation
export class BadComponent {
  constructor(private el: ElementRef) {
    el.nativeElement.style.color = 'red'; // Not SSR-safe, not Web Worker safe
  }
}

// ✅ Good: Using Renderer2
export class GoodComponent {
  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {
    this.renderer.setStyle(el.nativeElement, 'color', 'red');
  }
}
```

**Why Renderer2?**
- SSR compatible
- Web Worker compatible  
- Better security
- Platform independent

**Q10: How do you handle dynamic component creation?**

**A:**

```typescript
@Component({
  selector: 'app-dynamic',
  template: '<ng-container #container></ng-container>'
})
export class DynamicComponent {
  @ViewChild('container', { read: ViewContainerRef }) 
  container!: ViewContainerRef;
  
  constructor(private componentFactoryResolver: ComponentFactoryResolver) {}
  
  // Old way (pre-Ivy)
  createComponentOld() {
    const factory = this.componentFactoryResolver
      .resolveComponentFactory(AlertComponent);
    const componentRef = this.container.createComponent(factory);
    componentRef.instance.message = 'Hello';
  }
  
  // New way (Ivy)
  createComponent() {
    const componentRef = this.container.createComponent(AlertComponent);
    componentRef.instance.message = 'Hello';
    
    // Subscribe to outputs
    componentRef.instance.close.subscribe(() => {
      componentRef.destroy();
    });
  }
}
```

---

### Advanced Level

**Q11: How does Angular's change detection work internally?**

**A:** Change detection checks component tree for changes and updates DOM.

**Process:**
1. **Zone.js** patches async operations (setTimeout, promises, events)
2. When async operation completes, Zone notifies Angular
3. Angular runs change detection from root to leaves
4. Each component's template bindings are checked
5. If changes detected, DOM is updated

```typescript
// Default strategy (CheckAlways)
// Checks every component on every CD cycle
@Component({ 
  changeDetection: ChangeDetectionStrategy.Default 
})

// OnPush strategy
// Only checks when:
// - @Input reference changes
// - Component event fires  
// - Observable emits (async pipe)
// - Manual trigger
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// Manual control
export class MyComponent {
  constructor(private cdr: ChangeDetectorRef) {}
  
  detach() {
    this.cdr.detach(); // Remove from CD tree
  }
  
  detect() {
    this.cdr.detectChanges(); // Run CD once
  }
  
  markForCheck() {
    this.cdr.markForCheck(); // Mark component and ancestors for check
  }
  
  reattach() {
    this.cdr.reattach(); // Add back to CD tree
  }
}

// Zone-less approach (future)
export class ZonelessComponent {
  constructor(private appRef: ApplicationRef) {}
  
  update() {
    // ... update state
    this.appRef.tick(); // Manually trigger CD
  }
}
```

**Q12: Implement a reusable modal service using dynamic components.**

**A:**

```typescript
// Modal component
@Component({
  selector: 'app-modal',
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <ng-container #content></ng-container>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 500px;
    }
  `]
})
export class ModalComponent {
  @ViewChild('content', { read: ViewContainerRef }) 
  content!: ViewContainerRef;
  
  @Output() closeModal = new EventEmitter<void>();
  
  close(): void {
    this.closeModal.emit();
  }
}

// Modal service
@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalRef: ComponentRef<ModalComponent> | null = null;
  
  constructor(
    private appRef: ApplicationRef,
    private injector: Injector
  ) {}
  
  open<T>(component: Type<T>, inputs?: Partial<T>): ComponentRef<T> {
    // Create modal
    const modalRef = this.appRef.bootstrap(ModalComponent);
    this.modalRef = modalRef;
    
    // Create content component
    const contentRef = modalRef.instance.content.createComponent(component, {
      injector: this.injector
    });
    
    // Set inputs
    if (inputs) {
      Object.assign(contentRef.instance, inputs);
    }
    
    // Handle close
    modalRef.instance.closeModal.subscribe(() => {
      this.close();
    });
    
    return contentRef;
  }
  
  close(): void {
    if (this.modalRef) {
      this.modalRef.destroy();
      this.modalRef = null;
    }
  }
}

// Usage
@Component({})
export class AppComponent {
  constructor(private modal: ModalService) {}
  
  openUserModal() {
    const ref = this.modal.open(UserDetailsComponent, {
      user: { id: 1, name: 'John' }
    });
    
    // Listen to outputs
    ref.instance.save.subscribe(data => {
      console.log('Saved:', data);
      this.modal.close();
    });
  }
}
```

---

## Coding Challenges

### Challenge 1: Virtual Scroll Implementation
Create a virtual scrolling list that only renders visible items.

### Challenge 2: Drag and Drop Directive  
Build a reusable drag-and-drop directive without external libraries.

### Challenge 3: Form Field Component
Create a reusable form field with validation display and error handling.

### Challenge 4: Infinite Scroll
Implement infinite scrolling that loads more data on scroll.

---

## Common Pitfalls

1. **Memory Leaks from Subscriptions**
```typescript
// ❌ Bad
ngOnInit() {
  this.service.data$.subscribe(data => this.data = data);
}

// ✅ Good
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.data$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => this.data = data);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

2. **Modifying @Input Properties**
```typescript
// ❌ Bad
@Input() user!: User;

ngOnInit() {
  this.user.name = 'Changed'; // Mutating input!
}

// ✅ Good
@Input() user!: User;
localUser!: User;

ngOnInit() {
  this.localUser = { ...this.user };
  this.localUser.name = 'Changed';
}
```

3. **Function Calls in Templates**
```typescript
// ❌ Bad (called every CD cycle)
<div>{{ formatDate(date) }}</div>

// ✅ Good (use pipe)
<div>{{ date | date:'short' }}</div>
```

**Interview Tip:** Always explain performance implications!
