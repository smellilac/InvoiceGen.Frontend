import { Routes } from '@angular/router';

import { AUTH_ROUTES } from './features/auth/auth.routes';
import { CUSTOMERS_ROUTES } from './features/customers/customers.routes';
import { DOCUMENTS_ROUTES } from './features/documents/documents.routes';
import { LEGAL_ROUTES } from './features/legal/legal.routes';
import { authGuard } from './core/auth.guard';
import { MainLayout } from './shared/main-layout';

export const routes: Routes = [
  ...AUTH_ROUTES,
  ...LEGAL_ROUTES,
  {
    // Persistent shell for every protected route: MainLayout draws the app-wide
    // header/nav once and hosts each page in its `<router-outlet />`. The guard
    // sits on the parent so all children inherit it — no per-child guard needed.
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/documents/picker/document-picker').then((m) => m.DocumentPicker),
      },
      ...DOCUMENTS_ROUTES,
      ...CUSTOMERS_ROUTES,
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
