import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fdStatus',
  standalone: false
})
export class FdStatusPipe implements PipeTransform {
  private readonly statusMap: Record<string, string> = {
    ACTIVE: 'Active',
    CLOSED: 'Closed / Liquidated',
    PENDING: 'Pending Verification',
    MATURED: 'Matured',
    REINVESTED: 'Auto-Renewed',
    CANCELLED: 'Cancelled'
  };

  transform(status: string | null | undefined): string {
    if (!status) return '—';
    const upper = status.trim().toUpperCase();
    return this.statusMap[upper] || upper;
  }
}
