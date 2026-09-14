import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Endpoints that must never carry a bearer token and must not trigger the
 * refresh-on-401 dance (the refresh call itself lives here, so treating it as
 * public is also what prevents an infinite refresh loop).
 */
const PUBLIC_PATHS = [
  '/auth/register',
  '/auth/login',
  // Google sign-in is unauthenticated (`security: []`): the request carries a
  // Google ID token in its body, not one of our access tokens, so it must get
  // no bearer header and must never trigger the refresh-on-401 retry — the same
  // treatment as the other `/auth/*` entry points here.
  '/auth/google',
  '/auth/refresh',
  '/document-types',
  // The guest document endpoint is unauthenticated (`security: []`): a guest
  // request must carry no bearer token and must never trigger a refresh-retry —
  // it can't 401 for auth reasons, so treating it as public keeps it out of that
  // path entirely. See docs/architecture.md's guest flow.
  '/documents/guest',
];

function isPublicRequest(url: string): boolean {
  let path: string;
  try {
    path = new URL(url, 'http://localhost').pathname;
  } catch {
    path = url;
  }
  return PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`),
  );
}

function withBearerToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) {
    return req;
  }
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Attaches the access token to every non-public request. On a 401 it refreshes
 * once and retries; if that retry also fails (or refresh itself fails) it logs
 * out and redirects to /login. See docs/authentication.md.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPublicRequest(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withBearerToken(req, auth.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // First 401: try to refresh once, then retry the original request with the
      // new token. A second failure here (refresh rejected, or the retry 401s
      // again) falls through to logout + redirect rather than looping.
      return from(auth.refresh()).pipe(
        switchMap(() => next(withBearerToken(req, auth.accessToken()))),
        catchError((retryError: unknown) => {
          void auth.logout();
          void router.navigate(['/login']);
          return throwError(() => retryError);
        }),
      );
    }),
  );
};
