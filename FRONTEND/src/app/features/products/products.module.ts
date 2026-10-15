import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductManagementComponent } from './product-management.component';

@NgModule({
  declarations: [ProductManagementComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedModule, ProductsRoutingModule]
})
export class ProductsModule {}
