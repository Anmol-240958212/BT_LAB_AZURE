import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CustomerApiService } from '../../../core/api/customer-api.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { AuthService } from '../../../core/auth.service';
import { OpenAccountResponse } from '../../../core/models/auth.models';
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
      <!-- KYC Status Banner -->
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">COMPLIANCE & KYC VERIFICATION</span>
            <h1 class="card-title mt-1">Customer KYC Profile & Bank Accounts</h1>
            <p class="card-subtitle">Manage regulatory verification documents and active deposit accounts.</p>
          </div>
          <div class="flex-col" style="align-items: flex-end; gap: var(--space-2);">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <span class="status-label">KYC Verification Status</span>
              <app-badge [variant]="customerStatus === 'ACTIVE' ? 'active' : 'pending'" [text]="customerStatus"></app-badge>
            </div>
            <app-button
              *ngIf="customerStatus === 'ACTIVE'"
              variant="secondary"
              size="sm"
              [disabled]="syncingKafka"
              (clicked)="syncKafka()"
            >
              <app-icon name="refresh-cw" [size]="12"></app-icon>
              <span>{{ syncingKafka ? 'Syncing...' : 'Sync with FD (Kafka)' }}</span>
            </app-button>
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

            <div class="mt-4">
              <app-button
                type="submit"
                variant="primary"
                [loading]="savingKyc"
                [disabled]="kycForm.invalid || savingKyc"
                [block]="true"
              >
                {{ savingKyc ? 'Updating Profile...' : (customerStatus === 'ACTIVE' ? 'Save & Update KYC Profile' : 'Save & Submit KYC Profile') }}
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
  customerStatus = 'KYC_PENDING';
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
          if (user.customerStatus) {
            this.customerStatus = user.customerStatus;
          }
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

          // Postal Code autodetected from city or state
          updates['postalCode'] = user.postalCode || (matchedCity ? matchedCity.pin : matchedState.defaultPin);

          // Mobile Number formatted to Indian standard
          if (user.phoneNumber) {
            updates['mobileNumber'] = formatIndianMobile(user.phoneNumber);
          }
          if (user.email) updates['email'] = user.email;

          this.kycForm.patchValue(updates);
          this.cdr.detectChanges();
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

