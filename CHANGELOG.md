# Changelog

Todos los cambios importantes en este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere al [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Sin publicar] - 2026-11-08 (DOC-20261108-001 / PDFTOOL-20261018-001)

### Fixed
- **Preparación de repositorio Git en rama `main` y Doctrina Sombra (`DOC-20261108-001`):** actualizado `.gitignore` para excluir `/target/` y `*.log` preservando la excepción explícita `!.agent/tauri.conf.historial.log` exigida por el candado `scripts/verificar-tauri-conf.mjs`; sincronizado `src/app/shared/ui/organisms/about-dialog` en `frontend/docs/atomic-provenance.json` bajo `mode: "adapted"` con `adaptationSnapshot` (soporte de iconos e ilustraciones de doctrina `imageUrl` y `bannerImageUrl` en `AboutCreditItem` y cobertura del emblema hero frente al pin `b76f432976d6c1e47de57ee4b4be5821a5195dd8`); incorporada la **Doctrina Sombra (autoría estricta y cero rastros de IA en control de versiones)** en `AGENTS.md` (v1.2.0), `CLAUDE.md`, `HERMES.md`, `.hermes.md` y `.agent/ORDEN_DE_OBRA_HERMES.md` (identidad única `archware <havel363@gmail.com>`, Conventional Commits en minúsculas, cero etiquetas `Co-authored-by:` / `Generated-by:` y preservación de la transparencia de co-ingeniería con IA Agéntica en `<app-about-dialog>`); y reinicializado el repositorio Git en la rama `main` con `core.hooksPath = .githooks` y commit inicial limpio listo para GitHub.
- Icono representativo de escritorio y web para **Editor PDF Studio** (`src-tauri/icons/*` y `frontend/src/favicon.ico`): reemplazado el marcador negro de 1×1 px (70 bytes) por un conjunto completo de iconos RGBA de alta resolución con la paleta de marca (`--brand-primary-500: #4f46e5` / `#3730a3`, `--brand-secondary-500: #0d9488`, hojas apiladas con esquina doblada y cinta carmesí `#ef4444` con tipografía `"PDF"` y glifos pixel-perfect en escalas pequeñas `16×16`..`48×48`), generando `icon.ico` y `favicon.ico` multirresolución de 7 fotogramas ordenados `[32×32, 256×256 (PNG), 128×128, 64×64, 48×48, 24×24, 16×16]` de 32 bits, `icon.png` (`512×512`), `128x128@2x.png` (`256×256`), `128x128.png`, `32x32.png`, `Square*Logo.png`, `StoreLogo.png`, `icon.icns` y registro de `src/favicon.ico` en `frontend/angular.json`, incrustados en los binarios `debug` y `release` de `pdf-tool.exe`.
- Selección de PDF en `#drop-zone` (`.upload-zone`), `FileInputComponent` (`frontend/src/app/shared/ui/atoms/file-input/file-input.component.{ts,spec.ts}` y `frontend/docs/atomic-provenance.json`) y diálogo nativo `Abrir` (`IFileOpenDialog`) en Windows: eliminado el requisito de doble clic en `#drop-zone` / `.drop-zone` y la sensación de arrastre/movimiento al hacer clic sobre un archivo PDF en el diálogo `Abrir`; desactivado en `src-tauri/src/main.rs` (`desactivar_panel_vista_previa_dialogo_windows` / `normalizar_bytes_details_container` / `normalizar_bytes_sizer_panel_vista_previa`) tanto el bit `0x02` (`PreviewPane`) de `DetailsContainer` como el flag `fVisible` (`bytes[4..8] = [0, 0, 0, 0]`) de `ReadingPaneSizer`, `PreviewPaneSizer` y `DetailsContainerSizer` bajo `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\{CIDOpen,CIDSave,}\Modules\GlobalSettings\Sizer` (que mantenía abierto el panel blanco de vista previa de 494 px en `IFileOpenDialog`), y estabilizado en memoria (`SystemParametersInfoW` con `SPI_SETDRAGWIDTH`/`SPI_SETDRAGHEIGHT` y `fWinIni = 0`) el umbral `SM_CXDRAG`/`SM_CYDRAG` de `4×4` px a `48×48` px mientras la aplicación está abierta (restaurando el valor original al cerrar la ventana) para que `DirectUIHWND` responda con un clic firme en lugar de iniciar `SHDoDragDrop` ante micro-movimientos del ratón; en `FileInputComponent` y `app.component.{html,ts}`, dotados `.drop-zone` y `#drop-zone` de `.drop-zone > * { pointer-events: none; }`, `user-select: none; --wails-draggable: no-drag;`, `role="button" tabindex="0"`, guardia `onDragLeave` (`currentTarget.contains(relatedTarget)`) y manejadores `(mousedown)`/`(mouseup)`/`(mouseleave)` con deduplicación frente al `click` sintético junto al `<input type="file">` oculto conectado a `document.body` (`ensureFileInputElement`), garantizando respuesta inmediata al primer clic incluso cuando `wry` (`WM_SETFOCUS` → `MoveFocus(PROGRAMMATIC)`) transfiere el foco al activar la ventana o tras rebotes `focus`→`blur` del diálogo nativo.
- Tarjeta de archivo cargado (`.file-item`), proporción de columnas del editor (`.editor-main`) y amplitud del visor (`.page-workspace`): ajustada la columna izquierda de carga (`.editor-column--left`) a `clamp(320px, 34%, 390px)`, ampliado `.editor-layout` a `max-width: 1680px` y `.page-workspace` a `height: clamp(520px, max(calc(100dvh - 155px), 46vw), 920px)` con `<app-panel variant="elevated" padding="md">` en ambas columnas para que la hoja previsualizada sea más grande y escale proporcionalmente al ensanchar la ventana; reemplazada la etiqueta `<label>` cruda (`Hojas a incluir:`) y `<app-input>` por `<app-floating-input variant="floating" label="Hojas a incluir">` al 100% del ancho disponible (`.page-input-control` con `flex: 1 1 auto; width: 100%; max-width: 100%; min-width: 9.5rem` y sincronización post-microtarea `syncView()` para `NgModel` + `OnPush`) junto al botón `<app-icon-button variant="close-ghost" size="md">` alineado a su extremo derecho sin espacio muerto.
- Estabilidad de renderizado de vista previa PDF en `<canvas>` ante redimensionamiento de ventana (`window:resize`): cancelación explícita de cualquier `RenderTask` en vuelo (`activePreviewRenderTask.cancel()`) y renderizado en un `<canvas>` temporal aislado (`bufferCanvas` con `setTransform(1, 0, 0, 1, 0, 0)`) antes de volcarlo con `drawImage` al `previewCanvas` visible únicamente si `token === this.previewRenderToken`, evitando la inversión o rotación de la hoja cuando dos renders de `pdf.js` concurrían sobre el mismo contexto 2D.
- Coloración semántica, apariencia `gradient` (`appearance="gradient"`), escala de alturas y contraste de botones y superficies en `AppComponent` y sistema de temas: adoptado `@Input() appearance: 'flat' | 'gradient'` (`appearance="gradient"` en acciones principales/contextuales manteniendo `flat` por defecto para conservar las variantes originales), añadido `tone="secondary"` en `ButtonTone`, reemplazadas las variantes grises (`ghost`/`outline` con `tone="neutral"`) por variantes con color semántico de Atomic UI (`variant="danger"` en `Limpiar lista` y `Excluir hoja`, `variant="success"` en `Restaurar hoja`, `variant="secondary"` en `Subir` y `Bajar`, `variant="primary"` en el CTA principal y `variant="close-ghost" size="md"` en `<app-icon-button>` de cada archivo); añadidas alturas explícitas en `.btn-sm` (`var(--control-height-sm)`) y `.btn-lg` (`var(--control-height-lg)`), eliminado el doble espaciado de icono en `button.btn .btn-icon-wrapper`, adoptada la variante `elevated` en `<app-panel>`, corregida la sobreescritura de `.text-primary`/`.text-secondary` y añadido el reset universal `box-sizing: border-box` y `font-family: var(--font-family-base)` en `themes/index.css` tras retirar `@tailwind base` al final de `src/styles.css`.
- Integración funcional, reactividad asíncrona y variante con color de marca (`variant="brand"`) de `<app-scroll-overlay>` (`ScrollOverlayComponent`) en `-Atomic-UI` y `pdf-tool`: preservado el diseño por defecto (`variant="default"`) plomo/gris neutro (`--gray-400`/`--gray-500`) con auto-ocultamiento en reposo (`opacity: 0` en reposo y `opacity: 1` en `:hover` / `.so-scrolling`), e incorporada upstream en `-Atomic-UI` la variante `variant="brand"` (`.so-variant-brand`) con pulgar en gradiente de marca (`--brand-primary-500-rgb` hacia `--brand-secondary-500-rgb`), estados `:hover` (`--primary-color`) y `:active` (`--primary-color-dark`), riel suavemente tintado (`rgba(var(--brand-primary-500-rgb), 0.08)` / `0.14`) y visibilidad en reposo (`opacity: 0.68`), expuesta en los Blueprints (`ShowcaseStructureComponent` y `DialogsPageComponent`), registrada en `catalog/components/scroll-overlay.json` y adoptada en las cuatro regiones desplazables de `AppComponent` (`.editor-scroll-shell`, `.file-list-scroll-overlay`, `.thumbnail-scroll-overlay` y `.preview-stage-scroll-overlay`).
- Backend Tauri: `inspeccionar_archivo_pdf`, `unir_archivos_pdf` y `seleccionar_archivos_pdf` ya no devuelven exito falso; responden `NO_IMPLEMENTADO` mediante `RespuestaSistemaV1` hasta tener implementacion real.
- `app.component.ts`: eliminados los 17 `any` (interfaces para pdf.js, pdf-lib y el modelo de archivos/paginas).
- Retirado el `@keyframes pulse-glow` local (sin uso) de `pdf-tool-styles.css`.
- `tauri.conf.json`: `devPath` alineado con `ng serve --port 1420`.

### Added
- Soporte de arrastre y selección de cualquier imagen compatible (`.png`, `.jpg`, `.jpeg`, `.jfif`, `.pjpeg`, `.pjp`, `.webp`, `.gif`, `.bmp`, `.dib`, `.svg`, `.avif`, `.ico`, `.tif`, `.tiff`, `image/*`) para incorporarla como una hoja más del PDF resultante (`app.component.{ts,html,spec.ts}`, `pdf-tool-styles.css` y filtros de `rfd::FileDialog` en `seleccionar_archivos_pdf` de `src-tauri/src/main.rs`): conversión automática en memoria a una página A4 vertical (`595.28 × 841.89` pt) u horizontal (`841.89 × 595.28` pt) según la relación de aspecto de la imagen, centrada y escalada proporcionalmente sin deformación (incrustación directa con `PDFLib.embedPng`/`embedJpg` tras verificar magic bytes y escaneo multi-segmento `APP1` de orientación EXIF en `hasNonStandardExifOrientation`, y rasterización de respaldo en `<canvas>` con resolución intrínseca de `viewBox` para SVG en `resolveSvgIntrinsicDimensions`, acotamiento de dimensiones `[1600, 4096]` px en `normalizeRasterDimensions` y fondo semántico `--gray-0` para WebP, SVG, GIF, BMP, AVIF, ICO, TIFF o fotografías JPEG con rotación EXIF), entrega de copias `.slice(0)` del `ArrayBuffer` a `pdf.js` (`getFilePdfBuffer`) para evitar el desacoplamiento del buffer al transferirlo al Web Worker, distintivos visuales tokenizados (`.file-item--image`, `.file-icon-box--image`, `fa-file-image` y etiqueta `.thumbnail-badge` con `fa-image`), soporte de soltado tanto en `#drop-zone` como directamente sobre el visor derecho (`.editor-column--right` con indicador `.editor-column--dragover`) e integración completa con miniaturas, vista previa de alta resolución, zoom (`50%`–`300%`), rotación (`-90°` / `+90°`), reordenación (`Subir` / `Bajar`), exclusión/restauración y exportación unificada en `mergeSelectedPDFs()`.
- Diálogo institucional y de créditos **«Acerca de Unión PDF»** (`<app-about-dialog>` sincronizado desde `-Atomic-UI` en `frontend/src/app/shared/ui/organisms/about-dialog/` y registrado bajo `mode: "adapted"` con `adaptationSnapshot` en `frontend/docs/atomic-provenance.json`, pin `b76f432976d6c1e47de57ee4b4be5821a5195dd8`, 66 componentes y 5 servicios verificados por `npm run check:atomic:pin`): accesible mediante el botón `<app-button variant="outline" size="sm" iconClass="fa-solid fa-circle-info">Acerca de</app-button>` en `.header-meta-actions` de `AppComponent`, presentando identidad del producto, versión y runtime dinámicos (`estadoSistema`), autoría principal y posicionamiento de marca personal (`Ing. Havel CONTRERAS TAPAHUASCO (COTAHA · @archware)`, `Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas · COTAHA (@archware · Atomic UI · Artifact Barracuda · Artifact Mangosta)`), transparencia de co-ingeniería con IA Agéntica y DIY AI Lab local (servidor bare-metal Ubuntu Linux con NVIDIA Tesla V100 de 32 GB VRAM, LLMs locales `Qwen3-Coder` / `llama.cpp`, RAG con `SQLite FTS5` y protocolos `MCP/ACP`), tabla de 6 créditos técnicos simétricos (`Autoría Principal` con insignia `COTAHA · @archware`, `Artifact Mangosta` con insignia `Backend Artifact`, `Artifact Barracuda` con insignia `Frontend Artifact`, `Sistema de Diseño` con `Atomic UI (@atomic-ui/core v5.22.0) — Signals & OnPush`, `DIY AI Lab & Co-Ingeniería IA` con insignia `IA Agéntica & Local` y `Multi-Runtime Desktop & Seguridad` con insignia `Multi-Runtime`), stack tecnológico (`Tauri 1.5 + Rust`, `Angular 22 + Signals`, `Atomic UI v5.22.0`, `Artifact Mangosta`, `Artifact Barracuda`, `DIY AI Lab (Local LLM)`, `PDF.js + pdf-lib`, `100% Local`), enlaces externos (`GitHub (@archware)`, `LinkedIn (Ing. Havel Contreras)`, `Repositorio Atomic UI` y `Contacto (havel363@gmail.com)`) y derechos de autor, reservando las doctrinas estrictamente como gobierno interno del ecosistema.
- Integración y consumo de `DesktopFacadeService` en `AppComponent`: consulta el estado del runtime nativo (`obtenerEstadoSistema()`) al inicializar en modo escritorio y suministra el runtime y versión activos (`runtime` y `version`) al diálogo `<app-about-dialog>`, cerrando la deuda técnica de consumo de la fachada IPC tipada sin alterar el procesamiento en memoria del navegador.
- Compuertas canónicas de compilación automatizada: `scripts/verificar-todo.ps1` (PowerShell) y `scripts/verificar-todo.sh` (POSIX Bash) con 7 pasos secuenciales estrictos (Clean Build, `check:atomic:pin`, tipos/angular/theme/css, 308 pruebas Vitest, `ng build`, `cargo test`, `cargo build --release` y verificación física de tamaño `> 0 bytes` de `pdf-tool.exe`), en cumplimiento estricto de los Axiomas 1 a 9.
- `.agent/ORDEN_DE_OBRA_HERMES.md`: directrices vinculantes e inmutables para cualquier agente IA, prohibiendo la modernización arbitraria de esquemas a Tauri v2, la inyección de mocks falsos y la alteración de aserciones de prueba.
- Prueba de frescura obligatoria de la compilacion (`scripts/probar-compilacion.ps1|.sh|.mjs`): ejecuta la compuerta canonica con la salida completa en `src-tauri/target/probar-compilacion.compilacion.log` e imprime solo el bloque de frescura (hora de inicio, hora y SHA-256 del `.exe`, codigo de salida), mostrando las ultimas 40 lineas del log si falla; falla si el `.exe` es anterior al inicio o no existe. Candado de integridad de `src-tauri/tauri.conf.json` (`scripts/verificar-tauri-conf.mjs`, hash canonico en `.agent/tauri.conf.json.sha256` con historial, hook `.githooks/pre-commit` y paso 0 de `verificar-todo`), deteccion de `pdf-tool.exe` en ejecucion antes de compilar y orquestadores de raiz `HERMES.md`, `.hermes.md`, `AGENTS.md` y `CLAUDE.md` con la regla de exito de compilacion (prohibido `cargo tauri build` por CLI v2 incompatible con el runtime v1.5).
- Controles de zoom de vista previa (`previewZoom` entre `50%` y `300%` en pasos de `25%` con botones `-`, porcentaje clicable, `+`, botón `100%` y `Ctrl+rueda` en `.preview-toolbar` / `.page-preview-stage`, escalado nítido en `<canvas>` mediante `renderPageToCanvas` y desplazamiento bidireccional con `<app-scroll-overlay variant="brand" class="so-block preview-stage-scroll-overlay">` y `.preview-stage-canvas-wrap--zoomed { width: max-content; height: max-content }` preservando la posición de scroll entre pasos de zoom `> 100%`), rotación de páginas PDF en pasos de 90° (`-90°` y `+90°` sobre la hoja seleccionada, reflejada en tiempo real en el visor principal, en la miniatura regenerada con etiqueta `.thumbnail-rotation-tag` y persistida en el PDF exportado mediante `PDFLib.degrees` + `copiedPage.setRotation`) y campo `<app-floating-input variant="floating" label="Nombre del archivo PDF resultante" [clearable]="true">` pre-poblado automáticamente al cargar archivos para personalizar el nombre del PDF al guardar/descargar (con extensión `.pdf` garantizada, saneamiento de caracteres inválidos y nombre sugerido automático cuando se deja vacío).
- `frontend/scripts/check-atomic-pin.mjs` y script npm `check:atomic:pin`: ejecuta la compuerta de procedencia contra un clon temporal del `atomicRef` declarado (solo lectura sobre `-Atomic-UI`).
- Cobertura de la regla R10 de `verificar-adn-frontend.ps1` (prohibición de scroll nativo `overflow-y: auto|scroll`, `overflow-x: auto|scroll`, `overflow: auto|scroll` y `::-webkit-scrollbar` fuera de `<app-scroll-overlay>`) y actualización de `AGENTS.md` local.

### Changed
- Renombrado oficial de identidad y ejecutable a **Unión PDF** (`union-pdf.exe` en Windows / `union-pdf` en macOS y Linux) y soporte de publicación multiplataforma en GitHub Releases (`.github/workflows/release.yml`): actualizados `src-tauri/Cargo.toml` (`name = "union-pdf"`), `src-tauri/tauri.conf.json` (`productName: "union-pdf"`, `identifier: "com.archware.union-pdf"`, `title: "Unión PDF"` y matriz completa de iconos multiplataforma `.png`/`.icns`/`.ico` con hash canónico actualizado vía `verificar-tauri-conf.mjs --actualizar`), `src-tauri/src/main.rs`, `frontend/src/index.html`, `frontend/src/app/app.component.{html,spec.ts}`, `scripts/probar-compilacion.mjs` y `scripts/verificar-todo.{ps1,sh}`, más pipeline de GitHub Actions para Windows (`x86_64`), macOS (`aarch64` y `x86_64`) y Linux (`ubuntu-22.04`).
- Simplificación minimalista de la pantalla principal (`frontend/src/app/app.component.{html,spec.ts}` y `frontend/src/styles/pdf-tool-styles.css`): retirados de `.editor-header` el subtítulo descriptivo y las píldoras informativas (`Local & Seguro`, `100% Sin subida a servidores`, `Rápido en memoria` y runtime/versión), así como la insignia `.upload-badge-hint` en `#drop-zone`, el bloque `.info-tip`, el subtítulo `.viewer-subtitle`, los chips promocionales `.empty-state-features` en el visor vacío y sus selectores CSS huérfanos en `pdf-tool-styles.css`, evitando duplicar en la vista de trabajo la información que ya reside en `<app-about-dialog>` («Acerca de») y manteniendo en la cabecera únicamente la identidad `Unión PDF` y el botón `Acerca de`.
- Sincronizadas las hojas de tema (`frontend/src/styles/themes/_fonts.css`, `frontend/src/styles/themes/fonts/*.woff2`, `_forms.css`, `_tokens-components.css`, `_tokens-primitives.css`, `_utilities.css`, `index.css` y `frontend/src/styles.css`) con `-Atomic-UI` (`ATOMIC-20261026-003` y `ATOMIC-20260823-600` corte 3), adoptando tipografía local `Open Sans` y `Quicksand` (`.woff2`), tokens `--font-family-base`/`--font-family-heading`/`--font-family-mono`, `--checkbox-size`, `--checkbox-icon-size`, `--topbar-height` y unidades relativas `rem` en `_utilities.css`, preservando `@import './_tokens-brand-pdf.css'` y `.text-primary`/`.text-secondary` en `index.css`.
- Documentación y metadatos alineados con la instalación real de Angular 22 (3-nov-2026): actualizados `README.md`, `AGENTS.md`, `package.json` (raíz, `description`) y `frontend/src/app/app.component.ts` (etiqueta `Angular 22 + Signals` en el diálogo «Acerca de» y su prueba en `app.component.spec.ts`) conforme a `@angular/core ^22.1.0` en `frontend/package.json`.
- Version del backend Rust unificada en `0.5.1` (`Cargo.toml`, `tauri.conf.json`, `env!("CARGO_PKG_VERSION")` en `main.rs`; antes 0.1.0/0.1.0/0.3.0).
- `DesktopFacadeService`: eliminados los `any` (tipado de `window`).

### Removed
- `git rm` de `frontend/angular.json.tmp`, `frontend/old_native_admin_gui.rs`, `hermes-verify-tauri-config.sh`, `verify-config.sh`, `verify-final-structure.sh`, `verify-setup.sh` y `src-tauri/verify-icon.sh` (sin referencias; recuperables desde el historial).

### Known issues
- `npm run check:atomic` (sin variable) sigue rojo contra el `-Atomic-UI` de trabajo (HEAD `f98a883`): deriva real respecto al pin `67297145`. `npm run check:atomic:pin` corre la misma compuerta contra un checkout limpio del pin (exit 0). La migración del pin sigue abierta: ver `.agents/desviaciones/DESVIACION-20261018-001.md`.
- `DesktopFacadeService` sigue sin consumidores: `app.component.ts` une PDF en el navegador (PDFLib) y los comandos Rust siguen en `NO_IMPLEMENTADO`.
- Pendientes: `frontend/package.json` 1.6.1 (herencia HRA), Tauri v1.5 (Rust) vs `@tauri-apps ^2` (frontend), CSP `null`, `check:contracts` y `sync-version` (restos de otro producto); presupuestos CSS de `scroll-overlay`/`table` excedidos ~200 B y NG0914 en pruebas de `shared/ui` (copia gobernada de Atomic).

## [0.5.1] - 2026-10-13

### Changed
- Normalización de animaciones en botones: los iconos en botones con texto (`Subir`, `Bajar`, `Limpiar lista`) permanecen estáticos por defecto sin rotaciones no solicitadas.
- Estandarización de botones solitarios de acción/cierre: adopción del patrón canónico `IconButtonComponent` con variante `close` (cruz estilizada 'blades') conforme al estándar de Atomic UI.

### Fixed
- Unificación de selectores `.btn-icon` e `.icon-btn` en `_buttons.css` para compatibilidad de transiciones.
- Añadidos `@Input() size` ('sm', 'md', 'lg'), `@Input() title` y accesibilidad por defecto (`aria-label="Cerrar"`) en botones solitarios.
- Suite de pruebas ampliada a 270 pruebas unitarias aprobadas al 100%.

## [0.5.0] - 2026-10-13

### Changed
- Rediseño integral de interfaz ("Editor PDF Studio") empleando componentes semánticos de Atomic UI (`app-panel`, `app-button`, `app-input`).
- Migración de la paleta de colores corporativos a Electric Indigo (primario) y Ocean Teal (secundario) a través de tokens CSS puros.
- Eliminación de colores en duro (Hex/RGB/nombres) en estilos locales, adoptando variables semánticas (`--brand-primary-500-rgb`, `--danger-color-light`, etc.).
- Depuración de la carpeta residual `frontend_temp` para mantener el árbol de trabajo higiénico.

### Added
- Suite de pruebas unitarias exhaustiva para `AppComponent` (`app.component.spec.ts`) con 26 pruebas nuevas (258 pruebas unitarias frontend en total aprobadas al 100%).
- Recompilación optimizada del ejecutable de producción `pdf-tool.exe` incorporando el nuevo diseño.

## [0.4.0] - 2026-10-13

### Added
- Frontera IPC nativa bajo `contracts/` utilizando la especificación canónica `RespuestaSistemaV1<T>`.
- Servicio de fachada `DesktopFacadeService` en Angular (`frontend/src/app/core/desktop-facade.service.ts`) con pruebas unitarias dedicadas.
- Comandos nativos Tauri en Rust (`src-tauri/src/main.rs`): `obtener_estado_sistema`, `inspeccionar_archivo_pdf`, `unir_archivos_pdf` y `seleccionar_archivos_pdf`.
- 7 pruebas unitarias en Rust (`cargo test`) y 232 pruebas unitarias en frontend (`ng test` / Vitest).
- Tokens de marca y estilos visuales en `frontend/src/styles/pdf-tool-styles.css` y `_tokens-brand-pdf.css`.

### Fixed
- Superación de las 8 compuertas de verificación con trazabilidad Atomic UI y cero violaciones.
- Cierre formal de todas las fases del roadmap `PDFTOOL-DESKTOP-20261012-001.md`.

## [0.3.0] - 2026-10-12

### Added
- Migración completa de frontend a Angular 22 usando componentes semánticos de Atomic UI basados en Signals.
- Suite de pruebas unitarias Vitest (26 suites, 223 tests pasando al 100%).
- Catálogo de procedencia de componentes de diseño (`docs/atomic-provenance.json`).
- Generación de binario de producción `pdf-tool.exe` mediante Rust + Tauri v1.5.

### Changed
- Configuración de `distDir` en `tauri.conf.json` apuntando a `../frontend/dist/pdf-tool/browser`.
- Adaptación de escáner de secretos en PowerShell para manejo granular de claves privadas.

### Fixed
- Regularización de procedencia Atomic UI en 65 componentes y 5 servicios.
- Corrección de scripts e icono nativo `icon.ico` para resolución sin pánico en compilador de recursos Windows (RC.EXE).

## [0.2.0] - 2026-10-12

### Added
- Estructura básica del proyecto para migración a aplicación de escritorio
- Roadmap formal en `.agent/roadmaps/PDFTOOL-DESKTOP-20261012-001.md`
- Documento de continuidad de agentes
- Directorios `src-tauri`, `frontend`, `contracts` y `docs`

### Changed
- Configuración inicial para migración a Rust + Tauri v2 + Angular

### Fixed
- Estructura del proyecto según las normativas del ecosistema

## [0.1.0] - 2026-10-12

### Added
- Archivo AGENTS.md con especificaciones del proyecto
- Plantilla de roadmap
- Estructura inicial del proyecto

[Unreleased]: https://github.com/cotaha/pdf-tool/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/cotaha/pdf-tool/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cotaha/pdf-tool/releases/tag/v0.1.0
