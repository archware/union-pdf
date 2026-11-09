import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent (Unión PDF)', () => {
  let component: AppComponent;
  let mockCdr: ChangeDetectorRef;

  beforeEach(() => {
    mockCdr = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn(),
      detach: vi.fn(),
      reattach: vi.fn(),
      checkNoChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    component = new AppComponent(mockCdr);
  });

  describe('Initial State', () => {
    it('initializes with clean and empty studio workspace', () => {
      expect(component.uploadedFiles).toEqual([]);
      expect(component.globalPageOrder).toEqual([]);
      expect(component.selectedPageId).toBeNull();
      expect(component.isDragging).toBe(false);
      expect(component.isMerging).toBe(false);
      expect(component.statusMessage).toBe('');
      expect(component.statusType).toBe('');
    });
  });

  describe('formatBytes', () => {
    it('formats 0 bytes correctly', () => {
      expect(component.formatBytes(0)).toBe('0 Bytes');
    });

    it('formats bytes, kilobytes and megabytes accurately', () => {
      expect(component.formatBytes(512)).toBe('512 Bytes');
      expect(component.formatBytes(1024)).toBe('1 KB');
      expect(component.formatBytes(2048)).toBe('2 KB');
      expect(component.formatBytes(1048576)).toBe('1 MB');
      expect(component.formatBytes(5242880)).toBe('5 MB');
    });
  });

  describe('parsePageRange', () => {
    it('returns all page indices when input is empty or whitespace', () => {
      expect(component.parsePageRange('', 4)).toEqual([0, 1, 2, 3]);
      expect(component.parsePageRange('   ', 3)).toEqual([0, 1, 2]);
    });

    it('returns all page indices when input is "todas"', () => {
      expect(component.parsePageRange('todas', 3)).toEqual([0, 1, 2]);
      expect(component.parsePageRange('TODAS', 2)).toEqual([0, 1]);
    });

    it('parses single pages and comma-separated lists', () => {
      expect(component.parsePageRange('1', 5)).toEqual([0]);
      expect(component.parsePageRange('2, 4', 5)).toEqual([1, 3]);
    });

    it('parses contiguous ranges', () => {
      expect(component.parsePageRange('1-3', 5)).toEqual([0, 1, 2]);
      expect(component.parsePageRange('3-5', 5)).toEqual([2, 3, 4]);
    });

    it('handles inverted ranges (e.g. 4-2)', () => {
      expect(component.parsePageRange('4-2', 5)).toEqual([1, 2, 3]);
    });

    it('parses mixed ranges and individual pages', () => {
      expect(component.parsePageRange('1-2, 4, 5', 5)).toEqual([0, 1, 3, 4]);
    });

    it('ignores out-of-bounds page numbers', () => {
      expect(component.parsePageRange('0, 2, 99', 3)).toEqual([1]);
    });

    it('falls back to all pages if no valid page was parsed', () => {
      expect(component.parsePageRange('abc, xyz', 3)).toEqual([0, 1, 2]);
    });
  });

  describe('pagesToRangeString', () => {
    it('returns empty string for empty page list', () => {
      expect(component.pagesToRangeString([])).toBe('');
    });

    it('formats single pages', () => {
      expect(component.pagesToRangeString([1])).toBe('1');
    });

    it('formats contiguous ranges', () => {
      expect(component.pagesToRangeString([1, 2, 3])).toBe('1-3');
    });

    it('formats non-contiguous pages', () => {
      expect(component.pagesToRangeString([1, 3, 5])).toBe('1, 3, 5');
    });

    it('formats mixed ranges and standalone pages', () => {
      expect(component.pagesToRangeString([1, 2, 4, 6, 7, 8])).toBe('1-2, 4, 6-8');
    });
  });

  describe('File and Page Workspace Management', () => {
    function createMockFile(id: string, name: string, pageCount: number) {
      const pages = Array.from({ length: pageCount }, (_, index) => ({
        id: `${id}-p${index + 1}`,
        pageNum: index + 1,
        active: true,
      }));
      return {
        id,
        fileObject: new File([], name, { type: 'application/pdf' }),
        name,
        size: '100 KB',
        pageCount,
        pagesToKeep: `1-${pageCount}`,
        pages,
      };
    }

    it('calculates file badge text for full and partial page retention', () => {
      const file = createMockFile('f1', 'test.pdf', 3);
      expect(component.getFileBadgeText(file)).toBe('3 paginas');

      const singlePageFile = createMockFile('f2', 'doc.pdf', 1);
      expect(component.getFileBadgeText(singlePageFile)).toBe('1 pagina');

      file.pages[0].active = false;
      expect(component.getFileBadgeText(file)).toBe('Conservando 2 de 3 pag.');
    });

    it('counts active pages across all files in global order', () => {
      const file1 = createMockFile('f1', 'test1.pdf', 2);
      const file2 = createMockFile('f2', 'test2.pdf', 3);
      component.uploadedFiles = [file1, file2];
      component.globalPageOrder = [
        ...file1.pages.map((p) => p.id),
        ...file2.pages.map((p) => p.id),
      ];

      expect(component.getActivePageCount()).toBe(5);

      file2.pages[1].active = false;
      expect(component.getActivePageCount()).toBe(4);
    });

    it('toggles page active state and updates pagesToKeep range string', () => {
      const file = createMockFile('f1', 'doc.pdf', 3);
      component.uploadedFiles = [file];
      component.globalPageOrder = file.pages.map((p) => p.id);

      // Toggle page 2 off
      component.togglePageActive('f1-p2');
      expect(file.pages[1].active).toBe(false);
      expect(file.pagesToKeep).toBe('1, 3');

      // Toggle page 2 back on
      component.togglePageActive('f1-p2');
      expect(file.pages[1].active).toBe(true);
      expect(file.pagesToKeep).toBe('1-3');
    });

    it('updates pagesToKeep on updatePageInput', () => {
      const file = createMockFile('f1', 'doc.pdf', 4);
      component.uploadedFiles = [file];
      component.globalPageOrder = file.pages.map((p) => p.id);

      component.updatePageInput('f1', '1, 3-4');
      expect(file.pages[0].active).toBe(true);
      expect(file.pages[1].active).toBe(false);
      expect(file.pages[2].active).toBe(true);
      expect(file.pages[3].active).toBe(true);
    });

    it('moves page positions within boundaries', () => {
      const file = createMockFile('f1', 'doc.pdf', 3);
      component.uploadedFiles = [file];
      component.globalPageOrder = ['p1', 'p2', 'p3'];

      // Move p2 up
      component.movePagePosition('p2', -1);
      expect(component.globalPageOrder).toEqual(['p2', 'p1', 'p3']);

      // Attempt moving p2 up past boundary (index 0)
      component.movePagePosition('p2', -1);
      expect(component.globalPageOrder).toEqual(['p2', 'p1', 'p3']);

      // Move p2 down to middle
      component.movePagePosition('p2', 1);
      expect(component.globalPageOrder).toEqual(['p1', 'p2', 'p3']);

      // Move p3 down past boundary (index 2)
      component.movePagePosition('p3', 1);
      expect(component.globalPageOrder).toEqual(['p1', 'p2', 'p3']);
    });

    it('removes an uploaded file and cleans up pages from global order', () => {
      const file1 = createMockFile('f1', 'test1.pdf', 2);
      const file2 = createMockFile('f2', 'test2.pdf', 2);
      component.uploadedFiles = [file1, file2];
      component.globalPageOrder = ['f1-p1', 'f1-p2', 'f2-p1', 'f2-p2'];
      component.selectedPageId = 'f1-p1';

      component.removeItem('f1');
      expect(component.uploadedFiles.length).toBe(1);
      expect(component.uploadedFiles[0].id).toBe('f2');
      expect(component.globalPageOrder).toEqual(['f2-p1', 'f2-p2']);
      expect(component.selectedPageId).toBe('f2-p1');
    });

    it('clears all uploaded files and workspace state on clearAll', () => {
      const file = createMockFile('f1', 'doc.pdf', 3);
      component.uploadedFiles = [file];
      component.globalPageOrder = ['f1-p1', 'f1-p2', 'f1-p3'];
      component.selectedPageId = 'f1-p1';
      component.showStatus('Archivos cargados', 'success');

      component.clearAll();
      expect(component.uploadedFiles).toEqual([]);
      expect(component.globalPageOrder).toEqual([]);
      expect(component.selectedPageId).toBeNull();
      expect(component.statusMessage).toBe('');
    });

    it('returns a valid fallback data URI when no thumbnail is in cache', () => {
      const file = createMockFile('f1', 'doc.pdf', 1);
      const entry = { file, page: file.pages[0] };
      const thumbnail = component.getThumbnailSrc(entry);
      expect(thumbnail).toContain('data:image/png;base64');
    });
  });

  describe('Status Notifications', () => {
    it('sets status message and type via showStatus and clears via hideStatus', () => {
      component.showStatus('Cargando documento...', 'loading');
      expect(component.statusMessage).toBe('Cargando documento...');
      expect(component.statusType).toBe('loading');

      component.hideStatus();
      expect(component.statusMessage).toBe('');
      expect(component.statusType).toBe('');
    });
  });

  describe('Drag and Drop events', () => {
    it('toggles isDragging flag on dragover and dragleave', () => {
      const mockEvent = { preventDefault: vi.fn() } as unknown as DragEvent;

      component.onDragOver(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.isDragging).toBe(true);

      component.onDragLeave(mockEvent);
      expect(component.isDragging).toBe(false);
    });

    it('ignores dragover when dataTransfer does not contain Files (e.g. accidental text drag)', () => {
      const textDragEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { types: ['text/plain'] },
      } as unknown as DragEvent;

      component.onDragOver(textDragEvent);
      expect(component.isDragging).toBe(false);

      const fileDragEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { types: ['Files'], dropEffect: 'none' },
      } as unknown as DragEvent;

      component.onDragOver(fileDragEvent);
      expect(component.isDragging).toBe(true);
    });

    it('keeps isDragging true on dragleave when moving into a child element of drop-zone', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);

      component.isDragging = true;
      component.onDragLeave({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        currentTarget: parent,
        relatedTarget: child,
      } as unknown as DragEvent);

      expect(component.isDragging).toBe(true);
    });
  });

  describe('File Dialog Selection Guards', () => {
    it('prevents double file dialog opening on rapid double-click or detail > 1', () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      const firstClick = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        detail: 1,
      } as unknown as MouseEvent;
      const secondClick = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        detail: 2,
      } as unknown as MouseEvent;

      component.triggerFileInput(firstClick);
      component.triggerFileInput(secondClick);
      component.triggerFileInput();

      expect(clickSpy).toHaveBeenCalledTimes(1);
      clickSpy.mockRestore();
    });

    it('blocks stray click immediately after file dialog selection closes', () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      component.handleFileSelect({ target: { files: [] } } as unknown as Event);
      component.triggerFileInput();

      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('blocks fallthrough clicks while native dialog is open (>800ms) and during 1000ms post-focus cooldown', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date(10000));
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

        // 1. User clicks #drop-zone at t = 10000ms
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 2. Native OS dialog opens and blurs window at t = 10050ms
        vi.setSystemTime(new Date(10050));
        window.dispatchEvent(new Event('blur'));

        // 3. User spends 4 seconds in Windows Open dialog (t = 14050ms, well past 800ms)
        // and double-clicks a PDF; stray click lands before focus/onchange arrives:
        vi.setSystemTime(new Date(14050));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 4. Window regains focus at t = 14060ms as dialog closes, followed by stray mouse release 700ms later:
        vi.setSystemTime(new Date(14060));
        window.dispatchEvent(new Event('focus'));

        vi.setSystemTime(new Date(14760));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 5. After 1000ms post-close cooldown expires (t = 15100ms), user can open dialog again:
        vi.setSystemTime(new Date(15100));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(2);

        clickSpy.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });

    it('blocks fallthrough clicks even when window never fires blur and across Preview Pane focus/blur bounces', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date(20000));
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

        // 1. User opens file dialog at t = 20000ms; suppose window does NOT fire blur
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(component.isFileDialogActive()).toBe(true);

        // 2. 5 seconds later (t = 25000ms), without any blur event, stray click lands on #drop-zone:
        vi.setSystemTime(new Date(25000));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 3. Windows Explorer Preview Pane bounces focus -> blur inside Open dialog at t = 25500ms..25600ms:
        vi.setSystemTime(new Date(25500));
        window.dispatchEvent(new Event('focus'));
        vi.setSystemTime(new Date(25600));
        window.dispatchEvent(new Event('blur'));
        expect(component.isFileDialogActive()).toBe(true);

        // 4. 3 seconds after the bounce (t = 28600ms), user selects PDF in Open dialog; fallthrough click is still blocked:
        vi.setSystemTime(new Date(28600));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 5. Dialog closes via handleFileSelect at t = 28650ms; cooldown blocks clicks for 1000ms:
        vi.setSystemTime(new Date(28650));
        component.handleFileSelect({ target: { files: [] } } as unknown as Event);
        vi.setSystemTime(new Date(29200));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 6. After 1000ms cooldown (t = 29700ms), user can open dialog again:
        vi.setSystemTime(new Date(29700));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(2);

        clickSpy.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });

    it('rejects onDragOver (dropEffect = none, isDragging = false) and onDrop while file dialog is open or cooling down', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date(30000));
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
        const processSpy = vi.spyOn(component, 'processFiles').mockResolvedValue();

        component.triggerFileInput();
        expect(component.isFileDialogActive()).toBe(true);

        // Accidental drag initiated by single-clicking a PDF inside Windows Open dialog:
        vi.setSystemTime(new Date(33000));
        const dragOverEvent = {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: { types: ['Files'], dropEffect: 'copy' },
        } as unknown as DragEvent;
        component.onDragOver(dragOverEvent);

        expect(component.isDragging).toBe(false);
        expect(dragOverEvent.dataTransfer?.dropEffect).toBe('none');

        const dropEvent = {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: {
            files: [new File(['%PDF-1.4'], 'CONSTANCIA DEL RNP.pdf', { type: 'application/pdf' })],
          },
        } as unknown as DragEvent;
        component.onDrop(dropEvent);
        expect(processSpy).not.toHaveBeenCalled();

        // After dialog closes via window:focus and 1000ms cooldown expires, user clicks Windows Explorer
        // (causing window:blur) and drags a PDF into #drop-zone; leaked listeners must NOT re-latch isFileDialogOpen:
        window.dispatchEvent(new Event('focus'));
        vi.setSystemTime(new Date(34500));
        window.dispatchEvent(new Event('blur'));
        expect(component.isFileDialogOpen).toBe(false);
        expect(component.isFileDialogActive()).toBe(false);

        const normalDragOver = {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: { types: ['Files'], dropEffect: 'none' },
        } as unknown as DragEvent;
        component.onDragOver(normalDragOver);
        expect(component.isDragging).toBe(true);
        expect(normalDragOver.dataTransfer?.dropEffect).toBe('copy');

        component.onDrop(dropEvent);
        expect(processSpy).toHaveBeenCalledTimes(1);

        // Refocusing the pdf-tool window by clicking #drop-zone (window:focus on mousedown, click 50ms later)
        // must NOT re-trigger close cooldown and must open the file dialog immediately:
        vi.setSystemTime(new Date(36000));
        window.dispatchEvent(new Event('focus'));
        vi.setSystemTime(new Date(36050));
        component.triggerFileInput();
        expect(clickSpy).toHaveBeenCalledTimes(2);

        processSpy.mockRestore();
        clickSpy.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });

    it('opens file dialog on the first click via mousedown + mouseup even when WebView2 focus transfer suppresses synthetic click, and deduplicates when click also fires', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date(40000));
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

        const mouseDown = {
          button: 0,
          detail: 1,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as MouseEvent;
        const mouseUp = {
          button: 0,
          detail: 1,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as MouseEvent;
        const clickEvent = {
          button: 0,
          detail: 1,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as MouseEvent;

        // 1. First click when window is activated (WM_SETFOCUS -> MoveFocus(PROGRAMMATIC) suppresses synthetic click):
        component.onUploadZoneMouseDown(mouseDown);
        component.onUploadZoneMouseUp(mouseUp);
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // Even if synthetic click also fires 2ms later, it is deduplicated:
        vi.setSystemTime(new Date(40002));
        component.triggerFileInput(clickEvent);
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // 2. Suppose dialog closes with a focus -> blur bounce at t = 42000..42100ms that leaves isFileDialogOpen = true,
        // and then the user performs a single click on #drop-zone at t = 42500ms (where window:focus fires on mousedown):
        vi.setSystemTime(new Date(42000));
        window.dispatchEvent(new Event('focus'));
        vi.setSystemTime(new Date(42100));
        window.dispatchEvent(new Event('blur'));
        expect(component.isFileDialogOpen).toBe(true);

        // Trailing fallthrough mouseup WITHOUT a preceding mousedown on #drop-zone is ignored:
        vi.setSystemTime(new Date(42200));
        component.onUploadZoneMouseUp(mouseUp);
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // Deliberate single click on #drop-zone (window:focus + mousedown + mouseup + click) opens on the 1st click:
        vi.setSystemTime(new Date(42500));
        window.dispatchEvent(new Event('focus'));
        component.onUploadZoneMouseDown(mouseDown);
        vi.setSystemTime(new Date(42540));
        component.onUploadZoneMouseUp(mouseUp);
        component.triggerFileInput(clickEvent);
        expect(clickSpy).toHaveBeenCalledTimes(2);

        // 3. Rapid dialog cancel (< 800ms after trigger) followed 250ms later by a single click on #drop-zone
        // must open on the 1st click without being blocked by stale lastFileDialogTriggerAt:
        vi.setSystemTime(new Date(42600));
        window.dispatchEvent(new Event('blur'));
        vi.setSystemTime(new Date(42750));
        window.dispatchEvent(new Event('focus'));
        expect(component.isFileDialogOpen).toBe(false);

        vi.setSystemTime(new Date(43000));
        component.onUploadZoneMouseDown(mouseDown);
        vi.setSystemTime(new Date(43030));
        component.onUploadZoneMouseUp(mouseUp);
        expect(clickSpy).toHaveBeenCalledTimes(3);

        // 4. Initial window-activation focus arriving < 300ms after trigger BEFORE window:blur
        // must NOT prematurely mark the dialog closed:
        vi.setSystemTime(new Date(43045));
        window.dispatchEvent(new Event('focus'));
        expect(component.isFileDialogOpen).toBe(true);

        // Double-click (detail > 1) while dialog is launching is ignored:
        component.onUploadZoneMouseDown({ button: 0, detail: 2 } as unknown as MouseEvent);
        component.onUploadZoneMouseUp({ button: 0, detail: 2 } as unknown as MouseEvent);
        expect(clickSpy).toHaveBeenCalledTimes(3);

        // 5. Right-click (button !== 0) or mouseleave before mouseup does not trigger file dialog:
        vi.setSystemTime(new Date(45000));
        component.handleFileSelect({ target: { files: [] } } as unknown as Event);
        vi.setSystemTime(new Date(46500));
        component.onUploadZoneMouseDown({ button: 2 } as unknown as MouseEvent);
        component.onUploadZoneMouseUp({ button: 2 } as unknown as MouseEvent);
        expect(clickSpy).toHaveBeenCalledTimes(3);

        component.onUploadZoneMouseDown(mouseDown);
        component.onUploadZoneMouseLeave();
        component.onUploadZoneMouseUp(mouseUp);
        expect(clickSpy).toHaveBeenCalledTimes(3);

        clickSpy.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Rendered Template Integration (FloatingInput + Close IconButton)', () => {
    it('renders <app-floating-input variant="floating"> alongside <app-icon-button variant="close-ghost" size="md"> and syncs on thumbnail togglePageActive', async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      app.uploadedFiles = [
        {
          id: 'file-1',
          fileObject: new File([], 'GUIA DE PAGOS BBVA (1).pdf', { type: 'application/pdf' }),
          name: 'GUIA DE PAGOS BBVA (1).pdf',
          size: '4.88 MB',
          pageCount: 4,
          pagesToKeep: '1-4',
          pages: [
            { id: 'p1', pageNum: 1, active: true },
            { id: 'p2', pageNum: 2, active: true },
            { id: 'p3', pageNum: 3, active: true },
            { id: 'p4', pageNum: 4, active: true },
          ],
        },
      ];
      app.globalPageOrder = ['p1', 'p2', 'p3', 'p4'];
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;

      // Left column panel uses compact padding="md" (.panel--padding-md)
      const leftPanel = hostEl.querySelector('.editor-column--left .panel');
      expect(leftPanel?.classList.contains('panel--padding-md')).toBe(true);

      // No raw <label class="page-select-label"> should exist
      expect(hostEl.querySelector('label.page-select-label')).toBeNull();

      // .page-select-container contains <app-floating-input> and <app-icon-button variant="close-ghost" size="md">
      const container = hostEl.querySelector('.page-select-container');
      expect(container).not.toBeNull();

      const floatingWrapper = container?.querySelector('.floating-input-wrapper.variant-floating');
      expect(floatingWrapper).not.toBeNull();
      expect(floatingWrapper?.classList.contains('has-value')).toBe(true);

      const floatingLabel = floatingWrapper?.querySelector('.floating-label');
      expect(floatingLabel?.textContent?.trim()).toBe('Hojas a incluir');

      const nativeInput = floatingWrapper?.querySelector('input.floating-input') as HTMLInputElement;
      expect(nativeInput).not.toBeNull();
      expect(nativeInput.value).toBe('1-4');

      const closeBtn = container?.querySelector('.file-actions button.icon-btn--close-ghost') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      expect(closeBtn.classList.contains('icon-btn--sm')).toBe(false);
      expect(closeBtn.classList.contains('icon-btn--lg')).toBe(false);

      // Double-clicking thumbnail 4 (togglePageActive) updates floating input value via syncView() without external detectChanges()
      app.togglePageActive('p4');
      await Promise.resolve();

      expect(nativeInput.value).toBe('1-3');
      expect(floatingWrapper?.classList.contains('has-value')).toBe(true);

      // Clicking the close (X) button next to the floating input removes the file item
      closeBtn.click();
      fixture.detectChanges();
      expect(app.uploadedFiles.length).toBe(0);
      expect(hostEl.querySelector('.file-item')).toBeNull();
    });

    it('renders <app-scroll-overlay> for the editor shell, file list, and thumbnail strip, and applies semantic colored button variants', async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      app.uploadedFiles = [
        {
          id: 'file-1',
          fileObject: new File([], 'reporte.pdf', { type: 'application/pdf' }),
          name: 'reporte.pdf',
          size: '1.25 MB',
          pageCount: 2,
          pagesToKeep: '1-2',
          pages: [
            { id: 'p1', pageNum: 1, active: true },
            { id: 'p2', pageNum: 2, active: true },
          ],
        },
      ];
      app.globalPageOrder = ['p1', 'p2'];
      app.selectedPageId = 'p1';
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;

      // 1. Verify all 4 ScrollOverlayComponent instances are mounted with .so-scroll-area and .so-variant-brand
      const shellScrollOverlay = hostEl.querySelector('app-scroll-overlay.editor-scroll-shell');
      const fileListScrollOverlay = hostEl.querySelector('app-scroll-overlay.file-list-scroll-overlay');
      const thumbnailScrollOverlay = hostEl.querySelector('app-scroll-overlay.thumbnail-scroll-overlay');
      const previewScrollOverlay = hostEl.querySelector('app-scroll-overlay.preview-stage-scroll-overlay');

      expect(shellScrollOverlay).not.toBeNull();
      expect(fileListScrollOverlay).not.toBeNull();
      expect(thumbnailScrollOverlay).not.toBeNull();
      expect(previewScrollOverlay).not.toBeNull();
      expect(shellScrollOverlay?.classList.contains('so-block')).toBe(true);
      expect(shellScrollOverlay?.classList.contains('so-variant-brand')).toBe(true);
      expect(fileListScrollOverlay?.classList.contains('so-block')).toBe(true);
      expect(fileListScrollOverlay?.classList.contains('so-variant-brand')).toBe(true);
      expect((fileListScrollOverlay as HTMLElement | null)?.style.getPropertyValue('--so-max-height')).toBe('210px');
      expect(thumbnailScrollOverlay?.classList.contains('so-block')).toBe(true);
      expect(thumbnailScrollOverlay?.classList.contains('so-variant-brand')).toBe(true);
      expect(previewScrollOverlay?.classList.contains('so-block')).toBe(true);
      expect(previewScrollOverlay?.classList.contains('so-variant-brand')).toBe(true);

      const panels = Array.from(hostEl.querySelectorAll('app-panel .panel'));
      expect(panels.length).toBe(2);
      for (const panel of panels) {
        expect(panel.classList.contains('panel--elevated')).toBe(true);
      }

      expect(shellScrollOverlay?.querySelector('.so-scroll-area .editor-layout')).not.toBeNull();
      expect(fileListScrollOverlay?.querySelector('.so-scroll-area .file-list')).not.toBeNull();
      expect(thumbnailScrollOverlay?.querySelector('.so-scroll-area .thumbnail-list')).not.toBeNull();

      // 2. Verify colored semantic button variants with gradient appearance
      const clearBtn = hostEl.querySelector('.file-list-header button.btn') as HTMLButtonElement;
      expect(clearBtn).not.toBeNull();
      expect(clearBtn.classList.contains('btn-danger')).toBe(true);
      expect(clearBtn.classList.contains('btn-gradient')).toBe(true);

      const mergeBtn = hostEl.querySelector('.merge-action-container button.btn') as HTMLButtonElement;
      expect(mergeBtn).not.toBeNull();
      expect(mergeBtn.classList.contains('btn-primary')).toBe(true);
      expect(mergeBtn.classList.contains('btn-gradient')).toBe(true);

      const previewActionButtons = Array.from(
        hostEl.querySelectorAll('.preview-actions button.btn')
      ) as HTMLButtonElement[];
      expect(previewActionButtons.length).toBe(3);

      // Active page -> 'Excluir hoja' uses btn-danger + btn-gradient; 'Subir' and 'Bajar' use btn-secondary + btn-gradient
      expect(previewActionButtons[0].classList.contains('btn-danger')).toBe(true);
      expect(previewActionButtons[0].classList.contains('btn-gradient')).toBe(true);
      expect(previewActionButtons[0].textContent?.trim()).toContain('Excluir hoja');
      expect(previewActionButtons[1].classList.contains('btn-secondary')).toBe(true);
      expect(previewActionButtons[1].classList.contains('btn-gradient')).toBe(true);
      expect(previewActionButtons[2].classList.contains('btn-secondary')).toBe(true);
      expect(previewActionButtons[2].classList.contains('btn-gradient')).toBe(true);

      // Exclude page -> button switches to 'Restaurar hoja' with btn-success + btn-gradient
      app.togglePageActive('p1');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const updatedToggleBtn = hostEl.querySelector('.preview-actions button.btn') as HTMLButtonElement;
      expect(updatedToggleBtn.classList.contains('btn-success')).toBe(true);
      expect(updatedToggleBtn.classList.contains('btn-gradient')).toBe(true);
      expect(updatedToggleBtn.textContent?.trim()).toContain('Restaurar hoja');
    });

    it('cancels in-flight preview render tasks on rapid window resize and isolates canvas contexts to prevent inverted/rotated pages', async () => {
      const cancelFirstRender = vi.fn();
      let resolveFirstRender!: () => void;
      const firstRenderPromise = new Promise<void>((resolve) => {
        resolveFirstRender = resolve;
      });

      const cancelThirdRender = vi.fn();
      let resolveThirdRender!: () => void;
      const thirdRenderPromise = new Promise<void>((resolve) => {
        resolveThirdRender = resolve;
      });

      const renderedContexts: CanvasRenderingContext2D[] = [];
      let renderCallCount = 0;

      const mockPage = {
        getViewport: vi.fn(({ scale }: { scale: number }) => ({
          width: 600 * scale,
          height: 800 * scale,
          rotation: 0,
        })),
        render: vi.fn(({ canvasContext }: { canvasContext: CanvasRenderingContext2D }) => {
          renderCallCount++;
          renderedContexts.push(canvasContext);
          if (renderCallCount === 1) {
            return {
              cancel: cancelFirstRender,
              promise: firstRenderPromise,
            };
          }
          if (renderCallCount === 3) {
            return {
              cancel: cancelThirdRender,
              promise: thirdRenderPromise,
            };
          }
          return {
            cancel: vi.fn(),
            promise: Promise.resolve(),
          };
        }),
      };

      const mockPdfDoc = {
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      (globalThis as Record<string, unknown>)['pdfjsLib'] = {
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: vi.fn(() => ({ promise: Promise.resolve(mockPdfDoc) })),
      };

      const mock2dContext = () =>
        ({
          setTransform: vi.fn(),
          clearRect: vi.fn(),
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D;

      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockImplementation(() => mock2dContext());

      try {
        component.uploadedFiles = [
          {
            id: 'f1',
            fileObject: new File([], 'contrato.pdf', { type: 'application/pdf' }),
            name: 'contrato.pdf',
            size: '845 KB',
            pageCount: 3,
            pagesToKeep: '1-3',
            pages: [
              { id: 'f1-p1', pageNum: 1, active: true },
              { id: 'f1-p2', pageNum: 2, active: true },
              { id: 'f1-p3', pageNum: 3, active: true },
            ],
          },
        ];
        component.globalPageOrder = ['f1-p1', 'f1-p2', 'f1-p3'];
        component.selectedPageId = 'f1-p1';

        const previewCanvasEl = document.createElement('canvas');
        const previewStageEl = document.createElement('div');
        Object.defineProperty(previewStageEl, 'clientWidth', { value: 640, configurable: true });
        Object.defineProperty(previewStageEl, 'clientHeight', { value: 720, configurable: true });

        component.previewCanvas = { nativeElement: previewCanvasEl } as ElementRef<HTMLCanvasElement>;
        component.previewStage = { nativeElement: previewStageEl } as ElementRef<HTMLDivElement>;

        // Trigger first render (e.g., initial width) and wait until pdf.js page.render is in-flight
        const firstTask = component.renderSelectedPage();
        await vi.waitFor(() => {
          expect(mockPage.render).toHaveBeenCalledTimes(1);
        });

        Object.defineProperty(previewStageEl, 'clientWidth', { value: 920, configurable: true });
        const secondTask = component.onResize();

        expect(cancelFirstRender).toHaveBeenCalledTimes(1);

        resolveFirstRender();
        await Promise.all([firstTask, secondTask]);

        expect(renderedContexts.length).toBe(2);
        // Each render call receives its own isolated offscreen CanvasRenderingContext2D
        expect(renderedContexts[0]).not.toBe(renderedContexts[1]);

        // Removing the last file while another resize render is in-flight also cancels activePreviewRenderTask
        const thirdTask = component.onResize();
        await vi.waitFor(() => {
          expect(mockPage.render).toHaveBeenCalledTimes(3);
        });
        component.removeItem('f1');
        expect(cancelThirdRender).toHaveBeenCalledTimes(1);
        resolveThirdRender();
        await thirdTask;
      } finally {
        getContextSpy.mockRestore();
      }
    });

    it('controls preview zoom within [0.5, 3.0] boundaries and scales canvas rendering accordingly', async () => {
      const viewportScales: number[] = [];
      const mockPage = {
        getViewport: vi.fn(({ scale, rotation }: { scale: number; rotation?: number }) => {
          viewportScales.push(scale);
          return {
            width: 500 * scale,
            height: 700 * scale,
            rotation: rotation ?? 0,
          };
        }),
        render: vi.fn(() => ({
          cancel: vi.fn(),
          promise: Promise.resolve(),
        })),
      };

      (globalThis as Record<string, unknown>)['pdfjsLib'] = {
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: vi.fn(() => ({
          promise: Promise.resolve({
            getPage: vi.fn().mockResolvedValue(mockPage),
          }),
        })),
      };

      const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () =>
          ({
            setTransform: vi.fn(),
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          }) as unknown as CanvasRenderingContext2D
      );

      try {
        component.uploadedFiles = [
          {
            id: 'f1',
            fileObject: new File([], 'zoom-doc.pdf', { type: 'application/pdf' }),
            name: 'zoom-doc.pdf',
            size: '300 KB',
            pageCount: 1,
            pagesToKeep: '1',
            pages: [{ id: 'f1-p1', pageNum: 1, active: true, rotation: 0 }],
          },
        ];
        component.globalPageOrder = ['f1-p1'];
        component.selectedPageId = 'f1-p1';

        const previewCanvasEl = document.createElement('canvas');
        const previewStageEl = document.createElement('div');
        Object.defineProperty(previewStageEl, 'clientWidth', { value: 600, configurable: true });
        Object.defineProperty(previewStageEl, 'clientHeight', { value: 800, configurable: true });

        component.previewCanvas = { nativeElement: previewCanvasEl } as ElementRef<HTMLCanvasElement>;
        component.previewStage = { nativeElement: previewStageEl } as ElementRef<HTMLDivElement>;

        expect(component.previewZoom).toBe(1);
        expect(component.getPreviewZoomPercent()).toBe(100);

        await component.renderSelectedPage();
        const baseCanvasWidth = previewCanvasEl.width;
        expect(baseCanvasWidth).toBeGreaterThan(300);

        component.zoomInPreview();
        expect(component.previewZoom).toBe(1.25);
        expect(component.getPreviewZoomPercent()).toBe(125);
        await vi.waitFor(() => {
          expect(previewCanvasEl.width).toBeGreaterThan(baseCanvasWidth);
        });

        // Clamp upper bound at 3.0 (300%)
        component.setPreviewZoom(9.5);
        expect(component.previewZoom).toBe(3);
        expect(component.getPreviewZoomPercent()).toBe(300);

        // Clamp lower bound at 0.5 (50%)
        component.setPreviewZoom(0.1);
        expect(component.previewZoom).toBe(0.5);
        expect(component.getPreviewZoomPercent()).toBe(50);

        component.zoomOutPreview();
        expect(component.previewZoom).toBe(0.5);

        component.resetPreviewZoom();
        expect(component.previewZoom).toBe(1);
        expect(component.getPreviewZoomPercent()).toBe(100);

        // Plain wheel event without ctrlKey/metaKey is ignored by onPreviewWheel
        const plainWheel = {
          ctrlKey: false,
          metaKey: false,
          deltaY: -100,
          preventDefault: vi.fn(),
        } as unknown as WheelEvent;
        component.onPreviewWheel(plainWheel);
        expect(plainWheel.preventDefault).not.toHaveBeenCalled();
        expect(component.previewZoom).toBe(1);

        // Ctrl + wheel zooms in (deltaY < 0) and out (deltaY > 0)
        const ctrlWheelIn = {
          ctrlKey: true,
          metaKey: false,
          deltaY: -100,
          preventDefault: vi.fn(),
        } as unknown as WheelEvent;
        component.onPreviewWheel(ctrlWheelIn);
        expect(ctrlWheelIn.preventDefault).toHaveBeenCalledTimes(1);
        expect(component.previewZoom).toBe(1.25);

        const ctrlWheelOut = {
          ctrlKey: true,
          metaKey: false,
          deltaY: 100,
          preventDefault: vi.fn(),
        } as unknown as WheelEvent;
        component.onPreviewWheel(ctrlWheelOut);
        expect(ctrlWheelOut.preventDefault).toHaveBeenCalledTimes(1);
        expect(component.previewZoom).toBe(1);
      } finally {
        getContextSpy.mockRestore();
      }
    });

    it('rotates pages clockwise and counter-clockwise, combines intrinsic page.rotate with user rotation, and guards thumbnail cache against stale concurrent renders', async () => {
      const viewportRotations: number[] = [];
      let intrinsicRotate = 0;
      const mockPage: Record<string, unknown> = {
        getViewport: vi.fn(({ scale, rotation }: { scale: number; rotation?: number }) => {
          const r = rotation ?? 0;
          viewportRotations.push(r);
          const swapped = r === 90 || r === 270;
          return {
            width: (swapped ? 800 : 600) * scale,
            height: (swapped ? 600 : 800) * scale,
            rotation: r,
          };
        }),
        render: vi.fn(() => ({
          cancel: vi.fn(),
          promise: Promise.resolve(),
        })),
      };
      Object.defineProperty(mockPage, 'rotate', {
        get: () => intrinsicRotate,
      });

      (globalThis as Record<string, unknown>)['pdfjsLib'] = {
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: vi.fn(() => ({
          promise: Promise.resolve({
            getPage: vi.fn().mockResolvedValue(mockPage),
          }),
        })),
      };

      const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () =>
          ({
            setTransform: vi.fn(),
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          }) as unknown as CanvasRenderingContext2D
      );
      const toDataURLSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
        .mockReturnValue('data:image/jpeg;base64,ROTATED_THUMB');

      try {
        expect(component.normalizeRotationAngle(0)).toBe(0);
        expect(component.normalizeRotationAngle(90)).toBe(90);
        expect(component.normalizeRotationAngle(180)).toBe(180);
        expect(component.normalizeRotationAngle(270)).toBe(270);
        expect(component.normalizeRotationAngle(360)).toBe(0);
        expect(component.normalizeRotationAngle(-90)).toBe(270);
        expect(component.normalizeRotationAngle(450)).toBe(90);

        const pageObj = { id: 'f1-p1', pageNum: 1, active: true, rotation: 0 };
        component.uploadedFiles = [
          {
            id: 'f1',
            fileObject: new File([], 'rotacion.pdf', { type: 'application/pdf' }),
            name: 'rotacion.pdf',
            size: '420 KB',
            pageCount: 1,
            pagesToKeep: '1',
            pages: [pageObj],
          },
        ];
        component.globalPageOrder = ['f1-p1'];
        component.selectedPageId = 'f1-p1';

        const previewCanvasEl = document.createElement('canvas');
        const previewStageEl = document.createElement('div');
        Object.defineProperty(previewStageEl, 'clientWidth', { value: 640, configurable: true });
        Object.defineProperty(previewStageEl, 'clientHeight', { value: 720, configurable: true });

        component.previewCanvas = { nativeElement: previewCanvasEl } as ElementRef<HTMLCanvasElement>;
        component.previewStage = { nativeElement: previewStageEl } as ElementRef<HTMLDivElement>;

        await component.rotateSelectedPage(90);
        expect(pageObj.rotation).toBe(90);
        expect(component.getPageRotation('f1-p1')).toBe(90);

        await vi.waitFor(() => {
          expect(viewportRotations).toContain(90);
          expect(
            component.getThumbnailSrc({ file: component.uploadedFiles[0], page: pageObj })
          ).toBe('data:image/jpeg;base64,ROTATED_THUMB');
        });

        // Intrinsic PDF rotation (page.rotate = 90) + user rotation (90) -> 180 total viewport rotation
        intrinsicRotate = 90;
        viewportRotations.length = 0;
        await component.renderSelectedPage();
        expect(viewportRotations).toContain(180);
        intrinsicRotate = 0;

        await component.rotateSelectedPage(180);
        expect(pageObj.rotation).toBe(270);

        await component.rotateSelectedPage(90);
        expect(pageObj.rotation).toBe(0);

        await component.rotateSelectedPage(-90);
        expect(pageObj.rotation).toBe(270);
      } finally {
        getContextSpy.mockRestore();
        toDataURLSpy.mockRestore();
      }
    });

    it('resolves custom and default output filenames, auto-populates outputFileName on processFiles, and applies page rotations when exporting PDF via PDFLib', async () => {
      const setRotationCalls: Array<{ pageIndex: number; angle: unknown }> = [];
      let savedDownloadName = '';
      let downloadClicked = false;

      const createMockCopiedPage = (pageIndex: number, baseAngle = 0) => ({
        getRotation: () => ({ angle: baseAngle }),
        setRotation: (degObj: unknown) => {
          setRotationCalls.push({ pageIndex, angle: degObj });
        },
      });

      const mockTargetPdf = {
        copyPages: vi.fn(async (_srcDoc: unknown, indices: number[]) =>
          indices.map((idx) => createMockCopiedPage(idx, idx === 1 ? 90 : 0))
        ),
        addPage: vi.fn(),
        save: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
      };

      const mockSourcePdf = {
        getPageCount: vi.fn(() => 2),
      };

      (globalThis as Record<string, unknown>)['PDFLib'] = {
        PDFDocument: {
          create: vi.fn().mockResolvedValue(mockTargetPdf),
          load: vi.fn().mockResolvedValue(mockSourcePdf),
        },
        degrees: vi.fn((angle: number) => ({ type: 'degrees', angle })),
      };

      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          Object.defineProperty(el, 'click', {
            value: () => {
              savedDownloadName = (el as HTMLAnchorElement).download;
              downloadClicked = true;
            },
          });
        }
        return el;
      });

      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-url');
      URL.revokeObjectURL = vi.fn();

      try {
        const mockFileObject = {
          name: 'informe_mensual.pdf',
          size: 524288,
          type: 'application/pdf',
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        } as unknown as File;

        await component.processFiles([mockFileObject] as unknown as FileList);

        // processFiles auto-populates outputFileName with the default output name
        expect(component.outputFileName).toBe('informe_mensual_editado.pdf');
        expect(component.getDefaultOutputFileName()).toBe('informe_mensual_editado.pdf');
        expect(component.resolveOutputFileName()).toBe('informe_mensual_editado.pdf');

        component.uploadedFiles[0].pages[0].rotation = 90;
        component.uploadedFiles[0].pages[1].rotation = 180;

        // Custom filename without .pdf extension and with invalid characters
        component.updateOutputFileName('  expediente: final / 2026  ');
        expect(component.resolveOutputFileName()).toBe('expediente_ final _ 2026.pdf');

        // Custom filename with invalid characters before .pdf or only dots falls back to default
        component.updateOutputFileName('???.pdf');
        expect(component.resolveOutputFileName()).toBe('informe_mensual_editado.pdf');
        component.updateOutputFileName('....pdf');
        expect(component.resolveOutputFileName()).toBe('informe_mensual_editado.pdf');
        component.updateOutputFileName('reporte...pdf');
        expect(component.resolveOutputFileName()).toBe('reporte.pdf');

        // Custom filename that already ends with .pdf
        component.updateOutputFileName('resultado_firmado.pdf');
        expect(component.resolveOutputFileName()).toBe('resultado_firmado.pdf');

        await component.mergeSelectedPDFs();

        expect(downloadClicked).toBe(true);
        expect(savedDownloadName).toBe('resultado_firmado.pdf');
        expect(setRotationCalls.length).toBe(2);
        // Page 1 had baseAngle 0 + rotation 90 -> 90 degrees
        expect(setRotationCalls[0]).toEqual({
          pageIndex: 0,
          angle: { type: 'degrees', angle: 90 },
        });
        // Page 2 had baseAngle 90 + rotation 180 -> 270 degrees
        expect(setRotationCalls[1]).toEqual({
          pageIndex: 1,
          angle: { type: 'degrees', angle: 270 },
        });

        // Removing the last file resets previewZoom back to 1
        component.setPreviewZoom(2.5);
        expect(component.previewZoom).toBe(2.5);
        component.removeItem(component.uploadedFiles[0].id);
        expect(component.uploadedFiles.length).toBe(0);
        expect(component.previewZoom).toBe(1);
      } finally {
        createElementSpy.mockRestore();
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
      }
    });

    it('renders preview toolbar zoom/rotation controls and output filename control in the DOM, preserves two-axis scroll across 200%->300% zoom and window resize on a landscape-rotated page, and resets on 100%', async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      app.uploadedFiles = [
        {
          id: 'file-1',
          fileObject: new File([], 'acta.pdf', { type: 'application/pdf' }),
          name: 'acta.pdf',
          size: '320 KB',
          pageCount: 1,
          pagesToKeep: '1',
          pages: [{ id: 'p1', pageNum: 1, active: true, rotation: 0 }],
        },
      ];
      app.globalPageOrder = ['p1'];
      app.selectedPageId = 'p1';
      app.outputFileName = 'acta_editado.pdf';
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;

      const outputInput = hostEl.querySelector(
        '.output-filename-container input.floating-input'
      ) as HTMLInputElement;
      expect(outputInput).not.toBeNull();
      expect(outputInput.value).toBe('acta_editado.pdf');

      const zoomInBtn = hostEl.querySelector('.zoom-in-btn button') as HTMLButtonElement;
      const zoomOutBtn = hostEl.querySelector('.zoom-out-btn button') as HTMLButtonElement;
      const zoomResetBtn = hostEl.querySelector('.zoom-reset-btn button') as HTMLButtonElement;
      const zoomBadge = hostEl.querySelector('.preview-zoom-badge') as HTMLElement;
      const canvasWrap = hostEl.querySelector('.preview-stage-canvas-wrap') as HTMLElement;
      const previewScrollArea = hostEl.querySelector(
        'app-scroll-overlay.preview-stage-scroll-overlay > .so-scroll-area'
      ) as HTMLElement;

      expect(zoomInBtn).not.toBeNull();
      expect(zoomOutBtn).not.toBeNull();
      expect(zoomResetBtn).not.toBeNull();
      expect(zoomResetBtn.disabled).toBe(true);
      expect(zoomBadge?.textContent?.trim()).toBe('100%');
      expect(canvasWrap?.classList.contains('preview-stage-canvas-wrap--zoomed')).toBe(false);

      zoomInBtn.click();
      fixture.detectChanges();
      expect(app.previewZoom).toBe(1.25);
      expect(zoomBadge?.textContent?.trim()).toBe('125%');
      expect(zoomResetBtn.disabled).toBe(false);
      expect(canvasWrap?.classList.contains('preview-stage-canvas-wrap--zoomed')).toBe(true);

      // Simulate scrolling both axes while zoomed at 200%, then zooming to 300% and resizing
      app.setPreviewZoom(2);
      fixture.detectChanges();
      previewScrollArea.scrollLeft = 180;
      previewScrollArea.scrollTop = 240;

      app.setPreviewZoom(3);
      fixture.detectChanges();
      expect(app.previewZoom).toBe(3);
      expect(zoomBadge?.textContent?.trim()).toBe('300%');
      expect(previewScrollArea.scrollLeft).toBe(180);
      expect(previewScrollArea.scrollTop).toBe(240);

      app.onResize();
      fixture.detectChanges();
      expect(previewScrollArea.scrollLeft).toBe(180);
      expect(previewScrollArea.scrollTop).toBe(240);

      // Resetting zoom to 100% resets scrollLeft and scrollTop to 0 and removes zoomed wrapper class
      zoomResetBtn.click();
      fixture.detectChanges();
      expect(app.previewZoom).toBe(1);
      expect(zoomBadge?.textContent?.trim()).toBe('100%');
      expect(canvasWrap?.classList.contains('preview-stage-canvas-wrap--zoomed')).toBe(false);
      expect(previewScrollArea.scrollLeft).toBe(0);
      expect(previewScrollArea.scrollTop).toBe(0);

      const rotateRightBtn = hostEl.querySelector('.rotate-right-btn button') as HTMLButtonElement;
      const rotateLeftBtn = hostEl.querySelector('.rotate-left-btn button') as HTMLButtonElement;
      expect(rotateRightBtn).not.toBeNull();
      expect(rotateLeftBtn).not.toBeNull();

      rotateRightBtn.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(app.uploadedFiles[0].pages[0].rotation).toBe(90);
      expect(hostEl.querySelector('.preview-rotation-pill')?.textContent?.trim()).toContain('90°');
      expect(hostEl.querySelector('.thumbnail-rotation-tag')?.textContent?.trim()).toContain('90°');
    });

    it('obtiene el estado del sistema cuando opera en modo escritorio nativo', async () => {
      const mockDesktopFacade = {
        estaEnModoEscritorio: vi.fn().mockReturnValue(true),
        obtenerEstadoSistema: vi.fn().mockResolvedValue({
          versionContrato: 'hra.desktop.respuesta-sistema.v1',
          identificadorSolicitud: 'req-desktop-1',
          correcto: true,
          datos: {
            nombreAplicacion: 'union-pdf',
            version: '0.5.1',
            entorno: 'desarrollo',
            plataforma: 'windows',
            runtime: 'tauri-v1.5',
          },
          error: null,
          metadatos: { duracionMs: 1, etapaOperacion: 'completado' },
        }),
      } as any;

      const app = new AppComponent(mockCdr, mockDesktopFacade);
      app.ngOnInit();
      await Promise.resolve();

      expect(mockDesktopFacade.estaEnModoEscritorio).toHaveBeenCalled();
      expect(mockDesktopFacade.obtenerEstadoSistema).toHaveBeenCalled();
      expect(app.estadoSistema?.runtime).toBe('tauri-v1.5');
      expect(app.estadoSistema?.version).toBe('0.5.1');
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('no consulta el backend nativo si no esta en modo escritorio', () => {
      const mockDesktopFacade = {
        estaEnModoEscritorio: vi.fn().mockReturnValue(false),
        obtenerEstadoSistema: vi.fn(),
      } as any;

      const app = new AppComponent(mockCdr, mockDesktopFacade);
      app.ngOnInit();

      expect(mockDesktopFacade.estaEnModoEscritorio).toHaveBeenCalled();
      expect(mockDesktopFacade.obtenerEstadoSistema).not.toHaveBeenCalled();
      expect(app.estadoSistema).toBeNull();
    });

    it('abre el dialogo Acerca de desde el boton del encabezado, muestra autoria, GitHub, co-ingenieria IA y creditos, y cierra limpiamente', async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;
      expect(app.isAboutDialogOpen).toBe(false);
      expect(hostEl.querySelector('app-about-dialog [role="dialog"]')).toBeNull();

      // Pantalla principal minimalista: sin pildoras ni subtitulos redundantes que duplican "Acerca de"
      expect(hostEl.querySelector('.brand-title')?.textContent?.trim()).toBe('Unión PDF');
      expect(hostEl.querySelector('.badge-brand-chip')).toBeNull();
      expect(hostEl.querySelector('.brand-subtitle')).toBeNull();
      expect(hostEl.querySelector('.header-pill')).toBeNull();
      expect(hostEl.querySelector('.upload-badge-hint')).toBeNull();
      expect(hostEl.querySelector('.empty-state-glow')).toBeNull();
      expect(hostEl.querySelector('.empty-state-features')).toBeNull();
      expect(hostEl.querySelector('.feature-chip')).toBeNull();
      expect(hostEl.querySelector('.empty-state-title')?.textContent?.trim()).toBe('Visor de hojas');

      const headerButtons = Array.from(
        hostEl.querySelectorAll('.header-meta-actions app-button button')
      ) as HTMLButtonElement[];
      expect(headerButtons.length).toBe(1);
      const aboutBtn = headerButtons.find((btn) =>
        (btn.textContent || '').includes('Acerca de')
      );
      expect(aboutBtn).toBeDefined();

      aboutBtn!.click();
      fixture.detectChanges();

      expect(app.isAboutDialogOpen).toBe(true);
      const dialogEl = hostEl.querySelector('app-about-dialog [role="dialog"]') as HTMLElement | null;
      expect(dialogEl).not.toBeNull();

      const dialogText = dialogEl?.textContent || '';
      expect(dialogText).toContain('Unión PDF');
      expect(dialogText).toContain('Ing. Havel CONTRERAS TAPAHUASCO');
      expect(dialogText).toContain('@archware');
      expect(dialogText).toContain('COTAHA');
      expect(dialogText).toContain('DIY AI Lab');
      expect(dialogText).toContain('Creador de Ecosistemas');
      expect(dialogText).toContain('Desarrollado en co-ingeniería con IA Agéntica');
      expect(dialogText).toContain('Autoría Principal');
      expect(dialogText).toContain('Marca Personal');
      expect(dialogText).toContain('Artifact Mangosta');
      expect(dialogText).toContain('Artifact Mangosta — DDD, Arquitectura Hexagonal & CQRS Estricto');
      expect(dialogText).toContain('Artifact Barracuda');
      expect(dialogText).toContain('Artifact Barracuda — Chasis Frontend Reactivo con Signals');
      expect(dialogText).toContain('DIY AI Lab & Co-Ingeniería IA');
      expect(dialogText).toContain('Arquitectura y Seguridad');
      expect(dialogText).toContain('Sistema de Diseño');
      expect(dialogText).toContain('Tauri 1.5 + Rust');
      expect(dialogText).toContain('Angular 22 + Signals');
      expect(dialogText).toContain('Atomic UI v5.22.0');
      expect(dialogText).toContain('LinkedIn — Ing. Havel Contreras');
      expect(dialogText).toContain('Repositorio Atomic UI');
      expect(dialogText).toContain('Contacto (havel363@gmail.com)');
      expect(dialogText).toContain('© 2026 Ing. Havel CONTRERAS TAPAHUASCO (COTAHA · @archware)');

      const githubLink = dialogEl?.querySelector('a.about-github-pill') as HTMLAnchorElement | null;
      expect(githubLink?.getAttribute('href')).toBe('https://github.com/archware');
      expect(githubLink?.getAttribute('target')).toBe('_blank');
      expect(githubLink?.getAttribute('rel')).toBe('noopener noreferrer');

      const repoLink = Array.from(
        dialogEl?.querySelectorAll<HTMLAnchorElement>('a.about-link-pill') || []
      ).find((link) => (link.textContent || '').includes('Repositorio Atomic UI'));
      expect(repoLink).toBeDefined();
      expect(repoLink?.getAttribute('href')).toBe('https://github.com/archware/-Atomic-UI');
      expect(repoLink?.getAttribute('target')).toBe('_blank');
      expect(repoLink?.getAttribute('rel')).toBe('noopener noreferrer');

      // Refleja version y runtime dinamicos desde estadoSistema cuando existe, sin reintroducir pildoras en .editor-header
      app.estadoSistema = {
        nombreAplicacion: 'union-pdf',
        version: '0.5.1',
        entorno: 'produccion',
        plataforma: 'windows',
        runtime: 'tauri-v1.5',
      };
      // Igual que en produccion (app.component.ts tras obtenerEstadoSistema): el estado se asigna y se marca para chequeo
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      expect(dialogEl?.textContent || '').toContain('v0.5.1');
      expect(dialogEl?.textContent || '').toContain('tauri-v1.5');
      expect(hostEl.querySelector('.header-pill')).toBeNull();
      expect(hostEl.querySelector('.header-pill--desktop')).toBeNull();
      expect(hostEl.querySelector('.editor-header')?.textContent || '').not.toContain('tauri-v1.5');

      // Cierre limpio del dialogo
      app.closeAboutDialog();
      fixture.detectChanges();

      expect(app.isAboutDialogOpen).toBe(false);
      expect(hostEl.querySelector('app-about-dialog [role="dialog"]')).toBeNull();
    });

    it('preserves normal mousedown focus on #drop-zone, toggles upload-zone--dialog-open while file dialog is open, and resets isDragging on dragend', async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;
      const dropZone = hostEl.querySelector('#drop-zone') as HTMLElement;
      expect(dropZone).not.toBeNull();
      expect(dropZone.getAttribute('draggable')).toBe('false');

      // Mousedown must NOT be canceled via preventDefault so WebView2 window focus lifecycle works
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      dropZone.dispatchEvent(mouseDownEvent);
      expect(mouseDownEvent.defaultPrevented).toBe(false);

      // Dragover sets isDragging and .dragover; dragend resets both
      dropZone.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(app.isDragging).toBe(true);
      expect(dropZone.classList.contains('dragover')).toBe(true);

      dropZone.dispatchEvent(new Event('dragend', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(app.isDragging).toBe(false);
      expect(dropZone.classList.contains('dragover')).toBe(false);

      // Clicking #drop-zone activates upload-zone--dialog-open immediately
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      dropZone.click();
      fixture.detectChanges();

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(dropZone.classList.contains('upload-zone--dialog-open')).toBe(true);

      // Closing the dialog (via handleFileSelect or window:focus) immediately removes upload-zone--dialog-open
      app.handleFileSelect({ target: { files: [] } } as unknown as Event);
      fixture.detectChanges();
      expect(dropZone.classList.contains('upload-zone--dialog-open')).toBe(false);

      clickSpy.mockRestore();
    });

    it('detects compatible PDF and image files, infers MIME types for extension-only drops, and detects non-standard JPEG EXIF orientation', () => {
      expect(component.isPdfFile(new File([], 'contrato.pdf', { type: 'application/pdf' }))).toBe(true);
      expect(component.isPdfFile(new File([], 'CONTRATO.PDF', { type: '' }))).toBe(true);
      expect(component.isPdfFile(new File([], 'foto.png', { type: 'image/png' }))).toBe(false);

      const extensions = [
        'png',
        'jpg',
        'jpeg',
        'jfif',
        'pjpeg',
        'pjp',
        'webp',
        'gif',
        'bmp',
        'dib',
        'svg',
        'avif',
        'ico',
        'tif',
        'tiff',
      ];
      for (const ext of extensions) {
        const fileWithEmptyMime = new File([], `captura.${ext.toUpperCase()}`, { type: '' });
        expect(component.isImageFile(fileWithEmptyMime)).toBe(true);
      }
      expect(component.isImageFile(new File([], 'sin_extension', { type: 'image/webp' }))).toBe(true);
      expect(component.isImageFile(new File([], 'notas.txt', { type: 'text/plain' }))).toBe(false);

      expect(component.inferImageMimeType(new File([], 'icono.svg', { type: '' }))).toBe('image/svg+xml');
      expect(component.inferImageMimeType(new File([], 'foto.webp', { type: '' }))).toBe('image/webp');
      expect(component.inferImageMimeType(new File([], 'foto.jpg', { type: '' }))).toBe('image/jpeg');
      expect(component.inferImageMimeType(new File([], 'foto.pjpeg', { type: '' }))).toBe('image/jpeg');
      expect(component.inferImageMimeType(new File([], 'plano.tiff', { type: '' }))).toBe('image/tiff');
      expect(component.inferImageMimeType(new File([], 'foto.png', { type: '' }))).toBe('image/png');

      // Construct minimal JPEG with APP1 EXIF header (little-endian 'II', Orientation tag 0x0112 = 6)
      const exifJpgOrientation6 = new Uint8Array([
        0xff, 0xd8, // SOI
        0xff, 0xe1, 0x00, 0x1e, // APP1 marker + length (30 bytes)
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
        0x49, 0x49, // Little-endian "II"
        0x2a, 0x00, // TIFF magic 42
        0x08, 0x00, 0x00, 0x00, // IFD0 offset = 8
        0x01, 0x00, // 1 directory entry
        0x12, 0x01, // Tag 0x0112 (Orientation)
        0x03, 0x00, // Type SHORT
        0x01, 0x00, 0x00, 0x00, // Count 1
        0x06, 0x00, 0x00, 0x00, // Value = 6 (90° CW)
      ]);
      expect(component.hasNonStandardExifOrientation(exifJpgOrientation6.buffer)).toBe(true);

      // JPEG with an XMP APP1 segment (0xFFE1) and 0xFF fill bytes BEFORE the Exif APP1 segment
      const xmpThenExifJpg = new Uint8Array([
        0xff, 0xd8, // SOI
        0xff, 0xff, 0xe1, 0x00, 0x0a, // 0xFF fill + non-Exif APP1 (XMP stub, length 10)
        0x58, 0x4d, 0x50, 0x00, 0x00, 0x00, 0x00, 0x00,
        ...exifJpgOrientation6.slice(2),
      ]);
      expect(component.hasNonStandardExifOrientation(xmpThenExifJpg.buffer)).toBe(true);

      // Orientation = 1 (normal) should return false
      const exifJpgOrientation1 = new Uint8Array(exifJpgOrientation6);
      exifJpgOrientation1[30] = 0x01;
      expect(component.hasNonStandardExifOrientation(exifJpgOrientation1.buffer)).toBe(false);

      // SVG viewBox intrinsic dimension parsing and vector/high-MP rasterization scaling bounds
      expect(
        component.resolveSvgIntrinsicDimensions('<svg viewBox="0 0 800 400"><rect/></svg>')
      ).toEqual({ width: 800, height: 400 });
      expect(
        component.resolveSvgIntrinsicDimensions('<svg width="24px" height="24px" viewBox="0 0 24 24"></svg>')
      ).toEqual({ width: 24, height: 24 });
      expect(component.normalizeRasterDimensions(800, 400, true)).toEqual({
        width: 1600,
        height: 800,
      });
      expect(component.normalizeRasterDimensions(12000, 9000, false)).toEqual({
        width: 4096,
        height: 3072,
      });
    });

    it('converts dragged/selected images (PNG, JPEG, WebP/SVG via canvas fallback) into portrait or landscape A4 PDF pages and merges them with PDFs', async () => {
      const addedPageSizes: Array<[number, number] | undefined> = [];
      const drawImageCalls: Array<{ x: number; y: number; width: number; height: number }> = [];
      const mergedPagesAdded: unknown[] = [];

      const createConversionPdfMock = (imgDims: { width: number; height: number }) => ({
        embedPng: vi.fn().mockResolvedValue(imgDims),
        embedJpg: vi.fn().mockResolvedValue(imgDims),
        addPage: vi.fn((size?: [number, number]) => {
          addedPageSizes.push(size);
          return {
            drawImage: vi.fn((_img: unknown, opts: { x: number; y: number; width: number; height: number }) => {
              drawImageCalls.push(opts);
            }),
          };
        }),
        save: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])),
      });

      let createCallIndex = 0;
      const conversionMocks = [
        createConversionPdfMock({ width: 600, height: 1000 }), // Portrait PNG -> Portrait A4
        createConversionPdfMock({ width: 1600, height: 900 }), // Landscape JPG -> Landscape A4
        createConversionPdfMock({ width: 800, height: 800 }), // WebP via canvas fallback -> Portrait A4
      ];

      const mockFinalMergedPdf = {
        copyPages: vi.fn(async (_src: unknown, indices: number[]) =>
          indices.map((i) => ({
            copiedFromIndex: i,
            getRotation: () => ({ angle: 0 }),
            setRotation: vi.fn(),
          }))
        ),
        addPage: vi.fn((page: unknown) => {
          mergedPagesAdded.push(page);
        }),
        save: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
      };

      (globalThis as Record<string, unknown>)['PDFLib'] = {
        PDFDocument: {
          create: vi.fn(async () => {
            if (createCallIndex < conversionMocks.length) {
              return conversionMocks[createCallIndex++];
            }
            return mockFinalMergedPdf;
          }),
          load: vi.fn().mockResolvedValue({
            getPageCount: vi.fn(() => 2),
          }),
        },
        degrees: vi.fn((angle: number) => ({ type: 'degrees', angle })),
      };

      const rasterizeSpy = vi
        .spyOn(component, 'rasterizeImageFileToPng')
        .mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer);

      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:mock-merged-url');
      URL.revokeObjectURL = vi.fn();

      try {
        const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const jpgHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
        const webpHeader = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

        const portraitPngFile = {
          name: 'retrato_firma.png',
          size: 24576,
          type: 'image/png',
          arrayBuffer: vi.fn().mockResolvedValue(pngHeader.buffer.slice(0)),
        } as unknown as File;

        const landscapeJpgFile = {
          name: 'panoramica_obra.jpg',
          size: 65536,
          type: 'image/jpeg',
          arrayBuffer: vi.fn().mockResolvedValue(jpgHeader.buffer.slice(0)),
        } as unknown as File;

        const webpImageFile = {
          name: 'diagrama_arquitectura.webp',
          size: 32768,
          type: 'image/webp',
          arrayBuffer: vi.fn().mockResolvedValue(webpHeader.buffer.slice(0)),
        } as unknown as File;

        const pdfDocFile = {
          name: 'expediente_base.pdf',
          size: 131072,
          type: 'application/pdf',
          arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer),
        } as unknown as File;

        // First load a single image file: default output filename strips .png and appends _editado.pdf
        await component.processFiles([portraitPngFile] as unknown as FileList);
        expect(component.uploadedFiles.length).toBe(1);
        expect(component.getDefaultOutputFileName()).toBe('retrato_firma_editado.pdf');
        expect(component.outputFileName).toBe('retrato_firma_editado.pdf');

        // Then add landscape JPEG, WebP image, and 2-page PDF: default output filename updates to pdf_fusionado_*
        await component.processFiles([
          landscapeJpgFile,
          webpImageFile,
          pdfDocFile,
        ] as unknown as FileList);

        expect(component.uploadedFiles.length).toBe(4);
        expect(component.uploadedFiles[0].kind).toBe('image');
        expect(component.uploadedFiles[0].pageCount).toBe(1);
        expect(component.getFileBadgeText(component.uploadedFiles[0])).toBe('Imagen • 1 pagina');

        expect(component.uploadedFiles[1].kind).toBe('image');
        expect(component.uploadedFiles[2].kind).toBe('image');
        expect(component.uploadedFiles[3].kind).toBe('pdf');
        expect(component.uploadedFiles[3].pageCount).toBe(2);
        expect(component.getDefaultOutputFileName()).toContain('pdf_fusionado_');

        // 1st image (600x1000 portrait) -> Portrait A4 [595.28, 841.89]
        expect(addedPageSizes[0]).toEqual([595.28, 841.89]);
        expect(drawImageCalls[0].width).toBeLessThanOrEqual(595.28);
        expect(drawImageCalls[0].height).toBeCloseTo(841.89, 2);
        expect(drawImageCalls[0].x).toBeGreaterThan(0);

        // 2nd image (1600x900 landscape) -> Landscape A4 [841.89, 595.28]
        expect(addedPageSizes[1]).toEqual([841.89, 595.28]);
        expect(drawImageCalls[1].width).toBeCloseTo(841.89, 2);
        expect(drawImageCalls[1].height).toBeLessThanOrEqual(595.28);
        expect(drawImageCalls[1].y).toBeGreaterThan(0);

        // 3rd image (WebP) used rasterizeImageFileToPng fallback -> Portrait A4 [595.28, 841.89]
        expect(rasterizeSpy).toHaveBeenCalledTimes(1);
        expect(addedPageSizes[2]).toEqual([595.28, 841.89]);

        // Verify getFilePdfBuffer returns a fresh sliced copy so Web Worker transfer cannot detach pdfBytes
        const buf1 = await component.getFilePdfBuffer(component.uploadedFiles[0]);
        const buf2 = await component.getFilePdfBuffer(component.uploadedFiles[0]);
        expect(buf1).not.toBe(buf2);
        expect(buf1.byteLength).toBe(buf2.byteLength);

        // Total pages in workspace: 1 + 1 + 1 + 2 = 5 pages
        expect(component.globalPageOrder.length).toBe(5);
        expect(component.getActivePageCount()).toBe(5);

        // Reorder and rotate an image page, then merge all 5 pages into the final PDF
        const firstImagePageId = component.uploadedFiles[0].pages[0].id;
        component.movePagePosition(firstImagePageId, 1);
        component.uploadedFiles[0].pages[0].rotation = 90;

        await component.mergeSelectedPDFs();
        expect(mergedPagesAdded.length).toBe(5);
        expect(component.statusType).toBe('success');
      } finally {
        rasterizeSpy.mockRestore();
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
      }
    });

    it('renders image file item styling, thumbnail image badge, and right-column drop target, and reports a clear error on corrupted images', async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      // 1. Corrupted image file shows clear error message and is not added to uploadedFiles
      const convertSpy = vi
        .spyOn(app, 'convertImageFileToPdf')
        .mockRejectedValueOnce(new Error('Decode error'));

      const corruptedImg = new File([new Uint8Array([0, 1, 2])], 'averiada.png', {
        type: 'image/png',
      });
      await app.processFiles([corruptedImg] as unknown as FileList);
      expect(app.uploadedFiles.length).toBe(0);
      expect(app.statusType).toBe('error');
      expect(app.statusMessage).toContain('La imagen "averiada.png" no es compatible o esta danada.');

      // 2. Dropping an image onto .editor-column--right invokes processFiles and renders image UI indicators
      convertSpy.mockResolvedValueOnce(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer);
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;
      const rightCol = hostEl.querySelector('.editor-column--right') as HTMLElement;
      expect(rightCol).not.toBeNull();

      app.onDragOver({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { types: ['Files'], dropEffect: 'none' },
      } as unknown as DragEvent);
      fixture.detectChanges();
      expect(rightCol.classList.contains('editor-column--dragover')).toBe(true);

      const validImg = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'sello.png', {
        type: 'image/png',
      });
      app.onDrop({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [validImg] },
      } as unknown as DragEvent);
      fixture.detectChanges();
      expect(rightCol.classList.contains('editor-column--dragover')).toBe(false);

      await vi.waitFor(() => {
        expect(app.uploadedFiles.length).toBe(1);
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const fileItem = hostEl.querySelector('.file-item') as HTMLElement;
      const fileIconBox = hostEl.querySelector('.file-icon-box') as HTMLElement;
      expect(fileItem?.classList.contains('file-item--image')).toBe(true);
      expect(fileIconBox?.classList.contains('file-icon-box--image')).toBe(true);
      expect(fileIconBox?.querySelector('.fa-file-image')).not.toBeNull();
      expect(hostEl.querySelector('.thumbnail-badge .fa-image')).not.toBeNull();
      expect(hostEl.querySelector('.info-tip')).toBeNull();
      expect(hostEl.querySelector('.viewer-subtitle')).toBeNull();

      convertSpy.mockRestore();
    });
  });
});
