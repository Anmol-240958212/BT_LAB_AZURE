import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Pipes
import { MaskPipe } from './pipes/mask.pipe';
import { CurrencyInrPipe } from './pipes/currency-inr.pipe';
import { FdStatusPipe } from './pipes/fd-status.pipe';

// Components
import { AppButtonComponent } from './components/button/button.component';
import { AppInputComponent } from './components/input/input.component';
import { AppCardComponent } from './components/card/card.component';
import { AppTableComponent } from './components/table/table.component';
import { AppModalComponent } from './components/modal/modal.component';
import { AppBadgeComponent } from './components/badge/badge.component';
import { AppToastComponent } from './components/toast/toast.component';
import { AppSpinnerComponent } from './components/spinner/spinner.component';
import { AppSidebarComponent } from './components/sidebar/sidebar.component';
import { AppTopbarComponent } from './components/topbar/topbar.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { AppIconComponent } from './components/icon/icon.component';

// Layouts
import { AuthLayoutComponent } from '../layouts/auth-layout/auth-layout.component';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout/dashboard-layout.component';

const PIPES = [
  MaskPipe,
  CurrencyInrPipe,
  FdStatusPipe
];

const COMPONENTS = [
  AppButtonComponent,
  AppInputComponent,
  AppCardComponent,
  AppTableComponent,
  AppModalComponent,
  AppBadgeComponent,
  AppToastComponent,
  AppSpinnerComponent,
  AppSidebarComponent,
  AppTopbarComponent,
  ThemeToggleComponent,
  AppIconComponent,
  UnauthorizedComponent,
  NotFoundComponent,
  AuthLayoutComponent,
  DashboardLayoutComponent
];

@NgModule({
  declarations: [
    ...PIPES,
    ...COMPONENTS
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ...PIPES,
    ...COMPONENTS
  ]
})
export class SharedModule {}
