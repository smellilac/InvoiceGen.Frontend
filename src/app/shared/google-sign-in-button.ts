import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../core/auth.service';
import { environment } from '../../environments/environment';

/**
 * Renders Google Identity Services' own "Continue with Google" button and,
 * on a successful credential callback, exchanges the returned Google ID token
 * for this app's token pair via {@link AuthService.googleSignIn} — the same
 * token storage the email/password flow uses. Emits {@link success} so the
 * host page can navigate to its own post-login destination.
 *
 * The GSI script is loaded once in index.html; this component waits for the
 * global `google.accounts.id` to be ready before initializing. Failures
 * (verification rejected, network, or the script never loading) surface
 * through the shared snackbar, never a native alert.
 */
@Component({
  selector: 'app-google-sign-in-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #buttonHost class="google-button-host"></div>`,
  styles: `
    .google-button-host {
      display: flex;
      justify-content: center;
      min-height: 40px;
    }
  `,
})
export class GoogleSignInButton {
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after tokens are stored, so the host can navigate like a normal login. */
  readonly success = output<void>();

  private readonly buttonHost = viewChild.required<ElementRef<HTMLDivElement>>('buttonHost');

  constructor() {
    // afterNextRender: browser-only, and runs once the host <div> exists so
    // Google can render its button into it.
    afterNextRender(() => void this.initialize());
  }

  private async initialize(): Promise<void> {
    const google = await this.waitForGsi();
    if (!google) {
      // The GSI script never became available (blocked, offline, etc.). Leave
      // the page fully usable on email/password and just tell the user.
      this.showError('Google sign-in is unavailable right now. Please use email/password.');
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => void this.handleCredential(response),
    });

    const host = this.buttonHost().nativeElement;
    // GSI requires a pixel width in [200, 400]; size to the container when we can.
    const measured = Math.round(host.getBoundingClientRect().width);
    const width = measured > 0 ? Math.min(400, Math.max(200, measured)) : 320;

    google.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
    });
  }

  private async handleCredential(response: GoogleCredentialResponse): Promise<void> {
    const idToken = response?.credential;
    if (!idToken) {
      this.showError();
      return;
    }

    try {
      await this.auth.googleSignIn(idToken);
      this.success.emit();
    } catch {
      // Any failure (401 unverifiable token, 422 unverified email, 429, network)
      // gets the same user-facing message — the specifics aren't actionable here.
      this.showError();
    }
  }

  private showError(
    message = 'Google sign-in failed, please try again or use email/password.',
  ): void {
    this.snackBar.open(message, 'Dismiss', { duration: 6000 });
  }

  /**
   * Resolves with the GSI global once it's ready, or null if it hasn't loaded
   * within the timeout. The script is tagged `async defer`, so it may not be
   * present when this component mounts.
   */
  private waitForGsi(timeoutMs = 10000): Promise<GoogleAccounts | null> {
    return new Promise((resolve) => {
      const ready = readGsi();
      if (ready) {
        resolve(ready);
        return;
      }

      const start = Date.now();
      const timer = setInterval(() => {
        const google = readGsi();
        if (google) {
          clearInterval(timer);
          resolve(google);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);

      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}

function readGsi(): GoogleAccounts | null {
  const google = (window as unknown as { google?: GoogleAccounts }).google;
  return google?.accounts?.id ? google : null;
}

// --- Minimal typings for the subset of Google Identity Services we use. ---

interface GoogleCredentialResponse {
  /** The ID token JWT to hand to the backend. */
  credential: string;
  select_by?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

interface GoogleAccounts {
  accounts: {
    id: {
      initialize(config: GoogleIdConfiguration): void;
      renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
      cancel(): void;
    };
  };
}
