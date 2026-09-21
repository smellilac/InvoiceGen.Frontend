import { Routes } from '@angular/router';

/**
 * Routes owned by the search feature. Spread into the protected `MainLayout`
 * parent route in `app.routes.ts` (which carries the auth guard for all its
 * children), so it doesn't repeat the guard here — search calls the
 * authenticated `POST /api/search`, so it belongs behind the guard alongside
 * the document history it searches over.
 */
export const SEARCH_ROUTES: Routes = [
  {
    path: 'search',
    loadComponent: () => import('./search-page').then((m) => m.SearchPage),
  },
];
