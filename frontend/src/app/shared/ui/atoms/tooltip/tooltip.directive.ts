import {
  Directive, input, HostListener,
  ElementRef, inject, OnDestroy, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * TooltipDirective
 *
 * Uso:
 * ```html
 * <button appTooltip="Copiar" tooltipPosition="top">...</button>
 * ```
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '[attr.data-tooltip]': 'appTooltip()',
    '[attr.data-tooltip-pos]': 'tooltipPosition()',
    'class': 'tooltip-host',
  },
})
export class TooltipDirective implements OnDestroy {
  readonly appTooltip      = input.required<string>();
  readonly tooltipPosition = input<TooltipPosition>('top');

  private readonly el         = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private tooltipEl: HTMLElement | null = null;

  @HostListener('mouseenter')
  show(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const text = this.appTooltip();
    if (!text) return;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = `tooltip tooltip--${this.tooltipPosition()}`;
    this.tooltipEl.textContent = text;
    this.tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(this.tooltipEl);
    this.positionTooltip();
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  hide(): void {
    this.tooltipEl?.remove();
    this.tooltipEl = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private positionTooltip(): void {
    if (!this.tooltipEl) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const tip  = this.tooltipEl;
    const pos  = this.tooltipPosition();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Temporalmente visible para medir
    tip.style.visibility = 'hidden';
    tip.style.position   = 'absolute';
    tip.style.zIndex     = '9999';
    document.body.appendChild(tip);

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;

    const GAP = 8;
    let top = 0, left = 0;

    switch (pos) {
      case 'top':
        top  = rect.top + scrollY - th - GAP;
        left = rect.left + scrollX + (rect.width - tw) / 2;
        break;
      case 'bottom':
        top  = rect.bottom + scrollY + GAP;
        left = rect.left + scrollX + (rect.width - tw) / 2;
        break;
      case 'left':
        top  = rect.top + scrollY + (rect.height - th) / 2;
        left = rect.left + scrollX - tw - GAP;
        break;
      case 'right':
        top  = rect.top + scrollY + (rect.height - th) / 2;
        left = rect.right + scrollX + GAP;
        break;
    }

    tip.style.top  = `${top}px`;
    tip.style.left = `${left}px`;
    tip.style.visibility = 'visible';
  }
}
