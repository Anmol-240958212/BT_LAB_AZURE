import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { UserApiService } from '../../../core/api/user-api.service';
import { AuthState } from '../../../core/models/auth.models';

@Component({
  selector: 'app-topbar',
  standalone: false,
  template: `
    <header class="topbar">
      <!-- Left side: Platform indicator -->
      <div class="topbar-left">
        <span class="system-indicator">
          <span class="status-pulse"></span>
          vaultOne Core Platform • Online
        </span>
      </div>

      <!-- Right side: User Session info -->
      <div class="topbar-right">
        <ng-container *ngIf="authState?.isAuthenticated; else guestTpl">
          <!-- User info -->
          <div class="user-meta">
            <span class="user-greeting">{{ 'nav.welcome' | transloco }}</span>
            <span class="username" id="topbar-username" [title]="authState?.username || ''">{{ displayName }}</span>
          </div>

          <!-- Role Badge -->
          <app-badge
            variant="role"
            [text]="authState?.role || 'CUSTOMER'"
            [showDot]="true"
          ></app-badge>

          <!-- Logout Button -->
          <button
            type="button"
            class="btn btn-ghost btn-sm logout-btn"
            id="topbar-logout-btn"
            (click)="onLogout()"
            [title]="'nav.signOut' | transloco"
          >
            <span>{{ 'nav.signOut' | transloco }}</span>
            <app-icon name="log-out" [size]="14" class="logout-icon"></app-icon>
          </button>
        </ng-container>

        <!-- Guest template -->
        <ng-template #guestTpl>
          <a routerLink="/login" class="btn btn-primary btn-sm" id="topbar-login-btn">
            {{ 'nav.signIn' | transloco }}
          </a>
          <a routerLink="/register" class="btn btn-secondary btn-sm" id="topbar-register-btn">
            {{ 'nav.register' | transloco }}
          </a>
        </ng-template>

        <app-language-toggle></app-language-toggle>

      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: var(--topbar-height);
      background-color: var(--color-bg-surface);
      border-bottom: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-6);
      position: sticky;
      top: 0;
      z-index: 90;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .system-indicator {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      letter-spacing: 0.02em;
    }
    .status-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--color-success);
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .user-meta {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
    }
    .user-greeting {
      color: var(--color-text-muted);
    }
    .username {
      color: var(--color-text-primary);
      font-weight: 500;
    }
    .btn-sm {
      padding: 5px 12px;
      font-size: var(--text-xs);
    }
    .logout-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .logout-icon {
      font-size: 14px;
    }
  `]
})
export class AppTopbarComponent implements OnInit, OnDestroy {
  authState: AuthState | null = null;
  private profileLoadedFor = '';
  private sub?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.authState$.subscribe(state => {
      this.authState = state;
      if (state?.isAuthenticated && state.username && this.profileLoadedFor !== state.username) {
        this.profileLoadedFor = state.username;
        this.userApi.getMe().subscribe({
          next: user => {
            const profileName = user.fullName || [user.firstName, user.lastName]
              .filter(Boolean)
              .join(' ');
            this.authService.setDisplayName(profileName);
          },
          error: () => {}
        });
      } else if (!state?.isAuthenticated) {
        this.profileLoadedFor = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get displayName(): string {
    return this.authState?.displayName || (this.authState?.username ? this.authService.getDisplayName(this.authState.username) : 'User');
  }

}
