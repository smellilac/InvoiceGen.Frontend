import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideApiConfiguration } from './api/api-configuration';
import { authInterceptor } from './core/auth.interceptor';
import { initializeAuth } from './core/auth.bootstrap';

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
    provideApiConfiguration('https://localhost:7201'),
    provideAppInitializer(initializeAuth),
  ],
};
