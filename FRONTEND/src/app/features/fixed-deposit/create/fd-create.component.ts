import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FDAccountApiService } from '../../../core/api/fd-account-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { AuthService } from '../../../core/auth.service';
import { FixedDepositAccountRequest } from '../../../core/models/fd.models';
import { ToastService } from '../../../shared/services/toast.service';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap, tap } from 'rxjs/operators';
import { ProductPricingApiService } from '../../../core/api/product-pricing-api.service';
import { ProductRecord } from '../../../core/models/product.models';

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
                <option value="">{{ productLoading ? 'Loading products…' : 'Select an active product' }}</option>
                <option *ngFor="let product of products" [value]="product.productCode">
                  {{ product.productName }} — {{ product.productCode }}
                </option>
              </select>
              <small *ngIf="selectedProduct">Rate range: {{ selectedProduct.rateLimit.min }}–{{ selectedProduct.rateLimit.max }}%</small>
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
              [readonly]="true"
              hint="Quoted by Product & Pricing for the selected product, amount, and term"
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
          <div *ngIf="quoteError" class="quote-error" role="alert">{{ quoteError }}</div>
          <div *ngIf="quoteLoading" class="form-hint">Updating the contracted rate…</div>
          <div *ngIf="!productLoading && products.length === 0" class="quote-error" role="status">
            No active fixed-deposit products are configured. Add one in Products & Pricing first.
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
              [disabled]="fdForm.invalid || submitting || quoteLoading || !rateReady"
            >
              {{ submitting ? 'Generating Account...' : 'Confirm & Create Account' }}
            </app-button>
          </div>
        </form>
      </app-card>
    </div>
  `,
  styles: [`
    .quote-error { margin:10px 0; border:1px solid #d97a7a; background:rgba(217,122,122,.12); color:var(--color-text-primary); border-radius:var(--radius-input); padding:10px 12px; font-size:var(--text-sm); }
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
export class FDCreateComponent implements OnInit, OnDestroy {
  fdForm!: FormGroup;
  submitting = false;
  products: ProductRecord[] = [];
  productLoading = false;
  quoteLoading = false;
  quoteError = '';
  private quote: number | null = null;
  private formChanges?: Subscription;

  get rateReady(): boolean { return this.quote != null; }

  get selectedProduct(): ProductRecord | undefined {
    return this.products.find(product => product.productCode === this.fdForm?.get('productCode')?.value);
  }

  get isCustomer(): boolean {
    return this.authService.getRole() === 'CUSTOMER';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly fdAccountApi: FDAccountApiService,
    private readonly userApi: UserApiService,
    private readonly authService: AuthService,
    private readonly productApi: ProductPricingApiService,
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
      productCode: [q['productCode'] || '', Validators.required],
      branchCode: [initialBranch, [Validators.required, Validators.pattern(/^\d{3}$/)]],
      principalAmount: [q['principal'] ? Number(q['principal']) : 100000, [Validators.required, Validators.min(1000)]],
      interestRate: [q['rate'] ? Number(q['rate']) : '', [Validators.required, Validators.min(0.1), Validators.max(100)]],
      termMonths: [q['term'] ? Number(q['term']) : 12, [Validators.required, Validators.min(1)]],
      interestType: [q['interestType'] || 'COMPOUND', Validators.required],
      interestPayoutType: ['MATURITY', Validators.required],
      interestFrequency: ['QUARTERLY', Validators.required],
      createWithTxn: [true]
    });

    this.formChanges = this.fdForm.valueChanges.pipe(
      map(value => ({
        productCode: String(value.productCode || ''),
        principal: Number(value.principalAmount),
        term: Number(value.termMonths)
      })),
      distinctUntilChanged((previous, current) => previous.productCode === current.productCode
        && previous.principal === current.principal && previous.term === current.term),
      tap(() => { this.quote = null; this.quoteError = ''; }),
      debounceTime(250),
      switchMap(value => {
        const { productCode, principal, term } = value;
        if (!productCode || !Number.isFinite(principal) || principal <= 0 || !Number.isFinite(term) || term <= 0) {
          this.quoteLoading = false;
          return of(null);
        }
        this.quoteLoading = true;
        return this.productApi.getEffectiveRate(productCode, { principal, term, termUnit: 'MONTHS' }).pipe(
          catchError(err => {
            this.quoteError = err?.error?.message || err?.error?.detail || 'Could not quote this product for the entered amount and term.';
            return of(null);
          }),
          finalize(() => this.quoteLoading = false)
        );
      })
    ).subscribe(rate => {
      this.quote = rate?.effectiveRate ?? null;
      if (this.quote != null) this.fdForm.patchValue({ interestRate: this.quote }, { emitEvent: false });
    });

    this.productLoading = true;
    this.productApi.search({ productType: 'FD', status: 'ACTIVE', page: 0, size: 100 }).pipe(
      finalize(() => this.productLoading = false)
    ).subscribe({
      next: response => {
        this.products = response.content || [];
        const requested = q['productCode'];
        const initial = this.products.find(product => product.productCode === requested) || this.products[0];
        if (initial) this.fdForm.patchValue({ productCode: initial.productCode });
      },
      error: err => this.quoteError = err?.error?.message || err?.error?.detail || 'Could not load active products.'
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

  ngOnDestroy(): void {
    this.formChanges?.unsubscribe();
  }

  onSubmit(): void {
    if (this.fdForm.invalid || this.submitting || this.quoteLoading || this.quote == null) {
      this.fdForm.markAllAsTouched();
      if (this.quote == null && !this.quoteLoading) this.quoteError = 'Wait for a valid Product Pricing quote before creating the account.';
      return;
    }

    this.submitting = true;
    const formVal = this.fdForm.getRawValue();
    const req: FixedDepositAccountRequest = {
      customerId: String(formVal.customerId).trim(),
      productCode: formVal.productCode,
      branchCode: String(formVal.branchCode).trim(),
      principalAmount: Number(formVal.principalAmount),
      interestRate: this.quote,
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
