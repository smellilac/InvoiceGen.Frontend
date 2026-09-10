import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { Logo } from '../../../shared/logo';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    Logo,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * A one-off confirmation shown when the user lands here right after deleting
   * their account (`/login?deleted=1`), so the redirect isn't a contextless dump
   * back at the sign-in screen. Read once from the entry snapshot.
   */
  protected readonly notice = signal<string | null>(
    this.route.snapshot.queryParamMap.get('deleted') === '1'
      ? 'Your account has been permanently deleted.'
      : null,
  );

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    try {
      await this.auth.login(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(messageForLoginError(error));
    } finally {
      this.submitting.set(false);
    }
  }
}

function messageForLoginError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // A locked account currently also surfaces as a 401 (see docs/authentication.md).
    if (error.status === 401) {
      return 'Incorrect email or password.';
    }
    if (error.status === 429) {
      return 'Too many attempts. Please try again shortly.';
    }
    if (error.status === 0) {
      return 'Something went wrong. Please try again in a minute.';
    }
  }
  return 'Something went wrong. Please try again.';
}
