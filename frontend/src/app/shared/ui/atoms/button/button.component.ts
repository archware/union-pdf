import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  viewChild,
} from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * Available button color variants.
 * @remarks Each variant applies different colors from the design system.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'soft'
  | 'outline'
  | 'ghost'
  | 'link';

/** Surface appearance for solid button variants. */
export type ButtonAppearance = 'flat' | 'gradient';

/** Semantic tone used by subtle and outlined actions. */
export type ButtonTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/** Button size options */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Icon position relative to button text */
export type IconPosition = 'left' | 'right' | 'none';

/**
 * Reusable button component with multiple variants, sizes, and icon support.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.atomic-button--full-width]': 'fullWidth'
  },
  template: `
    <button
      #control
      [type]="type"
      [disabled]="disabled"
      [attr.aria-disabled]="loading ? 'true' : null"
      [attr.aria-label]="ariaLabel || null"
      [attr.aria-controls]="ariaControls || null"
      [attr.aria-expanded]="expandedAttribute"
      [attr.aria-busy]="loading ? 'true' : null"
      [class]="buttonClasses"
      (click)="onButtonClick($event)"
    >
      @if (loading) {
        <app-spinner
          class="btn-spinner"
          size="sm"
          variant="current"
          aria-hidden="true"
        />
      }

      <!-- Custom Icon Link (Left) -->
      <span class="btn-icon-wrapper btn-icon-wrapper--left" aria-hidden="true">
        <ng-content select="[icon-left]"></ng-content>
      </span>

      <!-- Configurable Icon (Left) -->
      @if (iconPosition === 'left') {
        @if (icon) {
          <span class="btn-icon-wrapper btn-icon-wrapper--left btn-icon--emoji" aria-hidden="true">{{ icon }}</span>
        } @else if (resolvedIconClass) {
          <span class="btn-icon-wrapper btn-icon-wrapper--left" aria-hidden="true"
            ><i [class]="resolvedIconClass"></i
          ></span>
        }
      }

      <!-- Button Content -->
      <ng-content></ng-content>

      <!-- Configurable Icon (Right) -->
      @if (iconPosition === 'right') {
        @if (icon) {
          <span class="btn-icon-wrapper btn-icon-wrapper--right btn-icon--emoji" aria-hidden="true">{{ icon }}</span>
        } @else if (resolvedIconClass) {
          <span class="btn-icon-wrapper btn-icon-wrapper--right" aria-hidden="true"
            ><i [class]="resolvedIconClass"></i
          ></span>
        }
      }

      <!-- Custom Icon Link (Right) -->
      <span class="btn-icon-wrapper btn-icon-wrapper--right" aria-hidden="true">
        <ng-content select="[icon-right]"></ng-content>
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Use inline-block when explicitly needed */
      :host(.inline) {
        display: inline-block;
      }

      /* Allow button to control its own dimensions when in grid */
      :host(.auto-size) {
        display: contents;
      }

      :host(.atomic-button--full-width),
      :host(.atomic-button--full-width) .btn {
        width: 100%;
      }

      /*
      UN BOTON DE SOLO ICONO ES CUADRADO, Y ESO NO SE PUEDE PEDIR DESDE FUERA.

      El consumidor puede darle al HOST un tamaño cuadrado, pero el control de
      dentro conserva su relleno horizontal y su ancho minimo, asi que se sale de
      su propio borde y pisa lo que tenga al lado. Ocurrio literalmente: el boton
      de tema de la barra superior desbordaba su marco y se solapaba con el menu
      de usuario.

      No se puede arreglar desde el consumidor: sus estilos no alcanzan al
      interior de este componente. Tiene que vivir aqui.

      El atributo dialog-close ya resolvia exactamente esto para el aspa de
      cerrar. En vez de añadir un segundo caso especial se generaliza: icon-only
      hace lo mismo y se puede pedir desde cualquier sitio.
      */
      :host([dialog-close]),
      :host([icon-only]) {
        display: inline-flex;
        width: var(--control-height);
        height: var(--control-height);
      }

      :host([dialog-close]) .btn,
      :host([icon-only]) .btn {
        width: 100%;
        min-width: 100%;
        height: 100%;
        min-height: 100%;
        padding: 0;
      }

      .btn-icon-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: var(--icon-sm); /* 1var(--space-2) */
      }

      .btn-spinner {
        display: inline-flex;
        flex: 0 0 auto;
      }

      /* Hide empty slot containers */
      .btn-icon-wrapper:not(:has(*)) {
        display: none;
      }

      /* El contenedor .btn ya define gap: 0.5rem; evitamos duplicar el margen en los wrappers de icono */
      .btn-icon-wrapper--left:has(*) {
        margin-right: 0;
      }

      .btn-icon-wrapper--right:has(*) {
        margin-left: 0;
      }

      /* Size-specific icon adjustments */
      :host-context(.btn-sm) .btn-icon-wrapper {
        font-size: var(--icon-xs); /* 1var(--space-1) */
      }

      :host-context(.btn-lg) .btn-icon-wrapper {
        font-size: var(--icon-md); /* 24px */
      }
    `,
  ],
})
export class ButtonComponent {
  /**
   * HTML button type attribute.
   * @default 'button'
   */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  /**
   * Visual style variant of the button.
   * @default 'primary'
   */
  @Input() variant: ButtonVariant = 'primary';

  /**
   * Surface appearance for solid button variants (`primary`, `secondary`, `success`, `warning`, `danger`).
   * `'flat'` renders a solid flat fill; `'gradient'` renders a diagonal gradient with semantic glow shadow.
   * @default 'flat'
   */
  @Input() appearance: ButtonAppearance = 'flat';

  /**
   * Semantic emphasis for subtle and outlined actions.
   * It does not replace the variant or communicate meaning without a label.
   * @default 'neutral'
   */
  @Input() tone: ButtonTone = 'neutral';

  /**
   * Size of the button.
   * @default 'md'
   */
  @Input() size: ButtonSize = 'md';

  /**
   * Emoji or text icon to display.
   * For custom icons (SVG, FontAwesome), use content projection with `icon-left` or `icon-right` attribute.
   */
  @Input() icon = '';

  /**
   * Font Awesome icon token or complete CSS class.
   * Accepts `save`, `fa-save` and `fa-solid fa-save` without producing
   * duplicated classes such as `fa-fa-save`.
   */
  @Input() iconClass = '';

  /** Normalized Font Awesome classes used by the template. */
  get resolvedIconClass(): string {
    return normalizeFontAwesomeIconClass(this.iconClass);
  }

  /**
   * Position of the emoji/text icon.
   * @default 'left'
   */
  @Input() iconPosition: IconPosition = 'left';

  /**
   * Whether the button is disabled.
   * @default false
   */
  @Input() disabled = false;

  /**
   * Indicates that the action is pending.
   * Loading exposes aria-disabled and aria-busy, preserves focus, and suppresses
   * repeated activations and native form actions while preserving the projected label.
   * @default false
   */
  @Input() loading = false;

  /** Expands both the host and the native button to the available width. */
  @Input() fullWidth = false;

  /*
  ARIA DEL CONTROL, NO DEL ENVOLTORIO. Sin estas entradas, quien necesita un
  boton de divulgacion —el que abre un cajon o un menu— solo puede poner
  `aria-expanded` sobre `<app-button>`, que es un elemento sin rol: el atributo
  queda inerte y el lector anuncia un boton corriente que nunca dice si esta
  abierto o cerrado. Se ve bien, se pulsa bien, y no informa.

  `ariaExpanded` admite `null` a proposito: un boton que no controla nada NO
  debe declarar el atributo, porque `aria-expanded="false"` sobre algo que no
  se despliega es una promesa falsa.
  */
  /**
   * Devuelve el foco al control real.
   *
   * Sin esto, un patron de divulgacion no se puede cerrar bien: al pulsar
   * Escape hay que devolver el foco al boton que abrio, y `nativeElement.focus()`
   * sobre `<app-button>` —que no es focusable— manda el foco al `<body>`. La
   * siguiente tabulacion reempieza desde el principio del documento y quien
   * navega con teclado pierde el sitio.
   */
  private readonly control = viewChild<ElementRef<HTMLButtonElement>>('control');

  focus(options?: FocusOptions): void {
    this.control()?.nativeElement.focus(options);
  }

  @Input() ariaLabel = '';
  @Input() ariaControls = '';
  @Input() ariaExpanded: boolean | null = null;

  protected get expandedAttribute(): string | null {
    return this.ariaExpanded === null ? null : this.ariaExpanded ? 'true' : 'false';
  }

  /**
   * Emits when the button is clicked.
   * Does not emit when disabled.
   */
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  /*
  MIENTRAS CARGA, EL BOTON SIGUE ENFOCABLE.

  Antes se ponia `disabled` tambien durante la carga. El navegador descarta el
  foco de un elemento que se deshabilita, asi que el boton se quitaba el foco a
  si mismo justo al pulsarlo: quien confirma un cobro con el teclado pierde el
  punto de partida y el siguiente Tab empieza desde el principio del documento.
  Y con `disabled` el lector de pantalla deja de anunciar el elemento, asi que
  tampoco llegaba el `aria-busy` que decia que la operacion seguia en curso.

  Ahora la carga se comunica con `aria-disabled` y `aria-busy` —que se anuncian
  y no roban el foco— y la activacion la bloquea `onButtonClick`, que ya
  comprobaba `loading` antes de emitir. El `disabled` real se reserva para el
  deshabilitado de verdad, que es el que si debe salir del recorrido.
  */
  /** Native interaction is unavailable while disabled or loading. */
  get isDisabled(): boolean {
    return this.disabled || this.loading;
  }

  onButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDisabled) {
      /*
       * aria-disabled mantiene el foco durante loading, pero no cancela el
       * comportamiento nativo. Sin preventDefault, un botón submit todavía
       * enviaría el formulario aunque no emitiera buttonClick.
       */
      event.preventDefault();
      return;
    }

    this.buttonClick.emit(event);
  }

  /** @internal */
  get buttonClasses(): string {
    const classes = ['btn', `btn-${this.variant}`, `btn-tone-${this.tone}`];

    if (this.appearance === 'gradient') {
      classes.push('btn-gradient');
    }

    if (this.size !== 'md') {
      classes.push(`btn-${this.size}`);
    }

    if (this.loading) {
      classes.push('btn-loading');
    }

    return classes.join(' ');
  }
}

export function normalizeFontAwesomeIconClass(value: string | null | undefined): string {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  if (!normalized) {
    return '';
  }

  if (normalized.includes(' ')) {
    return normalized;
  }

  return normalized.startsWith('fa-') ? `fa-solid ${normalized}` : `fa-solid fa-${normalized}`;
}
