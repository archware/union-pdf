import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type KpiTrend = 'up' | 'down' | 'neutral';
export type KpiFormat = 'number' | 'currency' | 'percent' | 'compact' | 'duration';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="kpi-card" [attr.aria-label]="title">
      <header class="kpi-card__header">
        <div class="kpi-card__heading">
          <p class="kpi-card__title">{{ title }}</p>
          @if (subtitle) {
            <p class="kpi-card__subtitle">{{ subtitle }}</p>
          }
        </div>
        @if (iconClass) {
          <span class="kpi-card__icon" aria-hidden="true">
            <i [class]="iconClass"></i>
          </span>
        }
      </header>

      <div class="kpi-card__content">
        <p class="kpi-card__value">{{ formattedValue }}</p>

        <div class="kpi-card__meta">
          <span class="kpi-card__trend" [class]="'kpi-card__trend--' + trend">
            @switch (trend) {
              @case ('up') { <i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i> }
              @case ('down') { <i class="fa-solid fa-arrow-trend-down" aria-hidden="true"></i> }
              @default { <i class="fa-solid fa-minus" aria-hidden="true"></i> }
            }
            {{ trendLabel }}
          </span>
          @if (comparisonLabel) {
            <span class="kpi-card__comparison">{{ comparisonLabel }}</span>
          }
        </div>
      </div>

      @if (series.length > 1) {
        <footer class="kpi-card__chart" aria-hidden="true">
          <svg viewBox="0 0 120 32" preserveAspectRatio="none">
            <polyline [attr.points]="chartPoints" fill="none" stroke="currentColor" stroke-width="2"></polyline>
          </svg>
        </footer>
      }
    </article>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .kpi-card {
      width: 100%;
      border: none;
      border-radius: var(--radius-lg);
      background: var(--surface-background);
      box-shadow: var(--shadow-md);
      padding: var(--space-4);
      box-sizing: border-box;
      display: grid;
      gap: var(--space-3);
      min-height: 6.5rem;
    }

    .kpi-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .kpi-card__heading {
      min-width: 0;
      flex: 1;
    }

    .kpi-card__title {
      margin: 0;
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-color-secondary);
    }

    .kpi-card__subtitle {
      margin: var(--space-1) 0 0;
      font-size: var(--text-xs);
      color: var(--text-color-muted);
      line-height: 1.4;
    }

    .kpi-card__icon {
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-section);
      color: var(--text-color-secondary);
      flex-shrink: 0;
    }

    .kpi-card__value {
      margin: 0;
      font-size: clamp(var(--space-5), 2vw, 1.8rem);
      line-height: 1.2;
      font-weight: 700;
      color: var(--text-color);
      word-break: break-word;
    }

    .kpi-card__meta {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .kpi-card__trend {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 600;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
      border: 1px solid transparent;
    }

    .kpi-card__comparison {
      font-size: var(--text-xs);
      color: var(--text-color-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
    }

    .kpi-card__trend--up {
      color: var(--success-color);
      background: var(--success-color-lighter);
      border-color: var(--success-color-lighter);
    }

    .kpi-card__trend--down {
      color: var(--danger-color);
      background: var(--danger-color-lighter);
      border-color: var(--danger-color-lighter);
    }

    .kpi-card__trend--neutral {
      color: var(--text-color-secondary);
      background: var(--surface-section);
      border-color: var(--border-color);
    }

    .kpi-card__chart {
      color: var(--primary-color);
      opacity: 0.85;
      height: 2rem;
      display: flex;
      align-items: flex-end;
    }

    .kpi-card__chart svg {
      width: 100%;
      height: 100%;
    }

    @media (max-width: 640px) {
      .kpi-card {
        min-height: 5.5rem;
        padding: var(--space-3);
      }
    }
  `]
})
export class KpiCardComponent {
  @Input() title = 'Metrica';
  @Input() subtitle = '';
  @Input() value: string | number = 0;
  @Input() format: KpiFormat = 'number';
  @Input() currency = 'USD';
  @Input() trend: KpiTrend = 'neutral';
  @Input() trendValue = '';
  @Input() iconClass = 'fa-solid fa-chart-line';
  @Input() series: number[] = [];
  @Input() comparisonLabel = '';

  get formattedValue(): string {
    const num = Number(this.value);
    if (!Number.isFinite(num)) {
      return String(this.value);
    }

    if (this.format === 'currency') {
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: this.currency,
        maximumFractionDigits: 0,
      }).format(num);
    }

    if (this.format === 'percent') {
      return `${num.toFixed(1)}%`;
    }

    if (this.format === 'compact') {
      return new Intl.NumberFormat('es-PE', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(num);
    }

    if (this.format === 'duration') {
      const totalMinutes = Math.max(0, Math.round(num));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0) {
        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
      }
      return `${minutes}m`;
    }

    return new Intl.NumberFormat('es-PE').format(num);
  }

  get trendLabel(): string {
    if (this.trendValue) {
      return this.trendValue;
    }

    return this.trend === 'up' ? 'Sube' : this.trend === 'down' ? 'Baja' : 'Estable';
  }

  get chartPoints(): string {
    if (this.series.length < 2) {
      return '0,16 120,16';
    }

    const min = Math.min(...this.series);
    const max = Math.max(...this.series);
    const range = max - min || 1;

    return this.series
      .map((point, index) => {
        const x = (index / (this.series.length - 1)) * 120;
        const y = 30 - ((point - min) / range) * 24;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }
}
