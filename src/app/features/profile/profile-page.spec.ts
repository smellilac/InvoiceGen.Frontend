import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth.service';
import { User } from '../../api/models/user';
import {
  ProfilePage,
  formatMemberSince,
  logoUploadErrorMessage,
  validateLogoFile,
} from './profile-page';

/**
 * Behavioural coverage for the profile page. The browser end-to-end path needs
 * the Postgres-backed API running, so these tests stand in for it by mocking
 * `AuthService` and asserting the branches that matter: null profile fields
 * become empty strings (never the literal "null"), a save sends only the four
 * editable fields and pushes the response back into `AuthService`, and a 422
 * lands as per-field errors rather than a generic banner.
 */
describe('ProfilePage', () => {
  function setup(initialUser: User | null) {
    // A minimal stand-in for the httpResource returned by `currentUserResource()`.
    const value = signal<User | undefined>(initialUser ?? undefined);
    const resource = {
      value,
      isLoading: () => false,
      error: () => undefined,
      set: (u: User) => value.set(u),
      reload: vi.fn(),
    };

    const auth = {
      currentUserResource: vi.fn().mockReturnValue(resource),
      updateCurrentUser: vi.fn(),
      uploadLogo: vi.fn(),
      deleteLogo: vi.fn(),
    };
    const snackBar = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });

    const fixture = TestBed.createComponent(ProfilePage);
    const component = fixture.componentInstance as any;
    // Trigger the prefill effect (reads the resource's current value).
    fixture.detectChanges();

    return { fixture, component, auth, snackBar, resource };
  }

  it('prefills the form from the loaded user', () => {
    const { component } = setup({
      email: 'user@example.com',
      business_name: 'Acme Inc',
      business_address: '1 Main St\nMetropolis',
      logo_url: 'https://example.com/logo.png',
      default_currency: 'EUR',
    });

    expect(component.form.getRawValue()).toEqual({
      business_name: 'Acme Inc',
      business_address: '1 Main St\nMetropolis',
      logo_url: 'https://example.com/logo.png',
      default_currency: 'EUR',
    });
  });

  it('maps null profile fields to empty strings and keeps the currency default', () => {
    const { component } = setup({
      email: 'user@example.com',
      business_name: null,
      business_address: null,
      logo_url: null,
      default_currency: null,
    });

    expect(component.form.getRawValue()).toEqual({
      business_name: '',
      business_address: '',
      logo_url: '',
      default_currency: 'USD',
    });
    // No control should ever hold the literal string "null".
    for (const value of Object.values(component.form.getRawValue())) {
      expect(value).not.toBe('null');
    }
  });

  it('keeps the USD default when the saved currency is not one we offer', () => {
    const { component } = setup({
      email: 'user@example.com',
      default_currency: 'BTC',
    });

    expect(component.form.controls.default_currency.value).toBe('USD');
  });

  it('submits only the four editable fields (trimmed) and reflects the response', async () => {
    const updated: User = {
      email: 'user@example.com',
      business_name: 'Acme Inc',
      business_address: '1 Main St',
      logo_url: 'https://example.com/logo.png',
      default_currency: 'GBP',
    };
    const { component, auth, snackBar, resource } = setup({ email: 'user@example.com' });
    auth.updateCurrentUser.mockResolvedValue(updated);

    component.form.setValue({
      business_name: '  Acme Inc  ',
      business_address: '  1 Main St  ',
      logo_url: '  https://example.com/logo.png  ',
      default_currency: 'GBP',
    });

    await component.submit();

    expect(auth.updateCurrentUser).toHaveBeenCalledTimes(1);
    expect(auth.updateCurrentUser.mock.calls[0][0]).toEqual({
      business_name: 'Acme Inc',
      business_address: '1 Main St',
      logo_url: 'https://example.com/logo.png',
      default_currency: 'GBP',
    });
    // The page header reflects the saved response, and success is confirmed.
    expect(resource.value()).toEqual(updated);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(snackBar.open.mock.calls[0][0]).toBe('Profile updated');
    expect(component.submitting()).toBe(false);
  });

  it('maps a 422 onto the matching form controls instead of a generic snackbar', async () => {
    const { component, auth, snackBar } = setup({ email: 'user@example.com' });
    auth.updateCurrentUser.mockRejectedValue(
      new HttpErrorResponse({
        status: 422,
        error: {
          error: {
            code: 'validation_error',
            message: 'Invalid',
            fields: [{ field: 'logo_url', message: 'Must be a valid URL.' }],
          },
        },
      }),
    );

    await component.submit();

    expect(component.form.controls.logo_url.getError('server')).toBe('Must be a valid URL.');
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('shows a generic error snackbar on non-validation failures', async () => {
    const { component, auth, snackBar } = setup({ email: 'user@example.com' });
    auth.updateCurrentUser.mockRejectedValue(new HttpErrorResponse({ status: 409 }));

    await component.submit();

    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(snackBar.open.mock.calls[0][0]).toContain('Could not save');
    expect(component.submitting()).toBe(false);
  });

  it('validateLogoFile accepts an image under the size cap and rejects otherwise', () => {
    const image = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' });
    expect(validateLogoFile(image)).toBeNull();

    const notImage = new File([new Uint8Array(10)], 'notes.txt', { type: 'text/plain' });
    expect(validateLogoFile(notImage)).toContain('isn’t an image');

    const tooBig = new File([new Uint8Array(10)], 'huge.png', { type: 'image/png' });
    Object.defineProperty(tooBig, 'size', { value: 6 * 1024 * 1024 });
    expect(validateLogoFile(tooBig)).toContain('5 MB');
  });

  it('a rejected upload sets an inline error and never hits the network', async () => {
    const { component, auth } = setup({
      email: 'user@example.com',
      logo_url: 'https://kept.example/logo.png',
    });
    const notImage = new File([new Uint8Array(10)], 'notes.txt', { type: 'text/plain' });
    const input = { files: [notImage], value: 'C:/fakepath/notes.txt' } as unknown as HTMLInputElement;

    await component.onLogoFileSelected({ target: input } as unknown as Event);

    expect(component.logoUploadError()).toContain('isn’t an image');
    expect(auth.uploadLogo).not.toHaveBeenCalled();
    // The existing value is preserved, and the input is reset so re-picking fires change again.
    expect(component.form.controls.logo_url.value).toBe('https://kept.example/logo.png');
    expect(input.value).toBe('');
  });

  it('a valid upload posts the file and reflects the returned hosted logo_url', async () => {
    const { component, auth, snackBar } = setup({ email: 'user@example.com' });
    const image = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' });
    auth.uploadLogo.mockResolvedValue({
      email: 'user@example.com',
      logo_url: 'https://api.example/auth/logo/abc-123',
    } as User);
    const input = { files: [image], value: 'C:/fakepath/logo.png' } as unknown as HTMLInputElement;

    await component.onLogoFileSelected({ target: input } as unknown as Event);

    expect(auth.uploadLogo).toHaveBeenCalledWith(image);
    // The short hosted URL (not a data URI) lands in the control → preview.
    expect(component.form.controls.logo_url.value).toBe('https://api.example/auth/logo/abc-123');
    expect(component.logoPreviewUrl()).toBe('https://api.example/auth/logo/abc-123');
    expect(component.logoUploadError()).toBeNull();
    expect(component.processingLogo()).toBe(false);
    expect(snackBar.open.mock.calls[0][0]).toBe('Logo uploaded');
  });

  it('surfaces the server ProblemDetails message when an upload is rejected', async () => {
    const { component, auth } = setup({ email: 'user@example.com' });
    const image = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' });
    auth.uploadLogo.mockRejectedValue(
      new HttpErrorResponse({
        status: 422,
        error: { title: 'logo.too_large', detail: 'The uploaded file exceeds the 5 MB limit.' },
      }),
    );
    const input = { files: [image], value: '' } as unknown as HTMLInputElement;

    await component.onLogoFileSelected({ target: input } as unknown as Event);

    expect(component.logoUploadError()).toBe('The uploaded file exceeds the 5 MB limit.');
    expect(component.processingLogo()).toBe(false);
  });

  it('removeLogo clears the stored logo via the service and empties the field', async () => {
    const { component, auth } = setup({
      email: 'user@example.com',
      logo_url: 'https://api.example/auth/logo/abc-123',
    });
    auth.deleteLogo.mockResolvedValue({ email: 'user@example.com', logo_url: null } as User);

    await component.removeLogo();

    expect(auth.deleteLogo).toHaveBeenCalledTimes(1);
    expect(component.form.controls.logo_url.value).toBe('');
    expect(component.logoPreviewUrl()).toBe('');
  });

  it('logoUploadErrorMessage prefers ProblemDetails detail, else a generic message', () => {
    const withDetail = new HttpErrorResponse({ status: 422, error: { detail: 'Bad image.' } });
    expect(logoUploadErrorMessage(withDetail)).toBe('Bad image.');
    expect(logoUploadErrorMessage(new HttpErrorResponse({ status: 500 }))).toContain('Could not upload');
    expect(logoUploadErrorMessage(new Error('boom'))).toContain('Could not upload');
  });

  it('formats created_at as a human date and tolerates missing/invalid values', () => {
    expect(formatMemberSince('2025-03-14T00:00:00Z')).toContain('2025');
    expect(formatMemberSince(undefined)).toBeNull();
    expect(formatMemberSince('not-a-date')).toBeNull();
  });
});
