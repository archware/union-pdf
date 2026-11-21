# Continuidad de agentes - pdf-tool

## 1. Propósito

Este documento tiene como propósito documentar la continuidad de los agentes que trabajan en el proyecto `pdf-tool`, asegurando que cualquier agente que tome el control del proyecto tenga la información necesaria para continuar el trabajo sin interrupciones.

## 2. Estructura del proyecto

El proyecto sigue la estructura definida en AGENTS.md:

```
pdf-tool/
  .github/
    workflows/
      release.yml                   # Pipeline CI/CD multiplataforma (Windows, macOS, Linux)
  src-tauri/                        # Runtime Rust/Tauri
  frontend/                         # Angular + Atomic UI
    src/app/core/desktop-facade.service.ts
  contracts/                        # Esquemas y tipos IPC
  docs/
    CONTINUIDAD_AGENTES.md
    RELEASE_PROCESS.md              # Proceso de lanzamiento y matriz de compilados
  .agent/
    roadmaps/
```

## 3. Estado actual del proyecto

El proyecto `pdf-tool` opera como aplicación de escritorio híbrida en Rust + Tauri con frontend Angular 22 y `@atomic-ui/core`.

### Validacion acotada de scripts, 10 de noviembre de 2026 (America/Lima)

`validarEstructura` comprueba los tipos de objetos y `build.distDir`, y conserva
mensajes ASCII incluso si el JSON invalido contiene Unicode. Mantiene el formato
previo de los errores ya ASCII y no modifica `tauri.conf.json` ni sus hashes.
Verificacion: `node --test scripts/tests/gobernanza.test.mjs scripts/tests/validar-estructura.test.mjs`,
16 pruebas originales y 6 regresiones correctas; evaluacion aislada adicional,
49/49 casos. Son pruebas unitarias de scripts, no una compilacion de la aplicacion,
una prueba del ejecutable ni una validacion visual. No se instalaron dependencias.

### Ventana de cortes recientes

- **`PDFTOOL-20261018-001` (2026-11-20 — Release `v1.0.0`: cierre corporativo integral con guardado nativo IPC, drag & drop de miniaturas, atajos de teclado, modo claro/oscuro, limpieza de repositorio, portada ejecutiva + licencia MIT y CSP explícita):**
  - Configurada la ventana principal de Tauri v1.5 en `src-tauri/tauri.conf.json` a `1280×820` centrada (`minWidth: 960`, `minHeight: 640`), activada una `Content-Security-Policy` explícita compatible con Tauri v1.5 (`tauri:` / `https://tauri.localhost` / `ipc:` / `http://ipc.localhost`), `pdf.js` (`worker-src`/`child-src 'self' blob:` sin `'unsafe-eval'`), miniaturas `data:`/`blob:`, iconos FontAwesome y fuentes `.woff2` locales, y unificada la versión `1.0.0` en `package.json`, `frontend/package.json`, `frontend/package-lock.json`, `src-tauri/Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` (con actualización oficial del candado en `.agent/tauri.conf.json.sha256` y `.agent/tauri.conf.historial.log`), `frontend/src/app/app.component.{html,spec.ts}`, `.github/workflows/release.yml` y `docs/RELEASE_PROCESS.md`.
  - Cerrada la frontera IPC nativa en `contracts/generated/{rust,typescript}/contracts.*`, `frontend/contracts/generated/typescript/contracts.ts`, `src-tauri/src/main.rs` y `frontend/src/app/core/desktop-facade.service.{ts,spec.ts}` incorporando `guardar_archivo_pdf` (`rfd::FileDialog::save_file()`, decodificador Base64 RFC 4648 autónomo, validación `%PDF` y anexado seguro de `.pdf`) y `abrir_archivo_pdf` (validando firma `%PDF` antes de abrir el visor del sistema), consumidos por `AppComponent.mergeSelectedPDFs()` y `openLastSavedPdf()` con botón `Abrir PDF` y respaldo automático de descarga en navegador fuera de Tauri.
  - Añadidos reordenamiento por arrastre de miniaturas (`onThumbnailDragStart`/`Over`/`Drop` y `movePageToTarget`), atajos rápidos de teclado (`←`/`→`, `R`, `Delete`, `Ctrl+S`/`Cmd+S` con guardias de foco en inputs y modales) y conmutador minimalista Modo Claro/Oscuro (`<app-icon-button class="theme-toggle-btn" animation="none">` en `.header-meta-actions` sincronizando `data-theme`, `.dark`, `localStorage` y `prefers-color-scheme`).
  - Purgados con `git rm` 56 archivos heredados ajenos a Unión PDF (`frontend/database/`, `frontend/admin-recovery.product.json`, `frontend/.hra/`, `frontend/src/assets/doctrinas/*.jpg`, `unir_pdfs.html`, `assets/` raíz y scripts/locks huérfanos HRA en `frontend/scripts/` y `frontend/contracts/`), limpiados los scripts huérfanos de `frontend/package.json`, formalizada `LICENSE` bajo licencia `MIT` (`© 2026 Ing. Havel CONTRERAS TAPAHUASCO — COTAHA · @archware · SSIT Consulting`) y enriquecido `README.md` con badges en vivo y enlaces directos de descarga multiplataforma.
- **`ATOMIC-20261118-002` (2026-11-19 — Release `v0.5.4`: rediseño minimalista de certificados/firmas, pie de copyright en `<app-about-dialog>` y corrección del binario de Linux):**
  - Incrementada la versión del producto a `0.5.4` en `package.json`, `src-tauri/Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` (con actualización oficial del hash canónico en `.agent/tauri.conf.json.sha256` y `.agent/tauri.conf.historial.log`), `frontend/src/app/app.component.{html,spec.ts}`, `.github/workflows/release.yml` y `docs/RELEASE_PROCESS.md` para publicar el Release `v0.5.4` en GitHub Releases.
  - Sincronizada desde `-Atomic-UI` la colección minimalista de 9 imágenes de firmas y sellos de marca sin marcos dobles ni anillos dentados (`frontend/src/assets/artefactos/{ssit-consulting-emblem,ssit-consulting-cert,archware-signature-cert,artifact-mangosta-cert,artifact-mangosta-seal,artifact-barracuda-cert,artifact-barracuda-seal,atomic-ui-cert,diy-ai-lab-cert}.jpg`) y la actualización minimalista de `AboutDialogComponent` (`frontend/src/app/shared/ui/organisms/about-dialog/`: entrada `creditsTitle`, modificador `.about-credit-item--seal` limpio y `copyrightText` por defecto `'© 2026 · @archware · SSIT Consulting. Todos los derechos reservados.'` manteniendo el CSS compilado bajo `6.00 kB`), actualizando `localSha256` en `frontend/docs/atomic-provenance.json`.
  - Actualizado `<app-about-dialog>` en `frontend/src/app/app.component.{ts,html,spec.ts}` con leyendas concisas no redundantes en las 6 placas (`SSIT Consulting`, `Autoría Principal`, `Artifact Mangosta`, `Artifact Barracuda`, `Atomic UI` y `DIY AI Lab`) y pie de derechos de autor minimalista `© 2026 · @archware · SSIT Consulting. Todos los derechos reservados.`.
  - Corregido el binario de Linux en `src-tauri/src/main.rs` (`configurar_entorno_webkit_linux` / `resolver_valor_dmabuf_linux` y `resolver_restauracion_ld_library_path_linux` con `WEBKIT_DISABLE_DMABUF_RENDERER=1`, restauración de `LD_LIBRARY_PATH` para subprocesos y pruebas unitarias `18/18` en `cargo test`), en `scripts/linux-launcher.c` y en `.github/workflows/release.yml` empaquetando `union-pdf` como ejecutable ELF 64-bit auto-contenido `ET_EXEC` (`-no-pie -Wl,-z,noexecstack`, ejecutable con doble clic en gestores de archivos Linux) con selección atómica de familia ABI `libwebkit2gtk-4.1.so.0` → `libwebkit2gtk-4.0.so.37` (`libjavascriptcoregtk-4.1.so.0` → `4.0.so.18` y `libsoup-3.0.so.0` → `2.4.so.1`) para Ubuntu 22.04 y Ubuntu 24.04+ y cadena de fallback `/tmp` → `$XDG_CACHE_HOME` → `$HOME/.cache` → `/var/tmp` ante montajes `noexec`, verificado en contenedores Linux (`ubuntu:24.04` / `node:24-bookworm`), `npm run check:atomic:pin` (`66` componentes y `5` servicios, `0` violaciones), `327/327` pruebas Vitest (`31` suites), `verificar-adn-frontend.ps1` y `scripts/probar-compilacion.ps1` (`RESULTADO : EXITO`).
- **`ATOMIC-20261113-001` (2026-11-14 — Releases `v0.5.2` y `v0.5.3`):**
  - Incrementada la versión del producto a `0.5.3` en `package.json`, `src-tauri/Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` (con actualización oficial del hash canónico en `.agent/tauri.conf.json.sha256` y `.agent/tauri.conf.historial.log`), `frontend/src/app/app.component.{html,spec.ts}`, `.github/workflows/release.yml` y `docs/RELEASE_PROCESS.md`, e incorporado en `.github/workflows/release.yml` el empaquetado nativo con extensión por plataforma para GitHub Releases: en Windows el ejecutable PE64 `union-pdf-windows-x86_64.exe`; en macOS (`arm64` Apple Silicon y `x86_64` Intel) la construcción del Application Bundle `union-pdf.app` (`Contents/Info.plist` validado con `plutil -lint`, `Contents/PkgInfo`, `Contents/MacOS/union-pdf` con `chmod 755`, `Contents/Resources/icon.icns` y firma ad-hoc `codesign --force --deep --sign -`) empaquetado en `union-pdf-macos-arm64.app.tar.gz` y `union-pdf-macos-x86_64.app.tar.gz`; y en Linux (`x86_64`) el empaquetado del binario ELF `union-pdf` con permisos `0755` en `union-pdf-linux-x86_64.tar.gz`, todos acompañados de su suma `.sha256`.
  - Actualizado el diálogo **«Acerca de Unión PDF»** (`frontend/src/app/app.component.{ts,html,spec.ts}`), `README.md`, `.github/workflows/release.yml` y `docs/RELEASE_PROCESS.md` con enfoque corporativo orientado a demostrar que la integración entre el Backend propio (**Artifact Mangosta**) y el Frontend propio (**Artifact Barracuda** + **Atomic UI**) produce aplicaciones nativas de calidad empresarial, detallando de dónde salen y dónde se publican los ejecutables y paquetes compilados (`src-tauri/target/release/` y `https://github.com/archware/union-pdf/releases` vía GitHub Actions con `.sha256`).
  - Sincronizados desde `-Atomic-UI` `<app-about-dialog>` y la corrección de cascada `brand-dark` en `_tokens-semantic.css` y `_tokens-components.css`, verificando `npm run check:atomic:pin` en verde (política `1.2.3`, `66` componentes y `5` servicios, `0` violaciones), `325/325` pruebas Vitest, `verificar-adn-frontend.ps1` y `git diff --check`.

## 4. Comprensión de los pasos completados y pendientes

### 4.1 Roadmaps registrados
- [x] `.agent/roadmaps/PDFTOOL-DESKTOP-20261012-001.md`
- [x] `.agent/roadmaps/PDFTOOL-20261018-001.md` (estado: `completado` en `v1.0.0`)

### 4.2 Estructura del proyecto
- [x] Directorio `src-tauri` con comandos IPC tipados bajo `RespuestaSistemaV1<T>` (`obtener_estado_sistema`, `seleccionar_archivos_pdf`, `unir_archivos_pdf`, `guardar_archivo_pdf`, `abrir_archivo_pdf`), ventana `1280×820` centrada y `CSP` explícita
- [x] Directorio `frontend` con Angular 22, Atomic UI, modo Claro/Oscuro y `DesktopFacadeService`
- [x] Directorio `contracts` con esquemas y tipos IPC en ASCII y español
- [x] Directorio `docs` con `CONTINUIDAD_AGENTES.md`, `RELEASE_PROCESS.md` y `SECURITY_CHECKLIST.md`

### 4.3 Notas de seguimiento gobernado
- Migración futura opcional del pin de `-Atomic-UI` (`DESVIACION-20261018-001`), verificada íntegramente mediante `npm run check:atomic:pin` (`0` violaciones).
- `AppComponent` ejecuta la conversión de imágenes y fusión interactiva en memoria con `PDFLib` + `pdf.js` y consume `DesktopFacadeService.obtenerEstadoSistema()`, `DesktopFacadeService.guardarArchivoPdf()` y `DesktopFacadeService.abrirArchivoPdf()` en escritorio nativo Tauri (con respaldo automático en navegador).

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
