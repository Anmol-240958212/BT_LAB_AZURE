import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FDCalculationRequest, FDCalculationResponse } from '../models/fd.models';

@Injectable({
  providedIn: 'root'
})
export class FDCalculatorApiService {
  private readonly baseUrl = '/api/fd';

  constructor(private readonly http: HttpClient) {}

  public calculate(request: FDCalculationRequest): Observable<FDCalculationResponse> {
    return this.http.post<FDCalculationResponse>(`${this.baseUrl}/calculate`, request);
  }
}
