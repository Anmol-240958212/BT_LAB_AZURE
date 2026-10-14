import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyInr',
  standalone: false
})
export class CurrencyInrPipe implements PipeTransform {
  transform(value: number | string | null | undefined, showSymbol: boolean = true): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return showSymbol ? '₹ 0.00' : '0.00';
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    // Use Intl.NumberFormat with Indian English numbering (lakhs, crores)
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);

    return showSymbol ? `₹ ${formatted}` : formatted;
  }
}
