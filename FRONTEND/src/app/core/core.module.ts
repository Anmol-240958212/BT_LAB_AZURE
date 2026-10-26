import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AuthService } from './auth.service';
import { JwtInterceptor } from './jwt.interceptor';
import { ErrorInterceptor } from './error.interceptor';
import { ApiBaseUrlInterceptor } from './api-base-url.interceptor';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';

import { AuthApiService } from './api/auth-api.service';
import { CustomerApiService } from './api/customer-api.service';
import { AdminApiService } from './api/admin-api.service';
import { UserApiService } from './api/user-api.service';
import { FDAccountApiService } from './api/fd-account-api.service';
import { FDCalculatorApiService } from './api/fd-calculator-api.service';
import { FDTransactionApiService } from './api/fd-transaction-api.service';
import { FDInterestApiService } from './api/fd-interest-api.service';
import { FDMaturityApiService } from './api/fd-maturity-api.service';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    AuthService,
    AuthGuard,
    RoleGuard,
    AuthApiService,
    CustomerApiService,
    AdminApiService,
    UserApiService,
    FDAccountApiService,
    FDCalculatorApiService,
    FDTransactionApiService,
    FDInterestApiService,
    FDMaturityApiService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiBaseUrlInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it only in the AppModule.');
    }
  }
}
