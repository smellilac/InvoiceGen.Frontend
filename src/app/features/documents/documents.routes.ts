import { Routes } from '@angular/router';

/**
 * Routes owned by the documents feature. These are spread into the protected
 * `MainLayout` parent route in `app.routes.ts` (which carries the auth guard for
 * all its children), so they don't repeat the guard here. The picker itself
 * lives at `/`, also under that parent.
 */
export const DOCUMENTS_ROUTES: Routes = [
  {
    path: 'documents',
    loadComponent: () => import('./list/document-list').then((m) => m.DocumentList),
  },
  {
    // Must stay above `documents/:id` so "new" isn't captured as an id.
    path: 'documents/new',
    loadComponent: () => import('./create/document-create').then((m) => m.DocumentCreate),
  },
  {
    // Comes after `documents/new` so the literal path wins over this param route.
    path: 'documents/:id',
    loadComponent: () => import('./detail/document-detail').then((m) => m.DocumentDetail),
  },
];
