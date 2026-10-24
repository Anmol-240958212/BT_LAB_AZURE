import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsComponent } from './reports.component';
import { RoleGuard } from '../../core/role.guard';

const routes: Routes = [
  {
    path: '', component: ReportsComponent, canActivate: [RoleGuard],
    data: { roles: ['CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule {}
