import { settlementActionLabel, settlementNoun } from './settlement';

/**
 * The settlement wording is direction-aware in exactly the same way the overdue
 * badge is: `credit_note` money flows out (a refund), everything else flows in
 * (a payment). These lock that distinction — a regression to one generic label
 * would be a real UX bug, since "Record payment" on a credit note reads
 * backwards.
 */
describe('settlement wording', () => {
  it('says "Record refund" / "refund" for a credit note', () => {
    expect(settlementActionLabel('credit_note')).toBe('Record refund');
    expect(settlementNoun('credit_note')).toBe('refund');
  });

  it('says "Record payment" / "payment" for money-owed-to-you types', () => {
    expect(settlementActionLabel('invoice')).toBe('Record payment');
    expect(settlementNoun('receipt')).toBe('payment');
    expect(settlementActionLabel('sales_order')).toBe('Record payment');
  });

  it('falls back to payment wording when the type is unknown', () => {
    expect(settlementActionLabel(undefined)).toBe('Record payment');
    expect(settlementNoun(undefined)).toBe('payment');
  });
});
