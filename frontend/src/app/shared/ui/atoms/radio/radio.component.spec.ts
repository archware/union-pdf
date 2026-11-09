import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadioComponent } from './radio.component';

describe('RadioComponent: estado deshabilitado', () => {
  let fixture: ComponentFixture<RadioComponent>;
  let component: RadioComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(RadioComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Preferencia');
    fixture.componentRef.setInput('options', [
      { value: 'correo', label: 'Correo' },
      { value: 'telefono', label: 'Teléfono' },
    ]);
  });

  it('aplica la señal deshabilitada al grupo, las etiquetas y los controles', () => {
    component.writeValue('correo');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const entradas = Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
    const grupo = fixture.nativeElement.querySelector('.radio-group') as HTMLElement;
    const envoltorios = Array.from(fixture.nativeElement.querySelectorAll('.radio-wrapper')) as HTMLElement[];
    const estilos = ((RadioComponent as unknown as {
      ɵcmp: { styles: readonly string[] };
    }).ɵcmp.styles).join('\n')
      .replace(/\[_ng(?:host|content)-%COMP%\]/g, '')
      .replace(/--%NS%/g, '--')
      .replace(/\s+/g, ' ');

    expect(entradas.every((entrada) => entrada.disabled)).toBe(true);
    expect(grupo.classList.contains('disabled')).toBe(true);
    expect(envoltorios.every((envoltorio) => envoltorio.classList.contains('disabled'))).toBe(true);
    expect(envoltorios[0].classList.contains('selected')).toBe(true);
    expect(estilos).toContain('.radio-group.disabled .radio-group-label');
    expect(estilos).toContain('.radio-wrapper.disabled .radio-input:checked + .radio-circle');
    expect(estilos).toContain('background: var(--input-disabled-bg)');
    expect(estilos).not.toMatch(/\.radio-wrapper\.disabled[^}]*opacity\s*:/s);
  });

  it('aplica el mismo contrato a una opción deshabilitada de forma individual', () => {
    fixture.componentRef.setInput('options', [
      { value: 'correo', label: 'Correo' },
      { value: 'telefono', label: 'Teléfono', disabled: true },
    ]);
    component.writeValue('telefono');
    fixture.detectChanges();
    const contenedores = Array.from(fixture.nativeElement.querySelectorAll('.radio-wrapper')) as HTMLElement[];
    const entradas = Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];

    expect(entradas[0].disabled).toBe(false);
    expect(entradas[1].disabled).toBe(true);
    expect(contenedores[1].classList.contains('disabled')).toBe(true);
    expect(contenedores[1].classList.contains('selected')).toBe(true);
  });
});
