import { Component } from '@angular/core';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  template: `
    <div class="forgot-container">
      <div class="forgot-header">
        <h2 class="title">Password Recovery</h2>
        <p class="subtitle">Enter your registered email address or username to receive a reset code.</p>
      </div>

      <div *ngIf="submitted" class="notice-box mb-6">
        <app-icon name="mail" [size]="16"></app-icon>
        <span>If an account exists for <strong>{{ identifier }}</strong>, recovery instructions and token have been issued.</span>
      </div>

      <div *ngIf="!submitted" class="form-container">
        <app-input
          id="forgot-identifier"
          label="Email or Username"
          placeholder="e.g. user@example.com"
          [(ngModel)]="identifier"
          [required]="true"
        ></app-input>

        <div class="mt-4">
          <app-button
            variant="primary"
            [loading]="loading"
            [disabled]="!identifier.trim() || loading"
            [block]="true"
            (clicked)="onSubmit()"
          >
            {{ loading ? 'Dispatching Reset Token...' : 'Send Recovery Instructions' }}
          </app-button>
        </div>
      </div>

      <div class="auth-aux-links">
        <a *ngIf="submitted" routerLink="/reset-password" class="btn btn-secondary btn-sm mb-4">
          Proceed to Enter Reset Token →
        </a>
        <div class="back-link">
          <a routerLink="/login">← Back to Sign In</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forgot-container {
      display: flex;
      flex-direction: column;
    }
    .forgot-header {
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
    .auth-aux-links {
      margin-top: var(--space-6);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }
    .back-link a {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .back-link a:hover {
      color: var(--color-accent);
    }
  `]
})
export class ForgotPasswordComponent {
  identifier = '';
  loading = false;
  submitted = false;

  constructor(
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService
  ) {}

  onSubmit(): void {
    if (!this.identifier.trim() || this.loading) return;

    this.loading = true;
    this.authApi.forgotPassword({ identifier: this.identifier.trim() }).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.toastService.success('Reset instructions accepted. Please check your inbox or logs.', 'Recovery Dispatched');
      },
      error: (err) => {
        this.loading = false;
        // Even on error, show accepted to avoid email enumeration
        this.submitted = true;
        this.toastService.info('If the account exists, recovery instructions have been sent.', 'Request Processed');
      }
    });
  }
}
