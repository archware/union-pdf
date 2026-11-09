import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ButtonComponent, ButtonTone, ButtonVariant } from './button.component';

@Component({
  selector: 'app-formulario-button-host',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <form (submit)="registrarEnvio($event)">
      <app-button type="submit" [loading]="cargando">Guardar</app-button>
    </form>
  `,
})
class FormularioButtonHost {
  cargando = true;
  envios = 0;

  registrarEnvio(event: Event): void {
    event.preventDefault();
    this.envios += 1;
  }
}

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  function setInput(name: string, value: unknown): void {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('variant classes', () => {
    const variants: ButtonVariant[] = [
      'primary',
      'secondary',
      'success',
      'warning',
      'danger',
      'soft',
      'outline',
      'ghost',
      'link',
    ];

    variants.forEach((variant) => {
      it(`should apply btn-${variant} class when variant is ${variant}`, () => {
        setInput('variant', variant);

        const button = fixture.nativeElement.querySelector('button');
        expect(button.classList.contains(`btn-${variant}`)).toBe(true);
      });
    });
  });

  describe('semantic tones', () => {
    const tones: ButtonTone[] = [
      'neutral',
      'primary',
      'secondary',
      'success',
      'warning',
      'danger',
      'info',
    ];

    tones.forEach((tone) => {
      it(`should apply btn-tone-${tone} when tone is ${tone}`, () => {
        setInput('variant', 'soft');
        setInput('tone', tone);

        const button = fixture.nativeElement.querySelector('button');
        expect(button.classList.contains(`btn-tone-${tone}`)).toBe(true);
      });
    });

    it('should keep auxiliary actions neutral by default', () => {
      setInput('variant', 'outline');

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('btn-tone-neutral')).toBe(true);
    });
  });

  describe('size classes', () => {
    it('should apply btn-sm class for small size', () => {
      setInput('size', 'sm');

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('btn-sm')).toBe(true);
    });

    it('should apply btn-lg class for large size', () => {
      setInput('size', 'lg');

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('btn-lg')).toBe(true);
    });

    it('should not add size class for medium (default)', () => {
      setInput('size', 'md');

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('btn-md')).toBe(false);
    });
  });

  describe('dialog close contract', () => {
    it('keeps the projected close control square and centered', () => {
      fixture.nativeElement.setAttribute('dialog-close', '');
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const button = host.querySelector('button') as HTMLButtonElement;
      host.style.setProperty('--control-height', '44px');

      expect(getComputedStyle(host).display).toBe('inline-flex');
      expect(['44px', 'var(--control-height)']).toContain(getComputedStyle(host).width);
      expect(['44px', 'var(--control-height)']).toContain(getComputedStyle(host).height);
      expect(getComputedStyle(button).paddingLeft).toBe('0px');
      expect(getComputedStyle(button).paddingRight).toBe('0px');
    });
  });

  describe('width contract', () => {
    it('stretches the host and native control when fullWidth is enabled', () => {
      const host = fixture.nativeElement as HTMLElement;
      host.style.width = '326px';
      setInput('fullWidth', true);
      const button = host.querySelector('button') as HTMLButtonElement;

      expect(host.classList).toContain('atomic-button--full-width');
      expect(['326px', '100%']).toContain(getComputedStyle(button).width);
    });

    it('keeps the native control intrinsic by default', () => {
      const host = fixture.nativeElement as HTMLElement;
      host.style.width = '326px';
      const button = host.querySelector('button') as HTMLButtonElement;

      expect(host.classList).not.toContain('atomic-button--full-width');
      expect(getComputedStyle(button).width).not.toBe('326px');
    });
  });

  describe('disabled state', () => {
    it('should set disabled attribute when disabled is true', () => {
      setInput('disabled', true);

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });

    it('should not be disabled by default', () => {
      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });

    it('usa la superficie deshabilitada accesible en todas las variantes', () => {
      setInput('disabled', true);

      const variantes: ButtonVariant[] = [
        'primary', 'secondary', 'success', 'warning', 'danger',
        'soft', 'outline', 'ghost', 'link',
      ];

      for (const variante of variantes) {
        setInput('variant', variante);
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        expect(button.classList.contains(`btn-${variante}`)).toBe(true);
      }
    });

    it('cancela la acción nativa cuando el componente no está disponible', () => {
      for (const estado of ['disabled', 'loading'] as const) {
        setInput('disabled', estado === 'disabled');
        setInput('loading', estado === 'loading');
        const evento = new MouseEvent('click', { cancelable: true });

        component.onButtonClick(evento);

        expect(evento.defaultPrevented).toBe(true);
      }
    });
  });

  describe('loading state', () => {
    /*
      La carga ya NO pone `disabled`. Deshabilitar un boton al pulsarlo hace que
      el navegador le descarte el foco —se lo quita a si mismo— y lo saca del
      arbol de accesibilidad, con lo que el `aria-busy` que anuncia el progreso
      no le llega a nadie. Ahora lo dicen `aria-disabled` y `aria-busy`.
    */
    it('announces progress without removing itself from focus', () => {
      setInput('loading', true);

      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      const spinner = button.querySelector('.btn-spinner') as HTMLElement;

      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(spinner).not.toBeNull();
      expect(spinner.getAttribute('aria-hidden')).toBe('true');
    });

    it('prevents a second activation after the consumer marks the first one as loading', () => {
      let emissions = 0;
      component.buttonClick.subscribe(() => {
        emissions += 1;
        setInput('loading', true);
      });

      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      button.click();
      button.click();

      expect(emissions).toBe(1);
      // Sigue sin emitir la segunda vez, pero por la guarda de `onButtonClick`,
      // no por haberse quitado del recorrido del teclado.
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('click event', () => {
    it('should emit buttonClick event when clicked', () => {
      vi.spyOn(component.buttonClick, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(component.buttonClick.emit).toHaveBeenCalled();
    });
  });

  describe('button type', () => {
    it('should default to type="button"', () => {
      const button = fixture.nativeElement.querySelector('button');
      expect(button.type).toBe('button');
    });

    it('should set type="submit" when specified', () => {
      setInput('type', 'submit');

      const button = fixture.nativeElement.querySelector('button');
      expect(button.type).toBe('submit');
    });
  });

  describe('font icon class', () => {
    [
      ['save', 'fa-solid fa-save'],
      ['fa-save', 'fa-solid fa-save'],
      ['fa-solid fa-save', 'fa-solid fa-save'],
    ].forEach(([iconClass, expected]) => {
      it(`normalizes the Font Awesome contract for ${iconClass}`, () => {
        setInput('iconClass', iconClass);

        const icon = fixture.nativeElement.querySelector('i');
        expect(icon?.classList.contains('fa-solid')).toBe(true);
        expect(icon?.classList.contains('fa-save')).toBe(true);
        expect(new Set(icon?.className.split(/\s+/))).toEqual(new Set(expected.split(/\s+/)));
        expect(icon?.className).not.toContain('fa-fa-');
        expect(icon?.closest('.btn-icon-wrapper')?.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  describe('icon', () => {
    it('should display emoji icon when provided', () => {
      setInput('icon', '🔍');
      setInput('iconPosition', 'left');

      const iconSpan = fixture.nativeElement.querySelector('.btn-icon--emoji');
      expect(iconSpan?.textContent?.trim()).toBe('🔍');
      expect(iconSpan?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});

describe('ButtonComponent dentro de un formulario', () => {
  it('no dispara submit nativo mientras loading conserva el foco', async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioButtonHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(FormularioButtonHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.focus();
    button.click();

    expect(fixture.componentInstance.envios).toBe(0);
    expect(document.activeElement).toBe(button);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});

/*
ARIA del control, no del envoltorio.

Sin estas entradas, quien necesita un boton de divulgacion solo podia poner
`aria-expanded` sobre `<app-button>`, que es un elemento sin rol: el atributo
quedaba inerte y el lector anunciaba un boton corriente que nunca decia si
estaba abierto o cerrado. Se veia bien, se pulsaba bien, y no informaba.
*/
describe('ButtonComponent aria de divulgacion', () => {
  let fixture: ComponentFixture<ButtonComponent>;

  const nativo = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const set = (name: string, value: unknown) => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();
  });

  it('pone el aria en el <button> real y no en el elemento anfitrion', () => {
    set('ariaLabel', 'Abrir menu');
    set('ariaControls', 'cajon');
    set('ariaExpanded', false);

    expect(nativo().getAttribute('aria-label')).toBe('Abrir menu');
    expect(nativo().getAttribute('aria-controls')).toBe('cajon');
    expect(nativo().getAttribute('aria-expanded')).toBe('false');
    // Y no se queda en el anfitrion, que es donde no sirve para nada.
    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-expanded')).toBeNull();
  });

  it('refleja el cambio de estado', () => {
    set('ariaExpanded', false);
    expect(nativo().getAttribute('aria-expanded')).toBe('false');

    set('ariaExpanded', true);
    expect(nativo().getAttribute('aria-expanded')).toBe('true');
  });

  /*
   `null` no declara el atributo. `aria-expanded="false"` sobre un boton que no
   despliega nada es una promesa falsa: el lector anuncia que hay algo que abrir.
  */
  it('sin estado de divulgacion no declara el atributo', () => {
    set('ariaExpanded', null);

    expect(nativo().getAttribute('aria-expanded')).toBeNull();
  });
});

describe('ButtonComponent foco programatico', () => {
  /*
   Devolver el foco es la mitad que se olvida del patron de divulgacion. Sin un
   `focus()` que llegue al control real, `nativeElement.focus()` sobre
   `<app-button>` —que no es focusable— manda el foco al <body>: la siguiente
   tabulacion reempieza desde el principio del documento y quien navega con
   teclado pierde el sitio.
  */
  it('lleva el foco al control real y no al elemento anfitrion', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
  });
});

/*
  UN BOTON QUE SE DESHABILITA AL PULSARLO SE QUITA EL FOCO A SI MISMO.

  Es el caso de todo boton de guardar: se pulsa, arranca la peticion, `loading`
  pasa a true. Con `disabled` el navegador descarta el foco, y quien confirma con
  el teclado pierde el punto de partida —el siguiente Tab empieza desde el
  principio del documento— justo cuando esperaba el resultado. Ademas `disabled`
  saca al elemento del arbol de accesibilidad, asi que el `aria-busy` que dice
  «sigo trabajando» no le llega a nadie.
*/
describe('AtomicButton: la carga no roba el foco', () => {
  it('conserva el foco al entrar en carga y lo anuncia con aria', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    boton.focus();
    expect(document.activeElement).toBe(boton);

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(boton);
    expect(boton.disabled).toBe(false);
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    expect(boton.getAttribute('aria-busy')).toBe('true');
  });

  it('sigue sin emitir mientras carga', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    let emitidos = 0;
    fixture.componentInstance.buttonClick.subscribe(() => (emitidos += 1));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitidos).toBe(0);
  });

  it('el deshabilitado de verdad si sale del recorrido', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

/*
  UN BOTON DE SOLO ICONO SE SALIA DE SU PROPIO BORDE.

  El consumidor puede darle al host un tamaño cuadrado, pero el <button> de
  dentro conserva su relleno horizontal, asi que desborda y pisa lo que tenga al
  lado. Paso de verdad: el boton de tema de la barra superior se solapaba con el
  menu de usuario.
*/
describe('ButtonComponent: solo icono', () => {
  it('deja el control interior cuadrado y sin relleno', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.nativeElement.setAttribute('icon-only', '');
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const estilo = getComputedStyle(boton);

    expect(estilo.paddingLeft).toBe('0px');
    expect(estilo.paddingRight).toBe('0px');
    expect(boton.getBoundingClientRect().width).toBeLessThanOrEqual(
      (fixture.nativeElement as HTMLElement).getBoundingClientRect().width,
    );
  });
});

describe('ButtonComponent: appearance y tone secundario', () => {
  it('mantiene appearance="flat" por defecto sin clase btn-gradient', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(fixture.componentInstance.appearance).toBe('flat');
    expect(boton.classList.contains('btn-gradient')).toBe(false);
  });

  it('aplica la clase btn-gradient cuando appearance="gradient"', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('appearance', 'gradient');
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(boton.classList.contains('btn-gradient')).toBe(true);
  });

  it('aplica la clase btn-tone-secondary cuando tone="secondary"', async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('variant', 'soft');
    fixture.componentRef.setInput('tone', 'secondary');
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(boton.classList.contains('btn-soft')).toBe(true);
    expect(boton.classList.contains('btn-tone-secondary')).toBe(true);
  });
});

