import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { CustomerRoutingModule } from './customer-routing.module';
import { CustomerProfileComponent } from './profile/customer-profile.component';
import { CustomerListComponent } from './list/customer-list.component';

@NgModule({
  declarations: [
    CustomerProfileComponent,
    CustomerListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CustomerRoutingModule
  ]
})
export class CustomerModule {}
