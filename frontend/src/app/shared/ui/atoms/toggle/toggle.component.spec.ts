import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToggleComponent } from './toggle.component';

describe('ToggleComponent', () => {
  let component: ToggleComponent;
  let fixture: ComponentFixture<ToggleComponent>;

  function setInput(name: string, value: unknown): void {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Label ─────────────────────────────────────────────────────────────────
  describe('label', () => {
    it('should not render label span when label is empty', () => {
      const label = fixture.nativeElement.querySelector('.toggle-label');
      expect(label).toBeNull();
    });

    it('should render label text when label is set', () => {
      setInput('label', 'Activar notificaciones');
      const label = fixture.nativeElement.querySelector('.toggle-label');
      expect(label?.textContent?.trim()).toBe('Activar notificaciones');
    });
  });

  // ── Disabled ──────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('should apply disabled class on wrapper when disabled is true', () => {
      setInput('disabled', true);
      const wrapper = fixture.nativeElement.querySelector('.toggle-wrapper');
      expect(wrapper.classList.contains('disabled')).toBe(true);
    });

    it('should disable the checkbox input', () => {
      setInput('disabled', true);
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
      expect(input.disabled).toBe(true);
    });

    it('should set disabled via setDisabledState', () => {
      component.setDisabledState(true);
      expect(component.disabled).toBe(true);
      component.setDisabledState(false);
      expect(component.disabled).toBe(false);
    });
  });

  // ── ControlValueAccessor ──────────────────────────────────────────────────
  describe('ControlValueAccessor', () => {
    it('should set checked=true via writeValue(true)', () => {
      component.writeValue(true);
      expect(component.checked).toBe(true);
    });

    it('should notify a zoneless view after writeValue', async () => {
      component.writeValue(true);
      await fixture.whenStable();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      expect(input.checked).toBe(true);
      expect(input.getAttribute('aria-checked')).toBe('true');
    });

    it('should set checked=false via writeValue(false)', () => {
      component.writeValue(false);
      expect(component.checked).toBe(false);
    });

    it('should treat null/undefined as false in writeValue', () => {
      component.writeValue(null as unknown as boolean);
      expect(component.checked).toBe(false);
    });

    it('should call onChange callback when toggled', () => {
      let emittedValue: boolean | undefined;
      component.registerOnChange((v) => { emittedValue = v; });

      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.checked = true;
      input.dispatchEvent(new Event('change'));

      expect(emittedValue).toBe(true);
    });

    it('should call onTouched callback when toggled', () => {
      let touched = false;
      component.registerOnTouched(() => { touched = true; });

      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.checked = false;
      input.dispatchEvent(new Event('change'));

      expect(touched).toBe(true);
    });

    it('should update internal checked state when toggled', () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.checked = true;
      input.dispatchEvent(new Event('change'));

      expect(component.checked).toBe(true);
    });
  });

  it('should expose switch semantics and an accessible fallback name', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(input.getAttribute('role')).toBe('switch');
    expect(input.getAttribute('aria-label')).toBe('Alternar opción');
  });
});
