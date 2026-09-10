import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the Terms of Service page (public route `/terms`, linked from
 * the app-wide footer). Intentionally minimal — real copy will be dropped into
 * this template later, no routing or footer changes needed.
 */
@Component({
  selector: 'app-terms-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="legal-page">
      <h1>Terms of Service</h1>
      <p>This page is coming soon.</p>
    </main>
  `,
  styleUrl: './legal-page.scss',
})
export class TermsPage {}
