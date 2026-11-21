# Unión PDF (`union-pdf`)

[![Pipeline CI/CD Multiplataforma](https://github.com/archware/union-pdf/actions/workflows/release.yml/badge.svg)](https://github.com/archware/union-pdf/actions/workflows/release.yml)
[![Release](https://img.shields.io/github/v/release/archware/union-pdf?label=Release&color=4f46e5)](https://github.com/archware/union-pdf/releases/tag/v1.0.0)
[![Plataformas](https://img.shields.io/badge/Plataformas-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-0d9488)](https://github.com/archware/union-pdf/releases/latest)
[![Stack](https://img.shields.io/badge/Stack-Rust%20%2B%20Tauri%20%C2%B7%20Angular%2022%20%2B%20Atomic%20UI-3730a3)](https://github.com/archware/-Atomic-UI)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-0f766e)](LICENSE)

Suite corporativa de escritorio para manipulación, unión, rotación, extracción y reordenamiento visual de documentos PDF e imágenes, diseñada como **demostrador de ingeniería empresarial (`v1.0.0`)** para acreditar cómo el acoplamiento entre el ecosistema propio de Backend (**Artifact Mangosta** — DDD, Arquitectura Hexagonal y frontera IPC determinista `DesktopFacadeService` + `RespuestaSistemaV1<T>` sobre Rust + Tauri v1.5) y el ecosistema propio de Frontend (**Artifact Barracuda** + **`@atomic-ui/core` v5.22.0** sobre Angular 22 + Signals) genera aplicaciones nativas multiplataforma de calidad industrial, **100% en memoria local**, sin telemetría ni subida a servidores externos, y auditadas por compuertas deterministas.

---

## 📥 Descarga Directa — Release `v1.0.0` (Windows · macOS · Linux)

Todos los paquetes se compilan y publican automáticamente desde código fuente mediante [GitHub Actions](https://github.com/archware/union-pdf/actions/workflows/release.yml) acompañados de su firma criptográfica `.sha256` en [**GitHub Releases (`v1.0.0`)**](https://github.com/archware/union-pdf/releases/tag/v1.0.0):

| Plataforma / Arquitectura | Descarga Directa | Checksum SHA-256 | Formato Nativo y Ejecución |
| :--- | :--- | :--- | :--- |
| **Windows (`x86_64`)** | [**`union-pdf-windows-x86_64.exe`**](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-windows-x86_64.exe) | [`.sha256`](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-windows-x86_64.exe.sha256) | **Ejecutable portable PE64 (`.exe`)** con iconos multirresolución de 7 capas y frontend embebido. Doble clic directo sin instalador. |
| **macOS Apple Silicon (`arm64` · M1/M2/M3/M4)** | [**`union-pdf-macos-arm64.app.tar.gz`**](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-arm64.app.tar.gz) | [`.sha256`](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-arm64.app.tar.gz.sha256) | **Application Bundle nativo (`union-pdf.app` Mach-O 64-bit `arm64`)** con `Info.plist`, `icon.icns` y firma ad-hoc. Descomprimir con doble clic (o `tar -xzf union-pdf-macos-arm64.app.tar.gz`) y abrir `union-pdf.app`. |
| **macOS Intel (`x86_64`)** | [**`union-pdf-macos-x86_64.app.tar.gz`**](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-x86_64.app.tar.gz) | [`.sha256`](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-x86_64.app.tar.gz.sha256) | **Application Bundle nativo (`union-pdf.app` Mach-O 64-bit `x86_64`)** con `Info.plist`, `icon.icns` y firma ad-hoc. Descomprimir con doble clic (o `tar -xzf union-pdf-macos-x86_64.app.tar.gz`) y abrir `union-pdf.app`. |
| **Linux (`x86_64`)** | [**`union-pdf-linux-x86_64.tar.gz`**](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-linux-x86_64.tar.gz) | [`.sha256`](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-linux-x86_64.tar.gz.sha256) | **Binario ELF 64-bit auto-contenido (`ET_EXEC` `-no-pie`, `union-pdf`, `0755`)** compatible con Ubuntu 22.04 / 24.04+, Debian, Fedora, Arch y Mint (puente automático `libwebkit2gtk-4.1` ↔ `4.0` y `WEBKIT_DISABLE_DMABUF_RENDERER=1`). Extraer y abrir con doble clic o `tar -xzf union-pdf-linux-x86_64.tar.gz && ./union-pdf`. |

---

## ✨ Funcionalidades Principales (`v1.0.0`)

- **Guardado nativo real («Guardar como…») por IPC Rust:** diálogo del sistema operativo (`rfd::FileDialog::save_file`) a través de `DesktopFacadeService.guardarArchivoPdf()` con validación binaria `%PDF`, anexado seguro de extensión `.pdf`, acción inmediata **«Abrir PDF»** con el visor predeterminado del sistema y respaldo automático de descarga en navegador fuera de Tauri.
- **Unión híbrida de documentos PDF e imágenes:** arrastra o selecciona archivos `.pdf` junto con imágenes (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`, `.avif`, `.ico`, `.tif`, `.tiff`), convertidas automáticamente en memoria a páginas A4 verticales u horizontales centradas y escaladas sin deformación (con lectura de orientación EXIF).
- **Organizador visual interactivo con Drag & Drop de miniaturas:** reordena hojas arrastrando y soltando directamente sus miniaturas (además de los controles `Subir` y `Bajar`), filtra rangos de páginas por documento (`Ej: 1-3, 5`), excluye o restaura hojas con doble clic y previsualiza en alta nitidez con zoom de `50%` a `300%` (`Ctrl + rueda`) y rotación en pasos de `±90°`.
- **Atajos rápidos de teclado:**
  - `←` / `→` — Cambiar a la hoja anterior o siguiente (cuando el foco no está en un campo de texto ni hay un modal abierto).
  - `R` — Rotar `+90°` la hoja seleccionada.
  - `Delete` (`Supr`) — Excluir o restaurar la hoja seleccionada.
  - `Ctrl + S` / `Cmd + S` — Unir y guardar el documento PDF resultante.
- **Modo Claro / Oscuro con tokens semánticos Atomic UI:** conmutador instantáneo en la barra superior sincronizado con `data-theme="light|dark"`, persistencia en `localStorage` y detección inicial de `prefers-color-scheme`, sobre ventana nativa amplia y centrada (`1280×820`, mínimo `960×640`).
- **Privacidad total y seguridad endurecida:** procesamiento 100% local sin red externa, `Content-Security-Policy` explícita en Tauri v1.5 y validación estricta de cabeceras `%PDF` en los comandos nativos.

---

## ⚡ 1. Arquitectura de Compilación Híbrida y Trazabilidad de Binarios

El proyecto compila primero la distribución de producción del frontend Angular (`frontend/dist/pdf-tool/browser`) y a continuación ejecuta `cargo build --release --manifest-path src-tauri/Cargo.toml` (Tauri v1.5 + Rust), que **incrusta todos los activos del frontend dentro de un único binario nativo autónomo**:

1. **En compilación local (desde el código fuente en Windows):**
   Tras ejecutar la compuerta canónica (`scripts/probar-compilacion.ps1`, `scripts/verificar-todo.ps1` o `.\build.ps1`), el binario físico final se genera en:
   ```text
   C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe
   ```
2. **En compilación automatizada por Pipeline CI/CD (GitHub Actions → GitHub Releases):**
   El flujo [`.github/workflows/release.yml`](.github/workflows/release.yml) ejecuta primero las compuertas de calidad (`verificar-compuertas`) y luego compila en paralelo sobre runners oficiales de Windows, macOS (`arm64` + `x86_64`) y Linux (`publicar-release`), generando sumas `.sha256` y publicando los 8 artefactos en [`https://github.com/archware/union-pdf/releases`](https://github.com/archware/union-pdf/releases).

### Comandos Canónicos de Compilación en la Raíz

- **PowerShell (compuerta con prueba de frescura):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/probar-compilacion.ps1
  # O compuerta de verificación directa:
  powershell -ExecutionPolicy Bypass -File scripts/verificar-todo.ps1
  ```
- **CMD / Windows Batch:**
  ```cmd
  build.bat
  ```
- **Node.js / NPM (raíz):**
  ```bash
  npm run build
  ```
- **Git Bash / POSIX Shell:**
  ```bash
  ./scripts/verificar-todo.sh
  ```

---

## 🛑 2. Regla Técnica de Integridad: Candado sobre `tauri.conf.json`

1. **El proyecto utiliza estrictamente Tauri v1.5** (`tauri = { version = "1.5" }` en `src-tauri/Cargo.toml`), protegido por el candado criptográfico `scripts/verificar-tauri-conf.mjs` (`.agent/tauri.conf.json.sha256`).
2. **Orden de compilación híbrida:** el backend de Rust empaqueta `distDir: "../frontend/dist/pdf-tool/browser"`. Siempre compila el frontend antes que Rust mediante `npm run build` o `scripts/verificar-todo.ps1`.

---

## 🏗️ 3. Estructura del Proyecto

```text
pdf-tool/
  .github/
    workflows/
      release.yml                   # Pipeline CI/CD multiplataforma (Windows, macOS, Linux)
  package.json                      # Scripts de compilación, versión 1.0.0 y licencia MIT
  LICENSE                           # Licencia MIT (@archware · SSIT Consulting)
  build.bat / build.ps1 / build-exe.sh
  scripts/
    probar-compilacion.ps1          # Prueba de frescura canónica del ejecutable
    verificar-tauri-conf.mjs        # Candado SHA-256 de src-tauri/tauri.conf.json
    verificar-todo.ps1 / .sh        # Compuerta canónica oficial (7 pasos)
    linux-launcher.c                # Lanzador ELF auto-contenido ET_EXEC para Linux
  src-tauri/                        # Backend nativo Rust / Tauri v1.5
    Cargo.toml
    tauri.conf.json                 # Ventana 1280x820 centrada + CSP explícita v1.5
    src/main.rs                     # Comandos IPC (guardar_archivo_pdf, abrir_archivo_pdf, lopdf, rfd)
    target/release/union-pdf.exe    # Binario nativo Windows
  frontend/                         # Frontend Angular 22 + Atomic UI
    package.json
    src/app/core/desktop-facade.service.ts
    src/app/shared/ui/              # Componentes gobernados por pin Atomic UI
  contracts/                        # Esquemas y contratos DTO IPC (RespuestaSistemaV1<T>)
  docs/
    CONTINUIDAD_AGENTES.md          # Bitácora técnica y cortes de continuidad
    RELEASE_PROCESS.md              # Proceso de lanzamiento y matriz de compilados
    SECURITY_CHECKLIST.md           # Lista de verificación de seguridad de release
```

---

## 🛠️ 4. Tecnologías, Artefactos de Ingeniería y Runtimes

- **Runtime de escritorio:** Rust + Tauri v1.5 (`rfd` v0.15 + `lopdf` v0.35)
- **Artifact Mangosta (`Backend Artifact`):** Arquitectura Hexagonal, DDD y frontera IPC determinista (`DesktopFacadeService` + `RespuestaSistemaV1<T>`).
- **Artifact Barracuda (`Frontend Artifact`):** Chasis Frontend Reactivo sobre Angular 22 + Signals + `@atomic-ui/core` v5.22.0.
- **Motor documental en memoria:** `PDF.js` + `pdf-lib` + `lopdf` (100% local, cero telemetría).
- **Suite de pruebas y compuertas:** Vitest (frontend) + `cargo test` & `cargo clippy -D warnings` (backend) + `check:atomic:pin` + `verificar-adn-frontend.ps1` (reglas R1–R10).

---

## ⚡ 5. Autoría, Ecosistema & Licencia

- **Autor Principal:** **Ing. Havel CONTRERAS TAPAHUASCO (`COTAHA · @archware`)** — *Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas · SSIT Consulting*.
- **Co-Ingeniería IA & DIY AI Lab:** Desarrollado e inspeccionado en laboratorio bare-metal autohospedado (Ubuntu Linux + GPU NVIDIA Tesla V100 de 32 GB VRAM) combinando inferencia local (`Qwen3-Coder` / `llama.cpp`), sistemas RAG (`SQLite FTS5`), protocolos `MCP/ACP` y orquestación de agentes especializados bajo los artefactos **Artifact Mangosta**, **Artifact Barracuda** y **Atomic UI**.
- **Licencia:** Distribuido bajo la [Licencia MIT](LICENSE) (`© 2026 · @archware · SSIT Consulting`).
- **Contacto & Redes:** [GitHub (`@archware`)](https://github.com/archware) · [Releases](https://github.com/archware/union-pdf/releases) · [LinkedIn](https://www.linkedin.com/in/havel-contreras-tapahuasco-70a109167/) · [havel363@gmail.com](mailto:havel363@gmail.com)

---

## 📚 6. Documentación Técnica y Gobierno

- [AGENTS.md](AGENTS.md) — Reglas doctrinales, arquitectura y compuertas
- [CLAUDE.md](CLAUDE.md) — Directrices rápidas de operación
- [.agent/ORDEN_DE_OBRA_HERMES.md](.agent/ORDEN_DE_OBRA_HERMES.md) — Orden de obra vinculante
- [docs/CONTINUIDAD_AGENTES.md](docs/CONTINUIDAD_AGENTES.md) — Bitácora de continuidad y trazabilidad
- [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) — Proceso de lanzamiento multiplataforma
- [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) — Checklist de seguridad pre y post-release
