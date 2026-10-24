import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BatchProcessResponse } from '../models/fd.models';

@Injectable({
  providedIn: 'root'
})
export class FDMaturityApiService {
  private readonly baseUrl = '/api/fd/maturity';

  constructor(private readonly http: HttpClient) {}

  public processMaturityBatch(businessDate?: string): Observable<BatchProcessResponse> {
    let params = new HttpParams();
    if (businessDate) {
      params = params.set('businessDate', businessDate);
    }
    return this.http.post<BatchProcessResponse>(`${this.baseUrl}/process`, {}, { params });
  }
}
