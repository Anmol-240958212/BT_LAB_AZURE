import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FDCalculatorComponent } from './calculator/fd-calculator.component';
import { FDAccountsComponent } from './accounts/fd-accounts.component';
import { FDCreateComponent } from './create/fd-create.component';
import { FDTransactionsComponent } from './transactions/fd-transactions.component';
import { RoleGuard } from '../../core/role.guard';
import { AuthGuard } from '../../core/auth.guard';

const routes: Routes = [
  {
    path: 'calculator', component: FDCalculatorComponent, canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN'] }
  },
  { path: 'accounts', component: FDAccountsComponent, canActivate: [AuthGuard] },
  {
    path: 'create',
    component: FDCreateComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN'] }
  },
  {
    path: 'transactions',
    component: FDTransactionsComponent,
    canActivate: [RoleGuard],
    data: { roles: ['STAFF', 'BANK_OFFICER', 'ADMIN'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FixedDepositRoutingModule {}

