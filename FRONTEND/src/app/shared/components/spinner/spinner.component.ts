import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: false,
  template: `
    <div class="spinner-container" [class.center-container]="centered">
      <div [class]="'spinner spinner-' + size"></div>
      <span *ngIf="message" class="spinner-message">{{ message }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .spinner-container {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
    }
    .center-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-6);
      width: 100%;
    }
    .spinner {
      border-radius: 50%;
      border: 2px solid var(--color-border-default);
      border-top-color: var(--color-accent);
      animation: spin 700ms linear infinite;
    }
    .spinner-sm {
      width: 14px;
      height: 14px;
      border-width: 2px;
    }
    .spinner-md {
      width: 24px;
      height: 24px;
      border-width: 2px;
    }
    .spinner-lg {
      width: 36px;
      height: 36px;
      border-width: 3px;
    }
    .spinner-message {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AppSpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() message = '';
  @Input() centered = false;
}
