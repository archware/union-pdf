import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    fixture.detectChanges();
  });

  it('allows the container and body to shrink around responsive content', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(['0', '0px']).toContain(getComputedStyle(host).minWidth);
    expect(['0', '0px']).toContain(
      getComputedStyle(host.querySelector('.card') as HTMLElement).minWidth
    );
    expect(['0', '0px']).toContain(
      getComputedStyle(host.querySelector('.card__body') as HTMLElement).minWidth
    );
  });

  it('elevates the card while a projected interactive control has focus', () => {
    const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;
    const body = card.querySelector('.card__body') as HTMLElement;
    const control = document.createElement('button');
    body.appendChild(control);

    control.focus();

    expect(document.activeElement).toBe(control);
    expect(getComputedStyle(card).position).toBe('relative');
    expect(getComputedStyle(card).zIndex).toBe('50');
  });

  it('provides a visible keyboard focus treatment for every clickable variant', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.componentRef.setInput('variant', 'default');
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;
    card.focus();

    expect(card.tabIndex).toBe(0);
    expect(getComputedStyle(card).boxShadow).not.toBe('none');
  });

  it('does not activate the card when a projected control handles the interaction', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.cardClick.subscribe(emitted);

    const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;
    const nestedButton = document.createElement('button');
    card.querySelector('.card__body')?.appendChild(nestedButton);

    nestedButton.click();
    nestedButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emitted).not.toHaveBeenCalled();
  });

  it('keeps neutral projected content inside the clickable surface', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.cardClick.subscribe(emitted);

    const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;
    const projectedText = document.createElement('span');
    card.querySelector('.card__body')?.appendChild(projectedText);

    projectedText.click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('activates the clickable card from its own keyboard target', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.cardClick.subscribe(emitted);
    const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;

    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emitted).toHaveBeenCalledTimes(1);
  });
});
