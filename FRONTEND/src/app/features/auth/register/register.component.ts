import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
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
        <app-input
          id="reg-username"
          label="Username"
          placeholder="Choose unique username"
          formControlName="username"
          [required]="true"
          [error]="usernameError"
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
          placeholder="+91 9876543210"
          formControlName="phoneNumber"
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
      margin-bottom: var(--space-5);
    }
    .title {
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin-top: 4px;
    }
    .register-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .sim-otp-banner {
      background-color: var(--color-bg-base);
      border: 1px solid var(--color-border-focus);
      border-radius: var(--radius-card);
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: 4px;
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
      padding: 2px 6px;
      background-color: var(--color-accent-subtle);
      color: var(--color-accent);
      border-radius: 4px;
    }
    .sim-text {
      font-size: var(--text-xs);
      color: var(--color-text-primary);
    }
    .sim-hint {
      font-size: 11px;
      color: var(--color-text-muted);
    }
    .auth-switch-link {
      margin-top: var(--space-6);
      text-align: center;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      display: flex;
      justify-content: center;
      gap: var(--space-2);
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  otpStep = false;
  otpCode = '';
  simulatedOtp = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        phoneNumber: [''],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );
  }

  get usernameError(): string | null {
    const ctrl = this.registerForm.get('username');
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
    const { username, email, phoneNumber, password } = this.registerForm.value;

    this.authApi.register({ username, name: username, email, phoneNumber, password }).pipe(
      timeout(6000)
    ).subscribe({
      next: (msg) => {
        this.loading = false;
        const match = msg?.match(/\b(\d{6})\b/);
        if (match) {
          this.simulatedOtp = match[1];
          this.otpCode = match[1];
        }
        this.toastService.success(msg || 'OTP dispatched to email. Please verify.', 'Registration Request Accepted');
        this.otpStep = true;
      },
      error: (err) => {
        this.loading = false;
        const msg = err.message || 'Registration failed. Username or email may already be registered.';
        this.toastService.error(msg, 'Registration Error');
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpCode || this.loading) return;

    this.loading = true;
    const email = this.registerForm.value.email;

    this.authApi.verifyOtp({ email, otp: this.otpCode }).subscribe({
      next: (msg) => {
        this.loading = false;
        this.toastService.success('Registration completed successfully! Please sign in.', 'Account Activated');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.error(err.message || 'Invalid or expired OTP', 'Verification Failed');
      }
    });
  }
}
