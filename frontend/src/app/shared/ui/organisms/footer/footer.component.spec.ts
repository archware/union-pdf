import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppVersionService } from '../../services/app-version.service';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();
  });

  it('renders the institutional line and hides the build date by default', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.componentRef.setInput('variant', 'simple');
    fixture.componentRef.setInput('companyName', 'Hospital Regional Ayacucho');
    fixture.componentRef.setInput('year', 2026);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(
      '© 2026 Hospital Regional Ayacucho - Todos los derechos reservados.'
    );
    expect(element.textContent).toContain('Soporte: Sistemas de Información');
    expect(element.querySelector('footer')?.getAttribute('aria-label')).toBe('Pie de página');
    expect(element.querySelector('app-version')).not.toBeNull();
    expect(element.querySelector('.atomic-version__date')).toBeNull();
  });

  it('retains legal and social links in the inline variant', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.componentRef.setInput('variant', 'inline');
    fixture.componentRef.setInput('legalLinks', [
      { label: 'Privacidad', url: '/privacidad' }
    ]);
    fixture.componentRef.setInput('socialLinks', [
      { platform: 'github', url: 'https://github.com/example' }
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.atomic-footer__legal-link')?.textContent).toContain('Privacidad');
    expect(element.querySelector('.atomic-footer__social-link')?.getAttribute('rel')).toBe(
      'noopener noreferrer'
    );
  });

  it('does not render the version when it is disabled', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.componentRef.setInput('showVersion', false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-version')).toBeNull();
  });

  it('prioritizes the runtime environment provided by AppVersionService', () => {
    const versionService = TestBed.inject(AppVersionService);
    versionService.versionInfo.update(versionInfo => ({
      ...versionInfo,
      environment: 'PRODUCTION'
    }));

    const fixture = TestBed.createComponent(FooterComponent);
    fixture.componentRef.setInput('environment', 'BETA');
    fixture.detectChanges();

    const environment = (fixture.nativeElement as HTMLElement).querySelector(
      '.atomic-version__env'
    );
    expect(environment?.textContent?.trim()).toBe('PRODUCTION');
  });

  it('uses a human-readable social label and allows an explicit override', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.componentRef.setInput('socialLinks', [
      { platform: 'twitter', url: 'https://x.com/example' },
      { platform: 'github', url: 'https://github.com/example', label: 'Código institucional' }
    ]);
    fixture.detectChanges();

    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.atomic-footer__social-link'
    );
    expect(links[0].getAttribute('aria-label')).toBe('X');
    expect(links[1].getAttribute('aria-label')).toBe('Código institucional');
  });
});
