import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardComponent, KpiFormat, KpiTrend } from '../../molecules/kpi-card/kpi-card.component';

export interface KpiMetric {
  id?: string;
  title: string;
  subtitle?: string;
  value: string | number;
  format?: KpiFormat;
  currency?: string;
  trend?: KpiTrend;
  trendValue?: string;
  comparisonLabel?: string;
  iconClass?: string;
  series?: number[];
}

@Component({
  selector: 'app-metrics-grid',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="metrics-grid"
      [class.metrics-grid--empty]="metrics.length === 0"
      [style.--min-col-width]="minCardWidth"
      [style.--metric-columns-desktop]="columnCount(4)"
      [style.--metric-columns-tablet]="columnCount(2)"
      [style.--metric-columns-mobile]="columnCount(1)"
      [attr.aria-label]="ariaLabel"
    >
      @for (metric of metrics; track metric.id ?? metric) {
        <app-kpi-card
          [title]="metric.title"
          [subtitle]="metric.subtitle || ''"
          [value]="metric.value"
          [format]="metric.format || 'number'"
          [currency]="metric.currency || 'USD'"
          [trend]="metric.trend || 'neutral'"
          [trendValue]="metric.trendValue || ''"
          [comparisonLabel]="metric.comparisonLabel || ''"
          [iconClass]="metric.iconClass || 'fa-solid fa-chart-line'"
          [series]="metric.series || []"
        ></app-kpi-card>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns:
        repeat(var(--metric-columns-desktop), minmax(min(100%, var(--min-col-width)), 1fr));
      gap: var(--space-4);
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }

    .metrics-grid > * {
      min-width: 0;
    }

    @media (max-width: 72rem) {
      .metrics-grid {
        grid-template-columns:
          repeat(var(--metric-columns-tablet), minmax(min(100%, var(--min-col-width)), 1fr));
      }
    }

    @media (max-width: 40rem) {
      .metrics-grid {
        grid-template-columns:
          repeat(var(--metric-columns-mobile), minmax(min(100%, var(--min-col-width)), 1fr));
        gap: var(--space-3);
      }
    }

    .metrics-grid--empty {
      grid-template-columns: none;
    }
  `]
})
export class MetricsGridComponent {
  @Input() metrics: KpiMetric[] = [];
  @Input() minCardWidth = '13.75rem';
  @Input() ariaLabel = 'Resumen de indicadores';

  columnCount(capacity: number): number {
    return Math.min(this.metrics.length, capacity);
  }
}
