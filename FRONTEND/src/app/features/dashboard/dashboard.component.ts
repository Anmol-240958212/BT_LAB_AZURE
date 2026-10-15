import { Component, OnInit } from '@angular/core';
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
              Welcome back, {{ displayName }}
            </h1>
            <p class="welcome-sub">
              Access your fixed deposit assets, run calculations, and oversee customer operations.
            </p>
          </div>
          <div class="role-display-box">
            <span class="role-label">Current Role</span>
            <app-badge variant="role" [text]="currentRole || 'CUSTOMER'"></app-badge>
          </div>
        </div>

        <!-- Metric Stat Cards Row -->
        <div class="grid-4 mt-6">
          <div class="stat-card">
            <span class="stat-label">TOTAL PORTFOLIO VALUE</span>
            <span class="stat-value">{{ totalDepositValue | currencyInr }}</span>
            <span class="stat-meta text-accent">Active Fixed Deposits</span>
          </div>

          <div class="stat-card">
            <span class="stat-label">ACTIVE ACCOUNTS</span>
            <span class="stat-value">{{ activeAccountCount }}</span>
            <span class="stat-meta text-secondary">Verified & Earning Interest</span>
          </div>

          <div class="stat-card">
            <span class="stat-label">ACCRUED INTEREST</span>
            <span class="stat-value">{{ totalAccruedInterest | currencyInr }}</span>
            <span class="stat-meta text-success">Compounded to Date</span>
          </div>

          <div class="stat-card">
            <span class="stat-label">MAX REGULATORY RATE</span>
            <span class="stat-value">8.50%</span>
            <span class="stat-meta text-warning">Regulatory Rate Cap</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Navigation Shortcuts -->
      <div class="card mb-6">
        <div class="card-header">
          <h2 class="card-title">Quick Actions & Workflows</h2>
          <span class="card-subtitle">One-click access to core banking operations</span>
        </div>
        <div class="quick-actions-row">
          <app-button variant="primary" (clicked)="navigate('/fixed-deposit/calculator')">
            <app-icon name="calculator" [size]="15"></app-icon>
            <span>Launch FD Calculator</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'BANK_OFFICER' || currentRole === 'ADMIN'"
            variant="secondary"
            (clicked)="navigate('/fixed-deposit/create')"
          >
            <app-icon name="plus" [size]="15"></app-icon>
            <span>Create New FD Account</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'BANK_OFFICER' || currentRole === 'ADMIN'"
            variant="secondary"
            (clicked)="navigate('/customer/list')"
          >
            <app-icon name="users" [size]="15"></app-icon>
            <span>Manage Customer KYC</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'ADMIN'"
            variant="secondary"
            (clicked)="navigate('/admin/batch')"
          >
            <app-icon name="zap" [size]="15"></app-icon>
            <span>Run Batch Operations</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'CUSTOMER'"
            variant="secondary"
            (clicked)="navigate('/customer/profile')"
          >
            <app-icon name="user" [size]="15"></app-icon>
            <span>Update My KYC Profile</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'CUSTOMER'"
            variant="ghost"
            (clicked)="navigate('/fixed-deposit/accounts')"
          >
            <app-icon name="coins" [size]="15"></app-icon>
            <span>My Deposit Portfolio</span>
          </app-button>

          <app-button
            *ngIf="currentRole === 'BANK_OFFICER' || currentRole === 'ADMIN'"
            variant="ghost"
            (clicked)="navigate('/reports')"
          >
            <app-icon name="bar-chart" [size]="15"></app-icon>
            <span>View Analytics</span>
          </app-button>
        </div>
      </div>

      <!-- Recent Fixed Deposits Table -->
      <app-card
        [title]="currentRole === 'CUSTOMER' ? 'My Fixed Deposit Accounts' : 'Recent Fixed Deposit Accounts'"
        [subtitle]="currentRole === 'CUSTOMER' ? 'Your active deposit instruments and accrued returns' : 'Live registry of active deposit instruments under management'"
        class="mb-6"
      >
        <div card-action class="flex-row">
          <app-button variant="ghost" (clicked)="loadAccounts(true)">
            <app-icon name="refresh" [size]="13"></app-icon>
            <span>Refresh Data</span>
          </app-button>
          <app-button variant="secondary" (clicked)="navigate('/fixed-deposit/accounts')">
            <span>{{ currentRole === 'CUSTOMER' ? 'View My Deposits' : 'View All Accounts' }}</span>
            <app-icon name="arrow-right" [size]="13"></app-icon>
          </app-button>
        </div>

        <app-table
          [columns]="fdColumns"
          [data]="recentAccounts"
          [loading]="loadingAccounts"
          [pageSize]="5"
          emptyMessage="No fixed deposit accounts found."
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
    { field: 'fdAccountNo', header: 'FD Account No.', width: '150px', type: 'mask-account' },
    { field: 'customerId', header: 'Customer ID', width: '130px' },
    { field: 'principalAmount', header: 'Principal', type: 'currency', align: 'right' },
    { field: 'interestRate', header: 'Rate (%)', align: 'center' },
    { field: 'termMonths', header: 'Term (Months)', align: 'center' },
    { field: 'interestType', header: 'Interest Type' },
    { field: 'status', header: 'Status', type: 'badge', align: 'center' }
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

  constructor(
    private readonly authService: AuthService,
    private readonly fdAccountApi: FDAccountApiService,
    private readonly userApi: UserApiService,
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
    if (this.currentRole === 'CUSTOMER') {
      if (!this.isDemoUser()) {
        if (this.userCustomerId) {
          const id = this.userCustomerId.trim().toLowerCase();
          this.recentAccounts = this.allLoadedAccounts.filter(a => a.customerId && a.customerId.toLowerCase().trim() === id);
        } else {
          this.recentAccounts = [];
        }
      } else {
        if (this.userCustomerId) {
          const id = this.userCustomerId.trim().toLowerCase();
          this.recentAccounts = this.allLoadedAccounts.filter(a => a.customerId && a.customerId.toLowerCase().trim() === id);
        } else {
          this.recentAccounts = this.allLoadedAccounts.filter(a => a.customerId && (a.customerId === '9' || a.customerId.includes('1001')));
        }
      }
    } else {
      this.recentAccounts = [...this.allLoadedAccounts];
    }
  }

  private recalculateStats(): void {
    this.activeAccountCount = this.recentAccounts.length;
    this.totalDepositValue = this.recentAccounts.reduce((acc, curr) => acc + (Number(curr.principalAmount) || 0), 0);
    this.totalAccruedInterest = this.recentAccounts.reduce((acc, curr) => acc + (Number(curr.accruedInterest) || 0), 0);
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  get displayName(): string {
    return this.authState?.displayName || (this.authState?.username ? this.authService.getDisplayName(this.authState.username) : 'Banking Associate');
  }
}
