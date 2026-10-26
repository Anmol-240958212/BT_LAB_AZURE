import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FDTransactionLedgerEntry, FDTransactionRequest } from '../models/fd.models';

@Injectable({
  providedIn: 'root'
})
export class FDTransactionApiService {
  private readonly baseUrl = '/api/fd/transactions';

  constructor(private readonly http: HttpClient) {}

  public createTransaction(request: FDTransactionRequest): Observable<string> {
    return this.http.post(this.baseUrl, request, { responseType: 'text' });
  }

  public ledger(accountNo?: string): Observable<FDTransactionLedgerEntry[]> {
    const params = accountNo?.trim() ? { params: { accountNo: accountNo.trim() } } : {};
    return this.http.get<FDTransactionLedgerEntry[]>(this.baseUrl, params);
  }
}
