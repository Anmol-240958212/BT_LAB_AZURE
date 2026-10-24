import { Pipe, PipeTransform } from '@angular/core';

export type MaskType = 'email' | 'phone' | 'id' | 'account';

@Pipe({
  name: 'mask',
  standalone: false
})
export class MaskPipe implements PipeTransform {
  transform(value: string | number | null | undefined, type: MaskType = 'email'): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const str = String(value).trim();

    switch (type) {
      case 'email':
        return this.maskEmail(str);
      case 'phone':
        return this.maskPhone(str);
      case 'id':
        return this.maskId(str);
      case 'account':
        return this.maskAccount(str);
      default:
        return str;
    }
  }

  private maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex <= 1) return email;

    const user = email.substring(0, atIndex);
    const domain = email.substring(atIndex);

    if (user.length <= 2) {
      return `${user.charAt(0)}***${domain}`;
    }
    return `${user.substring(0, 2)}***${domain}`;
  }

  private maskPhone(phone: string): string {
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean.length < 6) return phone;

    const lastTwo = clean.slice(-2);
    if (clean.startsWith('+91')) {
      return `+91 ******* ${lastTwo}`;
    }
    const prefix = clean.slice(0, 3);
    return `${prefix} ******* ${lastTwo}`;
  }

  private maskId(id: string): string {
    const clean = id.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length <= 4) return 'XXXX-' + clean;

    const lastFour = clean.slice(-4);
    return `XXXX-XXXX-${lastFour}`;
  }

  private maskAccount(account: string): string {
    const clean = account.trim();
    if (clean.length <= 4) return clean;
    const lastFour = clean.slice(-4);
    return `•••• •••• ${lastFour}`;
  }
}
