import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Document } from '../../../api/models/document';
import { DocumentService } from '../document.service';
import { RecordSettlementDialog, RecordSettlementDialogData } from './record-settlement-dialog';

/**
 * Behavioural coverage for the record-payment/refund dialog. The live path
 * needs the API running, so these mock `DocumentService` and assert the
 * branches that matter: a valid delta is POSTed and closes the dialog with the
 * updated document; a `422` lands on the amount control (not a banner) and
 * keeps the dialog open; zero is rejected client-side; and a negative
 * (correcting) delta is allowed through.
 */
describe('RecordSettlementDialog', () => {
  const updatedDoc = { id: 'd1', type: 'invoice', amount_settled: 50 } as Document;

  function setup(type: RecordSettlementDialogData['type'] = 'invoice') {
    const documents = { recordSettlement: vi.fn().mockResolvedValue(updatedDoc) };
    const dialogRef = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [RecordSettlementDialog],
      providers: [
        { provide: DocumentService, useValue: documents },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { documentId: 'd1', type } },
      ],
    });

    const fixture = TestBed.createComponent(RecordSettlementDialog);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    return { component, documents, dialogRef };
  }

  it('POSTs the amount as a delta and closes with the updated document', async () => {
    const { component, documents, dialogRef } = setup();

    component.form.controls.amount.setValue(50);
    await component.submit();

    expect(documents.recordSettlement).toHaveBeenCalledWith('d1', { amount: 50 });
    expect(dialogRef.close).toHaveBeenCalledWith(updatedDoc);
  });

  it('allows a negative delta (correcting a previous over-entry)', async () => {
    const { component, documents, dialogRef } = setup();

    component.form.controls.amount.setValue(-20);
    expect(component.form.valid).toBe(true);
    await component.submit();

    expect(documents.recordSettlement).toHaveBeenCalledWith('d1', { amount: -20 });
    expect(dialogRef.close).toHaveBeenCalledWith(updatedDoc);
  });

  it('rejects a zero amount client-side without calling the API', async () => {
    const { component, documents } = setup();

    component.form.controls.amount.setValue(0);
    expect(component.form.valid).toBe(false);
    await component.submit();

    expect(documents.recordSettlement).not.toHaveBeenCalled();
  });

  it('surfaces a 422 (ASP.NET errors map — the real backend shape) on the amount control', async () => {
    const { component, documents, dialogRef } = setup();
    documents.recordSettlement.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 422,
        error: {
          type: 'https://tools.ietf.org/html/rfc9110#section-15.5.21',
          title: 'One or more validation errors occurred.',
          status: 422,
          errors: { amount: ['The settled amount cannot exceed the document total of 100.'] },
        },
      }),
    );

    component.form.controls.amount.setValue(9999);
    await component.submit();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.form.controls.amount.getError('server')).toBe(
      'The settled amount cannot exceed the document total of 100.',
    );
    expect(component.genericError()).toBeNull();
  });

  it('surfaces a 422 in the legacy error.fields shape too', async () => {
    const { component, documents, dialogRef } = setup();
    documents.recordSettlement.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 422,
        error: {
          error: {
            code: 'validation_failed',
            message: 'One or more fields are invalid.',
            fields: [{ field: 'amount', message: 'exceeds the document total' }],
          },
        },
      }),
    );

    component.form.controls.amount.setValue(9999);
    await component.submit();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.form.controls.amount.getError('server')).toBe('exceeds the document total');
  });

  it('falls back to the top-level 422 message on the amount control when no field entry is given', async () => {
    const { component, documents, dialogRef } = setup();
    documents.recordSettlement.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 422,
        error: { error: { code: 'settlement_out_of_range', message: 'Amount would go negative.', fields: [] } },
      }),
    );

    component.form.controls.amount.setValue(-9999);
    await component.submit();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.form.controls.amount.getError('server')).toBe('Amount would go negative.');
  });

  it('uses refund wording for a credit note', () => {
    const { component } = setup('credit_note');
    expect(component.actionLabel).toBe('Record refund');
    expect(component.noun).toBe('refund');
  });
});
