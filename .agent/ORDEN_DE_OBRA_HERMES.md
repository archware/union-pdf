# Orden de Obra y Directrices Obligatorias para Agentes de IA en pdf-tool

> **DOCUMENTO VINCULANTE:** Todo agente (Hermes, subagentes o automatizaciones) que opere sobre el repositorio `pdf-tool` debe leer este documento antes de realizar cualquier modificación y cumplir rigurosamente sus directrices.

---

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

## 0. Instrucción Directa: "Compila y dónde se guarda el exe"

Si el usuario, prompt o coordinador solicita compilar el proyecto o pregunta dónde se encuentra el ejecutable:

1. **Ubicación Física del Ejecutable (.exe):**
   ```text
   C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe
   ```

2. **Comando Único Inmediato de Compilación (desde la raíz):**
   No investigues el árbol de directorios, no busques scripts en subcarpetas ni ejecutes comandos fragmentados. Ejecuta directamente cualquiera de las siguientes compuertas disponibles en la raíz:
   - **NPM:** `npm run build`
   - **Windows CMD/Batch:** `.\build.bat`
   - **PowerShell:** `powershell -ExecutionPolicy Bypass -File scripts/verificar-todo.ps1` (o `.\build.ps1`)
   - **Git Bash / POSIX:** `./build-exe.sh` (o `./scripts/verificar-todo.sh`)

3. **Regla de Oro de Proyectos Híbridos (Tauri + Angular):**
   - El frontend Angular DEBE compilarse obligatoriamente antes que el backend Rust (`cd frontend && npm run build`).
   - Si se ejecuta `cargo build` en `src-tauri` sin haber compilado previamente el frontend, el compilador fallará reportando que `distDir` no existe o señalando `tauri.conf.json`.
   - **PROHIBICIÓN ESTRICTA:** Queda terminantemente vetado reescribir, borrar campos o transformar `src-tauri/tauri.conf.json` ante este u otros fallos de compilación. El error no es de configuración: simplemente falta el build del frontend.

---

## 1. Reglas Incondicionales de Arquitectura

1. **Esquema de Configuración Fijado (Axioma 8):**
   - El runtime nativo de este proyecto utiliza **Tauri v1.5** (`Cargo.toml`).
   - Queda **terminantemente prohibido** convertir o modernizar `src-tauri/tauri.conf.json` a la sintaxis de Tauri v2 (como mover `identifier` a la raíz, eliminar `package`, o remover `distDir`/`devPath`).
   - `distDir` DEBE apuntar siempre a `../frontend/dist/pdf-tool/browser`.

2. **Prohibición de Mocks Falsos y Respeto a Contratos (Axioma 9):**
   - Si un comando de Rust aún no tiene implementación completa en el backend nativo (ej. `inspeccionar_archivo_pdf`, `unir_archivos_pdf`, `seleccionar_archivos_pdf`), DEBE devolver explícitamente `no_implementado(...)` con el código `"NO_IMPLEMENTADO"`.
   - Queda **terminantemente prohibido** devolver `RespuestaSistemaV1::exito(...)` con valores vacíos, contadores en cero o estructuras falsas para fingir que la funcionalidad está terminada.
   - El procesamiento de unión de PDFs opera en el frontend mediante `pdf-lib` en memoria y opcionalmente en backend nativo vía `lopdf`. Cualquier implementación en Rust debe ser aditiva, completa y probada con librerías nativas reales.

3. **Intangibilidad de Aserciones de Prueba:**
   - Queda prohibido invertir aserciones en `src-tauri/src/main.rs` (por ejemplo, cambiar `assert!(!resp.correcto)` a `assert!(resp.correcto)`).
   - Las pruebas unitarias definen el contrato técnico; si una prueba falla tras tu cambio, significa que tu cambio viola el contrato. Reviértelo o corrígelo, nunca alteres la prueba para silenciar el fallo.

4. **Prohibición de Scripts Ad-Hoc Engañosos (Axioma 3):**
   - Queda terminantemente prohibido crear scripts temporales con secuencias de `echo "✓ existe archivo"` o `echo "Estado: COMPLETO"` para simular éxito cuando la compilación real falla.

5. **Única Compuerta Oficial de Verificación:**
   - Antes de reportar cualquier tarea como completada, el agente DEBE ejecutar y obtener código de salida `0` en:
     ```powershell
     .\scripts\verificar-todo.ps1
     ```
     o en shell POSIX:
     ```bash
     ./scripts/verificar-todo.sh
     ```
   - Si dicho script falla en cualquiera de sus 7 pasos, la tarea NO está completada.

6. **Autoría Estricta y Cero Rastros de IA en Control de Versiones (Doctrina Sombra):**
   - Cuando el dueño autorice explícitamente confirmar cambios (`git commit`) o generar scripts de control de versiones, toda operación se registra exclusivamente a nombre de `archware` con el correo `havel363@gmail.com`.
   - Queda terminantemente prohibido usar nombres de modelos o asistentes (`Claude`, `AI`, `Assistant`, `Copilot`, `Gemini`, `Hermes`, etc.) como autor/committer o agregar etiquetas `Co-authored-by:` / `Generated-by:` en el mensaje del commit.
   - Se emplean Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`) fríos, técnicos y en minúsculas, ejecutando o entregando los comandos directamente sin prosa explicativa. La mención de transparencia sobre co-ingeniería con IA Agéntica en la interfaz gráfica (`<app-about-dialog>`) se conserva intacta.

---

## 2. Flujo de Trabajo para Realizar una Modificación

1. **Leer:** Inspeccionar los archivos a modificar y sus pruebas asociadas.
2. **Consultar:** Revisar `docs/CONTINUIDAD_AGENTES.md` y `.agent/roadmaps/`.
3. **Modificar Quirúrgicamente:** Aplicar el cambio mínimo necesario respetando tipado estricto y sin introducir dependencias incompatibles.
4. **Verificar:** Ejecutar `./scripts/verificar-todo.ps1` (o `npm run build` en la raíz).
5. **Reportar:** Presentar el resultado exacto, enlazando el binario físico compilado (`src-tauri/target/release/union-pdf.exe`) y el reporte de pruebas.
