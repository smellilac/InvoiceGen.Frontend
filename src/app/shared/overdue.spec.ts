import { Document } from '../api/models/document';
import { isOverdue, overdueLabel } from './overdue';

/** Fixed "today" so the tests don't depend on the wall clock. */
const NOW = new Date(2026, 8, 8); // 2026-09-08, local time

function doc(overrides: Partial<Document>): Document {
  return { type: 'invoice', ...overrides };
}

describe('isOverdue', () => {
  it('is true when due_date is in the past and a balance remains', () => {
    expect(isOverdue(doc({ due_date: '2026-09-01', balance_remaining: 100 }), NOW)).toBe(true);
  });

  it('is false when due_date is in the future', () => {
    expect(isOverdue(doc({ due_date: '2026-10-01', balance_remaining: 100 }), NOW)).toBe(false);
  });

  it('is false on the due date itself (due today is not yet overdue)', () => {
    expect(isOverdue(doc({ due_date: '2026-09-08', balance_remaining: 100 }), NOW)).toBe(false);
  });

  it('is false when fully settled, even if past due', () => {
    expect(isOverdue(doc({ due_date: '2026-01-01', balance_remaining: 0 }), NOW)).toBe(false);
  });

  it('is false when there is no due_date', () => {
    expect(isOverdue(doc({ due_date: null, balance_remaining: 100 }), NOW)).toBe(false);
    expect(isOverdue(doc({ balance_remaining: 100 }), NOW)).toBe(false);
  });

  it('is false when balance_remaining is missing or negative', () => {
    expect(isOverdue(doc({ due_date: '2026-01-01' }), NOW)).toBe(false);
    expect(isOverdue(doc({ due_date: '2026-01-01', balance_remaining: -5 }), NOW)).toBe(false);
  });

  it('applies the same logic to credit_note', () => {
    expect(
      isOverdue(doc({ type: 'credit_note', due_date: '2026-09-01', balance_remaining: 50 }), NOW),
    ).toBe(true);
  });
});

describe('overdueLabel', () => {
  it('says "Overdue" for money-owed-to-you types', () => {
    expect(overdueLabel(doc({ type: 'invoice' }))).toBe('Overdue');
  });

  it('says "Refund overdue" for credit_note', () => {
    expect(overdueLabel(doc({ type: 'credit_note' }))).toBe('Refund overdue');
  });
});
