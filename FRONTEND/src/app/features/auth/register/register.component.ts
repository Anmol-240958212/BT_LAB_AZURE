import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-register',
  standalone: false,
  template: `
    <div class="register-container">
      <div class="register-header">
        <h2 class="title">{{ step === 'register' ? ('auth.createAccount' | transloco) : ('auth.verifyOtp' | transloco) }}</h2>
        <p class="subtitle">{{ step === 'register' ? ('auth.joinPlatform' | transloco) : ('auth.otpSentToContact' | transloco) }}</p>
      </div>

      <form *ngIf="step === 'register'" [formGroup]="registerForm" (ngSubmit)="onRegister()" class="register-form" novalidate>
        <app-input id="register-name" [label]="'common.fullName' | transloco" type="text" [placeholder]="'auth.enterFullName' | transloco" formControlName="name" [required]="true" [error]="nameError"></app-input>
        <app-input id="register-phone" [label]="'customer.mobileNumber' | transloco" type="tel" [placeholder]="'auth.enterPhone' | transloco" formControlName="phoneNumber" [required]="true" [error]="phoneError"></app-input>
        <app-input id="register-email" [label]="'common.email' | transloco" type="email" [placeholder]="'auth.enterEmail' | transloco" formControlName="email" [required]="true" [error]="emailError"></app-input>
        <app-input id="register-password" [label]="'auth.password' | transloco" type="password" [placeholder]="'auth.passwordHint' | transloco" formControlName="password" [required]="true" [error]="passwordError"></app-input>
        <app-button type="submit" variant="primary" [loading]="loading" [disabled]="registerForm.invalid || loading" [block]="true">{{ loading ? ('auth.sendingOtp' | transloco) : ('auth.register' | transloco) }}</app-button>
      </form>

      <form *ngIf="step === 'verify'" [formGroup]="otpForm" (ngSubmit)="onVerifyOtp()" class="register-form" novalidate>
        <app-input id="verify-otp" [label]="'auth.verificationCode' | transloco" type="text" [placeholder]="'auth.enterOtp' | transloco" formControlName="otp" [required]="true" [error]="otpError"></app-input>
        <app-button type="submit" variant="primary" [loading]="loading" [disabled]="otpForm.invalid || loading" [block]="true">{{ loading ? ('auth.verifying' | transloco) : ('auth.verifyComplete' | transloco) }}</app-button>
        <a (click)="backToRegister()" class="back-link">{{ 'auth.backRegistration' | transloco }}</a>
      </form>

      <div class="auth-switch-link"><span>{{ 'auth.alreadyAccount' | transloco }}</span><a routerLink="/login">{{ 'auth.signIn' | transloco }}</a></div>
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

  constructor(private readonly fb: FormBuilder, private readonly authApi: AuthApiService, private readonly toastService: ToastService, private readonly router: Router, private readonly transloco: TranslocoService) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,20}$/)]]
    });
    this.otpForm = this.fb.group({ otp: ['', [Validators.required, Validators.pattern(/^[0-9]{4,6}$/)]] });
  }

  get nameError(): string | null { const c = this.registerForm.get('name'); return (c?.touched && c.errors) ? (c.errors['required'] ? this.transloco.translate('validation.fullNameRequired') : c.errors['minlength'] ? this.transloco.translate('validation.min2Chars') : this.transloco.translate('validation.tooLong')) : null; }
  get phoneError(): string | null { const c = this.registerForm.get('phoneNumber'); return (c?.touched && c.errors) ? (c.errors['required'] ? this.transloco.translate('validation.phoneRequired') : this.transloco.translate('validation.phoneDigits')) : null; }
  get emailError(): string | null { const c = this.registerForm.get('email'); return (c?.touched && c.errors) ? (c.errors['required'] ? this.transloco.translate('validation.emailRequired') : this.transloco.translate('validation.invalidEmail')) : null; }
  get passwordError(): string | null { const c = this.registerForm.get('password'); if (!c?.touched || !c.errors) return null; if (c.errors['required']) return this.transloco.translate('validation.passwordRequired'); if (c.errors['minlength']) return this.transloco.translate('validation.min6Chars'); if (c.errors['maxlength']) return this.transloco.translate('validation.max20Chars'); if (c.errors['pattern']) return this.transloco.translate('validation.passwordPattern'); return null; }
  get otpError(): string | null { const c = this.otpForm.get('otp'); return (c?.touched && c.errors) ? (c.errors['required'] ? this.transloco.translate('validation.otpRequired') : this.transloco.translate('validation.otpDigits')) : null; }

  onRegister(): void {
    if (this.registerForm.invalid || this.loading) { this.registerForm.markAllAsTouched(); return; }
    this.loading = true;
    const { name, phoneNumber, email, password } = this.registerForm.value;
    this.authApi.register({ name, username: email, email, phoneNumber, password }).subscribe({
      next: () => { this.loading = false; this.identifier = email || phoneNumber; this.toastService.info('OTP sent. Check your email.', 'Verification');
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
