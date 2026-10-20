import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ThemeService, ThemeMode } from '../../../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: false,
  template: `
    <div class="theme-switch" [class.compact]="compact" role="group" [attr.aria-label]="'nav.toggleTheme' | transloco">
      <button
        type="button"
        class="theme-opt-btn"
        [class.active]="currentMode === 'light'"
        (click)="onSelect('light')"
        [title]="'nav.lightMode' | transloco"
      >
        <app-icon name="sun" [size]="13" class="icon"></app-icon>
        <span *ngIf="!compact" class="label">{{ 'nav.light' | transloco }}</span>
      </button>

      <button
        type="button"
        class="theme-opt-btn"
        [class.active]="currentMode === 'dark'"
        (click)="onSelect('dark')"
        [title]="'nav.darkMode' | transloco"
      >
        <app-icon name="moon" [size]="13" class="icon"></app-icon>
        <span *ngIf="!compact" class="label">{{ 'nav.dark' | transloco }}</span>
      </button>

      <button
        type="button"
        class="theme-opt-btn"
        [class.active]="currentMode === 'system'"
        (click)="onSelect('system')"
        [title]="'nav.systemDefault' | transloco"
      >
        <app-icon name="monitor" [size]="13" class="icon"></app-icon>
        <span *ngIf="!compact" class="label">{{ 'nav.auto' | transloco }}</span>
      </button>
    </div>
  `,
  styles: [`
    .theme-switch {
      display: inline-flex;
      align-items: center;
      background-color: var(--color-bg-base);
      border: 1px solid var(--color-border-subtle);
      border-radius: 20px;
      padding: 3px;
      gap: 2px;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);
    }

    .theme-opt-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      background: transparent;
      border: none;
      border-radius: 14px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all var(--transition-fast);
      user-select: none;
    }

    .theme-opt-btn:hover {
      color: var(--color-text-primary);
    }

    .theme-opt-btn.active {
      background-color: var(--color-bg-elevated);
      color: var(--color-accent);
      border: 1px solid var(--color-border-default);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .icon {
      font-size: 12px;
      line-height: 1;
    }

    .label {
      line-height: 1;
      letter-spacing: 0.02em;
    }

    /* Compact mode for Topbar or tight spaces */
    .theme-switch.compact {
      padding: 2px;
    }

    .theme-switch.compact .theme-opt-btn {
      padding: 4px 7px;
      border-radius: 12px;
    }
  `]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  @Input() compact = false;
  currentMode: ThemeMode = 'dark';
  private sub?: Subscription;

  constructor(private readonly themeService: ThemeService) {}

  ngOnInit(): void {
    this.sub = this.themeService.themeMode$.subscribe(mode => {
      this.currentMode = mode;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSelect(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }
}
