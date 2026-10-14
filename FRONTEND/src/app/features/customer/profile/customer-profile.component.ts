import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerApiService } from '../../../core/api/customer-api.service';
import { OpenAccountResponse } from '../../../core/models/auth.models';
import { ToastService } from '../../../shared/services/toast.service';
import { TableColumn } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-customer-profile',
  standalone: false,
  template: `
    <div class="customer-profile-page animate-fade-in">
      <!-- KYC Status Banner -->
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">COMPLIANCE & KYC VERIFICATION</span>
            <h1 class="card-title mt-1">Customer KYC Profile & Bank Accounts</h1>
            <p class="card-subtitle">Manage regulatory verification documents and active deposit accounts.</p>
          </div>
          <div class="flex-col" style="align-items: flex-end;">
            <span class="status-label">KYC Verification Status</span>
            <app-badge [variant]="customerStatus === 'ACTIVE' ? 'active' : 'pending'" [text]="customerStatus"></app-badge>
          </div>
        </div>
      </div>

      <div class="grid-2 mb-6">
        <!-- KYC Profile Submission / Update Form -->
        <app-card
          title="Personal & Identification Data"
          subtitle="Mandated KYC fields per RBI / Banking Tech standards"
        >
          <form [formGroup]="kycForm" (ngSubmit)="submitKyc()" class="kyc-form">
            <div class="grid-2">
              <app-input
                id="kyc-first-name"
                label="First Name"
                formControlName="firstName"
                [required]="true"
              ></app-input>
              <app-input
                id="kyc-last-name"
                label="Last Name"
                formControlName="lastName"
                [required]="true"
              ></app-input>
            </div>

            <div class="grid-2">
              <app-input
                id="kyc-dob"
                label="Date of Birth"
                type="date"
                formControlName="dateOfBirth"
                [required]="true"
              ></app-input>
              <div class="form-group">
                <label class="form-label" for="kyc-gender">Gender *</label>
                <select id="kyc-gender" class="form-select" formControlName="gender">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="kyc-id-type">Identification Type *</label>
                <select id="kyc-id-type" class="form-select" formControlName="identificationType">
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </div>
              <app-input
                id="kyc-id-number"
                label="Identification Number"
                placeholder="e.g. 5432-9876-1234"
                formControlName="identificationNumber"
                [required]="true"
                hint="Masked in list views per L3"
              ></app-input>
            </div>

            <app-input
              id="kyc-address-1"
              label="Address Line 1"
              placeholder="House/Flat number, Street name"
              formControlName="addressLine1"
              [required]="true"
            ></app-input>

            <div class="grid-3">
              <app-input id="kyc-city" label="City" formControlName="city" [required]="true"></app-input>
              <app-input id="kyc-state" label="State" formControlName="state" [required]="true"></app-input>
              <app-input id="kyc-postal" label="Postal Code" formControlName="postalCode" [required]="true"></app-input>
            </div>

            <div class="grid-2">
              <app-input id="kyc-phone" label="Mobile Phone" formControlName="mobileNumber"></app-input>
              <app-input id="kyc-email" label="Contact Email" formControlName="email"></app-input>
            </div>

            <div class="mt-4">
              <app-button
                type="submit"
                variant="primary"
                [loading]="savingKyc"
                [disabled]="kycForm.invalid || savingKyc"
                [block]="true"
              >
                {{ savingKyc ? 'Updating Profile...' : 'Save & Submit KYC Profile' }}
              </app-button>
            </div>
          </form>
        </app-card>

        <!-- Bank Accounts Card & Open Account Form -->
        <div class="flex-col">
          <!-- Open Account Form Card -->
          <app-card
            title="Open New Bank Account"
            subtitle="Link savings or current account for FD settlements"
            class="mb-6"
          >
            <form [formGroup]="accountForm" (ngSubmit)="openAccount()" class="open-account-form">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label" for="acc-product-id">Product Type *</label>
                  <select id="acc-product-id" class="form-select" formControlName="productId">
                    <option [value]="101">101 — Prime Savings Account</option>
                    <option [value]="102">102 — Corporate Current Account</option>
                    <option [value]="103">103 — Senior Privilege Account</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="acc-branch-id">Home Branch *</label>
                  <select id="acc-branch-id" class="form-select" formControlName="branchId">
                    <option [value]="501">501 — Financial District Corporate Branch</option>
                    <option [value]="502">502 — Downtown Premier Branch</option>
                    <option [value]="503">503 — Commercial Plaza Hub</option>
                  </select>
                </div>
              </div>

              <app-button
                type="submit"
                variant="secondary"
                [loading]="openingAccount"
                [disabled]="accountForm.invalid || openingAccount"
                [block]="true"
              >
                {{ openingAccount ? 'Generating Account...' : 'Open Linked Account' }}
              </app-button>
            </form>
          </app-card>

          <!-- List of Linked Bank Accounts -->
          <app-card
            title="Existing Linked Accounts"
            subtitle="Accounts registered under your customer profile"
          >
            <app-table
              [columns]="accountColumns"
              [data]="accounts"
              [loading]="loadingAccounts"
              [pageSize]="5"
              emptyMessage="No linked bank accounts found."
            ></app-table>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-tag {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }
    .status-label {
      font-size: 10px;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kyc-form,
    .open-account-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
  `]
})
export class CustomerProfileComponent implements OnInit {
  customerStatus = 'ACTIVE';
  kycForm!: FormGroup;
  accountForm!: FormGroup;

  savingKyc = false;
  openingAccount = false;
  loadingAccounts = false;

  readonly accountColumns: TableColumn[] = [
    { field: 'accountNumber', header: 'Account No.', type: 'mask-account' },
    { field: 'productId', header: 'Product Code' },
    { field: 'branchId', header: 'Branch Code' },
    { field: 'openedOn', header: 'Date Opened', type: 'date' },
    { field: 'status', header: 'Status', type: 'badge' }
  ];

  accounts: OpenAccountResponse[] = [
    {
      accountId: 1,
      accountNumber: '100084920194',
      status: 'ACTIVE',
      productId: 101,
      branchId: 501,
      openedOn: '2026-01-15',
      message: 'Account active'
    }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly customerApi: CustomerApiService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.kycForm = this.fb.group({
      firstName: ['Aarav', Validators.required],
      lastName: ['Sharma', Validators.required],
      dateOfBirth: ['1998-05-14', Validators.required],
      gender: ['MALE', Validators.required],
      identificationType: ['AADHAAR', Validators.required],
      identificationNumber: ['542187654321', Validators.required],
      addressLine1: ['42 Financial Boulevard, BKC', Validators.required],
      city: ['Mumbai', Validators.required],
      state: ['Maharashtra', Validators.required],
      country: ['India'],
      postalCode: ['400051', Validators.required],
      mobileNumber: ['+91 9876543210'],
      email: ['aarav.sharma@vaultone.com']
    });

    this.accountForm = this.fb.group({
      productId: [101, Validators.required],
      branchId: [501, Validators.required]
    });

    this.loadProfile();
    this.loadAccounts();
  }

  loadProfile(): void {
    this.customerApi.getCustomerStatus().subscribe({
      next: (res) => {
        if (res?.status) this.customerStatus = res.status;
      },
      error: () => {}
    });

    this.customerApi.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.customerStatus = profile.status || this.customerStatus;
        }
      },
      error: () => {}
    });
  }

  loadAccounts(): void {
    this.loadingAccounts = true;
    this.customerApi.getAccounts().subscribe({
      next: (data) => {
        this.loadingAccounts = false;
        if (data && data.length > 0) {
          this.accounts = data;
        }
      },
      error: () => {
        this.loadingAccounts = false;
      }
    });
  }

  submitKyc(): void {
    if (this.kycForm.invalid || this.savingKyc) return;

    this.savingKyc = true;
    this.customerApi.submitProfile(this.kycForm.value).subscribe({
      next: (res) => {
        this.savingKyc = false;
        this.customerStatus = res.status || 'ACTIVE';
        this.toastService.success(res.message || 'KYC Profile successfully updated.', 'Profile Saved');
      },
      error: (err) => {
        this.savingKyc = false;
        this.toastService.error(err.message || 'Failed to submit KYC profile', 'Submission Error');
      }
    });
  }

  openAccount(): void {
    if (this.accountForm.invalid || this.openingAccount) return;

    this.openingAccount = true;
    const { productId, branchId } = this.accountForm.value;

    this.customerApi.openAccount({ productId: Number(productId), branchId: Number(branchId) }).subscribe({
      next: (res) => {
        this.openingAccount = false;
        this.toastService.success(`Account ${res.accountNumber} opened successfully!`, 'Account Created');
        this.accounts = [res, ...this.accounts];
      },
      error: (err) => {
        this.openingAccount = false;
        this.toastService.error(err.message || 'Account creation request failed', 'Error');
      }
    });
  }
}
