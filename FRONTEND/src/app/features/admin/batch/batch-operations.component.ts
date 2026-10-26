import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FDInterestApiService } from '../../../core/api/fd-interest-api.service';
import { FDMaturityApiService } from '../../../core/api/fd-maturity-api.service';
import { ToastService } from '../../../shared/services/toast.service';

interface BatchLog {
  timestamp: string;
  type: string;
  status: 'SUCCESS' | 'RUNNING' | 'ERROR';
  message: string;
}

@Component({
  selector: 'app-batch-operations',
  standalone: false,
  template: `
    <div class="batch-page animate-fade-in">
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">CORE BANKING AUTOMATION</span>
            <h1 class="card-title mt-1">End-of-Day Batch Processing Engine</h1>
            <p class="card-subtitle">
              Execute scheduled interest accrual calculations, maturity liquidations, and automated roll-overs.
            </p>
          </div>
          <app-badge variant="role" text="Admin Operations"></app-badge>
        </div>

        <div class="business-date-bar mt-4">
          <div class="flex-row">
            <label class="form-label mb-0" for="batch-biz-date">Processing Business Date:</label>
            <input
              id="batch-biz-date"
              type="date"
              class="form-input date-input"
              [(ngModel)]="businessDate"
            />
          </div>
          <span class="date-hint">Defaults to current calendar date if omitted.</span>
        </div>
      </div>

      <div class="grid-2 mb-6">
        <!-- Interest Calculation Batch Card -->
        <app-card
          title="Periodic Interest Accrual Batch"
          subtitle="Iterates through active accounts to compute daily/periodic interest accruals"
        >
          <p class="text-secondary mb-4">
            Runs automated compound and simple interest accruals across the entire active FD ledger for business date
            <strong>{{ businessDate }}</strong>.
          </p>

          <div class="notice-box mb-4">
            <app-icon name="info" [size]="16"></app-icon>
            <span>Accounts with monthly, quarterly, or maturity payout frequencies will update accrued balances.</span>
          </div>

          <app-button
            variant="primary"
            [loading]="runningInterest"
            [disabled]="runningInterest"
            [block]="true"
            (clicked)="runInterestBatch()"
          >
            <app-icon *ngIf="!runningInterest" name="zap" [size]="15"></app-icon>
            <span>{{ runningInterest ? 'Executing Accrual Engine...' : 'Trigger Interest Calculation Batch' }}</span>
          </app-button>
        </app-card>

        <!-- Maturity Processing Batch Card -->
        <app-card
          title="Automated Maturity & Settlement Batch"
          subtitle="Scans for matured instruments and executes payout or rollover"
        >
          <p class="text-secondary mb-4">
            Processes all contracts where <code>maturityDate &lt;= businessDate</code>. Liquidates principal and total interest to customer settlement accounts.
          </p>

          <div class="notice-box mb-4">
            <app-icon name="lock" [size]="16"></app-icon>
            <span>Completed settlements change account status to <code>CLOSED</code> and update ledger balances.</span>
          </div>

          <app-button
            variant="secondary"
            [loading]="runningMaturity"
            [disabled]="runningMaturity"
            [block]="true"
            (clicked)="runMaturityBatch()"
          >
            <app-icon *ngIf="!runningMaturity" name="package" [size]="15"></app-icon>
            <span>{{ runningMaturity ? 'Processing Matured Accounts...' : 'Trigger Maturity Settlement Batch' }}</span>
          </app-button>
        </app-card>
      </div>

      <!-- Live Execution Log Console -->
      <app-card
        title="Batch Execution Journal & Audit Log"
        subtitle="Chronological record of automated batch jobs run during this session"
      >
        <div class="log-console">
          <div *ngIf="logs.length === 0" class="empty-log">
            No batch jobs triggered in this session. Use the controls above to execute EOD tasks.
          </div>

          <div *ngFor="let log of logs" class="log-entry">
            <span class="log-time">[{{ log.timestamp }}]</span>
            <span [class]="'badge badge-' + (log.status === 'SUCCESS' ? 'active' : log.status === 'ERROR' ? 'closed' : 'pending')">
              {{ log.type }}
            </span>
            <span class="log-msg">{{ log.message }}</span>
          </div>
        </div>
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
    .business-date-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-4);
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-card);
      padding: var(--space-3) var(--space-4);
    }
    .date-input {
      width: 180px;
    }
    .date-hint {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .log-console {
      background-color: #0b0f0d;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-input);
      padding: var(--space-4);
      font-family: monospace;
      font-size: var(--text-xs);
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .empty-log {
      color: var(--color-text-muted);
      font-style: italic;
    }
    .log-entry {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .log-time {
      color: var(--color-text-muted);
    }
    .log-msg {
      color: var(--color-text-primary);
    }
  `]
})
export class BatchOperationsComponent implements OnInit {
  // Use the user's calendar date rather than UTC, which can otherwise select yesterday after midnight in India.
  businessDate = this.currentLocalDate();
  runningInterest = false;
  runningMaturity = false;

  logs: BatchLog[] = [];

  constructor(
    private readonly interestApi: FDInterestApiService,
    private readonly maturityApi: FDMaturityApiService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.addLog('SYSTEM', 'SUCCESS', `Batch processing engine initialized for date ${this.businessDate}`);
  }

  runInterestBatch(): void {
    this.runningInterest = true;
    const nowStr = new Date().toLocaleTimeString();
    this.addLog('INTEREST', 'RUNNING', `Triggering interest calculation batch for ${this.businessDate}...`);

    this.interestApi.runInterestBatch(this.businessDate).subscribe({
      next: (res) => {
        this.runningInterest = false;
        const msg = res || `FD interest batch processed successfully for ${this.businessDate}`;
        this.addLog('INTEREST', 'SUCCESS', msg);
        this.toastService.success(msg, 'Interest Accrual Complete');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.runningInterest = false;
        const message = this.errorMessage(error, 'Interest batch could not be completed. No account changes were made.');
        this.addLog('INTEREST', 'ERROR', message);
        this.toastService.error(message, 'Interest Accrual Failed');
        this.cdr.markForCheck();
      }
    });
  }

  runMaturityBatch(): void {
    this.runningMaturity = true;
    this.addLog('MATURITY', 'RUNNING', `Triggering maturity processing batch for ${this.businessDate}...`);

    this.maturityApi.processMaturityBatch(this.businessDate).subscribe({
      next: (res) => {
        this.runningMaturity = false;
        const msg = res?.message || `Maturity batch processing complete for ${this.businessDate}`;
        this.addLog('MATURITY', 'SUCCESS', msg);
        this.toastService.success(msg, 'Maturity Processed');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.runningMaturity = false;
        const message = this.errorMessage(error, 'Maturity processing could not be completed. No account changes were made.');
        this.addLog('MATURITY', 'ERROR', message);
        this.toastService.error(message, 'Maturity Processing Failed');
        this.cdr.markForCheck();
      }
    });
  }

  private addLog(type: string, status: 'SUCCESS' | 'RUNNING' | 'ERROR', message: string): void {
    this.logs.unshift({
      timestamp: new Date().toLocaleTimeString(),
      type,
      status,
      message
    });
    this.cdr?.markForCheck();
  }

  private currentLocalDate(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.detail || error?.message || fallback;
  }
}
