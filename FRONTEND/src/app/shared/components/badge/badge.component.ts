import { Component, Input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type BadgeVariant = 'active' | 'closed' | 'pending' | 'role' | 'info' | 'warning';

@Component({
  selector: 'app-badge',
  standalone: false,
  template: `
    <span [class]="'badge badge-' + variant">
      <span *ngIf="showDot" class="badge-dot"></span>
      <ng-content></ng-content>
      {{ localizedText }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }
    .badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: currentColor;
    }
    .badge-info {
      background-color: rgba(74, 110, 124, 0.25);
      color: #92bfd1;
      border: 1px solid var(--color-info);
    }
    .badge-warning {
      background-color: rgba(138, 112, 64, 0.25);
      color: #dfc491;
      border: 1px solid var(--color-warning);
    }
  `]
})
export class AppBadgeComponent {
  @Input() variant: BadgeVariant = 'role';
  @Input() text = '';
  @Input() showDot = true;

  constructor(private readonly transloco: TranslocoService) {}

  get localizedText(): string {
    const normalized = this.text.trim().toLowerCase().replace(/[ /-]+/g, '_');
    const known: Record<string, string> = {
      active: 'status.active',
      closed: 'status.closed',
      closed_liquidated: 'status.closed',
      pending: 'status.pending',
      credited: 'status.credited',
      growing: 'status.growing',
      locked: 'status.locked',
      customer: 'role.customer',
      bank_officer: 'role.bankOfficer',
      admin: 'role.admin',
      staff: 'role.staff'
    };
    return known[normalized] ? this.transloco.translate(known[normalized]) : this.text;
  }
}
