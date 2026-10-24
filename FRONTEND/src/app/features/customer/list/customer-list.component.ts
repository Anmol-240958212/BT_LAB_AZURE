import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CustomerApiService } from '../../../core/api/customer-api.service';
import { CustomerProfileResponse } from '../../../core/models/auth.models';
import { TableColumn } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-customer-list',
  standalone: false,
  template: `
    <div class="customer-list-page animate-fade-in">
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">CUSTOMER KYC REPOSITORY</span>
            <h1 class="card-title mt-1">Customer Accounts & KYC Records</h1>
            <p class="card-subtitle">Officer view of all verified and pending KYC banking participants.</p>
          </div>
          <app-badge variant="role" text="Bank Officer / Admin View"></app-badge>
        </div>

        <div class="search-bar-row mt-4">
          <input
            type="text"
            class="form-input search-input"
            placeholder="Search by customer name or identifier..."
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
          />
          <app-button variant="secondary" (clicked)="loadCustomers()">
            Refresh List
          </app-button>
        </div>
      </div>

      <app-card
        title="Registered Banking Customers"
        [subtitle]="filteredCustomers.length + ' customer records on file'"
      >
        <app-table
          [columns]="columns"
          [data]="filteredCustomers"
          [loading]="loading"
          [pageSize]="10"
          [hasActions]="true"
          (rowClick)="onViewCustomer($event)"
          emptyMessage="No customer records found matching filter criteria."
        >
          <ng-template #actionTemplate let-customer>
            <app-button variant="ghost" (clicked)="onViewCustomer(customer)">
              View KYC →
            </app-button>
          </ng-template>
        </app-table>
      </app-card>

      <!-- Customer Detail Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Customer KYC Record"
        [subtitle]="selectedCustomer ? 'Customer ID: CUST-' + selectedCustomer.customerId : ''"
        (closeModal)="isModalOpen = false"
      >
        <div *ngIf="selectedCustomer" class="customer-modal-details">
          <div class="grid-2 mb-4">
            <div class="detail-item">
              <span class="detail-label">Full Name</span>
              <span class="detail-val">{{ selectedCustomer.fullName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <app-badge [variant]="selectedCustomer.status === 'ACTIVE' ? 'active' : 'pending'" [text]="selectedCustomer.status"></app-badge>
            </div>
            <div class="detail-item">
              <span class="detail-label">Classification</span>
              <span class="detail-val">{{ selectedCustomer.classificationValue || 'Not classified' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Gender</span>
              <span class="detail-val">{{ selectedCustomer.gender || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Identification</span>
              <span class="detail-val">{{ selectedCustomer.identificationType || '—' }} · {{ selectedCustomer.maskedIdentificationNumber || 'Not provided' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email</span>
              <span class="detail-val">{{ selectedCustomer.maskedEmail || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Mobile</span>
              <span class="detail-val">{{ selectedCustomer.maskedMobileNumber || '—' }}</span>
            </div>
            <div class="detail-item full-width" *ngIf="selectedCustomer.addressLine1 || selectedCustomer.city || selectedCustomer.state">
              <span class="detail-label">Registered Address</span>
              <span class="detail-val">
                {{ selectedCustomer.addressLine1 || '' }}{{ selectedCustomer.city ? ', ' + selectedCustomer.city : '' }}{{ selectedCustomer.state ? ', ' + selectedCustomer.state : '' }}{{ selectedCustomer.postalCode ? ' - ' + selectedCustomer.postalCode : '' }}
              </span>
            </div>
          </div>

          <div class="notice-box mb-4">
            <app-icon name="shield" [size]="16"></app-icon>
            <span>Identification and contact details are masked. Operational KYC details are available to authorized staff.</span>
          </div>
        </div>

        <div modal-footer>
          <app-button variant="secondary" (clicked)="isModalOpen = false">Close</app-button>
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
    .search-bar-row {
      display: flex;
      gap: var(--space-3);
    }
    .search-input {
      max-width: 400px;
    }
    .customer-modal-details {
      display: flex;
      flex-direction: column;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-item.full-width {
      grid-column: 1 / -1;
    }
    .detail-label {
      font-size: 10px;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .detail-val {
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--color-text-primary);
    }
  `]
})
export class CustomerListComponent implements OnInit {
  searchQuery = '';
  loading = false;
  isModalOpen = false;
  selectedCustomer: CustomerProfileResponse | null = null;

  allCustomers: CustomerProfileResponse[] = [];

  filteredCustomers: CustomerProfileResponse[] = [];

  readonly columns: TableColumn[] = [
    { field: 'customerId', header: 'Customer ID', width: '140px' },
    { field: 'fullName', header: 'Customer Full Name' },
    { field: 'status', header: 'KYC Status', type: 'badge', align: 'center' },
    { field: 'classificationValue', header: 'Classification' },
    { field: 'maskedEmail', header: 'Email' },
    { field: 'maskedMobileNumber', header: 'Mobile' }
  ];

  constructor(
    private readonly customerApi: CustomerApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerApi.getAllCustomers().pipe(
      // Do not leave the table overlay open when the auth service/API is slow.
      timeout(10000),
      catchError(() => of([] as CustomerProfileResponse[]))
    ).subscribe({
      next: (data) => {
        this.allCustomers = Array.isArray(data) ? data : [];
        this.onSearch();
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.allCustomers = [];
        this.onSearch();
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredCustomers = [...this.allCustomers];
      return;
    }
    this.filteredCustomers = this.allCustomers.filter(c =>
      (c.fullName || '').toLowerCase().includes(q) ||
      String(c.customerId).includes(q)
    );
  }

  onViewCustomer(customer: CustomerProfileResponse): void {
    this.selectedCustomer = customer;
    this.isModalOpen = true;
  }
}
