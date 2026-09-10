import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { AuthService } from '../../core/auth.service';
import { DeleteAccountDialog, DELETE_CONFIRM_PHRASE } from './delete-account-dialog';

/**
 * Behavioural coverage for the account-deletion dialog. The live path needs the
 * API running, so these mock `AuthService` and assert the guard rails that make
 * this a deliberately hard, irreversible action: the confirm button stays locked
 * until the exact phrase is typed; a success clears state (via the service) and
 * closes with `true`; and a failure surfaces in-dialog while leaving the dialog
 * open and — crucially — never touching auth state beyond what the service did.
 */
describe('DeleteAccountDialog', () => {
  function setup() {
    const auth = { deleteAccount: vi.fn().mockResolvedValue(undefined) };
    const dialogRef = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [DeleteAccountDialog],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });

    const fixture = TestBed.createComponent(DeleteAccountDialog);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    return { component, auth, dialogRef };
  }

  it('keeps the confirm button disabled until the exact phrase is typed', () => {
    const { component } = setup();

    expect(component.canDelete()).toBe(false);

    component.confirmation.setValue('delete');
    expect(component.canDelete()).toBe(false);

    component.confirmation.setValue(DELETE_CONFIRM_PHRASE);
    expect(component.canDelete()).toBe(true);

    // Surrounding whitespace is tolerated, but any other text is not.
    component.confirmation.setValue('  DELETE  ');
    expect(component.canDelete()).toBe(true);
    component.confirmation.setValue('DELETE NOW');
    expect(component.canDelete()).toBe(false);
  });

  it('does nothing when confirm is invoked without the phrase', async () => {
    const { component, auth, dialogRef } = setup();

    await component.confirm();

    expect(auth.deleteAccount).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('deletes and closes with true once confirmed', async () => {
    const { component, auth, dialogRef } = setup();
    component.confirmation.setValue(DELETE_CONFIRM_PHRASE);

    await component.confirm();

    expect(auth.deleteAccount).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.errorMessage()).toBeNull();
    expect(component.deleting()).toBe(false);
  });

  it('shows an in-dialog error and stays open when the delete fails', async () => {
    const { component, auth, dialogRef } = setup();
    auth.deleteAccount.mockRejectedValue(new Error('boom'));
    component.confirmation.setValue(DELETE_CONFIRM_PHRASE);

    await component.confirm();

    expect(auth.deleteAccount).toHaveBeenCalledTimes(1);
    // Account intact: the dialog is not closed, so the caller never redirects.
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Could not delete');
    expect(component.deleting()).toBe(false);
  });
});
