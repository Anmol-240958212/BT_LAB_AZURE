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

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParams['token'] || '';

    this.resetForm = this.fb.group(
      {
        token: [tokenParam, [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );
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

  onSubmit(): void {
    if (this.resetForm.invalid || this.loading) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { token, newPassword } = this.resetForm.value;

    this.authApi.resetPassword({ token, newPassword }).subscribe({
      next: (msg) => {
        this.loading = false;
        this.toastService.success(msg || 'Password updated successfully. Please sign in.', 'Password Reset Complete');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.error(err.message || 'Invalid or expired reset token.', 'Password Reset Failed');
      }
    });
  }
}
