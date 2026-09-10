import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { UpdateUserRequest } from '../../api/models/update-user-request';
import { User } from '../../api/models/user';
import { ValidationErrorResponse } from '../../api/models/validation-error-response';
import { AuthService } from '../../core/auth.service';
import { DeleteAccountDialog } from './delete-account-dialog';

/**
 * A short list of common ISO 4217 codes for the currency picker. Mirrors the
 * document create form's list so the two stay consistent (see document-create).
 */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'NZD'] as const;

/**
 * Reject uploads larger than this client-side for fast feedback before hitting the
 * network. The backend enforces the same 5 MB cap (and is the authority — it sniffs,
 * downscales, and re-encodes the image server-side).
 */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/**
 * The business-profile page (route `/profile`). Loads the signed-in user via
 * `GET /auth/me` and lets them edit the fields that pre-fill new documents
 * (business name/address, logo, default currency) via `PATCH /auth/me`.
 *
 * It fetches its own copy rather than trusting `AuthService.currentUser()`: that
 * in-memory value is only set on login/register, and a silent `/auth/refresh`
 * carries no user, so after a reload it can be stale or missing. On a successful
 * save it hands the response back to `AuthService` so the nav bar and other
 * consumers update without a reload.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly currencies = CURRENCIES;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Inline error for the "upload from device" path (bad type / too large / rejected by server). */
  protected readonly logoUploadError = signal<string | null>(null);
  /** True while a picked file is uploading to `POST /auth/me/logo`. */
  protected readonly processingLogo = signal(false);

  /** `GET /auth/me`. Drives the read-only header and prefills the form once loaded. */
  protected readonly user = this.auth.currentUserResource();

  protected readonly form = this.fb.group({
    business_name: this.fb.nonNullable.control(''),
    business_address: this.fb.nonNullable.control(''),
    logo_url: this.fb.nonNullable.control(''),
    // Default currency mirrors the create form's picker (a select over CURRENCIES).
    default_currency: this.fb.nonNullable.control('USD'),
  });

  /**
   * The trimmed logo URL as a signal, driving the live preview. The app is
   * zoneless, so the template can't just read `logo_url.value` on each keystroke
   * and expect a re-render — a signal off `valueChanges` gives it reactivity.
   * `patchValue` on prefill emits too, so a saved logo previews on load.
   */
  private readonly logoUrlValue = toSignal(this.form.controls.logo_url.valueChanges, {
    initialValue: this.form.controls.logo_url.value,
  });
  protected readonly logoPreviewUrl = computed(() => this.logoUrlValue().trim());

  /** Guards the one-shot prefill so a later resource emission can't clobber user edits. */
  private prefilled = false;

  constructor() {
    // Prefill the form once `GET /auth/me` resolves. Nullable fields collapse to
    // empty strings so the form never shows "null"; an unknown/absent currency
    // keeps the USD default rather than injecting a value the picker can't show.
    effect(() => {
      const user = this.user.value();
      if (!user || this.prefilled) {
        return;
      }
      this.prefilled = true;
      this.form.patchValue({
        business_name: user.business_name ?? '',
        business_address: user.business_address ?? '',
        logo_url: user.logo_url ?? '',
        default_currency:
          user.default_currency && (CURRENCIES as readonly string[]).includes(user.default_currency)
            ? user.default_currency
            : this.form.controls.default_currency.value,
      });
    });
  }

  /** "Member since <date>" text for the header, or null if the timestamp is missing. */
  protected memberSince(user: User | undefined): string | null {
    return formatMemberSince(user?.created_at);
  }

  /**
   * "Upload from device" handler: validate the picked file, then upload it to
   * `POST /auth/me/logo`. The backend stores the bytes and returns the updated user
   * with `logo_url` set to a short hosted URL, which we feed into the shared
   * `logo_url` control — so the same preview and text field pick it up. This
   * persists the logo immediately (independent of the "Save changes" button, which
   * can't carry the image bytes). The `<input>` is reset afterward so re-picking the
   * same file fires `change` again.
   */
  protected async onLogoFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.processingLogo()) {
      return;
    }

    const validationError = validateLogoFile(file);
    if (validationError) {
      this.logoUploadError.set(validationError);
      return;
    }

    this.logoUploadError.set(null);
    this.processingLogo.set(true);
    try {
      const updated = await this.auth.uploadLogo(file);
      this.applyUser(updated);
      this.snackBar.open('Logo uploaded', 'Dismiss', { duration: 4000 });
    } catch (error) {
      this.logoUploadError.set(logoUploadErrorMessage(error));
    } finally {
      this.processingLogo.set(false);
    }
  }

  /** Removes the stored logo via `DELETE /auth/me/logo` and clears the field. */
  protected async removeLogo(): Promise<void> {
    if (this.processingLogo()) {
      return;
    }
    this.logoUploadError.set(null);
    this.processingLogo.set(true);
    try {
      const updated = await this.auth.deleteLogo();
      this.applyUser(updated);
    } catch {
      this.logoUploadError.set('Could not remove the logo. Please try again.');
    } finally {
      this.processingLogo.set(false);
    }
  }

  /**
   * Reflects a server-returned user into the page: refreshes the header resource and
   * syncs the `logo_url` control (and its preview) with the server's value.
   */
  private applyUser(user: User): void {
    this.user.set(user);
    this.form.controls.logo_url.setValue(user.logo_url ?? '');
    this.form.controls.logo_url.markAsPristine();
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await this.auth.updateCurrentUser(this.buildRequest());
      // AuthService already stored the response; reflect it in the page header too.
      this.user.set(updated);
      this.snackBar.open('Profile updated', 'Dismiss', { duration: 4000 });
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Opens the "Danger Zone" confirmation dialog. The dialog owns the actual
   * `DELETE /auth/me` call (so a failure surfaces there with the account intact);
   * it resolves `true` only once the account is gone and local auth state has been
   * cleared. On that signal we send the user to `/login` with a `deleted` flag so
   * the login page can confirm what happened rather than dumping them there cold.
   */
  protected async deleteAccount(): Promise<void> {
    const deleted = await firstValueFrom(
      this.dialog.open(DeleteAccountDialog, { width: '32rem' }).afterClosed(),
    );
    if (deleted) {
      await this.router.navigate(['/login'], { queryParams: { deleted: '1' } });
    }
  }

  /**
   * Assembles the four editable fields into an `UpdateUserRequest`. Values are
   * trimmed; empty strings are sent as-is to clear a previously saved value.
   */
  private buildRequest(): UpdateUserRequest {
    const raw = this.form.getRawValue();
    return {
      business_name: raw.business_name.trim(),
      business_address: raw.business_address.trim(),
      logo_url: raw.logo_url.trim(),
      default_currency: raw.default_currency,
    };
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      // 401 is handled globally by the auth interceptor — don't special-case it.
      if (error.status === 422 && this.applyFieldErrors(error.error)) {
        return;
      }
    }
    this.snackBar.open('Could not save your profile. Please try again.', 'Dismiss', {
      duration: 6000,
    });
  }

  /**
   * Maps a 422 `ValidationErrorResponse` onto the matching form controls, so the
   * user sees the error inline on the offending field rather than a generic
   * banner (per docs/api-client.md and the document create form's pattern).
   * Returns whether at least one field error was applied.
   */
  private applyFieldErrors(body: unknown): boolean {
    if (!isValidationErrorResponse(body)) {
      return false;
    }

    let applied = false;
    for (const field of body.error.fields) {
      if (!field.field) {
        continue;
      }
      const control = this.form.get(field.field);
      if (control) {
        control.setErrors({ server: field.message ?? 'Invalid value.' });
        applied = true;
      }
    }
    return applied;
  }
}

/** Formats an ISO timestamp as a human date, or null if absent/invalid. */
export function formatMemberSince(createdAt: string | undefined): string | null {
  if (!createdAt) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Validates a file picked for the logo before any decoding work. Returns an error
 * message to show inline, or null when the file is acceptable. Split out from the
 * canvas work so it's unit-testable without a real image/DOM.
 */
export function validateLogoFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'That file isn’t an image. Pick a PNG, JPG, or similar.';
  }
  if (file.size > MAX_LOGO_BYTES) {
    return 'That image is over 5 MB. Pick a smaller file.';
  }
  return null;
}

/**
 * Extracts an inline message from a failed logo upload. The upload endpoint returns
 * `ProblemDetails` (RFC 9457) — e.g. `{ detail: "The uploaded file exceeds…" }` — not
 * the field-array shape `PATCH /auth/me` uses, so prefer its `detail`. 401 is left to
 * the interceptor; anything else falls back to a generic message.
 */
export function logoUploadErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return 'Could not upload that image. Please try again.';
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
