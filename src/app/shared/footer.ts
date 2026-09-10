import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  template: `
    <footer class="app-footer">
      <span class="footer-copy">© {{ year }} Invoice-Gen</span>
      <nav class="footer-links" aria-label="Footer">
        <a routerLink="/privacy">Privacy Policy</a>
        <a routerLink="/terms">Terms of Service</a>
        <a routerLink="/help">Help</a>
        <a href="mailto:axenpartnership@gmail.com">Contact</a>
      </nav>
    </footer>
  `,
  styles: `
    .app-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      padding: 0.75rem 1.5rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }

    // The links are grouped in their own nav so they read as a set beside the
    // copyright, and wrap together on narrow viewports rather than overflowing.
    .footer-links {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
    }

    .footer-links a {
      color: inherit;
      text-decoration: none;
    }

    .footer-links a:hover,
    .footer-links a:focus-visible {
      text-decoration: underline;
    }
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
