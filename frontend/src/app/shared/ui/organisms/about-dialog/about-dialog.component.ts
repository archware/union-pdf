import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonComponent, normalizeFontAwesomeIconClass } from '../../atoms/button/button.component';
import { ChipComponent, type ChipVariant } from '../../atoms/chip/chip.component';
import { IconButtonComponent } from '../../atoms/icon-button/icon-button.component';
import { ModalComponent } from '../../molecules/modal/modal.component';
import { ScrollOverlayComponent } from '../scroll-overlay/scroll-overlay.component';

/* orden-dom: es un CONJUNTO de tipos de control equivalentes, no una lista de
   prioridad. Aqui se quiere el primer control del marcado del popup; la marca
   explicita [data-about-initial-focus] se consulta aparte con prioridad. */
const ABOUT_POPUP_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export type AboutDialogVariant = 'modal' | 'popup' | 'card';

export interface AboutCreditItem {
  label: string;
  value: string;
  subtext?: string;
  icon?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  badge?: string;
}

export interface AboutTechBadge {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral';
}

export interface AboutLinkItem {
  label: string;
  url: string;
  icon?: string;
  external?: boolean;
}

/**
 * Organismo canónico "Acerca de" / Créditos del Sistema (`<app-about-dialog>`).
 *
 * Permite presentar la identidad de la aplicación, versión, entorno, runtime,
 * autoría principal, declaración de co-ingeniería con IA Agéntica, tabla de
 * créditos técnicos, stack tecnológico, enlaces verificados y derechos de autor.
 *
 * Soporta tres modos de presentación gobernados por `variant`:
 * - `'modal'` (por defecto): ventana informativa del sistema con botón `X` interior (`<app-modal>`).
 * - `'popup'`: superposición ágil con botón de cierre exterior flotante (`variant="hanging-close"`).
 * - `'card'`: superficie en línea para inspección en Blueprints o secciones embebidas.
 */
@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ModalComponent,
    ScrollOverlayComponent,
    ButtonComponent,
    IconButtonComponent,
    ChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-dialog.component.html',
  styleUrl: './about-dialog.component.css',
})
export class AboutDialogComponent implements OnDestroy {
  private static instanceCounter = 0;
  readonly popupTitleId = `atomic-about-popup-title-${++AboutDialogComponent.instanceCounter}`;

  private readonly popupDialogRef = viewChild<ElementRef<HTMLElement>>('popupDialog');
  private popupPreviouslyFocused: HTMLElement | null = null;
  private popupWasOpen = false;

  /** Controla la visibilidad cuando `variant` es `'modal'` o `'popup'`. En `'card'` siempre se renderiza en línea. */
  readonly open = input<boolean>(false);

  /** Modo de presentación: `'modal'` (por defecto), `'popup'` o `'card'`. */
  readonly variant = input<AboutDialogVariant>('modal');

  /** Tamaño de la ventana o superficie: `'sm'`, `'md'` o `'lg'`. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  /** Título de la barra superior del diálogo. */
  readonly dialogTitle = input<string>('Acerca de');

  /** Nombre oficial de la aplicación o producto. */
  readonly appName = input<string>('Aplicación Atomic');

  /** Subtítulo descriptivo corto del producto. */
  readonly appSubtitle = input<string>('Plataforma de Escritorio y Web');

  /** Resumen funcional opcional del producto. */
  readonly appDescription = input<string>('');

  /** Versión semántica publicada del producto. */
  readonly version = input<string>('v1.0.0');

  /** Etiqueta de entorno o garantía operativa (ej. `'PROD'`, `'LOCAL & SEGURO'`). */
  readonly environment = input<string>('PROD');

  /** Información opcional del motor o runtime de ejecución (ej. `'Tauri + Rust Desktop'`). */
  readonly runtimeInfo = input<string>('');

  /** Clase de icono FontAwesome para el emblema del producto cuando no se usa imagen. */
  readonly logoIcon = input<string>('fa-solid fa-layer-group');

  /** URL opcional de imagen o logotipo del producto. */
  readonly logoImageUrl = input<string>('');

  /** Nombre del autor o arquitecto principal del software. */
  readonly authorName = input<string>('Ing. Havel CONTRERAS TAPAHUASCO');

  /** Rol o cargo del autor principal. */
  readonly authorRole = input<string>('Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas');

  /** Identificador de cuenta en GitHub (ej. `'@archware'`). */
  readonly githubHandle = input<string>('@archware');

  /** URL del perfil o organización en GitHub. */
  readonly githubUrl = input<string>('https://github.com/archware');

  /** Nota institucional de transparencia sobre co-ingeniería con IA Agéntica. */
  readonly aiDisclosure = input<string>(
    'Desarrollado en co-ingeniería con IA Agéntica bajo arquitectura gobernada Atomic UI.'
  );

  /** Lista estructurada de créditos, autorías y reconocimientos técnicos. */
  readonly credits = input<AboutCreditItem[]>([]);

  /** Colección de insignias del stack tecnológico del producto. */
  readonly techStack = input<AboutTechBadge[]>([]);

  /** Enlaces externos o de referencia asociados al producto. */
  readonly links = input<AboutLinkItem[]>([]);

  /** Leyenda legal de derechos de autor al pie del componente. */
  readonly copyrightText = input<string>(
    '© 2026 Ing. Havel CONTRERAS TAPAHUASCO (@archware). Todos los derechos reservados.'
  );

  /** Texto del botón de cierre en el pie del diálogo. */
  readonly closeButtonText = input<string>('Cerrar');

  /** Evento emitido cuando la persona solicita cerrar el diálogo (`modal` o `popup`). */
  readonly closed = output<void>();

  constructor() {
    afterRenderEffect(() => {
      const isPopupOpen = this.variant() === 'popup' && this.open();
      if (isPopupOpen && !this.popupWasOpen) {
        const dialog = this.popupDialogRef()?.nativeElement;
        if (!dialog) {
          return;
        }
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        this.popupPreviouslyFocused = active instanceof HTMLElement ? active : null;
        this.popupWasOpen = true;
        this.focusInitialPopupControl(dialog);
      } else if (!isPopupOpen && this.popupWasOpen) {
        this.popupWasOpen = false;
        this.restorePopupFocus();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.popupWasOpen) {
      this.popupWasOpen = false;
      this.restorePopupFocus();
    }
  }

  get resolvedLogoIcon(): string {
    return normalizeFontAwesomeIconClass(this.logoIcon() || 'fa-solid fa-layer-group');
  }

  resolveIconClass(icon?: string, fallback = 'fa-solid fa-circle-check'): string {
    return normalizeFontAwesomeIconClass(icon || fallback);
  }

  resolveChipVariant(variant?: AboutTechBadge['variant']): ChipVariant {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'success':
      case 'info':
      case 'warning':
        return variant;
      default:
        return 'default';
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  onBackdropPointerDown(event: PointerEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onPopupKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.onClose();
      return;
    }
    if (event.key === 'Tab') {
      this.trapPopupFocus(event);
    }
  }

  private focusInitialPopupControl(dialog: HTMLElement): void {
    const preferredRoot = dialog.querySelector<HTMLElement>('[data-about-popup-initial-focus]');
    const preferred = preferredRoot?.matches(ABOUT_POPUP_FOCUSABLE_SELECTOR)
      ? preferredRoot
      : preferredRoot?.querySelector<HTMLElement>(ABOUT_POPUP_FOCUSABLE_SELECTOR);
    const target =
      preferred ?? dialog.querySelector<HTMLElement>(ABOUT_POPUP_FOCUSABLE_SELECTOR) ?? dialog;
    target.focus({ preventScroll: true });
  }

  private trapPopupFocus(event: KeyboardEvent): void {
    const dialog = this.popupDialogRef()?.nativeElement;
    if (!dialog) {
      return;
    }
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(ABOUT_POPUP_FOCUSABLE_SELECTOR)
    ).filter(
      (control) => !control.hasAttribute('hidden') && control.getAttribute('aria-hidden') !== 'true'
    );

    if (controls.length === 0) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  private restorePopupFocus(): void {
    const origin = this.popupPreviouslyFocused;
    this.popupPreviouslyFocused = null;
    if (!origin || !origin.isConnected || origin.hasAttribute('disabled')) {
      return;
    }
    try {
      origin.focus({ preventScroll: true });
    } catch {
      // Ignorar si el nodo ya no acepta foco
    }
  }
}
