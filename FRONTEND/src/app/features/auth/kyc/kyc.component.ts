import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-kyc',
  standalone: false,
  template: `
    <div class="kyc-container">
      <div class="kyc-header"><h2 class="title">KYC Verification</h2><p class="subtitle">Complete your profile to proceed.</p></div>
      <p>Redirecting to customer profile / account setup after login...</p>
      <app-button type="button" variant="primary" [block]="true" (click)="goToProfile()">Go to Profile</app-button>
    </div>
  `,
  styles: [`
    .kyc-container { display: flex; flex-direction: column; padding: 16px; gap: 12px; }
    .kyc-header { margin-bottom: 4px; }
    .title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
    .subtitle { font-size: 11px; color: var(--color-text-secondary); }
  `]
})
export class KycComponent implements OnInit {
  constructor(private readonly router: Router, private readonly authApi: AuthApiService, private readonly toastService: ToastService) {}
  ngOnInit(): void {}
  goToProfile(): void { this.router.navigate(['/customer/profile']); }
}
