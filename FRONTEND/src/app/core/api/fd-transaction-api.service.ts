import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FDTransactionRequest } from '../models/fd.models';

@Injectable({
  providedIn: 'root'
})
export class FDTransactionApiService {
  private readonly baseUrl = '/api/fd/transactions';

  constructor(private readonly http: HttpClient) {}

  public createTransaction(request: FDTransactionRequest): Observable<string> {
    return this.http.post(this.baseUrl, request, { responseType: 'text' });
  }
}
