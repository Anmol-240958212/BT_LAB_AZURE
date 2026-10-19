import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyInr',
  standalone: false
})
export class CurrencyInrPipe implements PipeTransform {
  transform(value: number | string | null | undefined, showSymbol: boolean = true, currency: string = 'INR'): string {
    const normalizedCurrency = currency?.toUpperCase() === 'JPY' ? 'JPY' : 'INR';
    const locale = normalizedCurrency === 'JPY' ? 'ja-JP' : 'en-IN';
    const fractionDigits = normalizedCurrency === 'JPY' ? 0 : 2;
    const symbol = normalizedCurrency === 'JPY' ? '¥' : '₹';
    if (value === null || value === undefined || isNaN(Number(value))) {
      const zero = new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(0);
      return showSymbol ? `${symbol} ${zero}` : zero;
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(numericValue);

    return showSymbol ? `${symbol} ${formatted}` : formatted;
  }
}
