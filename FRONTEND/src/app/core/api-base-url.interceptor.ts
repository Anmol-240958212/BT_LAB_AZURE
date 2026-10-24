import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable()
export class ApiBaseUrlInterceptor implements HttpInterceptor {
  private readonly authPrefixes = ['/auth', '/users', '/customer', '/admin', '/api/auth'];
  private readonly fdPrefixes = ['/api/fd', '/api/report'];
  private readonly productPrefixes = ['/api/product'];

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (/^https?:\/\//i.test(request.url)) {
      return next.handle(request);
    }

    const baseUrl = this.resolveBaseUrl(request.url);
    if (!baseUrl) {
      return next.handle(request);
    }

    return next.handle(request.clone({
      url: `${baseUrl.replace(/\/$/, '')}/${request.url.replace(/^\//, '')}`
    }));
  }

  private resolveBaseUrl(url: string): string {
    if (this.matches(url, this.productPrefixes)) {
      return environment.api.productBaseUrl;
    }
    if (this.matches(url, this.fdPrefixes)) {
      return environment.api.fdBaseUrl;
    }
    if (this.matches(url, this.authPrefixes)) {
      return environment.api.authBaseUrl;
    }
    return '';
  }

  private matches(url: string, prefixes: string[]): boolean {
    return prefixes.some(prefix => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`));
  }
}
