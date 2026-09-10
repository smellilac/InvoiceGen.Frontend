import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the Help page (public route `/help`, linked from the app-wide
 * footer). Intentionally minimal — real copy will be dropped into this template
 * later, no routing or footer changes needed.
 */
@Component({
  selector: 'app-help-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="legal-page">
      <h1>Help</h1>
      <p>This page is coming soon.</p>
    </main>
  `,
  styleUrl: './legal-page.scss',
})
export class HelpPage {}
