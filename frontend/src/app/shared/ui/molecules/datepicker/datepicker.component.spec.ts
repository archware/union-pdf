import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DatepickerComponent } from './datepicker.component';

/*
UNA FECHA CIVIL NO PUEDE PERDER UN DIA AL ENTRAR.

El backend manda «2026-08-13»: fecha de calendario, sin hora y sin huso. Pero
ECMAScript obliga a interpretar las cadenas de SOLO FECHA como UTC, de modo que
`new Date('2026-08-13')` es, en cualquier huso negativo, el 12 por la tarde en
hora local. Como el componente formatea con `DatePipe` —que formatea en local—,
el usuario veia 12/08/2026 para lo que el servidor guardo como 13.

Estas pruebas se escriben contra los COMPONENTES LOCALES de la fecha
(getFullYear/getMonth/getDate) y no contra su representacion ISO, porque es
justo lo que el usuario ve. Son validas en cualquier huso: en UTC y en husos
positivos el defecto no se manifestaba, y por eso sobrevivio tanto.
*/
describe('DatepickerComponent — fechas civiles', () => {
  let component: DatepickerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    component = TestBed.createComponent(DatepickerComponent).componentInstance;
  });

  it('conserva el dia de una fecha ISO sin hora', () => {
    component.writeValue('2026-08-13');

    const valor = component.value();
    expect(valor).not.toBeNull();
    expect(valor!.getFullYear()).toBe(2026);
    expect(valor!.getMonth()).toBe(7);
    expect(valor!.getDate()).toBe(13);
  });

  it('lo pinta con el mismo dia que recibio', () => {
    component.writeValue('2026-01-01');

    expect(component.formattedValue()).toBe('01/01/2026');
  });

  it('rechaza una fecha que no existe en vez de desbordarla al mes siguiente', () => {
    // `new Date(2026, 1, 30)` no falla: da el 2 de marzo. Aceptarlo
    // convertiria un dato erroneo del servidor en una fecha plausible y
    // silenciosa.
    component.writeValue('2026-02-30');

    expect(component.value()).toBeNull();
  });

  it('rechaza una cadena que no es fecha', () => {
    component.writeValue('no-es-fecha');

    expect(component.value()).toBeNull();
  });

  it('respeta una cadena CON hora, que si designa un instante', () => {
    component.writeValue('2026-08-13T15:30:00');

    const valor = component.value();
    expect(valor).not.toBeNull();
    expect(valor!.getDate()).toBe(13);
    expect(valor!.getHours()).toBe(15);
  });

  it('acepta un Date tal cual', () => {
    const fecha = new Date(2026, 7, 13);
    component.writeValue(fecha);

    expect(component.value()).toBe(fecha);
  });

  it('limpia el valor con null', () => {
    component.writeValue('2026-08-13');
    component.writeValue(null);

    expect(component.value()).toBeNull();
  });

  /*
    ESCAPE NO PUEDE LLEVARSE EL DIALOGO QUE CONTIENE AL CALENDARIO.

    Dentro de un `<dialog>`, una pulsacion no cancelada se trata como peticion
    de cierre: cerrar el calendario cerraba el formulario entero con todo lo
    escrito. La rama de vista de dia ya lo cancelaba; la de mes y ano no, de
    modo que el mismo componente se comportaba distinto segun donde estuvieras.
  */
  it('cancela el Escape en las tres vistas, no solo en la de dia', () => {
    for (const vista of ['day', 'month', 'year'] as const) {
      component.isOpen.set(true);
      component.currentView.set(vista);

      const evento = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const detenerPropagacion = vi.spyOn(evento, 'stopPropagation');
      component.onKeyDown(evento);

      expect(evento.defaultPrevented).toBe(true);
      expect(detenerPropagacion).toHaveBeenCalledOnce();
      expect(component.isOpen()).toBe(false);
    }
  });
});
