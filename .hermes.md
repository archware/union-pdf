# Directivas de Operación y Compilación para Hermes Agent (pdf-tool)

> **DOCUMENTO PRIORITARIO Y VINCULANTE PARA HERMES AGENT**
> Hermes lee este archivo con la máxima prioridad al abrir el espacio de trabajo.
> Queda prohibido divagar en exploraciones erráticas de carpetas o reescribir archivos de configuración.

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

<!-- verificacion-proporcional:v1 -->
## Verificación proporcional y publicación (pdf-tool / union-pdf)

1. **Tipo de cambio → verificación.** Solo `.github/workflows/*.yml`: parser YAML (`python -c "import sys,yaml; yaml.safe_load(open(sys.argv[1],encoding='utf-8'))" .github/workflows/release.yml`), `actionlint` si existe, y revisar `git diff`; NO corras `verificar-todo`, `npm run build`, `npm test` ni `probar-compilacion` (no validan el workflow y cuestan minutos). Solo `*.md`/docs: `git diff` y el linter documental. Compuerta completa (`scripts/verificar-todo.ps1` o `probar-compilacion.ps1`, una sola vez, citando su bloque de frescura) únicamente si cambió código Rust/Angular, contratos o configuración de build.
2. **GitHub Actions: dentro de `${{ }}` solo existen comillas simples.** `github.ref_type == 'tag'` es válido; `"tag"` o `\"tag\"` produce `Unexpected symbol`. El valor YAML que envuelve la expresión usa comillas dobles (`name: "Unión PDF ${{ ... 'tag' ... }}"`). Escapar más una comilla que ya falla no arregla nada: relee la línea real con `sed -n '174p'` y corrige la causa.
3. **Commit ≠ tag.** Un tag (`v0.5.1`) apunta a UN commit y el push de un tag ejecuta el `release.yml` DE ESE COMMIT. Corregir `release.yml` en `main` NO cambia lo que ejecuta un tag ya publicado. Para publicar con el YAML corregido: ejecutar `workflow_dispatch` eligiendo la RAMA `main` (no el tag) con `tag_version`, o —solo con autorización explícita del usuario— publicar un tag nuevo. Mover o borrar un tag publicado (`git tag -f`, `git push --force`) está prohibido sin autorización y `--force` está en `approvals.deny`.
4. **No declares "publicado" ni "release listo" sin ver el run de Actions** (URL o `gh run list`). Sin `gh` ni acceso web di "NO VERIFICADO" y pide al usuario el resultado del run; no descargues ni instales `gh` ni uses `sudo`/`apt` desde Git Bash en Windows.
5. **Confirmación obligatoria** antes de `taskkill`, `git config --global`, `git push`, crear/mover tags y `git pull` con merge sobre `main`. Si `git push` es rechazado (non-fast-forward), informa y espera: no hagas merge automático.
<!-- /verificacion-proporcional:v1 -->

## ⚡ 1. Instrucción Directa: "¿Dónde se guarda el exe?" / "Compila"

Si el usuario solicita: *"compila"*, *"construye"*, *"genera el binario"* o pregunta *"dónde se guarda el exe"*:

### 📍 Ubicación Física Canónica del Ejecutable (.exe)
```text
C:\Users\cotaha\source\repos\pdf-tool\src-tauri\target\release\union-pdf.exe
```

### 🚀 Comando Inmediato de Compilación (Ejecutar DIRECTAMENTE en la Raíz)
No inspecciones subdirectorios ni pruebes compilaciones parciales. Ejecuta **un solo comando** desde la raíz del repositorio:

- **Vía NPM (Recomendado):**
  ```bash
  npm run build
  ```
- **Vía Windows Batch:**
  ```cmd
  .\build.bat
  ```
- **Vía PowerShell:**
  ```powershell
  .\build.ps1
  # O la compuerta canónica de 7 pasos:
  powershell -ExecutionPolicy Bypass -File scripts/verificar-todo.ps1
  ```
- **Vía Cargo (Workspace):**
  ```bash
  cargo build --release
  ```
- **Vía Bash / Shell POSIX:**
  ```bash
  ./build-exe.sh
  ```

---

## 🛑 2. Regla Técnica Inviolable: NUNCA Modificar `tauri.conf.json`

1. **Runtime Fijado:** Este proyecto utiliza estrictamente **Tauri v1.5** (`tauri = "1.5"` en `src-tauri/Cargo.toml`).
2. **PROHIBICIÓN ABSOLUTA:** Queda terminantemente vetado migrar o alterar el formato de `src-tauri/tauri.conf.json` a Tauri v2 (como mover `identifier` al nivel raíz, eliminar `package`, o remover claves de bundle).
3. **Arquitectura Híbrida:** En Tauri v1, el backend nativo empaqueta los archivos compilados del frontend Angular (`../frontend/dist/pdf-tool/browser`).
   - El script de construcción `src-tauri/build.rs` compila automáticamente el frontend si `dist/` no existe.
   - **Bajo ninguna circunstancia** un error de empaquetado o advertencia sobre `distDir` justifica modificar `tauri.conf.json`.

---

## 🛡️ 3. Axiomas Doctrinales Vinculantes (Axiomas 1 al 9 y Doctrina Sombra)

1. **Axioma 1 (Verificación Binaria Real):** Solo reporta éxito si el ejecutable físico `src-tauri\target\release\union-pdf.exe` existe en disco y tiene tamaño `> 0 bytes`.
2. **Axioma 8 (Respeto al Esquema Fijado):** No intentes actualizar dependencias estructurales ni alterar esquemas válidos.
3. **Axioma 9 (Prohibición de Mocks Falsos):** No inventes stubs que finjan éxito ni alteres aserciones en `src-tauri/src/main.rs`. Toda funcionalidad nativa en desarrollo responde explícitamente `NO_IMPLEMENTADO`.
4. **Doctrina Sombra (Autoría Estricta y Cero Rastros de IA en Git):** Cuando el dueño autorice ejecutar `git commit` o generar scripts de control de versiones, toda operación se registra exclusivamente a nombre de `archware` con el correo `havel363@gmail.com`. Queda terminantemente prohibido usar nombres de modelos o asistentes (`Claude`, `AI`, `Assistant`, `Copilot`, `Gemini`, `Hermes`, etc.) como autor/committer o agregar etiquetas `Co-authored-by:` / `Generated-by:` en el cuerpo del commit. Emplea Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`) fríos, técnicos y en minúsculas, ejecutando o entregando los comandos directamente sin explicaciones. La transparencia sobre co-ingeniería con IA Agéntica en la interfaz gráfica (`<app-about-dialog>`) se conserva intacta.

---

## 📚 4. Referencias y Documentación Técnica
- Orden de Obra: [.agent/ORDEN_DE_OBRA_HERMES.md](.agent/ORDEN_DE_OBRA_HERMES.md)
- Hoja de Ruta y Decisiones: [AGENTS.md](AGENTS.md)
- Directrices para LLMs: [CLAUDE.md](CLAUDE.md)
- Continuidad y Trazabilidad: [docs/CONTINUIDAD_AGENTES.md](docs/CONTINUIDAD_AGENTES.md)
