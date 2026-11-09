import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionComponent } from '../../atoms/version/version.component';
import { AppVersionService } from '../../services/app-version.service';

export interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'github' | 'youtube';
  url: string;
  label?: string;
}

export interface LegalLink {
  label: string;
  url: string;
}

export type FooterVariant = 'simple' | 'inline' | 'columns';

/**
 * Pie de página genérico del sistema Atomic.
 *
 * El componente no depende de un proveedor de traducciones. El shell es quien
 * reserva su fila al final de la ventana; el footer sólo controla su contenido
 * y presentación para no competir con el contenedor que posee el scroll.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, VersionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="atomic-footer"
      [class]="'atomic-footer--' + variant"
      [attr.aria-label]="accessibleLabel">
      @if (variant === 'simple') {
        <div class="atomic-footer__container atomic-footer__container--bottom">
          <ng-container *ngTemplateOutlet="copyrightTemplate"></ng-container>
          <ng-container *ngTemplateOutlet="versionTemplate"></ng-container>
        </div>
      }

      @if (variant === 'inline') {
        <div class="atomic-footer__container atomic-footer__container--stacked">
          @if (socialLinks.length > 0 || legalLinks.length > 0) {
            <div class="atomic-footer__inline-top">
              <ng-container *ngTemplateOutlet="social"></ng-container>
              <ng-container *ngTemplateOutlet="legal"></ng-container>
            </div>
          }
          <div class="atomic-footer__bottom-row">
            <ng-container *ngTemplateOutlet="copyrightTemplate"></ng-container>
            <ng-container *ngTemplateOutlet="versionTemplate"></ng-container>
          </div>
        </div>
      }

      @if (variant === 'columns') {
        <div class="atomic-footer__container atomic-footer__container--stacked">
          <div class="atomic-footer__columns">
            <div class="atomic-footer__company">
              <h3 class="atomic-footer__logo">{{ companyName }}</h3>
              @if (description) {
                <p class="atomic-footer__description">{{ description }}</p>
              }
            </div>

            @if (legalLinks.length > 0) {
              <div class="atomic-footer__column">
                <h4 class="atomic-footer__column-title">{{ legalTitle }}</h4>
                <ng-container *ngTemplateOutlet="legal"></ng-container>
              </div>
            }

            @if (socialLinks.length > 0) {
              <div class="atomic-footer__column">
                <h4 class="atomic-footer__column-title">{{ socialTitle }}</h4>
                <ng-container *ngTemplateOutlet="social; context: { vertical: true }"></ng-container>
              </div>
            }
          </div>

          <div class="atomic-footer__bottom-row">
            <ng-container *ngTemplateOutlet="copyrightTemplate"></ng-container>
            <ng-container *ngTemplateOutlet="versionTemplate"></ng-container>
          </div>
        </div>
      }
    </footer>

    <ng-template #social let-vertical="vertical">
      @if (socialLinks.length > 0) {
        <nav
          class="atomic-footer__social"
          [class.atomic-footer__social--vertical]="vertical"
          [attr.aria-label]="socialTitle">
          @for (link of socialLinks; track link.url) {
            <a
              class="atomic-footer__social-link"
              [class.atomic-footer__social-link--with-text]="vertical"
              [href]="link.url"
              target="_blank"
              rel="noopener noreferrer"
              [attr.aria-label]="getSocialLabel(link)">
              <i [class]="getSocialIcon(link.platform)" aria-hidden="true"></i>
              @if (vertical) {
                <span>{{ getSocialLabel(link) }}</span>
              }
            </a>
          }
        </nav>
      }
    </ng-template>

    <ng-template #legal>
      @if (legalLinks.length > 0) {
        <nav class="atomic-footer__legal" [attr.aria-label]="legalTitle">
          @for (link of legalLinks; track link.url; let last = $last) {
            <a class="atomic-footer__legal-link" [href]="link.url">{{ link.label }}</a>
            @if (!last) {
              <span class="atomic-footer__separator" aria-hidden="true">·</span>
            }
          }
        </nav>
      }
    </ng-template>

    <ng-template #copyrightTemplate>
      <span class="atomic-footer__copyright">
        <span>{{ copyrightLine }}</span>
        @if (supportText) {
          <span class="atomic-footer__separator" aria-hidden="true">{{ supportSeparator }}</span>
          <span>{{ supportText }}</span>
        }
      </span>
    </ng-template>

    <ng-template #versionTemplate>
      @if (showVersion) {
        <app-version
          [version]="versionService?.versionInfo()?.version || version"
          [environment]="versionService?.versionInfo()?.environment || environment"
          [showBuildDate]="showBuildDate"
          [buildDate]="versionService?.versionInfo()?.buildDate || buildDate"
          variant="badge">
        </app-version>
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      flex: 0 0 auto;
      margin-top: auto;
      box-sizing: border-box;
    }

    .atomic-footer {
      width: 100%;
      box-sizing: border-box;
      padding: var(--space-2) var(--space-6);
      background: var(--surface-section);
      color: var(--text-color-secondary);
      border-top: var(--border-width-thin) solid var(--border-color);
      box-shadow: var(--shadow-sm);
    }

    .atomic-footer--columns {
      padding-block: var(--space-8) var(--space-4);
    }

    .atomic-footer__container {
      width: 100%;
      box-sizing: border-box;
    }

    .atomic-footer__container--stacked {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .atomic-footer__container--bottom,
    .atomic-footer__bottom-row,
    .atomic-footer__inline-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .atomic-footer__copyright {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      color: var(--text-color-secondary);
      font-size: var(--text-xs);
      font-weight: 500;
      line-height: 1.4;
    }

    .atomic-footer__social,
    .atomic-footer__legal {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .atomic-footer__social-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--control-height-sm);
      height: var(--control-height-sm);
      color: var(--text-color-secondary);
      background: var(--surface-hover);
      border-radius: var(--radius-full);
      font-size: var(--text-md);
      text-decoration: none;
      transition: color 150ms ease, background-color 150ms ease, transform 150ms ease;
    }

    .atomic-footer__social-link:hover,
    .atomic-footer__social-link:focus-visible,
    .atomic-footer__legal-link:hover,
    .atomic-footer__legal-link:focus-visible {
      color: var(--primary-color);
    }

    .atomic-footer__social-link:hover {
      transform: translateY(calc(var(--space-1) * -1));
    }

    .atomic-footer__social-link:focus-visible,
    .atomic-footer__legal-link:focus-visible {
      outline: var(--border-width-medium) solid var(--focus-ring-color);
      outline-offset: var(--space-1);
    }

    .atomic-footer__legal-link {
      color: var(--text-color-secondary);
      font-size: var(--text-sm);
      text-decoration: none;
      transition: color 150ms ease;
    }

    .atomic-footer__separator {
      color: var(--text-color-muted);
    }

    .atomic-footer__columns {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: var(--space-8);
    }

    .atomic-footer__company {
      min-width: 0;
    }

    .atomic-footer__logo,
    .atomic-footer__column-title,
    .atomic-footer__description {
      margin: 0;
    }

    .atomic-footer__logo {
      color: var(--text-color);
      font-size: var(--text-xl);
      font-weight: 700;
    }

    .atomic-footer__description {
      margin-top: var(--space-3);
      color: var(--text-color-secondary);
      font-size: var(--text-sm);
      line-height: 1.6;
    }

    .atomic-footer__column-title {
      margin-bottom: var(--space-3);
      color: var(--text-color);
      font-size: var(--text-sm);
      font-weight: 600;
    }

    .atomic-footer__social--vertical,
    .atomic-footer__social-link--with-text {
      align-items: flex-start;
    }

    .atomic-footer__social--vertical {
      flex-direction: column;
    }

    .atomic-footer__social-link--with-text {
      width: auto;
      height: auto;
      justify-content: flex-start;
      gap: var(--space-2);
      padding: var(--space-1) 0;
      background: transparent;
      border-radius: 0;
      font-size: var(--text-sm);
    }

    @media (max-width: 48rem) {
      .atomic-footer {
        padding-inline: var(--space-4);
      }

      .atomic-footer__container--bottom,
      .atomic-footer__bottom-row,
      .atomic-footer__inline-top {
        flex-direction: column;
        justify-content: center;
        text-align: center;
      }

      .atomic-footer__columns {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-6);
        text-align: center;
      }

      .atomic-footer__social,
      .atomic-footer__legal,
      .atomic-footer__social--vertical,
      .atomic-footer__copyright {
        justify-content: center;
        align-items: center;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .atomic-footer__social-link,
      .atomic-footer__legal-link {
        transition: none;
      }

      .atomic-footer__social-link:hover {
        transform: none;
      }
    }
  `]
})
export class FooterComponent {
  public readonly versionService = inject(AppVersionService, { optional: true });

  @Input() variant: FooterVariant = 'inline';
  @Input() accessibleLabel = 'Pie de página';
  @Input() companyName = 'Hospital Regional Ayacucho';
  @Input() year = new Date().getFullYear();
  @Input() copyrightText = 'Todos los derechos reservados.';
  @Input() copyrightSeparator = ' - ';
  @Input() supportText = 'Soporte: Sistemas de Información';
  @Input() supportSeparator = '|';
  @Input() description = '';
  @Input() legalTitle = 'Enlaces legales';
  @Input() socialTitle = 'Redes sociales';
  @Input() showVersion = true;
  @Input() showBuildDate = false;
  @Input() version = 'Beta';
  @Input() environment = 'BETA';
  @Input() buildDate = '';
  @Input() socialLinks: SocialLink[] = [];
  @Input() legalLinks: LegalLink[] = [];

  get copyrightLine(): string {
    return `© ${this.year} ${this.companyName}${this.copyrightSeparator}${this.copyrightText}`;
  }

  getSocialIcon(platform: SocialLink['platform']): string {
    const icons: Record<SocialLink['platform'], string> = {
      facebook: 'fa-brands fa-facebook-f',
      twitter: 'fa-brands fa-x-twitter',
      instagram: 'fa-brands fa-instagram',
      linkedin: 'fa-brands fa-linkedin-in',
      github: 'fa-brands fa-github',
      youtube: 'fa-brands fa-youtube'
    };
    return icons[platform];
  }

  getSocialLabel(link: SocialLink): string {
    if (link.label) return link.label;
    const labels: Record<SocialLink['platform'], string> = {
      facebook: 'Facebook',
      twitter: 'X',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      youtube: 'YouTube'
    };
    return labels[link.platform];
  }
}
