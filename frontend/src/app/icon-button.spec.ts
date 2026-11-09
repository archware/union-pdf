import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IconButtonComponent } from './shared/ui/atoms/icon-button/icon-button.component';

describe('IconButtonComponent', () => {
  let component: IconButtonComponent;
  let fixture: ComponentFixture<IconButtonComponent>;

  function setInput(name: string, value: unknown): void {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(IconButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('tiene animación "none" por defecto y aplica clase .icon-anim-none', () => {
    expect(component.animation()).toBe('none');
    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-anim-none')).toBe(true);
    expect(button.classList.contains('icon-anim-rotate')).toBe(false);
  });

  it('aplica clase .icon-anim-rotate solo cuando se solicita explícitamente', () => {
    setInput('animation', 'rotate');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-anim-rotate')).toBe(true);
    expect(button.classList.contains('icon-anim-none')).toBe(false);
  });

  it('la variante "close" incluye el aspa estándar con clase .close.blades.heavy', () => {
    setInput('variant', 'close');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-btn--close')).toBe(true);

    const closeSpan = button.querySelector('span.close.blades.heavy');
    expect(closeSpan).not.toBeNull();
  });

  it('la variante "close-ghost" aplica clase .icon-btn--close-ghost, incluye el aspa .close.blades.heavy y asigna "Cerrar" por defecto', () => {
    setInput('variant', 'close-ghost');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-btn--close-ghost')).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Cerrar');
    expect(button.getAttribute('title')).toBe('Cerrar');

    const closeSpan = button.querySelector('span.close.blades.heavy');
    expect(closeSpan).not.toBeNull();
  });

  it('la variante "close-soft" aplica clase .icon-btn--close-soft, incluye el aspa .close.blades.heavy y asigna "Cerrar" por defecto', () => {
    setInput('variant', 'close-soft');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-btn--close-soft')).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Cerrar');
    expect(button.getAttribute('title')).toBe('Cerrar');

    const closeSpan = button.querySelector('span.close.blades.heavy');
    expect(closeSpan).not.toBeNull();
  });

  it('la variante "hanging-close" incluye el aspa estándar con clase .close.blades.heavy y host binding', () => {
    setInput('variant', 'hanging-close');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-btn--hanging-close')).toBe(true);
    expect(fixture.nativeElement.classList.contains('is-hanging-close')).toBe(true);

    const closeSpan = button.querySelector('span.close.blades.heavy');
    expect(closeSpan).not.toBeNull();
  });

  it('emite el evento clicked al ser pulsado', () => {
    let emitido = false;
    component.clicked.subscribe(() => {
      emitido = true;
    });

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(emitido).toBe(true);
  });

  it('no emite el evento clicked cuando está deshabilitado', () => {
    let emitido = false;
    setInput('disabled', true);
    component.clicked.subscribe(() => {
      emitido = true;
    });

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(emitido).toBe(false);
  });

  it('muestra el badge cuando el conteo es mayor a cero', () => {
    setInput('badge', 5);

    const badge = fixture.nativeElement.querySelector('.icon-btn__badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent.trim()).toBe('5');
  });

  it('asigna "Cerrar" como aria-label por defecto en variantes de cierre cuando no se especifica etiqueta', () => {
    setInput('variant', 'close');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Cerrar');
    expect(button.getAttribute('title')).toBe('Cerrar');
  });

  it('respeta aria-label y tooltip explícitos cuando se proporcionan', () => {
    setInput('variant', 'close');
    setInput('ariaLabel', 'Eliminar documento');
    setInput('tooltip', 'Quitar este archivo');

    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Eliminar documento');
    expect(button.getAttribute('title')).toBe('Quitar este archivo');
  });

  it('aplica clases de tamaño "sm" y "lg" según el input size', () => {
    setInput('size', 'sm');
    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('icon-btn--sm')).toBe(true);

    setInput('size', 'lg');
    expect(button.classList.contains('icon-btn--lg')).toBe(true);
  });

  it('normaliza clases Font Awesome shorthand para renderizar correctamente', () => {
    setInput('icon', 'trash');
    const iconEl = fixture.nativeElement.querySelector('i');
    expect(iconEl).not.toBeNull();
    expect(iconEl.className).toBe('fa-solid fa-trash');

    setInput('icon', 'fa-times');
    const iconEl2 = fixture.nativeElement.querySelector('i');
    expect(iconEl2.className).toBe('fa-solid fa-times');
  });
});

