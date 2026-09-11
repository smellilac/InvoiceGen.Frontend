import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** One benefit chip: an outlined symbol plus its short label. */
interface PromoBenefit {
  icon: string;
  label: string;
}

/**
 * "Create a free account" promotion shown to unauthenticated visitors wherever a
 * promo banner appears — the documents picker, the guest create form, and the
 * guest post-creation result view. One shared component with a single visual
 * style: a tinted surface, a gift medallion, the four Help-page benefits, and a
 * "Sign up free" CTA.
 *
 * It adapts to the width of its own container (a container query, not the
 * viewport), so it renders consistently everywhere: a slim single-row horizontal
 * banner wherever it has room — the wide picker page and the narrower
 * create/result content column alike, where the benefits simply wrap to two
 * lines to fit. Only at genuinely tight widths (small phones) do the same pieces
 * recompose as a card — a centered medallion + headline block, a full-width
 * divider, a 2×2 benefits grid, and a full-width CTA. Not two variants — one
 * layout that responds to its container.
 *
 * Messaging, CTA target, and the four benefits are the short form of the Help
 * page's "Why use Invoice-Gen?" list, in the same order and voice (see
 * docs/help-page-draft.md). Feature-internal (only the documents picker/create
 * pages use it), so it lives under `features/documents` rather than `shared/`.
 */
@Component({
  selector: 'app-guest-promo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <aside class="promo" aria-label="Benefits of creating an account">
      <div class="promo-main">
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
      </div>
      <a mat-flat-button color="primary" class="promo-cta" routerLink="/register">
        <span>Sign up free</span>
      </a>
    </aside>
  `,
  styles: `
    :host {
      display: block;

      /* The banner queries its own width (a container query), not the viewport,
         so it lays out correctly whether it sits on the wide picker page or
         inside the narrower create/result column. */
      container-type: inline-size;

      /* Shared design tokens. */
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

      /* Wide layout (default): slim single-row horizontal banner — medallion +
         headline on the left, a vertical divider, the benefits in one row, then
         the CTA on the right. */
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
    }

    .promo-main {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .promo-head {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      /* Natural width, never squeezed. The title is nowrap, so allowing the head
         to shrink (min-width: 0) let it overflow onto the divider/benefits — the
         overlap we're fixing. The benefits block is the flexible part instead. */
      flex: 0 0 auto;
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

    .promo-title {
      margin: 0;
      color: var(--promo-ink);
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.3;
      white-space: nowrap; /* headline stays on one line in the horizontal row */
    }

    .promo-sub {
      margin: 0.125rem 0 0;
      color: var(--promo-muted);
      font-size: 0.875rem;
      line-height: 1.35;
    }

    .promo-divider {
      flex: 0 0 auto;
      background: var(--promo-divider);
      border-radius: 1px;
      align-self: stretch;
      width: 1px;
      margin: 0.125rem 0;
    }

    .promo-benefits {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      /* Single row on the wide picker, where all four fit beside the head and
         CTA. The narrower create/result column swaps this to a compact 2×2 grid
         via the container query below, so the row never has to overflow. */
      flex-wrap: nowrap;
      gap: 0.375rem 0.625rem;

      li {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--promo-benefit);
        font-size: 0.8rem;
        white-space: nowrap;
      }

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: var(--promo-benefit-icon);
      }
    }

    .promo-cta {
      flex: 0 0 auto;
      --mdc-filled-button-container-height: 40px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0;
    }

    /* Medium (the create/result content column, ~48rem): all four benefits won't
       fit on one line beside the head and CTA without crowding, so lay them out
       as a compact 2×2 grid. The banner stays a horizontal row — medallion +
       headline on the left, the 2×2 benefits, the CTA on the right — just with
       the benefits stacked two-deep. The wider picker (~57rem) keeps the single
       row above this breakpoint. */
    @container (max-width: 52rem) {
      .promo-benefits {
        display: grid;
        grid-template-columns: auto auto;
        gap: 0.375rem 0.875rem;
      }
    }

    /* Narrow (small phones): the horizontal row no longer fits at all, so the
       banner recomposes as a stacked card — a centered medallion + headline
       block, a full-width divider, the 2×2 benefits grid, and a full-width CTA.
       Same visual language and content, just stacked. */
    @container (max-width: 40rem) {
      .promo {
        flex-direction: column;
        align-items: stretch;
        gap: 0.875rem;
        padding: 1.25rem 1.25rem 1.375rem;
      }

      .promo-main {
        flex-direction: column;
        align-items: center;
        gap: 0.875rem;
      }

      .promo-head {
        justify-content: center;
      }

      .promo-title {
        white-space: normal;
      }

      .promo-divider {
        align-self: stretch;
        width: 100%;
        height: 1px;
        margin: 0;
      }

      .promo-benefits {
        /* Content-sized columns (not 1fr) so the grid shrinks to its two columns
           of icon+label pairs; align-self centers that block within the card. */
        display: grid;
        grid-template-columns: auto auto;
        gap: 0.625rem 1rem;
        align-self: center;

        li {
          font-size: 0.75rem;
        }
      }

      .promo-cta {
        width: 100%;
        justify-content: center;
      }
    }
  `,
})
export class GuestPromoBanner {
  /** The four benefits (order matches the Help page). */
  protected readonly benefits: PromoBenefit[] = [
    { icon: 'history', label: 'Document history' },
    { icon: 'group', label: 'Saved customers' },
    { icon: 'badge', label: 'Business profile' },
    { icon: 'mail', label: 'Email sending' },
  ];
}
