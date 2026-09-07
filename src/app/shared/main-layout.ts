import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { Logo } from './logo';

/**
 * Persistent shell for every protected route. Renders the app-wide navigation
 * header (logo + primary links + Log out) once and hosts the active page in a
 * `<router-outlet />` below it, so no feature page has to draw its own header.
 * Wired as the parent route around all protected children in `app.routes.ts`.
 */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    Logo,
  ],
  template: `
    <mat-toolbar class="app-nav">
      <a class="nav-logo" routerLink="/" aria-label="Invoice-Gen home">
        <app-logo />
      </a>

      <span class="nav-spacer"></span>

      <nav class="nav-links" aria-label="Primary">
        <a mat-button routerLink="/documents" routerLinkActive="nav-link-active">Documents</a>
        <a mat-button routerLink="/customers" routerLinkActive="nav-link-active">Customers</a>
        <a mat-button routerLink="/profile" routerLinkActive="nav-link-active">Profile</a>
      </nav>

      <button mat-stroked-button class="logout-button" type="button" (click)="logout()">
        Log out
      </button>
    </mat-toolbar>

    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #f8f9fc;
    }

    .app-nav {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      height: 100px;
      padding: 0 2.25rem;
      background: #ffffff;
      border-bottom: 1px solid #e6e8f0;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .nav-logo {
      display: inline-flex;
      align-items: center;
      line-height: 0;
      /* Larger branding (wordmark + tagline) sized to the taller header. */
      --app-logo-height: 68px;
    }

    .nav-spacer {
      flex: 1 1 auto;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      a {
        --mdc-text-button-container-height: 44px;
        color: #4b5563;
        font-weight: 500;
        font-size: 1.0625rem;
        border-radius: 8px;
      }

      .nav-link-active {
        color: #3f51b5;
        font-weight: 600;
        background: #eef1fe;
      }
    }

    /* Secondary action: kept as an outlined pill so it reads as distinct from
       the nav links, but with a muted colour, light hairline outline, and
       regular weight so it no longer outweighs them. */
    .logout-button {
      --mdc-outlined-button-label-text-color: #6b7280;
      --mdc-outlined-button-outline-color: #d7dae4;
      --mdc-outlined-button-outline-width: 1px;
      --mdc-outlined-button-container-height: 40px;
      color: #6b7280;
      border-radius: 8px;
      font-weight: 500;
      font-size: 1.0625rem;
      padding: 0 1.25rem;
    }

    @media (max-width: 600px) {
      /* Wrap instead of clipping: logo on top, nav + Log out on a second row. */
      .app-nav {
        flex-wrap: wrap;
        height: auto;
        min-height: 80px;
        row-gap: 0.5rem;
        column-gap: 0.5rem;
        padding: 0.75rem 1rem;
      }

      .nav-logo {
        --app-logo-height: 46px;
      }

      .nav-spacer {
        flex-basis: 100%;
        height: 0;
      }

      .nav-links {
        gap: 0.15rem;

        a {
          min-width: 0;
          padding: 0 0.5rem;
        }
      }
    }
  `,
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
