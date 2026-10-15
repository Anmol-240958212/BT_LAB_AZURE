import { Component } from '@angular/core';
import { Router } from '@angular/router';
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

      <div *ngIf="submitted" class="notice-box mb-4">
        <app-icon name="mail" [size]="16"></app-icon>
        <span>If an account exists for <strong>{{ identifier }}</strong>, recovery instructions and token have been issued.</span>
      </div>

      <!-- Simulation Recovery Token Display -->
      <div *ngIf="submitted && simulatedToken" class="token-banner mb-6">
        <div class="banner-top">
          <span class="badge-tag">PRESENTATION SIMULATION</span>
          <span class="banner-sub">Generated Recovery Token</span>
        </div>
        <div class="banner-content">
          <div class="token-code">{{ simulatedToken }}</div>
          <button type="button" class="btn-token-apply" (click)="proceedToReset()">
            <span>Auto-fill & Proceed →</span>
          </button>
        </div>
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
        <a *ngIf="submitted && !simulatedToken" routerLink="/reset-password" class="btn btn-secondary btn-sm mb-4">
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
  simulatedToken = '';

  constructor(
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  onSubmit(): void {
    if (!this.identifier.trim() || this.loading) return;

    this.loading = true;
    const cleanId = this.identifier.trim();
    try {
      localStorage.setItem('btlab_forgot_identifier', cleanId);
    } catch {}

    this.authApi.forgotPassword({ identifier: cleanId }).subscribe({
      next: (msg) => {
        this.loading = false;
        this.submitted = true;
        const match = msg && msg.match(/\[SIMULATED OTP:\s*([0-9A-Za-z]+)\]/i);
        if (match && match[1]) {
          this.simulatedToken = match[1];
          try { localStorage.setItem('btlab_latest_otp', match[1]); } catch {}
        } else {
          this.authApi.getLatestOtp(cleanId).subscribe({
            next: (res) => {
              if (res?.otp) {
                this.simulatedToken = res.otp;
                try { localStorage.setItem('btlab_latest_otp', res.otp); } catch {}
              }
            },
            error: () => {
              this.simulatedToken = '742918';
              try { localStorage.setItem('btlab_latest_otp', '742918'); } catch {}
            }
          });
        }
        this.toastService.success('Reset instructions accepted. Recovery token generated below.', 'Recovery Dispatched');
      },
      error: () => {
        this.loading = false;
        this.submitted = true;
        this.simulatedToken = '742918';
        try { localStorage.setItem('btlab_latest_otp', '742918'); } catch {}
        this.toastService.info('If the account exists, recovery instructions have been sent.', 'Request Processed');
      }
    });
  }

  proceedToReset(): void {
    this.router.navigate(['/reset-password'], {
      queryParams: {
        identifier: this.identifier.trim(),
        token: this.simulatedToken
      }
    });
  }
}
