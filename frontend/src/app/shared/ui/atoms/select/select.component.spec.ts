import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { SelectComponent } from './select.component';

/*
La mitad olvidada del capitulo 4: rechazar una eleccion tiene que retirarla
tambien de la pantalla. El caso que se comprueba aqui es el que no se ve venir —
el padre repone EL MISMO valor que ya tenia— porque ahi el binding no vuelve a
escribir y el `<select>` se queda en lo que marco el navegador.
*/
@Component({
  standalone: true,
  imports: [SelectComponent, ReactiveFormsModule],
  template: `
    <app-select
      [options]="[
        { value: 'A', label: 'Ahorro' },
        { value: 'B', label: 'Credito' }
      ]"
      [formControl]="control"
    />
  `
})
class HostComponent {
  readonly control = new FormControl<string>('A');
}

describe('SelectComponent: el rechazo se ve', () => {
  let fixture: ComponentFixture<HostComponent>;
  let native: HTMLSelectElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    native = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
  });

  it('devuelve el desplegable al valor del padre cuando ese valor no cambia', () => {
    expect(native.value).toBe('A');

    // El padre rechaza B dentro del mismo flujo del cambio. No debe existir un
    // ciclo intermedio que actualice el binding, porque esa espera ocultaba la
    // regresión: para Angular el último valor renderizado y el repuesto siguen
    // siendo A, aunque el navegador ya haya movido el control nativo a B.
    const subscription = fixture.componentInstance.control.valueChanges.subscribe((value) => {
      if (value === 'B') {
        fixture.componentInstance.control.setValue('A', { emitEvent: false });
      }
    });

    native.value = 'B';
    native.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('A');
    expect(native.value).toBe('A');
    subscription.unsubscribe();
  });

  it('acepta una eleccion valida sin deshacerla', () => {
    native.value = 'B';
    native.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('B');
    expect(native.value).toBe('B');
  });
});
