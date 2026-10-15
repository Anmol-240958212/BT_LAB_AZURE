import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { timeout, catchError, finalize } from 'rxjs/operators';
import { FDCalculatorApiService } from '../../../core/api/fd-calculator-api.service';
import { FDAccountApiService } from '../../../core/api/fd-account-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { FDCalculationRequest, FDCalculationResponse, FixedDepositAccountRequest } from '../../../core/models/fd.models';
import { UserProfileResponse } from '../../../core/models/auth.models';
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
          <strong>Regulatory Rate Cap Applied:</strong> Effective interest rate has been capped at
          <strong>8.50% p.a.</strong> in accordance with central reserve statutory guidelines.
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

            <!-- Base Interest Rate -->
            <app-input
              id="calc-base-rate"
              label="Base Interest Rate (% p.a.)"
              type="number"
              placeholder="e.g. 7.10"
              [(ngModel)]="baseRate"
              name="baseRate"
              [required]="true"
              hint="Card base interest rate before category add-ons"
            ></app-input>

            <!-- Interest Accrual Mechanism -->
            <div class="form-group">
              <label class="form-label" for="calc-interest-type">Interest Accrual Rule *</label>
              <select id="calc-interest-type" class="form-select" [(ngModel)]="interestType" name="interestType">
                <option value="COMPOUND">Compound Interest (Quarterly Compounding)</option>
                <option value="SIMPLE">Simple Interest (Direct Linear Accrual)</option>
              </select>
            </div>

            <!-- Category Add-ons -->
            <div class="category-section">
              <span class="category-header-title">Special Category Add-ons:</span>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" [(ngModel)]="seniorCitizen" name="seniorCitizen" />
                  <span>Senior Citizen (+0.50%)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" [(ngModel)]="bankEmployee" name="bankEmployee" />
                  <span>Bank Employee / Staff (+1.00%)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" [(ngModel)]="premiumCustomer" name="premiumCustomer" />
                  <span>Premium Wealth Customer (+0.25%)</span>
                </label>
              </div>
            </div>

            <div class="mt-4">
              <app-button
                type="submit"
                variant="primary"
                [loading]="calculating"
                [disabled]="principal <= 0 || termValue <= 0"
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
                <span *ngIf="isRateCapped" class="capped-tag">(CAPPED AT 8.5%)</span>
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

  seniorCitizen = false;
  bankEmployee = false;
  premiumCustomer = false;

  calculating = false;
  result: FDCalculationResponse | null = null;
  simpleYield = 0;
  compoundYield = 0;

  isApplicationModalOpen = false;
  submittingApplication = false;
  currentUser: UserProfileResponse | null = null;

  readonly MAX_ALLOWED_RATE = 8.5; // Mandate L11

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
    public readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.calculate();
  }

  get categories(): string[] {
    const list: string[] = [];
    if (this.seniorCitizen) list.push('SENIOR');
    if (this.bankEmployee) list.push('EMPLOYEE');
    if (this.premiumCustomer) list.push('PREMIUM_USER');
    return list;
  }

  get effectiveCalculatedRate(): number {
    let rate = Number(this.baseRate) || 0;
    if (this.seniorCitizen) rate += 0.5;
    if (this.bankEmployee) rate += 1.0;
    if (this.premiumCustomer) rate += 0.25;

    // Hard Cap at 8.5% per L11 testing table
    return Math.min(rate, this.MAX_ALLOWED_RATE);
  }

  get isRateCapped(): boolean {
    let rawRate = Number(this.baseRate) || 0;
    if (this.seniorCitizen) rawRate += 0.5;
    if (this.bankEmployee) rawRate += 1.0;
    if (this.premiumCustomer) rawRate += 0.25;
    return rawRate > this.MAX_ALLOWED_RATE;
  }

  calculate(): void {
    const numPrincipal = Number(this.principal) || 0;
    const numTerm = Number(this.termValue) || 0;
    const numBaseRate = Number(this.baseRate) || 0;

    if (numPrincipal <= 0 || numTerm <= 0) return;

    this.calculating = true;

    // Convert term to years for mathematical interest formulas
    const years = this.termUnit === 'DAYS' ? numTerm / 365 : this.termUnit === 'MONTHS' ? numTerm / 12 : numTerm;
    const rate = this.effectiveCalculatedRate / 100;

    // Simple Interest (I = P * R * T)
    const simpleInterest = Math.round((numPrincipal * rate * years) * 100) / 100;
    this.simpleYield = numPrincipal + simpleInterest;

    // Compound Interest (Quarterly compounding, n=4: A = P * (1 + r/4)^(4*t))
    const compoundAmount = Math.round((numPrincipal * Math.pow(1 + rate / 4, 4 * years)) * 100) / 100;
    this.compoundYield = compoundAmount;

    // Immediate local calculation ensures responsive feedback with zero UI freeze
    const chosenAmount = this.interestType === 'COMPOUND' ? this.compoundYield : this.simpleYield;
    const localResult: FDCalculationResponse = {
      maturityAmount: chosenAmount,
      effectiveRate: this.effectiveCalculatedRate,
      interestEarned: Math.round((chosenAmount - numPrincipal) * 100) / 100
    };
    this.result = localResult;
    this.cdr.detectChanges();

    // Prepare normalized request payload (months for backend calculator engine)
    let termMonths = numTerm;
    if (this.termUnit === 'YEARS') {
      termMonths = numTerm * 12;
    } else if (this.termUnit === 'DAYS') {
      termMonths = Math.max(1, Math.round(numTerm / 30.417));
    }

    const req: FDCalculationRequest = {
      principal: numPrincipal,
      term: {
        value: termMonths,
        unit: 'MONTHS'
      },
      baseRate: numBaseRate,
      categories: this.categories,
      interestType: this.interestType
    };

    this.calcApi.calculate(req).pipe(
      timeout(3000),
      catchError((err) => {
        console.warn('Backend calculation synchronization fallback to precision local engine:', err);
        return of(localResult);
      }),
      finalize(() => {
        this.calculating = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        if (res && res.maturityAmount) {
          this.result = res;
        } else {
          this.result = localResult;
        }
        this.cdr.detectChanges();
      }
    });
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
      productCode: 'PROD_FD_CUMULATIVE',
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
