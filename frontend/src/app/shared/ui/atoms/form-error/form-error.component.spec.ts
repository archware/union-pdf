import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { FormErrorComponent } from './form-error.component';

describe('FormErrorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormErrorComponent],
    }).compileComponents();
  });

  it('renders an API message without requiring a form control', () => {
    const fixture = TestBed.createComponent(FormErrorComponent);
    fixture.componentRef.setInput('customMessage', 'No se pudo iniciar sesión');
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudo iniciar sesión');
  });

  it('keeps validation feedback hidden until the control is touched', () => {
    const fixture = TestBed.createComponent(FormErrorComponent);
    const control = new FormControl('', Validators.required);
    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();

    const touchedControl = new FormControl('', Validators.required);
    touchedControl.markAsTouched();
    fixture.componentRef.setInput('control', touchedControl);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
  });
});
