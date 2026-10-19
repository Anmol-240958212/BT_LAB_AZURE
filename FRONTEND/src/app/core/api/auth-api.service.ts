import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyOtpRequest
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = '/auth';

  constructor(private readonly http: HttpClient) {}

  public register(request: RegisterRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/register`, request, { responseType: 'text' });
  }

  public verifyOtp(request: VerifyOtpRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/verify-otp`, request, { responseType: 'text' });
  }

  public login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, request);
  }

  public refreshToken(request: RefreshTokenRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, request);
  }

  public forgotPassword(request: ForgotPasswordRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/forgot-password`, request, { responseType: 'text' });
  }

  public resetPassword(request: ResetPasswordRequest): Observable<string> {
    const payload = {
      identifier: request.identifier || '',
      otp: request.otp || request.token || '',
      token: request.token || request.otp || '',
      newPassword: request.newPassword,
      confirmPassword: request.confirmPassword || request.newPassword
    };
    return this.http.post(`${this.baseUrl}/reset-password`, payload, { responseType: 'text' });
  }

  public checkUsername(username: string): Observable<{ username: string; exists: boolean; available: boolean }> {
    const params = `?username=${encodeURIComponent(username)}`;
    return this.http.get<{ username: string; exists: boolean; available: boolean }>(`${this.baseUrl}/check-username${params}`);
  }

  public logout(): Observable<string> {
    return this.http.post(`${this.baseUrl}/logout`, {}, { responseType: 'text' });
  }
}
