import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';

export interface Step {
  label: string;
  description?: string;
  icon?: string;
  optional?: boolean;
}

@Component({
  selector: 'app-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stepper" [class.stepper-vertical]="vertical" role="navigation" aria-label="Progreso">
      @for (step of steps; track step.label; let i = $index) {
        <div
          class="step"
          [class.completed]="i < currentStep()"
          [class.active]="i === currentStep()"
          [class.disabled]="i > currentStep() && !allowSkip"
          (click)="goToStep(i)"
          (keydown.enter)="goToStep(i)"
          (keydown.space)="goToStep(i)"
          [attr.aria-current]="i === currentStep() ? 'step' : null"
          role="button"
          tabindex="0"
        >
          <div class="step-indicator">
            @if (i < currentStep()) {
              <span class="step-check" aria-hidden="true">✓</span>
            } @else if (step.icon) {
              <span class="step-icon" aria-hidden="true">{{ step.icon }}</span>
            } @else {
              <span class="step-number">{{ i + 1 }}</span>
            }
          </div>
          <div class="step-content">
            <span class="step-label">{{ step.label }}</span>
            @if (step.description) {
              <span class="step-description">{{ step.description }}</span>
            }
            @if (step.optional) {
              <span class="step-optional">Opcional</span>
            }
          </div>
        </div>
        @if (i < steps.length - 1) {
          <div class="step-connector" [class.completed]="i < currentStep()" aria-hidden="true"></div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      overflow: visible;
    }

    .stepper {
      display: flex;
      align-items: flex-start;
      width: 100%;
      padding: var(--space-4) var(--space-1);
      min-width: 0;
    }

    .stepper-vertical {
      flex-direction: column;
      align-items: stretch;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      cursor: pointer;
      position: relative;
      z-index: 1;
      flex: 1 1 0;
      min-width: 0;
    }

    .step.disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* STEP INDICATOR (CIRCLE) */
    .step-indicator {
      width: var(--space-11);
      height: var(--space-11);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--surface-background);
      color: var(--text-color-secondary);
      font-size: var(--text-md);
      font-weight: 700;
      border: var(--space-1) solid var(--border-color);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      box-shadow: var(--shadow-xs);
    }

    /* Active State */
    .step.active .step-indicator {
      background: var(--primary-color);
      color: var(--text-color-on-primary);
      border-color: var(--primary-color);
      transform: scale(1.1);
      box-shadow: var(--shadow-glow-primary);
    }

    /* Completed State */
    .step.completed .step-indicator {
      background: var(--success-color);
      border-color: var(--success-color);
      color: var(--text-color-on-primary);
    }

    .step-check {
      font-size: var(--text-md);
      font-weight: 800;
    }

    /* TEXT CONTENT */
    .step-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-height: var(--space-11);
      justify-content: center;
      min-width: 0;
      flex: 1 1 0;
    }

    .step-label {
      font-size: var(--text-md);
      font-weight: 600;
      color: var(--text-color-secondary);
      transition: color 200ms ease;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    /* Horizontal mode: indicator on top, label centered below */
    .stepper:not(.stepper-vertical) .step {
      flex-direction: column;
      align-items: center;
      gap: var(--space-2, var(--space-2));
    }

    .stepper:not(.stepper-vertical) .step-content {
      flex: 0 0 auto;
      min-height: auto;
      align-items: center;
      text-align: center;
    }

    .stepper:not(.stepper-vertical) .step-label {
      text-align: center;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .stepper:not(.stepper-vertical) .step-description,
    .stepper:not(.stepper-vertical) .step-optional {
      text-align: center;
    }

    .step.active .step-label {
      color: var(--primary-color);
      font-weight: 700;
    }

    .step.completed .step-label {
      color: var(--text-color);
    }

    .step-description {
      font-size: var(--text-sm);
      color: var(--text-color-muted);
      line-height: 1.4;
    }

    .step-optional {
      font-size: var(--text-xs);
      color: var(--text-color-muted);
      font-style: italic;
      margin-top: calc(-1 * var(--space-1));
    }

    /* CONNECTOR LINES */
    .step-connector {
      flex: 0 0 var(--space-6);
      height: var(--space-1);
      min-width: var(--space-4);
      margin: var(--space-5, 1.375rem) var(--space-1) 0;
      background: var(--border-color);
      transition: background 300ms ease;
      border-radius: var(--radius-xs, var(--space-1));
    }

    .step-connector.completed {
      background: var(--success-color);
    }

    /* Vertical tweaks */
    .stepper-vertical .step {
      flex-direction: row;
    }

    .stepper-vertical .step-connector {
      width: var(--space-1);
      height: var(--space-10, 2.5rem);
      min-width: var(--space-1);
      margin: var(--space-1) 0 var(--space-1) var(--space-5, 1.375rem);
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --surface-background, --border-color, --primary-color, --shadow-glow-primary
     * ya tienen valores apropiados para temas oscuros.
     */

    /* RESPONSIVE: Compact mobile layout */
    @media (max-width: 768px) {
      .stepper {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
      }

      .stepper .step {
        flex-direction: row;
        gap: var(--space-3);
        padding: var(--space-2) 0;
      }

      .stepper .step-indicator {
        width: var(--space-6);
        height: var(--space-6);
        font-size: var(--text-sm);
      }

      .stepper .step-label {
        font-size: var(--text-sm);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }

      .stepper .step-description,
      .stepper .step-optional {
        display: none;
      }

      .stepper .step-connector {
        width: var(--space-1);
        height: var(--space-6);
        min-width: var(--space-1);
        margin: 0 0 0 var(--space-4, 0.9375rem);
      }
    }
  `]
})
export class StepperComponent {
  @Input() steps: Step[] = [];
  @Input() allowSkip = false;
  @Input() vertical = false;
  @Input() set activeStep(value: number) {
    this.currentStep.set(value);
  }
  @Output() stepChange = new EventEmitter<number>();

  currentStep = signal(0);

  goToStep(index: number) {
    if (index <= this.currentStep() || this.allowSkip) {
      this.currentStep.set(index);
      this.stepChange.emit(index);
    }
  }

  next() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(v => v + 1);
      this.stepChange.emit(this.currentStep());
    }
  }

  previous() {
    if (this.currentStep() > 0) {
      this.currentStep.update(v => v - 1);
      this.stepChange.emit(this.currentStep());
    }
  }

  /** Ir al primer paso */
  reset() {
    this.currentStep.set(0);
    this.stepChange.emit(0);
  }
}
