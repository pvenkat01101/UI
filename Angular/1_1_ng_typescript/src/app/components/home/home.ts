import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface TopicCard {
  title: string;
  route: string;
  description: string;
  subtopics: string[];
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <header class="hero">
        <h1>TypeScript Deep Dive</h1>
        <p class="subtitle">Phase 1, Topic 1 — Angular Interview Preparation (10+ Years Senior Role)</p>
        <p class="description">
          Comprehensive practical exploration of TypeScript features critical for Angular development.
          Each section includes theory, multiple scenarios, API integration, and interview questions.
        </p>
      </header>

      <section class="topics-grid">
        @for (topic of topics; track topic.route) {
          <a [routerLink]="topic.route" class="topic-card">
            <h3>{{ topic.title }}</h3>
            <p>{{ topic.description }}</p>
            <ul>
              @for (sub of topic.subtopics; track sub) {
                <li>{{ sub }}</li>
              }
            </ul>
          </a>
        }
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem;
    }

    .hero {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 12px;
      color: #e0e0e0;
    }

    .hero h1 {
      font-size: 2.2rem;
      margin: 0 0 0.5rem;
      color: #fff;
    }

    .subtitle {
      font-size: 1rem;
      color: #64b5f6;
      margin: 0 0 1rem;
    }

    .description {
      font-size: 0.95rem;
      color: #b0bec5;
      max-width: 700px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .topics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .topic-card {
      display: block;
      padding: 1.5rem;
      background: #1e1e2e;
      border: 1px solid #333;
      border-radius: 10px;
      text-decoration: none;
      color: #e0e0e0;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }

    .topic-card:hover {
      transform: translateY(-3px);
      border-color: #64b5f6;
      box-shadow: 0 6px 20px rgba(100, 181, 246, 0.15);
    }

    .topic-card h3 {
      margin: 0 0 0.5rem;
      color: #90caf9;
      font-size: 1.15rem;
    }

    .topic-card p {
      font-size: 0.85rem;
      color: #999;
      margin: 0 0 0.75rem;
      line-height: 1.5;
    }

    .topic-card ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .topic-card li {
      font-size: 0.75rem;
      background: #2a2a3e;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      color: #aaa;
    }
  `],
})
export class HomeComponent {
  topics: TopicCard[] = [
    {
      title: '1. Advanced Types',
      route: '/advanced-types',
      description: 'Union, intersection, conditional types, discriminated unions, template literal types, and mapped types in real Angular scenarios.',
      subtopics: ['Union Types', 'Intersection', 'Conditional', 'Discriminated Unions', 'Template Literals'],
    },
    {
      title: '2. Generics & Constraints',
      route: '/generics',
      description: 'Generic services, constrained types, mapped types, generic components, and real-world patterns used in Angular.',
      subtopics: ['Generic Services', 'Constraints', 'Mapped Types', 'Generic Components', 'State Store'],
    },
    {
      title: '3. Decorators & Metadata',
      route: '/decorators',
      description: 'Custom decorators, metadata reflection, how Angular uses decorators internally, and practical decorator patterns.',
      subtopics: ['Class Decorators', 'Method Decorators', 'Property Decorators', 'Angular Internals'],
    },
    {
      title: '4. Type Guards & Narrowing',
      route: '/type-guards',
      description: 'typeof, instanceof, custom type guards, discriminated unions, assertion functions, and API validation patterns.',
      subtopics: ['typeof', 'instanceof', 'Custom Guards', 'Assertion Functions', 'API Validation'],
    },
    {
      title: '5. Utility Types',
      route: '/utility-types',
      description: 'Partial, Pick, Omit, Record, Required, Readonly, custom utility types, and combining them for real patterns.',
      subtopics: ['Partial', 'Pick/Omit', 'Record', 'Required/Readonly', 'Custom Utility Types'],
    },
    {
      title: '6. Module Resolution',
      route: '/module-resolution',
      description: 'Node vs Classic resolution, path mapping, barrel exports, module augmentation, and declaration merging.',
      subtopics: ['Node Resolution', 'Path Mapping', 'Barrel Exports', 'Module Augmentation'],
    },
  ];
}
