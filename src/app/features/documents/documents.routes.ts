import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth.guard';

/**
 * Routes owned by the documents feature. The picker itself lives at `/` and is
 * wired in `app.routes.ts`; these are the deeper document routes.
 */
export const DOCUMENTS_ROUTES: Routes = [
  {
    path: 'documents/new',
    canActivate: [authGuard],
    loadComponent: () => import('./create/document-create').then((m) => m.DocumentCreate),
  },
  {
    // Must come after `documents/new` so the literal wins over this param route.
    path: 'documents/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./detail/document-detail').then((m) => m.DocumentDetail),
  },
];
