import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'vaultone_theme_preference';
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly themeModeSubject = new BehaviorSubject<ThemeMode>(this.getInitialMode());
  public readonly themeMode$ = this.themeModeSubject.asObservable();

  private readonly isDarkSubject = new BehaviorSubject<boolean>(this.computeIsDark(this.themeModeSubject.value));
  public readonly isDark$ = this.isDarkSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeModeSubject.value);

    // Watch OS-level preference changes when in 'system' mode
    this.mediaQuery.addEventListener('change', () => {
      if (this.themeModeSubject.value === 'system') {
        this.applyTheme('system');
      }
    });
  }

  get currentMode(): ThemeMode {
    return this.themeModeSubject.value;
  }

  get isDark(): boolean {
    return this.isDarkSubject.value;
  }

  setTheme(mode: ThemeMode): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors in restricted iframe/incognito
    }
    this.themeModeSubject.next(mode);
    this.applyTheme(mode);
  }

  cycleTheme(): void {
    const cycle: ThemeMode[] = ['dark', 'light', 'system'];
    const idx = cycle.indexOf(this.currentMode);
    const nextMode = cycle[(idx + 1) % cycle.length];
    this.setTheme(nextMode);
  }

  private applyTheme(mode: ThemeMode): void {
    const isDark = this.computeIsDark(mode);
    this.isDarkSubject.next(isDark);

    const root = document.documentElement;
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', mode);

    if (isDark) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }

  private computeIsDark(mode: ThemeMode): boolean {
    if (mode === 'light') return false;
    if (mode === 'dark') return true;
    return this.mediaQuery.matches;
  }

  private getInitialMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'dark'; // Default to Slate Sage dark mode
  }
}
