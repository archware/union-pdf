import { Component, ElementRef, ViewChild, ChangeDetectorRef, OnInit, OnDestroy, HostListener, Optional } from '@angular/core';
import { PanelComponent } from './shared/ui/surfaces/panel/panel.component';
import { ButtonComponent } from './shared/ui/atoms/button/button.component';
import { IconButtonComponent } from './shared/ui/atoms/icon-button/icon-button.component';
import { FloatingInputComponent } from './shared/ui/atoms/floating-input/floating-input.component';
import { BadgeComponent } from './shared/ui/atoms/badge/badge.component';
import { ScrollOverlayComponent } from './shared/ui/organisms/scroll-overlay/scroll-overlay.component';
import {
  AboutDialogComponent,
  type AboutCreditItem,
  type AboutTechBadge,
  type AboutLinkItem,
} from './shared/ui/organisms/about-dialog/about-dialog.component';
import { FormsModule } from '@angular/forms';
import { DesktopFacadeService, type EstadoSistemaDto } from './core/desktop-facade.service';

/** Superficie minima de pdf.js usada por la vista previa (libreria cargada como script global). */
interface PdfjsViewport { width: number; height: number; rotation?: number; }
interface PdfjsTareaRender {
  promise: Promise<void>;
  cancel?: () => void;
}
interface PdfjsPagina {
  rotate?: number;
  getViewport(opciones: { scale: number; rotation?: number }): PdfjsViewport;
  render(contexto: { canvasContext: CanvasRenderingContext2D; viewport: PdfjsViewport }): PdfjsTareaRender;
}
interface PdfjsDocumento { getPage(numero: number): Promise<PdfjsPagina>; }
interface PdfjsGlobal {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(origen: { data: ArrayBuffer }): { promise: Promise<PdfjsDocumento> };
}

/** Superficie minima de pdf-lib usada para fusionar, rotar e incrustar imagenes (libreria cargada como script global). */
interface PdfLibRotacion {
  type: 'degrees';
  angle: number;
}
interface PdfLibImagen {
  width: number;
  height: number;
}
interface PdfLibPagina {
  getRotation?: () => { angle?: number };
  setRotation?: (rotacion: PdfLibRotacion) => void;
  drawImage?: (
    imagen: PdfLibImagen,
    opciones: { x: number; y: number; width: number; height: number }
  ) => void;
}
interface PdfLibDocumento {
  getPageCount(): number;
  copyPages(origen: PdfLibDocumento, indices: number[]): Promise<PdfLibPagina[]>;
  addPage(paginaODimensiones?: PdfLibPagina | [number, number]): PdfLibPagina;
  embedPng?: (datos: ArrayBuffer | Uint8Array | string) => Promise<PdfLibImagen>;
  embedJpg?: (datos: ArrayBuffer | Uint8Array | string) => Promise<PdfLibImagen>;
  save(): Promise<Uint8Array<ArrayBuffer>>;
}
interface PdfLibGlobal {
  degrees?: (angulo: number) => PdfLibRotacion;
  PDFDocument: {
    load(datos: ArrayBuffer, opciones: { ignoreEncryption: boolean }): Promise<PdfLibDocumento>;
    create(): Promise<PdfLibDocumento>;
  };
}

declare const pdfjsLib: PdfjsGlobal;
declare const PDFLib: PdfLibGlobal;

interface PaginaCargada {
  id: string;
  pageNum: number;
  active: boolean;
  rotation?: number;
}
interface ArchivoCargado {
  id: string;
  fileObject: File;
  name: string;
  size: string;
  pageCount: number;
  pagesToKeep: string;
  pages: PaginaCargada[];
  kind?: 'pdf' | 'image';
  pdfBytes?: ArrayBuffer;
}
interface EntradaPagina { file: ArchivoCargado; page: PaginaCargada; }
interface TamanoVistaPrevia { maxWidth?: number; maxHeight?: number; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, PanelComponent, ButtonComponent, IconButtonComponent, FloatingInputComponent, BadgeComponent, ScrollOverlayComponent, AboutDialogComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  static readonly MIN_PREVIEW_ZOOM = 0.5;
  static readonly MAX_PREVIEW_ZOOM = 3;
  static readonly PREVIEW_ZOOM_STEP = 0.25;
  static readonly FILE_DIALOG_TRIGGER_COOLDOWN_MS = 800;
  static readonly FILE_DIALOG_CLOSE_COOLDOWN_MS = 1000;
  static readonly FILE_DIALOG_FOCUS_BOUNCE_WINDOW_MS = 300;
  static readonly A4_SHORT_SIDE_PT = 595.28;
  static readonly A4_LONG_SIDE_PT = 841.89;
  static readonly MIN_VECTOR_RASTER_SIDE_PX = 1600;
  static readonly MAX_RASTER_SIDE_PX = 4096;
  static readonly ACCEPTED_FILE_EXTENSIONS =
    '.pdf,application/pdf,image/*,.png,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.webp,.gif,.bmp,.dib,.svg,.avif,.ico,.tif,.tiff';

  isDragging = false;
  isFileDialogOpen = false;
  uploadedFiles: ArchivoCargado[] = [];
  globalPageOrder: string[] = [];
  selectedPageId: string | null = null;
  previewZoom = 1;
  outputFileName = '';
  
  statusMessage = '';
  statusType: 'loading' | 'success' | 'error' | '' = '';
  isMerging = false;

  private pdfPreviewCache = new Map<string, PdfjsDocumento>();
  private pageThumbnailCache = new Map<string, string>();
  private previewRenderToken = 0;
  private activePreviewRenderTask: PdfjsTareaRender | null = null;
  private fileInputElement: HTMLInputElement | null = null;
  private uploadZonePointerDown = false;
  private hasFileDialogBlurred = false;
  private lastFileDialogTriggerAt = 0;
  private lastFileDialogCloseAt = 0;
  private windowBlurListener: (() => void) | null = null;
  private windowFocusListener: (() => void) | null = null;
  private fileDialogFocusCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private hasCustomOutputFileName = false;

  estadoSistema: EstadoSistemaDto | null = null;
  isAboutDialogOpen = false;

  readonly aboutCredits: AboutCreditItem[] = [
    {
      label: 'Autoría Principal',
      value: 'Ing. Havel CONTRERAS TAPAHUASCO (COTAHA · @archware)',
      subtext:
        'Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas: construcción de software empresarial, aplicaciones de escritorio Multi-Runtime (Rust/Tauri, Go/Wails, Python/PyWebView) e infraestructura IA 100% local',
      icon: 'fa-solid fa-user-shield',
      imageUrl: 'assets/doctrinas/ssit-emblem.jpg',
      bannerImageUrl: 'assets/doctrinas/merch-desk-setup.jpg',
      badge: 'Marca Personal',
    },
    {
      label: 'Artifact Mangosta',
      value: 'Artifact Mangosta — DDD, Arquitectura Hexagonal & CQRS Estricto',
      subtext:
        'Artefacto de ingeniería backend para sistemas distribuidos y nativos (C#/.NET, Java, Rust), fronteras IPC/HTTP tipadas, eventos Kafka y persistencia limpia',
      icon: 'fa-solid fa-diagram-project',
      imageUrl: 'assets/doctrinas/doctrina-mangosta-icon.jpg',
      bannerImageUrl: 'assets/doctrinas/doctrina-mangosta-banner.jpg',
      badge: 'Backend Artifact',
    },
    {
      label: 'Artifact Barracuda',
      value: 'Artifact Barracuda — Chasis Frontend Reactivo con Signals',
      subtext:
        'Artefacto de ingeniería frontend en Angular 22 + Signals, control flow nativo, plantillas modulares, accesibilidad estricta y cero deuda visual',
      icon: 'fa-solid fa-bolt',
      imageUrl: 'assets/doctrinas/doctrina-barracuda-icon.jpg',
      bannerImageUrl: 'assets/doctrinas/doctrina-barracuda-banner.jpg',
      badge: 'Frontend Artifact',
    },
    {
      label: 'Sistema de Diseño',
      value: 'Atomic UI (@atomic-ui/core v5.22.0) — Signals & OnPush',
      subtext:
        'Librería de autor con tokens semánticos puros, desplazamiento gobernado y fidelidad visual de grado empresarial',
      icon: 'fa-solid fa-cubes',
      imageUrl: 'assets/doctrinas/barracuda-mangosta-duality-icon.jpg',
      bannerImageUrl: 'assets/doctrinas/merch-kit-ejecutivo.jpg',
      badge: 'ADN Visual',
    },
    {
      label: 'DIY AI Lab & Co-Ingeniería IA',
      value: 'Laboratorio IA Bare-Metal Local & Orquestación de Agentes',
      subtext:
        'Servidor dedicado Ubuntu Linux con GPU NVIDIA Tesla V100 (32 GB VRAM), inferencia local (Qwen3-Coder / llama.cpp), sistemas RAG (SQLite FTS5), protocolos MCP/ACP y agentes especializados',
      icon: 'fa-solid fa-wand-magic-sparkles',
      badge: 'DIY AI Lab',
    },
    {
      label: 'Arquitectura y Seguridad',
      value: 'Multi-Runtime Desktop & Procesamiento 100% Local en Memoria',
      subtext:
        'Frontera nativa Tauri + Rust (RespuestaSistemaV1), privacidad absoluta sin subida a servidores y ejecución multiplataforma (Windows, macOS y Linux)',
      icon: 'fa-solid fa-shield-halved',
      badge: 'Privacidad',
    },
  ];

  readonly aboutTechStack: AboutTechBadge[] = [
    { label: 'Tauri 1.5 + Rust', icon: 'fa-solid fa-gears', variant: 'primary' },
    { label: 'Angular 22 + Signals', icon: 'fa-brands fa-angular', variant: 'secondary' },
    { label: 'Atomic UI v5.22.0', icon: 'fa-solid fa-layer-group', variant: 'info' },
    { label: 'Artifact Mangosta', icon: 'fa-solid fa-diagram-project', variant: 'primary' },
    { label: 'Artifact Barracuda', icon: 'fa-solid fa-bolt', variant: 'secondary' },
    { label: 'PDF.js + pdf-lib', icon: 'fa-solid fa-file-pdf', variant: 'warning' },
    { label: 'DIY AI Lab · 100% Local', icon: 'fa-solid fa-lock', variant: 'success' },
  ];

  readonly aboutLinks: AboutLinkItem[] = [
    {
      label: 'Portafolio & GitHub @archware',
      url: 'https://github.com/archware',
      icon: 'fa-brands fa-github',
      external: true,
    },
    {
      label: 'LinkedIn — Ing. Havel Contreras',
      url: 'https://www.linkedin.com/in/havel-contreras-tapahuasco-70a109167/',
      icon: 'fa-brands fa-linkedin',
      external: true,
    },
    {
      label: 'Repositorio Atomic UI',
      url: 'https://github.com/archware/-Atomic-UI',
      icon: 'fa-solid fa-code-branch',
      external: true,
    },
    {
      label: 'Contacto (havel363@gmail.com)',
      url: 'mailto:havel363@gmail.com',
      icon: 'fa-solid fa-envelope',
      external: false,
    },
  ];

  @ViewChild('previewCanvas') previewCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewStage') previewStage!: ElementRef<HTMLDivElement>;

  constructor(
    private cdr: ChangeDetectorRef,
    @Optional() private desktopFacade?: DesktopFacadeService,
  ) {}

  ngOnInit() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/js/vendor/pdf.worker.min.js';
    }
    this.ensureFileInputElement();
    if (this.desktopFacade?.estaEnModoEscritorio()) {
      this.desktopFacade.obtenerEstadoSistema().then((resp) => {
        if (resp.correcto && resp.datos) {
          this.estadoSistema = resp.datos;
          this.cdr.markForCheck();
        }
      });
    }
  }

  ngOnDestroy() {
    this.cleanupWindowDialogListeners();
    this.removeFileInputElement();
    this.cancelActivePreviewRender();
  }

  private ensureFileInputElement(): HTMLInputElement | null {
    if (typeof document === 'undefined') {
      return null;
    }
    if (!this.fileInputElement) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = AppComponent.ACCEPTED_FILE_EXTENSIONS;
      input.multiple = true;
      input.hidden = true;
      input.style.display = 'none';
      input.tabIndex = -1;
      input.setAttribute('aria-hidden', 'true');
      input.onchange = (changeEvent: Event) => {
        this.markFileDialogClosed();
        this.handleFileSelect(changeEvent);
      };
      input.addEventListener('cancel', () => {
        this.markFileDialogClosed();
      });
      this.fileInputElement = input;
    }
    if (document.body && !this.fileInputElement.isConnected) {
      document.body.appendChild(this.fileInputElement);
    }
    return this.fileInputElement;
  }

  private removeFileInputElement() {
    if (this.fileInputElement?.parentNode) {
      this.fileInputElement.parentNode.removeChild(this.fileInputElement);
    }
    this.fileInputElement = null;
  }

  isFileDialogActive(now = Date.now()): boolean {
    return (
      this.isFileDialogOpen ||
      (this.lastFileDialogTriggerAt > 0 &&
        now - this.lastFileDialogTriggerAt < AppComponent.FILE_DIALOG_TRIGGER_COOLDOWN_MS) ||
      (this.lastFileDialogCloseAt > 0 &&
        now - this.lastFileDialogCloseAt < AppComponent.FILE_DIALOG_CLOSE_COOLDOWN_MS)
    );
  }

  onUploadZoneMouseDown(event: MouseEvent) {
    if (event.button !== 0 || event.detail > 1) {
      this.uploadZonePointerDown = false;
      return;
    }
    const now = Date.now();
    if (
      this.isFileDialogOpen &&
      !this.hasFileDialogBlurred &&
      this.lastFileDialogTriggerAt > 0 &&
      now - this.lastFileDialogTriggerAt < AppComponent.FILE_DIALOG_TRIGGER_COOLDOWN_MS
    ) {
      this.uploadZonePointerDown = false;
      return;
    }
    this.uploadZonePointerDown = true;
    this.cleanupWindowDialogListeners();
    if (
      this.isFileDialogOpen ||
      this.lastFileDialogCloseAt > 0 ||
      this.lastFileDialogTriggerAt > 0
    ) {
      this.hasFileDialogBlurred = false;
      this.isFileDialogOpen = false;
      this.lastFileDialogTriggerAt = 0;
      this.lastFileDialogCloseAt = 0;
      this.isDragging = false;
      this.cdr.markForCheck();
    }
  }

  onUploadZoneMouseUp(event: MouseEvent) {
    if (event.button !== 0 || !this.uploadZonePointerDown) {
      return;
    }
    this.uploadZonePointerDown = false;
    this.triggerFileInput(event);
  }

  onUploadZoneMouseLeave() {
    this.uploadZonePointerDown = false;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation?.();
    if (this.isFileDialogActive()) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      this.isDragging = false;
      this.cdr.markForCheck();
      return;
    }
    const types = event.dataTransfer?.types;
    if (types && !Array.from(types).includes('Files')) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      this.isDragging = false;
      this.cdr.markForCheck();
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragging = true;
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation?.();
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation?.();
    this.isDragging = false;
    this.cdr.markForCheck();
    if (this.isFileDialogActive()) {
      return;
    }
    if (event.dataTransfer?.files?.length) {
      this.processFiles(event.dataTransfer.files);
    }
  }

  private cleanupWindowDialogListeners() {
    if (this.fileDialogFocusCloseTimer !== null) {
      clearTimeout(this.fileDialogFocusCloseTimer);
      this.fileDialogFocusCloseTimer = null;
    }
    if (typeof window !== 'undefined') {
      if (this.windowBlurListener) {
        window.removeEventListener('blur', this.windowBlurListener);
        this.windowBlurListener = null;
      }
      if (this.windowFocusListener) {
        window.removeEventListener('focus', this.windowFocusListener);
        this.windowFocusListener = null;
      }
    }
  }

  private markFileDialogClosed() {
    this.cleanupWindowDialogListeners();
    this.uploadZonePointerDown = false;
    this.hasFileDialogBlurred = false;
    this.isFileDialogOpen = false;
    this.lastFileDialogTriggerAt = 0;
    this.lastFileDialogCloseAt = Date.now();
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  triggerFileInput(event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.detail > 1) {
        return;
      }
    }

    const now = Date.now();
    if (this.isFileDialogActive(now)) {
      return;
    }

    const input = this.ensureFileInputElement();
    if (input) {
      this.uploadZonePointerDown = false;
      this.hasFileDialogBlurred = false;
      this.lastFileDialogTriggerAt = now;
      this.lastFileDialogCloseAt = 0;
      this.isFileDialogOpen = true;
      this.isDragging = false;
      this.cdr.markForCheck();

      this.cleanupWindowDialogListeners();
      if (typeof window !== 'undefined') {
        this.windowBlurListener = () => {
          const blurNow = Date.now();
          if (
            !this.isFileDialogOpen &&
            this.lastFileDialogCloseAt > 0 &&
            blurNow - this.lastFileDialogCloseAt >= AppComponent.FILE_DIALOG_FOCUS_BOUNCE_WINDOW_MS
          ) {
            this.cleanupWindowDialogListeners();
            return;
          }
          if (this.fileDialogFocusCloseTimer !== null) {
            clearTimeout(this.fileDialogFocusCloseTimer);
            this.fileDialogFocusCloseTimer = null;
          }
          this.hasFileDialogBlurred = true;
          this.isFileDialogOpen = true;
          this.lastFileDialogCloseAt = 0;
          this.isDragging = false;
          this.cdr.markForCheck();
        };
        this.windowFocusListener = () => {
          if (!this.isFileDialogOpen) {
            this.cleanupWindowDialogListeners();
            return;
          }
          const focusNow = Date.now();
          if (
            !this.hasFileDialogBlurred &&
            this.lastFileDialogTriggerAt > 0 &&
            focusNow - this.lastFileDialogTriggerAt < AppComponent.FILE_DIALOG_FOCUS_BOUNCE_WINDOW_MS
          ) {
            return;
          }
          this.isFileDialogOpen = false;
          this.lastFileDialogTriggerAt = 0;
          this.lastFileDialogCloseAt = focusNow;
          this.isDragging = false;
          this.cdr.markForCheck();
          if (this.fileDialogFocusCloseTimer !== null) {
            clearTimeout(this.fileDialogFocusCloseTimer);
          }
          this.fileDialogFocusCloseTimer = setTimeout(() => {
            this.fileDialogFocusCloseTimer = null;
            if (!this.isFileDialogOpen) {
              this.cleanupWindowDialogListeners();
            }
          }, AppComponent.FILE_DIALOG_FOCUS_BOUNCE_WINDOW_MS);
        };
        window.addEventListener('blur', this.windowBlurListener);
        window.addEventListener('focus', this.windowFocusListener);
      }

      input.value = '';
      input.click();
    }
  }

  handleFileSelect(event: Event) {
    this.markFileDialogClosed();
    const input = event.target as HTMLInputElement | null;
    if (input?.files?.length) {
      this.processFiles(input.files);
      input.value = '';
    }
  }

  isPdfFile(file: File): boolean {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return type === 'application/pdf' || name.endsWith('.pdf');
  }

  isImageFile(file: File): boolean {
    if (this.isPdfFile(file)) {
      return false;
    }
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return (
      type.startsWith('image/') ||
      /\.(png|jpe?g|jfif|pjpeg|pjp|webp|gif|bmp|dib|svg|avif|ico|tiff?)$/i.test(name)
    );
  }

  inferImageMimeType(file: File): string {
    const rawType = (file.type || '').trim().toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.svg')) return 'image/svg+xml';
    if (rawType.startsWith('image/')) return rawType;
    if (name.endsWith('.png')) return 'image/png';
    if (/\.(jpe?g|jfif|pjpeg|pjp)$/i.test(name)) return 'image/jpeg';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.gif')) return 'image/gif';
    if (/\.(bmp|dib)$/i.test(name)) return 'image/bmp';
    if (name.endsWith('.avif')) return 'image/avif';
    if (name.endsWith('.ico')) return 'image/x-icon';
    if (/\.tiff?$/i.test(name)) return 'image/tiff';
    return 'image/png';
  }

  hasNonStandardExifOrientation(buffer: ArrayBuffer): boolean {
    try {
      const view = new DataView(buffer);
      if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) {
        return false;
      }
      let offset = 2;
      while (offset + 4 <= view.byteLength) {
        if (view.getUint8(offset) !== 0xff) {
          break;
        }
        while (offset < view.byteLength && view.getUint8(offset) === 0xff) {
          offset += 1;
        }
        if (offset >= view.byteLength) {
          break;
        }
        const markerByte = view.getUint8(offset);
        offset += 1;
        if (
          markerByte === 0x00 ||
          markerByte === 0x01 ||
          (markerByte >= 0xd0 && markerByte <= 0xd8)
        ) {
          continue;
        }
        if (markerByte === 0xd9 || markerByte === 0xda) {
          break;
        }
        if (offset + 2 > view.byteLength) {
          break;
        }
        const segmentLength = view.getUint16(offset, false);
        if (segmentLength < 2 || offset + segmentLength > view.byteLength) {
          break;
        }
        if (
          markerByte === 0xe1 &&
          segmentLength >= 10 &&
          view.getUint32(offset + 2, false) === 0x45786966 &&
          view.getUint16(offset + 6, false) === 0x0000
        ) {
          const tiffOffset = offset + 8;
          const segmentEnd = offset + segmentLength;
          if (tiffOffset + 8 <= segmentEnd) {
            const byteOrder = view.getUint16(tiffOffset, false);
            if (byteOrder === 0x4949 || byteOrder === 0x4d4d) {
              const littleEndian = byteOrder === 0x4949;
              const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
              const dirStart = tiffOffset + firstIfdOffset;
              if (dirStart >= tiffOffset && dirStart + 2 <= segmentEnd) {
                const entries = view.getUint16(dirStart, littleEndian);
                for (let i = 0; i < entries; i++) {
                  const entryOffset = dirStart + 2 + i * 12;
                  if (entryOffset + 12 > segmentEnd) break;
                  if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
                    const orientation = view.getUint16(entryOffset + 8, littleEndian);
                    return orientation > 1 && orientation <= 8;
                  }
                }
              }
            }
          }
        }
        offset += segmentLength;
      }
    } catch {
      return false;
    }
    return false;
  }

  dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
    const commaIndex = dataUrl.indexOf(',');
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
      img.src = url;
    });
  }

  resolveSvgIntrinsicDimensions(svgText: string): { width: number; height: number } | null {
    if (!svgText) return null;
    const svgTagMatch = svgText.match(/<svg\b[^>]*>/i);
    if (!svgTagMatch) return null;
    const svgTag = svgTagMatch[0];

    const viewBoxMatch = svgTag.match(
      /\bviewBox\s*=\s*["']\s*[-+]?\d*\.?\d+[\s,]+[-+]?\d*\.?\d+[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)\s*["']/i
    );
    const widthMatch = svgTag.match(
      /\bwidth\s*=\s*["']\s*(\d+(?:\.\d+)?)\s*(?:px|pt|cm|mm|in)?\s*["']/i
    );
    const heightMatch = svgTag.match(
      /\bheight\s*=\s*["']\s*(\d+(?:\.\d+)?)\s*(?:px|pt|cm|mm|in)?\s*["']/i
    );

    const attrWidth = widthMatch ? parseFloat(widthMatch[1]) : 0;
    const attrHeight = heightMatch ? parseFloat(heightMatch[1]) : 0;
    if (attrWidth > 0 && attrHeight > 0) {
      return { width: attrWidth, height: attrHeight };
    }

    const vbWidth = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 0;
    const vbHeight = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 0;
    if (vbWidth > 0 && vbHeight > 0) {
      return { width: vbWidth, height: vbHeight };
    }
    return null;
  }

  normalizeRasterDimensions(
    rawWidth: number,
    rawHeight: number,
    isVector = false
  ): { width: number; height: number } {
    let width = Math.max(1, Number(rawWidth) || 1200);
    let height = Math.max(1, Number(rawHeight) || 1600);
    const longestSide = Math.max(width, height);

    if (isVector && longestSide < AppComponent.MIN_VECTOR_RASTER_SIDE_PX) {
      const upscale = AppComponent.MIN_VECTOR_RASTER_SIDE_PX / longestSide;
      width = Math.max(1, Math.round(width * upscale));
      height = Math.max(1, Math.round(height * upscale));
    } else if (longestSide > AppComponent.MAX_RASTER_SIDE_PX) {
      const downscale = AppComponent.MAX_RASTER_SIDE_PX / longestSide;
      width = Math.max(1, Math.round(width * downscale));
      height = Math.max(1, Math.round(height * downscale));
    } else {
      width = Math.max(1, Math.round(width));
      height = Math.max(1, Math.round(height));
    }

    return { width, height };
  }

  async rasterizeImageFileToPng(file: File): Promise<ArrayBuffer> {
    const mimeType = this.inferImageMimeType(file);
    const isSvg = mimeType === 'image/svg+xml';
    let svgDimensions: { width: number; height: number } | null = null;
    if (isSvg && typeof file.text === 'function') {
      try {
        svgDimensions = this.resolveSvgIntrinsicDimensions(await file.text());
      } catch {
        svgDimensions = null;
      }
    }

    const normalizedBlob = file.type === mimeType ? file : new Blob([file], { type: mimeType });
    const objectUrl = URL.createObjectURL(normalizedBlob);

    try {
      const img = await this.loadImageFromUrl(objectUrl);
      const naturalW = img.naturalWidth || img.width || 0;
      const naturalH = img.naturalHeight || img.height || 0;
      const useSvgDims =
        svgDimensions !== null &&
        (naturalW <= 0 || naturalH <= 0 || (naturalW === 300 && naturalH === 150));
      const baseWidth =
        useSvgDims && svgDimensions
          ? svgDimensions.width
          : naturalW || svgDimensions?.width || 1200;
      const baseHeight =
        useSvgDims && svgDimensions
          ? svgDimensions.height
          : naturalH || svgDimensions?.height || 1600;
      const { width, height } = this.normalizeRasterDimensions(baseWidth, baseHeight, isSvg);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo inicializar el lienzo para convertir la imagen.');
      }

      const paperBg =
        typeof document !== 'undefined' && typeof getComputedStyle === 'function'
          ? getComputedStyle(document.documentElement).getPropertyValue('--gray-0').trim() || 'white'
          : 'white';
      context.fillStyle = paperBg;
      context.fillRect(0, 0, width, height);
      context.drawImage(img, 0, 0, width, height);

      const pngDataUrl = canvas.toDataURL('image/png');
      return this.dataUrlToArrayBuffer(pngDataUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async convertImageFileToPdf(file: File): Promise<ArrayBuffer> {
    const rawBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(rawBuffer);
    const hasPngMagic =
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const hasJpgMagic =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    const hasOtherRasterMagic =
      (bytes.length >= 4 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46) ||
      (bytes.length >= 3 &&
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46) ||
      (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d);

    const mimeType = this.inferImageMimeType(file);
    const isDirectPngCandidate =
      hasPngMagic || (!hasJpgMagic && !hasOtherRasterMagic && mimeType === 'image/png');
    const isDirectJpgCandidate =
      (hasJpgMagic || (!hasPngMagic && !hasOtherRasterMagic && mimeType === 'image/jpeg')) &&
      !this.hasNonStandardExifOrientation(rawBuffer);

    const pdfDoc = await PDFLib.PDFDocument.create();
    let embeddedImage: PdfLibImagen | null = null;

    if (isDirectPngCandidate && rawBuffer.byteLength > 0 && typeof pdfDoc.embedPng === 'function') {
      try {
        embeddedImage = await pdfDoc.embedPng(rawBuffer);
      } catch {
        embeddedImage = null;
      }
    } else if (
      isDirectJpgCandidate &&
      rawBuffer.byteLength > 0 &&
      typeof pdfDoc.embedJpg === 'function'
    ) {
      try {
        embeddedImage = await pdfDoc.embedJpg(rawBuffer);
      } catch {
        embeddedImage = null;
      }
    }

    if (!embeddedImage) {
      const pngBuffer = await this.rasterizeImageFileToPng(file);
      if (typeof pdfDoc.embedPng !== 'function') {
        throw new Error('El motor PDF no dispone de soporte para incrustar imagenes PNG.');
      }
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const imgWidth = Math.max(1, Number(embeddedImage?.width) || AppComponent.A4_SHORT_SIDE_PT);
    const imgHeight = Math.max(1, Number(embeddedImage?.height) || AppComponent.A4_LONG_SIDE_PT);
    const isLandscape = imgWidth > imgHeight;
    const pageWidth = isLandscape ? AppComponent.A4_LONG_SIDE_PT : AppComponent.A4_SHORT_SIDE_PT;
    const pageHeight = isLandscape ? AppComponent.A4_SHORT_SIDE_PT : AppComponent.A4_LONG_SIDE_PT;

    const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    if (page && typeof page.drawImage === 'function') {
      page.drawImage(embeddedImage, { x, y, width: drawWidth, height: drawHeight });
    }

    const savedBytes = await pdfDoc.save();
    return savedBytes.buffer.slice(
      savedBytes.byteOffset,
      savedBytes.byteOffset + savedBytes.byteLength
    );
  }

  async getFilePdfBuffer(file: ArchivoCargado): Promise<ArrayBuffer> {
    if (file.pdfBytes) {
      return file.pdfBytes.slice(0);
    }
    if (file.kind === 'image' || this.isImageFile(file.fileObject)) {
      const converted = await this.convertImageFileToPdf(file.fileObject);
      file.pdfBytes = converted;
      return converted.slice(0);
    }
    return file.fileObject.arrayBuffer();
  }

  async processFiles(files: FileList) {
    const supportedFiles = Array.from(files).filter(
      (file) => this.isPdfFile(file) || this.isImageFile(file)
    );

    if (supportedFiles.length === 0 && files.length > 0) {
      this.showStatus(
        'Por favor, selecciona unicamente archivos con extension .pdf o imagenes compatibles.',
        'error'
      );
      return;
    }

    this.showStatus('Cargando y analizando archivos...', 'loading');
    let lastErrorMessage = '';

    try {
      for (const file of supportedFiles) {
        const isImage = this.isImageFile(file);
        let pageCount = 0;
        let convertedPdfBytes: ArrayBuffer | undefined;

        if (isImage) {
          try {
            convertedPdfBytes = await this.convertImageFileToPdf(file);
            pageCount = 1;
          } catch {
            lastErrorMessage = `La imagen "${file.name}" no es compatible o esta danada.`;
            this.showStatus(lastErrorMessage, 'error');
            continue;
          }
        } else {
          const tempBuffer = await file.arrayBuffer();
          try {
            const pdfDoc = await PDFLib.PDFDocument.load(tempBuffer, { ignoreEncryption: true });
            pageCount = pdfDoc.getPageCount();
          } catch {
            lastErrorMessage = `El archivo "${file.name}" esta danado, protegido o tiene restricciones severas.`;
            this.showStatus(lastErrorMessage, 'error');
            continue;
          }
        }

        const fileId = crypto.randomUUID();
        const pages: PaginaCargada[] = Array.from({ length: pageCount }, (_, index) => ({
          id: crypto.randomUUID(),
          pageNum: index + 1,
          active: true,
          rotation: 0
        }));

        const newFile: ArchivoCargado = {
          id: fileId,
          fileObject: file,
          name: file.name,
          size: this.formatBytes(file.size),
          pageCount: pageCount,
          pagesToKeep: pageCount > 0 ? (pageCount === 1 ? '1' : `1-${pageCount}`) : '',
          pages: pages,
          kind: isImage ? 'image' : 'pdf',
          pdfBytes: convertedPdfBytes
        };

        this.uploadedFiles.push(newFile);
        this.globalPageOrder.push(...pages.map((page) => page.id));
        
        // Generate thumbnails in background
        this.generateThumbnailsForFile(newFile);
      }

      this.syncGlobalPageOrder();

      if (!this.hasCustomOutputFileName && this.uploadedFiles.length > 0) {
        this.outputFileName = this.getDefaultOutputFileName();
      }

      if (!this.selectedPageId || !this.globalPageOrder.includes(this.selectedPageId)) {
        this.selectedPageId = this.globalPageOrder.length > 0 ? this.globalPageOrder[0] : null;
      }

      if (lastErrorMessage) {
        this.showStatus(lastErrorMessage, 'error');
      } else {
        this.hideStatus();
      }
      this.renderSelectedPage();
      this.syncView();
    } catch (error) {
      console.error(error);
      this.showStatus('Ocurrio un error al cargar los archivos.', 'error');
    }
  }

  private syncView() {
    this.cdr.detectChanges();
    Promise.resolve().then(() => {
      this.cdr.detectChanges();
    });
  }
  
  async generateThumbnailsForFile(file: ArchivoCargado) {
    if (typeof pdfjsLib === 'undefined') {
      return;
    }
    const pdf = await this.getPreviewDocument(file);
    for (const page of file.pages) {
      if (!this.pageThumbnailCache.has(page.id)) {
        await this.refreshPageThumbnail(file, page, pdf);
      }
    }
  }

  async refreshPageThumbnail(file: ArchivoCargado, page: PaginaCargada, pdfDoc?: PdfjsDocumento) {
    if (typeof pdfjsLib === 'undefined' && !pdfDoc) {
      return;
    }
    const targetRotation = this.normalizeRotationAngle(page.rotation ?? 0);
    const pdf = pdfDoc ?? (await this.getPreviewDocument(file));
    const tempCanvas = document.createElement('canvas');
    await this.renderPageToCanvas(
      pdf,
      page.pageNum,
      tempCanvas,
      { maxWidth: 210, maxHeight: 290 },
      undefined,
      targetRotation,
      1
    );
    if (this.normalizeRotationAngle(page.rotation ?? 0) !== targetRotation) {
      return;
    }
    this.pageThumbnailCache.set(page.id, tempCanvas.toDataURL('image/png'));
    this.cdr.detectChanges();
  }

  formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  getFileBadgeText(file: ArchivoCargado) {
    const activeCount = file.pages.filter((page: PaginaCargada) => page.active).length;
    if (activeCount < file.pageCount) {
      return `Conservando ${activeCount} de ${file.pageCount} pag.`;
    }
    if (file.kind === 'image') {
      return 'Imagen • 1 pagina';
    }
    return `${file.pageCount} ${file.pageCount === 1 ? 'pagina' : 'paginas'}`;
  }

  clearAll() {
    this.cancelActivePreviewRender();
    this.uploadedFiles = [];
    this.globalPageOrder = [];
    this.selectedPageId = null;
    this.previewZoom = 1;
    this.outputFileName = '';
    this.hasCustomOutputFileName = false;
    this.previewRenderToken++;
    this.pdfPreviewCache.clear();
    this.pageThumbnailCache.clear();
    this.hideStatus();
    this.syncView();
  }

  removeItem(id: string) {
    const fileIndex = this.uploadedFiles.findIndex((file) => file.id === id);
    if (fileIndex < 0) return;

    const removedFile = this.uploadedFiles[fileIndex];
    const pageIds = removedFile.pages.map((page: PaginaCargada) => page.id);
    const pageIdSet = new Set(pageIds);

    this.uploadedFiles.splice(fileIndex, 1);
    this.globalPageOrder = this.globalPageOrder.filter((pageId) => !pageIdSet.has(pageId));

    this.pdfPreviewCache.delete(id);
    pageIds.forEach((pageId: string) => this.pageThumbnailCache.delete(pageId));

    if (this.selectedPageId && pageIdSet.has(this.selectedPageId)) {
      this.selectedPageId = null;
    }

    this.syncGlobalPageOrder();
    if (this.uploadedFiles.length === 0) {
      this.previewZoom = 1;
      this.outputFileName = '';
      this.hasCustomOutputFileName = false;
    } else if (!this.hasCustomOutputFileName) {
      this.outputFileName = this.getDefaultOutputFileName();
    }
    if (!this.selectedPageId || !this.globalPageOrder.includes(this.selectedPageId)) {
      this.selectedPageId = this.globalPageOrder.length > 0 ? this.globalPageOrder[0] : null;
    }
    
    this.renderSelectedPage();
    this.syncView();
  }

  updatePageInput(id: string, value: string | number) {
    const file = this.uploadedFiles.find((entry) => entry.id === id);
    if (!file) return;

    const normalizedValue = String(value ?? '');
    file.pagesToKeep = normalizedValue;
    const pageIndices = this.parsePageRange(normalizedValue, file.pageCount);

    file.pages.forEach((page: PaginaCargada, index: number) => {
      page.active = pageIndices.includes(index);
    });
    
    this.renderSelectedPage();
    this.syncView();
  }

  syncGlobalPageOrder() {
    const validPageIds = new Set();
    for (const file of this.uploadedFiles) {
      for (const page of file.pages) {
        validPageIds.add(page.id);
      }
    }
    this.globalPageOrder = this.globalPageOrder.filter((pageId) => validPageIds.has(pageId));
    const currentSet = new Set(this.globalPageOrder);
    for (const file of this.uploadedFiles) {
      for (const page of file.pages) {
        if (!currentSet.has(page.id)) {
          this.globalPageOrder.push(page.id);
          currentSet.add(page.id);
        }
      }
    }
  }

  orderedEntries() {
    const index = this.buildPageIndex();
    return this.globalPageOrder.map(id => index.get(id)).filter(e => !!e);
  }

  buildPageIndex() {
    const index = new Map<string, EntradaPagina>();
    for (const file of this.uploadedFiles) {
      for (const page of file.pages) {
        index.set(page.id, { file, page });
      }
    }
    return index;
  }
  
  getActivePageCount() {
    return this.orderedEntries().filter(e => e.page.active).length;
  }
  
  getThumbnailSrc(entry: EntradaPagina): string {
    return this.pageThumbnailCache.get(entry.page.id) || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }

  setSelectedPage(pageId: string) {
    this.selectedPageId = pageId;
    this.renderSelectedPage();
  }
  
  get selectedEntry() {
    if (!this.selectedPageId) return null;
    return this.buildPageIndex().get(this.selectedPageId);
  }
  
  getOrderPosition(pageId: string) {
    return this.globalPageOrder.indexOf(pageId) + 1;
  }

  togglePageActive(pageId: string) {
    const entry = this.buildPageIndex().get(pageId);
    if (!entry) return;

    entry.page.active = !entry.page.active;
    
    const activePageNumbers = entry.file.pages
        .filter((p: PaginaCargada) => p.active)
        .map((p: PaginaCargada) => p.pageNum);

    entry.file.pagesToKeep = this.pagesToRangeString(activePageNumbers);
    this.renderSelectedPage();
    this.syncView();
  }

  movePagePosition(pageId: string, direction: number) {
    const currentIndex = this.globalPageOrder.indexOf(pageId);
    if (currentIndex < 0) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= this.globalPageOrder.length) return;

    const swapPageId = this.globalPageOrder[nextIndex];
    this.globalPageOrder[nextIndex] = pageId;
    this.globalPageOrder[currentIndex] = swapPageId;
    
    this.cdr.detectChanges();
  }

  normalizeRotationAngle(angle: number): number {
    if (!Number.isFinite(angle)) return 0;
    const snapped = Math.round(angle / 90) * 90;
    const normalized = ((snapped % 360) + 360) % 360;
    return normalized === 360 ? 0 : normalized;
  }

  getPageRotation(pageId: string): number {
    const entry = this.buildPageIndex().get(pageId);
    return this.normalizeRotationAngle(entry?.page.rotation ?? 0);
  }

  async rotatePage(pageId: string, deltaDegrees = 90) {
    const entry = this.buildPageIndex().get(pageId);
    if (!entry) return;

    const currentRotation = entry.page.rotation ?? 0;
    entry.page.rotation = this.normalizeRotationAngle(currentRotation + deltaDegrees);
    this.syncView();

    const tasks: Promise<unknown>[] = [];
    if (this.selectedPageId === pageId) {
      tasks.push(this.renderSelectedPage());
    }
    if (typeof pdfjsLib !== 'undefined') {
      tasks.push(
        this.refreshPageThumbnail(entry.file, entry.page).catch(() => {
          // En entornos sin documento pdf.js cargado se conserva el angulo en el modelo
        })
      );
    }
    await Promise.all(tasks);
    this.syncView();
  }

  async rotateSelectedPage(deltaDegrees = 90) {
    if (!this.selectedPageId) return;
    await this.rotatePage(this.selectedPageId, deltaDegrees);
  }

  getPreviewZoomPercent(): number {
    return Math.round(this.previewZoom * 100);
  }

  setPreviewZoom(factor: number) {
    if (!Number.isFinite(factor)) return;
    const clamped = Math.min(
      AppComponent.MAX_PREVIEW_ZOOM,
      Math.max(AppComponent.MIN_PREVIEW_ZOOM, Math.round(factor * 100) / 100)
    );
    if (this.previewZoom === clamped) return;
    this.previewZoom = clamped;
    this.renderSelectedPage();
    this.syncView();
  }

  zoomInPreview() {
    this.setPreviewZoom(this.previewZoom + AppComponent.PREVIEW_ZOOM_STEP);
  }

  zoomOutPreview() {
    this.setPreviewZoom(this.previewZoom - AppComponent.PREVIEW_ZOOM_STEP);
  }

  resetPreviewZoom() {
    if (this.previewZoom === 1) return;
    this.previewZoom = 1;
    this.renderSelectedPage();
    this.syncView();
  }

  onPreviewWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomInPreview();
    } else if (event.deltaY > 0) {
      this.zoomOutPreview();
    }
  }

  updateOutputFileName(value: string | number) {
    this.outputFileName = String(value ?? '');
    this.hasCustomOutputFileName = this.outputFileName.trim().length > 0;
    this.syncView();
  }

  getDefaultOutputFileName(): string {
    if (this.uploadedFiles.length === 1) {
      const originalName = this.uploadedFiles[0].name.replace(
        /\.(pdf|png|jpe?g|jfif|pjpeg|pjp|webp|gif|bmp|dib|svg|avif|ico|tiff?)$/i,
        ''
      );
      return `${originalName}_editado.pdf`;
    }
    if (this.uploadedFiles.length > 1) {
      return `pdf_fusionado_${this.getTimestamp()}.pdf`;
    }
    return 'documento_final.pdf';
  }

  resolveOutputFileName(): string {
    const raw = (this.outputFileName ?? '').trim();
    if (!raw) {
      return this.getDefaultOutputFileName();
    }
    const withoutExtension = raw.replace(/\.pdf$/i, '').trim();
    const sanitizedBase = withoutExtension
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/[. ]+$/g, '')
      .replace(/^[. ]+/g, '');
    if (!sanitizedBase || /^_+$/.test(sanitizedBase)) {
      return this.getDefaultOutputFileName();
    }
    return `${sanitizedBase}.pdf`;
  }

  @HostListener('window:resize')
  onResize() {
    this.renderSelectedPage();
  }

  private cancelActivePreviewRender() {
    if (this.activePreviewRenderTask) {
      try {
        this.activePreviewRenderTask.cancel?.();
      } catch {
        // Ignorar errores de cancelacion de tarea en vuelo
      }
      this.activePreviewRenderTask = null;
    }
  }

  async renderSelectedPage() {
    const token = ++this.previewRenderToken;
    this.cancelActivePreviewRender();

    if (
      !this.selectedPageId ||
      !this.previewCanvas?.nativeElement ||
      !this.previewStage?.nativeElement ||
      typeof pdfjsLib === 'undefined'
    ) {
      return;
    }
    const entry = this.buildPageIndex().get(this.selectedPageId);
    if (!entry) return;

    try {
      const pdf = await this.getPreviewDocument(entry.file);
      if (token !== this.previewRenderToken || !this.previewStage?.nativeElement) return;

      const stage = this.previewStage.nativeElement;
      const maxWidth = Math.max(240, stage.clientWidth - 16);
      const maxHeight = Math.max(240, stage.clientHeight - 16);

      // Renderizar en un canvas temporal aislado para evitar que eventos resize
      // concurrentes compartan el mismo CanvasRenderingContext2D en pdf.js
      // (lo cual multiplica la matriz de transformacion Y e invierte/rota la hoja).
      const bufferCanvas = document.createElement('canvas');
      const completed = await this.renderPageToCanvas(
        pdf,
        entry.page.pageNum,
        bufferCanvas,
        { maxWidth, maxHeight },
        token,
        entry.page.rotation ?? 0,
        this.previewZoom
      );
      if (!completed || token !== this.previewRenderToken || !this.previewCanvas?.nativeElement) return;

      const targetCanvas = this.previewCanvas.nativeElement;
      targetCanvas.width = bufferCanvas.width;
      targetCanvas.height = bufferCanvas.height;
      const targetContext = targetCanvas.getContext('2d');
      if (targetContext) {
        targetContext.setTransform(1, 0, 0, 1, 0, 0);
        targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        targetContext.drawImage(bufferCanvas, 0, 0);
      }
    } catch (error: unknown) {
      const nombreError = (error as { name?: string } | null)?.name;
      if (nombreError === 'RenderingCancelledException' || token !== this.previewRenderToken) {
        return;
      }
      console.error('Render error:', error);
    }
  }

  async getPreviewDocument(file: ArchivoCargado): Promise<PdfjsDocumento> {
    if (this.pdfPreviewCache.has(file.id)) {
      return this.pdfPreviewCache.get(file.id) as PdfjsDocumento;
    }
    const buffer = await this.getFilePdfBuffer(file);
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    this.pdfPreviewCache.set(file.id, pdf);
    return pdf;
  }

  async renderPageToCanvas(
    pdf: PdfjsDocumento,
    pageNum: number,
    canvas: HTMLCanvasElement,
    size: TamanoVistaPrevia,
    expectedToken?: number,
    extraRotation = 0,
    zoomFactor = 1
  ): Promise<boolean> {
    const page = await pdf.getPage(pageNum);
    if (expectedToken !== undefined && expectedToken !== this.previewRenderToken) {
      return false;
    }

    const nativeRotation = typeof page.rotate === 'number' ? ((page.rotate % 360) + 360) % 360 : 0;
    const totalRotation = this.normalizeRotationAngle(nativeRotation + extraRotation);
    const unscaledViewport = page.getViewport({ scale: 1, rotation: totalRotation });
    let scale = 1;

    if (size && typeof size === 'object') {
      const widthScale = size.maxWidth ? (size.maxWidth / unscaledViewport.width) : Number.POSITIVE_INFINITY;
      const heightScale = size.maxHeight ? (size.maxHeight / unscaledViewport.height) : Number.POSITIVE_INFINITY;
      scale = Math.min(widthScale, heightScale);
    }

    if (!isFinite(scale) || scale <= 0) scale = 1;
    const effectiveZoom = Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1;
    const finalScale = scale * effectiveZoom;
    const viewport = page.getViewport({ scale: finalScale, rotation: totalRotation });

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const context = canvas.getContext('2d');
    if (!context) return false;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({ canvasContext: context, viewport });
    if (expectedToken !== undefined) {
      this.activePreviewRenderTask = renderTask;
    }
    try {
      await renderTask.promise;
      return expectedToken === undefined || expectedToken === this.previewRenderToken;
    } finally {
      if (this.activePreviewRenderTask === renderTask) {
        this.activePreviewRenderTask = null;
      }
    }
  }

  pagesToRangeString(activePages: number[]) {
    if (activePages.length === 0) return '';
    const ranges = [];
    let start = activePages[0];
    let end = activePages[0];

    for (let i = 1; i < activePages.length; i++) {
      if (activePages[i] === end + 1) {
        end = activePages[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = activePages[i];
        end = activePages[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
  }

  parsePageRange(rangeStr: string, maxPages: number) {
    if (!rangeStr || rangeStr.trim().toLowerCase() === 'todas' || rangeStr.trim() === '') {
      return Array.from({ length: maxPages }, (_, index) => index);
    }

    const pages = new Set<number>();
    const parts = rangeStr.split(',');

    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const rangeParts = part.split('-');
        const start = parseInt(rangeParts[0], 10);
        const end = parseInt(rangeParts[1], 10);

        if (!isNaN(start) && !isNaN(end)) {
          const minRange = Math.min(start, end);
          const maxRange = Math.max(start, end);

          for (let pageNum = minRange; pageNum <= maxRange; pageNum++) {
            if (pageNum >= 1 && pageNum <= maxPages) {
              pages.add(pageNum - 1);
            }
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
          pages.add(pageNum - 1);
        }
      }
    }

    if (pages.size === 0) {
      return Array.from({ length: maxPages }, (_, index) => index);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  showStatus(message: string, type: 'loading' | 'success' | 'error') {
    this.statusMessage = message;
    this.statusType = type;
    this.cdr.detectChanges();
  }

  hideStatus() {
    this.statusMessage = '';
    this.statusType = '';
    this.cdr.detectChanges();
  }

  async mergeSelectedPDFs() {
    if (this.uploadedFiles.length === 0) {
      this.showStatus('Por favor, anade al menos 1 archivo PDF.', 'error');
      return;
    }

    try {
      this.showStatus('Procesando y generando archivo final... Por favor espera.', 'loading');
      this.isMerging = true;

      this.syncGlobalPageOrder();
      const pageIndex = this.buildPageIndex();
      const orderedActivePages = [];

      for (const pageId of this.globalPageOrder) {
        const entry = pageIndex.get(pageId);
        if (entry && entry.page.active) {
          orderedActivePages.push(entry);
        }
      }

      if (orderedActivePages.length === 0) {
        throw new Error('El PDF resultante esta vacio. Activa al menos una hoja.');
      }

      const mergedPdf = await PDFLib.PDFDocument.create();
      const sourcePdfCache = new Map<string, PdfLibDocumento>();

      for (const entry of orderedActivePages) {
        const { file, page } = entry;
        let sourcePdf = sourcePdfCache.get(file.id);

        if (!sourcePdf) {
          const fileData = await this.getFilePdfBuffer(file);
          sourcePdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });
          sourcePdfCache.set(file.id, sourcePdf);
        }

        const copiedPages = await mergedPdf.copyPages(sourcePdf, [page.pageNum - 1]);
        const copiedPage = copiedPages[0];
        const addedRotation = this.normalizeRotationAngle(page.rotation ?? 0);
        if (addedRotation !== 0 && copiedPage && typeof copiedPage.setRotation === 'function') {
          const baseAngle =
            typeof copiedPage.getRotation === 'function'
              ? (copiedPage.getRotation()?.angle ?? 0)
              : 0;
          const finalAngle = this.normalizeRotationAngle(baseAngle + addedRotation);
          const rotationObj: PdfLibRotacion =
            typeof PDFLib.degrees === 'function'
              ? PDFLib.degrees(finalAngle)
              : { type: 'degrees', angle: finalAngle };
          copiedPage.setRotation(rotationObj);
        }
        mergedPdf.addPage(copiedPage);
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      const finalFileName = this.resolveOutputFileName();
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = finalFileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      this.showStatus(`PDF "${finalFileName}" procesado con exito. Tu descarga ha comenzado.`, 'success');
    } catch (error: unknown) {
      console.error('Error al procesar los PDFs:', error);
      const mensaje = error instanceof Error ? error.message : String(error);
      this.showStatus(`Ocurrio un error: ${mensaje}`, 'error');
    } finally {
      this.isMerging = false;
      this.cdr.detectChanges();
    }
  }

  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  openAboutDialog(): void {
    this.isAboutDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeAboutDialog(): void {
    this.isAboutDialogOpen = false;
    this.cdr.markForCheck();
  }
}