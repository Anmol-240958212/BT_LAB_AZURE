import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { EmployeeManagementComponent } from './employees/employee-management.component';
import { BatchOperationsComponent } from './batch/batch-operations.component';

@NgModule({
  declarations: [
    EmployeeManagementComponent,
    BatchOperationsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    AdminRoutingModule
  ]
})
export class AdminModule {}
