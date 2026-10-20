import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize, Observable, timeout } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CustomerPortfolio, FdMaturityReport, ReportApiService } from '../../core/api/report-api.service';

// This page intentionally uses native tables so reports remain visible even when shared table styling changes.

type ReportKind = 'summary' | 'interest' | 'maturity';
type ReportDefinition = { kind: ReportKind; labelKey: string; descriptionKey: string; endpoint: string; };
type CurrencyTotal = { currency: string; value: number; };

@Component({
  selector: 'app-reports',
  standalone: false,
  template: `
    <main class="reports-page animate-fade-in">
      <section class="hero-card">
        <div>
          <span class="eyebrow">{{ 'reports.analytics' | transloco }}</span>
          <h1>{{ (isCustomer ? 'reports.myReports' : 'reports.reportingCentre') | transloco }}</h1>
          <p>{{ (isCustomer ? 'reports.customerIntro' : 'reports.staffIntro') | transloco }}</p>
        </div>
        <button class="btn btn-secondary" type="button" (click)="refresh()" [disabled]="loading">{{ loading ? 'Refreshing…' : 'Refresh data' }}</button>
      </section>

      <section *ngIf="error" class="alert-card" role="alert">
        <div><strong>We could not load one report.</strong><span>{{ error }}</span></div>
        <button class="btn btn-secondary" type="button" (click)="refresh()">{{ 'common.tryAgain' | transloco }}</button>
      </section>

      <ng-container *ngIf="isCustomer; else staffReports">
        <section class="metric-grid" *ngIf="portfolio">
          <article class="metric-card"><span>{{ 'reports.fdAccounts' | transloco }}</span><strong>{{ portfolio.totalAccounts }}</strong></article>
          <article class="metric-card"><span>{{ 'reports.totalPrincipal' | transloco }}</span><strong *ngFor="let total of portfolioPrincipalTotals">{{ money(total.value, total.currency) }}</strong></article>
          <article class="metric-card"><span>{{ 'common.accruedInterest' | transloco }}</span><strong *ngFor="let total of portfolioInterestTotals">{{ money(total.value, total.currency) }}</strong></article>
        </section>
        <section class="report-panel">
          <div class="panel-heading"><div><span class="eyebrow">CUSTOMER PORTFOLIO</span><h2>Your fixed deposits</h2><p>Only your accounts are shown here.</p></div><span class="status" *ngIf="loading">Loading…</span></div>
          <div *ngIf="!loading && !portfolio" class="empty-state">Your portfolio could not be loaded yet. Use <strong>Refresh data</strong> to try again.</div>
          <div class="table-scroll" *ngIf="portfolio">
            <table>
              <thead><tr><th>Account</th><th>Product</th><th>Principal</th><th>Interest Accrued</th><th>Maturity</th><th>Status</th><th>Detailed report</th></tr></thead>
              <tbody>
                <tr *ngFor="let account of portfolio.accounts">
                  <td>{{ account.accountNo }}</td><td>{{ account.productCode }}</td><td>{{ money(account.principal, account.currency) }}</td><td>{{ money(account.accruedInterest, account.currency) }}</td><td>{{ account.maturityDate | date:'mediumDate' }}</td><td><span class="pill">{{ account.status }}</span></td>
                  <td><button class="link-button" type="button" (click)="loadMaturity(account.accountNo)">{{ 'common.openReport' | transloco }}</button></td>
                </tr>
                <tr *ngIf="portfolio.accounts.length === 0"><td colspan="7" class="empty-cell">No fixed deposit accounts found.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </ng-container>

      <ng-template #staffReports>
        <section class="report-selector" [attr.aria-label]="'reports.available' | transloco">
          <button *ngFor="let report of reportDefinitions" type="button" class="report-tile" [class.active]="selected === report.kind" (click)="select(report.kind)">
            <span>{{ report.labelKey | transloco }}</span><small>{{ report.descriptionKey | transloco }}</small>
          </button>
        </section>
        <section class="metric-grid" *ngIf="reportPrincipalTotals.length">
          <article class="metric-card"><span>{{ 'reports.totalPrincipal' | transloco }}</span><strong *ngFor="let total of reportPrincipalTotals">{{ money(total.value, total.currency) }}</strong></article>
        </section>
        <section class="report-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">{{ 'reports.liveData' | transloco }}</span><h2>{{ selectedDefinition.labelKey | transloco }}</h2><p>{{ selectedDefinition.descriptionKey | transloco }}</p></div>
            <div class="export-actions"><button class="btn btn-secondary" type="button" (click)="downloadCsv()" [disabled]="loading">Download CSV</button><button class="btn btn-primary" type="button" (click)="downloadPdf()" [disabled]="loading">Download PDF</button></div>
          </div>
          <div *ngIf="loading" class="loading-state">{{ 'common.loading' | transloco }} {{ selectedDefinition.labelKey | transloco }}</div>
          <div *ngIf="!loading && data.length === 0" class="empty-state">There are no rows in this report yet.</div>
          <div class="table-scroll" *ngIf="!loading && data.length">
            <table><thead><tr><th *ngFor="let column of columns">{{ column }}</th></tr></thead><tbody><tr *ngFor="let row of data"><td *ngFor="let key of rowKeys">{{ render(row, key) }}</td></tr></tbody></table>
          </div>
        </section>
      </ng-template>

      <section class="report-panel detailed-generator" *ngIf="!isCustomer">
        <div class="panel-heading"><div><span class="eyebrow">DETAILED ACCOUNT REPORT</span><h2>Generate closed-FD settlement report</h2><p>Enter a closed FD account number to see its maturity or premature-withdrawal settlement, interest, transactions, and notifications.</p></div></div>
        <div class="generator-actions"><input class="form-input" [(ngModel)]="accountNumber" placeholder="Example: 0010000394" aria-label="FD account number"><button class="btn btn-primary" type="button" (click)="loadMaturity(accountNumber)" [disabled]="detailLoading">{{ detailLoading ? 'Generating…' : 'Generate report' }}</button></div>
      </section>

      <section class="report-panel detailed-report" *ngIf="maturityReport">
        <div class="panel-heading">
          <div><span class="eyebrow">{{ isPrematureWithdrawal ? 'PREMATURE WITHDRAWAL REPORT' : 'FD MATURITY REPORT' }}</span><h2>{{ maturityReport.fdAccount.accountNo }}</h2><p>Generated {{ maturityReport.reportGeneratedAt | date:'medium' }} · {{ maturityReport.fdAccount.productCode }} · {{ maturityReport.fdAccount.status }}</p></div>
          <div class="export-actions"><button class="btn btn-secondary" type="button" (click)="downloadMaturity('xlsx')">Download Excel</button><button class="btn btn-primary" type="button" (click)="downloadMaturity('pdf')">Download PDF</button></div>
        </div>
        <div class="metric-grid compact">
          <article class="metric-card"><span>Principal</span><strong>{{ money(maturityReport.maturity.principalComponent, maturityReport.fdAccount.currency) }}</strong></article>
          <article class="metric-card"><span>Interest</span><strong>{{ money(maturityReport.maturity.interestComponent, maturityReport.fdAccount.currency) }}</strong></article>
          <article class="metric-card"><span>Net payout</span><strong>{{ money(maturityReport.maturity.netPayout, maturityReport.fdAccount.currency) }}</strong></article>
        </div>
        <div class="details-grid"><div><span>Customer</span><strong>{{ maturityReport.customer.fullName }}</strong></div><div><span>KYC status</span><strong>{{ maturityReport.customer.kycStatus || '—' }}</strong></div><div><span>Interest postings</span><strong>{{ maturityReport.interestTransactions.length }}</strong></div><div><span>Transactions</span><strong>{{ maturityReport.transactions.length }}</strong></div></div>
        <h3>Interest postings</h3><div class="table-scroll"><table><thead><tr><th>ID</th><th>Amount</th><th>Posted at</th><th>Status</th></tr></thead><tbody><tr *ngFor="let item of maturityReport.interestTransactions"><td>{{ item.id }}</td><td>{{ money(item.amount, maturityReport.fdAccount.currency) }}</td><td>{{ item.postedAt | date:'medium' }}</td><td>{{ item.status }}</td></tr><tr *ngIf="!maturityReport.interestTransactions.length"><td colspan="4" class="empty-cell">No interest postings.</td></tr></tbody></table></div>
        <h3>Transactions</h3><div class="table-scroll"><table><thead><tr><th>ID</th><th>Type</th><th>Amount</th><th>Date</th><th>Remarks</th></tr></thead><tbody><tr *ngFor="let item of maturityReport.transactions"><td>{{ item.id }}</td><td>{{ item.type }}</td><td>{{ money(item.amount, maturityReport.fdAccount.currency) }}</td><td>{{ item.occurredAt | date:'medium' }}</td><td>{{ item.remarks || '—' }}</td></tr><tr *ngIf="!maturityReport.transactions.length"><td colspan="5" class="empty-cell">No transactions.</td></tr></tbody></table></div>
      </section>
    </main>
  `,
  styles: [`
    .reports-page { max-width:1280px; margin:0 auto; padding:24px; display:grid; gap:20px; }
    .hero-card,.report-panel,.alert-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-subtle); border-radius:14px; padding:24px; }
    .hero-card,.panel-heading,.alert-card,.generator-actions,.export-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .hero-card h1,.panel-heading h2 { margin:4px 0 6px; color:var(--color-text-primary); }.hero-card p,.panel-heading p { margin:0; color:var(--color-text-secondary); }
    .eyebrow { color:var(--color-accent); font-size:11px; letter-spacing:.12em; font-weight:700; }.alert-card { border-color:var(--color-danger,#b42318); color:var(--color-text-primary); }.alert-card span { display:block; margin-top:4px; color:var(--color-text-secondary); }
    .metric-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }.metric-card { background:var(--color-bg-base); border:1px solid var(--color-border-subtle); border-radius:12px; padding:18px; display:grid; gap:8px; }.metric-card span,.details-grid span { color:var(--color-text-muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }.metric-card strong { color:var(--color-text-primary); font-size:22px; }
    .report-selector { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }.report-tile { text-align:left; background:var(--color-bg-elevated); border:1px solid var(--color-border-subtle); border-radius:12px; padding:18px; color:var(--color-text-primary); cursor:pointer; display:grid; gap:8px; }.report-tile span { font-weight:700; }.report-tile small { color:var(--color-text-secondary); }.report-tile.active { border-color:var(--color-accent); box-shadow:inset 0 0 0 1px var(--color-accent); }
    .table-scroll { overflow:auto; margin-top:18px; } table { width:100%; border-collapse:collapse; min-width:720px; } th,td { padding:13px 12px; border-bottom:1px solid var(--color-border-subtle); text-align:left; white-space:nowrap; } th { color:var(--color-text-muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; } td { color:var(--color-text-primary); font-size:13px; }.empty-cell { text-align:center; color:var(--color-text-secondary); }.empty-state,.loading-state { margin-top:18px; border:1px dashed var(--color-border-subtle); padding:20px; border-radius:10px; color:var(--color-text-secondary); }
    .status,.pill { display:inline-block; border:1px solid var(--color-border-subtle); border-radius:999px; padding:4px 9px; font-size:11px; color:var(--color-text-secondary); }.link-button { background:none; border:0; padding:0; color:var(--color-accent); cursor:pointer; font:inherit; font-weight:600; }.form-input { min-width:270px; max-width:420px; flex:1; padding:10px 12px; border:1px solid var(--color-border-subtle); border-radius:8px; background:var(--color-bg-base); color:var(--color-text-primary); }.detailed-report h3 { margin:26px 0 0; color:var(--color-text-primary); font-size:16px; }.details-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:18px; }.details-grid div { display:grid; gap:6px; }.details-grid strong { color:var(--color-text-primary); }
    @media (max-width:760px) { .reports-page { padding:16px; }.metric-grid,.report-selector,.details-grid { grid-template-columns:1fr; }.hero-card,.panel-heading { align-items:flex-start; }.export-actions { width:100%; }.export-actions .btn { flex:1; }.form-input { min-width:100%; } }
  `]
})
export class ReportsComponent implements OnInit {
  readonly reportDefinitions: ReportDefinition[] = [
    { kind: 'summary', labelKey: 'reports.summary', descriptionKey: 'reports.summaryDescription', endpoint: 'fd-summary' },
    { kind: 'interest', labelKey: 'reports.interestHistory', descriptionKey: 'reports.interestDescription', endpoint: 'interest-transactions' },
    { kind: 'maturity', labelKey: 'reports.maturitySummary', descriptionKey: 'reports.maturityDescription', endpoint: 'maturity-summary' }
  ];
  isCustomer = false; loading = false; detailLoading = false; error = ''; selected: ReportKind = 'summary';
  data: Record<string, unknown>[] = []; portfolio: CustomerPortfolio | null = null; maturityReport: FdMaturityReport | null = null; accountNumber = '';

  constructor(
    private readonly reports: ReportApiService,
    private readonly auth: AuthService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}
  ngOnInit(): void { this.isCustomer = this.auth.getRole() === 'CUSTOMER'; this.refresh(); }
  get selectedDefinition(): ReportDefinition { return this.reportDefinitions.find(report => report.kind === this.selected) || this.reportDefinitions[0]; }
  get rowKeys(): string[] { return this.data.length ? Object.keys(this.data[0]) : []; }
  get columns(): string[] { return this.rowKeys.map(key => key.replace(/([A-Z])/g, ' $1').replace(/^./, value => value.toUpperCase())); }
  get portfolioPrincipalTotals(): CurrencyTotal[] { return this.sumByCurrency(this.portfolio?.accounts || [], 'principal'); }
  get portfolioInterestTotals(): CurrencyTotal[] { return this.sumByCurrency(this.portfolio?.accounts || [], 'accruedInterest'); }
  get reportPrincipalTotals(): CurrencyTotal[] { return this.sumByCurrency(this.data, 'totalPrincipal'); }
  get isPrematureWithdrawal(): boolean { return this.maturityReport?.reportType === 'FD_PREMATURE_WITHDRAWAL'; }
  refresh(): void { this.isCustomer ? this.loadPortfolio() : this.select(this.selected); }
  select(kind: ReportKind): void {
    this.selected = kind; this.error = ''; this.loading = true;
    const request: Observable<unknown[]> = kind === 'interest' ? this.reports.interestHistory() : kind === 'maturity' ? this.reports.maturitySummary() : this.reports.fdSummary();
    request.pipe(timeout(15000), finalize(() => { this.loading = false; this.updateView(); })).subscribe({
      next: rows => { this.data = (rows || []) as Record<string, unknown>[]; this.updateView(); },
      error: error => this.fail(error)
    });
  }
  loadMaturity(accountNo: string): void {
    const normalized = accountNo.trim();
    if (!normalized) { this.error = 'Enter an FD account number to generate its detailed report.'; return; }
    this.error = ''; this.detailLoading = true;
    this.reports.maturityReport(normalized).pipe(timeout(15000), finalize(() => { this.detailLoading = false; this.updateView(); })).subscribe({
      next: report => { this.maturityReport = report; this.accountNumber = report.fdAccount.accountNo; this.updateView(); },
      error: error => this.fail(error)
    });
  }
  downloadCsv(): void { this.download(this.selectedDefinition.endpoint, 'csv'); }
  downloadPdf(): void { this.download(this.selectedDefinition.endpoint, 'pdf'); }
  downloadMaturity(format: 'pdf' | 'xlsx'): void {
    if (!this.maturityReport) return;
    const accountNo = this.maturityReport.fdAccount.accountNo;
    const prefix = this.isPrematureWithdrawal ? 'fd-premature-withdrawal-report' : 'fd-maturity-report';
    this.reports.maturityReportDownload(accountNo, format).pipe(timeout(30000)).subscribe({ next: blob => this.save(blob, `${prefix}-${accountNo}.${format}`), error: error => this.fail(error) });
  }
  render(row: Record<string, unknown>, key: string): string {
    const value = row[key];
    if (value === null || value === undefined || value === '') return '—';
    if (/(principal|interest|amount|payout)/i.test(key) && typeof value === 'number') return this.money(value, String(row['currency'] || 'JPY'));
    if (/(date|at)$/i.test(key)) { const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(); }
    return String(value);
  }
  money(value: number | null | undefined, currency = 'JPY'): string { return new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(Number(value || 0)); }
  private sumByCurrency(rows: unknown[], amountKey: string): CurrencyTotal[] {
    const totals = rows.reduce((result: Record<string, number>, value) => {
      const row = value as Record<string, unknown>;
      const currency = String(row['currency'] || 'INR').toUpperCase();
      result[currency] = (result[currency] || 0) + (Number(row[amountKey]) || 0);
      return result;
    }, {});
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)).map(([currency, value]) => ({ currency, value }));
  }
  private loadPortfolio(): void {
    this.error = ''; this.loading = true;
    this.reports.portfolio().pipe(timeout(15000), finalize(() => { this.loading = false; this.updateView(); })).subscribe({
      next: portfolio => { this.portfolio = portfolio; this.updateView(); },
      error: error => this.fail(error)
    });
  }
  private download(path: string, extension: 'csv' | 'pdf'): void { this.reports.download(path, extension).pipe(timeout(30000)).subscribe({ next: blob => this.save(blob, `${path}.${extension}`), error: error => this.fail(error) }); }
  private save(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
  private fail(error: any): void { this.error = error?.error?.detail || error?.error?.message || error?.message || 'Unable to load the report. Please try again.'; this.updateView(); }
  private updateView(): void { this.changeDetector.detectChanges(); }
}
