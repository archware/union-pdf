import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileInputComponent, FileInputFile } from './file-input.component';

describe('FileInputComponent', () => {
  let fixture: ComponentFixture<FileInputComponent>;
  let component: FileInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FileInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(FileInputComponent);
    component = fixture.componentInstance;
    component.accept = '.pdf,application/pdf';
    component.maxSizeMB = 1;
    fixture.detectChanges();
  });

  it('accepts valid files and rejects invalid type or size', () => {
    const emitted: FileInputFile[][] = [];
    component.filesChange.subscribe(files => emitted.push(files));
    const valid = new File(['%PDF-1.7'], 'contrato.pdf', { type: 'application/pdf' });

    component.onFileChange({ target: { files: [valid], value: 'selected' } } as unknown as Event);
    expect(component.files().length).toBe(1);
    expect(emitted.at(-1)?.[0].file).toBe(valid);

    component.onFileChange({
      target: { files: [new File(['text'], 'contrato.txt', { type: 'text/plain' })], value: '' },
    } as unknown as Event);
    expect(component.validationError()).toContain('formatos permitidos');
    expect(component.files().length).toBe(1);

    component.onFileChange({
      target: {
        files: [new File([new Uint8Array(1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' })],
        value: '',
      },
    } as unknown as Event);
    expect(component.validationError()).toContain('supera el');
    expect(component.files().length).toBe(1);
  });

  it('uses only the first dropped file in single-file mode', () => {
    const first = new File(['a'], 'primero.pdf', { type: 'application/pdf' });
    const second = new File(['b'], 'segundo.pdf', { type: 'application/pdf' });

    component.onDrop({
      preventDefault: () => undefined,
      dataTransfer: { files: [first, second] },
    } as unknown as DragEvent);

    expect(component.files().length).toBe(1);
    expect(component.files()[0]?.file).toBe(first);
  });

  it('honors disabled and touched states and exposes validation through ARIA', () => {
    const touched = vi.fn();
    component.registerOnTouched(touched);
    const click = vi.spyOn(component.fileInputRef.nativeElement, 'click');
    component.setDisabledState(true);
    fixture.detectChanges();

    component.openFileDialog();
    component.onDrop({
      preventDefault: () => undefined,
      dataTransfer: { files: [new File(['a'], 'archivo.pdf', { type: 'application/pdf' })] },
    } as unknown as DragEvent);
    expect(click).not.toHaveBeenCalled();
    expect(component.files()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.drop-zone').getAttribute('tabindex')).toBe('-1');

    component.setDisabledState(false);
    component.onDrop({
      preventDefault: () => undefined,
      dataTransfer: { files: [new File(['text'], 'invalido.txt', { type: 'text/plain' })] },
    } as unknown as DragEvent);
    fixture.detectChanges();
    expect(touched).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.drop-zone').getAttribute('aria-invalid')).toBe('true');
  });

  it('limits image previews to the configured count and size', () => {
    component.multiple = true;
    component.accept = 'image/*';
    component.maxPreviewFiles = 1;
    component.maxPreviewSizeMB = 1;
    const readAsDataUrl = vi.spyOn(FileReader.prototype, 'readAsDataURL');

    component.onDrop({
      preventDefault: () => undefined,
      dataTransfer: {
        files: [
          new File(['a'], 'a.png', { type: 'image/png' }),
          new File(['b'], 'b.png', { type: 'image/png' }),
        ],
      },
    } as unknown as DragEvent);

    expect(readAsDataUrl).toHaveBeenCalledTimes(1);
  });

  it('opens the file dialog on mousedown + mouseup without duplicating on synthetic click and preserves isDragging across child dragleave', () => {
    const clickSpy = vi.spyOn(component.fileInputRef.nativeElement, 'click');
    const dropZone = fixture.nativeElement.querySelector('.drop-zone') as HTMLElement;
    const dropIcon = dropZone.querySelector('.drop-icon') as HTMLElement;

    dropZone.dispatchEvent(new MouseEvent('mousedown', { button: 0, detail: 1, bubbles: true, cancelable: true }));
    dropZone.dispatchEvent(new MouseEvent('mouseup', { button: 0, detail: 1, bubbles: true, cancelable: true }));
    dropZone.dispatchEvent(new MouseEvent('click', { button: 0, detail: 1, bubbles: true, cancelable: true }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    component.onDragOver({
      preventDefault: () => undefined,
      dataTransfer: { types: ['text/plain'], dropEffect: 'none' },
    } as unknown as DragEvent);
    expect(component.isDragging()).toBe(false);

    const transfer = { types: ['Files'], dropEffect: 'none' };
    component.onDragOver({
      preventDefault: () => undefined,
      dataTransfer: transfer,
    } as unknown as DragEvent);
    expect(component.isDragging()).toBe(true);
    expect(transfer.dropEffect).toBe('copy');

    component.onDragLeave({
      preventDefault: () => undefined,
      currentTarget: dropZone,
      relatedTarget: dropIcon,
    } as unknown as DragEvent);
    expect(component.isDragging()).toBe(true);

    component.onDragLeave({
      preventDefault: () => undefined,
      currentTarget: dropZone,
      relatedTarget: document.body,
    } as unknown as DragEvent);
    expect(component.isDragging()).toBe(false);
  });
});
