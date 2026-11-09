import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'password' | 'email' | 'tel' | 'date' | 'search' | 'number';
export type InputMode = 'text' | 'numeric' | 'email' | 'tel' | 'search' | 'decimal';

/** Entrada de formulario portable para consumidores Angular zoneless. */
@Component({
  selector: 'app-input, prest-input, app-form-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input.html',
  styleUrl: './input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Input),
      multi: true,
    },
  ],
})
export class Input implements ControlValueAccessor {
  private static nextId = 0;
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly generatedId = `prest-input-${++Input.nextId}`;

  readonly controlId = input<string | null>(null);
  readonly type = input<InputType>('text');
  readonly label = input('');
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly inputMode = input<InputMode>('text');
  readonly maxLength = input<number | null>(null);
  readonly minLength = input<number | null>(null);
  readonly min = input<string | number | null>(null);
  readonly max = input<string | number | null>(null);
  readonly step = input<string | number | null>(null);
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly revealable = input(false);

  readonly valueChange = output<string>();

  protected readonly value = signal('');
  protected readonly controlDisabled = signal(false);
  protected readonly revealed = signal(false);
  protected readonly id = computed(() => this.controlId() ?? this.generatedId);
  protected readonly effectiveDisabled = computed(() => this.disabled() || this.controlDisabled());
  protected readonly effectiveType = computed<InputType>(() => {
    if (this.type() === 'password' && this.revealable() && this.revealed()) {
      return 'text';
    }
    return this.type();
  });

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  protected toggleReveal(): void {
    this.revealed.update((current) => !current);
  }

  writeValue(value: unknown): void {
    this.value.set(value == null ? '' : String(value));
    this.changeDetector.markForCheck();
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.controlDisabled.set(disabled);
    this.changeDetector.markForCheck();
  }
}
