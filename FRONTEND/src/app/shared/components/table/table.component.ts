import { Component, ContentChild, EventEmitter, Input, OnChanges, Output, SimpleChanges, TemplateRef } from '@angular/core';

export interface TableColumn {
  field: string;
  header: string;
  translationKey?: string;
  width?: string;
  type?: 'text' | 'currency' | 'date' | 'badge' | 'mask-email' | 'mask-phone' | 'mask-id' | 'mask-account';
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-table',
  standalone: false,
  template: `
    <div class="table-container">
      <div *ngIf="loading" class="table-loading-overlay">
        <app-spinner size="md" [message]="'common.loadingRecords' | transloco"></app-spinner>
      </div>

      <table class="data-table" [attr.aria-busy]="loading">
        <thead>
          <tr>
            <th
              *ngFor="let col of columns"
              [style.width]="col.width || 'auto'"
              [style.text-align]="col.align || 'left'"
            >
              {{ col.translationKey ? (col.translationKey | transloco) : col.header }}
            </th>
            <th *ngIf="hasActions" class="actions-header">{{ 'common.actions' | transloco }}</th>
          </tr>
        </thead>

        <tbody *ngIf="!loading && pagedData.length > 0">
          <tr *ngFor="let row of pagedData; let idx = index" (click)="onRowClick(row)">
            <td
              *ngFor="let col of columns"
              [style.text-align]="col.align || 'left'"
            >
              <!-- Cell rendering by column type -->
              <ng-container [ngSwitch]="col.type">
                <!-- Currency -->
                <span *ngSwitchCase="'currency'">
                  {{ row[col.field] | currencyInr:true:(row.currency || 'INR') }}
                </span>

                <!-- Masked Email -->
                <span *ngSwitchCase="'mask-email'">
                  {{ row[col.field] | mask:'email' }}
                </span>

                <!-- Masked Phone -->
                <span *ngSwitchCase="'mask-phone'">
                  {{ row[col.field] | mask:'phone' }}
                </span>

                <!-- Masked ID -->
                <span *ngSwitchCase="'mask-id'">
                  {{ row[col.field] | mask:'id' }}
                </span>

                <!-- Masked Account -->
                <span *ngSwitchCase="'mask-account'">
                  {{ row[col.field] | mask:'account' }}
                </span>

                <!-- Status Badge -->
                <span *ngSwitchCase="'badge'">
                  <app-badge
                    [variant]="getBadgeVariant(row[col.field])"
                    [text]="row[col.field] | fdStatus"
                  ></app-badge>
                </span>

                <!-- Date -->
                <span *ngSwitchCase="'date'">
                  {{ row[col.field] ? (row[col.field] | date:'mediumDate') : '—' }}
                </span>

                <!-- Default Text -->
                <span *ngSwitchDefault>
                  {{ row[col.field] !== null && row[col.field] !== undefined ? row[col.field] : '—' }}
                </span>
              </ng-container>
            </td>

            <!-- Row Action Template Slot -->
            <td *ngIf="hasActions" class="actions-cell" (click)="$event.stopPropagation()">
              <ng-container *ngIf="actionTemplate" [ngTemplateOutlet]="actionTemplate" [ngTemplateOutletContext]="{ $implicit: row }">
              </ng-container>
            </td>
          </tr>
        </tbody>

        <!-- Empty State -->
        <tbody *ngIf="!loading && pagedData.length === 0">
          <tr>
            <td [attr.colspan]="columns.length + (hasActions ? 1 : 0)" class="empty-cell">
              <div class="empty-state">
                <app-icon name="folder" [size]="28" class="empty-icon"></app-icon>
                <span class="empty-text">{{ emptyMessage }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination bar per Section 4.4 -->
      <div *ngIf="data.length > pageSize" class="table-pagination">
        <span class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }} ({{ data.length }} total records)
        </span>
        <div class="pagination-controls">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            [disabled]="currentPage === 1"
            (click)="goToPage(currentPage - 1)"
          >
            Previous
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            [disabled]="currentPage >= totalPages"
            (click)="goToPage(currentPage + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .table-loading-overlay {
      position: absolute;
      inset: 0;
      background-color: rgba(20, 28, 24, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .table-container {
      position: relative;
    }
    .actions-header,
    .actions-cell {
      text-align: right;
      width: 140px;
    }
    .empty-cell {
      text-align: center;
      padding: var(--space-8) var(--space-4);
      color: var(--color-text-muted);
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
    }
    .empty-icon {
      font-size: var(--text-xl);
      opacity: 0.6;
    }
    .table-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-bg-elevated);
      border-top: 1px solid var(--color-border-subtle);
    }
    .pagination-info {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      letter-spacing: 0.02em;
    }
    .pagination-controls {
      display: flex;
      gap: var(--space-2);
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: var(--text-xs);
    }
  `]
})
export class AppTableComponent implements OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No records found';
  @Input() pageSize = 10;
  @Input() hasActions = false;

  @ContentChild('actionTemplate') actionTemplate?: TemplateRef<any>;

  @Output() rowClick = new EventEmitter<any>();

  currentPage = 1;
  pagedData: any[] = [];
  totalPages = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['pageSize']) {
      this.totalPages = Math.max(1, Math.ceil((this.data?.length || 0) / this.pageSize));
      if (this.currentPage > this.totalPages) {
        this.currentPage = 1;
      }
      this.updatePagedData();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedData();
    }
  }

  private updatePagedData(): void {
    if (!this.data || this.data.length === 0) {
      this.pagedData = [];
      return;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedData = this.data.slice(start, start + this.pageSize);
  }

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  getBadgeVariant(status: string | null | undefined): 'active' | 'closed' | 'pending' | 'role' {
    if (!status) return 'role';
    const s = String(status).toUpperCase();
    if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'APPROVED') return 'active';
    if (s === 'CLOSED' || s === 'CANCELLED' || s === 'REJECTED') return 'closed';
    if (s === 'PENDING' || s === 'MATURED') return 'pending';
    return 'role';
  }
}
