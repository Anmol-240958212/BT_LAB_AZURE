import { Component, OnInit } from '@angular/core';
import { TableColumn } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-reports',
  standalone: false,
  template: `
    <div class="reports-page animate-fade-in">
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">MANAGEMENT INFORMATION SYSTEM</span>
            <h1 class="card-title mt-1">Portfolio Analytics & Regulatory Reports</h1>
            <p class="card-subtitle">
              Aggregated maturity schedules, deposit tenure concentration, and liability summaries.
            </p>
          </div>
          <app-badge variant="role" text="Officer / Executive Intelligence"></app-badge>
        </div>

        <div class="grid-4 mt-6">
          <div class="stat-card">
            <span class="stat-label">AGGREGATE PRINCIPAL</span>
            <span class="stat-val font-semibold">{{ totalPrincipal | currencyInr }}</span>
            <span class="stat-meta text-accent">5 Deposit Accounts</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">WEIGHTED AVERAGE RATE</span>
            <span class="stat-val font-semibold">7.42% p.a.</span>
            <span class="stat-meta text-secondary">Asset Cost Basis</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">SCHEDULED 30-DAY MATURITY</span>
            <span class="stat-val font-semibold">{{ 300000 | currencyInr }}</span>
            <span class="stat-meta text-warning">Requires Liquidity</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">ESTIMATED ACCRUED LIABILITY</span>
            <span class="stat-val font-semibold">{{ 89450 | currencyInr }}</span>
            <span class="stat-meta text-success">Accrual Reserve</span>
          </div>
        </div>
      </div>

      <div class="grid-2 mb-6">
        <!-- Maturity Schedule Breakdown -->
        <app-card
          title="Tenure Maturity Bucket Schedule"
          subtitle="Distribution of liabilities across chronological time windows"
        >
          <div class="bucket-list">
            <div *ngFor="let b of maturityBuckets" class="bucket-item">
              <div class="flex-between mb-1">
                <span class="bucket-name">{{ b.bucket }}</span>
                <span class="bucket-amount font-semibold">{{ b.amount | currencyInr }} ({{ b.pct }}%)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" [style.width.%]="b.pct"></div>
              </div>
            </div>
          </div>
        </app-card>

        <!-- Category & Product Distribution -->
        <app-card
          title="Customer Segment Concentration"
          subtitle="Deposit volume categorized by special customer classifications"
        >
          <div class="bucket-list">
            <div *ngFor="let c of categoryDistribution" class="bucket-item">
              <div class="flex-between mb-1">
                <div class="flex-row">
                  <app-badge [variant]="c.badge" [text]="c.category"></app-badge>
                  <span class="bucket-name">{{ c.accounts }} accounts</span>
                </div>
                <span class="bucket-amount font-semibold">{{ c.amount | currencyInr }}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill accent-fill" [style.width.%]="c.pct"></div>
              </div>
            </div>
          </div>
        </app-card>
      </div>

      <!-- Regulatory Summary Table -->
      <app-card
        title="Fixed Deposit Portfolio Ledger Registry"
        subtitle="Full audit trail for compliance inspection"
      >
        <app-table
          [columns]="columns"
          [data]="reportLedger"
          [pageSize]="5"
        ></app-table>
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
    .stat-card {
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }
    .stat-val {
      font-size: var(--text-md);
      color: var(--color-text-primary);
    }
    .stat-meta {
      font-size: var(--text-xs);
    }
    .font-semibold {
      font-weight: 600;
    }
    .bucket-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .bucket-item {
      display: flex;
      flex-direction: column;
    }
    .bucket-name {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .bucket-amount {
      font-size: var(--text-xs);
      color: var(--color-text-primary);
    }
    .progress-bar-bg {
      height: 6px;
      background-color: var(--color-bg-elevated);
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid var(--color-border-subtle);
    }
    .progress-bar-fill {
      height: 100%;
      background-color: var(--color-accent);
      border-radius: 3px;
      transition: width 300ms ease;
    }
    .accent-fill {
      background-color: #4a7c5e;
    }
  `]
})
export class ReportsComponent implements OnInit {
  totalPrincipal = 2175000;

  maturityBuckets = [
    { bucket: '1 to 3 Months (Immediate)', amount: 125000, pct: 6 },
    { bucket: '3 to 6 Months', amount: 300000, pct: 14 },
    { bucket: '6 to 12 Months', amount: 1000000, pct: 46 },
    { bucket: '1 to 3 Years (Medium Term)', amount: 750000, pct: 34 }
  ];

  categoryDistribution = [
    { category: 'STANDARD', accounts: 2, amount: 1300000, pct: 60, badge: 'role' as const },
    { category: 'SENIOR CITIZEN', accounts: 1, amount: 500000, pct: 23, badge: 'active' as const },
    { category: 'CUMULATIVE GROWTH', accounts: 1, amount: 250000, pct: 11, badge: 'pending' as const },
    { category: 'QUARTERLY PAYOUT', accounts: 1, amount: 125000, pct: 6, badge: 'role' as const }
  ];

  readonly columns: TableColumn[] = [
    { field: 'accountNo', header: 'FD Account', type: 'mask-account' },
    { field: 'customerId', header: 'Customer ID', width: '130px' },
    { field: 'principal', header: 'Principal', type: 'currency', align: 'right' },
    { field: 'rate', header: 'Rate (%)', align: 'center' },
    { field: 'interestAccrued', header: 'Accrued Interest', type: 'currency', align: 'right' },
    { field: 'maturityDate', header: 'Maturity Date', type: 'date' },
    { field: 'status', header: 'Status', type: 'badge', align: 'center' }
  ];

  reportLedger = [
    {
      accountNo: 'FD-100293847',
      customerId: 'CUST-1001',
      principal: 250000,
      rate: 7.25,
      interestAccrued: 18125,
      maturityDate: '2028-01-10',
      status: 'ACTIVE'
    },
    {
      accountNo: 'FD-100492817',
      customerId: 'CUST-1002',
      principal: 500000,
      rate: 8.00,
      interestAccrued: 40000,
      maturityDate: '2029-02-01',
      status: 'ACTIVE'
    },
    {
      accountNo: 'FD-100583920',
      customerId: 'CUST-1003',
      principal: 1000000,
      rate: 7.50,
      interestAccrued: 75000,
      maturityDate: '2027-03-05',
      status: 'ACTIVE'
    },
    {
      accountNo: 'FD-100612984',
      customerId: 'CUST-1004',
      principal: 125000,
      rate: 6.80,
      interestAccrued: 4250,
      maturityDate: '2026-09-12',
      status: 'PENDING'
    },
    {
      accountNo: 'FD-100782910',
      customerId: 'CUST-1001',
      principal: 300000,
      rate: 7.10,
      interestAccrued: 21300,
      maturityDate: '2026-01-05',
      status: 'CLOSED'
    }
  ];

  ngOnInit(): void {}
}
