import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Placeholder for the Privacy Policy page (public route `/privacy`, linked from
 * the app-wide footer). Intentionally minimal — real copy will be dropped into
 * this template later, no routing or footer changes needed.
 */
@Component({
  selector: 'app-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="legal-page">
      <a class="legal-back" routerLink="/">← Back to Invoice-Gen</a>
      <h1>Privacy Policy</h1>
      <p>This page is coming soon.</p>
    </main>
  `,
  styleUrl: './legal-page.scss',
})
export class PrivacyPage {}
