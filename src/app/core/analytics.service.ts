import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../../environments/environment';

/** Minimal shape of the global `gtag` set up by the snippet in `index.html`. */
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/**
 * Reports a GA4 `page_view` on every router navigation. The gtag.js snippet in
 * `index.html` only reports the initial page load; this is a single-page app,
 * so subsequent route changes never reload the page and must be forwarded
 * manually from `NavigationEnd`.
 *
 * Only active in production builds — see the `environment.production` guard,
 * which mirrors the localhost guard on the snippet in `index.html`. In dev
 * (`ng serve`) `init()` returns immediately and nothing is loaded or sent.
 *
 * Privacy: only the in-app path (e.g. `/documents/new`) is sent. Never a user
 * email, document contents, or customer data.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);

  init(): void {
    if (!environment.production) {
      return;
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.trackPageView(event.urlAfterRedirects));
  }

  private trackPageView(path: string): void {
    // `gtag` is defined by the snippet in index.html only outside local dev;
    // guard so a missing global (or an ad-blocker stripping GA) never throws.
    window.gtag?.('event', 'page_view', { page_path: path });
  }
}
