import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: false,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="color"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="feather-icon"
      [ngSwitch]="normalizedName"
    >
      <!-- Dashboard / Grid -->
      <ng-container *ngSwitchCase="'dashboard'">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </ng-container>

      <!-- Coins / Fixed Deposits -->
      <ng-container *ngSwitchCase="'coins'">
        <circle cx="8" cy="8" r="6" />
        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        <path d="M7 6h1v4" />
        <path d="m16.71 13.88.7.71-2.82 2.82" />
      </ng-container>

      <ng-container *ngSwitchCase="'vault'">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </ng-container>

      <!-- Calculator -->
      <ng-container *ngSwitchCase="'calculator'">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="16" x2="16" y1="14" y2="18" />
        <path d="M16 10h.01" />
        <path d="M12 10h.01" />
        <path d="M8 10h.01" />
        <path d="M12 14h.01" />
        <path d="M8 14h.01" />
        <path d="M12 18h.01" />
        <path d="M8 18h.01" />
      </ng-container>

      <!-- User / Profile -->
      <ng-container *ngSwitchCase="'user'">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </ng-container>

      <!-- Users -->
      <ng-container *ngSwitchCase="'users'">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </ng-container>

      <!-- Clipboard / List -->
      <ng-container *ngSwitchCase="'clipboard'">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M12 11h4" />
        <path d="M12 16h4" />
        <path d="M8 11h.01" />
        <path d="M8 16h.01" />
      </ng-container>

      <!-- Plus / Add -->
      <ng-container *ngSwitchCase="'plus'">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </ng-container>

      <ng-container *ngSwitchCase="'plus-circle'">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </ng-container>

      <!-- Transactions / Exchange -->
      <ng-container *ngSwitchCase="'exchange'">
        <path d="m16 3 4 4-4 4" />
        <path d="M20 7H4" />
        <path d="m8 21-4-4 4-4" />
        <path d="M4 17h16" />
      </ng-container>

      <!-- Zap / Lightning / Batch -->
      <ng-container *ngSwitchCase="'zap'">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </ng-container>

      <!-- Shield / Security -->
      <ng-container *ngSwitchCase="'shield'">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </ng-container>

      <!-- Bar Chart / Analytics -->
      <ng-container *ngSwitchCase="'bar-chart'">
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </ng-container>

      <!-- Sun -->
      <ng-container *ngSwitchCase="'sun'">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </ng-container>

      <!-- Moon -->
      <ng-container *ngSwitchCase="'moon'">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </ng-container>

      <!-- Monitor / System -->
      <ng-container *ngSwitchCase="'monitor'">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </ng-container>

      <!-- Chevron Down -->
      <ng-container *ngSwitchCase="'chevron-down'">
        <path d="m6 9 6 6 6-6" />
      </ng-container>

      <!-- Check -->
      <ng-container *ngSwitchCase="'check'">
        <polyline points="20 6 9 17 4 12" />
      </ng-container>

      <!-- Lock -->
      <ng-container *ngSwitchCase="'lock'">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </ng-container>

      <!-- Alert Triangle / Warning -->
      <ng-container *ngSwitchCase="'alert-triangle'">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </ng-container>

      <!-- Info -->
      <ng-container *ngSwitchCase="'info'">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="16" y2="12" />
        <line x1="12" x2="12.01" y1="8" y2="8" />
      </ng-container>

      <!-- Mail -->
      <ng-container *ngSwitchCase="'mail'">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </ng-container>

      <!-- Package / Box -->
      <ng-container *ngSwitchCase="'package'">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </ng-container>

      <!-- Folder -->
      <ng-container *ngSwitchCase="'folder'">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </ng-container>

      <!-- Log Out -->
      <ng-container *ngSwitchCase="'log-out'">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
      </ng-container>

      <!-- X / Close -->
      <ng-container *ngSwitchCase="'x'">
        <path d="M18 6 6 18" />
        <path d="M6 6l12 12" />
      </ng-container>

      <!-- Refresh -->
      <ng-container *ngSwitchCase="'refresh'">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
      </ng-container>

      <!-- Arrow Left -->
      <ng-container *ngSwitchCase="'arrow-left'">
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </ng-container>

      <!-- Home -->
      <ng-container *ngSwitchCase="'home'">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </ng-container>

      <!-- Arrow Right -->
      <ng-container *ngSwitchCase="'arrow-right'">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </ng-container>

      <!-- Arrow Up Right -->
      <ng-container *ngSwitchCase="'arrow-up-right'">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </ng-container>

      <!-- Search -->
      <ng-container *ngSwitchCase="'search'">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </ng-container>

      <!-- Eye / Password Visibility -->
      <ng-container *ngSwitchCase="'eye'">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </ng-container>

      <ng-container *ngSwitchCase="'eye-off'">
        <path d="m3 3 18 18" />
        <path d="M10.6 6.2A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a18.5 18.5 0 0 1-3.2 3.7" />
        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6c1.1 0 2.1-.2 3-.5" />
      </ng-container>

      <!-- Bell -->
      <ng-container *ngSwitchCase="'bell'">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </ng-container>

      <!-- Trending Up -->
      <ng-container *ngSwitchCase="'trending-up'">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </ng-container>

      <!-- Smartphone -->
      <ng-container *ngSwitchCase="'smartphone'">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <line x1="12" x2="12.01" y1="18" y2="18" />
      </ng-container>

      <!-- Pie Chart -->
      <ng-container *ngSwitchCase="'pie-chart'">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </ng-container>

      <!-- Menu / Hamburger -->
      <ng-container *ngSwitchCase="'menu'">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </ng-container>

      <!-- Award / Star -->
      <ng-container *ngSwitchCase="'award'">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </ng-container>

      <!-- Database -->
      <ng-container *ngSwitchCase="'database'">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5V19A9 3 0 0 0 21 19V5" />
        <path d="M3 12A9 3 0 0 0 21 12" />
      </ng-container>

      <!-- Edit / Pencil -->
      <ng-container *ngSwitchCase="'edit'">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </ng-container>

      <!-- Check Circle -->
      <ng-container *ngSwitchCase="'check-circle'">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </ng-container>

      <!-- Shield Check -->
      <ng-container *ngSwitchCase="'shield-check'">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </ng-container>

      <!-- Volume 2 (Unmuted) -->
      <ng-container *ngSwitchCase="'volume-2'">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </ng-container>

      <!-- Volume X (Muted) -->
      <ng-container *ngSwitchCase="'volume-x'">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </ng-container>

      <!-- Skip Forward -->
      <ng-container *ngSwitchCase="'skip-forward'">
        <polygon points="5 4 15 12 5 20 5 4" />
        <line x1="19" y1="5" x2="19" y2="19" />
      </ng-container>

      <!-- Skip Back -->
      <ng-container *ngSwitchCase="'skip-back'">
        <polygon points="19 20 9 12 19 4 19 20" />
        <line x1="5" y1="19" x2="5" y2="5" />
      </ng-container>

      <!-- Default Fallback -->
      <ng-container *ngSwitchDefault>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </ng-container>
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
      flex-shrink: 0;
    }
    .feather-icon {
      display: block;
      transition: stroke var(--transition-fast, 150ms ease);
    }
  `]
})
export class AppIconComponent {
  @Input() name = '';
  @Input() size: number | string = 16;
  @Input() strokeWidth: number | string = 2;
  @Input() color = 'currentColor';

  get normalizedName(): string {
    const raw = (this.name || '').trim().toLowerCase();
    switch (raw) {
      case 'dashboard':
      case 'layout-dashboard':
      case 'grid':
      case '⊞':
        return 'dashboard';
      case 'coins':
      case 'fixed-deposits':
      case 'fixed-deposit':
      case 'deposit':
      case 'coin':
      case '🪙':
        return 'coins';
      case 'clipboard':
      case 'clipboard-list':
      case 'list':
      case 'accounts':
      case '📋':
        return 'clipboard';
      case 'plus':
      case 'create':
      case 'add':
      case '➕':
        return 'plus';
      case 'plus-circle':
        return 'plus-circle';
      case 'calculator':
      case 'calc':
      case '🧮':
        return 'calculator';
      case 'exchange':
      case 'transactions':
      case 'transfer':
      case 'arrows':
      case '⇄':
        return 'exchange';
      case 'users':
      case 'customers':
      case 'group':
      case '👥':
        return 'users';
      case 'user':
      case 'profile':
      case 'kyc':
      case '👤':
        return 'user';
      case 'zap':
      case 'batch':
      case 'lightning':
      case '⚡':
        return 'zap';
      case 'shield':
      case 'security':
      case 'employees':
      case 'admin':
      case '🛡️':
      case '🛡':
        return 'shield';
      case 'bar-chart':
      case 'analytics':
      case 'reports':
      case 'chart':
      case '📊':
        return 'bar-chart';
      case 'sun':
      case 'light':
      case '☀️':
      case '☀':
        return 'sun';
      case 'moon':
      case 'dark':
      case '🌙':
        return 'moon';
      case 'monitor':
      case 'system':
      case 'auto':
      case 'laptop':
      case 'computer':
      case '💻':
        return 'monitor';
      case 'chevron-down':
      case 'down':
      case '▾':
      case '▼':
        return 'chevron-down';
      case 'check':
      case 'tick':
      case '✓':
      case '✔':
        return 'check';
      case 'lock':
      case 'secure':
      case 'restricted':
      case '🔒':
        return 'lock';
      case 'alert-triangle':
      case 'alert':
      case 'warning':
      case 'warn':
      case '⚠️':
      case '⚠':
        return 'alert-triangle';
      case 'info':
      case 'information':
      case 'ℹ':
      case 'ℹ️':
        return 'info';
      case 'mail':
      case 'email':
      case 'envelope':
      case '✉️':
      case '✉':
      case '📧':
        return 'mail';
      case 'package':
      case 'box':
      case 'settlement':
      case '📦':
        return 'package';
      case 'folder':
      case 'empty':
      case 'directory':
      case '📂':
        return 'folder';
      case 'log-out':
      case 'logout':
      case 'signout':
      case 'sign-out':
      case '⎋':
        return 'log-out';
      case 'x':
      case 'close':
      case 'cancel':
      case '✕':
      case '✖':
        return 'x';
      case 'refresh':
      case 'reload':
        return 'refresh';
      case 'arrow-left':
      case 'back':
      case 'prev':
      case '←':
        return 'arrow-left';
      case 'home':
      case 'house':
      case 'homepage':
      case '🏠':
        return 'home';
      case 'arrow-right':
        return 'arrow-right';
      case 'arrow-up-right':
      case 'external-link':
      case '↗':
        return 'arrow-up-right';
      case 'search':
      case 'find':
      case '🔍':
        return 'search';
      case 'bell':
      case 'notification':
      case 'alert-bell':
      case '🔔':
        return 'bell';
      case 'trending-up':
      case 'trend':
      case 'growth':
      case '📈':
        return 'trending-up';
      case 'smartphone':
      case 'mobile':
      case 'phone':
      case '📱':
        return 'smartphone';
      case 'pie-chart':
      case 'pie':
        return 'pie-chart';
      case 'menu':
      case 'hamburger':
      case '☰':
        return 'menu';
      case 'award':
      case 'badge-star':
      case 'star':
      case '⭐':
        return 'award';
      case 'database':
      case 'storage':
        return 'database';
      case 'volume':
      case 'volume-2':
      case 'sound':
      case 'unmute':
      case 'speaker':
      case '🔊':
        return 'volume-2';
      case 'volume-x':
      case 'mute':
      case 'muted':
      case 'silent':
      case '🔇':
        return 'volume-x';
      case 'skip-forward':
      case 'next':
      case 'skip':
      case '⏭':
        return 'skip-forward';
      case 'skip-back':
      case 'prev-video':
      case 'previous':
      case '⏮':
        return 'skip-back';
      case 'edit':
      case 'pencil':
      case 'modify':
      case '✏️':
        return 'edit';
      case 'check-circle':
      case 'verified':
      case 'tick-circle':
        return 'check-circle';
      case 'shield-check':
      case 'secure-check':
        return 'shield-check';
      default:
        return raw;
    }
  }
}
