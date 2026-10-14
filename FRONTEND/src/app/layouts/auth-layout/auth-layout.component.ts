import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  standalone: false,
  template: `
    <app-toast></app-toast>

    <div class="auth-layout-container">
      <!-- Top Corner Theme Switcher -->
      <div class="auth-theme-corner">
        <app-theme-toggle [compact]="false"></app-theme-toggle>
      </div>

      <div class="auth-card-wrapper animate-fade-in">
        <!-- Brand Header -->
        <header class="auth-header">
          <div class="auth-logo-box">
            <img src="/logo.png" alt="vaultOne Logo" class="auth-logo-img" />
          </div>
          <h1 class="auth-brand-title">vaultOne</h1>
          <p class="auth-brand-tagline">Enterprise Core Banking Platform</p>
        </header>

        <!-- Routed Content (Login, Register, Password Reset) -->
        <div class="auth-body">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-layout-container {
      position: relative;
      min-height: 100vh;
      background-color: var(--color-bg-base);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6) var(--space-4);
      transition: background-color var(--transition-fast);
    }
    .auth-theme-corner {
      position: absolute;
      top: var(--space-5);
      right: var(--space-6);
      z-index: 10;
    }
    .auth-card-wrapper {
      max-width: 480px;
      width: 100%;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-card);
      padding: var(--space-8);
      box-shadow: var(--shadow-modal);
    }
    .auth-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: var(--space-6);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .auth-logo-box {
      width: 54px;
      height: 54px;
      border-radius: var(--radius-button);
      background-color: #ffffff;
      border: 1px solid var(--color-border-default);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-3);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      padding: 4px;
    }
    .auth-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .auth-brand-title {
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .auth-brand-tagline {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: 4px;
    }
    .auth-body {
      margin-bottom: var(--space-6);
    }
    .auth-footer {
      text-align: center;
      font-size: 11px;
      color: var(--color-text-muted);
      letter-spacing: 0.02em;
    }
  `]
})
export class AuthLayoutComponent {}
