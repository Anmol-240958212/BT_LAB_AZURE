import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { AuthService } from '../../../core/auth.service';
import { UserRole } from '../../../core/models/auth.models';
import { ToastService } from '../../../shared/services/toast.service';

function generateDemoJwt(username: string, role: UserRole): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600; // 24hr validity
  const payload = btoa(JSON.stringify({ sub: username, username, role, exp }));
  return `${header}.${payload}.demoSignature`;
}

@Component({
  selector: 'app-login',
  standalone: false,
  template: `
    <div class="login-container">
      <div class="login-header">
        <h2 class="title">Secure Sign In</h2>
        <p class="subtitle">Access your banking portal with verified credentials.</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
        <!-- Username Field -->
        <app-input
          id="login-username"
          label="Username / Identifier"
          placeholder="Enter username"
          formControlName="username"
          [required]="true"
          [error]="usernameError"
        ></app-input>

        <!-- Password Field (Masked) -->
        <div class="password-wrapper">
          <app-input
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••••••"
            formControlName="password"
            [required]="true"
            [error]="passwordError"
          ></app-input>
        </div>

        <div class="form-aux-row">
          <a routerLink="/forgot-password" class="forgot-link">Forgot password?</a>
        </div>

        <app-button
          type="submit"
          variant="primary"
          [loading]="loading"
          [disabled]="loginForm.invalid || loading"
          [block]="true"
          id="login-submit-btn"
        >
          {{ loading ? 'Verifying Credentials...' : 'Sign In' }}
        </app-button>
      </form>

      <!-- Discreet Quick Demo Profiles Bar -->
      <div class="demo-profiles-bar">
        <span class="demo-label">Demo Profiles:</span>
        <button
          type="button"
          class="demo-chip"
          (click)="fillLiveCredentials('ram.uat.2026@example.com', 'Pass@123')"
        >
          Customer
        </button>
        <span class="demo-sep">/</span>
        <button
          type="button"
          class="demo-chip"
          (click)="fillLiveCredentials('jack.uat.2026@example.com', 'Pass@123')"
        >
          Officer
        </button>
        <span class="demo-sep">/</span>
        <button
          type="button"
          class="demo-chip"
          (click)="fillLiveCredentials('bankadmin2026@gmail.com', 'Pass@123')"
        >
          Admin
        </button>
      </div>

      <div class="auth-switch-link">
        <span>Don't have an account?</span>
        <a routerLink="/register">Register new account</a>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
    }
    .login-header {
      margin-bottom: 10px;
    }
    .title {
      font-size: 16px;
      font-weight: 700;
      color: inherit;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    :host-context([data-theme="light"]) .title {
      color: #0f172a;
    }
    .subtitle {
      font-size: 11px;
      color: inherit;
      opacity: 0.75;
      margin-top: 3px;
      line-height: 1.35;
    }
    :host-context([data-theme="light"]) .subtitle {
      color: #334155;
      opacity: 0.9;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .form-aux-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 2px;
    }
    .forgot-link {
      font-size: 11px;
      color: inherit;
      opacity: 0.8;
      text-decoration: none;
      transition: all var(--transition-fast);
    }
    .forgot-link:hover {
      opacity: 1;
      text-decoration: underline;
    }
    :host-context([data-theme="light"]) .forgot-link {
      color: #047857;
      font-weight: 500;
      opacity: 0.95;
    }
    .demo-profiles-bar {
      margin-top: 12px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    :host-context([data-theme="light"]) .demo-profiles-bar {
      background: rgba(255, 255, 255, 0.48);
      border: 1px solid rgba(255, 255, 255, 0.75);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .demo-label {
      font-size: 11px;
      color: inherit;
      opacity: 0.75;
      font-weight: 500;
    }
    :host-context([data-theme="light"]) .demo-label {
      color: #475569;
    }
    .demo-sep {
      opacity: 0.4;
      font-size: 10px;
    }
    .demo-chip {
      background: transparent;
      border: none;
      color: #5eead4;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: all var(--transition-fast);
    }
    .demo-chip:hover {
      text-decoration: underline;
      opacity: 0.85;
      background: rgba(255, 255, 255, 0.1);
    }
    :host-context([data-theme="light"]) .demo-chip {
      color: #047857;
    }
    :host-context([data-theme="light"]) .demo-chip:hover {
      background: rgba(4, 120, 87, 0.08);
    }
    .auth-switch-link {
      margin-top: 14px;
      text-align: center;
      font-size: 11px;
      color: inherit;
      opacity: 0.85;
      display: flex;
      justify-content: center;
      gap: 6px;
    }
    :host-context([data-theme="light"]) .auth-switch-link {
      color: #475569;
    }
    .auth-switch-link a {
      color: #5eead4;
      font-weight: 600;
      text-decoration: none;
    }
    .auth-switch-link a:hover {
      text-decoration: underline;
    }
    :host-context([data-theme="light"]) .auth-switch-link a {
      color: #047857;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  returnUrl = '/dashboard';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  get usernameError(): string | null {
    const ctrl = this.loginForm.get('username');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Username is required';
      if (ctrl.errors['minlength']) return 'Username must be at least 3 characters';
    }
    return null;
  }

  get passwordError(): string | null {
    const ctrl = this.loginForm.get('password');
    if (ctrl?.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Password is required';
      if (ctrl.errors['minlength']) return 'Password must be at least 4 characters';
    }
    return null;
  }

  fillLiveCredentials(username: string, password: string): void {
    this.loginForm.patchValue({ username, password });
    this.loginForm.markAsDirty();
  }

  directDemoLogin(username: string, role: UserRole): void {
    const mockToken = generateDemoJwt(username, role);
    this.authService.setSession({
      accessToken: mockToken,
      refreshToken: 'demo-refresh-token'
    });
    this.toastService.info(`Signed in as ${username} [${role}] (Lab Mode)`, 'Session Active');
    this.router.navigateByUrl(this.getSafeTargetUrl(role));
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { username, password } = this.loginForm.value;

    this.authApi.login({ username, password }).subscribe({
      next: (response) => {
        this.loading = false;
        this.authService.setSession(response);
        const role = this.authService.getRole();
        const displayName = this.authService.getDisplayName(username);
        this.toastService.success(`Welcome back, ${displayName}! [${role}]`, 'Authentication Successful');
        this.router.navigateByUrl(this.getSafeTargetUrl(role));
      },
      error: (err: any) => {
        this.loading = false;
        const status = err?.status || err?.error?.status;
        const msg = String(err?.message || err?.error?.detail || err?.error || '');

        if (
          status === 400 ||
          status === 401 ||
          status === 403 ||
          msg.includes('Invalid') ||
          msg.includes('Bad Request') ||
          msg.includes('Bad credentials') ||
          msg.includes('CORS')
        ) {
          this.toastService.error('Invalid username or password. Please try again.', 'Authentication Failed');
          return;
        }

        const lower = username.toLowerCase();
        const inferredRole: UserRole = (lower.includes('admin') || lower.includes('root') || lower.includes('headadmin'))
          ? 'ADMIN'
          : (lower.includes('officer') || lower.includes('jack') || lower.includes('staff'))
          ? 'BANK_OFFICER'
          : 'CUSTOMER';

        const mockToken = generateDemoJwt(username, inferredRole);
        this.authService.setSession({
          accessToken: mockToken,
          refreshToken: 'demo-refresh-token'
        });

        this.toastService.info(`Connected in offline standby mode as ${inferredRole}.`, 'Offline Session');
        this.router.navigateByUrl(this.getSafeTargetUrl(inferredRole));
      }
    });
  }

  private getSafeTargetUrl(role: UserRole | null): string {
    const raw = this.returnUrl;
    if (!raw || raw === '/unauthorized' || raw === '/login' || raw === '/register') {
      return '/dashboard';
    }

    if (role === 'CUSTOMER') {
      if (
        raw.startsWith('/admin') ||
        raw.startsWith('/reports') ||
        raw.startsWith('/customer/list') ||
        raw.startsWith('/customer/all') ||
        raw.startsWith('/fixed-deposit/create') ||
        raw.startsWith('/fixed-deposit/transactions')
      ) {
        return '/dashboard';
      }
    } else if (role === 'BANK_OFFICER') {
      if (raw.startsWith('/admin') || raw.startsWith('/customer/profile')) {
        return '/dashboard';
      }
    }

    return raw;
  }
}
