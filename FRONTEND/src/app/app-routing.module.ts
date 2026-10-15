import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { UnauthorizedComponent } from './shared/components/unauthorized/unauthorized.component';
import { NotFoundComponent } from './shared/components/not-found/not-found.component';
import { AuthGuard } from './core/auth.guard';
import { RoleGuard } from './core/role.guard';

const routes: Routes = [
  // 1. Public Landing Page at root URL
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/landing/landing.module').then(m => m.LandingModule)
  },

  // 2. Authentication & Public Shell (AuthLayout) - /login, /register, etc.
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
      },
      {
        path: 'unauthorized',
        component: UnauthorizedComponent
      }
    ]
  },

  // 2. Core Banking Shell (DashboardLayout)
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'dashboard',
        canActivate: [AuthGuard],
        loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'profile',
        canActivate: [AuthGuard],
        loadChildren: () => import('./features/user/user.module').then(m => m.UserModule)
      },
      {
        path: 'customer',
        canActivate: [AuthGuard],
        loadChildren: () => import('./features/customer/customer.module').then(m => m.CustomerModule)
      },
      {
        path: 'fixed-deposit',
        loadChildren: () => import('./features/fixed-deposit/fixed-deposit.module').then(m => m.FixedDepositModule)
      },
      {
        path: 'admin',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
      },
      {
        path: 'reports',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['BANK_OFFICER', 'ADMIN'] },
        loadChildren: () => import('./features/reports/reports.module').then(m => m.ReportsModule)
      },
      {
        path: 'products',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['BANK_OFFICER', 'ADMIN'] },
        loadChildren: () => import('./features/products/products.module').then(m => m.ProductsModule)
      },

      // Route Aliases per implementation.md Section 3.3
      { path: 'fd/calculator', redirectTo: 'fixed-deposit/calculator', pathMatch: 'full' },
      { path: 'fd/accounts', redirectTo: 'fixed-deposit/accounts', pathMatch: 'full' },
      { path: 'fd/accounts/create', redirectTo: 'fixed-deposit/create', pathMatch: 'full' },
      { path: 'fd/transactions', redirectTo: 'fixed-deposit/transactions', pathMatch: 'full' },
      { path: 'fd/withdraw', redirectTo: 'fixed-deposit/accounts', pathMatch: 'full' },
      { path: 'batch/interest', redirectTo: 'admin/batch', pathMatch: 'full' },
      { path: 'batch/maturity', redirectTo: 'admin/batch', pathMatch: 'full' },
      { path: 'reports/fd-summary', redirectTo: 'reports', pathMatch: 'full' },
      { path: 'reports/portfolio', redirectTo: 'reports', pathMatch: 'full' }
    ]
  },

  // 3. Fallback & 404
  {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
