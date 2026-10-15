import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FDInterestApiService {
  constructor(private readonly http: HttpClient) {}

  public runInterestBatch(businessDate?: string): Observable<string> {
    let params = new HttpParams();
    if (businessDate) {
      params = params.set('businessDate', businessDate);
    }
    return this.http.post('/api/fd/interest-batch', {}, { params, responseType: 'text' });
  }
}
