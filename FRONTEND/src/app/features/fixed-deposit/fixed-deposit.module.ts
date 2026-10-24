import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { FixedDepositRoutingModule } from './fixed-deposit-routing.module';

import { FDCalculatorComponent } from './calculator/fd-calculator.component';
import { FDAccountsComponent } from './accounts/fd-accounts.component';
import { FDCreateComponent } from './create/fd-create.component';
import { FDTransactionsComponent } from './transactions/fd-transactions.component';

@NgModule({
  declarations: [
    FDCalculatorComponent,
    FDAccountsComponent,
    FDCreateComponent,
    FDTransactionsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FixedDepositRoutingModule
  ]
})
export class FixedDepositModule {}
