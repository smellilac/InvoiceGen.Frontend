import { Injectable, computed, inject, signal } from '@angular/core';

import { Api } from '../api/api';
import { loginUser } from '../api/fn/auth/login-user';
import { logoutUser } from '../api/fn/auth/logout-user';
import { refreshToken } from '../api/fn/auth/refresh-token';
import { registerUser } from '../api/fn/auth/register-user';
import { AuthResponse } from '../api/models/auth-response';
import { TokenPair } from '../api/models/token-pair';
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
