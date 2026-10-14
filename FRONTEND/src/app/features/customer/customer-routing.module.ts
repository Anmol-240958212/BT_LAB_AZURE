import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerProfileComponent } from './profile/customer-profile.component';
import { CustomerListComponent } from './list/customer-list.component';
import { RoleGuard } from '../../core/role.guard';

const routes: Routes = [
  { path: 'profile', component: CustomerProfileComponent },
  {
    path: 'all',
    component: CustomerListComponent,
    canActivate: [RoleGuard],
    data: { roles: ['BANK_OFFICER', 'ADMIN'] }
  },
  {
    path: 'list',
    component: CustomerListComponent,
    canActivate: [RoleGuard],
    data: { roles: ['BANK_OFFICER', 'ADMIN'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule {}
