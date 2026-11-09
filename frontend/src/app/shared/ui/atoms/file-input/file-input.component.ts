import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';

let fileInputSequence = 0;

export interface FileInputFile {
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

/**
 * FileInputComponent — Campo de carga de archivos con drag & drop.
 *
 * @example
 * ```html
 * <app-file-input
 *   label="Adjuntar documentos"
 *   accept=".pdf,.docx"
 *   [multiple]="true"
 *   [maxSizeMB]="5"
 *   (filesChange)="onFiles($event)">
 * </app-file-input>
 * ```
 */
@Component({
  selector: 'app-file-input',
  standalone: true,
  imports: [ScrollOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: FileInputComponent, multi: true }
  ],
  template: `
    <div
      class="file-input-wrapper"
      [class.disabled]="disabled"
      [class.drag-over]="isDragging()"
      [class.invalid]="visibleError"
    >
      @if (label) {
        <label class="file-label" [for]="inputId">{{ label }}</label>
      }
      @if (hint) {
        <p class="file-hint" [id]="inputId + '-hint'">{{ hint }}</p>
      }
      <div
        class="drop-zone"
        draggable="false"
        (mousedown)="onDropZoneMouseDown($event)"
        (mouseup)="onDropZoneMouseUp($event)"
        (mouseleave)="onDropZoneMouseLeave()"
        (dragstart)="$event.preventDefault()"
        (dragend)="isDragging.set(false)"
        (click)="onDropZoneClick($event)"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (blur)="onTouched()"
        (keydown.enter)="openFileDialog(); $event.preventDefault()"
        (keydown.space)="openFileDialog(); $event.preventDefault()"
        [attr.tabindex]="disabled ? -1 : 0"
        role="button"
        [attr.aria-disabled]="disabled"
        [attr.aria-invalid]="visibleError ? 'true' : null"
        [attr.aria-describedby]="visibleError ? inputId + '-error' : hint ? inputId + '-hint' : null"
        aria-label="Seleccionar archivo"
      >
        <i class="fa-solid fa-cloud-arrow-up drop-icon" aria-hidden="true"></i>
        <p class="drop-text"><strong>Haz clic</strong> o arrastra archivos aquí</p>
        @if (accept) { <p class="drop-hint">Formatos: {{ accept }}</p> }
        @if (maxSizeMB) { <p class="drop-hint">Máximo {{ maxSizeMB }} MB por archivo</p> }
      </div>

      <input
        #fileInput
        [id]="inputId"
        type="file"
        class="file-hidden"
        [accept]="accept"
        [multiple]="multiple"
        [disabled]="disabled"
        (change)="onFileChange($event)"
        (blur)="onTouched()"
        [attr.aria-invalid]="visibleError ? 'true' : null"
        [attr.aria-label]="label || 'Seleccionar archivo'"
        [attr.aria-describedby]="visibleError ? inputId + '-error' : hint ? inputId + '-hint' : null"
      />

      @if (visibleError) {
        <p class="file-error" [id]="inputId + '-error'" role="alert">
          <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {{ visibleError }}
        </p>
      }

      @if (files().length > 0) {
        <app-scroll-overlay
          class="so-block file-list-scroll"
          [maxBodyHeight]="maxListHeight"
          [skipTableDetection]="true"
          [disableHorizontal]="true"
          [resetKey]="files().length === 0"
        >
          <ul class="file-list" aria-label="Archivos seleccionados">
            @for (f of files(); track f.file) {
              <li class="file-item">
                @if (f.preview) {
                  <img class="file-preview" [src]="f.preview" alt="" />
                } @else {
                  <i class="fa-solid fa-file file-icon" aria-hidden="true"></i>
                }
                <span class="file-name" [title]="f.name">{{ f.name }}</span>
                <span class="file-size">{{ formatSize(f.size) }}</span>
                @if (!disabled) {
                  <button
                    type="button"
                    class="file-remove"
                    (click)="removeFile(f)"
                    [attr.aria-label]="'Eliminar ' + f.name"
                  >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                }
              </li>
            }
          </ul>
        </app-scroll-overlay>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .file-label {
      display: block; margin-bottom: var(--space-2);
      font-size: var(--text-sm); font-weight: 500; color: var(--text-color);
    }

    .drop-zone {
      border: var(--space-1) dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--space-6) var(--space-5);
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: var(--surface-background);
      outline: none;
      user-select: none;
      --wails-draggable: no-drag;
    }
    .drop-zone > * { pointer-events: none; }
    .drop-zone:hover,
    .drop-zone:focus-visible { border-color: var(--input-border-focus); background: var(--surface-hover); }

    .drag-over .drop-zone { border-color: var(--input-border-focus); background: var(--surface-hover); }
    .invalid .drop-zone { border-color: var(--danger-color); }
    .disabled .drop-zone { opacity: 0.5; pointer-events: none; cursor: not-allowed; }

    .drop-icon { font-size: var(--space-6); color: var(--text-color-muted); display: block; margin-bottom: var(--space-2); }
    .drop-text  { margin: var(--space-1) 0; font-size: var(--text-sm); color: var(--text-color-secondary); }
    .drop-hint  { margin: var(--space-1) 0 0; font-size: var(--text-xs); color: var(--text-color-muted); }

    .file-hidden { display: none; }

    .file-hint {
      margin: 0 0 var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-color-muted);
    }

    .file-error {
      display: flex; align-items: center; gap: var(--space-2);
      margin: var(--space-2) 0 0;
      font-size: var(--text-sm); color: var(--danger-color);
    }

    .file-list-scroll {
      margin-top: var(--space-3);
      width: 100%;
    }

    .file-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: var(--space-2);
    }

    .file-item {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      background: var(--surface-section);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }

    .file-preview {
      width: var(--space-6); height: var(--space-6); object-fit: cover;
      border-radius: var(--radius-xs, var(--space-1)); flex-shrink: 0;
    }
    .file-icon { color: var(--text-color-muted); flex-shrink: 0; }
    .file-name {
      flex: 1; font-size: var(--text-sm);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-size { font-size: var(--text-xs); color: var(--text-color-muted); white-space: nowrap; }

    .file-remove {
      background: none; border: none; cursor: pointer;
      padding: var(--space-1) var(--space-2);
      color: var(--text-color-muted);
      border-radius: var(--radius-xs, var(--space-1));
      transition: color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .file-remove:hover { color: var(--color-error, #ef4444); background: var(--surface-hover); }
  `]
})
export class FileInputComponent implements ControlValueAccessor {
  private static readonly POINTER_CLICK_DEDUP_MS = 450;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  readonly inputId = `file-input-${++fileInputSequence}`;
  private dropZonePointerDown = false;
  private lastPointerOpenAt = 0;

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() label = '';
  @Input() hint = '';
  @Input() accept = '';
  @Input() multiple = false;
  @Input() maxSizeMB?: number;
  @Input() maxPreviewSizeMB = 2;
  @Input() maxPreviewFiles = 4;
  @Input() maxListHeight: number | string = 210;
  @Input() disabled = false;
  @Input() error = '';

  @Output() filesChange = new EventEmitter<FileInputFile[]>();

  readonly files = signal<FileInputFile[]>([]);
  readonly isDragging = signal(false);
  readonly validationError = signal('');

  get visibleError(): string {
    return this.error || this.validationError();
  }

  private onChange: (v: FileInputFile[]) => void = () => {};
  protected onTouched: () => void = () => {};

  onDropZoneMouseDown(event: MouseEvent): void {
    event.preventDefault();
    if (this.disabled || event.button !== 0 || event.detail > 1) {
      this.dropZonePointerDown = false;
      return;
    }
    this.dropZonePointerDown = true;
    this.isDragging.set(false);
  }

  onDropZoneMouseUp(event: MouseEvent): void {
    if (this.disabled || event.button !== 0 || !this.dropZonePointerDown) {
      this.dropZonePointerDown = false;
      return;
    }
    this.dropZonePointerDown = false;
    this.lastPointerOpenAt = Date.now();
    this.openFileDialog();
  }

  onDropZoneMouseLeave(): void {
    this.dropZonePointerDown = false;
  }

  onDropZoneClick(event: MouseEvent): void {
    if (this.disabled) return;
    if (event.detail > 1) {
      event.preventDefault();
      return;
    }
    if (
      this.lastPointerOpenAt > 0 &&
      Date.now() - this.lastPointerOpenAt < FileInputComponent.POINTER_CLICK_DEDUP_MS
    ) {
      this.lastPointerOpenAt = 0;
      return;
    }
    this.openFileDialog();
  }

  openFileDialog(): void {
    if (!this.disabled) {
      this.isDragging.set(false);
      this.onTouched();
      this.fileInputRef.nativeElement.click();
    }
  }

  onFileChange(event: Event): void {
    this.isDragging.set(false);
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    if (input.files) this.processFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (this.disabled) {
      this.isDragging.set(false);
      return;
    }
    const types = event.dataTransfer?.types;
    if (types && types.length > 0 && !Array.from(types).includes('Files')) {
      this.isDragging.set(false);
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    // Add stopPropagation only if available (to handle test environment)
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    this.isDragging.set(false);
    if (this.disabled) return;
    const dropped = event.dataTransfer?.files;
    if (dropped) this.processFiles(Array.from(dropped));
  }

  private processFiles(rawFiles: File[]): void {
    this.onTouched();
    this.validationError.set('');
    const selectedFiles = this.multiple ? rawFiles : rawFiles.slice(0, 1);
    const invalidSize = selectedFiles.find(
      file => this.maxSizeMB !== undefined && file.size > this.maxSizeMB * 1024 * 1024
    );
    if (invalidSize) {
      this.validationError.set(`${invalidSize.name} supera el máximo de ${this.maxSizeMB} MB.`);
      return;
    }

    const invalidType = selectedFiles.find(file => !this.isAccepted(file));
    if (invalidType) {
      this.validationError.set(`${invalidType.name} no corresponde a los formatos permitidos.`);
      return;
    }

    const processed: FileInputFile[] = selectedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    this.generateImagePreviews(processed);

    const newFiles = this.multiple ? [...this.files(), ...processed] : processed;
    this.files.set(newFiles);
    this.onChange(newFiles);
    this.filesChange.emit(newFiles);
  }

  private generateImagePreviews(files: FileInputFile[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const maxFiles = Number.isFinite(this.maxPreviewFiles)
      ? Math.max(0, Math.trunc(this.maxPreviewFiles))
      : 0;
    const maxSize = Number.isFinite(this.maxPreviewSizeMB)
      ? Math.max(0, this.maxPreviewSizeMB)
      : 0;
    const maxBytes = maxSize * 1024 * 1024;
    const existingPreviewCount = this.multiple
      ? this.files().filter(file => file.preview).length
      : 0;
    let remaining = Math.max(0, maxFiles - existingPreviewCount);

    for (const item of files) {
      if (remaining === 0) break;
      if (!item.type.startsWith('image/') || item.size > maxBytes) continue;

      remaining -= 1;
      const reader = new FileReader();
      reader.onload = event => {
        const preview = event.target?.result;
        if (typeof preview === 'string') {
          item.preview = preview;
          this.files.update(current => [...current]);
        }
      };
      reader.readAsDataURL(item.file);
    }
  }

  private isAccepted(file: File): boolean {
    const rules = this.accept
      .split(',')
      .map(rule => rule.trim().toLowerCase())
      .filter(Boolean);
    if (rules.length === 0) return true;

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return rules.some(rule => {
      if (rule.startsWith('.')) return name.endsWith(rule);
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
  }

  removeFile(f: FileInputFile): void {
    this.files.update(fs => fs.filter(x => x !== f));
    this.onChange(this.files());
    this.filesChange.emit(this.files());
    this.onTouched();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ControlValueAccessor
  writeValue(v: FileInputFile[]): void { this.files.set(v ?? []); }
  registerOnChange(fn: (v: FileInputFile[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void {
    this.disabled = d;
    this.changeDetectorRef.markForCheck();
  }
}