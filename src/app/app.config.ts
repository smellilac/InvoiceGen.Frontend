import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideApiConfiguration } from './api/api-configuration';
import { authInterceptor } from './core/auth.interceptor';
import { initializeAuth } from './core/auth.bootstrap';
import { AnalyticsService } from './core/analytics.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Scroll to the top of the page on forward navigation (and restore the
    // prior position on back/forward), instead of carrying the previous page's
    // scroll offset into the new one. Applied router-wide so it's correct for
    // every navigation, not patched per page. `anchorScrolling` lets in-page
    // `#fragment` links (e.g. within the long legal pages) jump to their target.
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideApiConfiguration(environment.apiBaseUrl),
    provideAppInitializer(initializeAuth),
    // Start GA4 page-view tracking on router navigations. No-ops outside
    // production — see AnalyticsService.
    provideAppInitializer(() => inject(AnalyticsService).init()),
  ],
};
