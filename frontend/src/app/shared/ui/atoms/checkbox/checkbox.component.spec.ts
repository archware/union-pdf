import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckboxComponent } from './checkbox.component';

describe('CheckboxComponent: estado deshabilitado', () => {
  let fixture: ComponentFixture<CheckboxComponent>;
  let component: CheckboxComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckboxComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(CheckboxComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Opción');
  });

  it('aplica la señal deshabilitada a la etiqueta y al control no marcado', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const entrada = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const envoltorio = fixture.nativeElement.querySelector('.checkbox-wrapper') as HTMLElement;
    const estilos = ((CheckboxComponent as unknown as {
      ɵcmp: { styles: readonly string[] };
    }).ɵcmp.styles).join('\n')
      .replace(/\[_ng(?:host|content)-%COMP%\]/g, '')
      .replace(/--%NS%/g, '--')
      .replace(/\s+/g, ' ');

    expect(entrada.disabled).toBe(true);
    expect(envoltorio.classList.contains('disabled')).toBe(true);
    expect(estilos).toContain('.checkbox-wrapper.disabled .checkbox-label');
    expect(estilos).toContain('background: var(--input-disabled-bg)');
    expect(estilos).toContain('border-color: var(--input-disabled-text)');
    expect(estilos).not.toMatch(/\.checkbox-wrapper\.disabled[^}]*opacity\s*:/s);
  });

  it('conserva una marca distinguible cuando está marcado y deshabilitado', () => {
    component.writeValue(true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const entrada = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const estilos = ((CheckboxComponent as unknown as {
      ɵcmp: { styles: readonly string[] };
    }).ɵcmp.styles).join('\n')
      .replace(/\[_ng(?:host|content)-%COMP%\]/g, '')
      .replace(/--%NS%/g, '--')
      .replace(/\s+/g, ' ');

    expect(entrada.checked).toBe(true);
    expect(entrada.disabled).toBe(true);
    expect(estilos).toContain('.checkbox-wrapper.disabled .checkbox-input:checked + .checkbox-box');
    expect(estilos).toContain('.checkbox-wrapper.disabled .checkbox-check');
  });
});
