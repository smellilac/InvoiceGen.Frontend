import { inject } from '@angular/core';

import { AuthService } from './auth.service';

/**
 * App startup hook. Because the access token lives only in memory, a fresh page
 * load always begins unauthenticated even for a user with a valid refresh token
 * in localStorage. Here we silently refresh before any guarded route renders, so
 * a reload stays invisible in the normal case and falls through to /login if the
 * stored refresh token is expired or revoked. See docs/authentication.md.
 *
 * Runs in an injection context via `provideAppInitializer`, so `inject()` works.
 */
export function initializeAuth(): Promise<void> {
  // The restore logic lives on AuthService so the route guard can await the very
  // same (memoized) promise and never decide before the refresh has settled.
  return inject(AuthService).restoreSession();
}
