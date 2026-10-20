import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FDAccountCreationResponse,
  FDWithdrawalRequest,
  FDWithdrawalResponse,
  FDAccountDateAdjustmentRequest,
  FixedDepositAccountRequest,
  FixedDepositAccountResponse
} from '../models/fd.models';

@Injectable({
  providedIn: 'root'
})
export class FDAccountApiService {
  private readonly baseUrl = '/api/fd/account';

  constructor(private readonly http: HttpClient) {}

  public createAccount(request: FixedDepositAccountRequest): Observable<FixedDepositAccountResponse> {
    return this.http.post<FixedDepositAccountResponse>(`${this.baseUrl}/create`, request);
  }

  public createAccountWithTransaction(request: FixedDepositAccountRequest): Observable<FDAccountCreationResponse> {
    return this.http.post<FDAccountCreationResponse>(`${this.baseUrl}/create-with-txn`, request);
  }

  public getAccount(fdAccountNo: string): Observable<FixedDepositAccountResponse> {
    return this.http.get<FixedDepositAccountResponse>(`${this.baseUrl}/${encodeURIComponent(fdAccountNo)}`);
  }

  public getAccountsByCustomer(customerId: string): Observable<FixedDepositAccountResponse[]> {
    return this.http.get<FixedDepositAccountResponse[]>(`${this.baseUrl}/customer/${encodeURIComponent(customerId)}`);
  }

  public getAccountsByStatus(status: string): Observable<FixedDepositAccountResponse[]> {
    return this.http.get<FixedDepositAccountResponse[]>(`${this.baseUrl}/status/${encodeURIComponent(status)}`);
  }

  public getCustomerAccountsByStatus(customerId: string, status: string): Observable<FixedDepositAccountResponse[]> {
    return this.http.get<FixedDepositAccountResponse[]>(
      `${this.baseUrl}/customer/${encodeURIComponent(customerId)}/status/${encodeURIComponent(status)}`
    );
  }

  public withdrawFD(request: FDWithdrawalRequest): Observable<FDWithdrawalResponse> {
    return this.http.post<FDWithdrawalResponse>(`${this.baseUrl}/withdraw`, request);
  }

  public adjustDates(fdAccountNo: string, request: FDAccountDateAdjustmentRequest): Observable<FixedDepositAccountResponse> {
    return this.http.put<FixedDepositAccountResponse>(`${this.baseUrl}/${encodeURIComponent(fdAccountNo)}/dates`, request);
  }

  public getAccountNotifications(fdAccountNo: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/fd/notifications/account/${encodeURIComponent(fdAccountNo)}`);
  }
}

