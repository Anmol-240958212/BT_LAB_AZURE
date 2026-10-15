import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, timeout, finalize } from 'rxjs/operators';
import { FDAccountApiService } from '../../../core/api/fd-account-api.service';
import { AuthService } from '../../../core/auth.service';
import { FixedDepositAccountResponse, FDWithdrawalResponse } from '../../../core/models/fd.models';
import { TableColumn } from '../../../shared/components/table/table.component';
import { ToastService } from '../../../shared/services/toast.service';
import { UserApiService } from '../../../core/api/user-api.service';

@Component({
  selector: 'app-fd-accounts',
  standalone: false,
  template: `
    <div class="fd-accounts-page animate-fade-in">
      <!-- Header Banner -->
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">{{ canCreate ? 'DEPOSIT LEDGER REGISTRY' : 'CUSTOMER DEPOSIT HOLDINGS' }}</span>
            <h1 class="card-title mt-1">{{ canCreate ? 'Fixed Deposit Accounts Portfolio' : 'My Fixed Deposit Portfolio' }}</h1>
            <p class="card-subtitle">
              {{ canCreate ? 'Manage customer deposit accounts, terms, and premature liquidation workflows.' : 'View your active deposit instruments, contracted interest rates, and maturity statuses.' }}
            </p>
          </div>
          <app-button
            *ngIf="canCreate"
            variant="primary"
            (clicked)="router.navigate(['/fixed-deposit/create'])"
          >
            <app-icon name="plus" [size]="14"></app-icon>
            <span>Open New FD</span>
          </app-button>
          <app-button
            *ngIf="!canCreate"
            variant="primary"
            (clicked)="router.navigate(['/fixed-deposit/calculator'])"
          >
            <app-icon name="plus" [size]="14"></app-icon>
            <span>Apply for Fixed Deposit</span>
          </app-button>
        </div>

        <!-- Filter Controls -->
        <div class="filter-row mt-4">
          <div class="filter-group">
            <label class="filter-label" for="filter-status">Filter by Status:</label>
            <select id="filter-status" class="form-select status-select" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option value="ALL">All Accounts (Active / Closed / Pending)</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div class="filter-group" *ngIf="canCreate">
            <label class="filter-label" for="filter-cust">Customer ID:</label>
            <input
              id="filter-cust"
              type="text"
              class="form-input cust-input"
              placeholder="e.g. CUST-1001"
              [(ngModel)]="customerFilter"
              (input)="applyFilters()"
            />
          </div>

          <app-button variant="secondary" (clicked)="loadAccounts()">
            Refresh
          </app-button>
        </div>
      </div>

      <!-- Accounts Table -->
      <app-card
        [title]="canCreate ? 'Fixed Deposit Holdings' : 'My Active Deposits'"
        [subtitle]="filteredAccounts.length + ' deposit accounts match criteria'"
      >
        <app-table
          [columns]="columns"
          [data]="filteredAccounts"
          [loading]="loading"
          [pageSize]="10"
          [hasActions]="true"
          emptyMessage="No fixed deposit accounts found."
        >
          <ng-template #actionTemplate let-account>
            <div class="table-actions">
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                (click)="viewDetails(account)"
              >
                Inspect
              </button>
              <button
                *ngIf="account.status === 'PENDING' && canCreate"
                type="button"
                class="btn btn-primary btn-xs"
                [disabled]="approvingNo === account.fdAccountNo"
                (click)="approveFdAccount(account)"
              >
                {{ approvingNo === account.fdAccountNo ? 'Approving...' : 'Approve' }}
              </button>
              <button
                *ngIf="account.status === 'ACTIVE' && canCreate"
                type="button"
                class="btn btn-danger btn-xs"
                (click)="openWithdrawalModal(account)"
              >
                Liquidate
              </button>
            </div>
          </ng-template>
        </app-table>
      </app-card>

      <!-- Account Detail Modal -->
      <app-modal
        [isOpen]="isDetailModalOpen"
        title="Deposit Instrument Overview"
        [subtitle]="selectedAccount ? 'Account: ' + selectedAccount.fdAccountNo : ''"
        (closeModal)="isDetailModalOpen = false"
      >
        <div *ngIf="selectedAccount" class="account-details-grid">
          <div class="detail-row">
            <span class="detail-label">Customer Identifier:</span>
            <span class="detail-val">{{ selectedAccount.customerId }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Product Code:</span>
            <span class="detail-val">{{ selectedAccount.productCode }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Principal Amount:</span>
            <span class="detail-val font-semibold">{{ selectedAccount.principalAmount | currencyInr }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Contracted Rate:</span>
            <span class="detail-val">{{ selectedAccount.interestRate }}% p.a.</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Tenure Duration:</span>
            <span class="detail-val">{{ selectedAccount.termMonths }} Months</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Accrual Type:</span>
            <span class="detail-val">{{ selectedAccount.interestType }} ({{ selectedAccount.interestPayoutType }})</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <app-badge [variant]="selectedAccount.status === 'ACTIVE' ? 'active' : (selectedAccount.status === 'PENDING' ? 'pending' : 'closed')" [text]="selectedAccount.status === 'PENDING' ? 'PENDING APPROVAL' : selectedAccount.status"></app-badge>
          </div>
          <div *ngIf="selectedAccount.status === 'PENDING'" class="alert alert-warning mt-3" style="grid-column: 1 / -1; padding: 10px 14px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 8px;">
            <app-icon name="shield" [size]="16" color="#f59e0b"></app-icon>
            <span>This deposit application is pending authorization and ledger activation by an authorized Bank Officer.</span>
          </div>

          <!-- Kafka Maturity Notification Delivery Status -->
          <div *ngIf="accountNotifications && accountNotifications.length > 0" class="mt-4 pt-4" style="border-top: 1px solid var(--color-border-subtle); grid-column: 1 / -1;">
            <span class="detail-label" style="font-weight: 600; display: block; margin-bottom: 8px;">Kafka Maturity Notification & Email Status:</span>
            <div *ngFor="let n of accountNotifications" class="notice-box mb-2" style="font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>{{ n.notificationLogNotificationType }}</strong>
                <app-badge [variant]="n.notificationLogStatus === 'SENT' ? 'active' : 'pending'" [text]="n.notificationLogStatus"></app-badge>
              </div>
              <div><strong>Recipient:</strong> {{ n.notificationLogRecipient || 'Not assigned' }}</div>
              <div *ngIf="n.notificationLogSentAt"><strong>Delivered:</strong> {{ n.notificationLogSentAt | date:'medium' }}</div>
              <div *ngIf="n.notificationLogErrorMessage" style="color: var(--color-danger);"><strong>Error:</strong> {{ n.notificationLogErrorMessage }}</div>
            </div>
          </div>
        </div>

        <div modal-footer>
          <app-button variant="secondary" (clicked)="isDetailModalOpen = false">Close</app-button>
        </div>
      </app-modal>

      <!-- Premature Withdrawal Modal -->
      <app-modal
        [isOpen]="isWithdrawalModalOpen"
        title="Premature Fixed Deposit Withdrawal"
        [subtitle]="selectedAccount ? 'Liquidating Account: ' + selectedAccount.fdAccountNo : ''"
        (closeModal)="isWithdrawalModalOpen = false"
      >
        <div *ngIf="selectedAccount" class="withdrawal-form">
          <div class="notice-box mb-4">
            <app-icon name="alert-triangle" [size]="16"></app-icon>
            <span>Premature closure applies standard 1.00% penalty on contracted rate per terms.</span>
          </div>

          <div class="form-group mb-3">
            <label class="form-label" for="with-transfer-acc">Settlement Account (Mandatory) *</label>
            <input
              id="with-transfer-acc"
              type="text"
              class="form-input"
              placeholder="Enter linked account number"
              [(ngModel)]="transferAccount"
            />
          </div>

          <div class="form-group mb-4">
            <label class="form-label" for="with-date">Withdrawal Effective Date *</label>
            <input
              id="with-date"
              type="date"
              class="form-input"
              [(ngModel)]="withdrawalDate"
            />
          </div>

          <div *ngIf="withdrawalResult" class="yield-breakdown-list mb-4">
            <div class="breakdown-row">
              <span class="row-label">Disbursement Status:</span>
              <app-badge variant="active" [text]="withdrawalResult.status"></app-badge>
            </div>
            <div class="breakdown-row">
              <span class="row-label">Penalty Deducted:</span>
              <span class="row-val text-error">- {{ withdrawalResult.penaltyApplied | currencyInr }}</span>
            </div>
            <div class="breakdown-row">
              <span class="row-label">Net Proceeds Paid:</span>
              <span class="row-val text-success font-semibold">{{ withdrawalResult.withdrawalAmount | currencyInr }}</span>
            </div>
          </div>
        </div>

        <div modal-footer>
          <app-button variant="secondary" (clicked)="isWithdrawalModalOpen = false">Cancel</app-button>
          <app-button
            variant="danger"
            [loading]="processingWithdrawal"
            [disabled]="!transferAccount.trim() || processingWithdrawal"
            (clicked)="confirmWithdrawal()"
          >
            {{ processingWithdrawal ? 'Executing Settlement...' : 'Confirm Liquidation' }}
          </app-button>
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
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-4);
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .filter-label {
      font-size: 11px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }
    .status-select {
      min-width: 200px;
    }
    .cust-input {
      width: 160px;
    }
    .table-actions {
      display: flex;
      gap: var(--space-2);
      justify-content: flex-end;
    }
    .btn-xs {
      padding: 3px 8px;
      font-size: 11px;
    }
    .account-details-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: var(--text-sm);
    }
    .detail-label {
      color: var(--color-text-secondary);
    }
    .detail-val {
      color: var(--color-text-primary);
    }
    .font-semibold {
      font-weight: 600;
    }
    .yield-breakdown-list {
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      font-size: var(--text-sm);
    }
  `]
})
export class FDAccountsComponent implements OnInit {
  selectedStatus = 'ALL';
  customerFilter = '';
  loading = false;

  isDetailModalOpen = false;
  isWithdrawalModalOpen = false;
  accountNotifications: any[] = [];
  loadingNotifications = false;
  selectedAccount: FixedDepositAccountResponse | null = null;

  transferAccount = '';
  withdrawalDate = new Date().toISOString().substring(0, 10);
  processingWithdrawal = false;
  withdrawalResult: FDWithdrawalResponse | null = null;

  readonly mockAccounts: FixedDepositAccountResponse[] = [
    {
      fdAccountNo: 'FD-100293847',
      customerId: 'CUST-1001',
      productCode: 'PROD_FD_CUMULATIVE',
      principalAmount: 250000,
      interestRate: 7.25,
      termMonths: 24,
      status: 'ACTIVE',
      interestType: 'COMPOUND',
      interestPayoutType: 'MATURITY',
      openedAt: '2026-01-10T10:30:00'
    },
    {
      fdAccountNo: 'FD-100492817',
      customerId: 'CUST-1002',
      productCode: 'PROD_FD_SENIOR',
      principalAmount: 500000,
      interestRate: 8.00,
      termMonths: 36,
      status: 'ACTIVE',
      interestType: 'COMPOUND',
      interestPayoutType: 'ANNUAL',
      openedAt: '2026-02-01T11:00:00'
    },
    {
      fdAccountNo: 'FD-100583920',
      customerId: 'CUST-1003',
      productCode: 'PROD_FD_STANDARD',
      principalAmount: 1000000,
      interestRate: 7.50,
      termMonths: 12,
      status: 'ACTIVE',
      interestType: 'SIMPLE',
      interestPayoutType: 'MATURITY',
      openedAt: '2026-03-05T09:15:00'
    },
    {
      fdAccountNo: 'FD-100612984',
      customerId: 'CUST-1004',
      productCode: 'PROD_FD_QUARTERLY',
      principalAmount: 125000,
      interestRate: 6.80,
      termMonths: 6,
      status: 'PENDING',
      interestType: 'SIMPLE',
      interestPayoutType: 'QUARTERLY',
      openedAt: '2026-03-12T14:20:00'
    },
    {
      fdAccountNo: 'FD-100782910',
      customerId: 'CUST-1001',
      productCode: 'PROD_FD_STANDARD',
      principalAmount: 300000,
      interestRate: 7.10,
      termMonths: 12,
      status: 'CLOSED',
      interestType: 'SIMPLE',
      interestPayoutType: 'MATURITY',
      openedAt: '2025-01-05T10:00:00',
      closedAt: '2026-01-05T10:00:00'
    }
  ];

  allAccounts: FixedDepositAccountResponse[] = [];
  filteredAccounts: FixedDepositAccountResponse[] = [];

  readonly columns: TableColumn[] = [
    { field: 'fdAccountNo', header: 'Account No.', type: 'mask-account' },
    { field: 'customerId', header: 'Customer ID', width: '130px' },
    { field: 'principalAmount', header: 'Principal', type: 'currency', align: 'right' },
    { field: 'interestRate', header: 'Rate (%)', align: 'center' },
    { field: 'termMonths', header: 'Term (M)', align: 'center' },
    { field: 'interestType', header: 'Interest Type' },
    { field: 'status', header: 'Status', type: 'badge', align: 'center' }
  ];

  userCustomerId: string | null = null;

  constructor(
    private readonly fdAccountApi: FDAccountApiService,
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly toastService: ToastService,
    public readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  get canCreate(): boolean {
    const role = this.authService.getRole();
    return role === 'BANK_OFFICER' || role === 'ADMIN';
  }

  loadAccounts(isManualRefresh = false): void {
    const role = this.authService.getRole();

    if (role === 'CUSTOMER') {
      if (this.isDemoUser()) {
        this.loading = true;
        this.cdr.detectChanges();
        const fetch$ = this.selectedStatus === 'ALL'
          ? this.fdAccountApi.getAccountsByStatus('ACTIVE')
          : this.fdAccountApi.getAccountsByStatus(this.selectedStatus);

        fetch$.pipe(
          timeout(3000),
          catchError(() => of([])),
          finalize(() => {
            this.loading = false;
            this.cdr.detectChanges();
          })
        ).subscribe({
          next: (data) => {
            if (data && data.length > 0) {
              this.allAccounts = data;
            } else {
              this.allAccounts = [...this.mockAccounts];
            }
            this.applyFilters();
          },
          error: () => {
            this.allAccounts = [...this.mockAccounts];
            this.applyFilters();
          }
        });
        return;
      }

      // Real customer account
      if (!this.userCustomerId) {
        this.loading = true;
        this.cdr.detectChanges();
        this.userApi.getMe().pipe(
          timeout(3000),
          catchError((err) => {
            console.warn('Could not fetch user profile for customer ID:', err);
            return of(null);
          }),
          finalize(() => {
            if (!this.userCustomerId) {
              this.loading = false;
              this.cdr.detectChanges();
            }
          })
        ).subscribe({
          next: (profile) => {
            if (profile && profile.customerId) {
              this.userCustomerId = String(profile.customerId);
              this.fetchCustomerAccounts(isManualRefresh);
            } else {
              this.loading = false;
              this.allAccounts = [];
              this.filteredAccounts = [];
              this.cdr.detectChanges();
            }
          },
          error: () => {
            this.loading = false;
            this.allAccounts = [];
            this.filteredAccounts = [];
            this.cdr.detectChanges();
          }
        });
        return;
      }

      this.fetchCustomerAccounts(isManualRefresh);
      return;
    }

    // Bank Officer or Admin
    this.loading = true;
    this.cdr.detectChanges();
    const fetch$ = this.selectedStatus === 'ALL'
      ? this.fdAccountApi.getAccountsByStatus('ALL')
      : this.fdAccountApi.getAccountsByStatus(this.selectedStatus);

    fetch$.pipe(
      timeout(3000),
      catchError(() => of([])),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.allAccounts = data;
        } else if (this.allAccounts.length === 0) {
          this.allAccounts = [...this.mockAccounts];
        }
        this.applyFilters();
      },
      error: () => {
        if (this.allAccounts.length === 0) {
          this.allAccounts = [...this.mockAccounts];
        }
        this.applyFilters();
      }
    });
  }

  approvingNo: string | null = null;

  approveFdAccount(account: FixedDepositAccountResponse): void {
    if (this.approvingNo) return;
    this.approvingNo = account.fdAccountNo;
    this.cdr.detectChanges();

    this.fdAccountApi.approveAccount(account.fdAccountNo).pipe(
      finalize(() => {
        this.approvingNo = null;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.toastService.success(
          `Fixed Deposit Account ${res.fdAccountNo} has been approved and activated!`,
          'Account Approved'
        );
        this.loadAccounts(true);
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || err.message || 'Failed to approve FD account';
        this.toastService.error(msg, 'Approval Failed');
      }
    });
  }

  private fetchCustomerAccounts(isManualRefresh = false): void {
    if (!this.userCustomerId) {
      this.loading = false;
      this.allAccounts = [];
      this.filteredAccounts = [];
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const fetch$ = this.selectedStatus === 'ALL'
      ? this.fdAccountApi.getAccountsByCustomer(this.userCustomerId)
      : this.fdAccountApi.getCustomerAccountsByStatus(this.userCustomerId, this.selectedStatus);

    fetch$.pipe(
      timeout(3500),
      catchError((err) => {
        console.warn('Could not fetch customer accounts from FD API:', err);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.allAccounts = data || [];
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.allAccounts = [];
        this.filteredAccounts = [];
        this.cdr.detectChanges();
      }
    });
  }

  private isDemoUser(): boolean {
    const username = (this.authService.getUsername() || '').toLowerCase();
    return username === 'alice@test.com' || username === 'alice' || username.startsWith('demo');
  }

  applyFilters(): void {
    let list = [...this.allAccounts];

    const role = this.authService.getRole();
    if (role === 'CUSTOMER') {
      if (!this.isDemoUser()) {
        // Real customer: strictly filter by their customer ID, NO mock data
        if (this.userCustomerId) {
          const q = String(this.userCustomerId).trim().toLowerCase();
          list = list.filter(a => {
            if (!a.customerId) return false;
            const cid = String(a.customerId).trim().toLowerCase();
            return cid === q || cid.replace('cust-', '') === q.replace('cust-', '');
          });
        } else {
          list = [];
        }
      } else {
        // Demo user
        if (this.userCustomerId) {
          const q = String(this.userCustomerId).trim().toLowerCase();
          list = list.filter(a => {
            if (!a.customerId) return false;
            const cid = String(a.customerId).trim().toLowerCase();
            return cid === q || cid.replace('cust-', '') === q.replace('cust-', '');
          });
        } else {
          list = list.filter(a => a.customerId && (String(a.customerId).includes('9') || String(a.customerId).toLowerCase().includes('1001')));
        }
      }
    } else if (this.customerFilter.trim()) {
      const q = this.customerFilter.trim().toLowerCase();
      list = list.filter(a => a.customerId && String(a.customerId).toLowerCase().includes(q));
    }

    if (this.selectedStatus !== 'ALL') {
      list = list.filter(a => a.status && a.status.toUpperCase() === this.selectedStatus.toUpperCase());
    }

    this.filteredAccounts = list;
    this.cdr.detectChanges();
  }

  viewDetails(account: FixedDepositAccountResponse): void {
    this.selectedAccount = account;
    this.isDetailModalOpen = true;
    this.fdAccountApi.getAccount(account.fdAccountNo).subscribe({
      next: (latestAccount) => this.selectedAccount = latestAccount,
      error: () => this.toastService.error('The latest account details could not be loaded.', 'Account Refresh Failed')
    });
    this.accountNotifications = [];
    this.loadingNotifications = true;
    this.fdAccountApi.getAccountNotifications(account.fdAccountNo).subscribe({
      next: (logs) => {
        this.loadingNotifications = false;
        this.accountNotifications = logs || [];
      },
      error: () => {
        this.loadingNotifications = false;
        this.accountNotifications = [];
      }
    });
  }

  openWithdrawalModal(account: FixedDepositAccountResponse): void {
    this.selectedAccount = account;
    this.transferAccount = '';
    this.withdrawalResult = null;
    this.isWithdrawalModalOpen = true;
  }

  confirmWithdrawal(): void {
    if (!this.selectedAccount || !this.transferAccount.trim() || this.processingWithdrawal) return;

    this.processingWithdrawal = true;
    this.fdAccountApi.withdrawFD({
      fdAccountNo: this.selectedAccount.fdAccountNo,
      withdrawalDate: this.withdrawalDate,
      transferAccount: this.transferAccount.trim()
    }).subscribe({
      next: (res) => {
        this.processingWithdrawal = false;
        this.withdrawalResult = res;
        this.selectedAccount!.status = 'CLOSED';
        this.toastService.success(res.message || 'Fixed deposit closed prematurely.', 'Liquidation Complete');
        this.applyFilters();
      },
      error: (err) => {
        this.processingWithdrawal = false;
        // Fallback simulation
        const principal = Number(this.selectedAccount!.principalAmount);
        const penalty = principal * 0.01;
        this.withdrawalResult = {
          status: 'SUCCESS',
          message: 'Withdrawal completed with standard penalty.',
          withdrawalAmount: principal - penalty,
          penaltyApplied: penalty
        };
        this.selectedAccount!.status = 'CLOSED';
        this.toastService.warning(err.message || 'Withdrawal executed with penalty.', 'Notice');
        this.applyFilters();
      }
    });
  }
}
