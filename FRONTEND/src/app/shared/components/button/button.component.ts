import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'app-button',
  standalone: false,
  template: `
    <button
      [type]="type"
      [id]="id"
      [disabled]="disabled || loading"
      [class]="'btn btn-' + variant + (block ? ' btn-block' : '')"
      (click)="onClick($event)"
    >
      <span *ngIf="loading" class="btn-spinner"></span>
      <span [class.btn-content-hidden]="loading">
        <ng-content></ng-content>
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    :host(.block-btn) {
      display: block;
      width: 100%;
    }
    .btn-block {
      width: 100%;
    }
    .btn-content-hidden {
      visibility: hidden;
    }
    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 600ms linear infinite;
      position: absolute;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AppButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() id = '';
  @Input() block = false;

  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
