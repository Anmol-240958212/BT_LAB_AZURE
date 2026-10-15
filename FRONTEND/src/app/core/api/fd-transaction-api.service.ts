import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FDTransactionRecord, FDTransactionRequest } from '../models/fd.models';

@Injectable({
  providedIn: 'root'
})
export class FDTransactionApiService {
  private readonly baseUrl = '/api/fd/transactions';

  constructor(private readonly http: HttpClient) {}

  public getTransactions(fdAccountNo?: string): Observable<FDTransactionRecord[]> {
    let params = new HttpParams();
    if (fdAccountNo) params = params.set('fdAccountNo', fdAccountNo);
    return this.http.get<FDTransactionRecord[]>(this.baseUrl, { params });
  }

  public createTransaction(request: FDTransactionRequest): Observable<string> {
    return this.http.post(this.baseUrl, request, { responseType: 'text' });
  }
}
