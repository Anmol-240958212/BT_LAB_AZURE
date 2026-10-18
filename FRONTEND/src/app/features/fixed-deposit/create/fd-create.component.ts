import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FDAccountApiService } from '../../../core/api/fd-account-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { FixedDepositAccountRequest } from '../../../core/models/fd.models';
import { ToastService } from '../../../shared/services/toast.service';
import { Observable, Subject, Subscription, timer, of } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { FDProductApiService } from '../../../core/api/fd-product-api.service';
import { ProductRecord } from '../../../core/models/product.models';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-fd-create',
  standalone: false,
  template: `
    <div class="fd-create-page animate-fade-in">
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">ACCOUNT ORIGINATION WORKFLOW</span>
            <h1 class="card-title mt-1">Open Fixed Deposit Account</h1>
            <p class="card-subtitle">
              Open a fixed deposit linked to a verified customer profile.
            </p>
          </div>
          <app-badge variant="role" [text]="isCustomer ? 'Customer Deposit' : 'Officer / Admin Action'"></app-badge>
        </div>
      </div>

      <!-- Creation Form Card -->
      <app-card title="Deposit Contract Specifications" subtitle="Fill required parameters to generate FD account number">
        <p *ngIf="isCustomer && !profileReady">Loading your customer profile...</p>
        <p *ngIf="profileError">{{ profileError }}</p>
        <p *ngIf="isCustomer && profileReady && !kycActive">
          Complete your <a routerLink="/customer/profile">KYC verification</a> before opening a fixed deposit.
        </p>
        <p *ngIf="isCustomer && profileReady && kycActive">This deposit will be opened for your own customer profile.</p>
        <form [formGroup]="fdForm" (ngSubmit)="onSubmit()" class="fd-create-form">
          <div class="grid-3">
            <app-input
              *ngIf="!isCustomer"
              id="fd-cust-id"
              label="Customer Identifier *"
              placeholder="e.g. 10"
              formControlName="customerId"
              [required]="true"
              hint="Customer must have ACTIVE KYC synced via Kafka"
            ></app-input>

            <div class="form-group">
              <label class="form-label" for="fd-prod-code">Product Code *</label>
              <select id="fd-prod-code" class="form-select" formControlName="productCode">
                <option value="">{{ productsLoading ? 'Loading products…' : 'Select a product' }}</option>
                <option *ngFor="let product of products" [value]="product.productCode">{{ product.productCode }} — {{ product.productName }}</option>
              </select>
              <small *ngIf="!productsLoading && !products.length">No active FD products have synchronized yet. Create one in Products & Pricing and allow a few seconds.</small>
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
              [label]="'Principal Deposit Amount (' + (selectedProduct?.currency || 'INR') + ')'"
              type="number"
              placeholder="e.g. 100000"
              formControlName="principalAmount"
              [required]="true"
              hint="Minimum amount: 1,000"
            ></app-input>

            <app-input
              id="fd-rate"
              label="Contracted Interest Rate (% p.a.)"
              type="number"
              placeholder="e.g. 7.50"
              formControlName="interestRate"
              [required]="true"
              hint="Automatically quoted from the selected product"
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

          <div class="initial-txn-box" *ngIf="selectedProduct as product">
            <strong>{{ product.productName }}</strong>
            <p>{{ product.description }}</p>
            <p>Currency: {{ product.currency }} · Term: {{ product.termLimit.min }}–{{ product.termLimit.max }} months · Rate range: {{ product.rateLimit.min }}%–{{ product.rateLimit.max }}%</p>
            <p *ngIf="product.baseRate != null">Base rate: {{ product.baseRate }}% p.a.</p>
            <p *ngIf="product.rateMatrix.length">This product has amount and tenure based rates. The quoted rate updates when those values change.</p>
            <p *ngFor="let charge of product.charges">{{ charge.chargeCode }}: {{ charge.calculationType === 'PERCENTAGE' ? charge.percentage + '%' : charge.amount + ' ' + (charge.currencyCode || product.currency) }}</p>
            <small>Payout frequency is selected separately; it is not configured by this product.</small>
          </div>
          <p *ngIf="productsError" role="alert">{{ productsError }}</p>
          <p *ngIf="quoteLoading">Fetching current product pricing…</p>
          <p *ngIf="quoteError" role="alert">{{ quoteError }}</p>

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
          <div class="initial-txn-box" *ngIf="!isCustomer">
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
              [disabled]="fdForm.invalid || !quoteReady || quoteLoading || submitting || (isCustomer && (!profileReady || !kycActive))"
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
export class FDCreateComponent implements OnInit, OnDestroy {
  fdForm!: FormGroup;
  submitting = false;
  isCustomer = false;
  profileReady = false;
  kycActive = false;
  profileError = '';
  private ownCustomerId = '';
  products: ProductRecord[] = [];
  selectedProduct: ProductRecord | null = null;
  productsLoading = true;
  productsError = '';
  quoteError = '';
  quoteLoading = false;
  quoteReady = false;
  private readonly destroy$ = new Subject<void>();
  private quoteSubscription?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly fdAccountApi: FDAccountApiService,
    private readonly userApi: UserApiService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    public readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly productApi: FDProductApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isCustomer = this.authService.getRole() === 'CUSTOMER';
    const q = this.route.snapshot.queryParams;
    const initialBranch = q['branchCode'] || '001';
    const initialCust = this.isCustomer ? '' : q['customerId'] || '';

    this.fdForm = this.fb.group({
      customerId: [initialCust, Validators.required],
      productCode: ['', Validators.required],
      branchCode: [initialBranch, [Validators.required, Validators.pattern(/^\d{3}$/)]],
      principalAmount: [q['principal'] ? Number(q['principal']) : 100000, [Validators.required, Validators.min(1000)]],
      interestRate: [{ value: null, disabled: true }],
      termMonths: [q['term'] ? Number(q['term']) : 12, [Validators.required, Validators.min(1)]],
      interestType: [{ value: '', disabled: true }],
      interestPayoutType: ['MATURITY', Validators.required],
      interestFrequency: [{ value: '', disabled: true }],
      createWithTxn: [true]
    });

    this.fdForm.get('productCode')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.selectProduct());
    for (const name of ['principalAmount', 'termMonths']) {
      this.fdForm.get(name)!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshQuote());
    }
    timer(0, 10000).pipe(takeUntil(this.destroy$), switchMap(() => this.productApi.list().pipe(
      catchError(err => { this.productsError = err.error?.detail || 'Unable to load synchronized products from the FD service.'; return of(null); })
    ))).subscribe(products => {
      this.productsLoading = false;
      if (products) {
        this.productsError = '';
        const previous = JSON.stringify(this.selectedProduct);
        this.products = products;
        const code = this.fdForm.get('productCode')!.value;
        if (!code && products.length) this.fdForm.patchValue({ productCode: products.some(p => p.productCode === q['productCode']) ? q['productCode'] : products[0].productCode });
        else if (previous !== JSON.stringify(products.find(p => p.productCode === code) || null)) this.selectProduct();
      } else { this.products = []; this.selectProduct(); }
      this.cdr.markForCheck();
    });

    this.userApi.getMe().subscribe({
      next: (profile) => {
        this.profileReady = true;
        this.kycActive = profile?.customerStatus === 'ACTIVE';
        if (this.isCustomer) {
          this.ownCustomerId = profile?.customerId ? String(profile.customerId) : '';
          this.fdForm.patchValue({ customerId: this.ownCustomerId });
          if (!this.ownCustomerId) this.profileError = 'Your account has no customer profile. Please contact support.';
        } else if (profile?.customerId && !q['customerId']) {
          this.fdForm.patchValue({ customerId: String(profile.customerId) });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.profileReady = true;
        this.profileError = 'Unable to load your profile. Refresh the page and try again.';
        this.cdr.markForCheck();
      }
    });
  }

  private selectProduct(): void {
    const code = this.fdForm.get('productCode')!.value;
    this.selectedProduct = this.products.find(product => product.productCode === code) || null;
    if (this.selectedProduct) {
      const term = this.fdForm.get('termMonths')!;
      const limits = this.selectedProduct.termLimit;
      term.setValidators([Validators.required, Validators.min(limits.min), Validators.max(limits.max), Validators.pattern(/^\d+$/)]);
      if (!term.value || term.value < limits.min || term.value > limits.max) term.setValue(limits.min, { emitEvent: false });
      term.updateValueAndValidity({ emitEvent: false });
    } else this.fdForm.patchValue({ productCode: '' }, { emitEvent: false });
    this.refreshQuote();
  }

  private refreshQuote(): void {
    this.quoteSubscription?.unsubscribe();
    this.quoteReady = false; this.quoteLoading = false; this.quoteError = '';
    this.fdForm.patchValue({ interestRate: null, interestType: '', interestFrequency: '' }, { emitEvent: false });
    const product = this.selectedProduct;
    if (!product) return;
    if (this.fdForm.get('principalAmount')!.invalid || this.fdForm.get('termMonths')!.invalid) {
      this.quoteError = `Enter a valid deposit amount and a whole-month term between ${product.termLimit.min} and ${product.termLimit.max}.`;
      return;
    }
    const value = this.fdForm.getRawValue();
    this.quoteLoading = true;
    this.quoteSubscription = timer(250).pipe(switchMap(() => this.productApi.quote(product.productCode, Number(value.principalAmount), Number(value.termMonths))))
      .subscribe({
        next: quote => {
          this.quoteLoading = false;
          const frequency = quote.interestFrequency === 'ANNUALLY' ? 'ANNUAL' : quote.interestFrequency;
          if (!quote.valid || quote.interestRate == null) this.quoteError = quote.message;
          else if (!['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'].includes(frequency)) this.quoteError = 'This product frequency is not supported for FD accounts.';
          else {
            this.fdForm.patchValue({ interestRate: quote.interestRate, interestType: quote.interestType, interestFrequency: frequency }, { emitEvent: false });
            this.quoteReady = product.currency === 'INR';
            if (!this.quoteReady) this.quoteError = `This product uses ${product.currency}. FD accounts currently support INR only; select an INR product to create an account.`;
          }
          this.cdr.markForCheck();
        },
        error: err => { this.quoteLoading = false; this.quoteError = err.error?.detail || 'Pricing is unavailable. Check Kafka and Product & Pricing, then change the amount or reselect the product to retry.'; this.cdr.markForCheck(); }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); this.quoteSubscription?.unsubscribe(); }

  onSubmit(): void {
    if (this.fdForm.invalid || !this.quoteReady || this.quoteLoading || this.submitting || (this.isCustomer && (!this.profileReady || !this.kycActive || !this.ownCustomerId))) {
      this.fdForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formVal = this.fdForm.getRawValue();
    const req: FixedDepositAccountRequest = {
      customerId: this.isCustomer ? this.ownCustomerId : String(formVal.customerId).trim(),
      productCode: formVal.productCode,
      branchCode: String(formVal.branchCode).trim(),
      principalAmount: Number(formVal.principalAmount),
      interestRate: Number(formVal.interestRate),
      termMonths: Number(formVal.termMonths),
      interestType: formVal.interestType,
      interestPayoutType: formVal.interestPayoutType,
      interestFrequency: formVal.interestFrequency
    };

    const call$: Observable<any> = (this.isCustomer || formVal.createWithTxn)
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
        this.cdr.markForCheck();
      }
    });
  }
}
