import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { ConsentService } from '../core/consent.service';

/**
 * Slim consent bar fixed to the bottom of every page (rendered once in the root
 * shell — see `app.html`). It gates analytics cookies: nothing is tracked until
 * the visitor chooses.
 *
 * Shows only while no choice is stored (`ConsentService.choice() === null`).
 * Accepting or declining persists the choice via {@link ConsentService} and
 * hides the bar; the decision then drives whether {@link AnalyticsService} ever
 * loads Google Analytics. Not a modal — the rest of the page stays usable while
 * the bar is visible.
 */
@Component({
  selector: 'app-cookie-consent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule],
  template: `
    @if (visible()) {
      <div class="cookie-consent" role="region" aria-label="Cookie consent">
        <p class="cookie-text">
          We use cookies to understand how visitors use this site.
          <a routerLink="/privacy">See our Privacy Policy.</a>
        </p>
        <div class="cookie-actions">
          <button mat-stroked-button type="button" (click)="decline()">Decline</button>
          <button mat-flat-button color="primary" type="button" (click)="accept()">Accept</button>
        </div>
      </div>
    }
  `,
  styles: `
    .cookie-consent {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--mat-sys-surface-container-high);
      border-top: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-medium);
      box-shadow: var(--mat-sys-level2);
    }

    .cookie-text {
      margin: 0;
      max-width: 60ch;
    }

    .cookie-text a {
      color: var(--mat-sys-primary);
    }

    // Keep the two actions together so they wrap as a unit under the text on
    // narrow viewports rather than splitting across lines.
    .cookie-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: none;
    }

    @media (max-width: 599px) {
      .cookie-consent {
        justify-content: stretch;
      }

      .cookie-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `,
})
export class CookieConsent {
  private readonly consent = inject(ConsentService);

  protected readonly visible = computed(() => this.consent.choice() === null);

  protected accept(): void {
    this.consent.accept();
  }

  protected decline(): void {
    this.consent.decline();
  }
}
