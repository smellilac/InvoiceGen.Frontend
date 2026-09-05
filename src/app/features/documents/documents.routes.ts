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
];
