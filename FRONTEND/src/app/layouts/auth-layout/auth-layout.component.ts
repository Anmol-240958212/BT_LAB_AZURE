import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  standalone: false,
  template: `
    <app-toast></app-toast>

    <div class="auth-layout-container">
      <!-- Top Left Back to Home Button -->
      <div class="auth-home-corner">
        <a routerLink="/" class="back-home-btn" id="auth-back-home-btn" title="Return to Home Page">
          <app-icon name="arrow-left" [size]="14"></app-icon>
          <span>Back to Home</span>
        </a>
      </div>

      <!-- Top Corner Theme Switcher -->
      <div class="auth-theme-corner">
        <app-theme-toggle [compact]="false"></app-theme-toggle>
      </div>

      <div class="auth-card-wrapper animate-fade-in">
        <!-- Brand Header (clickable to home) -->
        <header class="auth-header">
          <a routerLink="/" class="auth-brand-link" title="Return to Home Page">
            <div class="auth-logo-box">
              <img src="/logo.png" alt="vaultOne Logo" class="auth-logo-img" />
            </div>
            <h1 class="auth-brand-title">vaultOne</h1>
            <p class="auth-brand-tagline">Enterprise Core Banking Platform</p>
          </a>
        </header>

        <!-- Routed Content (Login, Register, Password Reset) -->
        <div class="auth-body">
          <router-outlet></router-outlet>
        </div>

        <!-- Card Footer Return to Home link -->
        <div class="auth-card-footer">
          <a routerLink="/" class="card-home-link" id="auth-card-home-link" title="Return to Home Page">
            <app-icon name="home" [size]="14"></app-icon>
            <span>Back to Home Page</span>
          </a>
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
    .auth-home-corner {
      position: absolute;
      top: var(--space-5);
      left: var(--space-6);
      z-index: 10;
    }
    .back-home-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-text-secondary);
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-button);
      text-decoration: none;
      transition: all var(--transition-fast);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .back-home-btn:hover {
      color: var(--color-text-primary);
      background-color: var(--color-bg-hover);
      border-color: var(--color-border-focus);
      transform: translateX(-2px);
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
    .auth-brand-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }
    .auth-brand-link:hover .auth-brand-title {
      color: var(--color-accent);
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
      transition: color var(--transition-fast);
    }
    .auth-brand-tagline {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: 4px;
    }
    .auth-body {
      margin-bottom: var(--space-4);
    }
    .auth-card-footer {
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
      display: flex;
      justify-content: center;
    }
    .card-home-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-decoration: none;
      transition: all var(--transition-fast);
      padding: 6px 12px;
      border-radius: var(--radius-input);
    }
    .card-home-link:hover {
      color: var(--color-accent);
      background-color: var(--color-bg-hover);
    }
    @media (max-width: 640px) {
      .auth-layout-container {
        padding-top: calc(var(--space-8) + 30px);
      }
      .auth-home-corner {
        top: var(--space-3);
        left: var(--space-3);
      }
      .auth-theme-corner {
        top: var(--space-3);
        right: var(--space-3);
      }
    }
  `]
})
export class AuthLayoutComponent {}
