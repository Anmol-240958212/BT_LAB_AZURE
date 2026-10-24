import { ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationError, NavigationEnd, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { AuthService } from './core/auth.service';
import { UserApiService } from './core/api/user-api.service';
import { ToastService } from './shared/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styles: [`
    .page-load-recovery {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2000;
      width: min(760px, calc(100vw - 24px));
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--color-bg-surface);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-focus);
      border-radius: 8px;
      box-shadow: 0 4px 24px #0005;
    }
    .page-load-recovery button { flex-shrink: 0; }
    @media (max-width: 600px) { .page-load-recovery { flex-direction: column; } }
  `]
})
export class App {
  pageLoadFailed = false;

  constructor(
    router: Router,
    cdr: ChangeDetectorRef,
    destroyRef: DestroyRef,
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly toastService: ToastService
  ) {
    router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe(event => {
      if (event instanceof NavigationError) {
        const message = String(event.error?.message ?? event.error ?? '');
        // An open tab can still reference lazy chunks removed by a newer build.
        if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(message)) {
          this.pageLoadFailed = true;
          cdr.markForCheck();
        }
      } else if (event instanceof NavigationEnd && this.pageLoadFailed) {
        this.pageLoadFailed = false;
        cdr.markForCheck();
      }

      if (event instanceof NavigationEnd) {
        this.checkKycStatusAndNotify(event.urlAfterRedirects);
      }
    });
  }

  private checkKycStatusAndNotify(url: string): void {
    const state = this.authService.currentAuthState;
    if (!state.isAuthenticated || state.role !== 'CUSTOMER') return;

    this.userApi.getMe().pipe(
      take(1),
      catchError(() => of(null))
    ).subscribe(profile => {
      if (!profile) return;

      const needsKyc = profile.customerStatus !== 'ACTIVE';
      this.authService.setKycStatus(needsKyc);
      const path = url.split('?')[0];
      if (needsKyc && !path.startsWith('/fixed-deposit/create')) {
        this.toastService.warning(
          'Please complete your KYC to unlock all features.',
          'KYC incomplete'
        );
      }
    });
  }

  reloadPage(): void {
    window.location.reload();
  }
}
