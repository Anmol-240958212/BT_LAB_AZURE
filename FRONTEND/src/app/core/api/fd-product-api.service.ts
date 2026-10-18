import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductRecord } from '../models/product.models';

export interface FDProductQuote {
  valid: boolean;
  message: string;
  productCode: string;
  interestRate: number | null;
  interestType: 'SIMPLE' | 'COMPOUND';
  interestFrequency: string;
}

@Injectable({ providedIn: 'root' })
export class FDProductApiService {
  constructor(private readonly http: HttpClient) {}
  list() { return this.http.get<ProductRecord[]>('/api/fd/products'); }
  quote(code: string, amount: number, termMonths: number) {
    return this.http.get<FDProductQuote>(`/api/fd/products/${encodeURIComponent(code)}/quote`,
      { params: { amount, termMonths } });
  }
}
