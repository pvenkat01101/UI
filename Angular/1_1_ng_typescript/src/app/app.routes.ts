import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'advanced-types',
    loadComponent: () => import('./components/advanced-types/advanced-types').then(m => m.AdvancedTypesComponent),
  },
  {
    path: 'generics',
    loadComponent: () => import('./components/generics/generics').then(m => m.GenericsComponent),
  },
  {
    path: 'decorators',
    loadComponent: () => import('./components/decorators/decorators').then(m => m.DecoratorsComponent),
  },
  {
    path: 'type-guards',
    loadComponent: () => import('./components/type-guards/type-guards').then(m => m.TypeGuardsComponent),
  },
  {
    path: 'utility-types',
    loadComponent: () => import('./components/utility-types/utility-types').then(m => m.UtilityTypesComponent),
  },
  {
    path: 'module-resolution',
    loadComponent: () => import('./components/module-resolution/module-resolution').then(m => m.ModuleResolutionComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
