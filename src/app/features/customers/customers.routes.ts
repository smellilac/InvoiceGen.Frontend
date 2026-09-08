import { Routes } from '@angular/router';

/**
 * Routes owned by the customers feature. These are spread into the protected
 * `MainLayout` parent route in `app.routes.ts` (which carries the auth guard for
 * all its children), so they don't repeat the guard here.
 *
 * Clicking a customer opens the read-only detail view at `/customers/:id`; its
 * "Edit" action goes to `/customers/:id/edit`, which reuses the create form
 * prefilled for editing. `customers/new` and `customers/:id/edit` stay above the
 * bare `customers/:id` param route so their literal segments win.
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
    path: 'customers/:id/edit',
    loadComponent: () => import('./form/customer-form').then((m) => m.CustomerForm),
  },
  {
    path: 'customers/:id',
    loadComponent: () => import('./detail/customer-detail').then((m) => m.CustomerDetail),
  },
];
