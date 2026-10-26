import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * The development server proxies these route prefixes to local microservices.
 * Azure Static Web Apps only serves the Angular files, so production requests
 * must instead be sent to the public Container App endpoints.
 */
@Injectable()
export class ApiBaseUrlInterceptor implements HttpInterceptor {
  private readonly hostedServices = {
    auth: 'https://vaultone-auth.jollybush-2b2bef4c.centralindia.azurecontainerapps.io',
    fd: 'https://vaultone-fd.jollybush-2b2bef4c.centralindia.azurecontainerapps.io',
    product: 'https://vaultone-product.jollybush-2b2bef4c.centralindia.azurecontainerapps.io'
  };

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isLocal() || /^https?:\/\//i.test(request.url)) {
      return next.handle(request);
    }

    const baseUrl = this.serviceFor(request.url);
    return next.handle(baseUrl ? request.clone({ url: `${baseUrl}${request.url}` }) : request);
  }

  private isLocal(): boolean {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }

  private serviceFor(url: string): string | null {
    if (url.startsWith('/auth/') || url.startsWith('/users/') || url.startsWith('/customer/') || url.startsWith('/admin/')) {
      return this.hostedServices.auth;
    }
    if (url.startsWith('/api/product/')) {
      return this.hostedServices.product;
    }
    if (url.startsWith('/api/fd/') || url.startsWith('/api/report/')) {
      return this.hostedServices.fd;
    }
    return null;
  }
}
