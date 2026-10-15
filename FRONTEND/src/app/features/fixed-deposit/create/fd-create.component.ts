import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FDAccountApiService } from '../../../core/api/fd-account-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { AuthService } from '../../../core/auth.service';
import { FixedDepositAccountRequest } from '../../../core/models/fd.models';
import { ToastService } from '../../../shared/services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-fd-create',
  standalone: false,
  template: `
    <div class="fd-create-page animate-fade-in">
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">{{ isCustomer ? 'TERM DEPOSIT BOOKING' : 'ACCOUNT ORIGINATION WORKFLOW' }}</span>
            <h1 class="card-title mt-1">Open Fixed Deposit Account</h1>
            <p class="card-subtitle">
              {{ isCustomer ? 'Lock in attractive interest yields and book your new fixed deposit.' : 'Issue a new term deposit instrument linked to customer KYC and branch ledger.' }}
            </p>
          </div>
          <app-badge variant="role" [text]="isCustomer ? 'Customer Self-Service' : 'Officer / Admin Action'"></app-badge>
        </div>
      </div>

      <!-- Creation Form Card -->
      <app-card title="Deposit Contract Specifications" subtitle="Fill required parameters to generate FD account number">
        <form [formGroup]="fdForm" (ngSubmit)="onSubmit()" class="fd-create-form">
          <div class="grid-3">
            <app-input
              id="fd-cust-id"
              label="Customer Identifier *"
              placeholder="e.g. 10"
              formControlName="customerId"
              [required]="true"
              [hint]="isCustomer ? 'Linked to your verified KYC profile' : 'Customer must have ACTIVE KYC synced via Kafka'"
            ></app-input>

            <div class="form-group">
              <label class="form-label" for="fd-prod-code">Product Code *</label>
              <select id="fd-prod-code" class="form-select" formControlName="productCode">
                <option value="PROD_FD_STANDARD">PROD_FD_STANDARD — Standard Fixed Deposit</option>
                <option value="PROD_FD_CUMULATIVE">PROD_FD_CUMULATIVE — Cumulative Growth FD</option>
                <option value="PROD_FD_SENIOR">PROD_FD_SENIOR — Senior Citizen Deposit</option>
                <option value="PROD_FD_QUARTERLY">PROD_FD_QUARTERLY — Quarterly Payout FD</option>
              </select>
            </div>

            <app-input
              id="fd-branch-code"
              label="Branch Code (3 digits) *"
              placeholder="e.g. 001"
              formControlName="branchCode"
              [required]="true"
              hint="Exactly 3 digits required (e.g. 001, 501)"
            ></app-input>
          </div>

          <div class="grid-3">
            <app-input
              id="fd-principal"
              label="Principal Deposit Amount (₹)"
              type="number"
              placeholder="e.g. 100000"
              formControlName="principalAmount"
              [required]="true"
              hint="Minimum: ₹ 1,000"
            ></app-input>

            <app-input
              id="fd-rate"
              label="Contracted Interest Rate (% p.a.)"
              type="number"
              placeholder="e.g. 7.50"
              formControlName="interestRate"
              [required]="true"
              hint="Subject to 8.5% regulatory cap"
            ></app-input>

            <app-input
              id="fd-term-months"
              label="Term Duration (Months)"
              type="number"
              placeholder="e.g. 12"
              formControlName="termMonths"
              [required]="true"
            ></app-input>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label class="form-label" for="fd-interest-type">Interest Accrual Type *</label>
              <select id="fd-interest-type" class="form-select" formControlName="interestType">
                <option value="COMPOUND">Compound Interest</option>
                <option value="SIMPLE">Simple Interest</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="fd-payout-type">Payout Frequency *</label>
              <select id="fd-payout-type" class="form-select" formControlName="interestPayoutType">
                <option value="MATURITY">At Maturity</option>
                <option value="ANNUAL">Annual Payout</option>
                <option value="QUARTERLY">Quarterly Payout</option>
                <option value="MONTHLY">Monthly Credit</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="fd-frequency">Compounding Frequency *</label>
              <select id="fd-frequency" class="form-select" formControlName="interestFrequency">
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half Yearly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>
          </div>

          <!-- L16 Checkbox: Create With Initial Transaction -->
          <div class="initial-txn-box">
            <label class="checkbox-item">
              <input type="checkbox" formControlName="createWithTxn" />
              <span>
                <strong>Post Initial Deposit Transaction:</strong>
                Simultaneously record initial deposit debit in the transactions ledger.
              </span>
            </label>
          </div>

          <div class="form-actions mt-6">
            <app-button
              type="button"
              variant="secondary"
              (clicked)="router.navigate(['/fixed-deposit/accounts'])"
            >
              Cancel
            </app-button>
            <app-button
              type="submit"
              variant="primary"
              [loading]="submitting"
              [disabled]="fdForm.invalid || submitting"
            >
              {{ submitting ? 'Generating Account...' : 'Confirm & Create Account' }}
            </app-button>
          </div>
        </form>
      </app-card>
    </div>
  `,
  styles: [`
    .section-tag {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }
    .fd-create-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .initial-txn-box {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-4);
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      cursor: pointer;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }
  `]
})
export class FDCreateComponent implements OnInit {
  fdForm!: FormGroup;
  submitting = false;

  get isCustomer(): boolean {
    return this.authService.getRole() === 'CUSTOMER';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly fdAccountApi: FDAccountApiService,
    private readonly userApi: UserApiService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    public readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParams;
    const initialBranch = q['branchCode'] || '001';
    const initialCust = q['customerId'] || '';

    this.fdForm = this.fb.group({
      customerId: [initialCust, Validators.required],
      productCode: ['PROD_FD_CUMULATIVE', Validators.required],
      branchCode: [initialBranch, [Validators.required, Validators.pattern(/^\d{3}$/)]],
      principalAmount: [q['principal'] ? Number(q['principal']) : 100000, [Validators.required, Validators.min(1000)]],
      interestRate: [q['rate'] ? Number(q['rate']) : 7.25, [Validators.required, Validators.min(0.1), Validators.max(8.5)]],
      termMonths: [q['term'] ? Number(q['term']) : 12, [Validators.required, Validators.min(1)]],
      interestType: [q['interestType'] || 'COMPOUND', Validators.required],
      interestPayoutType: ['MATURITY', Validators.required],
      interestFrequency: ['QUARTERLY', Validators.required],
      createWithTxn: [true]
    });

    this.userApi.getMe().subscribe({
      next: (profile) => {
        if (profile?.customerId) {
          this.fdForm.patchValue({ customerId: String(profile.customerId) });
          if (this.isCustomer) {
            this.fdForm.get('customerId')?.disable();
          }
        }
      },
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.fdForm.invalid || this.submitting) {
      this.fdForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formVal = this.fdForm.getRawValue();
    const req: FixedDepositAccountRequest = {
      customerId: String(formVal.customerId).trim(),
      productCode: formVal.productCode,
      branchCode: String(formVal.branchCode).trim(),
      principalAmount: Number(formVal.principalAmount),
      interestRate: Number(formVal.interestRate),
      termMonths: Number(formVal.termMonths),
      interestType: formVal.interestType,
      interestPayoutType: formVal.interestPayoutType,
      interestFrequency: formVal.interestFrequency
    };

    const call$: Observable<any> = formVal.createWithTxn
      ? this.fdAccountApi.createAccountWithTransaction(req)
      : this.fdAccountApi.createAccount(req);

    call$.subscribe({
      next: (res: any) => {
        this.submitting = false;
        const accNo = res.account?.fdAccountNo || res.fdAccountNo || 'FD-Generated';
        this.toastService.success(`Fixed Deposit Account ${accNo} created successfully!`, 'Account Originated');
        this.router.navigate(['/fixed-deposit/accounts']);
      },
      error: (err: any) => {
        this.submitting = false;
        const msg = err.error?.detail || err.error?.message || err.message || 'Fixed deposit creation failed. Ensure customer is KYC approved and synced via Kafka.';
        this.toastService.error(msg, 'Account Origination Failed');
      }
    });
  }
}
