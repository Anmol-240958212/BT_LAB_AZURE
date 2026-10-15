import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { timeout, catchError, finalize, map, switchMap } from 'rxjs/operators';
import { FDCalculatorApiService } from '../../../core/api/fd-calculator-api.service';
import { FDAccountApiService } from '../../../core/api/fd-account-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { ProductPricingApiService } from '../../../core/api/product-pricing-api.service';
import { FDCalculationRequest, FDCalculationResponse, FixedDepositAccountRequest } from '../../../core/models/fd.models';
import { UserProfileResponse } from '../../../core/models/auth.models';
import { CategoryRate, EffectiveRateQuote, ProductRecord } from '../../../core/models/product.models';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-fd-calculator',
  standalone: false,
  template: `
    <div class="calculator-page animate-fade-in">
      <!-- Header Banner -->
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">PRECISION FINANCIAL ENGINE</span>
            <h1 class="card-title mt-1">Fixed Deposit Yield & Maturity Calculator</h1>
            <p class="card-subtitle">
              Simulate maturity yields under Simple and Compound interest rules with category bonus rates.
            </p>
          </div>
          <app-badge variant="role" text="Yield Analytics Engine"></app-badge>
        </div>
      </div>

      <!-- Regulatory Cap Notice -->
      <div *ngIf="isRateCapped" class="notice-box mb-6">
        <app-icon name="alert-triangle" [size]="16"></app-icon>
        <span>
          <strong>Product rate cap applied:</strong> The effective rate is capped at
          <strong>{{ (rateQuote?.rateCap ?? selectedProduct?.rateLimit?.max ?? 8.5) | number:'1.2-2' }}% p.a.</strong>
        </span>
      </div>

      <div class="grid-2 mb-6">
        <!-- Input Parameters Card -->
        <app-card title="Deposit Parameters" subtitle="Specify principal, term duration, and customer categories">
          <form (ngSubmit)="calculate()" class="calc-form">
            <!-- Principal Amount -->
            <app-input
              id="calc-principal"
              label="Deposit Principal (₹)"
              type="number"
              placeholder="e.g. 100000"
              [(ngModel)]="principal"
              name="principal"
              [required]="true"
              hint="Minimum deposit: ₹ 1,000"
            ></app-input>

            <!-- Term Duration -->
            <div class="grid-2">
              <app-input
                id="calc-term-val"
                label="Term Duration"
                type="number"
                placeholder="e.g. 12"
                [(ngModel)]="termValue"
                name="termValue"
                [required]="true"
              ></app-input>

              <div class="form-group">
                <label class="form-label" for="calc-term-unit">Term Unit *</label>
                <select id="calc-term-unit" class="form-select" [(ngModel)]="termUnit" name="termUnit">
                  <option value="MONTHS">Months</option>
                  <option value="DAYS">Days</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="calc-product">Deposit product *</label>
              <select id="calc-product" class="form-select" [(ngModel)]="selectedProductCode" name="selectedProductCode"
                      (ngModelChange)="onProductChanged($event)" [disabled]="!authService.isLoggedIn() || productLoading">
                <option value="">{{ productLoading ? 'Loading products…' : 'Select a product' }}</option>
                <option *ngFor="let product of products" [value]="product.productCode">
                  {{ product.productName }} ({{ product.productCode }})
                </option>
              </select>
              <small class="field-hint" *ngIf="selectedProduct">
                Base rate: {{ selectedProduct.baseRate == null ? 'tiered by amount and term' : (selectedProduct.baseRate | number:'1.2-2') + '%' }}
                · range {{ selectedProduct.rateLimit.min }}–{{ selectedProduct.rateLimit.max }}%
              </small>
              <small class="field-hint" *ngIf="!authService.isLoggedIn()">Sign in to load live products and bank-approved rates.</small>
            </div>
            <div *ngIf="pricingError" class="error-banner" role="alert">{{ pricingError }}</div>

            <!-- Interest Accrual Mechanism -->
            <div class="form-group">
              <label class="form-label" for="calc-interest-type">Interest Accrual Rule *</label>
              <select id="calc-interest-type" class="form-select" [(ngModel)]="interestType" name="interestType">
                <option value="COMPOUND">Compound Interest (Quarterly Compounding)</option>
                <option value="SIMPLE">Simple Interest (Direct Linear Accrual)</option>
              </select>
            </div>

            <!-- Category Add-ons -->
            <div class="category-section" *ngIf="categoryRates.length">
              <span class="category-header-title">Special Category Add-ons:</span>
              <div class="checkbox-group">
                <label class="checkbox-item" *ngFor="let category of categoryRates">
                  <input type="checkbox" [checked]="selectedCategoryCodes.has(category.categoryCode)"
                         [disabled]="!authService.isLoggedIn() || categoryUnavailable(category)"
                         (change)="toggleCategory(category.categoryCode, $event)" />
                  <span>{{ category.displayName }} (+{{ category.adjustmentPercent | number:'1.2-2' }}%)</span>
                </label>
              </div>
            </div>

            <div class="mt-4">
              <app-button
                type="submit"
                variant="primary"
                [loading]="calculating"
                [disabled]="principal <= 0 || termValue <= 0 || calculating || (authService.isLoggedIn() && !selectedProduct)"
                [block]="true"
                id="btn-run-calculation"
                (clicked)="calculate()"
              >
                {{ calculating ? 'Simulating Yield...' : 'Calculate Maturity Amount' }}
              </app-button>
            </div>
          </form>
        </app-card>

        <!-- Calculation Yield Output Card -->
        <app-card title="Maturity Projection & Yield" subtitle="Verified calculation response per formula">
          <div class="yield-display-box">
            <span class="yield-caption">ESTIMATED MATURITY VALUE</span>
            <h2 class="yield-amount" id="calc-maturity-amount">
              {{ result?.maturityAmount || 0 | currencyInr }}
            </h2>
            <div class="yield-badges">
              <span class="badge badge-active">Rate: {{ result?.effectiveRate || effectiveCalculatedRate | number:'1.2-2' }}% p.a.</span>
              <span class="badge badge-role">{{ interestType }}</span>
            </div>
          </div>

          <div class="yield-breakdown-list mt-6">
            <div class="breakdown-row">
              <span class="row-label">Initial Principal</span>
              <span class="row-val">{{ principal | currencyInr }}</span>
            </div>
            <div class="breakdown-row">
              <span class="row-label">Total Interest Earned</span>
              <span class="row-val text-success font-semibold" id="calc-interest-earned">
                + {{ result?.interestEarned || 0 | currencyInr }}
              </span>
            </div>
            <div class="breakdown-row">
              <span class="row-label">Effective Applicable Rate</span>
              <span class="row-val">
                {{ result?.effectiveRate || effectiveCalculatedRate | number:'1.2-2' }}%
                <span *ngIf="isRateCapped" class="capped-tag">(CAPPED AT {{ rateQuote?.rateCap | number:'1.2-2' }}%)</span>
              </span>
            </div>
            <div class="breakdown-row">
              <span class="row-label">Tenure</span>
              <span class="row-val">{{ termValue }} {{ termUnit | lowercase }}</span>
            </div>
          </div>

          <!-- Comparative Simple vs Compound Matrix per guidelines Section 9 -->
          <div class="comparison-matrix mt-6">
            <span class="matrix-title">Comparison Preview: Simple vs Compound</span>
            <div class="grid-2 mt-2">
              <div class="matrix-card">
                <span class="matrix-label">Simple Interest Yield</span>
                <span class="matrix-val">{{ simpleYield | currencyInr }}</span>
              </div>
              <div class="matrix-card highlight-card">
                <span class="matrix-label">Compound Interest Yield</span>
                <span class="matrix-val text-accent">{{ compoundYield | currencyInr }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="authService.isLoggedIn()" class="mt-6">
            <app-button
              variant="secondary"
              [block]="true"
              [disabled]="calculating || !result || (authService.isLoggedIn() && !rateQuote)"
              (clicked)="openFdWithParams()"
            >
              {{ isCustomer ? 'Apply for Fixed Deposit With These Terms →' : 'Open FD Account With These Terms →' }}
            </app-button>
          </div>
        </app-card>
      </div>

      <!-- Customer Application Modal -->
      <app-modal
        [isOpen]="isApplicationModalOpen"
        title="Fixed Deposit Application"
        subtitle="Submit term deposit application for branch review & approval"
        (closeModal)="isApplicationModalOpen = false"
      >
        <div class="application-modal-content">
          <div class="app-summary-card">
            <div class="summary-header">
              <span class="summary-badge">DEPOSIT CONTRACT DETAILS</span>
              <h2 class="summary-title">{{ principal | currencyInr }}</h2>
              <span class="summary-subtitle">Tenure: {{ termValue }} {{ termUnit }} @ {{ effectiveCalculatedRate }}% p.a.</span>
            </div>

            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">APPLICANT</span>
                <span class="summary-value">{{ applicantDisplayName }} ({{ customerIdDisplay }})</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">TENURE DURATION</span>
                <span class="summary-value">{{ termValue }} {{ termUnit }} ({{ termMonthsEquivalent }} Months)</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">INTEREST ACCRUAL</span>
                <span class="summary-value">{{ interestType === 'COMPOUND' ? 'Compound (Quarterly)' : 'Simple Interest' }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">INTEREST PAYOUT</span>
                <span class="summary-value">At Maturity (Reinvestment)</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">PROJECTED MATURITY</span>
                <span class="summary-value text-accent font-bold">{{ maturityYield | currencyInr }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">ESTIMATED YIELD</span>
                <span class="summary-value text-success font-semibold">+ {{ earnedYield | currencyInr }}</span>
              </div>
            </div>
          </div>

          <!-- Workflow Notice Banner -->
          <div class="workflow-alert-box mt-4">
            <app-icon name="shield" [size]="22" color="#3b82f6"></app-icon>
            <div class="alert-content">
              <strong>Branch Officer Authorization Required</strong>
              <p>
                In accordance with core banking protocols, customer applications are logged with 
                <span class="badge-pending-inline">PENDING</span> status. An authorized Bank Officer / Branch Admin 
                will review and approve your contract to originate the ledger account.
              </p>
            </div>
          </div>

          <div class="modal-form-actions mt-6">
            <app-button
              type="button"
              variant="ghost"
              (clicked)="isApplicationModalOpen = false"
            >
              Cancel
            </app-button>
            <app-button
              type="button"
              variant="primary"
              [loading]="submittingApplication"
              [disabled]="submittingApplication"
              (clicked)="submitCustomerApplication()"
            >
              {{ submittingApplication ? 'Submitting Application...' : 'Submit Application for Officer Approval' }}
            </app-button>
          </div>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .field-hint { display:block; margin-top:6px; color:var(--color-text-muted); font-size:var(--text-xs); }
    .error-banner { margin:10px 0; border:1px solid #d97a7a; background:rgba(217,122,122,.12); color:var(--color-text-primary); border-radius:var(--radius-input); padding:10px 12px; font-size:var(--text-sm); }
    .section-tag {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }
    .calc-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .category-section {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .category-header-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-secondary);
      letter-spacing: 0.04em;
    }
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      cursor: pointer;
    }
    .yield-display-box {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-focus);
      border-radius: var(--radius-card);
      padding: var(--space-6);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
    }
    .yield-caption {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }
    .yield-amount {
      font-size: var(--text-2xl);
      font-weight: 600;
      color: var(--color-text-primary);
      letter-spacing: 0.02em;
    }
    .yield-badges {
      display: flex;
      gap: var(--space-2);
      margin-top: 4px;
    }
    .yield-breakdown-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: 0 var(--space-2);
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: var(--text-sm);
    }
    .row-label {
      color: var(--color-text-secondary);
    }
    .row-val {
      color: var(--color-text-primary);
      font-weight: 500;
    }
    .font-semibold {
      font-weight: 600;
    }
    .capped-tag {
      font-size: 10px;
      color: var(--color-warning);
      font-weight: 600;
      margin-left: 4px;
    }
    .comparison-matrix {
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-4);
    }
    .matrix-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .matrix-card {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-input);
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .highlight-card {
      border-color: var(--color-border-focus);
    }
    .matrix-label {
      font-size: 10px;
      color: var(--color-text-muted);
    }
    .matrix-val {
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .application-modal-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .app-summary-card {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-4);
    }
    .summary-header {
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .summary-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .summary-title {
      font-size: var(--text-2xl);
      font-weight: 700;
      margin: 4px 0 2px 0;
    }
    .summary-subtitle {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }
    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .summary-label {
      font-size: 10px;
      color: var(--color-text-muted);
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .summary-value {
      font-size: var(--text-sm);
      color: var(--color-text-primary);
    }
    .workflow-alert-box {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-card);
      padding: var(--space-4);
    }
    .alert-content strong {
      display: block;
      font-size: var(--text-sm);
      color: #3b82f6;
      margin-bottom: 4px;
    }
    .alert-content p {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.5;
    }
    .badge-pending-inline {
      display: inline-block;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      font-weight: 700;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .modal-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }
  `]
})
export class FDCalculatorComponent implements OnInit {
  principal = 100000;
  termValue = 12;
  termUnit = 'MONTHS';
  baseRate = 7.10;
  interestType = 'COMPOUND';
  products: ProductRecord[] = [];
  selectedProductCode = '';
  categoryRates: CategoryRate[] = [];
  selectedCategoryCodes = new Set<string>();
  rateQuote: EffectiveRateQuote | null = null;
  productLoading = false;
  pricingError = '';
  private calculationSequence = 0;

  calculating = false;
  result: FDCalculationResponse | null = null;
  simpleYield = 0;
  compoundYield = 0;

  isApplicationModalOpen = false;
  submittingApplication = false;
  currentUser: UserProfileResponse | null = null;

  get selectedProduct(): ProductRecord | undefined {
    return this.products.find(product => product.productCode === this.selectedProductCode);
  }

  get isCustomer(): boolean {
    return this.authService.getRole() === 'CUSTOMER';
  }

  get applicantDisplayName(): string {
    if (this.currentUser?.firstName) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName || ''}`.trim();
    }
    return this.authService.getUsername() || 'Customer';
  }

  get customerIdDisplay(): string {
    if (this.currentUser?.customerId) {
      return `#CUST-${this.currentUser.customerId.toString().padStart(6, '0')}`;
    }
    return '#CUST-VERIFIED';
  }

  get termMonthsEquivalent(): number {
    const numTerm = Number(this.termValue) || 12;
    if (this.termUnit === 'YEARS') return numTerm * 12;
    if (this.termUnit === 'DAYS') return Math.max(1, Math.round(numTerm / 30.417));
    return numTerm;
  }

  get maturityYield(): number {
    if (this.result && this.result.maturityAmount) {
      return this.result.maturityAmount;
    }
    return this.interestType === 'COMPOUND' ? this.compoundYield : this.simpleYield;
  }

  get earnedYield(): number {
    return Math.max(0, this.maturityYield - (Number(this.principal) || 0));
  }

  constructor(
    private readonly calcApi: FDCalculatorApiService,
    private readonly fdAccountApi: FDAccountApiService,
    private readonly userApi: UserApiService,
    private readonly productApi: ProductPricingApiService,
    public readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.calculate();
      return;
    }
    this.userApi.getMe().pipe(catchError(() => of(null))).subscribe(profile => {
      this.currentUser = profile;
      this.productLoading = true;
      this.productApi.search({ productType: 'FD', status: 'ACTIVE', page: 0, size: 100 }).pipe(
        finalize(() => this.productLoading = false)
      ).subscribe({
        next: response => {
          this.products = response.content || [];
          const defaultProduct = this.products[0];
          if (defaultProduct) {
            this.selectedProductCode = defaultProduct.productCode;
            this.baseRate = Number(defaultProduct.baseRate) || 0;
            this.loadSelectedProductRates(true);
          } else {
            this.pricingError = 'No active fixed-deposit products are configured yet. Ask a bank officer to add one.';
            this.cdr.detectChanges();
          }
        },
        error: err => {
          this.pricingError = this.apiError(err, 'Could not load live product rates.');
          this.cdr.detectChanges();
        }
      });
    });
  }

  get categories(): string[] {
    return [...this.selectedCategoryCodes];
  }

  get effectiveCalculatedRate(): number {
    return this.rateQuote?.effectiveRate ?? (Number(this.baseRate) || 0);
  }

  get isRateCapped(): boolean {
    return this.rateQuote?.capped ?? false;
  }

  calculate(): void {
    const numPrincipal = Number(this.principal) || 0;
    const numTerm = Number(this.termValue) || 0;
    if (numPrincipal <= 0 || numTerm <= 0) return;
    if (!this.authService.isLoggedIn()) {
      this.applyProjection(this.baseRate);
      this.result = this.localCalculation(this.baseRate);
      return;
    }
    if (!this.selectedProduct) {
      this.pricingError = 'Select an active fixed-deposit product before calculating.';
      this.result = null;
      return;
    }

    const sequence = ++this.calculationSequence;
    this.calculating = true;
    this.pricingError = '';
    this.productApi.getEffectiveRate(this.selectedProduct.productCode, {
      categories: this.categories,
      customerAge: this.customerAge(),
      customerGender: this.customerGender(),
      principal: numPrincipal,
      term: numTerm,
      termUnit: this.termUnit as 'DAYS' | 'MONTHS' | 'YEARS'
    }).pipe(
      switchMap(quote => {
        this.rateQuote = quote;
        this.applyProjection(quote.effectiveRate);
        const localResult = this.localCalculation(quote.effectiveRate);
        const request: FDCalculationRequest = {
          principal: numPrincipal,
          term: { value: this.termMonthsEquivalent, unit: 'MONTHS' },
          // Product Pricing has already selected the tier and applied category caps.
          // Pass the final rate to the FD engine without reapplying category bonuses.
          baseRate: quote.effectiveRate,
          categories: [],
          interestType: this.interestType
        };
        return this.calcApi.calculate(request).pipe(
          timeout(3000),
          catchError(() => of(localResult)),
          map(result => ({ quote, result: Number.isFinite(result?.maturityAmount) ? result : localResult }))
        );
      }),
      finalize(() => {
        if (sequence === this.calculationSequence) {
          this.calculating = false;
          this.cdr.detectChanges();
        }
      })
    ).subscribe({
      next: ({ quote, result }) => {
        if (sequence !== this.calculationSequence) return;
        this.rateQuote = quote;
        this.result = result;
        this.cdr.detectChanges();
      },
      error: err => {
        if (sequence !== this.calculationSequence) return;
        this.result = null;
        this.pricingError = this.apiError(err, 'Could not calculate this product rate. Check the selected term, amount, and category eligibility.');
        this.cdr.detectChanges();
      }
    });
  }

  onProductChanged(productCode: string): void {
    this.selectedProductCode = productCode;
    this.rateQuote = null;
    this.selectedCategoryCodes.clear();
    this.result = null;
    const product = this.selectedProduct;
    this.baseRate = Number(product?.baseRate) || 0;
    if (product) this.loadSelectedProductRates(true);
    else this.categoryRates = [];
  }

  toggleCategory(categoryCode: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedCategoryCodes);
    if (checked) next.add(categoryCode);
    else next.delete(categoryCode);
    this.selectedCategoryCodes = next;
  }

  categoryUnavailable(category: CategoryRate): boolean {
    const age = this.customerAge();
    if ((category.minAge != null || category.maxAge != null) && age == null) return true;
    if (age != null && category.minAge != null && age < category.minAge) return true;
    if (age != null && category.maxAge != null && age > category.maxAge) return true;
    const requiredGender = category.gender?.toUpperCase();
    if (requiredGender && !this.customerGender()) return true;
    return !!requiredGender && requiredGender !== this.customerGender();
  }

  private loadSelectedProductRates(recalculate: boolean): void {
    const product = this.selectedProduct;
    if (!product) return;
    this.productApi.getCategoryRates(product.productCode).subscribe({
      next: rates => {
        this.categoryRates = rates;
        this.cdr.detectChanges();
        if (recalculate) this.calculate();
      },
      error: err => {
        this.categoryRates = [];
        this.pricingError = this.apiError(err, 'Could not load category-rate options.');
        this.cdr.detectChanges();
      }
    });
  }

  private applyProjection(ratePercent: number): void {
    const principal = Number(this.principal) || 0;
    const years = this.termUnit === 'DAYS' ? Number(this.termValue) / 365
      : this.termUnit === 'MONTHS' ? Number(this.termValue) / 12 : Number(this.termValue);
    const rate = ratePercent / 100;
    this.simpleYield = Math.round((principal + principal * rate * years) * 100) / 100;
    this.compoundYield = Math.round(principal * Math.pow(1 + rate / 4, 4 * years) * 100) / 100;
  }

  private localCalculation(ratePercent: number): FDCalculationResponse {
    const amount = this.interestType === 'COMPOUND' ? this.compoundYield : this.simpleYield;
    return { maturityAmount: amount, effectiveRate: ratePercent,
      interestEarned: Math.round((amount - Number(this.principal)) * 100) / 100 };
  }

  private customerAge(): number | undefined {
    const dateOfBirth = this.currentUser?.dateOfBirth;
    if (!dateOfBirth) return undefined;
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  private customerGender(): string | undefined {
    const gender = this.currentUser?.gender?.trim().toUpperCase();
    if (!gender) return undefined;
    if (gender === 'M' || gender.startsWith('MALE')) return 'M';
    if (gender === 'F' || gender.startsWith('FEMALE')) return 'F';
    return 'X';
  }

  private apiError(err: any, fallback: string): string {
    const body = err?.error;
    if (body?.validationErrors && typeof body.validationErrors === 'object') {
      return Object.values(body.validationErrors).map(value => String(value)).join(' · ');
    }
    return body?.message || body?.detail || fallback;
  }

  openFdWithParams(): void {
    if (this.isCustomer) {
      this.isApplicationModalOpen = true;
      if (!this.currentUser) {
        this.userApi.getMe().subscribe({
          next: (profile) => {
            this.currentUser = profile;
            this.cdr.detectChanges();
          },
          error: () => {}
        });
      }
    } else {
      this.router.navigate(['/fixed-deposit/create'], {
        queryParams: {
          principal: this.principal,
          term: this.termMonthsEquivalent,
          rate: this.effectiveCalculatedRate,
          productCode: this.selectedProduct?.productCode,
          interestType: this.interestType
        }
      });
    }
  }

  submitCustomerApplication(): void {
    if (this.submittingApplication) return;
    this.submittingApplication = true;
    this.cdr.detectChanges();

    const customerIdStr = String(this.currentUser?.customerId || '12');

    const req: FixedDepositAccountRequest = {
      customerId: customerIdStr,
      productCode: this.selectedProduct?.productCode || 'PROD_FD_CUMULATIVE',
      branchCode: '001',
      principalAmount: Number(this.principal),
      interestRate: Number(this.effectiveCalculatedRate),
      termMonths: Number(this.termMonthsEquivalent),
      interestType: this.interestType,
      interestPayoutType: 'MATURITY',
      interestFrequency: 'QUARTERLY',
      status: 'PENDING'
    };

    this.fdAccountApi.createAccount(req).pipe(
      finalize(() => {
        this.submittingApplication = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.isApplicationModalOpen = false;
        const accNo = res.fdAccountNo || 'FD-Application';
        this.toastService.success(
          `Your Fixed Deposit application (${accNo}) for ₹${Number(this.principal).toLocaleString('en-IN')} has been submitted for branch review. An authorized Bank Officer will review and approve your account.`,
          'Application Submitted for Approval'
        );
        this.router.navigate(['/fixed-deposit/accounts']);
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || err.message || 'Fixed deposit application submission failed. Ensure your KYC status is verified.';
        this.toastService.error(msg, 'Submission Failed');
      }
    });
  }
}
