import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ComboboxComponent } from './combobox.component';

describe('ComboboxComponent', () => {
  let fixture: ComponentFixture<ComboboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComboboxComponent);
    fixture.componentRef.setInput('options', [{ label: 'Ayacucho', value: 'AYA' }]);
    fixture.detectChanges();
  });

  it('elevates its container while the option list is open', () => {
    fixture.componentInstance.onFocus();
    fixture.detectChanges();

    const combobox = (fixture.nativeElement as HTMLElement).querySelector(
      '.combobox',
    ) as HTMLElement;
    expect(combobox.classList).toContain('combobox-open');
    expect(getComputedStyle(combobox).zIndex).toBe('1000');
  });

  it('keeps disabled options visible and skips them during keyboard navigation', () => {
    fixture.componentRef.setInput('options', [
      { label: 'No disponible', value: 'blocked', disabled: true },
      { label: 'Ayacucho', value: 'AYA' },
    ]);
    fixture.detectChanges();

    fixture.componentInstance.onFocus();
    fixture.detectChanges();
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll('.combobox-option');

    expect(options.length).toBe(2);
    expect(options[0].getAttribute('aria-disabled')).toBe('true');
    expect(fixture.componentInstance.highlightedIndex()).toBe(1);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[role="combobox"]')
        ?.getAttribute('aria-activedescendant')
    ).toContain('-option-1');
  });

  it('representa el estado deshabilitado con tokens semánticos y sin opacidad', () => {
    const estilos = (
      ComboboxComponent as unknown as { ɵcmp: { styles?: string[] } }
    ).ɵcmp.styles
      ?.join('\n')
      .replace(/\[_ng(?:host|content)-%COMP%\]/g, '')
      .replace(/--%NS%/g, '--')
      .replace(/\s+/g, ' ') ?? '';

    expect(estilos).toContain(
      '.combobox-input:disabled { background: var(--input-disabled-bg); cursor: not-allowed; color: var(--input-disabled-text);',
    );
    expect(estilos).toContain(
      '.combobox-option-disabled { background: var(--input-disabled-bg); color: var(--input-disabled-text); cursor: not-allowed;',
    );
    expect(estilos).not.toMatch(/combobox-(?:input|option)[^{]*\{[^}]*opacity\s*:/);
  });

  it('closes the popup and removes focusability when disabled through the forms API', () => {
    fixture.componentInstance.onFocus();
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(input.disabled).toBe(true);
  });

  it('exposes an accessible name and associates validation feedback', () => {
    fixture.componentRef.setInput('label', '');
    fixture.componentRef.setInput('ariaLabel', 'Distrito de atención');
    fixture.componentRef.setInput('error', 'Seleccione un distrito');
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    const error = (fixture.nativeElement as HTMLElement).querySelector('.combobox-error') as HTMLElement;
    expect(input.getAttribute('aria-label')).toBe('Distrito de atención');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-errormessage')).toBe(error.id);
  });

  it('refreshes the selected label and filtered options when options change', () => {
    fixture.componentInstance.writeValue('AYA');
    fixture.detectChanges();
    expect(fixture.componentInstance.inputValue()).toBe('Ayacucho');

    fixture.componentRef.setInput('options', [
      { label: 'Ayacucho actualizado', value: 'AYA' },
      { label: 'Huamanga', value: 'HUA' },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.inputValue()).toBe('Ayacucho actualizado');
    fixture.componentInstance.inputValue.set('');
    expect(fixture.componentInstance.filteredOptions().map(option => option.value)).toEqual([
      'AYA',
      'HUA',
    ]);
  });
});
