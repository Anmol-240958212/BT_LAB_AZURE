import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: false,
  template: `
    <div *ngIf="isOpen" class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-content" role="dialog" [attr.aria-label]="title || 'Modal Dialog'">
        <div class="modal-header">
          <div class="header-titles">
            <h3 *ngIf="title" class="modal-title">{{ title }}</h3>
            <p *ngIf="subtitle" class="modal-subtitle">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            (click)="close()"
            aria-label="Close dialog"
          >
            <app-icon name="x" [size]="14"></app-icon>
          </button>
        </div>

        <div class="modal-body">
          <ng-content></ng-content>
        </div>

        <div class="modal-footer-slot">
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: var(--space-4);
      margin-bottom: var(--space-5);
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .modal-title {
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .modal-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin-top: 2px;
    }
    .modal-close-btn {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: var(--text-md);
      padding: 4px 8px;
      border-radius: var(--radius-button);
      transition: color var(--transition-fast), background var(--transition-fast);
    }
    .modal-close-btn:hover {
      color: var(--color-text-primary);
      background-color: var(--color-bg-hover);
    }
    .modal-body {
      margin-bottom: var(--space-5);
    }
    .modal-footer-slot:not(:empty) {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }
  `]
})
export class AppModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';

  @Output() closeModal = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeHandler(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  close(): void {
    this.closeModal.emit();
  }
}
