import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NumberInputComponent } from './number-input.component';

describe('NumberInputComponent', () => {
  /*
  Capitulo 4, la mitad que se olvida: rechazar una entrada tiene que retirarla
  tambien del campo. Un recorte mudo deja la pantalla contando una cifra y el
  total sumando otra, que en un arqueo de caja es dinero que no cuadra.
  */
  async function montar(max: number, min = 0): Promise<{
    readonly input: HTMLInputElement;
    readonly host: HTMLElement;
    readonly cambios: number[];
    readonly refrescar: () => void;
  }> {
    await TestBed.configureTestingModule({ imports: [NumberInputComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NumberInputComponent);
    fixture.componentRef.setInput('min', min);
    fixture.componentRef.setInput('max', max);
    const cambios: number[] = [];
    fixture.componentInstance.registerOnChange((value) => cambios.push(value));
    fixture.detectChanges();
    return {
      input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
      host: fixture.nativeElement as HTMLElement,
      cambios,
      refrescar: () => fixture.detectChanges(),
    };
  }

  function teclear(input: HTMLInputElement, texto: string): void {
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  }

  it('devuelve el campo a la cantidad contada cuando el recorte no cambia el numero', async () => {
    const { input, cambios, refrescar } = await montar(100);

    teclear(input, '500');
    refrescar();
    // Segunda vez por encima del maximo: el modelo ya vale 100 y no cambia, asi
    // que el binding no reescribe nada. Ahi es donde el campo se quedaba en 900.
    teclear(input, '900');
    refrescar();

    expect(cambios[cambios.length - 1]).toBe(100);
    expect(input.value).toBe('100');
  });

  it('dice que ajusto lo tecleado en vez de recortarlo en silencio', async () => {
    const { input, host, refrescar } = await montar(100);

    teclear(input, '500');
    refrescar();

    const aviso = host.querySelector('.number-input__adjustment');
    expect(aviso?.textContent).toContain('100');
    expect(aviso?.getAttribute('role')).toBe('status');
  });

  it('no deja el campo enseñando texto que no es un numero', async () => {
    const { input, cambios, refrescar } = await montar(100);

    teclear(input, '10');
    refrescar();
    /*
      En un `type=number`, teclear `1o0` deja el campo ENSEÑANDO `1o0` mientras
      `value` vale cadena vacia; solo `validity.badInput` los distingue. Ese
      estado no se puede producir asignando `value` desde el guion —el navegador
      lo normaliza—, asi que se sustituye la propiedad que lo delata.
    */
    Object.defineProperty(input, 'validity', {
      configurable: true,
      value: { badInput: true },
    });
    teclear(input, '');
    refrescar();

    // El modelo se queda en lo ultimo contado y el campo vuelve a ensenarlo.
    expect(cambios[cambios.length - 1]).toBe(10);
    expect(input.value).toBe('10');
  });

  it('deja vaciar el campo para volver a teclear, contando cero', async () => {
    const { input, cambios, refrescar } = await montar(100);

    teclear(input, '25');
    refrescar();
    teclear(input, '');
    refrescar();

    expect(cambios[cambios.length - 1]).toBe(0);
    // Lo que se ve y lo que se cuenta dicen lo mismo: cero.
    expect(input.value).toBe('0');
  });

  it('limita el vacio al minimo cuando el rango no admite cero', async () => {
    const { input, host, cambios, refrescar } = await montar(10, 1);

    teclear(input, '5');
    refrescar();
    teclear(input, '');
    refrescar();

    expect(cambios[cambios.length - 1]).toBe(1);
    expect(input.value).toBe('1');
    expect(host.querySelector('.number-input__adjustment')?.textContent).toContain('1');
  });

  it('limita el vacio al maximo cuando todo el rango es negativo', async () => {
    const { input, cambios, refrescar } = await montar(-1, -10);

    teclear(input, '-5');
    refrescar();
    teclear(input, '');
    refrescar();

    expect(cambios[cambios.length - 1]).toBe(-1);
    expect(input.value).toBe('-1');
  });

  it('relaciona ayuda y error con el campo y expone el estado invalido', async () => {
    await TestBed.configureTestingModule({ imports: [NumberInputComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NumberInputComponent);
    fixture.componentRef.setInput('inputId', 'installments');
    fixture.componentRef.setInput('label', 'Cuotas');
    fixture.componentRef.setInput('hint', 'Entre 1 y 24.');
    fixture.componentRef.setInput('error', 'Seleccione un número válido.');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe('installments-hint installments-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-label')).toBeNull();
    expect(fixture.nativeElement.querySelector('#installments-error').getAttribute('role')).toBe(
      'alert',
    );
  });

  it('incrementa, limita y notifica el control como tocado', async () => {
    await TestBed.configureTestingModule({ imports: [NumberInputComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NumberInputComponent);
    fixture.componentRef.setInput('min', 1);
    fixture.componentRef.setInput('max', 2);
    fixture.componentInstance.writeValue(1);
    const changes: number[] = [];
    let touched = 0;
    fixture.componentInstance.registerOnChange((value) => changes.push(value));
    fixture.componentInstance.registerOnTouched(() => (touched += 1));
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    fixture.detectChanges();
    buttons[1].click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('2');
    expect(changes).toEqual([2]);
    expect(touched).toBe(1);
    expect(buttons[1].disabled).toBe(true);
  });

  it('crea identificadores deterministas por instancia', async () => {
    await TestBed.configureTestingModule({ imports: [NumberInputComponent] }).compileComponents();
    const first = TestBed.createComponent(NumberInputComponent);
    const second = TestBed.createComponent(NumberInputComponent);
    first.detectChanges();
    second.detectChanges();

    const firstId = (first.nativeElement.querySelector('input') as HTMLInputElement).id;
    const secondId = (second.nativeElement.querySelector('input') as HTMLInputElement).id;
    expect(firstId).toMatch(/^number-input-\d+$/);
    expect(secondId).toMatch(/^number-input-\d+$/);
    expect(firstId).not.toBe(secondId);
  });
});
