import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Shared brand logo (icon + wordmark) sized for a page header. Renders the
 * full logo from `src/assets/logo-full.svg`, served at `/assets/` (see
 * `angular.json`). Use `<app-logo />`; position it from the host element.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img class="logo" src="assets/logo-full.svg" alt="InvoiceGen" />`,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }

    .logo {
      display: block;
      height: 96px;
      width: auto;
    }
  `,
})
export class Logo {}
