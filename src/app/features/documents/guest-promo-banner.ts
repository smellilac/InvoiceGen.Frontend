import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * Compact "sign up to unlock more" banner shown to unauthenticated visitors on
 * the picker and the guest document form, regardless of how many free documents
 * they have left. The four benefits are the short form of the Help page's "Why
 * use Invoice-Gen?" list (kept in the same order and voice — see
 * docs/help-page-draft.md); the fuller phrasing is reserved for the
 * exhausted-attempts gate, where the user is most likely to read it.
 *
 * Feature-internal (used only by the documents picker/create pages), so it lives
 * under `features/documents` rather than `shared/`.
 */
@Component({
  selector: 'app-guest-promo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <aside class="guest-promo" aria-label="Benefits of creating an account">
      <div class="guest-promo-text">
        <p class="guest-promo-lead">Create a free account to unlock:</p>
        <ul class="guest-promo-benefits">
          <li><mat-icon aria-hidden="true">history</mat-icon>Document history</li>
          <li><mat-icon aria-hidden="true">group</mat-icon>Saved customers</li>
          <li><mat-icon aria-hidden="true">badge</mat-icon>Business profile</li>
          <li><mat-icon aria-hidden="true">mail</mat-icon>Email sending</li>
        </ul>
      </div>
      <a mat-flat-button color="primary" class="guest-promo-cta" routerLink="/register">
        Sign up free
      </a>
    </aside>
  `,
  styles: `
    .guest-promo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem 1.5rem;
      padding: 0.875rem 1.25rem;
      background: #eef1fe;
      border: 1px solid #d7ddfb;
      border-radius: 12px;
    }

    .guest-promo-text {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
    }

    .guest-promo-lead {
      margin: 0;
      font-weight: 600;
      color: #303a63;
    }

    .guest-promo-benefits {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        color: #4b5573;
        font-size: 0.9375rem;
      }

      mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        color: #5b6bd6;
      }
    }

    .guest-promo-cta {
      flex: 0 0 auto;
      border-radius: 8px;
      font-weight: 600;
    }

    @media (max-width: 600px) {
      .guest-promo {
        justify-content: stretch;
      }

      .guest-promo-cta {
        flex: 1 1 100%;
      }
    }
  `,
})
export class GuestPromoBanner {}
