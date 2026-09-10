import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { Document } from '../../../api/models/document';
import { CustomerService } from '../../customers/customer.service';
import { DocumentService } from '../document.service';
import { DocumentTypeService } from '../document-type.service';
import { DocumentDetail } from './document-detail';

/**
 * Wiring coverage for the settlement flow on the detail page. The dialog owns
 * the API call and returns the updated `Document`; the page's only job is to
 * push that straight into the resource (`.set()`, no re-fetch) so the totals —
 * and, because it's computed live from `balance_remaining`, the overdue badge —
 * redraw immediately. That's what this asserts, plus the cancel path being a
 * no-op.
 */
describe('DocumentDetail (record settlement)', () => {
  const currentDoc = { id: 'd1', type: 'invoice', balance_remaining: 100 } as Document;
  const settledDoc = { id: 'd1', type: 'invoice', balance_remaining: 0, amount_settled: 100 } as Document;

  function setup(dialogResult: Document | undefined) {
    const resource = { value: vi.fn().mockReturnValue(currentDoc), set: vi.fn(), reload: vi.fn() };
    const documents = { getResource: vi.fn().mockReturnValue(resource) };
    const documentTypes = { list: vi.fn().mockReturnValue({ value: () => [] }) };
    const customers = { get: vi.fn() };
    const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(dialogResult) }) };
    const router = { navigate: vi.fn(), getCurrentNavigation: vi.fn().mockReturnValue(null) };
    const snackBar = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentDetail],
      providers: [
        { provide: DocumentService, useValue: documents },
        { provide: DocumentTypeService, useValue: documentTypes },
        { provide: CustomerService, useValue: customers },
        { provide: MatDialog, useValue: dialog },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'd1' })) } },
      ],
    });

    const component = TestBed.createComponent(DocumentDetail).componentInstance as any;
    return { component, resource, dialog };
  }

  it('pushes the updated document into the resource on a recorded settlement', async () => {
    const { component, resource } = setup(settledDoc);

    await component.recordSettlement();

    expect(resource.set).toHaveBeenCalledWith(settledDoc);
  });

  it('does nothing when the dialog is cancelled', async () => {
    const { component, resource } = setup(undefined);

    await component.recordSettlement();

    expect(resource.set).not.toHaveBeenCalled();
  });

  it('opens the dialog with the document id and type for wording', async () => {
    const { component, dialog } = setup(undefined);

    await component.recordSettlement();

    expect(dialog.open).toHaveBeenCalled();
    const config = dialog.open.mock.calls[0][1];
    expect(config.data).toEqual({ documentId: 'd1', type: 'invoice' });
  });
});
