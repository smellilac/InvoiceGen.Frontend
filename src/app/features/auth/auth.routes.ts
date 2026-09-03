import { Routes } from '@angular/router';

/**
 * Public auth routes. Owned by the auth feature (folder-per-feature) and spread
 * into the root route table.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
  },
];
