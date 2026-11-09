import {
  Component,
  Input,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';


export type ProgressVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="progress-wrapper">
      @if (label) {
        <div class="progress-header">
          <span class="progress-label">{{ label }}</span>
          @if (showLabel && !indeterminate) {
            <span class="progress-value">{{ clampedValue() }}%</span>
          }
        </div>
      }
      <div
        class="progress-track"
        [class]="'progress-track--' + size"
        role="progressbar"
        [attr.aria-valuenow]="indeterminate ? null : clampedValue()"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="100"
        [attr.aria-label]="label || 'Progreso'"
      >
        <div
          class="progress-bar"
          [class]="'progress-bar--' + variant"
          [class.progress-bar--indeterminate]="indeterminate"
          [style.width]="indeterminate ? null : clampedValue() + '%'"
        ></div>
      </div>
      @if (!label && showLabel && !indeterminate) {
        <div class="progress-footer">
          <span class="progress-value">{{ clampedValue() }}%</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .progress-wrapper { display: flex; flex-direction: column; gap: var(--space-2); }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary, #111827);
    }

    .progress-value {
      font-size: 0.8125rem;
      color: var(--text-muted, #6b7280);
      font-variant-numeric: tabular-nums;
    }

    .progress-footer { text-align: right; }

    .progress-track {
      width: 100%;
      background-color: var(--surface-200, #e5e7eb);
      border-radius: var(--radius-full, 9999px);
      overflow: hidden;
    }

    .progress-track--sm { height: var(--space-1); }
    .progress-track--md { height: var(--space-2); }
    .progress-track--lg { height: var(--space-3); }

    .progress-bar {
      height: 100%;
      border-radius: var(--radius-full, 9999px);
      transition: width 0.4s ease;
    }

    .progress-bar--default  { background-color: var(--text-muted, #6b7280); }
    .progress-bar--primary  { background-color: var(--primary-color, #6366f1); }
    .progress-bar--success  { background-color: var(--success-color, #22c55e); }
    .progress-bar--warning  { background-color: var(--warning-color, #f59e0b); }
    .progress-bar--danger   { background-color: var(--danger-color, #ef4444); }

    .progress-bar--indeterminate {
      width: 40% !important;
      animation: indeterminate 1.5s ease-in-out infinite;
    }

    @keyframes indeterminate {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }
  `],
})
export class ProgressComponent {
  @Input() value = 0;
  @Input() variant: ProgressVariant = 'primary';
  @Input() size: ProgressSize = 'md';
  @Input() showLabel = false;
  @Input() indeterminate = false;
  @Input() label = '';

  readonly clampedValue = computed(() => Math.min(100, Math.max(0, this.value)));
}
