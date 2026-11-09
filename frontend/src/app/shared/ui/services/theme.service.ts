import { DestroyRef, inject, Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'brand-dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly THEME_STORAGE_KEY = 'app-theme';
  private readonly DARK_CLASS = 'dark';

  // Signal para el tema seleccionado
  private readonly selectedTheme = signal<Theme>(this.getInitialTheme());

  // Signal para el tema efectivo (light, dark, o brand-dark)
  private readonly effectiveTheme = signal<'light' | 'dark' | 'brand-dark'>(this.getEffectiveTheme());

  // Signal para saber si está en dark mode actualmente (cualquier variante oscura)
  readonly isDarkMode = signal<boolean>(
    this.effectiveTheme() === 'dark' || this.effectiveTheme() === 'brand-dark'
  );

  // Origen del círculo de transición visual (posición del último click)
  private readonly transitionOrigin = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tema efectivo previo: null = carga inicial (sin animación)
  private previousEffectiveTheme: string | null = null;

  constructor() {
    // Aplicar tema inicial inmediatamente
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.applyTheme(this.selectedTheme());
    }

    // Efecto: aplicar tema cuando cambia
    effect(() => {
      const theme = this.selectedTheme();
      this.applyTheme(theme);
      this.effectiveTheme.set(this.getEffectiveTheme());
      const effective = this.effectiveTheme();
      this.isDarkMode.set(effective === 'dark' || effective === 'brand-dark');
    });

    // Escuchar cambios en preferencia del SO
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (this.selectedTheme() === 'system') {
          this.effectiveTheme.set(this.getEffectiveTheme());
          const effective = this.effectiveTheme();
          this.isDarkMode.set(effective === 'dark' || effective === 'brand-dark');
          this.applyTheme('system');
        }
      };

      mediaQuery.addEventListener('change', handleChange);

      // Cleanup cuando el servicio se destruye
      this.destroyRef.onDestroy(() => {
        mediaQuery.removeEventListener('change', handleChange);
      });
    }
  }

  /**
   * Obtiene el tema inicial del localStorage o del SO
   */
  private getInitialTheme(): Theme {
    if (typeof window === 'undefined') return 'light';

    let stored = localStorage.getItem(this.THEME_STORAGE_KEY) as Theme | null;
    
    // Migración automática: forzar el azul corporativo ('brand-dark') a dark neutral ('dark')
    if (stored === 'brand-dark') {
      stored = 'dark';
      localStorage.setItem(this.THEME_STORAGE_KEY, 'dark');
    }

    if (stored && ['light', 'dark', 'brand-dark', 'system'].includes(stored)) {
      return stored;
    }

    return 'system';
  }

  /**
   * Obtiene el tema efectivo considerando preferencia del SO
   */
  private getEffectiveTheme(): 'light' | 'dark' | 'brand-dark' {
    if (typeof window === 'undefined') return 'light';

    const selected = this.selectedTheme();

    if (selected === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return selected;
  }

  /**
   * Establece el origen visual de la transición (posición del click del usuario).
   */
  setTransitionOrigin(x: number, y: number): void {
    this.transitionOrigin.set({ x, y });
  }

  /**
   * Aplica el tema en el DOM y localStorage.
   * Usa View Transitions API para un circle-reveal fluido desde el punto de click.
   * Fallback CSS para navegadores sin soporte.
   */
  private applyTheme(theme: Theme): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const htmlElement = document.documentElement;
    const effectiveTheme: 'light' | 'dark' | 'brand-dark' =
      theme === 'system' ? this.getEffectiveTheme() : theme;

    const doApply = (): void => {
      if (effectiveTheme === 'dark') {
        htmlElement.classList.add(this.DARK_CLASS);
        htmlElement.setAttribute('data-theme', 'dark');
      } else if (effectiveTheme === 'brand-dark') {
        htmlElement.classList.add(this.DARK_CLASS);
        htmlElement.setAttribute('data-theme', 'brand-dark');
      } else {
        htmlElement.classList.remove(this.DARK_CLASS);
        htmlElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem(this.THEME_STORAGE_KEY, theme);
    };

    // Carga inicial o tema sin cambio → aplicar directo, sin animación
    const shouldAnimate =
      this.previousEffectiveTheme !== null &&
      this.previousEffectiveTheme !== effectiveTheme;
    this.previousEffectiveTheme = effectiveTheme;

    if (!shouldAnimate) {
      doApply();
      return;
    }

    // ── View Transitions API (Chrome/Edge/Safari) ────────────────────────────
    // Circle-reveal nativo desde el punto de click: sin jank, sin layout thrashing
    if ('startViewTransition' in document) {
      const { x, y } = this.transitionOrigin();
      htmlElement.style.setProperty('--vt-x', `${x}px`);
      htmlElement.style.setProperty('--vt-y', `${y}px`);
      (document as Document & {
        startViewTransition: (cb: () => void) => void;
      }).startViewTransition(doApply);
      return;
    }

    // ── Fallback CSS (Firefox y navegadores sin VT API) ───────────────────────
    htmlElement.classList.add('theme-transitioning');
    doApply();
    requestAnimationFrame(() => {
      setTimeout(() => htmlElement.classList.remove('theme-transitioning'), 200);
    });
  }

  /**
   * Cambiar a tema claro
   */
  setLightTheme(): void {
    this.selectedTheme.set('light');
  }

  /**
   * Cambiar a tema oscuro
   */
  setDarkTheme(): void {
    this.selectedTheme.set('dark');
  }

  /**
   * Cambiar a tema oscuro (Corporativo)
   */
  setBrandDarkTheme(): void {
    this.selectedTheme.set('brand-dark');
  }

  /**
   * Usar preferencia del SO
   */
  setSystemTheme(): void {
    this.selectedTheme.set('system');
  }

  /**
   * Alterna entre claro y oscuro neutral.
   * `brand-dark` queda disponible únicamente como una selección explícita.
   */
  toggleTheme(): void {
    if (this.isDarkMode()) {
      this.setLightTheme();
    } else {
      this.setDarkTheme();
    }
  }

  /**
   * Obtener el tema seleccionado
   */
  getSelectedTheme(): Theme {
    return this.selectedTheme();
  }

  /**
   * Obtener el tema efectivo
   */
  getEffectiveDarkMode(): 'light' | 'dark' | 'brand-dark' {
    return this.effectiveTheme();
  }
}
