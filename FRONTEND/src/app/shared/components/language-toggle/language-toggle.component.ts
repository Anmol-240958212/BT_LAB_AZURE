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
    :host-context([data-theme="light"]) .language-toggle,
    :host-context(.light-theme) .language-toggle {
      background: #f5faf7;
      border-color: #3d7a60;
      color: #1b4836;
      box-shadow: 0 1px 2px rgba(18, 32, 26, 0.12);
    }
    :host-context([data-theme="light"]) .language-toggle .active,
    :host-context(.light-theme) .language-toggle .active { color: #0d2d20; }
    :host-context([data-theme="light"]) .language-toggle .separator,
    :host-context(.light-theme) .language-toggle .separator { color: #3d7a60; }
    :host-context([data-theme="light"]) .language-toggle:hover,
    :host-context(.light-theme) .language-toggle:hover { background: #e2f0e8; border-color: #1b4836; }
  `]
})
export class LanguageToggleComponent {
  constructor(readonly language: LanguageService) {}

  toggle(): void {
    this.language.toggle();
  }
}
