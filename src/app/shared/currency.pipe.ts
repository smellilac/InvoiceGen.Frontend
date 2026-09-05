import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a monetary amount using the *document's own* `currency` code via
 * `Intl.NumberFormat` — never a fixed locale or a hand-built `$` string. This
 * mirrors the backend's `x-rendering-policy.currency_correct_number_formatting`
 * (see docs/architecture.md) so the frontend and the generated PDF format the
 * same amount identically. All money in the app must render through this pipe
 * (docs/conventions.md).
 *
 * Usage: `{{ document.total | money: document.currency }}`.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string | null | undefined): string {
    if (amount == null) {
      return '';
    }
    // The amount carries no currency of its own; fall back to USD only if the
    // document somehow lacks one (the backend always sets it on a Document).
    const code = currency || 'USD';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  }
}
