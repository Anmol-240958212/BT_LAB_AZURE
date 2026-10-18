import { ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationError, NavigationEnd, Router } from '@angular/router';

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

  constructor(router: Router, cdr: ChangeDetectorRef, destroyRef: DestroyRef) {
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
    });
  }

  reloadPage(): void {
    window.location.reload();
  }
}
