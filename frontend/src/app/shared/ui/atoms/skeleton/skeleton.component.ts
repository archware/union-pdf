import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  template: `
    @switch (variant) {
      @case ('text') {
        <div class="skeleton skeleton-text" [style.width]="width" [style.height]="height || 'var(--space-4)'"></div>
      }
      @case ('circular') {
        <div class="skeleton skeleton-circular" [style.width]="width || 'var(--space-8)'" [style.height]="height || 'var(--space-8)'"></div>
      }
      @case ('rectangular') {
        <div class="skeleton skeleton-rectangular" [style.width]="width || '100%'" [style.height]="height || '8rem'"></div>
      }
      @case ('card') {
        <div class="skeleton-card">
          <div class="skeleton skeleton-rectangular" style="height: 8.75rem"></div>
          <div class="skeleton-card-content">
            <div class="skeleton skeleton-text" style="width: 80%; height: var(--space-4)"></div>
            <div class="skeleton skeleton-text" style="width: 60%; height: var(--space-3)"></div>
            <div class="skeleton skeleton-text" style="width: 40%; height: var(--space-3)"></div>
          </div>
        </div>
      }
      @case ('avatar-text') {
        <div class="skeleton-avatar-text">
          <div class="skeleton skeleton-circular" style="width: 2.5rem; height: 2.5rem"></div>
          <div class="skeleton-text-group">
            <div class="skeleton skeleton-text" style="width: 7.5rem; height: 0.875rem"></div>
            <div class="skeleton skeleton-text" style="width: 5rem; height: var(--space-3)"></div>
          </div>
        </div>
      }
      @default {
        <div class="skeleton" [style.width]="width" [style.height]="height"></div>
      }
    }
  `,
  styles: [`
    /* Host display block needed for % widths to work */
    :host {
      display: block;
      width: 100%;
    }

    .skeleton {
      background: linear-gradient(90deg,
        var(--skeleton-gradient-start) 25%,
        var(--skeleton-gradient-mid) 50%,
        var(--skeleton-gradient-start) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite ease-in-out;
      border-radius: var(--radius-sm);
    }

    .skeleton-text {
      height: var(--space-4);
      border-radius: var(--radius-sm);
    }

    .skeleton-circular {
      border-radius: 50%;
    }

    .skeleton-rectangular {
      border-radius: var(--radius-md);
    }

    .skeleton-card {
      background: var(--skeleton-card-bg);
      border: 1px solid var(--skeleton-card-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .skeleton-card-content {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .skeleton-avatar-text {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .skeleton-text-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --skeleton-gradient-start/mid y --skeleton-card-bg/border
     * ya tienen valores apropiados para temas oscuros.
     */
  `]
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar-text' = 'text';
  @Input() width?: string;
  @Input() height?: string;
}
