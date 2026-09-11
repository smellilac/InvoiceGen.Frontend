import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';

import { ValidationErrorResponse } from '../../../api/models/validation-error-response';
import { AuthService } from '../../../core/auth.service';
import { GoogleSignInButton } from '../../../shared/google-sign-in-button';
import { Logo } from '../../../shared/logo';

@Component({
  selector: 'app-register',
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
    GoogleSignInButton,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    businessName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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
    const { businessName, email, password } = this.form.getRawValue();

    try {
      await this.auth.register(email, password, businessName.trim() || undefined);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * The Google button component has already stored the tokens by the time this
   * fires — Google sign-up and sign-in are the same call — so we just land the
   * user on the app home like a completed registration does.
   */
  protected onGoogleSignIn(): void {
    void this.router.navigateByUrl('/');
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 422 && this.applyFieldErrors(error.error)) {
        return;
      }
      if (error.status === 409) {
        this.form.controls.email.setErrors({ taken: true });
        this.errorMessage.set('An account with that email already exists.');
        return;
      }
      if (error.status === 429) {
        this.errorMessage.set('Too many attempts. Please try again shortly.');
        return;
      }
      if (error.status === 0) {
        this.errorMessage.set('Could not reach the server. Check your connection and try again.');
        return;
      }
    }
    this.errorMessage.set('Something went wrong. Please try again.');
  }

  /**
   * Maps a 422 `ValidationErrorResponse` onto the matching form controls. The
   * backend uses snake_case field names; map the ones this form owns. Returns
   * whether at least one field error was applied.
   */
  private applyFieldErrors(body: unknown): boolean {
    if (!isValidationErrorResponse(body)) {
      return false;
    }

    let applied = false;
    for (const field of body.error.fields) {
      const control = this.controlForField(field.field);
      if (control) {
        control.setErrors({ server: field.message ?? 'Invalid value.' });
        applied = true;
      }
    }
    return applied;
  }

  private controlForField(field: string | undefined) {
    switch (field) {
      case 'email':
        return this.form.controls.email;
      case 'password':
        return this.form.controls.password;
      case 'business_name':
        return this.form.controls.businessName;
      default:
        return null;
    }
  }
}

function isValidationErrorResponse(body: unknown): body is ValidationErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ValidationErrorResponse).error === 'object' &&
    Array.isArray((body as ValidationErrorResponse).error.fields)
  );
}
