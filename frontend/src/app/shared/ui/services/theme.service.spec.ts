import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService DOM contract', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();
  });

  it('applies and persists the light theme on the document root', () => {
    const service = TestBed.inject(ThemeService);

    service.setLightTheme();
    TestBed.tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('app-theme')).toBe('light');
  });

  it('keeps the dark class and data-theme synchronized for the corporate dark theme', () => {
    const service = TestBed.inject(ThemeService);

    service.setBrandDarkTheme();
    TestBed.tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('brand-dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(service.isDarkMode()).toBe(true);
  });

  it('toggles from light to the neutral dark theme without selecting brand-dark', () => {
    const service = TestBed.inject(ThemeService);

    service.setLightTheme();
    TestBed.tick();
    service.toggleTheme();
    TestBed.tick();

    expect(service.getSelectedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores a persisted theme before the application content is rendered', () => {
    localStorage.setItem('app-theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });

    const service = TestBed.inject(ThemeService);

    expect(service.getSelectedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
