import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Auto logout on 401 response if not already on an auth page
          if (!request.url.includes('/login') && !request.url.includes('/register') && !request.url.includes('/auth/')) {
            this.authService.clearSession();
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url }
            });
          }
        } else if (error.status === 403 && !request.url.includes('/auth/')) {
          // Forbidden access
          this.router.navigate(['/unauthorized']);
        }

        let errorMessage = error.error?.detail || error.error?.message;
        if (!errorMessage && typeof error.error === 'string' && error.error.trim().length > 0) {
          if (error.error.includes('<html') || error.error.includes('<!DOCTYPE')) {
            errorMessage = error.status === 502
              ? 'Backend service unavailable (502 Bad Gateway). Please start backend microservices.'
              : error.statusText;
          } else {
            errorMessage = error.error;
          }
        }
        if (!errorMessage) {
          errorMessage = error.statusText || 'An unexpected error occurred';
        }

        return throwError(() => new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)));
      })
    );
  }
}
