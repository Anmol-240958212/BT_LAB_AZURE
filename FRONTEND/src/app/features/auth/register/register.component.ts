import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: false,
  template: `
    <div class="register-container">
      <div class="register-header">
        <h2 class="title">{{ step === 'register' ? 'Create Account' : 'Verify OTP' }}</h2>
        <p class="subtitle">{{ step === 'register' ? 'Join our banking platform.' : 'Enter the OTP sent to your email/phone.' }}</p>
      </div>

      <form *ngIf="step === 'register'" [formGroup]="registerForm" (ngSubmit)="onRegister()" class="register-form" novalidate>
        <app-input id="register-name" label="Full Name" type="text" placeholder="Enter full name" formControlName="name" [required]="true" [error]="nameError"></app-input>
        <app-input id="register-phone" label="Phone Number" type="tel" placeholder="Enter phone" formControlName="phoneNumber" [required]="true" [error]="phoneError"></app-input>
        <app-input id="register-email" label="Email" type="email" placeholder="Enter email" formControlName="email" [required]="true" [error]="emailError"></app-input>
        <app-input id="register-password" label="Password" type="password" placeholder="6+ chars, letters+numbers+special" formControlName="password" [required]="true" [error]="passwordError"></app-input>
        <app-button type="submit" variant="primary" [loading]="loading" [disabled]="registerForm.invalid || loading" [block]="true">{{ loading ? 'Sending OTP...' : 'Register' }}</app-button>
      </form>

      <form *ngIf="step === 'verify'" [formGroup]="otpForm" (ngSubmit)="onVerifyOtp()" class="register-form" novalidate>
        <app-input id="verify-otp" label="OTP Code" type="text" placeholder="Enter 6-digit OTP" formControlName="otp" [required]="true" [error]="otpError"></app-input>
        <app-button type="submit" variant="primary" [loading]="loading" [disabled]="otpForm.invalid || loading" [block]="true">{{ loading ? 'Verifying...' : 'Verify & Complete' }}</app-button>
        <a (click)="backToRegister()" class="back-link">Back to registration</a>
      </form>

      <div class="auth-switch-link"><span>Already have an account?</span><a routerLink="/login">Sign in</a></div>
    </div>
  `,
  styles: [`
    .register-container { display: flex; flex-direction: column; }
    .register-header { margin-bottom: 8px; }
    .title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); line-height: 1.2; }
    .subtitle { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.3; }
    .register-form { display: flex; flex-direction: column; gap: 8px; }
    .auth-switch-link { margin-top: var(--space-5); text-align: center; font-size: var(--text-xs); color: var(--color-text-secondary); display: flex; justify-content: center; gap: var(--space-2); }
    .back-link { font-size: var(--text-xs); color: var(--color-accent); cursor: pointer; text-align: center; text-decoration: underline; margin-top: 4px; }
  `]
})
export class RegisterComponent implements OnInit {
  step: 'register' | 'verify' = 'register';
  registerForm!: FormGroup;
  otpForm!: FormGroup;
  loading = false;
  identifier = '';

  constructor(private readonly fb: FormBuilder, private readonly authApi: AuthApiService, private readonly toastService: ToastService, private readonly router: Router) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,20}$/)]]
    });
    this.otpForm = this.fb.group({ otp: ['', [Validators.required, Validators.pattern(/^[0-9]{4,6}$/)]] });
  }

  get nameError(): string | null { const c = this.registerForm.get('name'); return (c?.touched && c.errors) ? (c.errors['required'] ? 'Full name required' : c.errors['minlength'] ? 'Min 2 chars' : 'Too long') : null; }
  get phoneError(): string | null { const c = this.registerForm.get('phoneNumber'); return (c?.touched && c.errors) ? (c.errors['required'] ? 'Phone required' : 'Enter 10-15 digits') : null; }
  get emailError(): string | null { const c = this.registerForm.get('email'); return (c?.touched && c.errors) ? (c.errors['required'] ? 'Email required' : 'Invalid email') : null; }
  get passwordError(): string | null { const c = this.registerForm.get('password'); if (!c?.touched || !c.errors) return null; if (c.errors['required']) return 'Password required'; if (c.errors['minlength']) return 'Min 6 chars'; if (c.errors['maxlength']) return 'Max 20 chars'; if (c.errors['pattern']) return 'Need letters, numbers, special'; return null; }
  get otpError(): string | null { const c = this.otpForm.get('otp'); return (c?.touched && c.errors) ? (c.errors['required'] ? 'OTP required' : 'Enter 4-6 digit OTP') : null; }

  onRegister(): void {
    if (this.registerForm.invalid || this.loading) { this.registerForm.markAllAsTouched(); return; }
    this.loading = true;
    const { name, phoneNumber, email, password } = this.registerForm.value;
    this.authApi.register({ name, username: email, email, phoneNumber, password }).subscribe({
      next: () => { this.loading = false; this.identifier = email || phoneNumber; this.toastService.info('OTP sent. Check your email/phone.', 'Verification');
        // Navigate to standalone verify-otp page with identifier
        this.router.navigate(['/verify-otp'], {
          queryParams: { email: email || '', phone: phoneNumber || '' },
          state: { email: email || '', phone: phoneNumber || '' }
        });
      },
      error: (err: any) => { this.loading = false; const msg = String(err?.message || err?.error?.detail || err?.error || ''); this.toastService.error(msg || 'Registration failed.', 'Error'); }
    });
  }

  onVerifyOtp(): void {
    if (this.otpForm.invalid || this.loading) { this.otpForm.markAllAsTouched(); return; }
    this.loading = true;
    const otp = this.otpForm.value.otp;
    const email = this.registerForm.value.email;
    const phoneNumber = this.registerForm.value.phoneNumber;
    // Send identifier + OTP so backend can verify against the correct user
    this.authApi.verifyOtp({ email: email || undefined, phoneNumber: phoneNumber || undefined, otp }).subscribe({
      next: () => { this.loading = false; this.toastService.success('Account created! Moving to login.', 'Done'); this.router.navigate(['/login']); },
      error: (err: any) => { this.loading = false; const msg = String(err?.message || err?.error?.detail || err?.error || ''); this.toastService.error(msg || 'Invalid or expired OTP.', 'Verification Failed'); }
    });
  }

  backToRegister(): void { this.step = 'register'; this.loading = false; }
}
