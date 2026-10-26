import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FDTransactionApiService } from '../../../core/api/fd-transaction-api.service';
import { FDTransactionLedgerEntry } from '../../../core/models/fd.models';

@Component({
  selector: 'app-transaction-ledger',
  standalone: false,
  template: `
    <div class="ledger-page animate-fade-in">
      <section class="card ledger-hero mb-6">
        <span class="eyebrow">ADMINISTRATOR VIEW</span>
        <div class="flex-between hero-row">
          <div>
            <h1 class="card-title mt-1">Fixed deposit transaction ledger</h1>
            <p class="card-subtitle">A read-only journal of deposits, interest postings, withdrawals, penalties, and maturity payouts.</p>
          </div>
          <app-button variant="secondary" (clicked)="loadLedger()" [loading]="loading">Refresh</app-button>
        </div>
      </section>

      <section class="card mb-5 filters">
        <div class="filter-copy"><strong>Find a deposit</strong><span>Leave blank to view every transaction.</span></div>
        <input class="form-input account-filter" [(ngModel)]="accountNo" (keyup.enter)="loadLedger()" placeholder="FD account number" aria-label="Filter by FD account number" />
        <app-button variant="primary" (clicked)="loadLedger()">Search</app-button>
        <button type="button" class="btn btn-ghost" *ngIf="accountNo" (click)="clearFilter()">Clear</button>
      </section>

      <section class="card ledger-table-card">
        <div class="ledger-heading">
          <div><span class="eyebrow">LIVE FINANCIAL JOURNAL</span><h2>{{ entries.length }} transaction{{ entries.length === 1 ? '' : 's' }}</h2></div>
          <span class="updated" *ngIf="loadedAt">Updated {{ loadedAt | date:'medium' }}</span>
        </div>
        <div *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Transaction</th><th>FD account</th><th>Customer</th><th>Type</th><th class="amount">Amount</th><th class="amount">Penalty</th><th>Date</th><th>Remarks</th></tr></thead>
            <tbody>
              <tr *ngFor="let entry of entries">
                <td class="mono">{{ entry.transactionId }}</td><td class="mono">{{ entry.fdAccountNo }}</td><td>{{ entry.customerId || '—' }}</td>
                <td><app-badge variant="role" [text]="entry.transactionType"></app-badge></td>
                <td class="amount">{{ entry.amount | currencyInr:true:(entry.currency || 'INR') }}</td>
                <td class="amount">{{ entry.penaltyAmount | currencyInr:true:(entry.currency || 'INR') }}</td>
                <td>{{ entry.transactionDate | date:'medium' }}</td><td>{{ entry.remarks || '—' }}</td>
              </tr>
              <tr *ngIf="!loading && !entries.length"><td colspan="8" class="empty">No persisted transactions match this filter.</td></tr>
              <tr *ngIf="loading"><td colspan="8" class="empty">Loading the ledger…</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ledger-hero { padding: 28px; } .hero-row { align-items: center; gap: 20px; } .eyebrow { font-size: 11px; letter-spacing: .1em; font-weight: 700; color: var(--color-accent); }
    .filters { display: flex; align-items: end; gap: 12px; padding: 18px 22px; flex-wrap: wrap; } .filter-copy { display:flex; flex-direction:column; gap:4px; margin-right:auto; color:var(--color-text-secondary); font-size:13px; } .filter-copy strong { color:var(--color-text-primary); font-size:14px; } .account-filter { min-width: 245px; }
    .ledger-table-card { padding: 22px; } .ledger-heading { display:flex; justify-content:space-between; align-items:end; margin-bottom:16px; } h2 { margin: 5px 0 0; font-size: 20px; color:var(--color-text-primary); } .updated { color:var(--color-text-muted); font-size:12px; }
    .table-scroll { overflow:auto; } table { width:100%; border-collapse:collapse; min-width: 1080px; } th { text-align:left; padding:12px 10px; font-size:11px; letter-spacing:.06em; color:var(--color-text-muted); border-bottom:1px solid var(--color-border-default); } td { padding:13px 10px; color:var(--color-text-secondary); border-bottom:1px solid var(--color-border-subtle); font-size:13px; } .amount { text-align:right; white-space:nowrap; color:var(--color-text-primary); font-weight:600; } .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; white-space:nowrap; } .empty { text-align:center; padding:32px; color:var(--color-text-muted); } .error-banner { background:color-mix(in srgb, #dc3545 14%, transparent); border:1px solid #dc3545; color:var(--color-text-primary); padding:10px 12px; border-radius:6px; margin-bottom:14px; }
    @media (max-width: 720px) { .hero-row { align-items:flex-start; flex-direction:column; } .filters { align-items:stretch; } .account-filter { min-width:0; width:100%; } }
  `]
})
export class TransactionLedgerComponent implements OnInit {
  entries: FDTransactionLedgerEntry[] = [];
  accountNo = '';
  loading = false;
  loadedAt?: Date;
  errorMessage = '';

  constructor(
    private readonly transactions: FDTransactionApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadLedger(); }

  loadLedger(): void {
    this.loading = true;
    this.errorMessage = '';
    this.transactions.ledger(this.accountNo).subscribe({
      next: entries => {
        this.entries = entries || [];
        this.loadedAt = new Date();
        this.loading = false;
        // HTTP callbacks do not automatically refresh this zoneless application.
        this.cdr.markForCheck();
      },
      error: error => {
        this.entries = [];
        this.loading = false;
        this.errorMessage = error?.status === 403
          ? 'Only administrators can view the transaction ledger.'
          : 'The transaction ledger could not be loaded. Please refresh and try again.';
        this.cdr.markForCheck();
      }
    });
  }

  clearFilter(): void { this.accountNo = ''; this.loadLedger(); }
}
