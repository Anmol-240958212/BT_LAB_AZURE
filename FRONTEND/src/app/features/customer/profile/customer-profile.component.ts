import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CustomerApiService } from '../../../core/api/customer-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { AuthService } from '../../../core/auth.service';
import { OpenAccountResponse, UserProfileResponse } from '../../../core/models/auth.models';
import { ToastService } from '../../../shared/services/toast.service';
import { TableColumn } from '../../../shared/components/table/table.component';
import {
  INDIAN_STATES,
  StateInfo,
  ID_RULES,
  IdentificationType,
  IdTypeRule,
  formatIndianMobile,
  isValidIndianMobile,
  isValidIndianPin
} from '../../../core/indian-format.utils';

function idValidator(component: CustomerProfileComponent) {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val || !val.toString().trim()) {
      return { required: true };
    }
    const rule = component.currentIdRule;
    if (rule && !rule.isValid(val)) {
      return { invalidId: true, message: rule.errorMessage };
    }
    return null;
  };
}

function pinValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val || !val.toString().trim()) {
    return { required: true };
  }
  return isValidIndianPin(val) ? null : { invalidPin: true };
}

function mobileValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val || !val.toString().trim()) return null;
  return isValidIndianMobile(val) ? null : { invalidMobile: true };
}

@Component({
  selector: 'app-customer-profile',
  standalone: false,
  template: `
    <div class="customer-profile-page animate-fade-in">

      <!-- 1. Primary User Identity & Basic Information Header Card -->
      <div class="card user-profile-header-card mb-6">
        <div class="user-header-content">
          <!-- Avatar + Display Name + Identifier Badges -->
          <div class="user-main-info">
            <div class="user-avatar-circle">
              <span>{{ userInitials }}</span>
            </div>
            <div class="user-titles">
              <div class="user-name-row">
                <h1 class="user-full-name">
                  {{ userDisplayName }}
                </h1>
                <app-badge
                  [variant]="currentUser?.role === 'ADMIN' ? 'closed' : 'active'"
                  [text]="currentUser?.role || 'CUSTOMER'"
                ></app-badge>
              </div>
              <div class="user-meta-chips">
                <span class="user-id-chip" title="Unique System Identifier assigned to customer">
                  <app-icon name="shield" [size]="12"></app-icon>
                  <strong>ID:</strong> {{ customerIdentifier }}
                </span>
                <span class="meta-separator">•</span>
                <span class="user-handle" title="Account Username">
                  <app-icon name="user" [size]="12"></app-icon>
                  &#64;{{ currentUser?.username || 'user' }}
                </span>
                <span class="meta-separator">•</span>
                <span class="user-status-pill" [class.status-active]="isKycActive">
                  <span class="status-dot"></span>
                  {{ isKycActive ? 'KYC Verified (Active)' : 'KYC Incomplete' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Header Actions: Kafka FD Sync -->
          <div class="user-header-actions">
            <app-button
              *ngIf="isKycActive"
              variant="secondary"
              size="sm"
              [disabled]="syncingKafka"
              (clicked)="syncKafka()"
              title="Sync profile data"
            >
              <app-icon name="refresh-cw" [size]="12"></app-icon>
              <span>{{ syncingKafka ? 'Syncing...' : 'Sync' }}</span>
            </app-button>
          </div>
        </div>

        <!-- Contact & Account Metadata Strip -->
        <div class="user-contact-strip">
          <div class="contact-item">
            <span class="contact-label">EMAIL ADDRESS</span>
            <span class="contact-value" [title]="currentUser?.email || 'Not provided'">
              <app-icon name="mail" [size]="13"></app-icon>
              {{ currentUser?.email || '—' }}
            </span>
          </div>

          <div class="contact-item">
            <span class="contact-label">PHONE NUMBER</span>
            <span class="contact-value">
              <app-icon name="phone" [size]="13"></app-icon>
              {{ currentUser?.phoneNumber || kycForm.get('mobileNumber')?.value || '—' }}
            </span>
          </div>

          <div class="contact-item">
            <span class="contact-label">REGULATORY COMPLIANCE</span>
            <span class="contact-value">
              <app-icon name="shield-check" [size]="13" [color]="isKycActive ? '#10b981' : '#f59e0b'"></app-icon>
              {{ isKycActive ? 'RBI Compliant' : 'Verification Required' }}
            </span>
          </div>

          <div class="contact-item">
            <span class="contact-label">LINKED BANK ACCOUNTS</span>
            <span class="contact-value">
              <app-icon name="vault" [size]="13"></app-icon>
              {{ accounts.length }} Active Account{{ accounts.length === 1 ? '' : 's' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Main Grid: Left Column (KYC Info / Update) & Right Column (Open Account + Existing Accounts) -->
      <div class="grid-2 mb-6">
        
        <!-- LEFT COLUMN: KYC Section (Portrayed based on KYC Status) -->
        <div>

          <!-- STATE A: KYC is ACTIVE and Not Currently in Edit Mode -> Clean Verified Details Display -->
          <app-card
            *ngIf="isKycActive && !isEditingKyc"
            title="Personal & Identification Data"
            subtitle="Mandated KYC records on file per RBI / Banking Tech standards"
          >
            <div class="kyc-display-wrapper">
              <div class="kyc-display-grid">
                <div class="kyc-field-item">
                  <span class="field-label">LEGAL FIRST NAME</span>
                  <span class="field-val">{{ kycForm.get('firstName')?.value || currentUser?.firstName || '—' }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">LEGAL LAST NAME</span>
                  <span class="field-val">{{ kycForm.get('lastName')?.value || currentUser?.lastName || '—' }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">DATE OF BIRTH</span>
                  <span class="field-val">{{ (kycForm.get('dateOfBirth')?.value || currentUser?.dateOfBirth) | date:'mediumDate' }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">GENDER</span>
                  <span class="field-val">{{ (kycForm.get('gender')?.value || currentUser?.gender) | titlecase }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">IDENTIFICATION TYPE</span>
                  <span class="field-val">{{ (kycForm.get('identificationType')?.value || currentUser?.identificationType || 'AADHAAR') | titlecase }} Card</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">IDENTIFICATION NUMBER</span>
                  <span class="field-val id-number-val">
                    <app-icon name="shield-check" [size]="14" color="#10b981"></app-icon>
                    {{ (kycForm.get('identificationNumber')?.value || currentUser?.identificationNumber) | mask:'id' }}
                  </span>
                </div>

                <div class="kyc-field-item full-width">
                  <span class="field-label">REGISTERED ADDRESS</span>
                  <span class="field-val">{{ kycForm.get('addressLine1')?.value || currentUser?.addressLine1 || '—' }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">STATE & CITY</span>
                  <span class="field-val">{{ (kycForm.get('city')?.value || currentUser?.city) }}, {{ (kycForm.get('state')?.value || currentUser?.state) }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">POSTAL CODE</span>
                  <span class="field-val">{{ kycForm.get('postalCode')?.value || currentUser?.postalCode || '—' }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">VERIFIED MOBILE</span>
                  <span class="field-val">{{ kycForm.get('mobileNumber')?.value || currentUser?.phoneNumber || '—' }}</span>
                </div>

                <div class="kyc-field-item">
                  <span class="field-label">VERIFIED EMAIL</span>
                  <span class="field-val">{{ kycForm.get('email')?.value || currentUser?.email || '—' }}</span>
                </div>
              </div>

              <!-- Compliance Notice & Update KYC Action -->
              <div class="kyc-compliance-box mt-4">
                <div class="compliance-icon-wrap">
                  <app-icon name="shield-check" [size]="18" color="#10b981"></app-icon>
                </div>
                <div class="compliance-text">
                  <div class="compliance-title">Identity Records Verified & Active</div>
                  <p class="compliance-desc">
                    Your KYC documentation is actively linked to core accounts. Need to update residential address or contact details?
                  </p>
                </div>
                <app-button
                  variant="secondary"
                  size="sm"
                  (clicked)="startEditingKyc()"
                  id="btn-update-kyc"
                >
                  <app-icon name="edit" [size]="13"></app-icon>
                  <span>Update KYC</span>
                </app-button>
              </div>
            </div>
          </app-card>

          <!-- STATE B: KYC is INCOMPLETE -> Prompt with Option to Do KYC -->
          <app-card
            *ngIf="!isKycActive && !isEditingKyc"
            title="Compliance & Identity Verification"
            subtitle="RBI-mandated regulatory compliance"
          >
            <div class="kyc-prompt-box">
              <div class="prompt-icon-badge">
                <app-icon name="shield" [size]="28" color="#f59e0b"></app-icon>
              </div>
              <h3 class="prompt-title">KYC Verification Incomplete</h3>
              <p class="prompt-desc">
                Your basic user credentials are registered, but mandatory identity documents have not yet been submitted. 
                Complete your KYC verification to activate full deposit limits and unlock term deposit operations.
              </p>
              <app-button
                variant="primary"
                size="md"
                (clicked)="startEditingKyc()"
                id="btn-do-kyc"
              >
                <app-icon name="shield-check" [size]="15"></app-icon>
                <span>Complete KYC Verification</span>
              </app-button>
            </div>
          </app-card>

          <!-- STATE C: Edit / Submit Form (Triggered via "Update KYC" or "Complete KYC") -->
          <app-card
            *ngIf="isEditingKyc"
            [title]="isKycActive ? 'Update KYC Information' : 'Complete Regulatory KYC'"
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
                  <select
                    id="kyc-id-type"
                    class="form-select"
                    formControlName="identificationType"
                    (change)="onIdTypeChange()"
                  >
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="VOTER_ID">Voter ID</option>
                  </select>
                </div>
                <app-input
                  id="kyc-id-number"
                  label="Identification Number"
                  [placeholder]="currentIdRule.placeholder"
                  [hint]="currentIdRule.hint"
                  formControlName="identificationNumber"
                  [required]="true"
                  [error]="idNumberError"
                  (input)="onIdNumberInput($event)"
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
                <div class="form-group">
                  <label class="form-label" for="kyc-state">State *</label>
                  <select
                    id="kyc-state"
                    class="form-select"
                    formControlName="state"
                    (change)="onStateChange()"
                  >
                    <option value="" disabled>Select State</option>
                    <option *ngFor="let s of stateList" [value]="s.state">{{ s.state }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="kyc-city">City *</label>
                  <select
                    id="kyc-city"
                    class="form-select"
                    formControlName="city"
                    (change)="onCityChange()"
                  >
                    <option value="" disabled>Select City</option>
                    <option *ngFor="let c of availableCities" [value]="c.name">{{ c.name }}</option>
                  </select>
                </div>
                <app-input
                  id="kyc-postal"
                  label="Postal Code"
                  placeholder="e.g. 576104"
                  formControlName="postalCode"
                  [required]="true"
                  [error]="postalCodeError"
                  (input)="onPostalInput($event)"
                ></app-input>
              </div>

              <div class="grid-2">
                <app-input
                  id="kyc-phone"
                  label="Mobile Phone"
                  placeholder="+91 79829 23284"
                  formControlName="mobileNumber"
                  [error]="mobileNumberError"
                  (input)="onMobileInput($event)"
                ></app-input>
                <app-input
                  id="kyc-email"
                  label="Contact Email"
                  formControlName="email"
                ></app-input>
              </div>

              <div class="form-actions mt-4">
                <app-button
                  *ngIf="isKycActive"
                  type="button"
                  variant="ghost"
                  (clicked)="cancelEditingKyc()"
                >
                  Cancel
                </app-button>
                <app-button
                  type="submit"
                  variant="primary"
                  [loading]="savingKyc"
                  [disabled]="kycForm.invalid || savingKyc"
                  [block]="!isKycActive"
                  (clicked)="submitKyc()"
                >
                  {{ savingKyc ? 'Updating Profile...' : (isKycActive ? 'Save & Update KYC Profile' : 'Save & Submit KYC Profile') }}
                </app-button>
              </div>
            </form>
          </app-card>

        </div>

        <!-- RIGHT COLUMN: Bank Accounts & Linked Accounts (As requested: kept exactly per Screenshot 2) -->
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
    /* 1. User Profile Header Card */
    .user-profile-header-card {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-card);
      padding: var(--space-5) var(--space-6);
      box-shadow: var(--shadow-card);
    }

    .user-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .user-main-info {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .user-avatar-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-accent), #1f4e3c);
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 2px solid var(--color-border-default);
      flex-shrink: 0;
    }

    .user-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-full-name {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
      line-height: 1.2;
    }

    .user-meta-chips {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      flex-wrap: wrap;
    }

    .user-id-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border-subtle);
      padding: 2px 8px;
      border-radius: var(--radius-button);
      font-family: monospace;
      color: var(--color-text-primary);
      font-weight: 600;
      font-size: 11px;
    }

    .user-handle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-muted);
    }

    .user-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(234, 179, 8, 0.12);
      color: #eab308;
      border: 1px solid rgba(234, 179, 8, 0.25);
    }

    .user-status-pill.status-active {
      background: rgba(34, 197, 94, 0.12);
      color: #22c55e;
      border-color: rgba(34, 197, 94, 0.25);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .meta-separator {
      color: var(--color-border-default);
    }

    .user-contact-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
      padding-top: var(--space-4);
    }

    .contact-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .contact-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }

    .contact-value {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* 2. KYC Verified Detail Display */
    .kyc-display-wrapper {
      display: flex;
      flex-direction: column;
    }

    .kyc-display-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }

    .kyc-field-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: var(--color-bg-base);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-input);
      padding: 9px 12px;
    }

    .kyc-field-item.full-width {
      grid-column: span 2;
    }

    .field-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }

    .field-val {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .id-number-val {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: monospace;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .kyc-compliance-box {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.22);
      border-radius: var(--radius-card);
      padding: var(--space-3) var(--space-4);
    }

    .compliance-icon-wrap {
      flex-shrink: 0;
    }

    .compliance-text {
      flex: 1;
    }

    .compliance-title {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .compliance-desc {
      font-size: 11px;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.3;
    }

    /* 3. KYC Incomplete Prompt */
    .kyc-prompt-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-8) var(--space-4);
      background: var(--color-bg-base);
      border: 1px dashed var(--color-border-focus);
      border-radius: var(--radius-card);
      gap: var(--space-3);
    }

    .prompt-icon-badge {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(234, 179, 8, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .prompt-title {
      font-size: var(--text-md);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .prompt-desc {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      max-width: 420px;
      line-height: 1.4;
      margin: 0;
    }

    /* Forms */
    .kyc-form,
    .open-account-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
    }

    @media (max-width: 768px) {
      .user-contact-strip {
        grid-template-columns: repeat(2, 1fr);
      }
      .kyc-display-grid {
        grid-template-columns: 1fr;
      }
      .kyc-field-item.full-width {
        grid-column: span 1;
      }
      .user-header-content {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class CustomerProfileComponent implements OnInit {
  customerStatus = 'KYC_PENDING';
  currentUser: UserProfileResponse | null = null;
  isEditingKyc = false;

  kycForm!: FormGroup;
  accountForm!: FormGroup;

  savingKyc = false;
  openingAccount = false;
  loadingAccounts = false;
  syncingKafka = false;

  readonly stateList: StateInfo[] = INDIAN_STATES;
  availableCities: { name: string; pin: string }[] = [];

  readonly accountColumns: TableColumn[] = [
    { field: 'accountNumber', header: 'Account No.', type: 'mask-account' },
    { field: 'productId', header: 'Product Code' },
    { field: 'branchId', header: 'Branch Code' },
    { field: 'openedOn', header: 'Date Opened', type: 'date' },
    { field: 'status', header: 'Status', type: 'badge' }
  ];

  accounts: OpenAccountResponse[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly customerApi: CustomerApiService,
    private readonly userApi: UserApiService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get isKycActive(): boolean {
    if (this.customerStatus === 'ACTIVE') return true;
    if (this.currentUser?.customerStatus === 'ACTIVE') return true;
    return !!(this.currentUser?.identificationNumber && this.currentUser?.firstName);
  }

  get customerIdentifier(): string {
    if (this.currentUser?.customerId) {
      return `#CUST-${this.currentUser.customerId.toString().padStart(6, '0')}`;
    }
    if (this.accounts && this.accounts.length > 0 && this.accounts[0].accountNumber) {
      const acc = this.accounts[0].accountNumber;
      return `#CUST-${acc.slice(-4)}`;
    }
    return `#CUST-${(this.currentUser?.username || '240958').toUpperCase()}`;
  }

  get userDisplayName(): string {
    if (this.currentUser?.firstName) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName || ''}`.trim();
    }
    const formFirst = this.kycForm?.get('firstName')?.value;
    if (formFirst) {
      const formLast = this.kycForm?.get('lastName')?.value || '';
      return `${formFirst} ${formLast}`.trim();
    }
    return this.currentUser?.username || 'Customer';
  }

  get userInitials(): string {
    if (this.currentUser?.firstName) {
      const first = this.currentUser.firstName[0];
      const last = this.currentUser.lastName ? this.currentUser.lastName[0] : '';
      return (first + last).toUpperCase();
    }
    const name = this.userDisplayName;
    return name.substring(0, 2).toUpperCase();
  }

  get currentIdRule(): IdTypeRule {
    const type = (this.kycForm?.get('identificationType')?.value as IdentificationType) || 'AADHAAR';
    return ID_RULES[type] || ID_RULES['AADHAAR'];
  }

  get idNumberError(): string | null {
    const ctrl = this.kycForm?.get('identificationNumber');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Identification Number is required';
      if (ctrl.errors['invalidId']) return this.currentIdRule.errorMessage;
    }
    return null;
  }

  get postalCodeError(): string | null {
    const ctrl = this.kycForm?.get('postalCode');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Postal Code is required';
      if (ctrl.errors['invalidPin']) return 'Must be a valid 6-digit Indian PIN code (e.g. 576104)';
    }
    return null;
  }

  get mobileNumberError(): string | null {
    const ctrl = this.kycForm?.get('mobileNumber');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['invalidMobile']) {
        return 'Please enter a valid 10-digit Indian mobile number (e.g. +91 79829 23284)';
      }
    }
    return null;
  }

  ngOnInit(): void {
    const currentUsername = this.authService.getUsername() || '';
    const initialEmail = currentUsername.includes('@') ? currentUsername : '';

    // Initialize Karnataka as default state
    const defaultState = this.stateList[0];
    this.availableCities = [...defaultState.cities];
    const defaultCity = defaultState.cities[0];

    this.kycForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['MALE', Validators.required],
      identificationType: ['AADHAAR', Validators.required],
      identificationNumber: ['', [idValidator(this)]],
      addressLine1: ['', Validators.required],
      state: [defaultState.state, Validators.required],
      city: [defaultCity.name, Validators.required],
      country: ['India'],
      postalCode: [defaultCity.pin, [pinValidator]],
      mobileNumber: ['', [mobileValidator]],
      email: [initialEmail]
    });

    this.accountForm = this.fb.group({
      productId: [101, Validators.required],
      branchId: [501, Validators.required]
    });

    this.loadProfile();
    this.loadAccounts();
  }

  startEditingKyc(): void {
    this.isEditingKyc = true;
    this.cdr.detectChanges();
  }

  cancelEditingKyc(): void {
    this.isEditingKyc = false;
    if (this.currentUser) {
      this.patchFormWithUser(this.currentUser);
    }
    this.cdr.detectChanges();
  }

  onIdTypeChange(): void {
    const rule = this.currentIdRule;
    const ctrl = this.kycForm.get('identificationNumber');
    if (ctrl && ctrl.value) {
      const formatted = rule.format(ctrl.value);
      ctrl.setValue(formatted);
    }
    ctrl?.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  onIdNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const rule = this.currentIdRule;
    const formatted = rule.format(input.value);
    input.value = formatted;
    this.kycForm.get('identificationNumber')?.setValue(formatted);
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const formatted = formatIndianMobile(input.value);
    input.value = formatted;
    this.kycForm.get('mobileNumber')?.setValue(formatted);
  }

  onPostalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const digits = input.value.replace(/\D/g, '').substring(0, 6);
    input.value = digits;
    this.kycForm.get('postalCode')?.setValue(digits);
  }

  onStateChange(): void {
    const selectedStateName = this.kycForm.get('state')?.value;
    const stateObj = this.stateList.find(s => s.state.toLowerCase() === (selectedStateName || '').toLowerCase());
    if (stateObj) {
      this.availableCities = stateObj.cities;
      const defaultCity = stateObj.cities[0];
      this.kycForm.patchValue({
        state: stateObj.state,
        city: defaultCity ? defaultCity.name : '',
        postalCode: defaultCity ? defaultCity.pin : stateObj.defaultPin
      });
    }
    this.kycForm.get('city')?.updateValueAndValidity();
    this.kycForm.get('postalCode')?.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  onCityChange(): void {
    const selectedCityName = this.kycForm.get('city')?.value;
    const cityObj = this.availableCities.find(c => c.name.toLowerCase() === (selectedCityName || '').toLowerCase());
    if (cityObj) {
      this.kycForm.patchValue({
        city: cityObj.name,
        postalCode: cityObj.pin
      });
    }
    this.kycForm.get('postalCode')?.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  loadProfile(): void {
    this.customerApi.getCustomerStatus().subscribe({
      next: (res) => {
        if (res?.status) {
          this.customerStatus = res.status;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });

    this.userApi.getMe().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          if (user.customerStatus) {
            this.customerStatus = user.customerStatus;
          }
          this.patchFormWithUser(user);
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  private patchFormWithUser(user: UserProfileResponse): void {
    const updates: Record<string, any> = {};
    if (user.firstName) updates['firstName'] = user.firstName;
    if (user.lastName) updates['lastName'] = user.lastName;
    if (user.dateOfBirth) updates['dateOfBirth'] = user.dateOfBirth;
    if (user.gender) updates['gender'] = user.gender;

    // Identification
    const idType = (user.identificationType as IdentificationType) || 'AADHAAR';
    updates['identificationType'] = idType;
    if (user.identificationNumber) {
      const rule = ID_RULES[idType] || ID_RULES['AADHAAR'];
      updates['identificationNumber'] = rule.format(user.identificationNumber);
    }

    if (user.addressLine1) updates['addressLine1'] = user.addressLine1;

    // State and City resolution
    const stateStr = user.state || 'Karnataka';
    const matchedState = this.stateList.find(s => s.state.toLowerCase() === stateStr.toLowerCase()) || this.stateList[0];
    updates['state'] = matchedState.state;
    this.availableCities = [...matchedState.cities];

    const cityStr = user.city || (this.availableCities[0] ? this.availableCities[0].name : '');
    const matchedCity = this.availableCities.find(c => c.name.toLowerCase() === cityStr.toLowerCase());
    if (matchedCity) {
      updates['city'] = matchedCity.name;
    } else if (cityStr) {
      const customPin = user.postalCode || matchedState.defaultPin;
      this.availableCities.unshift({ name: cityStr, pin: customPin });
      updates['city'] = cityStr;
    }

    // Postal Code
    updates['postalCode'] = user.postalCode || (matchedCity ? matchedCity.pin : matchedState.defaultPin);

    // Mobile Number
    if (user.phoneNumber) {
      updates['mobileNumber'] = formatIndianMobile(user.phoneNumber);
    }
    if (user.email) updates['email'] = user.email;

    this.kycForm.patchValue(updates);
  }

  loadAccounts(): void {
    this.loadingAccounts = true;
    this.customerApi.getAccounts().subscribe({
      next: (data) => {
        this.loadingAccounts = false;
        this.accounts = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAccounts = false;
        this.accounts = [];
        this.cdr.detectChanges();
      }
    });
  }

  submitKyc(): void {
    if (this.kycForm.invalid || this.savingKyc) {
      this.kycForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.savingKyc = true;
    this.cdr.detectChanges();

    this.customerApi.submitProfile(this.kycForm.value).pipe(
      finalize(() => {
        this.savingKyc = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.customerStatus = res.status || 'ACTIVE';
        if (this.currentUser) {
          this.currentUser = {
            ...this.currentUser,
            ...this.kycForm.value,
            customerStatus: this.customerStatus
          };
        }
        this.isEditingKyc = false;
        this.loadProfile();
        this.toastService.success(res.message || 'KYC Profile successfully updated.', 'Profile Saved');
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || err.message || 'Failed to submit KYC profile';
        this.toastService.error(msg, 'Submission Error');
        this.cdr.detectChanges();
      }
    });
  }

  openAccount(): void {
    if (this.accountForm.invalid || this.openingAccount) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.openingAccount = true;
    this.cdr.detectChanges();
    const { productId, branchId } = this.accountForm.value;

    this.customerApi.openAccount({ productId: Number(productId), branchId: Number(branchId) }).pipe(
      finalize(() => {
        this.openingAccount = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.toastService.success(`Account ${res.accountNumber} opened successfully!`, 'Account Created');
        this.accounts = [res, ...this.accounts];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(err.message || 'Account creation request failed', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  syncKafka(): void {
    if (this.syncingKafka) return;
    this.syncingKafka = true;
    this.cdr.detectChanges();
    this.customerApi.syncCustomer().pipe(
      finalize(() => {
        this.syncingKafka = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.toastService.success(res?.message || 'Customer profile successfully published to Kafka topic for FD sync.', 'Kafka Event Dispatched');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || err.message || 'Failed to dispatch customer snapshot to Kafka', 'Sync Failed');
        this.cdr.detectChanges();
      }
    });
  }
}
