import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateEmployeeRequest, EmployeeResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly baseUrl = '/admin';

  constructor(private readonly http: HttpClient) {}

  public createEmployee(request: CreateEmployeeRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.baseUrl}/employees`, request);
  }
}
