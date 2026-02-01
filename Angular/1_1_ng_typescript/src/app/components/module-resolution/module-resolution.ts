import { Component } from '@angular/core';

@Component({
  selector: 'app-module-resolution',
  imports: [],
  template: `
    <div class="component-container">
      <h2>6. Module Resolution Strategies</h2>
      <p class="intro">
        Module resolution determines how TypeScript finds the file that a module import refers to.
        Understanding this is critical for Angular projects with complex folder structures, monorepos, and library authoring.
      </p>

      <!-- SCENARIO 1: Node vs Classic Resolution -->
      <section class="scenario">
        <h3>Scenario 1: Node vs Classic Resolution</h3>
        <div class="explanation">
          <p><strong>TypeScript supports two module resolution strategies:</strong></p>
          <pre><code>// tsconfig.json
&#123;
  "compilerOptions": &#123;
    "moduleResolution": "node" // or "classic" or "bundler" (TS 5.0+)
  &#125;
&#125;

// === NODE Resolution (default for CommonJS) ===
// For: import &#123; X &#125; from './foo'
// 1. ./foo.ts
// 2. ./foo.tsx
// 3. ./foo.d.ts
// 4. ./foo/package.json → "types" field
// 5. ./foo/index.ts
// 6. ./foo/index.d.ts

// For: import &#123; X &#125; from 'foo' (non-relative)
// 1. ./node_modules/foo.ts
// 2. ./node_modules/foo/package.json → "types"
// 3. ./node_modules/foo/index.ts
// 4. ../node_modules/foo.ts (walk up directories)
// 5. ./node_modules/&#64;types/foo

// === CLASSIC Resolution (legacy) ===
// For: import &#123; X &#125; from './foo'
// 1. ./foo.ts
// 2. ./foo.d.ts
// (No index.ts, no package.json lookup)

// For: import &#123; X &#125; from 'foo' (non-relative)
// 1. ./foo.ts, ./foo.d.ts
// 2. ../foo.ts, ../foo.d.ts (walk up directories)
// (No node_modules lookup!)</code></pre>
        </div>
        <div class="demo-box">
          <h4>Angular's Module Resolution</h4>
          <div class="type-demo">
            Angular CLI projects use <code>"moduleResolution": "bundler"</code> (TS 5.0+)<br>
            This combines Node resolution with bundler-specific features:<br>
            — Supports <code>package.json</code> <code>"exports"</code> field<br>
            — Supports <code>"imports"</code> for self-referencing<br>
            — Allows extensionless relative imports (bundler resolves)<br>
            — No need for <code>.js</code> extension in imports
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What is the difference between <code>node</code>, <code>node16</code>, and <code>bundler</code> module resolution?"<br>
          <strong>A:</strong> <code>node</code> is the classic Node.js CJS algorithm. <code>node16</code>/<code>nodenext</code>
          adds ESM support: reads <code>"type": "module"</code> from package.json, respects <code>"exports"</code> map,
          and REQUIRES file extensions in relative imports. <code>bundler</code> is like <code>node16</code> but relaxed:
          no file extension requirement, always allows ESM syntax. Angular uses <code>bundler</code> because
          Vite/esbuild handles the actual resolution.
          <br><br>
          <strong>Twisted Q:</strong> "Why do you sometimes need to import from <code>'./foo.js'</code> even though the file is <code>foo.ts</code>?"<br>
          <strong>A:</strong> With <code>node16</code>/<code>nodenext</code>, TypeScript requires you to import the <em>output</em>
          file extension (<code>.js</code>) because TS does NOT rewrite import paths. The compiled JS will contain the same
          import path, and Node.js ESM loader needs <code>.js</code>. This is NOT needed with <code>bundler</code> resolution.
        </div>
      </section>

      <!-- SCENARIO 2: Path Mapping -->
      <section class="scenario">
        <h3>Scenario 2: Path Mapping (tsconfig paths)</h3>
        <div class="explanation">
          <pre><code>// tsconfig.json
&#123;
  "compilerOptions": &#123;
    "baseUrl": ".",
    "paths": &#123;
      "&#64;models/*": ["src/app/models/*"],
      "&#64;services/*": ["src/app/services/*"],
      "&#64;components/*": ["src/app/components/*"],
      "&#64;shared/*": ["src/app/shared/*"],
      "&#64;env": ["src/environments/environment"]
    &#125;
  &#125;
&#125;

// Usage:
import &#123; User &#125; from '&#64;models/typescript-types';
import &#123; TypescriptApiService &#125; from '&#64;services/typescript-api.service';
// Instead of:
import &#123; User &#125; from '../../../models/typescript-types';</code></pre>
        </div>
        <div class="demo-box">
          <h4>Common Angular Path Aliases</h4>
          <div class="type-demo">
            <code>&#64;app/*</code> → <span class="type-result">src/app/*</span> (app root)<br>
            <code>&#64;core/*</code> → <span class="type-result">src/app/core/*</span> (singleton services, guards)<br>
            <code>&#64;shared/*</code> → <span class="type-result">src/app/shared/*</span> (reusable components, pipes)<br>
            <code>&#64;features/*</code> → <span class="type-result">src/app/features/*</span> (feature modules)<br>
            <code>&#64;env</code> → <span class="type-result">src/environments/environment</span> (environment config)
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "Do <code>paths</code> in tsconfig.json affect the runtime JavaScript?"<br>
          <strong>A:</strong> No! <code>paths</code> is purely for TypeScript's module resolution — it tells the compiler
          where to find type information. The actual module resolution at runtime depends on your bundler (Webpack, Vite, esbuild).
          You need BOTH: tsconfig <code>paths</code> for TS, and bundler alias config for runtime. Angular CLI
          automatically maps tsconfig paths to the bundler, so it "just works" in Angular projects.
          <br><br>
          <strong>Twisted Q:</strong> "What is <code>baseUrl</code> and is it required for <code>paths</code>?"<br>
          <strong>A:</strong> <code>baseUrl</code> sets the root directory for non-relative imports. Since TS 4.1,
          <code>paths</code> can be used WITHOUT <code>baseUrl</code> — paths are resolved relative to the tsconfig location.
          Setting <code>baseUrl: "."</code> allows bare imports like <code>import 'src/app/foo'</code> which can be confusing.
          Best practice: use <code>paths</code> with explicit aliases (&#64;prefix) and avoid relying on <code>baseUrl</code> alone.
        </div>
      </section>

      <!-- SCENARIO 3: Barrel Exports -->
      <section class="scenario">
        <h3>Scenario 3: Barrel Exports Pattern</h3>
        <div class="explanation">
          <pre><code>// src/app/models/index.ts (barrel file)
export * from './user.model';
export * from './product.model';
export * from './config.model';
export type &#123; ApiResponse &#125; from './api-types';

// Consumer can import everything from one path:
import &#123; User, Product, ApiResponse &#125; from '&#64;models';
// Instead of:
import &#123; User &#125; from '&#64;models/user.model';
import &#123; Product &#125; from '&#64;models/product.model';
import &#123; ApiResponse &#125; from '&#64;models/api-types';</code></pre>
        </div>
        <div class="demo-box">
          <h4>Barrel Export Best Practices</h4>
          <div class="type-demo">
            <span class="type-result">DO:</span> Use barrels for public API of a feature/library<br>
            <span class="type-result">DO:</span> Re-export only what consumers need<br>
            <span class="type-result">DO:</span> Use <code>export type</code> for type-only exports (better tree-shaking)<br>
            <span class="error">DON'T:</span> Create deep barrel chains (barrel importing from barrel)<br>
            <span class="error">DON'T:</span> Use barrels for intra-module imports (causes circular deps)<br>
            <span class="error">DON'T:</span> Re-export everything with <code>export *</code> in large modules
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What are the pitfalls of barrel exports?"<br>
          <strong>A:</strong> (1) <strong>Circular dependencies</strong>: If module A imports from barrel, and barrel re-exports
          module B which imports from module A. (2) <strong>Bundle bloat</strong>: <code>export *</code> can pull in
          everything even if you only need one export — tree-shaking can't always help if there are side effects.
          (3) <strong>Slower compilation</strong>: TS must resolve all re-exports to check types.
          (4) <strong>Ambiguous imports</strong>: Two barrels exporting the same name causes conflicts.
          <br><br>
          <strong>Twisted Q:</strong> "Does <code>export type &#123; Foo &#125; from './bar'</code> help with tree-shaking?"<br>
          <strong>A:</strong> Yes! <code>export type</code> is erased completely during compilation — it produces no JavaScript.
          This means bundlers won't include the source module if it's only imported for types.
          With <code>verbatimModuleSyntax: true</code> in tsconfig, TypeScript enforces using <code>import type</code>
          and <code>export type</code> for type-only imports, preventing accidental runtime dependencies.
        </div>
      </section>

      <!-- SCENARIO 4: Module Augmentation -->
      <section class="scenario">
        <h3>Scenario 4: Module Augmentation & Declaration Merging</h3>
        <div class="explanation">
          <pre><code>// Augment an existing module (e.g., add fields to Express Request)
declare module 'express' &#123;
  interface Request &#123;
    user?: &#123; id: number; role: string &#125;;
    correlationId?: string;
  &#125;
&#125;

// Declaration merging: interfaces with same name merge
interface User &#123;
  id: number;
  name: string;
&#125;
interface User &#123;
  email: string; // merged with above
&#125;
// Resulting User: &#123; id: number; name: string; email: string &#125;

// Namespace merging with class
class Validator &#123;
  validate(input: string): boolean &#123; return input.length > 0; &#125;
&#125;
namespace Validator &#123;
  export const VERSION = '1.0';
  export interface Config &#123; strict: boolean; &#125;
&#125;
// Validator.VERSION, Validator.Config are accessible</code></pre>
        </div>
        <div class="demo-box">
          <h4>Common Angular Module Augmentation Patterns</h4>
          <div class="type-demo">
            <strong>Extending Router data:</strong><br>
            <code>declare module '&#64;angular/router' &#123; interface Route &#123; data?: &#123; title: string; roles: string[] &#125; &#125; &#125;</code><br><br>
            <strong>Global type extensions:</strong><br>
            <code>declare global &#123; interface Window &#123; __APP_CONFIG__: AppConfig &#125; &#125;</code><br><br>
            <strong>Third-party library typing:</strong><br>
            <code>declare module 'untyped-library' &#123; export function doStuff(): void; &#125;</code>
          </div>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "What types of declarations can be merged in TypeScript?"<br>
          <strong>A:</strong>
          (1) <strong>Interface + Interface</strong>: properties are merged (later declarations win for same-name props with different types — this causes an error).
          (2) <strong>Namespace + Namespace</strong>: exported members are merged.
          (3) <strong>Class + Namespace</strong>: adds static properties to the class.
          (4) <strong>Function + Namespace</strong>: adds properties to the function.
          (5) <strong>Enum + Namespace</strong>: adds members.
          <br>
          NOT mergeable: Class + Class (error), type alias + anything.
          <br><br>
          <strong>Twisted Q:</strong> "What is the difference between <code>declare module 'x'</code> and <code>declare module './x'</code>?"<br>
          <strong>A:</strong> <code>declare module 'x'</code> (non-relative) augments the module named 'x' from node_modules.
          <code>declare module './x'</code> (relative) augments the specific file. For augmentation to work,
          the file must be a module itself (have at least one <code>import</code> or <code>export</code>).
          Without it, the declare statement creates an <em>ambient</em> module declaration instead of augmenting.
          <br><br>
          <strong>Twisted Q:</strong> "What happens when two interfaces with the same name declare the same property with different types?"<br>
          <strong>A:</strong> TypeScript errors! Declaration merging requires non-function properties to be identical.
          Function properties (methods) with the same name create overloads — later declarations get higher priority.
          This is how Angular's &#64;angular/core and &#64;angular/router can extend each other's interfaces.
        </div>
      </section>

      <!-- SCENARIO 5: Triple-Slash Directives & Global Types -->
      <section class="scenario">
        <h3>Scenario 5: Triple-Slash Directives & Global Types</h3>
        <div class="explanation">
          <pre><code>// Triple-slash directives (top of file only)
/// &lt;reference types="node" /&gt;
/// &lt;reference path="./custom-types.d.ts" /&gt;

// Global type declarations (src/types/global.d.ts)
declare global &#123;
  interface Window &#123;
    __APP_CONFIG__: &#123;
      apiUrl: string;
      version: string;
    &#125;;
  &#125;

  // Add to any module's scope
  type Nullable&lt;T&gt; = T | null | undefined;
  type AsyncData&lt;T&gt; = Promise&lt;T&gt; | T;
&#125;

// .d.ts files for untyped JS libraries
// src/types/legacy-lib.d.ts
declare module 'legacy-lib' &#123;
  export function init(config: &#123; apiKey: string &#125;): void;
  export function track(event: string, data?: Record&lt;string, unknown&gt;): void;
&#125;</code></pre>
        </div>
        <div class="interview-note">
          <strong>Interview Q:</strong> "When do you use triple-slash directives vs imports?"<br>
          <strong>A:</strong> Triple-slash directives are legacy and mostly unnecessary in modern TS. Use cases:
          (1) <code>/// &lt;reference types="..." /&gt;</code> to include global type packages without importing.
          (2) In <code>.d.ts</code> files where <code>import</code> would make it a module (changing semantics).
          In regular <code>.ts</code> files, always prefer <code>import</code>.
          <br><br>
          <strong>Twisted Q:</strong> "What is the difference between a <code>.d.ts</code> file with and without <code>export</code>?"<br>
          <strong>A:</strong> Without any <code>import</code>/<code>export</code>, a <code>.d.ts</code> is a <em>script</em> —
          its declarations are global (ambient). With <code>import</code>/<code>export</code>, it becomes a <em>module</em> —
          declarations are scoped and must be explicitly exported. To declare global types FROM a module file,
          wrap them in <code>declare global &#123; ... &#125;</code>.
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
    .type-demo { font-size: 0.9rem; line-height: 1.8; }
    .type-result { color: #66bb6a; font-weight: bold; }
    .error { color: #ef5350; font-weight: bold; }
    .interview-note { margin-top: 1rem; padding: 1rem; background: #1b1b2f; border-left: 3px solid #ff9800; border-radius: 0 6px 6px 0; font-size: 0.9rem; line-height: 1.6; }
    .interview-note strong { color: #ffb74d; }
  `],
})
export class ModuleResolutionComponent {}
