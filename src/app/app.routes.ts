import { Routes } from '@angular/router';

import { AUTH_ROUTES } from './features/auth/auth.routes';
import { CUSTOMERS_ROUTES } from './features/customers/customers.routes';
import { DOCUMENTS_ROUTES } from './features/documents/documents.routes';
import { LEGAL_ROUTES } from './features/legal/legal.routes';
import { SEARCH_ROUTES } from './features/search/search.routes';
import { authGuard } from './core/auth.guard';
import { MainLayout } from './shared/main-layout';

export const routes: Routes = [
  ...AUTH_ROUTES,
  ...LEGAL_ROUTES,
  {
    // Persistent shell for the whole app: MainLayout draws the app-wide
    // header/nav once (adapting it to auth state) and hosts each page in its
    // `<router-outlet />`. The shell itself is public — the guard sits only on
    // the protected subtree below, so the picker and the guest document form
    // render for signed-out visitors too (the "try before you sign up" flow).
    path: '',
    component: MainLayout,
    children: [
      {
        // Public: the document type picker. First screen for everyone, guest or
        // signed-in (see the guest flow in docs/architecture.md).
        path: '',
        loadComponent: () =>
          import('./features/documents/picker/document-picker').then((m) => m.DocumentPicker),
      },
      {
        // Public: the creation form. It branches internally on auth state — a
        // guest posts to `/documents/guest` and downloads the PDF (nothing
        // saved), a signed-in user gets the existing `POST /documents` flow.
        // Must stay above the guarded `documents/:id` so "new" isn't read as an id.
        path: 'documents/new',
        loadComponent: () =>
          import('./features/documents/create/document-create').then((m) => m.DocumentCreate),
      },
      {
        // Everything account-linked stays behind the auth guard, unchanged: the
        // history list, a document's detail page, all customer routes, and the
        // profile. A componentless empty-path group so the guard is declared once
        // and every child inherits it (see docs/authentication.md).
        path: '',
        canActivate: [authGuard],
        children: [
          ...DOCUMENTS_ROUTES,
          ...CUSTOMERS_ROUTES,
          ...SEARCH_ROUTES,
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/profile/profile-page').then((m) => m.ProfilePage),
          },
        ],
      },
      // Unknown URLs fall back to the public picker rather than /login, so a bad
      // link never forces a sign-in. Sits after the guarded group so real
      // protected paths match first.
      { path: '**', redirectTo: '' },
    ],
  },
];
