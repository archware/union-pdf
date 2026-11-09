import {
  Component, Input, ChangeDetectionStrategy
} from '@angular/core';


export type TimelineItemStatus = 'completed' | 'active' | 'pending' | 'error';

export interface TimelineItem {
  id?: string | number;
  title: string;
  description?: string;
  date?: string;
  status?: TimelineItemStatus;
  icon?: string;
  badge?: string;
}

/**
 * TimelineComponent — Historial cronológico de eventos.
 *
 * @example
 * ```html
 * <app-timeline [items]="activityLog" orientation="vertical"></app-timeline>
 * ```
 */
@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline" [class.timeline-horizontal]="orientation === 'horizontal'">
      @for (item of items; track item.id ?? item.title; let last = $last) {
        <div class="timeline-item" [class]="'timeline-' + (item.status ?? 'pending')">
          <!-- Connector line -->
          @if (!last) {
            <div class="timeline-connector"></div>
          }

          <!-- Dot / Icon -->
          <div class="timeline-dot" [attr.aria-label]="item.status ?? 'pending'">
            @if (item.icon) {
              <i [class]="item.icon" aria-hidden="true"></i>
            } @else if (item.status === 'completed') {
              <i class="fa-solid fa-check" aria-hidden="true"></i>
            } @else if (item.status === 'error') {
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            } @else if (item.status === 'active') {
              <span class="timeline-dot-pulse"></span>
            }
          </div>

          <!-- Content -->
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">{{ item.title }}</span>
              @if (item.badge) {
                <span class="timeline-badge">{{ item.badge }}</span>
              }
            </div>
            @if (item.description) {
              <p class="timeline-description">{{ item.description }}</p>
            }
            @if (item.date) {
              <time class="timeline-date">{{ item.date }}</time>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .timeline-horizontal {
      flex-direction: row;
      align-items: flex-start;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: var(--space-6) 1fr;
      grid-template-rows: auto;
      column-gap: var(--space-3);
      position: relative;
    }

    .timeline-horizontal .timeline-item {
      grid-template-columns: 1fr;
      grid-template-rows: var(--space-6) auto;
      align-items: center;
      flex: 1;
    }

    /* Connector */
    .timeline-connector {
      position: absolute;
      left: 15px;
      top: var(--space-6);
      bottom: 0;
      width: var(--space-1);
      background: var(--border-color);
      z-index: 0;
    }

    .timeline-horizontal .timeline-connector {
      left: 50%;
      top: 15px;
      bottom: auto;
      right: -50%;
      width: auto;
      height: var(--space-1);
    }

    /* Dot */
    .timeline-dot {
      width: var(--space-6);
      height: var(--space-6);
      border-radius: 50%;
      background: var(--surface-section);
      border: var(--space-1) solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-xs);
      color: var(--text-color-muted);
      z-index: 1;
      position: relative;
      flex-shrink: 0;
    }

    /* Status variants */
    .timeline-completed .timeline-dot {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    }

    .timeline-completed .timeline-connector {
      background: var(--color-success);
    }

    .timeline-active .timeline-dot {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: white;
    }

    .timeline-error .timeline-dot {
      background: var(--color-error);
      border-color: var(--color-error);
      color: white;
    }

    /* Pulse animation for active */
    .timeline-dot-pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: white;
      animation: timeline-pulse 1.5s infinite ease-in-out;
    }

    @keyframes timeline-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    /* Content */
    .timeline-content {
      padding-bottom: var(--space-5);
      padding-top: var(--space-1);
    }

    .timeline-horizontal .timeline-content {
      padding-top: var(--space-3);
      padding-bottom: 0;
      text-align: center;
    }

    .timeline-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .timeline-title {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-color-primary);
    }

    .timeline-badge {
      font-size: var(--text-xs);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
      background: var(--primary-color-alpha);
      color: var(--primary-color);
      font-weight: 500;
    }

    .timeline-description {
      margin: var(--space-1) 0 0;
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
      line-height: 1.5;
    }

    .timeline-date {
      display: block;
      margin-top: var(--space-1);
      font-size: var(--text-xs);
      color: var(--text-color-muted);
    }

    /* En móvil el timeline horizontal colapsa a vertical para evitar
       que el contenido se comprima o desborde en pantallas pequeñas */
    @media (max-width: 639px) {
      .timeline-horizontal {
        flex-direction: column;
      }

      .timeline-horizontal .timeline-item {
        grid-template-columns: var(--space-6) 1fr;
        grid-template-rows: auto;
        align-items: start;
        flex: unset;
      }

      .timeline-horizontal .timeline-connector {
        left: 15px;
        top: var(--space-6);
        bottom: 0;
        right: auto;
        width: var(--space-1);
        height: auto;
      }

      .timeline-horizontal .timeline-content {
        padding-top: var(--space-1);
        padding-bottom: var(--space-5);
        text-align: left;
      }
    }
  `]
})
export class TimelineComponent {
  /** Items to display in the timeline */
  @Input() items: TimelineItem[] = [];

  /** Layout orientation */
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
}
