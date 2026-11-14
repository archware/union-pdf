# Unión PDF (`union-pdf`)

Suite corporativa de escritorio para manipulación, unión, rotación, extracción y reordenamiento visual de documentos PDF e imágenes, diseñada como **demostrador de ingeniería empresarial** para acreditar cómo el acoplamiento entre el ecosistema propio de Backend (**Artifact Mangosta** — DDD, Arquitectura Hexagonal y CQRS estricto sobre Rust + Tauri v1.5) y el ecosistema propio de Frontend (**Artifact Barracuda** + **`@atomic-ui/core` v5.22.0** sobre Angular 22 + Signals) genera aplicaciones nativas multiplataforma de calidad industrial, 100% en memoria local y auditadas por compuertas deterministas.

---

## ⚡ 1. Origen, Ubicación y Formato de los Ejecutables Compilados (Windows, macOS y Linux)

### ¿De dónde salen los ejecutables y dónde se encuentran?
El proyecto compila primero la distribución de producción del frontend Angular (`frontend/dist/pdf-tool/browser`) y a continuación ejecuta `cargo build --release --manifest-path src-tauri/Cargo.toml` (Tauri v1.5 + Rust), que **incrusta todos los activos del frontend dentro de un único binario nativo autónomo (standalone executable)**:

1. **En compilación local (desde el código fuente en Windows):**
   Tras ejecutar la compuerta canónica (`scripts/probar-compilacion.ps1`, `scripts/verificar-todo.ps1` o `.\build.ps1`), el binario físico final se genera en:
   ```text
   C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe
   ```
2. **En compilación automatizada por Pipeline CI/CD (GitHub Actions → GitHub Releases):**
   El flujo [`.github/workflows/release.yml`](.github/workflows/release.yml) ejecuta primero las compuertas de calidad (`verificar-compuertas`) y luego compila en paralelo sobre runners oficiales de Windows, macOS y Linux (`publicar-release`), copiando cada binario nativo a `release-portables/`, calculando su suma criptográfica `.sha256` y publicándolo en:
   - **GitHub Releases oficial:** [`https://github.com/archware/union-pdf/releases`](https://github.com/archware/union-pdf/releases)

### Matriz de Binarios Compilados por Plataforma y Nota sobre Extensiones

| Sistema Operativo / Arquitectura | Ruta de origen generada por `cargo build --release` | Artefacto publicado en GitHub Releases (`release-portables/`) | Formato del ejecutable y por qué lleva (o no) extensión |
| :--- | :--- | :--- | :--- |
| **Windows (`x86_64`)** | `src-tauri/target/release/union-pdf.exe` | `union-pdf-windows-x86_64.exe` (+ `.sha256`) | **Binario nativo PE64 con extensión `.exe`**, icono multirresolución de 7 capas y frontend embebido. Ejecución directa en Windows. |
| **macOS Apple Silicon (`arm64` · M1/M2/M3/M4)** | `src-tauri/target/aarch64-apple-darwin/release/union-pdf` | `union-pdf-macos-arm64` (+ `.sha256`) | **Binario nativo autónomo Mach-O 64-bit (`arm64`) sin extensión `.app`**. Es el ejecutable UNIX puro producido por Cargo/Tauri con el frontend embebido (sin carpeta envolvente `.app`). Se ejecuta otorgando permiso: `chmod +x union-pdf-macos-arm64 && ./union-pdf-macos-arm64`. |
| **macOS Intel (`x86_64`)** | `src-tauri/target/x86_64-apple-darwin/release/union-pdf` | `union-pdf-macos-x86_64` (+ `.sha256`) | **Binario nativo autónomo Mach-O 64-bit (`x86_64`) sin extensión `.app`**. Ejecutable UNIX directo con activos embebidos. Se ejecuta con: `chmod +x union-pdf-macos-x86_64 && ./union-pdf-macos-x86_64`. |
| **Linux (`x86_64`)** | `src-tauri/target/release/union-pdf` | `union-pdf-linux-x86_64` (+ `.sha256`) | **Binario nativo autónomo ELF 64-bit (`x86_64`) sin extensión**. Ejecutable UNIX estándar enlazado a GTK3 / WebKit2GTK con el frontend embebido. Se ejecuta con: `chmod +x union-pdf-linux-x86_64 && ./union-pdf-linux-x86_64`. |

> **¿Por qué en macOS y Linux los compilados no tienen extensión `.app` ni `.exe`?**
> En arquitecturas UNIX/POSIX (macOS y Linux), los binarios ejecutables nativos compilados por `cargo build --release` no llevan extensión de archivo (`.exe` es exclusivo del formato PE de Windows y `.app` en macOS es una estructura de directorios opcional tipo *Application Bundle*). El pipeline genera directamente el **ejecutable nativo autónomo (Mach-O en macOS y ELF en Linux)** con el frontend Angular 22 + Atomic UI incrustado en el propio binario, demostrando que tanto el Backend (**Artifact Mangosta**) como el Frontend (**Artifact Barracuda**) compilan de forma nativa y limpia en los tres sistemas operativos.

### ¿Cómo compilar el proyecto? (Comandos Canónicos en la Raíz)
Para compilar la aplicación, verificar el pin de Atomic UI, correr las pruebas unitarias (Vitest y Cargo) y generar el ejecutable release, ejecuta **cualquiera** de los siguientes comandos desde la raíz del repositorio:

- **Desde PowerShell:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/verificar-todo.ps1
  # O directamente:
  .\build.ps1
  ```
- **Desde CMD / Windows Batch:**
  ```cmd
  build.bat
  ```
- **Desde Node.js / NPM (raíz):**
  ```bash
  npm run build
  ```
- **Desde Cargo / Rust (raíz):**
  ```bash
  cargo build --release
  ```
- **Desde Git Bash / POSIX Shell:**
  ```bash
  ./build-exe.sh
  # O:
  ./scripts/verificar-todo.sh
  ```

---

## 🛑 2. Regla Técnica Inviolable: NUNCA Modificar `tauri.conf.json`

> **ADVERTENCIA CRÍTICA PARA AGENTES DE IA Y DESARROLLADORES:**
>
> 1. **El proyecto utiliza estrictamente Tauri v1.5** (declarado en `src-tauri/Cargo.toml` como `tauri = { version = "1.5" }`).
> 2. **QUEDA TERMINANTEMENTE PROHIBIDO modificar, migrar o convertir `src-tauri/tauri.conf.json` a la sintaxis de Tauri v2.**
> 3. **Orden de Compilación Híbrida:** En Tauri, el backend de Rust empaqueta la carpeta de distribución del frontend (`distDir: "../frontend/dist/pdf-tool/browser"`).
>    - Si ejecutas `cargo build` en `src-tauri` sin haber compilado previamente el frontend de Angular, el compilador fallará indicando que `distDir` no existe o reportando error en `tauri.conf.json`.
>    - **ESTO NO ES UN ERROR DE CONFIGURACIÓN.** No modifiques `tauri.conf.json`. Simplemente ejecuta la compuerta canónica (`.\build.bat` o `scripts/verificar-todo.ps1`), la cual limpia y compila el frontend antes de compilar Rust.

---

## 🏗️ 3. Estructura del Proyecto

```text
pdf-tool/
  .github/
    workflows/
      release.yml                   # Pipeline CI/CD multiplataforma (Windows, macOS, Linux)
  package.json                      # Scripts de compilación y verificación en la raíz
  build.bat                         # Acceso directo para compilación en Windows
  build.ps1                         # Acceso directo para PowerShell
  build-exe.sh                      # Acceso directo para Git Bash / POSIX
  scripts/
    verificar-todo.ps1              # Compuerta canónica oficial (7 pasos)
    verificar-todo.sh               # Compuerta canónica oficial POSIX
  src-tauri/                        # Backend nativo Rust / Tauri v1.5
    Cargo.toml
    tauri.conf.json                 # Configuración protegida v1.5
    src/main.rs                     # Handlers IPC y lógica de fusión con lopdf
    target/release/union-pdf.exe    # <--- BINARIO FINAL
  frontend/                         # Frontend Angular 22 + Atomic UI
    package.json
    src/app/core/desktop-facade.service.ts
    src/app/shared/ui/              # Componentes gobernados por pin Atomic UI
  contracts/                        # Esquemas y contratos DTO IPC
  docs/
    CONTINUIDAD_AGENTES.md          # Bitácora técnica y cortes de continuidad
    RELEASE_PROCESS.md              # Proceso de lanzamiento y matriz de compilados
  .agent/
    ORDEN_DE_OBRA_HERMES.md         # Directrices vinculantes para agentes
    roadmaps/                       # Planes y seguimiento de cambios
```

---

## 🛠️ 4. Tecnologías, Artefactos de Ingeniería y Runtimes

- **Runtime de escritorio:** Rust + Tauri v1.5 (Multi-Runtime Desktop)
- **Artifact Mangosta (`Backend Artifact`):** Arquitectura Hexagonal, DDD, CQRS estricto y frontera IPC determinista (`DesktopFacadeService` + `RespuestaSistemaV1<T>`).
- **Artifact Barracuda (`Frontend Artifact`):** Chasis Frontend Reactivo con Signals, `ChangeDetectionStrategy.OnPush` y consumo puro de `@atomic-ui/core` v5.22.0.
- **Manipulación de PDFs e imágenes nativa/en memoria:** `lopdf` v0.35 + `PDF.js` + `pdf-lib` (100% local, cero telemetría).
- **Selector de archivos nativo:** `rfd` v0.15
- **Frontend:** Angular 22 + `@atomic-ui/core` (Zoneless, Signals)
- **Suite de pruebas:** Vitest (frontend) + Cargo test (backend)
- **Compuerta de calidad:** Pin gobernado de Atomic UI (`check:atomic:pin`), CSS tokens, y verificación física de binario (`> 0 bytes`).

---

## ⚡ 5. Autoría, Ecosistema & DIY AI Lab

- **Autor Principal:** **Ing. Havel CONTRERAS TAPAHUASCO (`COTAHA · @archware`)** — *Arquitecto de Software | DIY AI Lab | Creador de Ecosistemas*.
- **Co-Ingeniería IA & DIY AI Lab:** Desarrollado e inspeccionado en laboratorio bare-metal autohospedado (Ubuntu Linux + GPU NVIDIA Tesla V100 de 32 GB VRAM) combinando inferencia 100% local (`Qwen3-Coder` con `llama.cpp`), sistemas RAG (`SQLite FTS5`), protocolos `MCP/ACP` y orquestación de agentes especializados bajo los artefactos **Artifact Mangosta**, **Artifact Barracuda** y **Atomic-UI**.
- **Contacto & Redes:** [GitHub (`@archware`)](https://github.com/archware) · [LinkedIn](https://www.linkedin.com/in/havel-contreras-tapahuasco-70a109167/) · [havel363@gmail.com](mailto:havel363@gmail.com)

---

## 📋 6. Compuertas Mínimas y Verificación Manual Paso a Paso

Si por alguna razón necesitas compilar paso a paso manualmente:

```powershell
# Paso 1: Compilar frontend Angular
cd frontend
npm run check:atomic:pin
npm run build
cd ..

# Paso 2: Compilar backend Rust Release
cd src-tauri
cargo test
cargo build --release
cd ..

# Paso 3: Verificar existencia del binario físico
Test-Path src-tauri\\target\\release\\union-pdf.exe
```

## 🚀 7. Activación Manual del Workflow de Lanzamiento

Para activar el workflow de publicación multiplataforma:

1. **Acceder a GitHub:**
   - Navegar a https://github.com/archware/union-pdf
   - Ir a la pestaña "Actions"

2. **Ejecutar el workflow:**
   - Seleccionar "Release Multiplataforma (Windows, macOS, Linux)"
   - Hacer clic en "Run workflow" y confirmar

3. **Verificar ejecución:**
   - Confirmar que todos los jobs se completan exitosamente
   - Verificar que los artefactos son publicados en GitHub Releases

**Nota:** El workflow requiere activación manual desde la interfaz web de GitHub debido a limitaciones del entorno de ejecución.

---

## 📚 8. Documentación Adicional

- [CLAUDE.md](CLAUDE.md) - Directrices rápidas de operación para agentes LLM
- [AGENTS.md](AGENTS.md) - Reglas doctrinales, roadmap y arquitectura
- [.agent/ORDEN_DE_OBRA_HERMES.md](.agent/ORDEN_DE_OBRA_HERMES.md) - Orden de obra vinculante para Hermes Agent
- [docs/CONTINUIDAD_AGENTES.md](docs/CONTINUIDAD_AGENTES.md) - Bitácora de continuidad y trazabilidad
- [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) - Proceso de lanzamiento y matriz de compilados multiplataforma
- [.github/workflows/release.yml](.github/workflows/release.yml) - Pipeline CI/CD multiplataforma (Windows, macOS y Linux)
