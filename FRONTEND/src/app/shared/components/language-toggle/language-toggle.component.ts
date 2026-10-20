import { Component } from '@angular/core';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-language-toggle',
  standalone: false,
  template: `
    <button
      type="button"
      class="language-toggle"
      (click)="toggle()"
      [attr.aria-label]="(language.activeLang === 'en' ? 'language.switchToHindi' : 'language.switchToEnglish') | transloco"
      [title]="(language.activeLang === 'en' ? 'language.switchToHindi' : 'language.switchToEnglish') | transloco"
    >
      <span [class.active]="language.activeLang === 'en'">EN</span>
      <span class="separator">/</span>
      <span [class.active]="language.activeLang === 'hi'">हिन्दी</span>
    </button>
  `,
  styles: [`
    .language-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 9px;
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-button);
      background: transparent;
      color: var(--color-text-secondary);
      font-size: var(--text-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .language-toggle:hover { border-color: var(--color-accent); color: var(--color-text-primary); }
    .language-toggle .active { color: var(--color-text-primary); font-weight: 600; }
    .language-toggle .separator { color: var(--color-text-muted); }
  `]
})
export class LanguageToggleComponent {
  constructor(readonly language: LanguageService) {}

  toggle(): void {
    this.language.toggle();
  }
}
