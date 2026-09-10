import { Routes } from '@angular/router';

/**
 * Public informational routes linked from the app-wide footer (see `footer.ts`).
 * Spread into the root route table at the same public tier as the auth routes —
 * no authGuard — so the footer's links resolve for signed-out visitors too. Each
 * page is a minimal standalone placeholder for now; real content replaces the
 * component templates later without any routing changes.
 */
export const LEGAL_ROUTES: Routes = [
  {
    path: 'privacy',
    loadComponent: () => import('./privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'terms',
    loadComponent: () => import('./terms-page').then((m) => m.TermsPage),
  },
  {
    path: 'help',
    loadComponent: () => import('./help-page').then((m) => m.HelpPage),
  },
];
