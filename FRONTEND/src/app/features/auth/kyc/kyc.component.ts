import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../core/auth.service';
import { AuthState } from '../../../core/models/auth.models';

interface Notification {
  id: string;
  message: string;
  type: 'warning' | 'info';
  persistent: boolean;
  timestamp: number;
}

@Component({
  selector: 'app-kyc',
  standalone: false,
  template: `
    <div class="kyc-container">
      <div class="kyc-header"><h2 class="title">KYC Verification Required</h2><p class="subtitle">Please complete your KYC verification to access the platform.</p></div>

      <div class="kyc-content">
        <div class="kyc-warning-box">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <h3>KYC Verification Required</h3>
            <p>You need to complete your Know Your Customer (KYC) verification before accessing any other features. This is required for regulatory compliance.</p>
          </div>
        </div>

        <div class="kyc-steps">
          <h3>What you need to complete:</h3>
          <ul>
            <li>✅ Provide your full legal name</li>
            <li>✅ Upload government-issued ID (passport or national ID)</li>
            <li>✅ Provide proof of address (utility bill or bank statement)</li>
            <li>✅ Answer basic financial background questions</li>
          </ul>
        </div>

        <div class="kyc-actions">
          <button type="button" class="btn btn-primary btn-block" (click)="proceedToProfile()">Proceed to KYC Verification</button>
        </div>
      </div>

      <div class="kyc-notifications-container" *ngIf="notifications.length > 0">
        <div class="notification" *ngFor="let notification of notifications" [class.warning]="notification.type === 'warning'">
          <div class="notification-content">
            <div class="notification-icon">⚠️</div>
            <div class="notification-message">
              <strong>{{ notification.message }}</strong>
              <p>Complete your KYC verification now to access all features.</p>
            </div>
          </div>
          <button class="close-notification" (click)="removeNotification(notification.id)">×</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kyc-container {
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .kyc-header { margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 600; color: var(--color-text-primary); }
    .subtitle { font-size: 13px; color: var(--color-text-secondary); }

    .kyc-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .kyc-warning-box {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      align-items: flex-start;
    }

    .warning-icon {
      font-size: 24px;
      color: #f59e0b;
      flex-shrink: 0;
    }

    .warning-text h3 {
      margin: 0 0 8px 0;
      color: #92400e;
      font-size: 16px;
    }

    .warning-text p {
      margin: 0;
      color: #78350f;
      font-size: 14px;
      line-height: 1.5;
    }

    .kyc-steps {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .kyc-steps h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: var(--color-text-primary);
    }

    .kyc-steps ul {
      margin: 0;
      padding-left: 20px;
      color: var(--color-text-secondary);
    }

    .kyc-steps li {
      margin-bottom: 8px;
      font-size: 14px;
    }

    .kyc-actions {
      margin-top: 16px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-block {
      width: 100%;
    }

    .kyc-notifications-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 1000;
    }

    .notification {
      background: white;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease;
    }

    .notification.warning {
      border-left-color: #f59e0b;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification-content {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .notification-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .notification-message strong {
      display: block;
      margin-bottom: 4px;
      color: #92400e;
    }

    .notification-message p {
      margin: 0;
      font-size: 13px;
      color: #6b7280;
    }

    .close-notification {
      float: right;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #9ca3af;
      margin-top: -4px;
    }

    .close-notification:hover {
      color: #ef4444;
    }
  `]
})
export class KycComponent implements OnInit {
  notifications: Notification[] = [];

  constructor(
    private readonly router: Router,
    private readonly authApi: AuthApiService,
    private readonly toastService: ToastService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user came from registration (from session storage)
    const redirectFromSession = sessionStorage.getItem('redirectToKYC');
    if (redirectFromSession) {
      sessionStorage.removeItem('redirectToKYC');
      this.showNotification('Registration Complete - KYC Required',
        'You have successfully registered. Please complete KYC verification to activate your account.');
    }

    // Set up persistent notification system
    this.setupPersistentNotifications();

    // Initialize auth state listener
    this.authService.authState$.subscribe((state: AuthState) => {
      if (state && state.needsKyc && state.isAuthenticated) {
        this.showPersistentKycNotification();
      }
    });

    // Show initial notification if user needs KYC
    this.checkAndShowKycNotification();
  }

  proceedToProfile(): void {
    // Mark KYC as started
    sessionStorage.setItem('kycStarted', 'true');
    // Navigate to the customer profile page (KYC happens inline there)
    this.router.navigate(['/customer/profile']);
  }

  private setupPersistentNotifications(): void {
    // Show persistent notification after every 30 seconds if KYC not completed
    setInterval(() => {
      this.checkAndShowKycNotification();
    }, 30000); // 30 seconds
  }

  private checkAndShowKycNotification(): void {
    const kycCompleted = localStorage.getItem('kycCompleted') === 'true';
    if (!kycCompleted) {
      this.showPersistentKycNotification();
    }
  }

  private showPersistentKycNotification(): void {
    const notification: Notification = {
      id: Date.now().toString(),
      message: '⚠️ KYC Verification Required - Please complete your KYC to access all features',
      type: 'warning',
      persistent: true,
      timestamp: Date.now()
    };

    // Remove any existing KYC notifications
    this.notifications = this.notifications.filter(n => n.message.includes('KYC'));
    this.notifications.push(notification);
  }

  public showNotification(message: string, detail?: string): void {
    const notification: Notification = {
      id: Date.now().toString(),
      message: message,
      type: 'warning',
      persistent: false,
      timestamp: Date.now()
    };

    this.notifications.push(notification);

    // Auto-remove non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, 5000);
    }
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  markKycCompleted(): void {
    localStorage.setItem('kycCompleted', 'true');
    // Remove all KYC notifications when completed
    this.notifications = this.notifications.filter(n => !n.message.includes('KYC'));

    // Update auth service to reflect KYC completion
    this.authService.markKycCompleted();

    this.toastService.show('KYC verification completed successfully! You now have full access to all features.', 'success', undefined, 5000);
  }
}
