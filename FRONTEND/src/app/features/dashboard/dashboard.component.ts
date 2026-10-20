import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { AuthState, UserRole } from '../../core/models/auth.models';
import { FixedDepositAccountResponse } from '../../core/models/fd.models';
import { FDAccountApiService } from '../../core/api/fd-account-api.service';
import { UserApiService } from '../../core/api/user-api.service';
import { TableColumn } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  template: `
    <div class="dashboard-page animate-fade-in">
      <!-- Welcome Header Banner -->
      <div class="card mb-6 welcome-card">
        <div class="flex-between">
          <div>
            <span class="system-time">SESSION ACTIVE • {{ currentDate | date:'fullDate' }}</span>
            <h1 class="welcome-heading">
              {{ 'auth.welcomeBack' | transloco:{ name: displayName } }}
            </h1>
            <p class="welcome-sub">
              {{ 'dashboard.accessAssets' | transloco }}
            </p>
          </div>
          <div class="role-display-box">
            <span class="role-label">{{ 'nav.currentRole' | transloco }}</span>
            <app-badge variant="role" [text]="currentRole || 'CUSTOMER'"></app-badge>
          </div>
        </div>

        <!-- Metric Stat Cards Row -->
        <div class="grid-4 mt-6">
            <div class="stat-card">
              <span class="stat-label">{{ 'dashboard.totalPortfolio' | transloco }}</span>
              <span class="stat-value">{{ totalDepositValue | currencyInr:true:'INR' }}</span>
              <span class="stat-value currency-secondary" *ngFor="let total of otherPortfolioValues">
                {{ total.value | currencyInr:true:total.currency }}
              </span>
              <span class="stat-meta text-accent">{{ 'dashboard.activeDeposits' | transloco }}</span>
            </div>

          <div class="stat-card">
            <span class="stat-label">{{ 'dashboard.activeAccounts' | transloco }}</span>
            <span class="stat-value">{{ activeAccountCount }}</span>
            <span class="stat-meta text-secondary">{{ 'dashboard.verifiedInterest' | transloco }}</span>
          </div>

            <div class="stat-card">
              <span class="stat-label">{{ 'dashboard.accruedInterest' | transloco }}</span>
              <span class="stat-value">{{ totalAccruedInterest | currencyInr:true:'INR' }}</span>
              <span class="stat-value currency-secondary" *ngFor="let total of otherAccruedInterestValues">
                {{ total.value | currencyInr:true:total.currency }}
              </span>
              <span class="stat-meta text-success">{{ 'dashboard.compoundedToDate' | transloco }}</span>
            </div>

          <div class="stat-card">
            <span class="stat-label">{{ 'dashboard.maxRate' | transloco }}</span>
            <span class="stat-value">8.50%</span>
            <span class="stat-meta text-warning">{{ 'dashboard.regulatoryCap' | transloco }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Navigation Shortcuts -->
      <div class="card mb-6">
        <div class="card-header">
          <h2 class="card-title">{{ 'dashboard.quickActions' | transloco }}</h2>
          <span class="card-subtitle">{{ 'dashboard.oneClick' | transloco }}</span>
        </div>
        <div class="quick-actions-row">
          <app-button variant="primary" (clicked)="navigate('/fixed-deposit/calculator')">
            <app-icon name="calculator" [size]="15"></app-icon>
            <span>{{ 'dashboard.launchCalculator' | transloco }}</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'BANK_OFFICER' || currentRole === 'ADMIN'"
            variant="secondary"
            (clicked)="navigate('/fixed-deposit/create')"
          >
            <app-icon name="plus" [size]="15"></app-icon>
            <span>{{ 'fd.createNew' | transloco }}</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'BANK_OFFICER' || currentRole === 'ADMIN'"
            variant="secondary"
            (clicked)="navigate('/customer/list')"
          >
            <app-icon name="users" [size]="15"></app-icon>
            <span>{{ 'customer.manageKyc' | transloco }}</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'ADMIN'"
            variant="secondary"
            (clicked)="navigate('/admin/batch')"
          >
            <app-icon name="zap" [size]="15"></app-icon>
            <span>{{ 'admin.runBatch' | transloco }}</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'CUSTOMER'"
            variant="secondary"
            (clicked)="navigate('/customer/profile')"
          >
            <app-icon name="user" [size]="15"></app-icon>
            <span>{{ 'dashboard.updateKyc' | transloco }}</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'CUSTOMER'"
            variant="ghost"
            (clicked)="navigate('/reports')"
          >
            <app-icon name="bar-chart" [size]="15"></app-icon>
            <span>{{ 'dashboard.myPortfolio' | transloco }}</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'BANK_OFFICER' || currentRole === 'ADMIN'"
            variant="ghost"
            (clicked)="navigate('/reports')"
          >
            <app-icon name="bar-chart" [size]="15"></app-icon>
            <span>{{ 'dashboard.viewAnalytics' | transloco }}</span>
          </app-button>
        </div>
      </div>

      <!-- Recent Fixed Deposits Table -->
      <app-card
        [title]="(currentRole === 'CUSTOMER' ? 'dashboard.myFdAccounts' : 'dashboard.recentFdAccounts') | transloco"
        [subtitle]="(currentRole === 'CUSTOMER' ? 'dashboard.activeDescription' : 'dashboard.liveDescription') | transloco"
        class="mb-6"
      >
        <div card-action class="flex-row">
          <app-button variant="ghost" (clicked)="loadAccounts(true)">
            <app-icon name="refresh" [size]="13"></app-icon>
            <span>{{ 'common.refresh' | transloco }}</span>
          </app-button>
          <app-button variant="secondary" (clicked)="navigate('/fixed-deposit/accounts')">
            <span>{{ (currentRole === 'CUSTOMER' ? 'dashboard.viewDeposits' : 'dashboard.viewAllAccounts') | transloco }}</span>
            <app-icon name="arrow-right" [size]="13"></app-icon>
          </app-button>
        </div>

        <app-table
          [columns]="fdColumns"
          [data]="recentAccounts"
          [loading]="loadingAccounts"
          [pageSize]="5"
          [emptyMessage]="'fd.noAccounts' | transloco"
        ></app-table>
      </app-card>
    </div>
  `,
  styles: [`
    .welcome-card {
      border-color: var(--color-border-focus);
    }
    .system-time {
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .welcome-heading {
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 4px 0;
    }
    .welcome-sub {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .role-display-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .role-label {
      font-size: 10px;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .stat-card {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }
    .stat-value {
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .stat-meta {
      font-size: var(--text-xs);
    }
    .quick-actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentDate = new Date();
  authState: AuthState | null = null;
  currentRole: UserRole | null = null;

  totalDepositValue = 0;
  activeAccountCount = 0;
  totalAccruedInterest = 0;
  loadingAccounts = false;

  readonly fdColumns: TableColumn[] = [
    { field: 'fdAccountNo', header: 'FD Account No.', translationKey: 'dashboard.fdAccountNo', width: '150px', type: 'mask-account' },
    { field: 'customerId', header: 'Customer ID', translationKey: 'dashboard.customerId', width: '130px' },
    { field: 'principalAmount', header: 'Principal', translationKey: 'dashboard.principal', type: 'currency', align: 'right' },
    { field: 'interestRate', header: 'Rate (%)', translationKey: 'dashboard.rate', align: 'center' },
    { field: 'termMonths', header: 'Term (Months)', translationKey: 'dashboard.term', align: 'center' },
    { field: 'interestType', header: 'Interest Type', translationKey: 'dashboard.interestType' },
    { field: 'status', header: 'Status', translationKey: 'common.status', type: 'badge', align: 'center' }
  ];

  allLoadedAccounts: FixedDepositAccountResponse[] = [
    {
      fdAccountNo: 'FD-100293847',
      customerId: '9',
      productCode: 'PROD_FD_CUMULATIVE',
      principalAmount: 250000,
      interestRate: 7.25,
      termMonths: 24,
      status: 'ACTIVE',
      interestType: 'COMPOUND',
      interestPayoutType: 'MATURITY',
      accruedInterest: 18125
    },
    {
      fdAccountNo: 'FD-100492817',
      customerId: '9',
      productCode: 'PROD_FD_SENIOR',
      principalAmount: 500000,
      interestRate: 8.00,
      termMonths: 36,
      status: 'ACTIVE',
      interestType: 'COMPOUND',
      interestPayoutType: 'ANNUAL',
      accruedInterest: 40000
    },
    {
      fdAccountNo: 'FD-100583920',
      customerId: '8',
      productCode: 'PROD_FD_STANDARD',
      principalAmount: 1000000,
      interestRate: 7.50,
      termMonths: 12,
      status: 'ACTIVE',
      interestType: 'SIMPLE',
      interestPayoutType: 'MATURITY',
      accruedInterest: 75000
    },
    {
      fdAccountNo: 'FD-100612984',
      customerId: '4',
      productCode: 'PROD_FD_QUARTERLY',
      principalAmount: 125000,
      interestRate: 6.80,
      termMonths: 6,
      status: 'ACTIVE',
      interestType: 'SIMPLE',
      interestPayoutType: 'QUARTERLY',
      accruedInterest: 4250
    },
    {
      fdAccountNo: 'FD-100741295',
      customerId: '10',
      productCode: 'PROD_FD_STANDARD',
      principalAmount: 300000,
      interestRate: 7.10,
      termMonths: 18,
      status: 'ACTIVE',
      interestType: 'COMPOUND',
      interestPayoutType: 'MATURITY',
      accruedInterest: 15975
    }
  ];

  recentAccounts: FixedDepositAccountResponse[] = [];
  userCustomerId: string | null = null;
  otherPortfolioValues: Array<{ currency: string; value: number }> = [];
  otherAccruedInterestValues: Array<{ currency: string; value: number }> = [];

  constructor(
    private readonly authService: AuthService,
    private readonly fdAccountApi: FDAccountApiService,
    private readonly userApi: UserApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authService.authState$.subscribe(state => {
      this.authState = state;
      this.currentRole = state.role;
      if (this.currentRole === 'CUSTOMER') {
        if (!this.isDemoUser()) {
          // Real customer: initialize empty
          this.recentAccounts = [];
          this.recalculateStats();
        }
        this.userApi.getMe().subscribe({
          next: (profile) => {
            if (profile && profile.customerId) {
              this.userCustomerId = String(profile.customerId);
              this.loadAccounts();
            } else {
              this.loadingAccounts = false;
              this.recentAccounts = [];
              this.recalculateStats();
            }
          },
          error: () => {
            this.loadingAccounts = false;
            this.recentAccounts = [];
            this.recalculateStats();
          }
        });
      }
      this.filterAccountsForCustomer();
      this.recalculateStats();
    });

    this.loadAccounts(false);
  }

  loadAccounts(isManualRefresh = false): void {
    if (this.currentRole === 'CUSTOMER' && !this.isDemoUser()) {
      if (!this.userCustomerId) return;
      this.loadingAccounts = true;
      this.fdAccountApi.getAccountsByCustomer(this.userCustomerId).pipe(
        timeout(3500),
        catchError(() => of([]))
      ).subscribe({
        next: (data) => {
          this.loadingAccounts = false;
          this.allLoadedAccounts = data || [];
          this.filterAccountsForCustomer();
          this.recalculateStats();
        },
        error: () => {
          this.loadingAccounts = false;
          this.allLoadedAccounts = [];
          this.recentAccounts = [];
          this.recalculateStats();
        }
      });
      return;
    }

    if (isManualRefresh || this.recentAccounts.length === 0) {
      this.loadingAccounts = true;
    }

    this.fdAccountApi.getAccountsByStatus('ACTIVE').pipe(
      timeout(2500),
      catchError(() => of([]))
    ).subscribe({
      next: (data) => {
        this.loadingAccounts = false;
        if (data && data.length > 0) {
          this.allLoadedAccounts = data;
        }
        this.filterAccountsForCustomer();
        this.recalculateStats();
      },
      error: () => {
        this.loadingAccounts = false;
        this.filterAccountsForCustomer();
        this.recalculateStats();
      }
    });
  }

  private isDemoUser(): boolean {
    const username = (this.authService.getUsername() || '').toLowerCase();
    return username === 'alice@test.com' || username === 'alice' || username.startsWith('demo');
  }

  private filterAccountsForCustomer(): void {
    const activeAccounts = this.allLoadedAccounts.filter(account =>
      String(account.status || '').trim().toUpperCase() === 'ACTIVE'
    );

    if (this.currentRole === 'CUSTOMER') {
      if (!this.isDemoUser()) {
        if (this.userCustomerId) {
          const id = this.userCustomerId.trim().toLowerCase();
          this.recentAccounts = activeAccounts.filter(a => a.customerId && a.customerId.toLowerCase().trim() === id);
        } else {
          this.recentAccounts = [];
        }
      } else {
        if (this.userCustomerId) {
          const id = this.userCustomerId.trim().toLowerCase();
          this.recentAccounts = activeAccounts.filter(a => a.customerId && a.customerId.toLowerCase().trim() === id);
        } else {
          this.recentAccounts = activeAccounts.filter(a => a.customerId && (a.customerId === '9' || a.customerId.includes('1001')));
        }
      }
    } else {
      this.recentAccounts = activeAccounts;
    }
  }

  private recalculateStats(): void {
    this.activeAccountCount = this.recentAccounts.length;
    const totals = this.recentAccounts.reduce<Record<string, number>>((acc, account) => {
      const currency = String(account.currency || 'INR').trim().toUpperCase();
      acc[currency] = (acc[currency] || 0) + (Number(account.principalAmount) || 0);
      return acc;
    }, {});
    this.totalDepositValue = totals['INR'] || 0;
    this.otherPortfolioValues = Object.entries(totals)
      .filter(([currency]) => currency !== 'INR')
      .map(([currency, value]) => ({ currency, value }));
    const accruedTotals = this.recentAccounts.reduce<Record<string, number>>((acc, account) => {
      const currency = String(account.currency || 'INR').trim().toUpperCase();
      acc[currency] = (acc[currency] || 0) + (Number(account.accruedInterest) || 0);
      return acc;
    }, {});
    this.totalAccruedInterest = accruedTotals['INR'] || 0;
    this.otherAccruedInterestValues = Object.entries(accruedTotals)
      .filter(([currency]) => currency !== 'INR')
      .map(([currency, value]) => ({ currency, value }));
    // HTTP subscriptions must notify Angular's zoneless change detection.
    this.cdr.markForCheck();
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  get displayName(): string {
    return this.authState?.displayName || (this.authState?.username ? this.authService.getDisplayName(this.authState.username) : 'Banking Associate');
  }
}
