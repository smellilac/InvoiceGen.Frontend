import { Routes } from '@angular/router';

/**
 * Protected routes owned by the documents feature. Spread into the guarded
 * subtree in `app.routes.ts` (which carries the auth guard for all its
 * children), so they don't repeat the guard here.
 *
 * Note `documents/new` (the create form) is deliberately NOT here — it's public
 * (the guest "try before you sign up" flow) and is declared above the guarded
 * subtree in `app.routes.ts`. The picker itself lives at `/`, also public.
 */
export const DOCUMENTS_ROUTES: Routes = [
  {
    path: 'documents',
    loadComponent: () => import('./list/document-list').then((m) => m.DocumentList),
  },
  {
    path: 'documents/:id',
    loadComponent: () => import('./detail/document-detail').then((m) => m.DocumentDetail),
  },
];
