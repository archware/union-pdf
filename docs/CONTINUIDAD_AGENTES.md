# Continuidad de agentes - pdf-tool

## 1. Propósito

Este documento tiene como propósito documentar la continuidad de los agentes que trabajan en el proyecto `pdf-tool`, asegurando que cualquier agente que tome el control del proyecto tenga la información necesaria para continuar el trabajo sin interrupciones.

## 2. Estructura del proyecto

El proyecto sigue la estructura definida en AGENTS.md:

```
pdf-tool/
  src-tauri/                        # Runtime Rust/Tauri
  frontend/                         # Angular + Atomic UI
    src/app/core/desktop-facade.service.ts
  contracts/                        # Esquemas y tipos IPC
  docs/
    CONTINUIDAD_AGENTES.md
  .agent/
    roadmaps/
```

## 3. Estado actual del proyecto

El proyecto `pdf-tool` opera como aplicación de escritorio híbrida en Rust + Tauri con frontend Angular 22 y `@atomic-ui/core`.

### Ventana de cortes recientes

- **`DOC-20261108-001` (2026-11-08):**
  - Incorporada la **Doctrina Sombra (autoría estricta y cero rastros de IA en control de versiones)** en `AGENTS.md` (v1.2.0), `CLAUDE.md`, `HERMES.md`, `.hermes.md` y `.agent/ORDEN_DE_OBRA_HERMES.md`: toda operación de confirmación autorizada (`git commit`) se registra exclusivamente a nombre de `archware <havel363@gmail.com>` con Conventional Commits en minúsculas (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`) y cero etiquetas `Co-authored-by:` / `Generated-by:`, ejecutando o entregando los comandos sin prosa explicativa, mientras se preserva intacta la divulgación de co-ingeniería con IA Agéntica en la interfaz gráfica (`<app-about-dialog>`).
  - Endurecido `.gitignore` para excluir `/target/` y `*.log` preservando la excepción explícita `!.agent/tauri.conf.historial.log` exigida por el candado `scripts/verificar-tauri-conf.mjs`; actualizado `src/app/shared/ui/organisms/about-dialog` en `frontend/docs/atomic-provenance.json` a `mode: "adapted"` con su `adaptationSnapshot` (soporte de iconos e ilustraciones de doctrina `imageUrl` y `bannerImageUrl` en `AboutCreditItem` y cobertura del emblema hero frente al pin `b76f432976d6c1e47de57ee4b4be5821a5195dd8`); y reinicializado el repositorio Git en la rama `main` con `core.hooksPath = .githooks` y commit inicial limpio bajo `archware <havel363@gmail.com>`, listo para publicar en GitHub.
- **`ATOMIC-20261026-003` y `ATOMIC-20260823-600` (corte 3) (2026-10-26):**
  - Sincronizadas las hojas de tema (`frontend/src/styles/themes/_fonts.css`, `frontend/src/styles/themes/fonts/*.woff2`, `_forms.css`, `_tokens-components.css`, `_tokens-primitives.css`, `_utilities.css`, `index.css` y `frontend/src/styles.css`) con `-Atomic-UI`, adoptando las 12 fuentes locales `.woff2` (`Open Sans` y `Quicksand`), los tokens tipográficos (`--font-family-base`, `--font-family-heading`, `--font-family-mono`), `--checkbox-size`, `--checkbox-icon-size`, `--topbar-height` y las unidades relativas `rem` en `_utilities.css`, preservando la importación de marca `@import './_tokens-brand-pdf.css'` y los colores semánticos de `.text-primary`/`.text-secondary` en `index.css`. La carpeta `frontend/src/app/shared/ui/` mantiene su pin gobernado bajo `DESVIACION-20261018-001` (`npm run check:atomic:pin`).
- **`PDFTOOL-20261018-001` (2026-10-18):**
  - Variante canónica con color de marca `variant="brand"` (`.so-variant-brand`) en `<app-scroll-overlay>` creada upstream en `-Atomic-UI` (expuesta en `ShowcaseStructureComponent` y `DialogsPageComponent`, y registrada en `catalog/components/scroll-overlay.json`) y adoptada en `pdf-tool` con degradado `--brand-primary-500-rgb` a `--brand-secondary-500-rgb`, estados `:hover` (`--primary-color`) y `:active` (`--primary-color-dark`), riel suavemente tintado y visibilidad en reposo (`opacity: 0.68`), preservando intacta la variante por defecto (`variant="default"`) plomo/gris auto-ocultable.
  - Zoom de vista previa PDF (`previewZoom` entre `50%` y `300%` en pasos de `25%` y `Ctrl+ rueda` con desplazamiento bidireccional gobernado mediante `<app-scroll-overlay variant="brand" class="so-block preview-stage-scroll-overlay">` y `.preview-stage-canvas-wrap--zoomed { width: max-content; height: max-content }`), rotación de hojas PDF en pasos de 90° (`-90°` y `+90°` reflejados en el visor, en la miniatura con etiqueta `.thumbnail-rotation-tag` y en el PDF exportado mediante `PDFLib.degrees` + `copiedPage.setRotation`) y campo `<app-floating-input variant="floating" label="Nombre del archivo PDF resultante" [clearable]="true">` pre-poblado automáticamente al cargar archivos para personalizar el nombre del PDF al guardar/descargar.
  - Campo `<app-floating-input variant="floating" label="Hojas a incluir">` al 100% del ancho disponible (`flex: 1 1 auto; width: 100%; max-width: 100%`) junto a `<app-icon-button variant="close-ghost" size="md">` en `.page-select-container`, ampliación del visor principal y renderizado aislado en `bufferCanvas` con cancelación de `activePreviewRenderTask` ante `window:resize`.
  - Icono representativo para **Editor PDF Studio** en `src-tauri/icons/` (`icon.ico` multirresolución de 7 capas `[32, 256, 128, 64, 48, 24, 16]` con glifos `"PDF"` pixel-perfect en escalas pequeñas, `icon.png` `512×512`, `128x128@2x.png`, `128x128.png`, `32x32.png`, `Square*Logo.png`, `StoreLogo.png`, `icon.icns`) y `frontend/src/favicon.ico` (registrado en `frontend/angular.json`), incrustado en el recurso PE `RT_GROUP_ICON` (`32512`) y en `default_window_icon` de `pdf-tool.exe` (`debug` y `release`).
  - Sincronizado desde `-Atomic-UI` (`ATOMIC-20261103-001`, pin `b76f432976d6c1e47de57ee4b4be5821a5195dd8`) el organismo canónico `<app-about-dialog>` (`frontend/src/app/shared/ui/organisms/about-dialog/`, registrado en `frontend/docs/atomic-provenance.json` en `mode: "adapted"` con `adaptationSnapshot` para soporte de iconos e ilustraciones de artefacto `imageUrl`/`bannerImageUrl`, rol por defecto `Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas` y emblema hero) e integrado en `AppComponent` mediante el botón `<app-button variant="outline" size="sm" iconClass="fa-solid fa-circle-info">Acerca de</app-button>` en `.header-meta-actions`, presentando autoría principal y marca personal (`Ing. Havel CONTRERAS TAPAHUASCO (COTAHA · @archware)`, `Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas · COTAHA (@archware · Atomic UI · Artifact Barracuda · Artifact Mangosta)`), transparencia de co-ingeniería con IA Agéntica y DIY AI Lab local (servidor bare-metal Ubuntu Linux con NVIDIA Tesla V100 de 32 GB VRAM, LLMs locales `Qwen3-Coder` / `llama.cpp`, RAG con `SQLite FTS5` y protocolos `MCP/ACP`), tabla de 6 créditos técnicos (**Artifact Mangosta** con insignia `Backend Artifact`, **Artifact Barracuda** con insignia `Frontend Artifact`, `@atomic-ui/core v5.22.0`, `Autoría Principal`, `DIY AI Lab & Co-Ingeniería IA` y `Multi-Runtime Desktop & Seguridad`), stack tecnológico (`Tauri 1.5 + Rust`, `Angular 22 + Signals`, `Atomic UI v5.22.0`, `Artifact Mangosta`, `Artifact Barracuda`, `DIY AI Lab (Local LLM)`, `PDF.js + pdf-lib`, `100% Local`), enlaces externos (`GitHub (@archware)`, `LinkedIn (Ing. Havel Contreras)`, `Repositorio Atomic UI` y `Contacto (havel363@gmail.com)`) y derechos de autor, reservando las doctrinas como gobierno interno del proyecto.
  - Blindaje del elemento de carga (`#drop-zone` / `.upload-zone` y `FileInputComponent` en `frontend/src/app/shared/ui/atoms/file-input/file-input.component.{ts,spec.ts}` con hashes actualizados en `frontend/docs/atomic-provenance.json`) y del diálogo nativo `Abrir` (`IFileOpenDialog`) en Windows al seleccionar archivos PDF o imágenes: desactivación en `src-tauri/src/main.rs` (`desactivar_panel_vista_previa_dialogo_windows` / `normalizar_bytes_details_container` / `normalizar_bytes_sizer_panel_vista_previa`) del bit `0x02` (`PreviewPane`) en `DetailsContainer` y del flag `fVisible` (`bytes[4..8] = [0, 0, 0, 0]`) en `ReadingPaneSizer`, `PreviewPaneSizer` y `DetailsContainerSizer` bajo `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\{CIDOpen,CIDSave,}\Modules\GlobalSettings\Sizer`, junto con la estabilización en memoria (`SystemParametersInfoW` con `SPI_SETDRAGWIDTH`/`SPI_SETDRAGHEIGHT` a `48` px y `fWinIni = 0`, re-aplicada en `WindowEvent::Focused` y restaurada al cerrar la ventana con `restaurar_umbral_arrastre_windows` y `calcular_umbral_arrastre_inicial`) del umbral `SM_CXDRAG`/`SM_CYDRAG` (`4×4` px por defecto) para evitar que un clic de selección en `DirectUIHWND` inicie `SHDoDragDrop`; en `FileInputComponent` y `app.component.{html,ts}`, `.drop-zone` y `#drop-zone` incorporan `.drop-zone > * { pointer-events: none; }`, `user-select: none; --wails-draggable: no-drag;`, `role="button" tabindex="0"`, guardia `onDragLeave` (`currentTarget.contains(relatedTarget)`) y manejadores `(mousedown)`/`(mouseup)`/`(mouseleave)` con deduplicación frente al `click` sintético y seguimiento de `hasFileDialogBlurred`, garantizando apertura al primer clic incluso ante cancelación rápida (`< 800 ms`), transferencia de foco `WM_SETFOCUS` → `MoveFocus(PROGRAMMATIC)` de `wry`/WebView2 o rebotes `focus`→`blur` al cerrar el diálogo nativo.
  - Soporte de arrastre y selección de cualquier imagen compatible (`.png`, `.jpg`, `.jpeg`, `.jfif`, `.pjpeg`, `.pjp`, `.webp`, `.gif`, `.bmp`, `.dib`, `.svg`, `.avif`, `.ico`, `.tif`, `.tiff`, `image/*`) para colocarla como una hoja adicional del PDF resultante (`AppComponent` y filtros nativos `rfd::FileDialog` en `seleccionar_archivos_pdf` de `src-tauri/src/main.rs`): conversión automática en memoria a una página A4 vertical (`595.28 × 841.89` pt) u horizontal (`841.89 × 595.28` pt) según su relación de aspecto, centrada y escalada proporcionalmente (incrustación directa `embedPng`/`embedJpg` con verificación de magic bytes y escaneo multi-segmento `APP1` de orientación EXIF en `hasNonStandardExifOrientation`, y rasterización de respaldo en `<canvas>` con resolución intrínseca de `viewBox` para SVG en `resolveSvgIntrinsicDimensions`, acotamiento de dimensiones `[1600, 4096]` px en `normalizeRasterDimensions` y fondo semántico `--gray-0` para WebP, SVG, GIF, BMP, AVIF, ICO, TIFF o JPEG con rotación EXIF), entrega de copias `.slice(0)` del `ArrayBuffer` a `pdf.js` (`getFilePdfBuffer`), soporte de soltado tanto en `#drop-zone` como en `.editor-column--right` (con indicador visual `.editor-column--dragover`) e integración completa con miniaturas, vista previa, zoom, rotación, reordenación, exclusión y exportación unificada en `mergeSelectedPDFs()`.
  - Simplificada la pantalla principal (`frontend/src/app/app.component.{html,spec.ts}` y `frontend/src/styles/pdf-tool-styles.css`) a un diseño minimalista que elimina la información duplicada con el diálogo `<app-about-dialog>` («Acerca de»): retirados de `.editor-header` el subtítulo descriptivo y las píldoras informativas (`Local & Seguro`, `100% Sin subida a servidores`, `Rápido en memoria` y runtime/versión), así como la insignia `.upload-badge-hint`, el bloque `.info-tip`, el subtítulo `.viewer-subtitle`, los chips promocionales `.empty-state-features` del estado vacío y sus selectores CSS huérfanos en `pdf-tool-styles.css`, dejando en la barra superior únicamente el emblema y título `Unión PDF` junto al botón `Acerca de` (que centraliza la descripción, versión/runtime desde `DesktopFacadeService.obtenerEstadoSistema()`, insignias de privacidad/rendimiento y créditos).
  - Renombrado oficial de marca y ejecutable a **Unión PDF** (`union-pdf.exe` en Windows / `union-pdf` en macOS y Linux) en `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` (`productName: "union-pdf"`, `identifier: "com.archware.union-pdf"`, título `"Unión PDF"` e iconos multiplataforma `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, con hash canónico actualizado en `.agent/tauri.conf.json.sha256` y `.agent/tauri.conf.historial.log`), `src-tauri/src/main.rs`, `frontend/src/index.html`, `frontend/src/app/app.component.{html,spec.ts}` y scripts de verificación (`probar-compilacion.mjs`, `verificar-todo.{ps1,sh}`, `build.{ps1,bat}`), e incorporado el pipeline `.github/workflows/release.yml` para compilación y publicación automática en GitHub Releases sobre Windows (`x86_64`), macOS (`aarch64` Apple Silicon y `x86_64` Intel) y Linux (`x86_64` `.deb` / `.AppImage`).
  - Compuerta `npm run check:atomic:pin` en verde (política `1.2.3`, 66 componentes, 5 servicios), 323 pruebas unitarias Vitest aprobadas (31 suites), 16 pruebas unitarias Rust (`cargo test`) y binario `union-pdf.exe` actualizado.

## 4. Comprensión de los pasos completados y pendientes

### 4.1 Roadmaps registrados
- [x] `.agent/roadmaps/PDFTOOL-DESKTOP-20261012-001.md`
- [x] `.agent/roadmaps/PDFTOOL-20261018-001.md`

### 4.2 Estructura del proyecto
- [x] Directorio `src-tauri` con comandos IPC tipados bajo `RespuestaSistemaV1<T>`
- [x] Directorio `frontend` con Angular 22, Atomic UI y `DesktopFacadeService`
- [x] Directorio `contracts` con esquemas y tipos IPC
- [x] Directorio `docs` con `CONTINUIDAD_AGENTES.md` y `atomic-provenance.json`

### 4.3 Deuda técnica abierta documentada en `PDFTOOL-20261018-001`
- Migración gobernada del pin de `-Atomic-UI` (`DESVIACION-20261018-001`), verificada actualmente mediante `npm run check:atomic:pin`.
- `inspeccionar_archivo_pdf`, `unir_archivos_pdf` y `seleccionar_archivos_pdf` están implementados en Rust (`lopdf` + `rfd` en `src-tauri/src/main.rs`), mientras `AppComponent` ejecuta la conversión de imágenes y fusión interactiva en memoria con `PDFLib` + `pdf.js` y consume `DesktopFacadeService.obtenerEstadoSistema()` para `<app-about-dialog>`.

## 5. Compuertas de verificación y compilación

- **Ubicación Canónica del Binario Release (.exe):**
  `C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe`
- **Comandos Canónicos Directos desde la Raíz:**
  - `npm run build` (NPM raíz)
  - `.\build.bat` (Batch Windows)
  - `.\build.ps1` (PowerShell raíz)
  - `cargo build --release` (Cargo Workspace raíz)
  - `./build-exe.sh` (POSIX / Git Bash)
- **Script Canónico Unificado Oficial (Axiomas 1 al 9):**
  - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/verificar-todo.ps1`
  - POSIX Bash: `./scripts/verificar-todo.sh`
- **Regla Estructural de Construcción:**
  En proyectos híbridos Tauri, el frontend Angular DEBE compilarse antes que el backend Rust. Prohibido alterar `src-tauri/tauri.conf.json` ante errores de empaquetado. El script `src-tauri/build.rs` auto-compila el frontend si falta.
- Frontend individual: `npm run check:atomic:pin`, `npm test -- --watch=false`, `npm run build`
- ADN Frontend: `& C:\Users\cotaha\source\repos\.agents\scripts\verificar-adn-frontend.ps1 -RaizAAuditar C:\Users\cotaha\source\repos\pdf-tool`
- Runtime Rust: `cargo test`, `cargo build --release`
- Directrices obligatorias para agentes: `HERMES.md` / `.hermes.md` y `.agent/ORDEN_DE_OBRA_HERMES.md`

### 5.1 Prueba de frescura y candado de `tauri.conf.json`

- **Prueba de frescura (obligatoria para afirmar que se compiló):** `powershell -ExecutionPolicy Bypass -File scripts/probar-compilacion.ps1` (o `bash scripts/probar-compilacion.sh`). Ejecuta la compuerta canónica y falla (código ≠ 0) si la compilación falla (1), el `.exe` no existe (2), es anterior al inicio de la compilación (3), conserva el mismo hash pese a cambios de fuente (4) o `tauri.conf.json` pierde integridad (5). El agente solo puede declarar éxito pegando el bloque literal `===== INICIO PRUEBA DE FRESCURA … FIN PRUEBA DE FRESCURA =====`; cualquier discrepancia se reporta como FALLO sin explicarla.
- **Candado de `src-tauri/tauri.conf.json`:** hash canónico en `.agent/tauri.conf.json.sha256` (historial en `.agent/tauri.conf.historial.log`), verificado por `node scripts/verificar-tauri-conf.mjs`, por el paso `[0/7]` de `scripts/verificar-todo.*` y por el hook `.githooks/pre-commit` (instalar una vez por clon con `scripts/instalar-hooks.ps1` o `sh scripts/instalar-hooks.sh`).
- **Cambio legítimo del hash** (solo con autorización explícita del usuario; nunca por un error de compilación): `node scripts/verificar-tauri-conf.mjs --actualizar --motivo "razón del cambio"` y commit conjunto de `src-tauri/tauri.conf.json`, `.agent/tauri.conf.json.sha256` y `.agent/tauri.conf.historial.log`.
- **Ante un fallo del candado:** `git checkout HEAD -- src-tauri/tauri.conf.json` y reportar. Prohibido editar el archivo.
- Pruebas de esta lógica: `node --test "scripts/tests/*.test.mjs"`.

## 6. Notas importantes

- El proyecto sigue las reglas doctrinales obligatorias especificadas en `AGENTS.md` (`DOCTRINA_MAESTRA_UNIFICADA.md`, `ESTANDAR_DOCUMENTAL_AGENTES.md` y `PROMPT_MAESTRO_CONTINUIDAD_AGENTES.md`).
- Se debe mantener el uso exclusivo de `<app-scroll-overlay>` para regiones desplazables (regla R10) y `DesktopFacadeService` para comunicaciones IPC.
- Todos los contratos técnicos deben estar en ASCII, en español y con claves estables (`CHANGELOG.md`, `LESSONS_LEARNED.md`).
- **Doctrina Sombra en control de versiones:** Cuando el dueño autorice ejecutar `git commit` o generar scripts de control de versiones, toda operación usa exclusivamente la identidad `archware <havel363@gmail.com>` con Conventional Commits en minúsculas y cero etiquetas `Co-authored-by:` / `Generated-by:`; la mención de co-ingeniería con IA Agéntica se reserva a la transparencia en la interfaz gráfica (`<app-about-dialog>`).