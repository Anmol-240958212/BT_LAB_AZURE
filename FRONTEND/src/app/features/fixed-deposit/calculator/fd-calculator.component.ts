import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { timeout, catchError, finalize } from 'rxjs/operators';
import { FDCalculatorApiService } from '../../../core/api/fd-calculator-api.service';
import { FDCalculationRequest, FDCalculationResponse } from '../../../core/models/fd.models';

@Component({
  selector: 'app-fd-calculator',
  standalone: false,
  template: `
    <div class="calculator-page animate-fade-in">
      <!-- Header Banner -->
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">{{ 'fd.precisionEngine' | transloco }}</span>
            <h1 class="card-title mt-1">{{ 'fd.calculator' | transloco }}</h1>
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
        <app-card [title]="'fd.depositParameters' | transloco" [subtitle]="'fd.parametersSubtitle' | transloco">
          <form (ngSubmit)="calculate(true)" class="calc-form" novalidate>
            <!-- Principal Amount -->
            <app-input
              id="calc-principal"
              [label]="'Deposit Principal (' + currency + ')'"
              type="number"
              placeholder="e.g. 100000"
              [(ngModel)]="principal"
              (ngModelChange)="onInputChanged()"
              name="principal"
              [required]="true"
              [hint]="currency === 'JPY' ? 'Minimum deposit: ¥ 1,000' : 'Minimum deposit: ₹ 1,000'"
            ></app-input>
            <div *ngIf="principalError" class="input-caution" role="alert">
              <app-icon name="alert-triangle" [size]="14"></app-icon>
              <span>{{ principalError }}</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="calc-currency">{{ 'common.currency' | transloco }} *</label>
              <select id="calc-currency" class="form-select" [(ngModel)]="currency" (ngModelChange)="calculate()" name="currency">
                <option value="INR">INR — Indian Rupee</option>
                <option value="JPY">JPY — Japanese Yen</option>
              </select>
            </div>

            <!-- Term Duration -->
            <div class="grid-2">
              <app-input
                id="calc-term-val"
                label="Term Duration"
                type="number"
                placeholder="e.g. 12"
                [(ngModel)]="termValue"
                (ngModelChange)="onInputChanged()"
                name="termValue"
                [required]="true"
              ></app-input>
              <div *ngIf="termError" class="input-caution" role="alert">
                <app-icon name="alert-triangle" [size]="14"></app-icon>
                <span>{{ termError }}</span>
              </div>

              <div class="form-group">
                <label class="form-label" for="calc-term-unit">{{ 'fd.termUnit' | transloco }} *</label>
                <select id="calc-term-unit" class="form-select" [(ngModel)]="termUnit" (ngModelChange)="calculate()" name="termUnit">
                  <option value="MONTHS">{{ 'common.months' | transloco }}</option>
                  <option value="DAYS">{{ 'common.days' | transloco }}</option>
                  <option value="YEARS">{{ 'fd.years' | transloco }}</option>
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
              (ngModelChange)="onInputChanged()"
              name="baseRate"
              [required]="true"
              hint="Card base interest rate before category add-ons"
            ></app-input>
            <div *ngIf="rateError" class="input-caution" role="alert">
              <app-icon name="alert-triangle" [size]="14"></app-icon>
              <span>{{ rateError }}</span>
            </div>

            <!-- Interest Accrual Mechanism -->
            <div class="form-group">
              <label class="form-label" for="calc-interest-type">{{ 'fd.interestRule' | transloco }} *</label>
              <select id="calc-interest-type" class="form-select" [(ngModel)]="interestType" (ngModelChange)="calculate()" name="interestType">
                <option value="COMPOUND">{{ 'common.compound' | transloco }}</option>
                <option value="SIMPLE">{{ 'fd.simpleDirect' | transloco }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="calc-interest-frequency">{{ 'fd.compoundingFrequency' | transloco }} *</label>
              <select id="calc-interest-frequency" class="form-select" [(ngModel)]="interestFrequency" (ngModelChange)="calculate()" name="interestFrequency" [disabled]="interestType === 'SIMPLE'">
                <option value="DAILY">Daily</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half-yearly</option>
                <option value="ANNUAL">Annually</option>
              </select>
              <span class="form-hint">{{ (interestType === 'SIMPLE' ? 'fd.simpleNoCompound' : 'fd.chooseCompounding') | transloco }}</span>
            </div>

            <!-- Category Add-ons -->
            <div class="category-section">
              <span class="category-header-title">Special Category Add-ons:</span>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" [(ngModel)]="seniorCitizen" (ngModelChange)="calculate()" name="seniorCitizen" />
                  <span>{{ 'fd.seniorCitizen' | transloco }} (+0.50%)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" [(ngModel)]="bankEmployee" (ngModelChange)="calculate()" name="bankEmployee" />
                  <span>{{ 'fd.bankStaff' | transloco }} (+1.00%)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" [(ngModel)]="premiumCustomer" (ngModelChange)="calculate()" name="premiumCustomer" />
                  <span>{{ 'fd.premiumCustomer' | transloco }} (+0.25%)</span>
                </label>
              </div>
            </div>

            <div class="mt-4">
              <app-button
                type="submit"
                variant="primary"
                [loading]="calculating"
                [disabled]="calculating"
                [block]="true"
                id="btn-run-calculation"
              >
                {{ calculating ? 'Simulating Yield...' : 'Calculate Maturity Amount' }}
              </app-button>
            </div>
          </form>
        </app-card>

        <!-- Calculation Yield Output Card -->
        <app-card [title]="'fd.maturityProjection' | transloco" [subtitle]="'fd.verifiedFormula' | transloco">
          <div class="yield-display-box">
              <span class="yield-caption">{{ 'fd.estimatedMaturity' | transloco }}</span>
            <h2 class="yield-amount" id="calc-maturity-amount">
              {{ result?.maturityAmount || 0 | currencyInr:true:currency }}
            </h2>
            <div class="yield-badges">
              <span class="badge badge-active">Rate: {{ result?.effectiveRate || effectiveCalculatedRate | number:'1.2-2' }}% p.a.</span>
              <span class="badge badge-role">{{ interestType === 'SIMPLE' ? 'SIMPLE' : (result?.interestFrequency || interestFrequency) }}</span>
            </div>
          </div>

          <div class="yield-breakdown-list mt-6">
            <div class="breakdown-row">
                <span class="row-label">{{ 'fd.initialPrincipal' | transloco }}</span>
              <span class="row-val">{{ principal | currencyInr:true:currency }}</span>
            </div>
            <div class="breakdown-row">
                <span class="row-label">{{ 'fd.totalInterest' | transloco }}</span>
              <span class="row-val text-success font-semibold" id="calc-interest-earned">
                + {{ result?.interestEarned || 0 | currencyInr:true:currency }}
              </span>
            </div>
            <div class="breakdown-row">
                <span class="row-label">{{ 'fd.effectiveRate' | transloco }}</span>
              <span class="row-val">
                {{ result?.effectiveRate || effectiveCalculatedRate | number:'1.2-2' }}%
                <span *ngIf="isRateCapped" class="capped-tag">(CAPPED AT 8.5%)</span>
              </span>
            </div>
            <div class="breakdown-row">
                <span class="row-label">{{ 'fd.tenure' | transloco }}</span>
              <span class="row-val">{{ termValue }} {{ termUnit | lowercase }}</span>
            </div>
          </div>

          <!-- Comparative Simple vs Compound Matrix per guidelines Section 9 -->
          <div class="comparison-matrix mt-6">
            <span class="matrix-title">{{ 'fd.comparison' | transloco }}</span>
            <div class="grid-2 mt-2">
              <div class="matrix-card" [class.highlight-card]="interestType === 'SIMPLE'">
                <span class="matrix-label">{{ 'fd.simpleLinear' | transloco }}</span>
                <span class="matrix-val">{{ simpleYield | currencyInr:true:currency }}</span>
                <span class="matrix-sub">Interest: +{{ simpleInterestEarned | currencyInr:true:currency }}</span>
              </div>
              <div class="matrix-card" [class.highlight-card]="interestType === 'COMPOUND'">
                <span class="matrix-label">{{ 'common.compound' | transloco }} ({{ interestFrequency | lowercase }})</span>
                <span class="matrix-val text-accent">{{ compoundYield | currencyInr:true:currency }}</span>
                <span class="matrix-sub text-success">Interest: +{{ compoundInterestEarned | currencyInr:true:currency }}</span>
              </div>
            </div>
          </div>

        </app-card>
      </div>
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
    .input-caution {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: calc(var(--space-3) * -1);
      color: var(--color-warning);
      font-size: 11px;
      line-height: 1.35;
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
    .matrix-sub {
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }
  `]
})
export class FDCalculatorComponent implements OnInit {
  principal = 100000;
  termValue = 12;
  termUnit = 'MONTHS';
  baseRate = 7.10;
  interestType = 'COMPOUND';
  interestFrequency: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' = 'QUARTERLY';
  currency: 'INR' | 'JPY' = 'INR';

  seniorCitizen = false;
  bankEmployee = false;
  premiumCustomer = false;

  calculating = false;
  validationAttempted = false;
  result: FDCalculationResponse | null = null;
  simpleYield = 0;
  compoundYield = 0;

  get simpleInterestEarned(): number {
    return Math.max(0, Math.round((this.simpleYield - (Number(this.principal) || 0)) * 100) / 100);
  }

  get compoundInterestEarned(): number {
    return Math.max(0, Math.round((this.compoundYield - (Number(this.principal) || 0)) * 100) / 100);
  }

  readonly MAX_ALLOWED_RATE = 8.5; // Mandate L11
  readonly MAX_BASE_RATE = 8.5;
  readonly MAX_PRINCIPAL = 1000000000;

  constructor(
    private readonly calcApi: FDCalculatorApiService,
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

  get compoundingPeriodsPerYear(): number {
    return { DAILY: 365, MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, ANNUAL: 1 }[this.interestFrequency] || 4;
  }

  get isRateCapped(): boolean {
    let rawRate = Number(this.baseRate) || 0;
    if (this.seniorCitizen) rawRate += 0.5;
    if (this.bankEmployee) rawRate += 1.0;
    if (this.premiumCustomer) rawRate += 0.25;
    return rawRate > this.MAX_ALLOWED_RATE;
  }

  get principalError(): string | null {
    return this.validationAttempted ? this.validatePrincipal() : null;
  }

  get termError(): string | null {
    return this.validationAttempted ? this.validateTerm() : null;
  }

  get rateError(): string | null {
    return this.validationAttempted ? this.validateRate() : null;
  }

  get validationMessage(): string | null {
    return this.validationAttempted ? this.validateInputs() : null;
  }

  onInputChanged(): void {
    this.validationAttempted = true;
    this.calculate();
  }

  calculate(showValidation = false): void {
    if (showValidation) this.validationAttempted = true;

    const validationError = this.validateInputs();
    if (validationError) {
      this.calculating = false;
      this.cdr.detectChanges();
      return;
    }

    this.validationAttempted = false;
    const numPrincipal = Number(this.principal) || 0;
    const numTerm = Number(this.termValue) || 0;
    const numBaseRate = Number(this.baseRate) || 0;

    this.calculating = true;

    // Convert term to years for mathematical interest formulas
    const years = this.termUnit === 'DAYS' ? numTerm / 365 : this.termUnit === 'MONTHS' ? numTerm / 12 : numTerm;
    const rate = this.effectiveCalculatedRate / 100;

    // Simple Interest (I = P * R * T)
    const simpleInterest = Math.round((numPrincipal * rate * years) * 100) / 100;
    this.simpleYield = numPrincipal + simpleInterest;

    // Compound Interest: A = P × (1 + r/n)^(n×t), with n chosen by the customer.
    // In banking, if the tenure is shorter than one compounding cycle, interest accrues as simple linear interest
    const periods = this.compoundingPeriodsPerYear;
    const periodsInTerm = periods * years;
    let compoundAmount: number;
    if (periodsInTerm < 1 && this.interestType === 'COMPOUND') {
      compoundAmount = this.simpleYield;
    } else {
      compoundAmount = Math.round((numPrincipal * Math.pow(1 + rate / periods, periodsInTerm)) * 100) / 100;
    }
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
      interestType: this.interestType,
      interestFrequency: this.interestFrequency
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
        const responseRate = Number(res?.effectiveRate);
        const responseExceedsCap = Number.isFinite(responseRate) && responseRate > this.MAX_ALLOWED_RATE;

        if (res && res.maturityAmount && !responseExceedsCap) {
          // If the user specified DAYS, keep the exact day-based local calculation to prevent backend whole-month rounding distortion
          if (this.termUnit === 'DAYS') {
            this.result = localResult;
          } else {
            this.result = {
              ...res,
              effectiveRate: Math.min(responseRate || this.effectiveCalculatedRate, this.MAX_ALLOWED_RATE)
            };
          }
        } else {
          // Reject an uncapped result returned by an older backend process.
          this.result = localResult;
        }
        this.cdr.detectChanges();
      }
    });
  }

  private validateInputs(): string | null {
    return this.validatePrincipal() || this.validateTerm() || this.validateRate();
  }

  private validatePrincipal(): string | null {
    const value = Number(this.principal);
    const currencySymbol = this.currency === 'JPY' ? '¥' : '₹';
    if (!Number.isFinite(value) || value < 1000 || value > this.MAX_PRINCIPAL) {
      return 'Deposit amount must be between ' + currencySymbol + '1,000 and ' + currencySymbol + '1,000,000,000.';
    }
    if (this.currency === 'JPY' && !Number.isInteger(value)) return 'Japanese Yen deposits must be entered as a whole number.';
    return null;
  }

  private validateTerm(): string | null {
    const value = Number(this.termValue);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      const maximum = this.termUnit === 'DAYS' ? 3650 : this.termUnit === 'MONTHS' ? 120 : 10;
      return 'Term must be between 1 and ' + maximum + ' ' + this.termUnit.toLowerCase() + '.';
    }

    const maximum = this.termUnit === 'DAYS' ? 3650 : this.termUnit === 'MONTHS' ? 120 : 10;
    if (value > maximum) return 'Term must be between 1 and ' + maximum + ' ' + this.termUnit.toLowerCase() + '.';
    return null;
  }

  private validateRate(): string | null {
    const value = Number(this.baseRate);
    if (!Number.isFinite(value) || value < 0 || value > this.MAX_BASE_RATE) {
      return 'Base interest rate must be between 0% and ' + this.MAX_BASE_RATE.toFixed(2) + '% p.a.';
    }
    return null;
  }

}
