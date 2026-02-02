# Dependency Injection (DI) — Practical Exercises

> **Phase 1, Topic 3** of the Angular Preparation Roadmap
> Hands-on exercises from beginner to expert, designed for the `1_2_ng_core` project
> Angular 21 / Standalone / `inject()` function

---

## Table of Contents

1. [Exercise 1: Provider Types Playground](#exercise-1-provider-types-playground)
2. [Exercise 2: Injector Hierarchy Visualizer](#exercise-2-injector-hierarchy-visualizer)
3. [Exercise 3: Multi-Provider Plugin System](#exercise-3-multi-provider-plugin-system)
4. [Exercise 4: Scoped Services — Multiple Instances](#exercise-4-scoped-services)
5. [Exercise 5: Resolution Modifiers Lab](#exercise-5-resolution-modifiers-lab)
6. [Exercise 6: `providers` vs `viewProviders` with Content Projection](#exercise-6-providers-vs-viewproviders)
7. [Exercise 7: Composable `inject()` Helpers (Angular Hooks)](#exercise-7-composable-inject-helpers)
8. [Exercise 8: Expert — Build a Dynamic Theme Engine with DI](#exercise-8-dynamic-theme-engine)

---

## Exercise 1: Provider Types Playground

### Objective
Demonstrate all four provider types (`useClass`, `useValue`, `useFactory`, `useExisting`) in one application.

### Level: Beginner to Intermediate

### Step 1: Define the Interfaces and Tokens

```typescript
// models/logger.model.ts
export interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  getHistory(): string[];
}
```

```typescript
// tokens/app-tokens.ts
import { InjectionToken } from '@angular/core';
import { Logger } from '../models/logger.model';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const MAX_LOG_ENTRIES = new InjectionToken<number>('MAX_LOG_ENTRIES');
export const IS_DEBUG_MODE = new InjectionToken<boolean>('IS_DEBUG_MODE');
export const LOGGER = new InjectionToken<Logger>('LOGGER');

export interface AppConfig {
  apiUrl: string;
  version: string;
  features: Record<string, boolean>;
}
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

### Step 2: Create Service Implementations

```typescript
// services/console-logger.service.ts
import { Injectable, inject } from '@angular/core';
import { Logger } from '../models/logger.model';
import { MAX_LOG_ENTRIES } from '../tokens/app-tokens';

@Injectable()
export class ConsoleLoggerService implements Logger {
  private readonly maxEntries = inject(MAX_LOG_ENTRIES, { optional: true }) ?? 100;
  private history: string[] = [];

  log(message: string): void {
    const entry = `[LOG] ${new Date().toISOString()} - ${message}`;
    console.log(entry);
    this.addToHistory(entry);
  }

  warn(message: string): void {
    const entry = `[WARN] ${new Date().toISOString()} - ${message}`;
    console.warn(entry);
    this.addToHistory(entry);
  }

  error(message: string): void {
    const entry = `[ERROR] ${new Date().toISOString()} - ${message}`;
    console.error(entry);
    this.addToHistory(entry);
  }

  getHistory(): string[] {
    return [...this.history];
  }

  private addToHistory(entry: string): void {
    this.history.push(entry);
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }
  }
}
```

```typescript
// services/silent-logger.service.ts
import { Injectable } from '@angular/core';
import { Logger } from '../models/logger.model';

@Injectable()
export class SilentLoggerService implements Logger {
  private history: string[] = [];

  log(message: string): void {
    this.history.push(`[SILENT-LOG] ${message}`);
  }
  warn(message: string): void {
    this.history.push(`[SILENT-WARN] ${message}`);
  }
  error(message: string): void {
    // Only errors go to console in silent mode
    console.error(`[SILENT-ERROR] ${message}`);
    this.history.push(`[SILENT-ERROR] ${message}`);
  }
  getHistory(): string[] {
    return [...this.history];
  }
}
```

### Step 3: Wire Up All Provider Types

```typescript
// providers/provider-demo.config.ts
import { Provider } from '@angular/core';
import { Logger } from '../models/logger.model';
import { ConsoleLoggerService } from '../services/console-logger.service';
import { SilentLoggerService } from '../services/silent-logger.service';
import {
  API_BASE_URL, APP_CONFIG, IS_DEBUG_MODE, LOGGER, MAX_LOG_ENTRIES,
} from '../tokens/app-tokens';

const isDebug = true; // toggle this to see different behavior

export const PROVIDER_DEMO_PROVIDERS: Provider[] = [
  // 1. useValue — provide a static value
  { provide: API_BASE_URL, useValue: 'https://api.example.com/v2' },
  { provide: MAX_LOG_ENTRIES, useValue: 50 },
  { provide: IS_DEBUG_MODE, useValue: isDebug },
  {
    provide: APP_CONFIG,
    useValue: {
      apiUrl: 'https://api.example.com/v2',
      version: '3.1.0',
      features: { darkMode: true, betaFeatures: false },
    },
  },

  // 2. useClass — create an instance of a specific class
  //    Based on debug mode, choose a different logger implementation
  {
    provide: ConsoleLoggerService,
    useClass: ConsoleLoggerService,
  },
  {
    provide: SilentLoggerService,
    useClass: SilentLoggerService,
  },

  // 3. useFactory — use a function with dependencies to decide what to create
  {
    provide: LOGGER,
    useFactory: (isDebug: boolean) => {
      // Factory receives injected dependencies as arguments
      if (isDebug) {
        console.log('[Factory] Debug mode ON — using ConsoleLogger');
        return new ConsoleLoggerService();
      } else {
        console.log('[Factory] Debug mode OFF — using SilentLogger');
        return new SilentLoggerService();
      }
    },
    deps: [IS_DEBUG_MODE],
  },

  // 4. useExisting — alias one token to another (same instance)
  //    Logger interface token points to whatever LOGGER resolved to
];
```

### Step 4: Build the Demo Component

```typescript
// di-playground/provider-types-demo.ts
import { Component, inject, signal } from '@angular/core';
import { Logger } from '../models/logger.model';
import { API_BASE_URL, APP_CONFIG, IS_DEBUG_MODE, LOGGER, MAX_LOG_ENTRIES } from '../tokens/app-tokens';
import { PROVIDER_DEMO_PROVIDERS } from '../providers/provider-demo.config';

@Component({
  selector: 'app-provider-types-demo',
  providers: PROVIDER_DEMO_PROVIDERS,
  template: `
    <div class="demo">
      <h2>Provider Types Demo</h2>

      <section>
        <h3>useValue Providers</h3>
        <table>
          <tr><td>API_BASE_URL</td><td>{{ apiUrl }}</td></tr>
          <tr><td>MAX_LOG_ENTRIES</td><td>{{ maxEntries }}</td></tr>
          <tr><td>IS_DEBUG_MODE</td><td>{{ isDebug }}</td></tr>
          <tr><td>APP_CONFIG.version</td><td>{{ config.version }}</td></tr>
          <tr><td>APP_CONFIG.features</td><td>{{ config.features | json }}</td></tr>
        </table>
      </section>

      <section>
        <h3>useFactory + useClass Logger</h3>
        <p>Logger type: <strong>{{ loggerType }}</strong></p>
        <div class="controls">
          <button (click)="doLog('info')">Log Info</button>
          <button (click)="doLog('warn')">Log Warning</button>
          <button (click)="doLog('error')">Log Error</button>
        </div>
        <div class="history">
          <h4>Log History ({{ logHistory().length }} entries):</h4>
          @for (entry of logHistory(); track entry) {
            <div class="log-entry"
                 [class.warn]="entry.includes('WARN')"
                 [class.error]="entry.includes('ERROR')">
              {{ entry }}
            </div>
          } @empty {
            <p>No log entries yet. Click the buttons above.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .demo { max-width: 700px; padding: 20px; }
    section { margin: 20px 0; padding: 16px; border: 1px solid #eee; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    td:first-child { font-weight: 500; width: 200px; }
    .controls { display: flex; gap: 8px; margin: 12px 0; }
    .log-entry { font-family: monospace; font-size: 12px; padding: 4px 8px; border-left: 3px solid #4caf50; margin: 4px 0; }
    .log-entry.warn { border-left-color: #ff9800; }
    .log-entry.error { border-left-color: #f44336; }
  `],
})
export class ProviderTypesDemoComponent {
  // Inject all the different provider types
  readonly apiUrl = inject(API_BASE_URL);
  readonly maxEntries = inject(MAX_LOG_ENTRIES);
  readonly isDebug = inject(IS_DEBUG_MODE);
  readonly config = inject(APP_CONFIG);
  private readonly logger = inject(LOGGER);

  readonly loggerType = this.logger.constructor.name;
  readonly logHistory = signal<string[]>([]);

  private counter = 0;

  doLog(level: 'info' | 'warn' | 'error'): void {
    this.counter++;
    const message = `Event #${this.counter} — ${level} level message`;

    switch (level) {
      case 'info': this.logger.log(message); break;
      case 'warn': this.logger.warn(message); break;
      case 'error': this.logger.error(message); break;
    }

    this.logHistory.set(this.logger.getHistory());
  }
}
```

### What to Observe
1. Change `isDebug` to `false` in the config — the logger implementation switches
2. All `useValue` tokens display their configured values
3. The `useFactory` creates the logger based on the injected `IS_DEBUG_MODE` value
4. Check the console to see the factory decision log

---

## Exercise 2: Injector Hierarchy Visualizer

### Objective
Visualize how Angular resolves dependencies through the injector hierarchy.

### Level: Intermediate

### Step 1: Create a Trackable Service

```typescript
// services/identity.service.ts
import { Injectable, signal } from '@angular/core';

let instanceCounter = 0;

@Injectable() // NOT providedIn: 'root' — we want to control where it's provided
export class IdentityService {
  readonly instanceId: number;
  readonly createdAt: string;
  readonly scopeName: string;
  private readonly _accessLog = signal<string[]>([]);
  readonly accessLog = this._accessLog.asReadonly();

  constructor() {
    this.instanceId = ++instanceCounter;
    this.createdAt = new Date().toISOString();
    this.scopeName = `Instance #${this.instanceId}`;
  }

  recordAccess(componentName: string): void {
    this._accessLog.update(log => [
      ...log,
      `${componentName} accessed at ${new Date().toLocaleTimeString()}`
    ]);
  }
}
```

### Step 2: Build a Hierarchy of Components

```typescript
// hierarchy/root-level.ts
import { Component, inject } from '@angular/core';
import { IdentityService } from '../services/identity.service';
import { MiddleLevelComponent } from './middle-level';

@Component({
  selector: 'app-root-level',
  imports: [MiddleLevelComponent],
  providers: [IdentityService], // Provides at root level
  template: `
    <div class="level root">
      <h3>Root Level Component</h3>
      <div class="info">
        <span class="badge">{{ identity.scopeName }}</span>
        <span>ID: {{ identity.instanceId }}</span>
      </div>

      <div class="children">
        <!-- Child WITHOUT its own provider — gets parent's instance -->
        <app-middle-level label="Middle A (inherits)" [provideOwn]="false" />

        <!-- Child WITH its own provider — gets a new instance -->
        <app-middle-level label="Middle B (own provider)" [provideOwn]="true" />
      </div>
    </div>
  `,
  styles: [`
    .level { border: 2px solid; border-radius: 8px; padding: 12px; margin: 8px; }
    .root { border-color: #1976d2; background: #e3f2fd; }
    .info { display: flex; gap: 12px; align-items: center; margin: 8px 0; }
    .badge { background: #1976d2; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .children { display: flex; gap: 8px; flex-wrap: wrap; }
  `],
})
export class RootLevelComponent {
  readonly identity = inject(IdentityService);

  constructor() {
    this.identity.recordAccess('RootLevelComponent');
  }
}
```

```typescript
// hierarchy/middle-level.ts
import {
  Component, inject, input, computed, Injector,
  EnvironmentInjector, ViewContainerRef,
} from '@angular/core';
import { IdentityService } from '../services/identity.service';
import { LeafLevelComponent } from './leaf-level';

@Component({
  selector: 'app-middle-level',
  imports: [LeafLevelComponent],
  // NOTE: providers set dynamically isn't possible with static metadata,
  // so we demonstrate with a component that always provides its own.
  template: `
    <div class="level middle">
      <h4>{{ label() }}</h4>
      <div class="info">
        <span class="badge">{{ identity.scopeName }}</span>
        <span>ID: {{ identity.instanceId }}</span>
        <span class="same-as-parent">
          {{ sameAsParent() ? '(SAME as parent)' : '(NEW instance)' }}
        </span>
      </div>

      <app-leaf-level label="Leaf Child" />
    </div>
  `,
  styles: [`
    .middle { border-color: #388e3c; background: #e8f5e9; }
    .badge { background: #388e3c; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .same-as-parent { font-style: italic; color: #666; font-size: 12px; }
  `],
})
export class MiddleLevelComponent {
  label = input('Middle');
  provideOwn = input(false);

  readonly identity = inject(IdentityService);

  // Check if we got the same instance as our parent
  private readonly parentIdentity = inject(IdentityService, { skipSelf: true, optional: true });
  readonly sameAsParent = computed(() =>
    this.parentIdentity ? this.identity.instanceId === this.parentIdentity.instanceId : false
  );

  constructor() {
    this.identity.recordAccess('MiddleLevelComponent');
  }
}

// For the component that provides its own instance, create a wrapper:
@Component({
  selector: 'app-middle-level[provideOwn]',
  imports: [LeafLevelComponent],
  providers: [IdentityService],  // NEW instance for this subtree
  template: `
    <div class="level middle own">
      <h4>{{ label() }} (own provider)</h4>
      <div class="info">
        <span class="badge own">{{ identity.scopeName }}</span>
        <span>ID: {{ identity.instanceId }}</span>
        <span class="new-instance">NEW instance</span>
      </div>

      <app-leaf-level label="Leaf Child (inherits from Middle B)" />
    </div>
  `,
  styles: [`
    .middle { border-color: #388e3c; background: #e8f5e9; }
    .own { border-color: #f57c00; background: #fff3e0; }
    .badge { background: #388e3c; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .badge.own { background: #f57c00; }
    .new-instance { color: #f57c00; font-weight: bold; font-size: 12px; }
  `],
})
export class MiddleLevelOwnProviderComponent {
  label = input('Middle');
  provideOwn = input(true);

  readonly identity = inject(IdentityService);

  constructor() {
    this.identity.recordAccess('MiddleLevelOwnProvider');
  }
}
```

```typescript
// hierarchy/leaf-level.ts
import { Component, inject, input } from '@angular/core';
import { IdentityService } from '../services/identity.service';

@Component({
  selector: 'app-leaf-level',
  template: `
    <div class="level leaf">
      <h5>{{ label() }}</h5>
      <div class="info">
        <span class="badge">{{ identity.scopeName }}</span>
        <span>ID: {{ identity.instanceId }}</span>
      </div>
    </div>
  `,
  styles: [`
    .leaf { border-color: #7b1fa2; background: #f3e5f5; }
    .badge { background: #7b1fa2; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
  `],
})
export class LeafLevelComponent {
  label = input('Leaf');
  readonly identity = inject(IdentityService);

  constructor() {
    this.identity.recordAccess('LeafLevelComponent');
  }
}
```

### What to Observe

```
Root Level (Instance #1)
├── Middle A — inherits → Instance #1 (SAME as parent)
│   └── Leaf Child → Instance #1 (SAME as parent)
└── Middle B — own provider → Instance #2 (NEW instance)
    └── Leaf Child → Instance #2 (inherits from Middle B)
```

- Middle A and its leaf get the SAME instance as Root (no own provider)
- Middle B creates a NEW instance, and its leaf inherits that new instance
- This demonstrates the element injector hierarchy walking upward

---

## Exercise 3: Multi-Provider Plugin System

### Objective
Build an extensible plugin system using multi-providers.

### Level: Intermediate to Advanced

### Step 1: Define the Plugin Interface and Token

```typescript
// plugins/plugin.model.ts
import { InjectionToken, Type } from '@angular/core';

export interface AppPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  initialize(): void;
  getStatus(): 'active' | 'inactive' | 'error';
  execute(context: Record<string, unknown>): unknown;
}

export const APP_PLUGINS = new InjectionToken<AppPlugin[]>('APP_PLUGINS');
```

### Step 2: Create Multiple Plugin Implementations

```typescript
// plugins/analytics.plugin.ts
import { Injectable, inject } from '@angular/core';
import { AppPlugin } from './plugin.model';
import { LOGGER } from '../tokens/app-tokens';

@Injectable()
export class AnalyticsPlugin implements AppPlugin {
  readonly name = 'Analytics';
  readonly version = '1.0.0';
  readonly description = 'Tracks user interactions and page views';

  private status: 'active' | 'inactive' | 'error' = 'inactive';
  private events: Array<{ action: string; timestamp: Date }> = [];

  initialize(): void {
    console.log('[AnalyticsPlugin] Initializing...');
    this.status = 'active';
  }

  getStatus() { return this.status; }

  execute(context: Record<string, unknown>): { eventCount: number } {
    const action = context['action'] as string ?? 'unknown';
    this.events.push({ action, timestamp: new Date() });
    console.log(`[Analytics] Tracked: ${action}`);
    return { eventCount: this.events.length };
  }
}

// plugins/performance.plugin.ts
@Injectable()
export class PerformancePlugin implements AppPlugin {
  readonly name = 'Performance Monitor';
  readonly version = '2.1.0';
  readonly description = 'Monitors component render times and bundle size';

  private status: 'active' | 'inactive' | 'error' = 'inactive';
  private metrics: Array<{ metric: string; value: number }> = [];

  initialize(): void {
    console.log('[PerformancePlugin] Initializing...');
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.status = 'active';
    } else {
      this.status = 'error';
    }
  }

  getStatus() { return this.status; }

  execute(context: Record<string, unknown>): { avgRenderTime: number } {
    const renderTime = context['renderTime'] as number ?? Math.random() * 100;
    this.metrics.push({ metric: 'render', value: renderTime });
    const avg = this.metrics.reduce((sum, m) => sum + m.value, 0) / this.metrics.length;
    return { avgRenderTime: Math.round(avg * 100) / 100 };
  }
}

// plugins/notification.plugin.ts
@Injectable()
export class NotificationPlugin implements AppPlugin {
  readonly name = 'Notifications';
  readonly version = '1.3.0';
  readonly description = 'Handles push notifications and in-app alerts';

  private status: 'active' | 'inactive' | 'error' = 'inactive';
  private notifications: string[] = [];

  initialize(): void {
    console.log('[NotificationPlugin] Initializing...');
    this.status = 'active';
  }

  getStatus() { return this.status; }

  execute(context: Record<string, unknown>): { sent: boolean; total: number } {
    const message = context['message'] as string ?? 'Default notification';
    this.notifications.push(message);
    console.log(`[Notification] Sent: ${message}`);
    return { sent: true, total: this.notifications.length };
  }
}
```

### Step 3: Register as Multi-Providers

```typescript
// plugins/plugin.providers.ts
import { Provider } from '@angular/core';
import { APP_PLUGINS } from './plugin.model';
import { AnalyticsPlugin } from './analytics.plugin';
import { PerformancePlugin } from './performance.plugin';
import { NotificationPlugin } from './notification.plugin';

export const PLUGIN_PROVIDERS: Provider[] = [
  { provide: APP_PLUGINS, useClass: AnalyticsPlugin, multi: true },
  { provide: APP_PLUGINS, useClass: PerformancePlugin, multi: true },
  { provide: APP_PLUGINS, useClass: NotificationPlugin, multi: true },
];
```

### Step 4: Build the Plugin Dashboard

```typescript
// plugins/plugin-dashboard.ts
import { Component, inject, signal, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { APP_PLUGINS, AppPlugin } from './plugin.model';
import { PLUGIN_PROVIDERS } from './plugin.providers';

@Component({
  selector: 'app-plugin-dashboard',
  imports: [JsonPipe],
  providers: PLUGIN_PROVIDERS,
  template: `
    <div class="dashboard">
      <h2>Plugin System Dashboard</h2>
      <p>{{ plugins.length }} plugins registered via multi-provider</p>

      <button (click)="initializeAll()" [disabled]="allInitialized()">
        Initialize All Plugins
      </button>

      <div class="plugin-grid">
        @for (plugin of plugins; track plugin.name) {
          <div class="plugin-card" [class]="'status-' + plugin.getStatus()">
            <div class="plugin-header">
              <h3>{{ plugin.name }}</h3>
              <span class="version">v{{ plugin.version }}</span>
            </div>
            <p>{{ plugin.description }}</p>
            <div class="status">
              Status: <strong>{{ plugin.getStatus() }}</strong>
            </div>
            <button (click)="executePlugin(plugin)" [disabled]="plugin.getStatus() !== 'active'">
              Execute
            </button>
          </div>
        }
      </div>

      @if (lastResult()) {
        <div class="result">
          <h3>Last Execution Result:</h3>
          <pre>{{ lastResult() | json }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 800px; padding: 20px; }
    .plugin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; margin: 16px 0; }
    .plugin-card { border: 2px solid #ddd; border-radius: 8px; padding: 16px; }
    .plugin-header { display: flex; justify-content: space-between; align-items: center; }
    .version { font-size: 12px; color: #666; background: #f5f5f5; padding: 2px 8px; border-radius: 4px; }
    .status-active { border-color: #4caf50; }
    .status-inactive { border-color: #ff9800; }
    .status-error { border-color: #f44336; }
    .status { margin: 8px 0; font-size: 14px; }
    .result { margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
    pre { background: #263238; color: #aed581; padding: 12px; border-radius: 4px; }
  `],
})
export class PluginDashboardComponent {
  readonly plugins = inject(APP_PLUGINS);
  readonly lastResult = signal<Record<string, unknown> | null>(null);
  readonly allInitialized = signal(false);

  initializeAll(): void {
    this.plugins.forEach(plugin => plugin.initialize());
    this.allInitialized.set(true);
  }

  executePlugin(plugin: AppPlugin): void {
    const context: Record<string, unknown> = {
      action: 'user_click',
      renderTime: Math.random() * 200,
      message: `Test notification at ${new Date().toLocaleTimeString()}`,
    };
    const result = plugin.execute(context);
    this.lastResult.set({ plugin: plugin.name, ...result as Record<string, unknown> });
  }
}
```

### Key Learning Points
- `multi: true` collects all providers into an array
- Each plugin is independently injectable with its own dependencies
- New plugins can be added by simply adding another provider — zero changes to existing code
- This is the **Open/Closed Principle** in action (open for extension, closed for modification)

---

## Exercise 4: Scoped Services — Multiple Instances

### Objective
Demonstrate how component-level providers create isolated service instances.

### Level: Intermediate

### Step 1: Create a Counter Service

```typescript
// services/counter.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable() // NOT providedIn — scoped to component
export class CounterService {
  private static nextId = 0;
  readonly id = ++CounterService.nextId;

  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();
  readonly isPositive = computed(() => this._count() > 0);
  readonly isNegative = computed(() => this._count() < 0);

  increment(): void { this._count.update(c => c + 1); }
  decrement(): void { this._count.update(c => c - 1); }
  reset(): void { this._count.set(0); }
}
```

### Step 2: Build a Counter Widget Component

```typescript
// scoped/counter-widget.ts
import { Component, inject, input } from '@angular/core';
import { CounterService } from '../services/counter.service';

@Component({
  selector: 'app-counter-widget',
  providers: [CounterService],  // Each widget gets its OWN CounterService
  template: `
    <div class="widget">
      <h3>{{ title() }}</h3>
      <p class="service-id">Service ID: {{ counter.id }}</p>
      <div class="count"
           [class.positive]="counter.isPositive()"
           [class.negative]="counter.isNegative()">
        {{ counter.count() }}
      </div>
      <div class="controls">
        <button (click)="counter.decrement()">−</button>
        <button (click)="counter.reset()">Reset</button>
        <button (click)="counter.increment()">+</button>
      </div>
      <!-- Child component gets the SAME instance -->
      <app-counter-display />
    </div>
  `,
  styles: [`
    .widget { border: 2px solid #1976d2; border-radius: 12px; padding: 16px; text-align: center; min-width: 180px; }
    .service-id { font-size: 11px; color: #999; }
    .count { font-size: 48px; font-weight: bold; margin: 16px 0; }
    .positive { color: #4caf50; }
    .negative { color: #f44336; }
    .controls { display: flex; gap: 8px; justify-content: center; }
    button { width: 50px; height: 36px; border-radius: 6px; border: 1px solid #ddd; cursor: pointer; font-size: 18px; }
  `],
})
export class CounterWidgetComponent {
  title = input('Counter');
  readonly counter = inject(CounterService);
}
```

```typescript
// scoped/counter-display.ts — a child that shares the parent's service
import { Component, inject } from '@angular/core';
import { CounterService } from '../services/counter.service';

@Component({
  selector: 'app-counter-display',
  // NO providers — inherits from parent
  template: `
    <div class="display">
      <small>Child reads same service #{{ counter.id }}: {{ counter.count() }}</small>
    </div>
  `,
  styles: [`.display { margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; }`],
})
export class CounterDisplayComponent {
  readonly counter = inject(CounterService);
}
```

### Step 3: Demonstrate Multiple Independent Instances

```typescript
// scoped/scoped-demo.ts
import { Component } from '@angular/core';
import { CounterWidgetComponent } from './counter-widget';

@Component({
  selector: 'app-scoped-demo',
  imports: [CounterWidgetComponent],
  template: `
    <div class="demo">
      <h2>Scoped Services Demo</h2>
      <p>Each counter widget has its own CounterService instance.
         Clicking buttons in one widget does NOT affect the others.</p>

      <div class="widget-row">
        <app-counter-widget title="Widget A" />
        <app-counter-widget title="Widget B" />
        <app-counter-widget title="Widget C" />
      </div>

      <p class="note">
        Notice each widget shows a different Service ID.
        The child "display" component inside each widget shows the SAME ID as its parent widget.
      </p>
    </div>
  `,
  styles: [`
    .demo { padding: 20px; }
    .widget-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .note { font-style: italic; color: #666; max-width: 500px; }
  `],
})
export class ScopedDemoComponent {}
```

### What to Observe
- Widget A → Service #1, Widget B → Service #2, Widget C → Service #3
- Each child display component shows the same ID as its parent widget
- Incrementing Widget A has zero effect on Widget B or C
- This is the power of component-level `providers`

---

## Exercise 5: Resolution Modifiers Lab

### Objective
Experiment with `@Self()`, `@SkipSelf()`, `@Optional()`, and `@Host()` to understand resolution boundaries.

### Level: Advanced

```typescript
// modifiers/theme.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable()
export class ThemeService {
  private static nextId = 0;
  readonly id = ++ThemeService.nextId;
  readonly theme = signal<'light' | 'dark'>('light');

  toggle(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  toString(): string {
    return `ThemeService#${this.id} [${this.theme()}]`;
  }
}
```

```typescript
// modifiers/modifier-demo.ts
import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

// Top-level component — provides ThemeService
@Component({
  selector: 'app-modifier-demo',
  providers: [ThemeService],
  imports: [SelfDemoComponent, SkipSelfDemoComponent, OptionalDemoComponent, HostDemoComponent],
  template: `
    <div class="demo">
      <h2>Resolution Modifiers Lab</h2>
      <p>Parent provides ThemeService #{{ parentTheme.id }} ({{ parentTheme.theme() }})</p>
      <button (click)="parentTheme.toggle()">Toggle Parent Theme</button>

      <div class="grid">
        <app-self-demo />
        <app-skip-self-demo />
        <app-optional-demo />
        <app-host-demo />
      </div>
    </div>
  `,
  styles: [`
    .demo { padding: 20px; max-width: 800px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
  `],
})
export class ModifierDemoComponent {
  readonly parentTheme = inject(ThemeService);
}

// @Self — only checks OWN injector
@Component({
  selector: 'app-self-demo',
  providers: [ThemeService],  // Provides its own
  template: `
    <div class="card">
      <h3>@Self()</h3>
      <p>Gets OWN provider only.</p>
      <p>ThemeService #{{ theme.id }} ({{ theme.theme() }})</p>
      <button (click)="theme.toggle()">Toggle</button>
      <p class="note">This is a DIFFERENT instance from parent because we provide our own
      and @Self only looks at the local injector.</p>
    </div>
  `,
  styles: [`.card { border: 2px solid #1976d2; border-radius: 8px; padding: 16px; } .note { font-size: 11px; color: #888; }`],
})
export class SelfDemoComponent {
  readonly theme = inject(ThemeService, { self: true });
}

// @SkipSelf — skips own injector, checks parent
@Component({
  selector: 'app-skip-self-demo',
  providers: [ThemeService],  // Has its own, but skips it
  template: `
    <div class="card">
      <h3>@SkipSelf()</h3>
      <p>Skips OWN provider, gets PARENT's.</p>
      <p>ThemeService #{{ theme.id }} ({{ theme.theme() }})</p>
      <button (click)="theme.toggle()">Toggle (changes parent!)</button>
      <p class="note">Even though this component provides its own ThemeService,
      @SkipSelf ignores it and gets the parent's instance.</p>
    </div>
  `,
  styles: [`.card { border: 2px solid #388e3c; border-radius: 8px; padding: 16px; } .note { font-size: 11px; color: #888; }`],
})
export class SkipSelfDemoComponent {
  readonly theme = inject(ThemeService, { skipSelf: true });
}

// @Optional — returns null if not found
@Component({
  selector: 'app-optional-demo',
  // NO providers — also injecting a service that doesn't exist
  template: `
    <div class="card">
      <h3>@Optional()</h3>
      <p>Gets parent's ThemeService: #{{ theme?.id }}</p>
      <p>NonExistentService: {{ nonExistent ?? 'null (not found, no error!)' }}</p>
      <p class="note">Without @Optional, the missing service would throw
      NullInjectorError. With it, we safely get null.</p>
    </div>
  `,
  styles: [`.card { border: 2px solid #ff9800; border-radius: 8px; padding: 16px; } .note { font-size: 11px; color: #888; }`],
})
export class OptionalDemoComponent {
  readonly theme = inject(ThemeService, { optional: true });
  readonly nonExistent = inject(SomeNonExistentService, { optional: true });
}

// Dummy token for demonstration
class SomeNonExistentService {}

// @Host — stops at host element boundary
@Component({
  selector: 'app-host-demo',
  template: `
    <div class="card">
      <h3>@Host()</h3>
      <p>Stops resolution at host boundary.</p>
      <p>ThemeService: {{ theme ? '#' + theme.id : 'null (not found at host level)' }}</p>
      <p class="note">@Host limits resolution to the host component.
      Useful for directives that should only access services from their host component.</p>
    </div>
  `,
  styles: [`.card { border: 2px solid #7b1fa2; border-radius: 8px; padding: 16px; } .note { font-size: 11px; color: #888; }`],
})
export class HostDemoComponent {
  // host: true + optional: true because @Host may not find it
  readonly theme = inject(ThemeService, { host: true, optional: true });
}
```

---

## Exercise 6: `providers` vs `viewProviders` with Content Projection

### Objective
See the concrete difference between `providers` and `viewProviders` when content projection is involved.

### Level: Advanced

```typescript
// view-providers/color.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable()
export class ColorService {
  private static nextId = 0;
  readonly id = ++ColorService.nextId;
  readonly color = signal('#1976d2');

  setColor(color: string): void {
    this.color.set(color);
  }
}
```

```typescript
// view-providers/panel.ts
import { Component, inject, input } from '@angular/core';
import { ColorService } from './color.service';

@Component({
  selector: 'app-panel-providers',
  providers: [ColorService],  // Available to BOTH view children AND projected content
  template: `
    <div class="panel" [style.border-color]="colorService.color()">
      <h3>Panel with <code>providers</code> (ColorService #{{ colorService.id }})</h3>
      <div class="view-child">
        <p>View child can access: Service #{{ colorService.id }}</p>
      </div>
      <div class="projected">
        <p>Projected content below (should also see Service #{{ colorService.id }}):</p>
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .panel { border: 3px solid; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .view-child { background: #e8f5e9; padding: 8px; border-radius: 4px; margin: 8px 0; }
    .projected { background: #fff3e0; padding: 8px; border-radius: 4px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
  `],
})
export class PanelWithProvidersComponent {
  readonly colorService = inject(ColorService);
}

@Component({
  selector: 'app-panel-view-providers',
  viewProviders: [ColorService],  // Available ONLY to view children, NOT projected content
  template: `
    <div class="panel" [style.border-color]="colorService.color()">
      <h3>Panel with <code>viewProviders</code> (ColorService #{{ colorService.id }})</h3>
      <div class="view-child">
        <p>View child can access: Service #{{ colorService.id }}</p>
      </div>
      <div class="projected">
        <p>Projected content below (CANNOT see this service):</p>
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .panel { border: 3px solid; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .view-child { background: #e8f5e9; padding: 8px; border-radius: 4px; margin: 8px 0; }
    .projected { background: #ffebee; padding: 8px; border-radius: 4px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
  `],
})
export class PanelWithViewProvidersComponent {
  readonly colorService = inject(ColorService);
}
```

```typescript
// view-providers/projected-child.ts
import { Component, inject } from '@angular/core';
import { ColorService } from './color.service';

@Component({
  selector: 'app-projected-child',
  template: `
    <div class="child">
      @if (colorService) {
        <p>I see ColorService #{{ colorService.id }} — color: {{ colorService.color() }}</p>
      } @else {
        <p class="no-access">I CANNOT access ColorService (viewProviders blocks me!)</p>
      }
    </div>
  `,
  styles: [`
    .child { padding: 8px; border: 1px dashed #999; border-radius: 4px; margin: 4px 0; }
    .no-access { color: #f44336; font-weight: bold; }
  `],
})
export class ProjectedChildComponent {
  readonly colorService = inject(ColorService, { optional: true });
}
```

```typescript
// view-providers/view-providers-demo.ts
import { Component } from '@angular/core';
import { PanelWithProvidersComponent, PanelWithViewProvidersComponent } from './panel';
import { ProjectedChildComponent } from './projected-child';

@Component({
  selector: 'app-view-providers-demo',
  imports: [PanelWithProvidersComponent, PanelWithViewProvidersComponent, ProjectedChildComponent],
  template: `
    <div class="demo">
      <h2>providers vs viewProviders</h2>

      <app-panel-providers>
        <app-projected-child />
      </app-panel-providers>

      <app-panel-view-providers>
        <app-projected-child />
      </app-panel-view-providers>

      <div class="explanation">
        <h3>What's happening:</h3>
        <ul>
          <li><strong>providers</strong>: ColorService is visible to both the panel's
          own template AND the projected child component.</li>
          <li><strong>viewProviders</strong>: ColorService is visible to the panel's
          own template but NOT to the projected child. The projected child gets <code>null</code>.</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`.demo { max-width: 700px; padding: 20px; }`],
})
export class ViewProvidersDemoComponent {}
```

---

## Exercise 7: Composable `inject()` Helpers (Angular Hooks)

### Objective
Build reusable DI helper functions — Angular's equivalent of React hooks.

### Level: Advanced

```typescript
// helpers/inject-local-storage.ts
import { inject, PLATFORM_ID, signal, effect, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * A composable helper that syncs a signal with localStorage.
 * Works like React's useLocalStorage hook.
 */
export function injectLocalStorage<T>(key: string, defaultValue: T) {
  const platformId = inject(PLATFORM_ID);
  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(platformId);

  // Read initial value from localStorage
  const initial = isBrowser
    ? (() => {
        try {
          const stored = localStorage.getItem(key);
          return stored ? JSON.parse(stored) as T : defaultValue;
        } catch {
          return defaultValue;
        }
      })()
    : defaultValue;

  const value = signal<T>(initial);

  // Sync to localStorage whenever the signal changes
  if (isBrowser) {
    effect(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value()));
      } catch (e) {
        console.warn(`Failed to write to localStorage key "${key}"`, e);
      }
    });
  }

  return value;
}
```

```typescript
// helpers/inject-media-query.ts
import { inject, PLATFORM_ID, signal, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Reactive media query matcher — returns a signal that tracks a CSS media query.
 */
export function injectMediaQuery(query: string) {
  const platformId = inject(PLATFORM_ID);
  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(platformId);

  const matches = signal(false);

  if (isBrowser) {
    const mediaQuery = window.matchMedia(query);
    matches.set(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => matches.set(event.matches);
    mediaQuery.addEventListener('change', handler);

    destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', handler));
  }

  return matches.asReadonly();
}
```

```typescript
// helpers/inject-debounced-signal.ts
import { signal, effect, Signal, DestroyRef, inject } from '@angular/core';

/**
 * Creates a debounced version of a signal.
 */
export function injectDebouncedSignal<T>(source: Signal<T>, delayMs: number) {
  const destroyRef = inject(DestroyRef);
  const debounced = signal(source());
  let timeoutId: ReturnType<typeof setTimeout>;

  effect(() => {
    const value = source();
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => debounced.set(value), delayMs);
  });

  destroyRef.onDestroy(() => clearTimeout(timeoutId));

  return debounced.asReadonly();
}
```

```typescript
// helpers/inject-window-size.ts
import { inject, PLATFORM_ID, signal, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Tracks browser window size reactively.
 */
export function injectWindowSize() {
  const platformId = inject(PLATFORM_ID);
  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(platformId);

  const size = signal<WindowSize>({
    width: isBrowser ? window.innerWidth : 0,
    height: isBrowser ? window.innerHeight : 0,
  });

  if (isBrowser) {
    const handler = () => size.set({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler, { passive: true });
    destroyRef.onDestroy(() => window.removeEventListener('resize', handler));
  }

  return size.asReadonly();
}
```

### Usage Component — Combining All Helpers

```typescript
// helpers/helpers-demo.ts
import { Component, computed, signal } from '@angular/core';
import { injectLocalStorage } from './inject-local-storage';
import { injectMediaQuery } from './inject-media-query';
import { injectDebouncedSignal } from './inject-debounced-signal';
import { injectWindowSize } from './inject-window-size';

@Component({
  selector: 'app-helpers-demo',
  template: `
    <div class="demo" [class.dark]="theme() === 'dark'">
      <h2>Composable inject() Helpers</h2>

      <section>
        <h3>injectLocalStorage</h3>
        <p>Theme: {{ theme() }}</p>
        <button (click)="toggleTheme()">Toggle Theme</button>
        <p class="note">Refresh the page — the value persists in localStorage!</p>
      </section>

      <section>
        <h3>injectMediaQuery</h3>
        <p>Is mobile: {{ isMobile() }}</p>
        <p>Prefers dark mode: {{ prefersDark() }}</p>
        <p class="note">Resize browser or toggle OS dark mode to see changes.</p>
      </section>

      <section>
        <h3>injectWindowSize</h3>
        <p>Width: {{ windowSize().width }}px</p>
        <p>Height: {{ windowSize().height }}px</p>
        <p>Breakpoint: {{ breakpoint() }}</p>
      </section>

      <section>
        <h3>injectDebouncedSignal</h3>
        <input [value]="searchInput()" (input)="searchInput.set(getInputValue($event))" placeholder="Type to search..." />
        <p>Raw: {{ searchInput() }}</p>
        <p>Debounced (300ms): {{ debouncedSearch() }}</p>
      </section>
    </div>
  `,
  styles: [`
    .demo { max-width: 600px; padding: 20px; }
    .demo.dark { background: #263238; color: #eceff1; }
    section { margin: 16px 0; padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
    .note { font-size: 12px; color: #888; font-style: italic; }
    input { padding: 8px 12px; width: 100%; border: 1px solid #ddd; border-radius: 4px; margin: 8px 0; }
  `],
})
export class HelpersDemoComponent {
  // injectLocalStorage — persists to localStorage automatically
  readonly theme = injectLocalStorage<'light' | 'dark'>('app-theme', 'light');

  // injectMediaQuery — reactive CSS media query
  readonly isMobile = injectMediaQuery('(max-width: 768px)');
  readonly prefersDark = injectMediaQuery('(prefers-color-scheme: dark)');

  // injectWindowSize
  readonly windowSize = injectWindowSize();
  readonly breakpoint = computed(() => {
    const w = this.windowSize().width;
    if (w < 576) return 'xs';
    if (w < 768) return 'sm';
    if (w < 992) return 'md';
    if (w < 1200) return 'lg';
    return 'xl';
  });

  // injectDebouncedSignal
  readonly searchInput = signal('');
  readonly debouncedSearch = injectDebouncedSignal(this.searchInput, 300);

  toggleTheme(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
```

### Key Learning Points
- `inject()` works in field initializers, enabling composable helper functions
- Each helper uses `inject()` internally to access DI tokens (`PLATFORM_ID`, `DestroyRef`)
- Cleanup is handled via `DestroyRef.onDestroy()` — automatic when the component is destroyed
- This pattern is Angular's answer to React's custom hooks

---

## Exercise 8: Build a Dynamic Theme Engine with DI

### Objective
Use advanced DI patterns (factory providers, injection tokens, hierarchical injectors) to build a complete theming system.

### Level: Expert

### Step 1: Define the Theme System

```typescript
// theme/theme.model.ts
import { InjectionToken, Signal } from '@angular/core';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
  spacing: { unit: number };
  borderRadius: number;
  fontFamily: string;
}

// Token for available themes (multi-provider)
export const THEME_DEFINITION = new InjectionToken<Theme[]>('THEME_DEFINITION');

// Token for the active theme engine
export const THEME_ENGINE = new InjectionToken<ThemeEngine>('THEME_ENGINE');

export interface ThemeEngine {
  readonly currentTheme: Signal<Theme>;
  readonly availableThemes: Signal<Theme[]>;
  setTheme(name: string): void;
  registerTheme(theme: Theme): void;
}
```

### Step 2: Create Built-in Themes

```typescript
// theme/themes.ts
import { Theme } from './theme.model';

export const LIGHT_THEME: Theme = {
  name: 'Light',
  colors: {
    primary: '#1976d2',
    secondary: '#ff6f00',
    background: '#fafafa',
    surface: '#ffffff',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
  },
  spacing: { unit: 8 },
  borderRadius: 8,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export const DARK_THEME: Theme = {
  name: 'Dark',
  colors: {
    primary: '#90caf9',
    secondary: '#ffb74d',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    border: '#333333',
    error: '#ef5350',
    success: '#66bb6a',
  },
  spacing: { unit: 8 },
  borderRadius: 8,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export const HIGH_CONTRAST_THEME: Theme = {
  name: 'High Contrast',
  colors: {
    primary: '#ffff00',
    secondary: '#00ffff',
    background: '#000000',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#ffffff',
    error: '#ff0000',
    success: '#00ff00',
  },
  spacing: { unit: 8 },
  borderRadius: 4,
  fontFamily: 'Consolas, monospace',
};
```

### Step 3: Build the Theme Engine Service

```typescript
// theme/theme-engine.service.ts
import { Injectable, inject, signal, computed, DOCUMENT } from '@angular/core';
import { Theme, THEME_DEFINITION, ThemeEngine } from './theme.model';

@Injectable()
export class DefaultThemeEngine implements ThemeEngine {
  private readonly document = inject(DOCUMENT);
  private readonly initialThemes = inject(THEME_DEFINITION, { optional: true }) ?? [];

  private readonly _themes = signal<Theme[]>(this.initialThemes);
  private readonly _currentThemeName = signal(this.initialThemes[0]?.name ?? 'Light');

  readonly availableThemes = this._themes.asReadonly();
  readonly currentTheme = computed(() => {
    const name = this._currentThemeName();
    return this._themes().find(t => t.name === name) ?? this._themes()[0];
  });

  constructor() {
    // Apply initial theme as CSS custom properties
    this.applyTheme(this.currentTheme());
  }

  setTheme(name: string): void {
    const theme = this._themes().find(t => t.name === name);
    if (theme) {
      this._currentThemeName.set(name);
      this.applyTheme(theme);
    }
  }

  registerTheme(theme: Theme): void {
    this._themes.update(themes => {
      const exists = themes.find(t => t.name === theme.name);
      if (exists) {
        return themes.map(t => t.name === theme.name ? theme : t);
      }
      return [...themes, theme];
    });
  }

  private applyTheme(theme: Theme): void {
    const root = this.document.documentElement;
    const { colors, spacing, borderRadius, fontFamily } = theme;

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--spacing-unit', `${spacing.unit}px`);
    root.style.setProperty('--border-radius', `${borderRadius}px`);
    root.style.setProperty('--font-family', fontFamily);
  }
}
```

### Step 4: Provider Configuration

```typescript
// theme/theme.providers.ts
import { Provider } from '@angular/core';
import { THEME_DEFINITION, THEME_ENGINE } from './theme.model';
import { DefaultThemeEngine } from './theme-engine.service';
import { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME } from './themes';

export const THEME_PROVIDERS: Provider[] = [
  // Multi-provider: register all available themes
  { provide: THEME_DEFINITION, useValue: LIGHT_THEME, multi: true },
  { provide: THEME_DEFINITION, useValue: DARK_THEME, multi: true },
  { provide: THEME_DEFINITION, useValue: HIGH_CONTRAST_THEME, multi: true },

  // useClass: the engine implementation
  { provide: THEME_ENGINE, useClass: DefaultThemeEngine },
];
```

### Step 5: Build the Theme Demo

```typescript
// theme/theme-demo.ts
import { Component, inject, computed } from '@angular/core';
import { THEME_ENGINE } from './theme.model';
import { THEME_PROVIDERS } from './theme.providers';

@Component({
  selector: 'app-theme-demo',
  providers: THEME_PROVIDERS,
  template: `
    <div class="theme-demo">
      <h2>DI-Powered Theme Engine</h2>

      <div class="theme-selector">
        <h3>Select Theme</h3>
        <div class="theme-buttons">
          @for (theme of engine.availableThemes(); track theme.name) {
            <button
              [class.active]="theme.name === engine.currentTheme().name"
              (click)="engine.setTheme(theme.name)"
              [style.background]="theme.colors.primary"
              [style.color]="theme.colors.text">
              {{ theme.name }}
            </button>
          }
        </div>
      </div>

      <div class="preview-card">
        <h3>Preview Card</h3>
        <p>This card uses CSS custom properties set by the DI-injected ThemeEngine.</p>
        <div class="button-group">
          <button class="btn-primary">Primary Action</button>
          <button class="btn-secondary">Secondary</button>
        </div>
        <p class="text-secondary">Secondary text color</p>
        <div class="status-row">
          <span class="success">Success</span>
          <span class="error">Error</span>
        </div>
      </div>

      <div class="current-theme-info">
        <h3>Current Theme Details</h3>
        <table>
          @for (entry of themeEntries(); track entry[0]) {
            <tr>
              <td>{{ entry[0] }}</td>
              <td>
                <span class="color-swatch" [style.background]="entry[1]"></span>
                {{ entry[1] }}
              </td>
            </tr>
          }
        </table>
      </div>
    </div>
  `,
  styles: [`
    .theme-demo {
      max-width: 700px;
      padding: calc(var(--spacing-unit, 8px) * 3);
      font-family: var(--font-family, system-ui);
      background: var(--color-background, #fafafa);
      color: var(--color-text, #212121);
      min-height: 100vh;
    }
    .theme-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .theme-buttons button {
      padding: 8px 20px; border-radius: var(--border-radius, 8px);
      border: 2px solid transparent; cursor: pointer; font-weight: 500;
    }
    .theme-buttons button.active { border-color: var(--color-secondary); }
    .preview-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      padding: calc(var(--spacing-unit) * 2);
      margin: 16px 0;
    }
    .btn-primary {
      background: var(--color-primary); color: white;
      border: none; padding: 8px 16px; border-radius: var(--border-radius); cursor: pointer;
    }
    .btn-secondary {
      background: transparent; color: var(--color-primary);
      border: 1px solid var(--color-primary); padding: 8px 16px;
      border-radius: var(--border-radius); cursor: pointer;
    }
    .button-group { display: flex; gap: 8px; margin: 12px 0; }
    .text-secondary { color: var(--color-text-secondary); }
    .success { color: var(--color-success); font-weight: 500; }
    .error { color: var(--color-error); font-weight: 500; }
    .status-row { display: flex; gap: 16px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 8px; border-bottom: 1px solid var(--color-border); font-size: 13px; }
    .color-swatch {
      display: inline-block; width: 16px; height: 16px;
      border-radius: 3px; vertical-align: middle; margin-right: 8px;
      border: 1px solid var(--color-border);
    }
  `],
})
export class ThemeDemoComponent {
  readonly engine = inject(THEME_ENGINE);

  readonly themeEntries = computed(() => {
    const theme = this.engine.currentTheme();
    return Object.entries(theme.colors);
  });
}
```

### DI Concepts Demonstrated
| Concept | Where |
|---------|-------|
| `InjectionToken<T>` | `THEME_DEFINITION`, `THEME_ENGINE` |
| Multi-provider | `THEME_DEFINITION` with `multi: true` (registers 3 themes) |
| `useClass` | `THEME_ENGINE` → `DefaultThemeEngine` |
| `useValue` | Each theme object as a multi-provider |
| `inject()` function | All service/component injections |
| `inject(DOCUMENT)` | SSR-safe document access in theme engine |
| `{ optional: true }` | `THEME_DEFINITION` may not be provided |
| Interface-based DI | `ThemeEngine` interface, `DefaultThemeEngine` implementation |

---

## Routing Setup for All Exercises

```typescript
// app.routes.ts additions
export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'di/providers',
    loadComponent: () => import('./di-playground/provider-types-demo').then(m => m.ProviderTypesDemoComponent),
  },
  {
    path: 'di/hierarchy',
    loadComponent: () => import('./hierarchy/root-level').then(m => m.RootLevelComponent),
  },
  {
    path: 'di/plugins',
    loadComponent: () => import('./plugins/plugin-dashboard').then(m => m.PluginDashboardComponent),
  },
  {
    path: 'di/scoped',
    loadComponent: () => import('./scoped/scoped-demo').then(m => m.ScopedDemoComponent),
  },
  {
    path: 'di/modifiers',
    loadComponent: () => import('./modifiers/modifier-demo').then(m => m.ModifierDemoComponent),
  },
  {
    path: 'di/view-providers',
    loadComponent: () => import('./view-providers/view-providers-demo').then(m => m.ViewProvidersDemoComponent),
  },
  {
    path: 'di/helpers',
    loadComponent: () => import('./helpers/helpers-demo').then(m => m.HelpersDemoComponent),
  },
  {
    path: 'di/theme',
    loadComponent: () => import('./theme/theme-demo').then(m => m.ThemeDemoComponent),
  },
];
```

---

## Checklist: What You Should Be Able to Explain After These Exercises

- [ ] All four provider types and when to use each
- [ ] How the injector hierarchy resolves dependencies (element → environment → platform)
- [ ] How `multi: true` providers work and how to build extension points with them
- [ ] How component-level `providers` create scoped instances
- [ ] The difference between `providers` and `viewProviders` with content projection
- [ ] How resolution modifiers (`self`, `skipSelf`, `host`, `optional`) alter lookup behavior
- [ ] How to create composable `inject()` helper functions (Angular hooks pattern)
- [ ] How `InjectionToken` provides type-safe DI for non-class dependencies
- [ ] How to build a real-world feature (theme engine) using advanced DI patterns
