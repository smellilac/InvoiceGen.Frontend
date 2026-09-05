import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Blocks protected routes for unauthenticated users, redirecting to /login and
 * preserving the attempted URL in `returnUrl` so they land back where they meant
 * to go after signing in. See docs/authentication.md.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for the app-start silent refresh to finish before deciding. Without
  // this the guard could run while the refresh is still pending and wrongly
  // treat a valid (or invalid) session as resolved. Idempotent and memoized.
  await auth.restoreSession();

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
