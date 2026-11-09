import { Component, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

/** Available language options */
export interface Language {
  code: string;
  name: string;
  flag: string;
}

/**
 * Language switcher component for changing application language.
 * Persists language preference in localStorage.
 * 
 * @example
 * ```html
 * <app-language-switcher></app-language-switcher>
 * ```
 */
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="language-switcher" [class.open]="isOpen()">
      <button 
        type="button" 
        class="language-btn"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
      >
        <span class="language-flag">{{ currentLanguage().flag }}</span>
        <span class="language-code">{{ currentLanguage().code.toUpperCase() }}</span>
        <i class="fa-solid fa-chevron-down chevron"></i>
      </button>

      @if (isOpen()) {
        <div class="language-dropdown" role="listbox">
          @for (lang of languages; track lang.code) {
            <button 
              type="button"
              class="language-option"
              [class.active]="lang.code === currentLanguage().code"
              [attr.aria-selected]="lang.code === currentLanguage().code"
              role="option"
              (click)="selectLanguage(lang)"
            >
              <span class="language-flag">{{ lang.flag }}</span>
              <span class="language-name">{{ lang.name }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .language-switcher {
      position: relative;
      display: inline-block;
    }

    .language-btn {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-color);
      font-size: var(--text-sm);
      font-weight: var(--font-weight-body);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .language-btn:hover {
      background: var(--hover-background-subtle);
      border-color: var(--primary-color);
    }

    .language-flag {
      font-size: var(--text-md);
    }

    .language-code {
      font-weight: var(--font-weight-emphasis);
    }

    .chevron {
      font-size: var(--text-xs);
      color: var(--text-color-muted);
      transition: transform 200ms ease;
    }

    .language-switcher.open .chevron {
      transform: rotate(180deg);
    }

    .language-dropdown {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      min-width: 140px;
      background: var(--surface-overlay);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      z-index: 100;
      animation: dropdown-in 150ms ease;
    }

    @keyframes dropdown-in {
      from { opacity: 0; transform: translateY(calc(-1 * var(--space-2))); }
      to { opacity: 1; transform: translateY(0); }
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: none;
      color: var(--text-color);
      font-size: var(--text-sm);
      text-align: left;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .language-option:hover {
      background: var(--hover-background-subtle);
    }

    .language-option.active {
      background: var(--primary-color-lighter);
      color: var(--primary-color);
      font-weight: var(--font-weight-emphasis);
    }

    .language-name {
      flex: 1;
    }

    /* Dark mode */
    :host-context(html.dark) .language-dropdown,
    :host-context([data-theme="dark"]) .language-dropdown {
      background: var(--surface-section);
      border-color: var(--border-color);
    }
  `]
})
export class LanguageSwitcherComponent {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Available languages */
  readonly languages: Language[] = [
    { code: 'es', name: 'Español', flag: '' },
    { code: 'en', name: 'English', flag: '' }
  ];

  isOpen = signal(false);
  currentLanguage = signal<Language>(this.languages[0]);

  constructor() {
    this.initLanguage();
  }

  private initLanguage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('app-language');
      if (saved) {
        const lang = this.languages.find(l => l.code === saved);
        if (lang) {
          this.currentLanguage.set(lang);
          this.translate.use(lang.code);
        }
      }
    }
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  selectLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    this.translate.use(lang.code);
    this.isOpen.set(false);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('app-language', lang.code);
    }
  }
}
