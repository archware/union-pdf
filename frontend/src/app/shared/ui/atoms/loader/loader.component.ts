import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type LoaderVariant = 'spinner' | 'dots' | 'pulse' | 'bars' | 'gradient' | 'orbit';
export type LoaderSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loader-container" [class]="'loader-' + variant" [class.loader-sm]="size === 'sm'" [class.loader-lg]="size === 'lg'">
      
      <!-- Spinner con degradado -->
      @if (variant === 'spinner') {
        <div class="gradient-spinner">
          <svg viewBox="0 0 50 50">
            <defs>
              <linearGradient [attr.id]="spinnerId" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" class="gradient-1" />
                <stop offset="25%" class="gradient-2" />
                <stop offset="50%" class="gradient-3" />
                <stop offset="75%" class="gradient-4" />
                <stop offset="100%" class="gradient-5" />
              </linearGradient>
            </defs>
            <circle class="spinner-track" cx="25" cy="25" r="20" />
            <circle 
              cx="25" cy="25" r="20" 
              fill="none" 
              [attr.stroke]="'url(#' + spinnerId + ')'" 
              stroke-width="4"
              stroke-linecap="round"
              stroke-dasharray="75 50"
            />
          </svg>
        </div>
      }
      
      <!-- 5 Dots con degradado -->
      @if (variant === 'dots') {
        <div class="dots">
          <span class="dot dot-1"></span>
          <span class="dot dot-2"></span>
          <span class="dot dot-3"></span>
          <span class="dot dot-4"></span>
          <span class="dot dot-5"></span>
        </div>
      }
      
      <!-- Pulse con degradado multicolor -->
      @if (variant === 'pulse') {
        <div class="pulse">
          <div class="pulse-ring pulse-ring-1"></div>
          <div class="pulse-ring pulse-ring-2"></div>
          <div class="pulse-ring pulse-ring-3"></div>
          <div class="pulse-core"></div>
        </div>
      }
      
      <!-- 5 Barras con degradado -->
      @if (variant === 'bars') {
        <div class="bars">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
          <span class="bar bar-4"></span>
          <span class="bar bar-5"></span>
        </div>
      }
      
      <!-- Gradiente circular animado con cónica -->
      @if (variant === 'gradient') {
        <div class="gradient-ring">
          <svg viewBox="0 0 50 50">
            <defs>
              <linearGradient [attr.id]="ringId" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" class="gradient-1" />
                <stop offset="25%" class="gradient-2" />
                <stop offset="50%" class="gradient-3" />
                <stop offset="75%" class="gradient-4" />
                <stop offset="100%" class="gradient-5" />
              </linearGradient>
            </defs>
            <circle 
              cx="25" cy="25" r="20" 
              fill="none" 
              [attr.stroke]="'url(#' + ringId + ')'" 
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="62.83 62.83"
            />
          </svg>
        </div>
      }
      <!-- 6. ORBIT (NUEVO DISEÑO) -->
      @if (variant === 'orbit') {
        <div class="orbit">
          <div class="orbit-ring"></div>
          <div class="orbit-planet"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .loader-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      /* Map local variables to global tokens */
      --gradient-1: var(--loader-gradient-1);
      --gradient-2: var(--loader-gradient-2);
      --gradient-3: var(--loader-gradient-3);
      --gradient-4: var(--loader-gradient-4);
      --gradient-5: var(--loader-gradient-5);
    }

    /* Colores del gradiente SVG */
    .gradient-1 { stop-color: var(--gradient-1); }
    .gradient-2 { stop-color: var(--gradient-2); }
    .gradient-3 { stop-color: var(--gradient-3); }
    .gradient-4 { stop-color: var(--gradient-4); }
    .gradient-5 { stop-color: var(--gradient-5); }

    /* ========== TAMAÑOS ========== */
    .loader-sm { --loader-size: var(--space-5); --loader-thickness: var(--space-1); }
    .loader-container { --loader-size: 2.5rem; --loader-thickness: var(--space-1); }
    .loader-lg { --loader-size: 3.5rem; --loader-thickness: var(--space-1); }

    /* ========== 1. SPINNER CON DEGRADADO ========== */
    .gradient-spinner {
      width: var(--loader-size);
      height: var(--loader-size);
      animation: spin 1s linear infinite;
    }

    .gradient-spinner svg {
      width: 100%;
      height: 100%;
    }

    .spinner-track {
      fill: none;
      stroke: var(--border-color, #e5e7eb);
      stroke-width: 4;
      opacity: 0.2; /* Más sutil */
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ========== 2. DOTS CON DEGRADADO ========== */
    .dots {
      display: flex;
      gap: calc(var(--loader-size) * 0.15);
    }

    .dot {
      width: calc(var(--loader-size) * 0.25);
      height: calc(var(--loader-size) * 0.25);
      border-radius: 50%;
      animation: dotPulse 1.5s ease-in-out infinite;
      backdrop-filter: blur(var(--space-1)); /* Efecto cristal */
    }

    .dot-1 { background: var(--gradient-1); animation-delay: 0s; }
    .dot-2 { background: var(--gradient-2); animation-delay: 0.15s; }
    .dot-3 { background: var(--gradient-3); animation-delay: 0.3s; }
    .dot-4 { background: var(--gradient-4); animation-delay: 0.45s; }
    .dot-5 { background: var(--gradient-5); animation-delay: 0.6s; }

    @keyframes dotPulse {
      0%, 70%, 100% {
        transform: scale(0.5);
        opacity: 0.3;
      }
      35% {
        transform: scale(1);
        opacity: 0.9;
      }
    }

    /* ========== 3. PULSE CON DEGRADADO ========== */
    .pulse {
      position: relative;
      width: var(--loader-size);
      height: var(--loader-size);
    }

    .pulse-ring {
      position: absolute;
      inset: 0;
      border: var(--loader-thickness) solid transparent;
      border-radius: 50%;
      animation: pulseRing 2s ease-out infinite;
    }

    .pulse-ring-1 { border-color: var(--gradient-1); animation-delay: 0s; }
    .pulse-ring-2 { border-color: var(--gradient-3); animation-delay: 0.4s; }
    .pulse-ring-3 { border-color: var(--gradient-5); animation-delay: 0.8s; }

    .pulse-core {
      position: absolute;
      inset: 25%;
      background: radial-gradient(circle, var(--gradient-3), var(--gradient-1));
      border-radius: 50%;
      opacity: 0.8;
      animation: pulseCore 2s ease-in-out infinite;
    }

    @keyframes pulseRing {
      0% {
        transform: scale(0.4);
        opacity: 0.8;
      }
      100% {
        transform: scale(1.4);
        opacity: 0;
      }
    }

    @keyframes pulseCore {
      0%, 100% { transform: scale(0.7); opacity: 0.6; }
      50% { transform: scale(1); opacity: 0.9; }
    }

    /* ========== 4. BARRAS CON DEGRADADO ========== */
    .bars {
      display: flex;
      align-items: center;
      gap: calc(var(--loader-size) * 0.08);
      height: var(--loader-size);
    }

    .bar {
      width: calc(var(--loader-size) * 0.14);
      height: 55%;
      border-radius: var(--radius-sm);
      animation: barBounce 1.2s ease-in-out infinite;
      opacity: 0.8;
    }

    .bar-1 { background: var(--gradient-1); animation-delay: 0s; }
    .bar-2 { background: var(--gradient-2); animation-delay: 0.1s; }
    .bar-3 { background: var(--gradient-3); animation-delay: 0.2s; }
    .bar-4 { background: var(--gradient-4); animation-delay: 0.3s; }
    .bar-5 { background: var(--gradient-5); animation-delay: 0.4s; }

    @keyframes barBounce {
      0%, 50%, 100% {
        transform: scaleY(0.4);
        opacity: 0.5;
      }
      25% {
        transform: scaleY(1);
        opacity: 0.9;
      }
    }

    /* ========== 5. GRADIENT RING ========== */
    .gradient-ring {
      width: var(--loader-size);
      height: var(--loader-size);
      animation: spin 1.2s linear infinite;
    }

    .gradient-ring svg {
      width: 100%;
      height: 100%;
    }

    /* ========== 6. ORBIT (NUEVO) ========== */
    .orbit {
      position: relative;
      width: var(--loader-size);
      height: var(--loader-size);
      animation: spin 2s linear infinite;
    }

    .orbit-ring {
      position: absolute;
      inset: 0;
      border: var(--space-1) solid var(--gradient-3);
      border-radius: 50%;
      opacity: 0.3;
    }

    .orbit-planet {
      position: absolute;
      top: 0;
      left: 50%;
      width: calc(var(--loader-size) * 0.3);
      height: calc(var(--loader-size) * 0.3);
      background: var(--gradient-5);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px var(--gradient-5);
    }

    /* ========== DARK MODE ========== */
    :host-context(html.dark),
    :host-context([data-theme="dark"]) {
      .spinner-track {
        stroke: var(--border-color, #374151);
      }
    }
  `]
})
export class LoaderComponent {
  /** ID único para evitar conflictos de SVG gradient */
  private readonly uniqueId = Math.random().toString(36).substring(2, 9);
  readonly spinnerId = `spinner-${this.uniqueId}`;
  readonly ringId = `ring-${this.uniqueId}`;

  /** Variante del loader: spinner, dots, pulse, bars, gradient */
  @Input() variant: LoaderVariant = 'spinner';

  /** Tamaño del loader: sm, md (default), lg */
  @Input() size: LoaderSize = 'md';
}
