import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: false,
  template: `
    <div class="card" [class.card-interactive]="interactive">
      <div *ngIf="title || subtitle || hasHeaderAction" class="card-header">
        <div class="header-text">
          <h3 *ngIf="title" class="card-title">{{ title }}</h3>
          <p *ngIf="subtitle" class="card-subtitle">{{ subtitle }}</p>
        </div>
        <div class="header-action">
          <ng-content select="[card-action]"></ng-content>
        </div>
      </div>

      <div class="card-body">
        <ng-content></ng-content>
      </div>

      <div class="card-footer-slot">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .card-interactive {
      cursor: pointer;
    }
    .header-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .header-action {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .card-footer-slot:not(:empty) {
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }
  `]
})
export class AppCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() interactive = false;
  @Input() hasHeaderAction = false;
}
