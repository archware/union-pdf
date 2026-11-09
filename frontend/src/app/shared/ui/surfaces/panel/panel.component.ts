import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


/** Available panel visual styles */
export type PanelVariant = 'default' | 'elevated' | 'floating' | 'card' | 'flat' | 'outlined' | 'transparent' | 'plain';

/** Padding size options */
export type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

/** Title size options */
export type PanelTitleSize = 'sm' | 'md' | 'lg' | 'xl';

/** Title weight options */
export type PanelTitleWeight = 'normal' | 'medium' | 'semibold' | 'bold';

/** Title alignment options */
export type PanelTitleAlign = 'left' | 'center' | 'right';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelComponent {
  /** Panel variant style */
  @Input() variant: PanelVariant = 'default';

  /** Padding size */
  @Input() padding: PanelPadding = 'md';

  /** Optional title displayed in header */
  @Input() title = '';

  /** Optional icon displayed before title */
  @Input() icon = '';

  /** Whether to show the header section */
  @Input() showHeader = true;

  /** Whether the panel should take full width (default: true) */
  @Input() fullWidth = true;

  /** Title font size */
  @Input() titleSize: PanelTitleSize = 'md';

  /** Title font weight */
  @Input() titleWeight: PanelTitleWeight = 'semibold';

  /** Title text alignment */
  @Input() titleAlign: PanelTitleAlign = 'left';
}
