import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: false,
  template: `
    <div class="not-found-page animate-fade-in">
      <div class="not-found-card">
        <span class="error-code">404</span>
        <h2 class="error-title">Endpoint Not Found</h2>
        <p class="error-description">
          The requested banking resource or route does not exist on this platform.
        </p>
        <app-button variant="primary" (clicked)="goToDashboard()">
          Return to Dashboard
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-8);
    }
    .not-found-card {
      max-width: 440px;
      width: 100%;
      text-align: center;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-card);
      padding: var(--space-8);
      box-shadow: var(--shadow-card);
    }
    .error-code {
      font-size: 56px;
      font-weight: 600;
      color: var(--color-accent);
      line-height: 1;
      margin-bottom: var(--space-3);
      display: block;
      letter-spacing: -0.02em;
    }
    .error-title {
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--space-2);
    }
    .error-description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin-bottom: var(--space-6);
    }
  `]
})
export class NotFoundComponent {
  constructor(private readonly router: Router) {}

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
