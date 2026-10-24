import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeeManagementComponent } from './employees/employee-management.component';
import { BatchOperationsComponent } from './batch/batch-operations.component';

const routes: Routes = [
  { path: 'employees', component: EmployeeManagementComponent },
  { path: 'batch', component: BatchOperationsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
