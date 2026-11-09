import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="accordion" [class.accordion-flush]="flush">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .accordion {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .accordion-flush {
        gap: 0;
      }

      .accordion-flush ::ng-deep .accordion-item {
        border-radius: 0;
        border-inline: none;
      }

      .accordion-flush ::ng-deep app-accordion-item:first-child .accordion-item {
        border-top: none;
      }
    `,
  ],
})
export class AccordionComponent {
  @Input() flush = false;
  @Input() single = false;

  private readonly items: AccordionItemComponent[] = [];

  register(item: AccordionItemComponent): void {
    this.items.push(item);
    if (this.single && item.isOpen()) {
      this.closeOtherItems(item);
    }
  }

  unregister(item: AccordionItemComponent): void {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  requestToggle(item: AccordionItemComponent): void {
    const nextOpen = !item.isOpen();
    if (nextOpen && this.single) {
      this.closeOtherItems(item);
    }
    item.setOpen(nextOpen, true);
  }

  moveFocus(item: AccordionItemComponent, key: string): boolean {
    const enabledItems = this.items.filter((candidate) => !candidate.disabled);
    const currentIndex = enabledItems.indexOf(item);
    if (currentIndex < 0 || enabledItems.length === 0) {
      return false;
    }

    let nextIndex: number;
    switch (key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % enabledItems.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = enabledItems.length - 1;
        break;
      default:
        return false;
    }

    enabledItems[nextIndex]?.focusHeader();
    return true;
  }

  private closeOtherItems(openItem: AccordionItemComponent): void {
    for (const item of this.items) {
      if (item !== openItem && item.isOpen()) {
        item.setOpen(false, true);
      }
    }
  }
}

/**
 * Elemento colapsable accesible. Debe utilizarse dentro de `app-accordion`.
 *
 * El encabezado es un botón nativo, mantiene relaciones ARIA completas y
 * participa en la navegación opcional con flechas, Home y End del organismo.
 */
@Component({
  selector: 'app-accordion-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="accordion-item" [class.open]="isOpen()" [class.disabled]="disabled">
      <!--
        EL TITULO DE UN PANEL ES UN ENCABEZADO, Y AQUI NO LO ERA.

        El disparador era un <button> suelto, asi que los paneles NO aparecian en
        el indice de encabezados. Quien navega saltando por titulos —que es como
        se recorre una pantalla con lector de pantalla— pasaba del titulo de la
        pagina directamente a lo que hubiera DENTRO del primer panel abierto, sin
        enterarse de que existian los demas ni de como se llamaban.

        Es lo que dicen las practicas de ARIA para acordeon: el boton va envuelto
        en un elemento con rol de encabezado. El nivel lo decide quien monta la
        pantalla, porque solo alli se sabe que hay por encima; 3 es el valor
        sensato bajo un <h1> de pagina y un <h2> de seccion.
      -->
      <div role="heading" [attr.aria-level]="headingLevel">
      <button
        #header
        type="button"
        class="accordion-header"
        [id]="headerId"
        [disabled]="disabled"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="contentId"
        (click)="toggle()"
        (keydown)="handleHeaderKeydown($event)"
      >
        <span class="accordion-heading">
          <span class="accordion-title">{{ title }}</span>
          @if (description) {
            <span class="accordion-description">{{ description }}</span>
          }
        </span>
        <span class="accordion-icon" aria-hidden="true">
          <i class="fa-solid fa-chevron-down"></i>
        </span>
      </button>
      </div>
      <div
        class="accordion-content"
        [id]="contentId"
        role="region"
        [attr.aria-labelledby]="headerId"
        [attr.aria-hidden]="!isOpen()"
        [attr.inert]="isOpen() ? null : ''"
      >
        <div class="accordion-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .accordion-item {
        overflow: hidden;
        border: thin solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--surface-background);
      }

      .accordion-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-4);
        border: none;
        border-bottom: thin solid transparent;
        background: var(--surface-section);
        color: var(--text-color);
        text-align: start;
        cursor: pointer;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          color 150ms ease;
      }

      .accordion-header:hover:not(:disabled) {
        background: var(--hover-background);
      }

      .accordion-header:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }

      .accordion-header:disabled {
        cursor: not-allowed;
        color: var(--input-disabled-text);
      }

      .accordion-heading {
        min-width: 0;
        display: grid;
        gap: var(--space-1);
      }

      .accordion-title {
        font-size: var(--text-md);
        font-weight: var(--font-weight-emphasis);
      }

      .accordion-description {
        color: var(--text-color-secondary);
        font-size: var(--text-xs);
        font-weight: var(--font-weight-body);
      }

      .accordion-item.open .accordion-header {
        border-bottom-color: var(--border-color);
        background: var(--hover-background);
        color: var(--primary-color);
      }

      .accordion-icon {
        flex: 0 0 auto;
        color: var(--text-color-muted);
        font-size: var(--text-xs);
        transition:
          color 150ms ease,
          transform 200ms ease;
      }

      .accordion-item.open .accordion-icon {
        color: var(--primary-color);
        transform: rotate(180deg);
      }

      .accordion-content {
        display: grid;
        grid-template-rows: 0fr;
        background: var(--surface-background);
        transition: grid-template-rows 200ms ease;
      }

      .accordion-item.open .accordion-content {
        grid-template-rows: 1fr;
      }

      /*
      UN CONTENEDOR DE DISPOSICION NO DECIDE LA TIPOGRAFIA DE LO QUE CONTIENE.

      El cuerpo del panel fijaba el color y el tamaño de letra, y eso lo hereda todo lo
      que se meta dentro: una tabla, un formulario, una tarjeta. La misma tabla se
      dibujaba mas pequeña y mas apagada por el solo hecho de estar dentro de un
      acordeon, y quien la comparaba con la de otra pantalla veia dos tablas
      distintas sin que nada lo explicara.

      El panel se queda con lo suyo —el hueco— y cada componente sigue trayendo su
      propia tipografia. El texto suelto que antes se apoyaba en esto la hereda
      ahora del contenedor de la pagina, que es de donde debe venir.
      */
      .accordion-body {
        min-height: 0;
        overflow: hidden;
        padding-inline: var(--space-4);
        line-height: 1.6;
      }

      .accordion-item.open .accordion-body {
        padding-block: var(--space-4);
      }

      @media (prefers-reduced-motion: reduce) {
        .accordion-header,
        .accordion-icon,
        .accordion-content {
          transition: none;
        }
      }
    `,
  ],
})
export class AccordionItemComponent implements OnInit, OnDestroy {
  private static nextId = 0;

  private readonly accordion = inject(AccordionComponent, { optional: true });
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() id = `accordion-${++AccordionItemComponent.nextId}`;
  @Input() title = '';
  @Input() description = '';
  /** Nivel del encabezado que anuncia este panel. Ver el comentario de arriba. */
  @Input() headingLevel = 3;
  @Input() disabled = false;
  @Input() set open(value: boolean) {
    this.setOpen(value, false);
  }
  @Output() readonly openChange = new EventEmitter<boolean>();

  readonly isOpen = signal(false);

  get headerId(): string {
    return `${this.id}-header`;
  }

  get contentId(): string {
    return `${this.id}-content`;
  }

  ngOnInit(): void {
    this.accordion?.register(this);
  }

  ngOnDestroy(): void {
    this.accordion?.unregister(this);
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }

    if (this.accordion) {
      this.accordion.requestToggle(this);
      return;
    }

    this.setOpen(!this.isOpen(), true);
  }

  setOpen(value: boolean, emit: boolean): void {
    if (this.isOpen() === value) {
      return;
    }

    if (!value) {
      this.focusHeaderWhenContentContainsFocus();
    }
    this.isOpen.set(value);
    if (emit) {
      this.openChange.emit(value);
    }
  }

  focusHeader(): void {
    this.elementRef.nativeElement
      .querySelector<HTMLButtonElement>('.accordion-header')
      ?.focus();
  }

  private focusHeaderWhenContentContainsFocus(): void {
    const host = this.elementRef.nativeElement;
    const content = host.querySelector<HTMLElement>('.accordion-content');
    const activeElement = host.ownerDocument.activeElement;
    if (content && activeElement && content.contains(activeElement)) {
      this.focusHeader();
    }
  }

  handleHeaderKeydown(event: KeyboardEvent): void {
    if (this.accordion?.moveFocus(this, event.key)) {
      event.preventDefault();
    }
  }
}
