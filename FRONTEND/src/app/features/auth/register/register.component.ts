import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize, timeout } from 'rxjs/operators';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { formatIndianMobile, isValidIndianMobile } from '../../../core/indian-format.utils';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

function indianPhoneValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val || !val.toString().trim()) return null;
  return isValidIndianMobile(val) ? null : { invalidIndianMobile: true };
}

@Component({
  selector: 'app-register',
  standalone: false,
  template: `
    <div class="register-container">
      <div class="register-header">
        <h2 class="title">{{ otpStep ? 'Verify Registration OTP' : 'Open Banking Profile' }}</h2>
        <p class="subtitle">
          {{ otpStep ? 'Enter the one-time code sent to your email to activate your account.' : 'Create your credentials to access personalized deposit rates.' }}
        </p>
      </div>

      <!-- Step 1: Registration Form -->
      <form *ngIf="!otpStep" [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
        <div *ngIf="errorMessage" class="error-banner mb-3">
          <app-icon name="alert-circle" [size]="16"></app-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <app-input
          id="reg-username"
          label="Username"
          placeholder="Choose unique username"
          formControlName="username"
          [required]="true"
          [error]="usernameError"
          [hint]="usernameHint"
        ></app-input>

        <app-input
          id="reg-email"
          label="Email Address"
          type="email"
          placeholder="e.g. alex.morgan@example.com"
          formControlName="email"
          [required]="true"
          [error]="emailError"
        ></app-input>

        <app-input
          id="reg-phone"
          label="Phone Number (Optional)"
          placeholder="+91 79829 23284"
          formControlName="phoneNumber"
          [error]="phoneError"
          (input)="onPhoneInput($event)"
        ></app-input>

        <app-input
          id="reg-password"
          label="Password"
          type="password"
          placeholder="Minimum 6 characters"
          formControlName="password"
          [required]="true"
          [error]="passwordError"
        ></app-input>

        <app-input
          id="reg-confirm-password"
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          formControlName="confirmPassword"
          [required]="true"
          [error]="confirmPasswordError"
        ></app-input>

        <app-button
          type="submit"
          variant="primary"
          [loading]="loading"
          [disabled]="registerForm.invalid || loading"
          [block]="true"
          id="reg-submit-btn"
        >
          {{ loading ? 'Submitting Registration...' : 'Continue to Verification' }}
        </app-button>
      </form>

      <!-- Step 2: OTP Verification Form -->
      <div *ngIf="otpStep" class="otp-container">
        <div class="notice-box mb-4">
          <app-icon name="mail" [size]="16"></app-icon>
          <span>OTP dispatched to <strong>{{ registerForm.value.email }}</strong></span>
        </div>

        <div *ngIf="simulatedOtp" class="sim-otp-banner mb-3">
          <div class="sim-otp-header">
            <span class="sim-badge">DEV SIMULATION</span>
            <span class="sim-text">One-Time Password: <strong>{{ simulatedOtp }}</strong></span>
          </div>
          <span class="sim-hint">Code auto-populated for easy testing.</span>
        </div>

        <app-input
          id="reg-otp"
          label="6-Digit Verification Code"
          placeholder="e.g. 123456"
          [(ngModel)]="otpCode"
          hint="Check backend console or use the simulated code above"
        ></app-input>

        <div class="flex-col mt-4">
          <app-button
            variant="primary"
            [loading]="loading"
            [disabled]="!otpCode || loading"
            [block]="true"
            (clicked)="verifyOtp()"
          >
            {{ loading ? 'Verifying...' : 'Complete Registration' }}
          </app-button>

          <app-button
            variant="ghost"
            [block]="true"
            (clicked)="otpStep = false"
          >
            Back to Edit Details
          </app-button>
        </div>
      </div>

      <div class="auth-switch-link">
        <span>Already have an account?</span>
        <a routerLink="/login">Sign In</a>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      flex-direction: column;
    }
    .register-header {
      margin-bottom: 8px;
    }
    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
      line-height: 1.2;
    }
    .subtitle {
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-top: 2px;
      line-height: 1.3;
    }
    .register-form {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sim-otp-banner {
      background-color: var(--color-bg-base);
      border: 1px solid var(--color-border-focus);
      border-radius: var(--radius-card);
      padding: var(--space-2);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sim-otp-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .sim-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 1px 5px;
      background-color: var(--color-accent-subtle);
      color: var(--color-accent);
      border-radius: 4px;
    }
    .sim-text {
      font-size: var(--text-xs);
      color: var(--color-text-primary);
    }
    .sim-hint {
      font-size: 10px;
      color: var(--color-text-muted);
    }
    .error-banner {
      background-color: var(--color-danger-subtle, rgba(239, 68, 68, 0.15));
      border: 1px solid var(--color-danger, #ef4444);
      color: var(--color-danger, #fca5a5);
      border-radius: var(--radius-card);
      padding: 6px 10px;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .auth-switch-link {
      margin-top: 8px;
      text-align: center;
      font-size: 11px;
      color: var(--color-text-secondary);
      display: flex;
      justify-content: center;
      gap: 6px;
    }
  `]
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  otpStep = false;
  otpCode = '';
  simulatedOtp = '';
  errorMessage = '';

  // 5-second pause check state
  checkingUsername = false;
  usernameExists: boolean | null = null;
  checkedUsername = '';
  private usernameSub?: Subscription;
  private usernameKeySub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [indianPhoneValidator]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );

    const usernameCtrl = this.registerForm.get('username');

    // Immediately clear previous check / error state whenever user presses a new key
    this.usernameKeySub = usernameCtrl?.valueChanges.subscribe(() => {
      this.usernameExists = null;
      if (usernameCtrl.errors?.['usernameTaken']) {
        const { usernameTaken, ...rest } = usernameCtrl.errors;
        usernameCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      this.cdr.detectChanges();
    });

    // 5-second pause check (debounceTime: 5000ms) triggered when string is changed
    this.usernameSub = usernameCtrl?.valueChanges
      .pipe(
        debounceTime(5000),
        distinctUntilChanged(),
        switchMap((rawVal) => {
          const val = (rawVal || '').trim();
          if (!val || val.length < 3) {
            this.checkingUsername = false;
            this.usernameExists = null;
            this.cdr.detectChanges();
            return of(null);
          }
          this.checkingUsername = true;
          this.checkedUsername = val;
          this.cdr.detectChanges();
          return this.authApi.checkUsername(val).pipe(
            timeout(6000),
            catchError(() => of({ username: val, exists: false, available: true }))
          );
        })
      )
      .subscribe((res) => {
        this.checkingUsername = false;
        if (!res) {
          this.usernameExists = null;
        } else {
          this.usernameExists = res.exists;
          if (res.exists) {
            usernameCtrl?.setErrors({ ...(usernameCtrl.errors || {}), usernameTaken: true });
          } else {
            if (usernameCtrl?.errors?.['usernameTaken']) {
              const { usernameTaken, ...rest } = usernameCtrl.errors;
              usernameCtrl.setErrors(Object.keys(rest).length ? rest : null);
            }
          }
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.usernameSub?.unsubscribe();
    this.usernameKeySub?.unsubscribe();
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const formatted = formatIndianMobile(input.value);
    input.value = formatted;
    this.registerForm.get('phoneNumber')?.setValue(formatted);
  }

  get phoneError(): string | null {
    const ctrl = this.registerForm.get('phoneNumber');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['invalidIndianMobile']) {
        return 'Please enter a valid 10-digit Indian mobile number (e.g. +91 79829 23284)';
      }
    }
    return null;
  }

  get usernameHint(): string | null {
    if (this.checkingUsername) {
      return 'Checking username in database...';
    }
    if (this.usernameExists === false && !this.usernameError) {
      return '✓ Username is available';
    }
    return null;
  }

  get usernameError(): string | null {
    const ctrl = this.registerForm.get('username');
    if (ctrl?.errors?.['usernameTaken']) {
      return `Username "${this.checkedUsername}" already exists in the database. Please choose another.`;
    }
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Username is required';
      if (ctrl.errors['minlength']) return 'Username must be at least 3 characters';
    }
    return null;
  }

  get emailError(): string | null {
    const ctrl = this.registerForm.get('email');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Email address is required';
      if (ctrl.errors['email']) return 'Please enter a valid email address';
    }
    return null;
  }

  get passwordError(): string | null {
    const ctrl = this.registerForm.get('password');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Password is required';
      if (ctrl.errors['minlength']) return 'Password must be at least 6 characters';
    }
    return null;
  }

  get confirmPasswordError(): string | null {
    const ctrl = this.registerForm.get('confirmPassword');
    if (ctrl?.touched) {
      if (ctrl.errors?.['required']) return 'Please confirm your password';
      if (this.registerForm.errors?.['passwordMismatch']) return 'Passwords do not match';
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.loading) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { username, email, phoneNumber, password } = this.registerForm.value;

    this.authApi.register({
      username,
      name: username,
      email,
      phoneNumber: phoneNumber ? phoneNumber.trim() : null,
      password
    }).pipe(
      timeout(8000),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (msg) => {
        const match = msg?.match(/\b(\d{6})\b/);
        if (match) {
          this.simulatedOtp = match[1];
          this.otpCode = match[1];
        }
        this.toastService.success(msg || 'OTP dispatched to email. Please verify.', 'Registration Request Accepted');
        this.otpStep = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Registration failed. Username, email, or phone may already be registered.';
        this.toastService.error(this.errorMessage, 'Registration Error');
        this.cdr.markForCheck();
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpCode || this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    const email = this.registerForm.value.email;

    this.authApi.verifyOtp({ email, otp: this.otpCode }).pipe(
      timeout(8000),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (msg) => {
        this.toastService.success('Registration completed successfully! Please sign in.', 'Account Activated');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errorMessage = err.message || 'Invalid or expired OTP';
        this.toastService.error(this.errorMessage, 'Verification Failed');
        this.cdr.markForCheck();
      }
    });
  }
}
