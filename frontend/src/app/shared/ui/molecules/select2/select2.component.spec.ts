import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Select2Component } from './select2.component';

describe('Select2Component', () => {
  let fixture: ComponentFixture<Select2Component>;

  beforeEach(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    await TestBed.configureTestingModule({
      imports: [Select2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(Select2Component);
    fixture.componentRef.setInput('options', [{ label: 'Ayacucho', value: 'AYA' }]);
    fixture.detectChanges();
  });

  it('elevates its wrapper while the option list is open', () => {
    fixture.componentInstance.toggleDropdown();
    fixture.detectChanges();

    const wrapper = (fixture.nativeElement as HTMLElement).querySelector(
      '.select2-wrapper',
    ) as HTMLElement;
    expect(wrapper.classList).toContain('open');
    expect(getComputedStyle(wrapper).zIndex).toBe('1000');
  });

  it('removes a disabled control from the tab order and keeps it closed', () => {
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      '.select2-trigger',
    ) as HTMLElement;

    trigger.click();

    expect(trigger.tabIndex).toBe(-1);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('announces disabled options and skips them when the list opens', () => {
    fixture.componentRef.setInput('options', [
      { label: 'No disponible', value: 'blocked', disabled: true },
      { label: 'Ayacucho', value: 'AYA' },
    ]);
    fixture.componentInstance.toggleDropdown();
    fixture.detectChanges();

    const options = (fixture.nativeElement as HTMLElement).querySelectorAll('.select2-option');
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      '.select2-trigger',
    ) as HTMLElement;
    expect(options[0].getAttribute('aria-disabled')).toBe('true');
    expect(fixture.componentInstance.highlightedIndex()).toBe(1);
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-1');
  });

  it('gives every removable tag an explicit accessible label', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.componentInstance.writeValue(['AYA']);
    fixture.detectChanges();

    const remove = (fixture.nativeElement as HTMLElement).querySelector(
      '.tag-remove',
    ) as HTMLButtonElement;
    expect(remove.getAttribute('aria-label')).toBe('Quitar Ayacucho');
  });

  it('rehydrates selected labels when asynchronous options are replaced', () => {
    fixture.componentInstance.writeValue('AYA');
    fixture.componentRef.setInput('options', [
      { label: 'Ayacucho actualizado', value: 'AYA' },
      { label: 'Huamanga', value: 'HUA' },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedOption()?.label).toBe('Ayacucho actualizado');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.select2-value')?.textContent,
    ).toContain('Ayacucho actualizado');
  });

  it('uses the explicit accessible label when no visible label is provided', () => {
    fixture.componentRef.setInput('label', '');
    fixture.componentRef.setInput('ariaLabel', 'Provincia de atención');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.select2-trigger')
        ?.getAttribute('aria-label'),
    ).toBe('Provincia de atención');
  });
});
