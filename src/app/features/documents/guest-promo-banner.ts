import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** One benefit chip: an outlined symbol plus its short label. */
interface PromoBenefit {
  icon: string;
  label: string;
}

/**
 * "Create a free account" promotion shown to unauthenticated visitors on the
 * picker and the guest document form. One reusable component, two layout
 * variants that share the same visual language (tinted surface, gift medallion,
 * radius, typography, iconography, CTA, spacing tokens, and the text/benefits
 * divider):
 *
 * - `full` (default) — a slim single-row horizontal banner for wide pages (the
 *   picker): gift medallion + headline/description on the left, a subtle vertical
 *   divider, the benefits in one horizontal row, then the CTA on the right.
 * - `compact` — the same system recomposed for a narrow column (the create
 *   form): medallion + headline/description on top, a horizontal divider, a 2×2
 *   benefits grid, and a full-width CTA. Not a scaled-down `full`.
 *
 * Messaging, CTA target, and the four benefits are unchanged — the short form of
 * the Help page's "Why use Invoice-Gen?" list, in the same order and voice (see
 * docs/help-page-draft.md). Feature-internal (only the documents picker/create
 * pages use it), so it lives under `features/documents` rather than `shared/`.
 */
@Component({
  selector: 'app-guest-promo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    @if (variant() === 'compact') {
      <aside class="promo promo--compact" aria-label="Benefits of creating an account">
        <div class="promo-head">
          <span class="promo-medallion" aria-hidden="true">
            <mat-icon fontSet="material-symbols-outlined">redeem</mat-icon>
          </span>
          <div class="promo-lead">
            <h3 class="promo-title">Create a free account</h3>
            <p class="promo-sub">It's free, no credit card.</p>
          </div>
        </div>
        <span class="promo-divider" aria-hidden="true"></span>
        <ul class="promo-benefits">
          @for (benefit of benefits; track benefit.label) {
            <li>
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{
                benefit.icon
              }}</mat-icon>
              <span>{{ benefit.label }}</span>
            </li>
          }
        </ul>
        <a mat-flat-button color="primary" class="promo-cta" routerLink="/register">
          <span>Sign up free</span>
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">arrow_forward</mat-icon>
        </a>
      </aside>
    } @else {
      <aside class="promo promo--full" aria-label="Benefits of creating an account">
        <div class="promo-main">
          <span class="promo-medallion" aria-hidden="true">
            <mat-icon fontSet="material-symbols-outlined">redeem</mat-icon>
          </span>
          <div class="promo-lead">
            <h3 class="promo-title">Create a free account</h3>
            <p class="promo-sub">It's free, no credit card.</p>
          </div>
          <span class="promo-divider" aria-hidden="true"></span>
          <ul class="promo-benefits">
            @for (benefit of benefits; track benefit.label) {
              <li>
                <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{
                  benefit.icon
                }}</mat-icon>
                <span>{{ benefit.label }}</span>
              </li>
            }
          </ul>
        </div>
        <a mat-flat-button color="primary" class="promo-cta" routerLink="/register">
          <span>Sign up free</span>
        </a>
      </aside>
    }
  `,
  styles: `
    :host {
      display: block;

      /* Shared design tokens — both variants read these so they stay in lockstep. */
      --promo-accent: #4f46e5; /* indigo-600: medallion icon */
      --promo-ink: #1f2340; /* strong heading ink */
      --promo-muted: #5b6478; /* supporting sentence */
      --promo-benefit: #5c6480; /* benefit labels (secondary) */
      --promo-benefit-icon: #9aa3c4; /* muted icons keep benefits secondary */
      --promo-divider: #dbe0f4; /* hairline between text and benefits */
      --promo-radius: 16px;
    }

    .promo {
      /* Very light indigo-tinted surface, a subtle hairline border, and only a
         whisper of shadow — reads as part of the product UI, not an ad. */
      background: linear-gradient(135deg, #f8f9ff 0%, #eef1fe 100%);
      border: 1px solid #e4e8fb;
      border-radius: var(--promo-radius);
      box-shadow: 0 1px 2px rgba(31, 35, 64, 0.04);
    }

    .promo-medallion {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      border-radius: 11px;
      background: #e6e9ff;
      color: var(--promo-accent);

      mat-icon {
        font-size: 23px;
        width: 23px;
        height: 23px;
      }
    }

    .promo-lead {
      min-width: 0;
    }

    .promo-title {
      margin: 0;
      color: var(--promo-ink);
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .promo-sub {
      margin: 0.125rem 0 0;
      color: var(--promo-muted);
      font-size: 0.875rem;
      line-height: 1.35;
    }

    .promo-benefits {
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--promo-benefit);
        font-size: 0.75rem;
        white-space: nowrap;
      }

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: var(--promo-benefit-icon);
      }
    }

    .promo-divider {
      flex: 0 0 auto;
      background: var(--promo-divider);
      border-radius: 1px;
    }

    .promo-cta {
      flex: 0 0 auto;
      --mdc-filled-button-container-height: 40px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0;

      mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        margin: 0 -0.25rem 0 0.375rem;
      }
    }

    /* ---- Variant: slim full-width horizontal banner ---------------------- */
    .promo--full {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
    }

    .promo--full .promo-main {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Keep the headline on one line; it never needs to shrink away for space. */
    .promo--full .promo-title {
      white-space: nowrap;
    }

    .promo--full .promo-divider {
      align-self: stretch;
      width: 1px;
      margin: 0.125rem 0;
    }

    .promo--full .promo-benefits {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.375rem 0.625rem;

      /* Slightly larger benefit labels on the full (picker) banner only — the
         compact variant keeps the base size. nowrap plus the tightened gaps
         above guarantee all four stay on one row at the picker's width. */
      li {
        font-size: 0.8rem;
      }
    }

    /* ---- Variant: compact card ------------------------------------------- */
    .promo--compact {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      padding: 1.25rem 1.25rem 1.375rem;
    }

    .promo--compact .promo-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .promo--compact .promo-divider {
      width: 100%;
      height: 1px;
    }

    .promo--compact .promo-benefits {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem 1rem;
    }

    .promo--compact .promo-cta {
      width: 100%;
      justify-content: center;
    }

    /* The single-row banner only has room for one line of benefits at the
       picker's full width (the picker caps at 60rem, so that's the widest the
       banner ever gets). Below that the benefits can't stay nowrap without
       overflowing, so the full variant stacks: text on top, benefits wrap
       beneath, full-width CTA. The vertical divider is meaningless once stacked. */
    @media (max-width: 60rem) {
      .promo--full {
        flex-direction: column;
        align-items: stretch;
        gap: 0.875rem;
        padding: 1.25rem;
      }

      .promo--full .promo-main {
        flex-wrap: wrap;
        gap: 0.75rem 1rem;
      }

      .promo--full .promo-title {
        white-space: normal;
      }

      .promo--full .promo-divider {
        display: none;
      }

      .promo--full .promo-benefits {
        flex-basis: 100%;
        flex-wrap: wrap;
      }

      .promo--full .promo-cta {
        width: 100%;
        justify-content: center;
      }
    }
  `,
})
export class GuestPromoBanner {
  /** Layout variant: `full` horizontal banner (default) or `compact` card. */
  readonly variant = input<'full' | 'compact'>('full');

  /** The four benefits, shared by both variants (order matches the Help page). */
  protected readonly benefits: PromoBenefit[] = [
    { icon: 'history', label: 'Document history' },
    { icon: 'group', label: 'Saved customers' },
    { icon: 'badge', label: 'Business profile' },
    { icon: 'mail', label: 'Email sending' },
  ];
}
