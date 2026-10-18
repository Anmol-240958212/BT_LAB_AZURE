import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CategoryRate,
  EffectiveRateQuery,
  EffectiveRateQuote,
  ProductCreateRequest,
  ProductPage,
  ProductRecord,
  ProductSearch,
  ProductUpdateRequest, ProductSummary, ProductValidation, ProductPenalty
} from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductPricingApiService {
  private readonly baseUrl = '/api/product';

  constructor(private readonly http: HttpClient) {}

  summary(): Observable<ProductSummary> {
    return this.http.get<ProductSummary>(`${this.baseUrl}/report/summary`);
  }

  validate(productCode: string, amount: number, termMonths: number, currency: string): Observable<ProductValidation> {
    return this.http.get<ProductValidation>(`${this.baseUrl}/${encodeURIComponent(productCode)}/validate`,
      { params: { amount, termMonths, currency } });
  }

  penalty(productCode: string): Observable<ProductPenalty> {
    return this.http.get<ProductPenalty>(`${this.baseUrl}/${encodeURIComponent(productCode)}/penalty`);
  }

  search(query: ProductSearch = {}): Observable<ProductPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ProductPage>(`${this.baseUrl}/search`, { params });
  }

  get(productCode: string): Observable<ProductRecord> {
    return this.http.get<ProductRecord>(`${this.baseUrl}/${encodeURIComponent(productCode)}`);
  }

  create(request: ProductCreateRequest): Observable<ProductRecord> {
    return this.http.post<ProductRecord>(this.baseUrl, request);
  }

  update(productCode: string, request: ProductUpdateRequest): Observable<ProductRecord> {
    return this.http.put<ProductRecord>(`${this.baseUrl}/${encodeURIComponent(productCode)}`, request);
  }

  getCategoryRates(productCode: string, date?: string): Observable<CategoryRate[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<CategoryRate[]>(`${this.baseUrl}/${encodeURIComponent(productCode)}/category-rates`, { params });
  }

  addCategoryRate(productCode: string, request: CategoryRate): Observable<CategoryRate> {
    return this.http.post<CategoryRate>(`${this.baseUrl}/${encodeURIComponent(productCode)}/category-rates`, request);
  }

  getEffectiveRate(productCode: string, query: EffectiveRateQuery): Observable<EffectiveRateQuote> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach(item => params = params.append(key, item));
      } else {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<EffectiveRateQuote>(
      `${this.baseUrl}/${encodeURIComponent(productCode)}/effective-rate`, { params }
    );
  }
}
