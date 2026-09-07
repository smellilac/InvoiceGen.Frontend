import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the Profile feature (route `/profile`). The nav links here
 * already so navigation is complete; the real business-profile UI
 * (`GET`/`PATCH /auth/me`) lands with the profile feature (see docs/architecture.md).
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="placeholder-page">
      <h1>Profile</h1>
      <p>This page is coming soon.</p>
    </main>
  `,
  styles: `
    .placeholder-page {
      max-width: 60rem;
      margin: 0 auto;
      padding: 1.5rem;
      box-sizing: border-box;
    }
  `,
})
export class ProfilePage {}
