import { Component, Input, Output, EventEmitter, signal } from '@angular/core';


@Component({
  selector: 'app-rating',
  standalone: true,
  imports: [],
  template: `
    <div class="rating" [class]="'rating-' + size" [class.readonly]="readonly">
      @for (star of stars; track $index; let i = $index) {
        <button type="button"
          class="star"
          [class.filled]="i < (hoverValue() ?? value)"
          [class.half]="allowHalf && (i + 0.5) === (hoverValue() ?? value)"
          (mouseenter)="!readonly && onHover(i + 1)"
          (mouseleave)="!readonly && onLeave()"
          (click)="!readonly && onSelect(i + 1)"
          (keydown.enter)="!readonly && onSelect(i + 1)"
          (keydown.space)="!readonly && onSelect(i + 1)"
          [disabled]="readonly"
        >
          <i class="fa-solid fa-star"></i>
        </button>
      }
      @if (showValue) {
        <span class="rating-value">{{ value.toFixed(1) }}</span>
      }
    </div>
  `,
  styles: [`
    .rating {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }

    .rating-sm .star { width: var(--space-4); height: var(--space-4); }
    .rating-md .star { width: var(--space-5); height: var(--space-5); }
    .rating-lg .star { width: var(--space-6); height: var(--space-6); }

    .star {
      padding: 0;
      background: none;
      border: none;
      color: var(--rating-star-empty);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .star:hover:not(:disabled) {
      transform: scale(1.1);
      color: var(--rating-star-hover);
    }

    .star.filled {
      color: var(--rating-star-filled);
    }

    .star.half {
      position: relative;
      color: var(--rating-star-empty);
    }

    .star.half::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 50%;
      height: 100%;
      overflow: hidden;
      color: var(--rating-star-filled);
    }

    .star svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .readonly .star {
      cursor: default;
    }

    .rating-value {
      margin-left: var(--space-2);
      font-size: var(--text-sm);
      font-weight: var(--font-weight-body);
      color: var(--text-color-secondary);
    }

    /* 
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --rating-star-empty/filled/hover ya tienen valores apropiados
     * para temas oscuros.
     */
  `]
})
export class RatingComponent {
  @Input() value = 0;
  @Input() max = 5;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() readonly = false;
  @Input() allowHalf = false;
  @Input() showValue = false;
  @Output() valueChange = new EventEmitter<number>();

  hoverValue = signal<number | null>(null);

  get stars() {
    return Array(this.max).fill(0);
  }

  onHover(value: number) {
    this.hoverValue.set(value);
  }

  onLeave() {
    this.hoverValue.set(null);
  }

  onSelect(value: number) {
    this.value = value;
    this.valueChange.emit(value);
  }
}
