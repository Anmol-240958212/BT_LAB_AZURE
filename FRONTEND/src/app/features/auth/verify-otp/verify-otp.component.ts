import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-verify-otp',
  standalone: false,
  template: `
    <div class="otp-container">
      <div class="otp-header">
        <h2 class="title">{{ 'auth.verifyOtp' | transloco }}</h2>
        <p class="subtitle">{{ 'auth.enterVerificationCode' | transloco }}</p>
      </div>
      <form [formGroup]="otpForm" (ngSubmit)="onSubmit()" class="otp-form" novalidate>
        <app-input id="otp-code" [label]="'auth.verificationCode' | transloco" type="text" [placeholder]="'auth.enterOtpCode' | transloco"
          formControlName="otp" [required]="true" [error]="otpError"></app-input>
        <app-button type="submit" variant="primary" [loading]="loading" [disabled]="otpForm.invalid || loading" [block]="true">
          {{ loading ? ('auth.verifying' | transloco) : ('auth.verifyOtp' | transloco) }}
        </app-button>
      </form>
      <div class="auth-switch-link"><a routerLink="/register">Back to registration</a></div>
    </div>
  `,
  styles: [`
    .otp-container { display: flex; flex-direction: column; padding: 16px; }
    .otp-header { margin-bottom: 8px; }
    .title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); line-height: 1.2; }
    .subtitle { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.3; }
    .otp-form { display: flex; flex-direction: column; gap: 8px; }
    .auth-switch-link { margin-top: var(--space-5); text-align: center; font-size: var(--text-xs); color: var(--color-text-secondary); }
  `]
})
export class VerifyOtpComponent implements OnInit {
  otpForm!: FormGroup;
  loading = false;
  email = '';
  phoneNumber = '';

  constructor(private readonly fb: FormBuilder, private readonly authApi: AuthApiService, private readonly toastService: ToastService, private readonly router: Router, private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.otpForm = this.fb.group({ otp: ['', [Validators.required, Validators.pattern(/^[0-9]{4,6}$/)]] });
    // Receive identifier from query params (passed by register) or state
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.phoneNumber = this.route.snapshot.queryParamMap.get('phone') || '';
    if (!this.email && !this.phoneNumber) {
      // Try router state if available
      const nav = this.router.getCurrentNavigation();
      const state = nav?.extras?.state as any;
      if (state) {
        this.email = state.email || '';
        this.phoneNumber = state.phone || '';
      }
    }
    // If nothing passed, default to empty so backend will reject with clear message
  }

  get otpError(): string | null {
    const c = this.otpForm.get('otp');
    return (c?.touched && c.errors) ? (c.errors['required'] ? 'OTP is required' : 'Enter 4-6 digit code') : null;
  }

  onSubmit(): void {
    if (this.otpForm.invalid || this.loading) { this.otpForm.markAllAsTouched(); return; }
    this.loading = true;
    const otp = this.otpForm.value.otp;
    this.authApi.verifyOtp({ email: this.email || undefined, phoneNumber: this.phoneNumber || undefined, otp }).subscribe({
      next: () => { this.loading = false; this.toastService.success('Registration completed.', 'Success'); this.router.navigate(['/login']); },
      error: (err: any) => { this.loading = false; const msg = String(err?.message || err?.error?.detail || err?.error || 'Invalid OTP'); this.toastService.error(msg, 'Failed'); }
    });
  }
}
