import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingInputComponent, FloatingInputVariant } from './floating-input.component';

describe('FloatingInputComponent', () => {
  let component: FloatingInputComponent;
  let fixture: ComponentFixture<FloatingInputComponent>;

  function setInput(name: string, value: unknown): void {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingInputComponent, FormsModule],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('variant classes', () => {
    const variants: FloatingInputVariant[] = ['floating', 'underline', 'material', 'outline'];

    variants.forEach(variant => {
      it(`should apply variant-${variant} class when variant is ${variant}`, () => {
        setInput('variant', variant);

        const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
        expect(wrapper.classList.contains(`variant-${variant}`)).toBe(true);
      });
    });
  });

  describe('label', () => {
    it('should display label text', () => {
      setInput('label', 'Email');

      const label = fixture.nativeElement.querySelector('.floating-label');
      expect(label.textContent).toBe('Email');
    });
  });

  describe('focus state', () => {
    it('should add focused class on focus', () => {
      component.onFocus();
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.classList.contains('focused')).toBe(true);
    });

    it('should remove focused class on blur', () => {
      component.onFocus();
      fixture.detectChanges();

      component.onBlur();
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.classList.contains('focused')).toBe(false);
    });
  });

  describe('has-value state', () => {
    it('should add has-value class when input has value', () => {
      setInput('value', 'test');

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.classList.contains('has-value')).toBe(true);
    });

    it('should not have has-value class when empty', () => {
      setInput('value', '');

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.classList.contains('has-value')).toBe(false);
    });
  });

  describe('error state', () => {
    it('should add has-error class when error is provided', () => {
      setInput('error', 'Campo requerido');

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.classList.contains('has-error')).toBe(true);
    });

    it('should display error message', () => {
      setInput('error', 'Campo requerido');

      const errorEl = fixture.nativeElement.querySelector('.input-error');
      expect(errorEl.textContent).toBe('Campo requerido');
    });
  });

  describe('disabled state', () => {
    it('should add disabled class when disabled', () => {
      setInput('disabled', true);

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.classList.contains('disabled')).toBe(true);
    });

    it('should set disabled attribute on input', () => {
      setInput('disabled', true);

      const input = fixture.nativeElement.querySelector('.floating-input');
      expect(input.disabled).toBe(true);
    });
  });

  describe('password toggle', () => {
    it('scopes suppression of duplicate WebView2 password controls to the component input', () => {
      setInput('type', 'password');

      const componentStyles = Array.from(document.head.querySelectorAll('style'))
        .map(style => style.textContent ?? '')
        .join('\n');
      expect(componentStyles).toMatch(/\.floating-input[^{,]*::-ms-reveal/);
      expect(componentStyles).toMatch(/\.floating-input[^{,]*::-ms-clear/);
    });

    it('renders a native keyboard-focusable button associated with the password input', () => {
      setInput('type', 'password');

      const input = fixture.nativeElement.querySelector('.floating-input') as HTMLInputElement;
      const toggleBtn = fixture.nativeElement.querySelector('.input-icon-btn') as HTMLButtonElement;

      expect(toggleBtn.tagName).toBe('BUTTON');
      expect(toggleBtn.type).toBe('button');
      expect(toggleBtn.tabIndex).toBe(0);
      expect(toggleBtn.getAttribute('aria-controls')).toBe(input.id);

      toggleBtn.focus();
      expect(document.activeElement).toBe(toggleBtn);
    });

    it('exposes a dynamic accessible name and pressed state without naming the glyph', () => {
      setInput('type', 'password');

      const input = fixture.nativeElement.querySelector('.floating-input') as HTMLInputElement;
      const toggleBtn = fixture.nativeElement.querySelector('.input-icon-btn') as HTMLButtonElement;
      const icon = toggleBtn.querySelector('i') as HTMLElement;

      expect(input.type).toBe('password');
      expect(input.dataset['clipboardPolicy']).toBe('paste-only');
      expect(toggleBtn.getAttribute('aria-label')).toBe('Mostrar contraseña');
      expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(toggleBtn.textContent?.trim()).toBe('');

      toggleBtn.click();
      fixture.detectChanges();

      expect(input.type).toBe('text');
      expect(input.dataset['clipboardPolicy']).toBe('paste-only');
      expect(toggleBtn.getAttribute('aria-label')).toBe('Ocultar contraseña');
      expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
      expect(icon.classList.contains('fa-eye-slash')).toBe(true);
    });

    it('keeps focus on the native toggle after changing password visibility', () => {
      setInput('type', 'password');

      const toggleBtn = fixture.nativeElement.querySelector('.input-icon-btn') as HTMLButtonElement;
      toggleBtn.focus();
      toggleBtn.click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(toggleBtn);
    });

    it('disables the password toggle together with the input', () => {
      setInput('type', 'password');
      setInput('disabled', true);

      const toggleBtn = fixture.nativeElement.querySelector('.input-icon-btn') as HTMLButtonElement;
      expect(toggleBtn.disabled).toBe(true);
      toggleBtn.focus();
      expect(document.activeElement).not.toBe(toggleBtn);
    });
  });

  describe('ControlValueAccessor', () => {
    it('should write value', () => {
      component.writeValue('test value');
      expect(component.value).toBe('test value');
    });

    it('should handle null value', () => {
      component.writeValue(null as unknown as string);
      expect(component.value).toBe('');
    });

    it('should register onChange callback', () => {
      const fn = vi.fn();
      component.registerOnChange(fn);

      component.onChange('new value');

      expect(fn).toHaveBeenCalledWith('new value');
    });

    it('should register onTouched callback', () => {
      const fn = vi.fn();
      component.registerOnTouched(fn);

      component.onBlur();

      expect(fn).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
      component.setDisabledState(true);
      expect(component.disabled).toBe(true);
    });
  });

  describe('width', () => {
    it('should apply custom width', () => {
      setInput('width', '200px');

      const wrapper = fixture.nativeElement.querySelector('.floating-input-wrapper');
      expect(wrapper.style.width).toBe('200px');
    });
  });
});
