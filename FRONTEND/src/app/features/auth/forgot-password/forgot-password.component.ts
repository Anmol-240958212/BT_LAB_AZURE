import { Component } from '@angular/core';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  template: `
    <div class="forgot-container">
      <div class="forgot-header">
        <h2 class="title">Password Recovery</h2>
        <p class="subtitle">Enter your registered email address or username to receive a reset code.</p>
      </div>

      <div *ngIf="submitted" class="notice-box mb-4">
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
        <a *ngIf="identifier.trim()" [routerLink]="['/reset-password']" [queryParams]="{ identifier: identifier }" class="btn btn-secondary btn-sm mb-4">
          Enter the OTP from your email →
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
    const cleanId = this.identifier.trim();
    try {
      localStorage.setItem('btlab_forgot_identifier', cleanId);
    } catch {}

    this.authApi.forgotPassword({ identifier: cleanId }).pipe(
      timeout(15000),
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: () => {
        this.submitted = true;
        this.toastService.success('A password reset OTP was sent to your registered email address.', 'Recovery Email Sent');
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || err.error?.message || err.message || 'Unable to send the password reset email.', 'Recovery Failed');
      }
    });
  }
}
