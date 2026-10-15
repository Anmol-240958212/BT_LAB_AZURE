import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CustomerProfileRequest,
  CustomerProfileResponse,
  OpenAccountRequest,
  OpenAccountResponse
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  private readonly baseUrl = '/customer';

  constructor(private readonly http: HttpClient) {}

  public submitProfile(request: CustomerProfileRequest): Observable<CustomerProfileResponse> {
    return this.http.post<CustomerProfileResponse>(`${this.baseUrl}/profile`, request);
  }

  public getProfile(): Observable<CustomerProfileResponse> {
    return this.http.get<CustomerProfileResponse>(`${this.baseUrl}/profile`);
  }

  public getCustomerStatus(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/status`);
  }

  public getAllCustomers(): Observable<CustomerProfileResponse[]> {
    return this.http.get<CustomerProfileResponse[]>(`${this.baseUrl}/all`);
  }

  public openAccount(request: OpenAccountRequest): Observable<OpenAccountResponse> {
    return this.http.post<OpenAccountResponse>(`${this.baseUrl}/account`, request);
  }

  public getAccounts(): Observable<OpenAccountResponse[]> {
    return this.http.get<OpenAccountResponse[]>(`${this.baseUrl}/account`);
  }

  public syncCustomer(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/sync`, {});
  }
}
