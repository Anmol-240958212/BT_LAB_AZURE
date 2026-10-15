import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  standalone: false,
  template: `
    <div class="reset-container">
      <div class="reset-header">
        <h2 class="title">Reset Account Password</h2>
        <p class="subtitle">Enter your verification token and select a new secure password.</p>
      </div>

      <!-- Presentation / Demo Recovery Token Banner -->
      <div *ngIf="simulatedToken" class="token-banner mb-4">
        <div class="banner-top">
          <span class="badge-tag">PRESENTATION SIMULATION</span>
          <span class="banner-sub">Active Reset Token / OTP</span>
        </div>
        <div class="banner-content">
          <div class="token-code">{{ simulatedToken }}</div>
          <button type="button" class="btn-token-apply" (click)="useToken()">
            <app-icon name="check" [size]="12"></app-icon>
            <span>Auto-fill Token</span>
          </button>
        </div>
      </div>

      <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="reset-form">
        <app-input
          id="reset-token"
          label="Reset Token"
          placeholder="Paste token received via email/admin"
          formControlName="token"
          [required]="true"
          [error]="tokenError"
        ></app-input>

        <app-input
          id="reset-new-password"
          label="New Password"
          type="password"
          placeholder="Minimum 6 characters"
          formControlName="newPassword"
          [required]="true"
          [error]="passwordError"
        ></app-input>

        <app-input
          id="reset-confirm-password"
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          formControlName="confirmPassword"
          [required]="true"
          [error]="confirmPasswordError"
        ></app-input>

        <app-button
          type="submit"
          variant="primary"
          [loading]="loading"
          [disabled]="resetForm.invalid || loading"
          [block]="true"
          id="reset-submit-btn"
        >
          {{ loading ? 'Updating Password...' : 'Save New Password' }}
        </app-button>
      </form>

      <div class="auth-aux-links">
        <a routerLink="/login">← Back to Sign In</a>
      </div>
    </div>
  `,
  styles: [`
    .reset-container {
      display: flex;
      flex-direction: column;
    }
    .reset-header {
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
    .token-banner {
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-accent);
      border-radius: var(--radius-card);
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .banner-top {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .badge-tag {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--color-accent);
      color: var(--color-bg-primary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }
    .banner-sub {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .banner-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .token-code {
      font-family: var(--font-mono, monospace);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--color-accent);
    }
    .btn-token-apply {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      background: transparent;
      border: 1px solid var(--color-accent);
      color: var(--color-accent);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-token-apply:hover {
      background: var(--color-accent);
      color: var(--color-bg-primary);
    }
    .reset-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .auth-aux-links {
      margin-top: var(--space-6);
      text-align: center;
    }
    .auth-aux-links a {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .auth-aux-links a:hover {
      color: var(--color-accent);
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  loading = false;
  identifier = '';
  simulatedToken = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParams['token'] || '';
    const idParam = this.route.snapshot.queryParams['identifier'] || '';
    this.identifier = idParam || (typeof localStorage !== 'undefined' ? localStorage.getItem('btlab_forgot_identifier') || '' : '');

    this.resetForm = this.fb.group(
      {
        token: [tokenParam, [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );

    const cachedOtp = typeof localStorage !== 'undefined' ? localStorage.getItem('btlab_latest_otp') : null;
    if (tokenParam) {
      this.simulatedToken = tokenParam;
    } else if (cachedOtp) {
      this.simulatedToken = cachedOtp;
      if (!this.resetForm.get('token')?.value) {
        this.resetForm.patchValue({ token: cachedOtp });
      }
    }

    this.authApi.getLatestOtp(this.identifier).subscribe({
      next: (res) => {
        if (res?.otp) {
          this.simulatedToken = res.otp;
          if (!this.resetForm.get('token')?.value) {
            this.resetForm.patchValue({ token: res.otp });
          }
          if (res.identifier && !this.identifier) {
            this.identifier = res.identifier;
          }
        }
      },
      error: () => {
        if (!this.simulatedToken) {
          this.simulatedToken = '742918';
          if (!this.resetForm.get('token')?.value) {
            this.resetForm.patchValue({ token: '742918' });
          }
        }
      }
    });
  }

  get tokenError(): string | null {
    const ctrl = this.resetForm.get('token');
    if (ctrl?.touched && ctrl.errors?.['required']) {
      return 'Reset token is required';
    }
    return null;
  }

  get passwordError(): string | null {
    const ctrl = this.resetForm.get('newPassword');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'New password is required';
      if (ctrl.errors['minlength']) return 'Password must be at least 6 characters';
    }
    return null;
  }

  get confirmPasswordError(): string | null {
    const ctrl = this.resetForm.get('confirmPassword');
    if (ctrl?.touched) {
      if (ctrl.errors?.['required']) return 'Please confirm your new password';
      if (this.resetForm.errors?.['passwordMismatch']) return 'Passwords do not match';
    }
    return null;
  }

  useToken(): void {
    if (this.simulatedToken) {
      this.resetForm.patchValue({ token: this.simulatedToken });
      this.resetForm.get('token')?.markAsDirty();
      this.toastService.info(`Token ${this.simulatedToken} applied to form.`, 'Token Auto-filled');
    }
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.loading) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { token, newPassword, confirmPassword } = this.resetForm.value;

    this.authApi.resetPassword({
      identifier: this.identifier || '',
      token,
      otp: token,
      newPassword,
      confirmPassword
    }).subscribe({
      next: (msg) => {
        this.loading = false;
        this.toastService.success(msg || 'Password updated successfully. Please sign in.', 'Password Reset Complete');
        try {
          localStorage.removeItem('btlab_latest_otp');
          localStorage.removeItem('btlab_forgot_identifier');
        } catch {}
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.error(err.error?.detail || err.message || 'Invalid or expired reset token.', 'Password Reset Failed');
      }
    });
  }
}
