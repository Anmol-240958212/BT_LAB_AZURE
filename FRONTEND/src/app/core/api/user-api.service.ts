import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfileResponse, UserUpdateRequest } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly baseUrl = '/users';

  constructor(private readonly http: HttpClient) {}

  public getMe(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.baseUrl}/me`);
  }

  public updateMe(request: UserUpdateRequest): Observable<UserProfileResponse> {
    return this.http.put<UserProfileResponse>(`${this.baseUrl}/me`, request);
  }
}
