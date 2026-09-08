import { Routes } from '@angular/router';

/**
 * Routes owned by the customers feature. These are spread into the protected
 * `MainLayout` parent route in `app.routes.ts` (which carries the auth guard for
 * all its children), so they don't repeat the guard here.
 *
 * There's no separate detail view: clicking a customer opens the same form the
 * create flow uses, prefilled for editing — so `/customers/:id` is the edit
 * route. `customers/new` stays above `customers/:id` so the literal path wins
 * over the param route.
 */
export const CUSTOMERS_ROUTES: Routes = [
  {
    path: 'customers',
    loadComponent: () => import('./list/customer-list').then((m) => m.CustomerListPage),
  },
  {
    path: 'customers/new',
    loadComponent: () => import('./form/customer-form').then((m) => m.CustomerForm),
  },
  {
    path: 'customers/:id',
    loadComponent: () => import('./form/customer-form').then((m) => m.CustomerForm),
  },
];
