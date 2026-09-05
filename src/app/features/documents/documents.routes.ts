import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth.guard';

/**
 * Routes owned by the documents feature. The picker itself lives at `/` and is
 * wired in `app.routes.ts`; these are the deeper document routes.
 */
export const DOCUMENTS_ROUTES: Routes = [
  {
    path: 'documents',
    canActivate: [authGuard],
    loadComponent: () => import('./list/document-list').then((m) => m.DocumentList),
  },
  {
    // Must stay above `documents/:id` so "new" isn't captured as an id.
    path: 'documents/new',
    canActivate: [authGuard],
    loadComponent: () => import('./create/document-create').then((m) => m.DocumentCreate),
  },
  {
    path: 'documents/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./detail/document-detail').then((m) => m.DocumentDetail),
  },
];
