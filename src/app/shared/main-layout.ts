import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { Logo } from './logo';

/**
 * Persistent shell for the whole app. Renders the app-wide navigation header
 * (logo + primary links + a right-hand auth slot) once and hosts the active
 * page in a `<router-outlet />` below it, so no feature page draws its own
 * header. Wired as the parent route around every child in `app.routes.ts`.
 *
 * The primary nav is identical for guests and signed-in users — so the app
 * never looks like it has fewer features when signed out. Account-only areas
 * carry a small lock for guests; clicking one still hits the auth guard, which
 * redirects to /login (unchanged). Only the right-hand slot varies with auth
 * state: Log in / Sign up for a guest, Log out for a signed-in user.
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
    MatIconModule,
    Logo,
  ],
  template: `
    <mat-toolbar class="app-nav">
      <a class="nav-logo" routerLink="/" aria-label="Invoice-Gen home">
        <app-logo />
      </a>

      <span class="nav-spacer"></span>

      <nav class="nav-links" aria-label="Primary">
        @for (item of navItems; track item.link) {
          <a mat-button [routerLink]="item.link" routerLinkActive="nav-link-active">
            {{ item.label }}
            @if (item.gated && !isAuthenticated()) {
              <mat-icon
                class="nav-lock"
                fontSet="material-symbols-outlined"
                aria-label="requires an account"
                >lock</mat-icon
              >
            }
          </a>
        }
      </nav>

      @if (isAuthenticated()) {
        <button mat-stroked-button class="logout-button" type="button" (click)="logout()">
          Log out
        </button>
      } @else {
        <a mat-button class="login-button" routerLink="/login" routerLinkActive="nav-link-active">
          Log in
        </a>
        <a mat-flat-button color="primary" class="signup-button" routerLink="/register">
          Sign up
        </a>
      }
    </mat-toolbar>

    <router-outlet />
  `,
  styles: `
    :host {
      /* Fills the space above the shared footer via the root shell's flex
         layout (see styles.scss); no own 100vh, which would push the footer
         below the fold. */
      display: block;
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

    /* Small "gated behind sign-up" cue on account-only nav items, shown only to
       guests. Muted and compact so it reads as a hint, not a warning. */
    .nav-lock {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-left: 0.3rem;
      vertical-align: middle;
      color: #9aa1b1;
    }

    /* Signed-out secondary action: styled to sit next to the Sign up CTA and
       echo the muted nav links rather than compete with the primary button. */
    .login-button {
      --mdc-text-button-container-height: 40px;
      color: #4b5563;
      font-weight: 500;
      font-size: 1.0625rem;
      border-radius: 8px;
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

    /* Primary CTA for signed-out visitors — sized to match the Log out pill it
       replaces so the header keeps the same rhythm across auth states. */
    .signup-button {
      --mdc-filled-button-container-height: 40px;
      border-radius: 8px;
      font-weight: 600;
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

  /** Toggles the right-hand slot (Log in / Sign up vs Log out) and the per-item
   * lock cue. The primary links themselves render the same either way. */
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  /**
   * The shared primary nav — identical for guests and signed-in users. `gated`
   * marks the account-only areas that show a lock for guests and whose route
   * guard redirects an unauthenticated click to /login.
   */
  protected readonly navItems: ReadonlyArray<{ label: string; link: string; gated: boolean }> = [
    { label: 'Documents', link: '/documents', gated: true },
    { label: 'Search', link: '/search', gated: true },
    { label: 'Customers', link: '/customers', gated: true },
    { label: 'Profile', link: '/profile', gated: true },
    { label: 'Help', link: '/help', gated: false },
  ];

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
