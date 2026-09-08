import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth.service';
import { Document } from '../../../api/models/document';
import { CustomerService } from '../../customers/customer.service';
import { DocumentService } from '../document.service';
import { DocumentTypeService } from '../document-type.service';
import { DocumentCreate } from './document-create';

/**
 * Behavioural coverage for the "Edit" (duplicate-and-replace) flow in
 * `document-create.ts`. The browser end-to-end path needs the Postgres-backed
 * API running, so these tests stand in for it by mocking `DocumentService` and
 * asserting the three branches that matter: a plain create leaves other
 * documents alone, an edit soft-deletes its source after saving the copy, and a
 * failed source-delete degrades to a non-blocking warning without losing the
 * save or blocking navigation.
 */
describe('DocumentCreate (edit / duplicate-and-replace)', () => {
  const newDoc = { id: 'new-1', type: 'invoice' } as Document;

  function setup(queryParams: Record<string, string>) {
    const documents = {
      create: vi.fn().mockResolvedValue(newDoc),
      delete: vi.fn().mockResolvedValue(undefined),
      // No prefill needed for these assertions: return an empty source resource
      // so the constructor's prefill effect no-ops and can't interfere.
      getResource: vi.fn().mockReturnValue({ value: () => undefined }),
    };
    const documentTypes = { list: vi.fn().mockReturnValue({ value: () => [] }) };
    // The create form now injects CustomerService for the customer autocomplete.
    // Stub its reactive accessors so no real `httpResource` (which would need
    // HttpClient) is built during construction; the customer-picker behaviour is
    // exercised in the browser, not here.
    const customers = {
      list: vi.fn().mockReturnValue({ value: () => ({ data: [] }) }),
      getResource: vi.fn().mockReturnValue({ value: () => undefined }),
      get: vi.fn(),
    };
    const auth = {
      currentUser: () => null,
      // Stub the `GET /auth/me` resource the logo toggle reads. No logo, not
      // loading — enough for construction; the toggle's profile-driven default
      // is an effect exercised in the browser, not here (see file header).
      currentUserResource: () => ({ value: () => null, isLoading: () => false }),
    };
    const router = { navigate: vi.fn().mockResolvedValue(true) };
    const snackBar = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentCreate],
      providers: [
        { provide: DocumentService, useValue: documents },
        { provide: DocumentTypeService, useValue: documentTypes },
        { provide: CustomerService, useValue: customers },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(queryParams)) },
        },
      ],
    });

    const fixture = TestBed.createComponent(DocumentCreate);
    const component = fixture.componentInstance as any;

    // Fill the form with the minimum valid input so `submit()` passes validation.
    component.form.controls.to.setValue('Acme Inc');
    component.form.controls.items
      .at(0)
      .patchValue({ name: 'Widget', quantity: 2, unit_cost: 5 });

    return { component, documents, router, snackBar };
  }

  it('plain create (no duplicateFrom) creates a document and deletes nothing', async () => {
    const { component, documents, router } = setup({ type: 'invoice' });

    await component.submit();

    expect(documents.create).toHaveBeenCalledTimes(1);
    expect(documents.delete).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/documents', 'new-1'], {
      state: { justCreated: true },
    });
  });

  it('edit mode saves the corrected copy, then soft-deletes the source', async () => {
    const { component, documents, router } = setup({
      type: 'invoice',
      duplicateFrom: 'src-1',
    });

    await component.submit();

    // (a) the new document carries the edited input...
    expect(documents.create).toHaveBeenCalledTimes(1);
    const request = documents.create.mock.calls[0][0];
    expect(request.type).toBe('invoice');
    expect(request.to).toBe('Acme Inc');
    expect(request.items).toEqual([{ name: 'Widget', quantity: 2, unit_cost: 5 }]);
    // The logo choice always rides along in the payload (the backend ignores it
    // when the profile has no logo).
    expect(typeof request.include_logo).toBe('boolean');

    // (b) ...and the original is soft-deleted so only the copy remains listed.
    expect(documents.delete).toHaveBeenCalledWith('src-1');

    // Delete happens after a successful create, never before it.
    expect(documents.create.mock.invocationCallOrder[0]).toBeLessThan(
      documents.delete.mock.invocationCallOrder[0],
    );

    expect(router.navigate).toHaveBeenCalledWith(['/documents', 'new-1'], {
      state: { justCreated: true },
    });
  });

  it('a failed source-delete warns but still lands on the new document', async () => {
    const { component, documents, router, snackBar } = setup({
      type: 'invoice',
      duplicateFrom: 'src-1',
    });
    documents.delete.mockRejectedValue(new Error('boom'));

    await component.submit();

    // The save succeeded, so we navigate to the new doc regardless...
    expect(router.navigate).toHaveBeenCalledWith(['/documents', 'new-1'], {
      state: { justCreated: true },
    });
    // ...and surface a non-blocking warning rather than an error state.
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(snackBar.open.mock.calls[0][0]).toContain('original');
    expect(component.errorMessage()).toBeNull();
  });
});
