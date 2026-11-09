# Unión PDF (`union-pdf`)

Herramienta de escritorio para manipulación, unión y reordenamiento de documentos PDF, construida sobre arquitectura híbrida Rust + Tauri v1.5 con frontend en Angular 22 y `@atomic-ui/core`.

---

## ⚡ 1. Ubicación del Ejecutable (.exe) y Compilación Canónica

### ¿Dónde se guarda el ejecutable?
Tras una compilación exitosa en modo release, el binario físico final se genera obligatoriamente en:
```text
C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe
```

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
Test-Path src-tauri\target\release\union-pdf.exe
```

---

## 📚 6. Documentación Adicional

- [CLAUDE.md](CLAUDE.md) - Directrices rápidas de operación para agentes LLM
- [AGENTS.md](AGENTS.md) - Reglas doctrinales, roadmap y arquitectura
- [.agent/ORDEN_DE_OBRA_HERMES.md](.agent/ORDEN_DE_OBRA_HERMES.md) - Orden de obra vinculante para Hermes Agent
- [docs/CONTINUIDAD_AGENTES.md](docs/CONTINUIDAD_AGENTES.md) - Bitácora de continuidad y trazabilidad