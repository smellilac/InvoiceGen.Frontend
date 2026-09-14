import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Api } from '../api/api';
import { ApiConfiguration } from '../api/api-configuration';
import { deleteCurrentUser } from '../api/fn/auth/delete-current-user';
import { deleteUserLogo } from '../api/fn/auth/delete-user-logo';
import { getCurrentUser } from '../api/fn/auth/get-current-user';
import { googleSignIn } from '../api/fn/auth/google-sign-in';
import { loginUser } from '../api/fn/auth/login-user';
import { logoutUser } from '../api/fn/auth/logout-user';
import { refreshToken } from '../api/fn/auth/refresh-token';
import { registerUser } from '../api/fn/auth/register-user';
import { updateCurrentUser as updateCurrentUserApi } from '../api/fn/auth/update-current-user';
import { uploadUserLogo } from '../api/fn/auth/upload-user-logo';
import { AuthResponse } from '../api/models/auth-response';
import { TokenPair } from '../api/models/token-pair';
import { UpdateUserRequest } from '../api/models/update-user-request';
import { User } from '../api/models/user';

/**
 * localStorage key for the refresh token — the only piece of auth state that
 * survives a page reload. The access token is deliberately kept in memory
 * only (see docs/authentication.md).
 */
const REFRESH_TOKEN_KEY = 'invoiceapp.refresh_token';

/**
 * Owns the JWT access/refresh pair and the current user. Wraps the generated
 * `/auth/*` client so components never touch the raw HTTP layer.
 * See docs/authentication.md for the storage rules this implements.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly config = inject(ApiConfiguration);

  /** Access token, in memory only. Exposed read-only; mutated via the methods below. */
  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = this._accessToken.asReadonly();

  /** The signed-in user, when known. Refresh responses don't carry it, so it survives a silent refresh. */
  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  /** True whenever there's an access token in memory. */
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  /** Whether a refresh token is sitting in localStorage — used by the bootstrap initializer. */
  hasStoredRefreshToken(): boolean {
    return this.readRefreshToken() !== null;
  }

  /** Memoizes the one-time startup restore so every caller awaits the same result. */
  private sessionRestore: Promise<void> | null = null;

  /**
   * Restore a session on app start when possible: if a refresh token is stored
   * but there's no in-memory access token (a fresh page load), silently exchange
   * it for a new pair. Idempotent — the work runs at most once and all callers
   * (the bootstrap initializer and the route guard) await the same promise, so
   * the guard never decides before this has settled. A failure leaves the
   * session cleared, and the guard falls through to /login.
   */
  restoreSession(): Promise<void> {
    return (this.sessionRestore ??= this.runRestore());
  }

  private async runRestore(): Promise<void> {
    if (this.hasStoredRefreshToken() && !this.accessToken()) {
      // Swallow failures: refresh() already clears the session on error, and a
      // bad/expired stored token just means the guard sends the user to /login.
      await this.refresh().catch(() => undefined);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const response = await this.api.invoke(loginUser, { body: { email, password } });
    this.applyAuthResponse(response);
  }

  async register(email: string, password: string, businessName?: string): Promise<void> {
    const response = await this.api.invoke(registerUser, {
      body: { email, password, business_name: businessName },
    });
    this.applyAuthResponse(response);
  }

  /**
   * Exchange a Google Sign-In ID token (a JWT obtained from Google Identity
   * Services on the client) for this app's token pair via `POST /auth/google`.
   * The backend verifies the token server-side and creates, links, or logs in
   * the matching account, returning the SAME `AuthResponse` shape as login — so
   * we store the tokens and user exactly the way {@link login} does.
   */
  async googleSignIn(idToken: string): Promise<void> {
    const response = await this.api.invoke(googleSignIn, { body: { id_token: idToken } });
    this.applyAuthResponse(response);
  }

  /**
   * Revoke the refresh token server-side, then clear local state. The local
   * clear always happens, even if the server call fails — a failed logout must
   * not leave the user stranded "logged in" client-side.
   */
  async logout(): Promise<void> {
    const refresh = this.readRefreshToken();
    try {
      if (refresh) {
        await this.api.invoke(logoutUser, { body: { refresh_token: refresh } });
      }
    } catch {
      // Ignore: we still clear local state below regardless of the server outcome.
    } finally {
      this.clearSession();
    }
  }

  /**
   * `DELETE /auth/me` — permanently delete the signed-in user's account. On a
   * successful `204` the backend has soft-deleted the user together with their
   * documents and customers and revoked every refresh token, so we clear local
   * auth state exactly the way {@link logout} does (drop the in-memory access
   * token, remove the refresh token from localStorage).
   *
   * Deliberately mirrors nothing of logout's "clear regardless" behaviour: the
   * clear happens only if the call resolves. On any failure the error propagates
   * with local state left intact, so a failed delete never strands the user
   * logged out with their account still live.
   */
  async deleteAccount(): Promise<void> {
    await this.api.invoke(deleteCurrentUser);
    this.clearSession();
  }

  /**
   * Exchange the stored refresh token for a fresh pair. On any failure the whole
   * session is cleared and the error re-thrown, so callers (interceptor, bootstrap)
   * can fall through to the login flow.
   */
  async refresh(): Promise<void> {
    const refresh = this.readRefreshToken();
    if (!refresh) {
      this.clearSession();
      throw new Error('No refresh token available');
    }
    try {
      const tokens = await this.api.invoke(refreshToken, { body: { refresh_token: refresh } });
      this.applyTokens(tokens);
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  /**
   * Reactive resource for `GET /auth/me`, the signed-in user's business profile.
   * The URL is composed from the generated `getCurrentUser.PATH` so it stays in
   * sync with the spec. The profile page uses this rather than {@link currentUser}
   * because the in-memory user is only set on login/register — a silent
   * `/auth/refresh` returns just a token pair — so after a reload it can be stale
   * or absent. Must be created from an injection context (a component field).
   *
   * Pass an `enabled` predicate to keep the resource idle (no request) while it
   * returns false — the guest document form uses this so an unauthenticated
   * visitor never fires `GET /auth/me` (which would 401). Omit it and the
   * resource always loads, as the profile page relies on.
   */
  currentUserResource(enabled?: () => boolean) {
    return httpResource<User>(() =>
      enabled && !enabled() ? undefined : `${this.config.rootUrl}${getCurrentUser.PATH}`,
    );
  }

  /**
   * `PATCH /auth/me`. On `200`, updates the in-memory {@link currentUser} with the
   * server's response so the nav bar and any other consumer reflect the change
   * immediately without a reload, then resolves with the updated `User`.
   */
  async updateCurrentUser(body: UpdateUserRequest): Promise<User> {
    const user = await this.api.invoke(updateCurrentUserApi, { body });
    this._currentUser.set(user);
    return user;
  }

  /**
   * `POST /auth/me/logo` — upload a logo image (multipart). The backend stores the
   * bytes server-side and returns the updated `User` with `logo_url` pointing at a
   * short, browser-loadable retrieval URL; this persists immediately (independent of
   * {@link updateCurrentUser}). Updates the in-memory user so the nav/preview reflect
   * it right away.
   */
  async uploadLogo(file: File): Promise<User> {
    const user = await this.api.invoke(uploadUserLogo, { body: { file } });
    this._currentUser.set(user);
    return user;
  }

  /** `DELETE /auth/me/logo` — remove the stored logo and clear `logo_url`. Returns the updated `User`. */
  async deleteLogo(): Promise<User> {
    const user = await this.api.invoke(deleteUserLogo);
    this._currentUser.set(user);
    return user;
  }

  private applyAuthResponse(response: AuthResponse): void {
    this.applyTokens(response);
    if (response.user) {
      this._currentUser.set(response.user);
    }
  }

  private applyTokens(tokens: TokenPair): void {
    this._accessToken.set(tokens.access_token ?? null);
    if (tokens.refresh_token) {
      this.writeRefreshToken(tokens.refresh_token);
    }
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    this.removeRefreshToken();
  }

  private readRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private writeRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  private removeRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
