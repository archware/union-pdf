import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body-lg' | 'body' | 'body-sm' | 'caption' | 'label';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextColor = 'default' | 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'danger' | 'white';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

@Component({
  selector: 'app-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (renderAs) {
      @case ('h1') { <h1 [ngClass]="classes"><ng-container *ngTemplateOutlet="content"></ng-container></h1> }
      @case ('h2') { <h2 [ngClass]="classes"><ng-container *ngTemplateOutlet="content"></ng-container></h2> }
      @case ('h3') { <h3 [ngClass]="classes"><ng-container *ngTemplateOutlet="content"></ng-container></h3> }
      @case ('h4') { <h4 [ngClass]="classes"><ng-container *ngTemplateOutlet="content"></ng-container></h4> }
      @default { <p [ngClass]="classes"><ng-container *ngTemplateOutlet="content"></ng-container></p> }
    }
    <ng-template #content><ng-content></ng-content></ng-template>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Base Styles */
    h1, h2, h3, h4, p {
      margin: 0;
      padding: 0;
      line-height: 1.5;
    }

    /* Alignment */
    .align-left { text-align: left; }
    .align-center { text-align: center; }
    .align-right { text-align: right; }
    .align-justify { text-align: justify; }

    /* Variants - Headings (Escala tipográfica base del sistema) */
    .text-h1 { font-size: var(--text-4xl, var(--space-7)); letter-spacing: -0.025em; line-height: 1.2; margin-top: var(--space-9); margin-bottom: var(--space-3); }
    .text-h2 { font-size: var(--text-3xl, 1.875rem); letter-spacing: -0.025em; line-height: 1.25; margin-top: var(--space-9); margin-bottom: var(--space-3); }
    .text-h3 { font-size: var(--text-2xl, var(--space-5)); letter-spacing: -0.025em; line-height: 1.3; margin-top: var(--space-9); margin-bottom: var(--space-3); }
    .text-h4 { font-size: var(--text-xl, var(--space-5)); letter-spacing: -0.015em; line-height: 1.4; margin-top: var(--space-9); margin-bottom: var(--space-3); }

    /* First heading in container should not have top margin */
    :host(:first-child) .text-h1,
    :host(:first-child) .text-h2,
    :host(:first-child) .text-h3,
    :host(:first-child) .text-h4 {
      margin-top: 0;
    }

    .text-body-lg { font-size: var(--text-lg); }
    .text-body { font-size: var(--text-md); }
    .text-body-sm { font-size: var(--text-sm); }

    .text-caption { font-size: var(--text-xs); letter-spacing: 0.02em; }
    .text-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; }

    /* Weights */
    .weight-normal { font-weight: var(--font-weight-body); }
    .weight-medium { font-weight: var(--font-weight-body); }
    .weight-semibold { font-weight: var(--font-weight-emphasis); }
    .weight-bold { font-weight: var(--font-weight-title); }

    /* Colors - Tokens without fallbacks */
    .color-default { color: var(--text-color); }
    .color-primary { color: var(--primary-color); }
    .color-secondary { color: var(--secondary-color); }
    .color-muted { color: var(--text-color-secondary); }
    .color-success { color: var(--success-color-text); }
    .color-warning { color: var(--warning-color-text); }
    .color-danger { color: var(--danger-color-text); }
    .color-white { color: var(--white, var(--gray-0)); }

    /* 
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --text-color, --primary-color, etc. ya tienen valores apropiados
     * para temas oscuros.
     */
  `]
})
export class TextComponent implements OnInit {
  @Input() variant: TextVariant = 'body';
  @Input() weight: TextWeight = 'normal';
  @Input() color: TextColor = 'default';
  @Input() align: TextAlign = 'left';

  renderAs = 'p';

  ngOnInit() {
    // Map variant to semantic HTML tag
    if (['h1', 'h2', 'h3', 'h4'].includes(this.variant)) {
      this.renderAs = this.variant;
    } else {
      this.renderAs = 'p';
    }
  }

  get classes() {
    return {
      [`text-${this.variant}`]: true,
      [`weight-${this.weight}`]: true,
      [`color-${this.color}`]: true,
      [`align-${this.align}`]: true
    };
  }
}
