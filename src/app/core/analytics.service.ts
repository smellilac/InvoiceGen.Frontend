import { effect, inject, Injectable, Injector } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../../environments/environment';
import { ConsentService } from './consent.service';

/** Minimal shape of the global `gtag` that the injected snippet defines. */
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** GA4 measurement ID for this property. */
const MEASUREMENT_ID = 'G-Q3N1BL0KFG';

/**
 * Loads Google Analytics 4 and reports a `page_view` on every router
 * navigation — but only after the visitor has accepted analytics cookies.
 *
 * Consent-gated: `init()` watches {@link ConsentService}. GA is not loaded and
 * no `gtag.js` request is made until `choice()` is `'accepted'`; declining (or
 * simply not choosing) leaves analytics entirely absent. On a return visit with
 * a stored `'accepted'` choice, GA loads automatically at startup.
 *
 * Also gated on production: in dev (`ng serve`) `init()` returns immediately and
 * nothing is ever loaded or sent, regardless of the stored choice.
 *
 * Privacy: only the in-app path (e.g. `/documents/new`) is sent. Never a user
 * email, document contents, or customer data.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly consent = inject(ConsentService);
  private readonly injector = inject(Injector);

  private booted = false;

  init(): void {
    if (!environment.production) {
      return;
    }

    // React to consent: bootstrap GA once the visitor has accepted (either now,
    // on click, or already-stored on a return visit). Nothing loads while the
    // choice is `null` or `'declined'`. `bootstrap()` is idempotent, so a later
    // change of the signal can't double-load.
    effect(
      () => {
        if (this.consent.choice() === 'accepted') {
          this.bootstrap();
        }
      },
      { injector: this.injector },
    );
  }

  private bootstrap(): void {
    if (this.booted) {
      return;
    }
    this.booted = true;

    // Inject gtag.js dynamically — this is the first network request GA makes,
    // and it only happens here, after consent.
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer ?? [];
    // Mirror the canonical gtag stub: it forwards the raw `arguments` object,
    // which GA reads — an arrow with a rest array would push the wrong shape.
    function gtag(): void {
      window.dataLayer!.push(arguments);
    }
    window.gtag = gtag as Gtag;
    window.gtag('js', new Date());
    // `send_page_view: false`: this is a single-page app, so we forward each
    // navigation ourselves below rather than let GA report only the first load.
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.trackPageView(event.urlAfterRedirects));

    // A return visitor accepts before the initial navigation, so the
    // subscription above catches that first `page_view`. But when the visitor
    // accepts mid-session the app has already navigated, so report the current
    // page once here to avoid missing it.
    if (this.router.navigated) {
      this.trackPageView(this.router.url);
    }
  }

  private trackPageView(path: string): void {
    window.gtag?.('event', 'page_view', { page_path: path });
  }
}
