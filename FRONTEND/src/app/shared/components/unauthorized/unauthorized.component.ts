import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: false,
  template: `
    <div class="unauthorized-page animate-fade-in">
      <div class="unauthorized-card">
        <div class="lock-icon-box">
          <app-icon name="lock" [size]="28" color="var(--color-error)"></app-icon>
        </div>

        <h2 class="error-title">403 — Access Restricted</h2>
        <p class="error-description">
          {{ 'errors.roleRestricted' | transloco }}
        </p>

        <div class="role-notice">
          <span>{{ 'errors.activeRole' | transloco }} </span>
          <app-badge variant="role" [text]="authService.getRole() || 'GUEST'"></app-badge>
        </div>

        <div class="actions-row">
          <app-button variant="secondary" (clicked)="goToDashboard()">
            {{ 'nav.goToDashboard' | transloco }}
          </app-button>
          <app-button variant="primary" (clicked)="switchAccount()">
            {{ 'auth.signInDifferent' | transloco }}
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-page {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-8);
    }
    .unauthorized-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-card);
      padding: var(--space-8);
      box-shadow: var(--shadow-card);
    }
    .lock-icon-box {
      width: 56px;
      height: 56px;
      margin: 0 auto var(--space-4);
      background-color: rgba(124, 74, 74, 0.2);
      border: 1px solid var(--color-error);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lock-icon {
      font-size: var(--text-xl);
    }
    .error-title {
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--space-2);
    }
    .error-description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin-bottom: var(--space-5);
    }
    .role-notice {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      background-color: var(--color-bg-elevated);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-input);
      margin-bottom: var(--space-6);
    }
    .actions-row {
      display: flex;
      justify-content: center;
      gap: var(--space-3);
    }
  `]
})
export class UnauthorizedComponent {
  constructor(
    public readonly authService: AuthService,
    private readonly router: Router
  ) {}

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  switchAccount(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
