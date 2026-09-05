import { Pipe, PipeTransform } from '@angular/core';

import { MonetaryAmount } from '../api/models/monetary-amount';

/**
 * Renders a {@link MonetaryAmount} using the *document's own* `currency` field
 * via `Intl.NumberFormat`, never a fixed locale — the currency code drives the
 * symbol and decimal places. This mirrors the backend's
 * `x-rendering-policy.currency_correct_number_formatting` and must stay
 * consistent with it, or the app and the generated PDF would format the same
 * document differently (see docs/architecture.md → "Money rendering").
 *
 * Every place an amount is shown goes through this pipe — never `.toFixed(2)` or
 * a hand-built `$` string (see docs/conventions.md).
 *
 * Usage: `{{ document.total | money: document.currency }}`
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(
    amount: MonetaryAmount | null | undefined,
    currency: string | null | undefined,
  ): string {
    if (amount == null) {
      return '';
    }

    const code = currency ?? 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
    } catch {
      // Unknown/malformed currency code: fall back to a plain, still-localized
      // number with the raw code, rather than throwing and blanking the row.
      return `${code} ${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    }
  }
}
