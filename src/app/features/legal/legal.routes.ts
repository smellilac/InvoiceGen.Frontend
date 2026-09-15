import { Routes } from '@angular/router';

/**
 * Public informational routes linked from the app-wide footer (see `footer.ts`).
 * Spread into the root route table at the same public tier as the auth routes —
 * no authGuard — so the footer's links resolve for signed-out visitors too. Each
 * is a lazy-loaded standalone page sharing one stylesheet (`legal-page.scss`).
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
