import { Injectable, signal } from '@angular/core';

/** The visitor's stored cookie choice, or `null` when they haven't chosen yet. */
export type ConsentChoice = 'accepted' | 'declined';

/**
 * localStorage key holding the visitor's analytics-cookie choice. Plain UI
 * preference (`"accepted"` / `"declined"`), not sensitive data — see the
 * Privacy Policy page. The value gates whether {@link AnalyticsService} is ever
 * allowed to load Google Analytics.
 */
const STORAGE_KEY = 'cookie_consent';

/**
 * Holds the visitor's cookie-consent decision as a signal, persisted in
 * `localStorage` so it survives reloads and later visits.
 *
 * `choice()` is `null` until the visitor accepts or declines — the cookie
 * banner ({@link CookieConsent}) shows only in that state, and
 * {@link AnalyticsService} loads GA only once `choice()` becomes `'accepted'`.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly _choice = signal<ConsentChoice | null>(this.read());

  /** Reactive current choice; `null` means "not decided yet". */
  readonly choice = this._choice.asReadonly();

  accept(): void {
    this.store('accepted');
  }

  decline(): void {
    this.store('declined');
  }

  private store(choice: ConsentChoice): void {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private-mode/quota failures shouldn't break the UI — the choice still
      // applies for this session via the signal below.
    }
    this._choice.set(choice);
  }

  private read(): ConsentChoice | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'accepted' || stored === 'declined' ? stored : null;
    } catch {
      return null;
    }
  }
}
