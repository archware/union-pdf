---
title: "AGENTS de pdf-tool"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-10-12"
last_updated: "2026-11-08"
document_type: "instrucción para agentes"
version: "1.2.0"
status: "vigente"
change_id: "DOC-20261108-001"
desktop_doctrine: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\DOCTRINA_ESCRITORIO.md"
canonical_doctrine: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\DOCTRINA_MAESTRA_UNIFICADA.md"
documentary_standard: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\ESTANDAR_DOCUMENTAL_AGENTES.md"
---

# AGENTS - pdf-tool

Este archivo define las reglas operativas y la arquitectura de `pdf-tool`,
aplicación de escritorio sobre Tauri v1.5 + Rust nativo y Angular + `@atomic-ui/core`,
gobernada por la doctrina de escritorio (`DOCTRINA_ESCRITORIO.md`).

<!-- regla-exito-compilacion:v1 -->
## Regla de éxito de compilación (prueba de frescura obligatoria)

1. **Un "éxito" de compilación solo vale si cita la salida literal y completa del script de frescura**: el bloque que va de `===== INICIO PRUEBA DE FRESCURA` a `===== FIN PRUEBA DE FRESCURA =====`, generado por `scripts/probar-compilacion.ps1` (PowerShell) o `scripts/probar-compilacion.sh` (POSIX), con la línea `RESULTADO` en `EXITO` y `codigo_salida_prueba` en `0`. Sin ese bloque pegado tal cual, la compilación NO está demostrada: no digas "compiló", "el .exe es válido" ni cites un `.exe` anterior como prueba.
2. **Toda discrepancia es un FALLO y no se explica.** Si el script devuelve código distinto de 0, o muestra un `.exe` anterior al inicio de la compilación, un `.exe` inexistente, o un hash sin cambio pese a cambios de fuente, reporta `FALLO` con la salida literal. Está prohibido racionalizarlo ("reloj mal configurado", "el .exe de ayer es válido", "caché", "zona horaria"). No reinterpretes fechas ni hashes.
3. **Prohibido editar `src-tauri/tauri.conf.json` ante un error de compilación**: reporta el error literal y DETENTE. El archivo está protegido por un hash canónico (`.agent/tauri.conf.json.sha256`) que verifican `scripts/verificar-todo.*` (paso 0) y el hook `pre-commit`. Si el candado falla, restaura con `git checkout HEAD -- src-tauri/tauri.conf.json` y reporta. Solo el usuario puede autorizar un cambio legítimo, mediante `node scripts/verificar-tauri-conf.mjs --actualizar --motivo "..."`.
4. **Nunca fabriques, copies, resumas ni edites esa salida**, ni crees scripts ad-hoc que imiten su formato.
5. **PROHIBIDO `cargo tauri build`, `cargo tauri dev`, `npx tauri` y `npm run tauri`.** El CLI de Tauri instalado en esta estacion es **v2** (tauri-cli 2.x), pero el proyecto usa el runtime **v1.5**. El CLI v2 rechaza el `tauri.conf.json` v1 con errores falsos ("devPath, distDir, package y tauri no permitidos", "identifier requerido"). **Ese error NO indica que el archivo este mal**: indica que usaste el CLI equivocado. No lo "arregles": no edites `tauri.conf.json`, no lo recrees y no migres a v2. Para compilar usa SOLO `npm run build` (desde la raiz) o `powershell -ExecutionPolicy Bypass -File scripts/probar-compilacion.ps1`; el binario sale de `cargo build --release` y NO requiere el CLI de Tauri.
6. **Distinción obligatoria ante fallos y Protocolo de Pensamiento Profundo y Reparación estilo Codex:**
   - **Caso A — Bloqueo de infraestructura o candado (DETENERSE):** Si falla el candado de `tauri.conf.json` (código 5), el archivo `pdf-tool.exe` está bloqueado en memoria por un proceso en ejecución o falta una herramienta del sistema (`rustc`, `node`, `cargo`), reporta la salida literal una sola vez y **DETÉN** el trabajo inmediatamente sin tocar `tauri.conf.json`.
   - **Caso B — Error de compilación o tests en código fuente (DIAGNOSTICAR Y REPARAR):** Si el fallo proviene del código fuente en `tsc`, `ng build`, `cargo check`, `cargo build`, `vitest` o `pytest`, aplica el **Protocolo de Pensamiento Profundo y Reparación estilo Codex**: (a) **PROHIBIDO** repetir el mismo comando de compilación sin haber editado antes el código; (b) usa `read_file` / `search_files` para leer las líneas exactas del archivo indicado por el compilador y revisar las firmas/tipos en los contratos o archivos importados; (c) formula explícitamente tu análisis antes de editar (**Causa raíz**, **Archivos afectados** y **Cambio mínimo quirúrgico**); y (d) aplica la corrección con `patch` o `write_file` y vuelve a ejecutar la verificación hasta obtener `RESULTADO : EXITO`. Una vez que `npm run build` o `probar-compilacion` termina en `EXITO`, la compilación está hecha: detente inmediatamente y no ejecutes ningún otro comando de compilación después.
7. **El terminal es Git Bash y CONSERVA el directorio entre comandos.** Nunca uses `cd ..` ni rutas relativas: cada `cd ..` se acumula y te saca del repositorio (en una sesion real acabaste en `...\source\repos` y `...\source`, y `npm run build` fallo con `ENOENT package.json`). Empieza SIEMPRE con ruta absoluta: `cd /c/Users/cotaha/source/repos/pdf-tool && npm run build`. Un `.ps1` no se ejecuta con `./scripts/x.ps1` (bash falla con `syntax error`): usa `powershell -ExecutionPolicy Bypass -File "C:\Users\cotaha\source\repos\pdf-tool\scripts\verificar-todo.ps1"`.
<!-- /regla-exito-compilacion:v1 -->

<!-- verificacion-proporcional:v1 -->
## Verificación proporcional y publicación (pdf-tool / union-pdf)

1. **Tipo de cambio → verificación.** Solo `.github/workflows/*.yml`: parser YAML (`python -c "import sys,yaml; yaml.safe_load(open(sys.argv[1],encoding='utf-8'))" .github/workflows/release.yml`), `actionlint` si existe, y revisar `git diff`; NO corras `verificar-todo`, `npm run build`, `npm test` ni `probar-compilacion` (no validan el workflow y cuestan minutos). Solo `*.md`/docs: `git diff` y el linter documental. Compuerta completa (`scripts/verificar-todo.ps1` o `probar-compilacion.ps1`, una sola vez, citando su bloque de frescura) únicamente si cambió código Rust/Angular, contratos o configuración de build.
2. **GitHub Actions: dentro de `${{ }}` solo existen comillas simples.** `github.ref_type == 'tag'` es válido; `"tag"` o `\"tag\"` produce `Unexpected symbol`. El valor YAML que envuelve la expresión usa comillas dobles (`name: "Unión PDF ${{ ... 'tag' ... }}"`). Escapar más una comilla que ya falla no arregla nada: relee la línea real con `sed -n '174p'` y corrige la causa.
3. **Commit ≠ tag.** Un tag (`v0.5.1`) apunta a UN commit y el push de un tag ejecuta el `release.yml` DE ESE COMMIT. Corregir `release.yml` en `main` NO cambia lo que ejecuta un tag ya publicado. Para publicar con el YAML corregido: ejecutar `workflow_dispatch` eligiendo la RAMA `main` (no el tag) con `tag_version`, o —solo con autorización explícita del usuario— publicar un tag nuevo. Mover o borrar un tag publicado (`git tag -f`, `git push --force`) está prohibido sin autorización y `--force` está en `approvals.deny`.
4. **No declares "publicado" ni "release listo" sin ver el run de Actions** (URL o `gh run list`). Sin `gh` ni acceso web di "NO VERIFICADO" y pide al usuario el resultado del run; no descargues ni instales `gh` ni uses `sudo`/`apt` desde Git Bash en Windows.
5. **Confirmación obligatoria** antes de `taskkill`, `git config --global`, `git push`, crear/mover tags y `git pull` con merge sobre `main`. Si `git push` es rechazado (non-fast-forward), informa y espera: no hagas merge automático.
<!-- /verificacion-proporcional:v1 -->

## 1) Decision de stack (fijada y gobernada)

- **Runtime de escritorio:** Rust + Tauri v1.5 (Tauri 1.5.x estricto. PROHIBIDO alterar src-tauri/tauri.conf.json a Tauri v2).
- **Frontend:** Angular 22 + @atomic-ui/core.
- **Ubicación del binario compilado (.exe):**
  `C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe`
- **Comandos canónicos de compilación directa desde la raíz:**
  - `npm run build` (NPM raíz)
  - `.\build.bat` (Batch Windows)
  - `.\build.ps1` (PowerShell raíz)
  - `cargo build --release` (Cargo Workspace raíz)
  - `& "C:\Users\cotaha\source\repos\pdf-tool\scripts\verificar-todo.ps1"` (Compuerta canónica completa en PowerShell)
  - `./build-exe.sh` (POSIX / Git Bash)
  *(Regla de oro: En proyectos híbridos, el frontend siempre se compila antes que el backend Rust. NUNCA modificar tauri.conf.json ante fallos de empaquetado).*

## 2) Reglas doctrinales obligatorias para este proyecto

1. Angular solo se comunica con el runtime por `DesktopFacadeService`.
2. Toda operacion IPC nueva responde `RespuestaSistemaV1<T>`.
3. Atomic UI es la fuente unica del ADN visual; no crear componentes visuales
   reutilizables fuera de Atomic, ni usar controles HTML nativos (`<button>`, `<input>`, `<select>`, `<textarea>`, `<table>`, `<dialog>`, `<progress>`, `<meter>`) o desplazamiento nativo (`overflow: auto|scroll`, `::-webkit-scrollbar`). Toda area desplazable usa `<app-scroll-overlay>`.
4. No exponer secretos en frontend, logs, repositorio ni respuestas IPC.
5. Contratos tecnicos en ASCII, en espanol y con claves estables.
6. No bypass de compuertas (`npm run check`, `verificar-adn-frontend.ps1`, `cargo fmt`, `cargo clippy`,
   `cargo test`, build de Angular y build de Tauri).
7. **PROHIBIDO MODIFICAR `src-tauri/tauri.conf.json`**: Ante errores de `distDir` o contexto de empaquetado, la causa es la ausencia de compilación del frontend; el agente debe ejecutar `npm run build` o `scripts/verificar-todo.ps1`, jamás reescribir la configuración de Tauri.
8. **Autoría estricta y cero rastros de IA en control de versiones (Doctrina Sombra):** Cuando el dueño autorice confirmar cambios (`git commit`) o generar scripts de control de versiones, toda operación se ejecuta exclusivamente bajo la identidad `archware <havel363@gmail.com>`. Queda terminantemente prohibido usar nombres de agentes o asistentes (`Claude`, `AI`, `Assistant`, `Copilot`, `Gemini`, `Hermes`, etc.) en `author`/`committer` o incluir etiquetas `Co-authored-by:`, `Generated-by:` o similares en el mensaje del commit. Se emplean Conventional Commits en minúsculas (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`), fríos, técnicos y precisos, ejecutando o entregando los comandos directamente sin prosa explicativa. La mención de transparencia sobre co-ingeniería con IA Agéntica en la interfaz gráfica (`<app-about-dialog>`) se conserva intacta.

## 3) Roadmap oficial

**ID:** `PDFTOOL-DESKTOP-20261012-001`

| Fase | Objetivo | Entregables | Criterio de salida |
|---|---|---|---|
| 0. Encuadre | Definir alcance y limites de migracion | Inventario de funciones actuales (cargar, previsualizar, reordenar, excluir, unir, descargar) y riesgos | Alcance aprobado y sin ambiguedad |
| 1. Bootstrap Tauri + Angular | Crear base de app de escritorio | Estructura Tauri v1.5, frontend Angular, scripts de desarrollo | App inicia localmente en modo dev |
| 2. Atomic UI foundation | Unificar look & feel con Atomic | Tema base, tokens, layout y componentes desde `@atomic-ui/core` | UI sin componentes visuales ad hoc reutilizables |
| 3. Frontera IPC | Implementar contrato de borde | `DesktopFacadeService`, comandos IPC versionados, tipos de `RespuestaSistemaV1<T>` | Ningun componente llama `invoke()` directo |
| 4. Casos de uso PDF | Migrar logica funcional | Carga de PDF, miniaturas, preview, orden, inclusion/exclusion, exportacion | Paridad funcional con la version web |
| 5. Persistencia local y settings | Guardar preferencias no sensibles | Ajustes UI locales (ej. tamano de preview), sin secretos en texto plano | Config local estable y reversible |
| 6. Calidad y seguridad | Asegurar robustez antes de empaquetar | Pruebas unitarias, validaciones de contrato, manejo de errores y cancelacion | Suite minima verde y errores sin silencios |
| 7. Empaquetado y distribucion | Generar artefacto instalable | Build de Tauri, versionado coherente, hash de artefacto | Instalador funcional en Windows |
| 8. Evidencia y cierre | Cerrar con trazabilidad | Evidencia de compuertas, riesgos remanentes, rollback y notas de release | Candidata a terminada |

## 4) Estructura objetivo (alto nivel)

```text
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

## 5) Compuertas minimas por etapa tecnica

- Frontend: `npm run check`
- Runtime Rust: `cargo fmt`, `cargo check`, `cargo clippy`, `cargo test`
- Integracion: build Angular + build Tauri sin warnings bloqueantes

## 6) Definicion de terminado

La migracion se considera lista cuando:

1. El flujo completo PDF funciona offline en escritorio.
2. El frontend usa Atomic UI y no accede directo al runtime.
3. IPC responde con `RespuestaSistemaV1<T>` en todas las operaciones nuevas.
4. Las compuertas minimas estan en verde y existe evidencia reproducible.
5. El instalador de Windows se genera y ejecuta en un entorno limpio.
