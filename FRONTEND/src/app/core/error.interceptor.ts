import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthApiService } from './api/auth-api.service';
import { LoginResponse } from './models/auth.models';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly authApiService: AuthApiService
  ) {}

  // Shared by simultaneous 401 responses so only one refresh request is sent.
  private refreshRequest$: Observable<string> | null = null;

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthEndpoint = request.url.includes('/auth/');

        if (error.status === 401 && !isAuthEndpoint) {
          const refreshToken = this.authService.getRefreshToken();

          if (refreshToken) {
            if (!this.refreshRequest$) {
              this.refreshRequest$ = this.authApiService.refreshToken({ refreshToken }).pipe(
                map((response: LoginResponse) => {
                  this.authService.updateAccessToken(response.accessToken);
                  return response.accessToken;
                }),
                catchError(refreshError => {
                  this.clearSessionAndRedirect();
                  return throwError(() => refreshError);
                }),
                finalize(() => {
                  this.refreshRequest$ = null;
                }),
                shareReplay(1)
              );
            }

            return this.refreshRequest$.pipe(
              switchMap(newAccessToken => {
                const retryRequest = request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newAccessToken}`
                  }
                });
                return next.handle(retryRequest);
              }),
              catchError(() => throwError(() => error))
            );
          }

          this.clearSessionAndRedirect();
        }

        let errorMessage = error.error?.detail || error.error?.message;
        if (!errorMessage && typeof error.error === 'string' && error.error.trim().length > 0) {
          if (error.error.includes('<html') || error.error.includes('<!DOCTYPE')) {
            errorMessage = error.status === 502
              ? 'Backend service unavailable (502 Bad Gateway). Please start backend microservices.'
              : error.statusText;
          } else {
            try {
              const parsed = JSON.parse(error.error);
              errorMessage = parsed.detail || parsed.message || parsed.title || error.error;
            } catch {
              errorMessage = error.error;
            }
          }
        }
        if (!errorMessage) {
          errorMessage = error.statusText || 'An unexpected error occurred';
        }

        const errObj = new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        (errObj as any).status = error.status;
        (errObj as any).statusText = error.statusText;
        (errObj as any).error = error.error;
        return throwError(() => errObj);
      })
    );
  }

  private clearSessionAndRedirect(): void {
    this.authService.clearSession();
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }
}
