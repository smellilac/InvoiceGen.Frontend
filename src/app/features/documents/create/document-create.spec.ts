import { vi } from 'vitest';
import { computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
import { GuestAttemptsService } from '../guest-attempts.service';
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
      // These tests exercise the signed-in flow, so the component's guest branch
      // must stay off (isGuest === false).
      isAuthenticated: () => true,
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

/**
 * The unauthenticated "try before you sign up" branch of `document-create.ts`.
 * A guest posts to `/documents/guest`, gets a PDF blob straight back, downloads
 * it, and burns one of a small pool of free attempts — with no navigation to a
 * (non-existent) detail page and no customer picker. These tests mock the
 * download plumbing (`URL.createObjectURL` / anchor click) and a controllable
 * `GuestAttemptsService`, and assert the branch's contract: download + decrement
 * on success, no attempt spent on a validation failure, and the gate once the
 * free documents run out.
 */
describe('DocumentCreate (guest / try-before-you-sign-up)', () => {
  const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

  function setupGuest(startingRemaining: number, queryParams: Record<string, string> = { type: 'invoice' }) {
    const documents = {
      createGuest: vi.fn().mockResolvedValue(pdfBlob),
      // Present but never expected in the guest branch — asserted below.
      create: vi.fn(),
      delete: vi.fn(),
      getResource: vi.fn().mockReturnValue({ value: () => undefined }),
    };
    const documentTypes = { list: vi.fn().mockReturnValue({ value: () => [] }) };
    const customers = {
      // The guest branch passes `null` to keep this idle; still stub the shape.
      list: vi.fn().mockReturnValue({ value: () => ({ data: [] }) }),
      getResource: vi.fn().mockReturnValue({ value: () => undefined }),
      get: vi.fn(),
    };
    const auth = {
      isAuthenticated: () => false,
      currentUser: () => null,
      currentUserResource: () => ({ value: () => null, isLoading: () => false }),
    };

    // Controllable stand-in for GuestAttemptsService: a writable `remaining`
    // signal, a derived `hasRemaining`, and a `recordSuccess` that decrements —
    // the same surface the component consumes.
    const remaining = signal(startingRemaining);
    const guestAttempts = {
      remaining,
      hasRemaining: computed(() => remaining() > 0),
      recordSuccess: vi.fn(() => remaining.set(remaining() - 1)),
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
        { provide: GuestAttemptsService, useValue: guestAttempts },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(queryParams)) },
        },
      ],
    });

    const component = TestBed.createComponent(DocumentCreate).componentInstance as any;

    // Minimum valid guest input: `from` is required for a guest (no saved profile).
    component.form.controls.to.setValue('Acme Inc');
    component.form.controls.from.setValue('My Business\n1 Main St');
    component.form.controls.items.at(0).patchValue({ name: 'Widget', quantity: 2, unit_cost: 5 });

    return { component, documents, guestAttempts, router };
  }

  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:fake');
    revokeObjectURL = vi.fn();
    // jsdom doesn't implement object URLs — provide them for the download path.
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    // Anchor.click() is a no-op in jsdom; spy so we can assert the download fired.
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('generates a guest document: posts to the guest endpoint, downloads, and decrements — no navigation', async () => {
    const { component, documents, guestAttempts, router } = setupGuest(3);

    await component.submit();

    // Posts to the guest endpoint (never the saved-document one)...
    expect(documents.createGuest).toHaveBeenCalledTimes(1);
    expect(documents.create).not.toHaveBeenCalled();

    // ...with a guest-shaped body: `from` present, no `customer_id`, no `include_logo`.
    const body = documents.createGuest.mock.calls[0][0];
    expect(body.type).toBe('invoice');
    expect(body.to).toBe('Acme Inc');
    expect(body.from).toBe('My Business\n1 Main St');
    expect('customer_id' in body).toBe(false);
    expect('include_logo' in body).toBe(false);

    // ...triggers a browser download...
    expect(createObjectURL).toHaveBeenCalledWith(pdfBlob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');

    // ...spends exactly one attempt and shows the confirmation with the new count...
    expect(guestAttempts.recordSuccess).toHaveBeenCalledTimes(1);
    expect(component.guestResult()).toEqual({ remaining: 2 });

    // ...and never navigates to a detail page (nothing was saved).
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lets a guest create up to the free limit, then shows the gate instead of the form', async () => {
    const { component, documents, guestAttempts } = setupGuest(3);

    for (let i = 0; i < 3; i++) {
      // Each document starts fresh; clear the previous confirmation panel.
      component.guestResult.set(null);
      await component.submit();
    }

    expect(documents.createGuest).toHaveBeenCalledTimes(3);
    expect(guestAttempts.remaining()).toBe(0);

    // With no free documents left, the form is replaced by the sign-up gate.
    expect(component.guestExhausted()).toBe(true);
    expect(component.isGuest()).toBe(true);
  });

  it('shows the gate from the outset when no free documents remain', () => {
    const { component } = setupGuest(0);

    expect(component.guestExhausted()).toBe(true);
    // The form branch is never rendered, so nothing prompts a guest submission.
    expect(component.guestResult()).toBeNull();
  });

  it('does not spend an attempt when the guest request fails validation (422)', async () => {
    const { component, guestAttempts, documents } = setupGuest(3);
    documents.createGuest.mockRejectedValue(
      new HttpErrorResponse({
        status: 422,
        error: { error: { fields: [{ field: 'to', message: 'Required.' }] } },
      }),
    );

    await component.submit();

    // A correctable validation error must not burn a free document.
    expect(guestAttempts.recordSuccess).not.toHaveBeenCalled();
    expect(guestAttempts.remaining()).toBe(3);
    expect(component.guestResult()).toBeNull();
  });
});
