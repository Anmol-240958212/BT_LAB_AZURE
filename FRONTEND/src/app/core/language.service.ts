import { Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type AppLanguage = 'en' | 'hi';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages: AppLanguage[] = ['en', 'hi'];
  private readonly storageKey = 'vaultone-language';

  constructor(private readonly transloco: TranslocoService) {
    const saved = window.localStorage.getItem(this.storageKey);
    const language: AppLanguage = saved === 'hi' ? 'hi' : 'en';
    this.setActiveLang(language, false);
  }

  get activeLang(): AppLanguage {
    return this.transloco.getActiveLang() === 'hi' ? 'hi' : 'en';
  }

  setActiveLang(language: AppLanguage, persist = true): void {
    const selected: AppLanguage = language === 'hi' ? 'hi' : 'en';
    this.transloco.setActiveLang(selected);
    document.documentElement.lang = selected === 'hi' ? 'hi-IN' : 'en-IN';
    if (persist) {
      window.localStorage.setItem(this.storageKey, selected);
    }
  }

  toggle(): void {
    this.setActiveLang(this.activeLang === 'en' ? 'hi' : 'en');
  }
}
