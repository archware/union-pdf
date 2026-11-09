import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AccordionComponent, AccordionItemComponent } from './accordion.component';

@Component({
  standalone: true,
  imports: [AccordionComponent, AccordionItemComponent],
  template: `
    <app-accordion [single]="true">
      <app-accordion-item title="Cliente" description="Cliente seleccionado" [open]="true">
        <button type="button">Acción cliente</button>
      </app-accordion-item>
      <app-accordion-item title="Cotización" [headingLevel]="2">
        Contenido cotización
      </app-accordion-item>
    </app-accordion>
  `,
})
class AccordionTestHostComponent {}

describe('AccordionComponent', () => {
  let fixture: ComponentFixture<AccordionTestHostComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccordionTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccordionTestHostComponent);
    fixture.detectChanges();
  });

  it('connects each header and region with complete ARIA metadata', () => {
    const headers = host().querySelectorAll<HTMLButtonElement>('.accordion-header');
    const regions = host().querySelectorAll<HTMLElement>('[role="region"]');

    expect(headers[0].getAttribute('aria-expanded')).toBe('true');
    expect(headers[0].getAttribute('aria-controls')).toBe(regions[0].id);
    expect(regions[0].getAttribute('aria-labelledby')).toBe(headers[0].id);
    expect(regions[1].getAttribute('aria-hidden')).toBe('true');
    expect(regions[1].hasAttribute('inert')).toBe(true);
  });

  it('keeps only one item open in single mode', () => {
    const headers = host().querySelectorAll<HTMLButtonElement>('.accordion-header');

    headers[1].click();
    fixture.detectChanges();

    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
    expect(headers[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('moves focus between headers with the keyboard', () => {
    const headers = host().querySelectorAll<HTMLButtonElement>('.accordion-header');
    headers[0].focus();

    headers[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(headers[1]);
  });

  it('moves focus to the header before hiding focused content', () => {
    const action = host().querySelector<HTMLButtonElement>('.accordion-content button');
    const header = host().querySelector<HTMLButtonElement>('.accordion-header');
    const item = fixture.debugElement.query(By.directive(AccordionItemComponent))
      .componentInstance as AccordionItemComponent;

    action?.focus();
    expect(document.activeElement).toBe(action);

    item.setOpen(false, true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(header);
    expect(
      host().querySelector<HTMLElement>('.accordion-content')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  /*
  Los paneles tienen que salir en el indice de encabezados. Sin esto, quien
  recorre la pantalla saltando por titulos no se entera de que existen los
  paneles ni de como se llaman: pasa del titulo de la pagina a lo que haya dentro
  del primero que este abierto.
  */
  it('anuncia el titulo de cada panel como encabezado', () => {
    const encabezados = host().querySelectorAll<HTMLElement>('[role="heading"]');

    expect(encabezados.length).toBe(2);
    expect(encabezados[0].getAttribute('aria-level')).toBe('3');
    expect(encabezados[0].querySelector('button')).not.toBeNull();
    expect(encabezados[0].textContent).toContain('Cliente');
    expect(encabezados[1].textContent).toContain('Cotización');
  });

  it('deja elegir el nivel a quien monta la pantalla', () => {
    const encabezados = host().querySelectorAll<HTMLElement>('[role="heading"]');

    // Solo la pantalla sabe que hay por encima: el primero se queda con el 3 por
    // omision y el segundo pide un 2 desde la plantilla que lo monta.
    expect(encabezados[0].getAttribute('aria-level')).toBe('3');
    expect(encabezados[1].getAttribute('aria-level')).toBe('2');
  });
});
