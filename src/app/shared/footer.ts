import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Quiet, app-wide footer rendered once in the root shell (see `app.html`), so it
 * appears on every page — public auth pages and protected routes alike, outside
 * `MainLayout`. Feature-agnostic: it carries the app's own branding
 * ("Invoice-Gen"), never the logged-in user's `business_name` (that field is
 * only for the documents the user generates).
 *
 * The year is computed at construction, not hardcoded, so the copyright line
 * stays current without edits.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="app-footer">
      <span class="footer-copy">© {{ year }} Invoice-Gen</span>
      <a class="footer-contact" href="mailto:dimatega@gmail.com">Contact</a>
    </footer>
  `,
  styles: `
    .app-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 0.75rem 1.5rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }

    .footer-contact {
      color: inherit;
      text-decoration: none;
    }

    .footer-contact:hover,
    .footer-contact:focus-visible {
      text-decoration: underline;
    }
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
