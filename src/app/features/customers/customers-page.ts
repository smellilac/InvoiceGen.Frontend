import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the Customers feature (route `/customers`). The nav links here
 * already so navigation is complete; the real list/create/edit UI lands with the
 * customers feature (see docs/architecture.md).
 */
@Component({
  selector: 'app-customers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="placeholder-page">
      <h1>Customers</h1>
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
export class CustomersPage {}
