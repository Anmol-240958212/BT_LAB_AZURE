import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly maxToasts = 3;
  private readonly defaultDuration = 4000;
  private readonly toastsSubject = new BehaviorSubject<ToastMessage[]>([]);

  public readonly toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  public show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string, duration = this.defaultDuration): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, message, title, duration };

    const current = this.toastsSubject.value;
    // Keep max 3 toasts per guidelines.md Section 13
    const updated = [...current.slice(-(this.maxToasts - 1)), toast];
    this.toastsSubject.next(updated);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  public success(message: string, title?: string): void {
    this.show(message, 'success', title);
  }

  public error(message: string, title?: string): void {
    this.show(message, 'error', title);
  }

  public warning(message: string, title?: string): void {
    this.show(message, 'warning', title);
  }

  public info(message: string, title?: string): void {
    this.show(message, 'info', title);
  }

  public dismiss(id: string): void {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }

  public clearAll(): void {
    this.toastsSubject.next([]);
  }
}
