import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Input],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders programmatic CVA values and disabled state without ZoneJS', async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentInstance.writeValue('12345678');
    fixture.componentInstance.setDisabledState(true);
    await fixture.whenStable();

    const element = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(element.value).toBe('12345678');
    expect(element.disabled).toBe(true);
  });

  it('associates label, constraints and errors with the native input', async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentRef.setInput('controlId', 'start-date');
    fixture.componentRef.setInput('label', 'Fecha de inicio');
    fixture.componentRef.setInput('type', 'date');
    fixture.componentRef.setInput('min', '2026-07-22');
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('error', 'Ingrese una fecha válida.');
    await fixture.whenStable();

    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    const requiredMarker = fixture.nativeElement.querySelector('.field__required') as HTMLElement;
    const element = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(label.htmlFor).toBe('start-date');
    expect(requiredMarker.textContent?.trim()).toBe('*');
    expect(element.min).toBe('2026-07-22');
    expect(element.required).toBe(true);
    expect(element.getAttribute('aria-describedby')).toBe('start-date-error');
  });

  it('preserves the paste-only policy after revealing a password', async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentRef.setInput('type', 'password');
    fixture.componentRef.setInput('revealable', true);
    await fixture.whenStable();

    const element = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const reveal = fixture.nativeElement.querySelector('.field__reveal') as HTMLButtonElement;
    expect(element.type).toBe('password');
    expect(element.dataset['clipboardPolicy']).toBe('paste-only');

    reveal.click();
    await fixture.whenStable();

    expect(element.type).toBe('text');
    expect(element.dataset['clipboardPolicy']).toBe('paste-only');
  });
});
