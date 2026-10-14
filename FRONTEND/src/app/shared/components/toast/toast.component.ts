import { Component } from '@angular/core';
import { ToastMessage, ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: false,
  template: `
    <div class="toast-viewport" role="region" aria-label="Notifications">
      <div
        *ngFor="let toast of toastService.toasts$ | async; trackBy: trackById"
        [class]="'toast-card toast-' + toast.type"
        role="alert"
      >
        <div class="toast-indicator"></div>
        <div class="toast-body">
          <div *ngIf="toast.title" class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button
          type="button"
          class="toast-close"
          (click)="toastService.dismiss(toast.id)"
          aria-label="Close notification"
        >
          <app-icon name="x" [size]="12"></app-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-viewport {
      position: fixed;
      top: var(--space-6);
      right: var(--space-6);
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      max-width: 380px;
      width: calc(100% - 32px);
      pointer-events: none;
    }
    .toast-card {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      background-color: var(--color-bg-elevated);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-card);
      padding: var(--space-3) var(--space-4);
      box-shadow: var(--shadow-modal);
      animation: slideIn 200ms ease-out;
      position: relative;
      overflow: hidden;
    }
    .toast-indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }
    .toast-success .toast-indicator { background-color: var(--color-success); }
    .toast-error .toast-indicator { background-color: var(--color-error); }
    .toast-warning .toast-indicator { background-color: var(--color-warning); }
    .toast-info .toast-indicator { background-color: var(--color-info); }

    .toast-body {
      flex: 1;
      padding-left: var(--space-2);
    }
    .toast-title {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 2px;
    }
    .toast-message {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.4;
    }
    .toast-close {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: var(--text-sm);
      padding: 0 4px;
      margin-left: var(--space-2);
      transition: color var(--transition-fast);
    }
    .toast-close:hover {
      color: var(--color-text-primary);
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class AppToastComponent {
  constructor(public readonly toastService: ToastService) {}

  trackById(_: number, toast: ToastMessage): string {
    return toast.id;
  }
}
