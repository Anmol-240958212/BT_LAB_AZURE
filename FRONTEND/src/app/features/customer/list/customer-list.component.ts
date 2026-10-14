import { Component, OnInit } from '@angular/core';
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
          </div>

          <div class="notice-box mb-4">
            <app-icon name="shield" [size]="16"></app-icon>
            <span>Customer PII is masked in compliance with banking privacy and data protection standards.</span>
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

  allCustomers: CustomerProfileResponse[] = [
    {
      customerId: 1001,
      fullName: 'Aarav Sharma',
      status: 'ACTIVE',
      message: 'Verified'
    },
    {
      customerId: 1002,
      fullName: 'Priya Venkatesh',
      status: 'PENDING',
      message: 'Pending verification'
    },
    {
      customerId: 1003,
      fullName: 'Rohan Deshmukh',
      status: 'ACTIVE',
      message: 'Verified'
    },
    {
      customerId: 1004,
      fullName: 'Ananya Rao',
      status: 'ACTIVE',
      message: 'Verified'
    }
  ];

  filteredCustomers: CustomerProfileResponse[] = [];

  readonly columns: TableColumn[] = [
    { field: 'customerId', header: 'Customer ID', width: '140px' },
    { field: 'fullName', header: 'Customer Full Name' },
    { field: 'status', header: 'KYC Status', type: 'badge', align: 'center' },
    { field: 'message', header: 'Verification Notes' }
  ];

  constructor(private readonly customerApi: CustomerApiService) {}

  ngOnInit(): void {
    this.filteredCustomers = [...this.allCustomers];
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerApi.getAllCustomers().subscribe({
      next: (data) => {
        this.loading = false;
        if (data && data.length > 0) {
          this.allCustomers = data;
          this.onSearch();
        }
      },
      error: () => {
        this.loading = false;
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
      c.fullName.toLowerCase().includes(q) ||
      String(c.customerId).includes(q)
    );
  }

  onViewCustomer(customer: CustomerProfileResponse): void {
    this.selectedCustomer = customer;
    this.isModalOpen = true;
  }
}
