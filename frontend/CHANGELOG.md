---
title: "Registro de cambios de Base Tauri"
subtitle: "Evolución funcional y técnica del aplicativo"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-23"
document_type: "registro técnico"
status: "vigente"
canonical: true
version: "1.6.1"
---

# Registro de cambios

Todas las modificaciones notables del proyecto se documentan en este archivo.

## [Sin publicar]

### ECO-20260823-003: continuidad documental para agentes

- **Problema:** La regla raíz de Atomic UI no reunía por sí sola la jerarquía
  doctrinal, la frontera Tauri, la deuda Rust y las compuertas para reanudar una
  unidad de trabajo desde el repositorio aislado.
- **Decisión:** Se amplió AGENTS.md y se creó docs/CONTINUIDAD_AGENTES.md con
  arquitectura, IPC, documentos prioritarios, estado, deuda, comandos,
  protocolo, terminado, reversión y prompt absoluto.
- **Compatibilidad:** El lote no cambia código. Conserva DesktopFacadeService,
  RespuestaSistemaV1<T>, compatibilidad N-1, generados, locks y artefactos.
- **Archivos:** AGENTS.md, docs/CONTINUIDAD_AGENTES.md, CHANGELOG.md,
  LESSONS_LEARNED.md y el roadmap ECO-20260823-003.
- **Validación:** La compuerta documental central aprobó metadatos, referencias
  canónicas, identificador, terminología, cierre del roadmap y git diff --check.
- **Riesgo:** Los comandos registrados no certifican SQL Server ni una entrega
  institucional si esos procesos no se ejecutan de forma autorizada.
- **Reversión:** Se aplicará un parche inverso limitado a la documentación del
  lote, sin editar fuentes ni usar operaciones Git destructivas.

### Fachada de escritorio y contrato RespuestaSistemaV1

- Se instaló y activó `@hra/desktop-contracts` 0.4.2 con evidencia reproducible
  para `ResultEnvelopeV1`, `ConnectionProfileV1`, `AdminSessionV1` y
  `RespuestaSistemaV1`.
- Se incorporaron nueve comandos canónicos en español para autenticación
  administrativa y conexión segura. Los comandos reciben claves `camelCase`,
  devuelven `RespuestaSistemaV1<T>` y mantienen registrados los canales
  anteriores como alias de compatibilidad.
- Se añadieron DTO de interfaz en español que impiden propiedades desconocidas
  en las credenciales y serializan perfiles, sesiones y estados sin exponer
  contraseñas, referencias internas adicionales ni detalles del controlador.
- Se creó `DesktopFacadeService` como único consumidor productivo de
  `@tauri-apps/api/core`. `DashboardComponent` y `PacienteService` dejaron de
  invocar el puente de forma directa; las consultas clínicas continúan usando
  sus canales heredados únicamente dentro de la fachada hasta su siguiente
  migración contractual.
- Las validaciones finalizaron con 270 pruebas Angular y 60 pruebas Rust. La
  comprobación de tipos, la compilación Angular, `cargo check`, `cargo test` y
  `cargo fmt --check` y `cargo clippy -D warnings` terminaron correctamente mediante una
  configuración de comprobación que desactiva el empaquetado y no genera
  instaladores.
- La procedencia Atomic se verificó contra la referencia inmutable
  `67297145e2cb4bfe9ab349c471da5c3719fd1207`: la política 1.2.2 comprobó 65
  componentes y 5 servicios sin violaciones. La fuente sibling más reciente se
  mantuvo sin cambios y no sustituyó la referencia declarada por el consumidor.
- La compuerta de secretos importa explícitamente
  `Microsoft.PowerShell.Utility`, por lo que `Get-FileHash` deja de depender de
  la carga automática de módulos en procesos no interactivos.

### Adopción gobernada de Atomic UI 5.22.0

- Se integraron como una unidad los cinco archivos globales de temas, incluidos
  los tokens tipográficos y de objetivo táctil de 5.9, sin retirar los alias de
  alertas consumidos por la aplicación.
- Se actualizaron las copias anteriormente exactas de trece componentes, Panel
  y el conjunto Popup. El servicio de confirmación exige un verbo explícito,
  inicia el foco en la salida segura y relaciona Escape con la cancelación.
- Datepicker conserva las fechas civiles ISO sin desplazar el día, cancela y
  detiene Escape en las tres vistas y representa el estado deshabilitado sin
  reducir la opacidad. Button, NumberInput, Toggle y Accordion incorporan las
  correcciones compatibles de foco, reconciliación, contraste y semántica;
  Combobox usa tokens semánticos para sus opciones y controles deshabilitados.
- Se incorporaron especificaciones adaptadas a Vitest. La reutilización de la
  contraseña SQL continúa requiriendo selección explícita, se invalida al
  cambiar servidor, base de datos o usuario y vuelve a quedar desactivada al
  cerrar o reabrir el cuadro. La comprobación de tipos y las 265 pruebas
  finalizaron correctamente.
- Se preservó el frontmatter anterior del gobierno en `docs/archivo` y se creó
  ADR-017. La revisión Atomic
  `67297145e2cb4bfe9ab349c471da5c3719fd1207` se publicó antes de ejecutar el
  instalador oficial. La procedencia fija Atomic UI 5.22.0 y la huella
  `ebd294d5e4b05bf771d96e6941a2d854faa9c28912b5c4c97c61cb45e5d28872`,
  conserva `tokens.required` vacío y registra 12 componentes exactos, 53
  adaptados y cinco servicios gobernados.
- La compuerta Atomic verificó la política 1.2.2, 65 componentes, cinco
  servicios y cero violaciones. Los contratos, la comprobación de tipos, las
  265 pruebas Vitest y la construcción productiva finalizaron correctamente.

- **Canal Beta y nombres canónicos:** La promoción conserva
  `tauri-angular-app.exe` como basename interno de Cargo y publica
  `HRA-Modulo-Operativo-Tauri-Aplicacion-1.6.1-Beta.exe`. El recuperador se
  publica como
  `HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe`.
  Los manifiestos abiertos declaran `release_channel=beta` y mantienen
  `productionReady=false`; `FileVersion` y `ProductVersion` permanecen
  numéricos.

- **Consolidación documental canónica:** Se integraron diecinueve documentos redundantes en seis manuales técnicos, el README raíz, el gobierno Atomic, la evidencia contractual y los registros canónicos. Las cuarenta y seis secciones del changelog histórico y las lecciones anteriores se preservaron con procedencia explícita antes de retirar sus fuentes.
- **Índice único:** La navegación por rol y el orden de lectura se trasladaron al README raíz; los documentos activos dejan de depender de un índice secundario.
- **Metadatos:** El README, los registros raíz y ADR-001 incorporaron los campos de estado, versión y autoridad que faltaban.

- **Diagramas Mermaid verificables:** Se añadieron diagramas corporativos en los cuatro manuales de arquitectura, integración SQL Server, contratos del backend y contratos API/IPC.
- **Inversión parcial explícita:** La arquitectura y el contrato muestran que `PacienteService` depende directamente de `TiberiusRepository`; el puerto aparece como ausencia documentada y no como componente implementado.
- **Secuencias reales:** La consulta nominal representa validación, pool Tiberius, procedimiento parametrizado, mapeo estricto, éxito, error, timeout y registros internos de auditoría, sin presentar estos últimos como eventos IPC.
- **Control documental:** La compuerta comprueba presencia, tema corporativo y balance estructural de cuatro bloques Mermaid.
- **Documentación operativa canónica:** Se incorporó el índice de manuales y la cobertura de usuario, desarrollo, arquitectura hexagonal, operación, administración, seguridad, configuración, despliegue, continuidad, solución de problemas, integración SQL Server, diccionario de datos y contratos backend/API/IPC, contrastados con código, scripts y archivos de bloqueo vigentes.
- **Trazabilidad documental:** Se corrigieron códigos clínicos, huellas del contrato compartido, afirmaciones sobre consultas y TLS, y se marcaron las fuentes duplicadas como históricas mediante `status` y `superseded_by`.
- **Recuperación administrativa en Rust:** Se reparó la interfaz Win32 nativa y se restableció su dependencia con el núcleo de recuperación de Base Tauri.
- **Aislamiento entre productos:** Se retiraron las copias Python/PyInstaller que habían sido incorporadas bajo la identidad del recuperador Tauri y se impidió su reincorporación mediante reglas de exclusión.
- **Cambio de contraseña:** Se verificó mediante almacenes aislados que el recuperador escribe el hash Argon2id en `pe.gob.hra.modulo-operativo/admin-password-hash-argon2id-v1`, destino que consume la aplicación.
- **Cadena de entrega:** Se vinculó la fuente firmada del paquete con el PE Rust revisado. El verificador admite únicamente los cambios estructurales propios de Authenticode y rechaza binarios de otro producto o firmas mal formadas.
- **Pruebas seguras:** Se incorporaron regresiones para el empaquetado y el flujo de credenciales sin consultar ni modificar Windows Credential Manager real.
- Se inicializó el registro de cambios.

## Anexo consolidado: changelog

> Procedencia: `docs/CHANGELOG.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/CHANGELOG.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Registro de cambios de la aplicación Tauri Angular"
subtitle: "Evolución funcional, técnica y de seguridad"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-15"
last_updated: "2026-08-20"
document_type: "registro histórico"
status: "sustituido"
canonical: false
superseded_by: "../CHANGELOG.md"
```


### Registro de cambios de la aplicación Tauri Angular

> Documento histórico conservado por trazabilidad. El registro vigente es
> [`../CHANGELOG.md`](CHANGELOG.md).

Los cambios registrados hasta su sustitución se conservan en este archivo.

#### [v1.6.1] - 2026-08-15

##### Seguridad

- **Interfaz Win32 nativa:** El recuperador independiente abre sin argumentos
  una ventana propia con dos controles `ES_PASSWORD`, requisitos, estado,
  confirmación y cancelación. El mutex y la precedencia de entorno se resuelven
  antes de habilitar la captura; la escritura vuelve a comprobar el entorno.
- **Contingencia CLI cerrada:** El argumento exacto `--reset` conserva el flujo
  de consola interactiva. Los demás argumentos fallan y se presentan mediante
  la consola adjunta o un mensaje Win32 conservador.
- **Contrato raíz común:** `admin-recovery.product.json` usa el esquema 2 con
  diez claves exactas, identidad de credencial estructurada, rol auxiliar,
  nombre versionado y contrato de interfaz sin secretos.
- **Distribución cerrada:** La configuración de MSI y NSIS declara el helper
  junto a la aplicación y el acceso `Recuperar contraseña administrativa`.
  Antes de construir un bundle se exige una fuente con versión, nombre y firma
  Authenticode institucional válidos. El inventario firmado debe corresponder
  al commit, árbol, formato de objetos y epoch del `HEAD` limpio vigente.
- **Verificación instalada:** La compuerta compara el hash y los metadatos del
  helper instalado, y acepta únicamente el acceso con nombre exacto dentro del
  menú Inicio del usuario o del equipo, sin argumentos inyectados.
- **Integridad del SBOM:** Cada componente alcanzable con checksum disponible
  en `Cargo.lock` incorpora y vuelve a validar esa huella SHA-256 en CycloneDX.

##### Cambiado

- **Versión reproducible:** Las fuentes canónicas, locks, recursos PE, valores
  visibles del frontend y evidencia auxiliar avanzan de `1.6.0` a `1.6.1`.

#### [Sin publicar] - 2026-08-14 — Adopción gobernada de Atomic UI 5.8.2

##### Cambiado

- **Procedencia `ATOMIC-20260814-582-TAURI-ADOPTION`:** El consumidor fija el
  commit `1987ef4ac992e9296c9a053b21efb324796016eb`, 158 fuentes y la huella
  `56f436acb2df6ca9d277942d91248cebc33987a6c10c8b364212c0d5acac66e4`.
- **Adaptaciones preservadas:** La auditoría oficial clasifica 16 componentes
  exactos, 49 adaptados y cinco servicios gobernados. El instalador renueva los
  snapshots y la política sin copiar ni sobrescribir componentes productivos.
- **Alcance acotado:** `ADR-015` registra que no se modifica Rust, IPC, SQL
  Server, Kafka, Nexus, ejecutables, instaladores ni `platform-state.json`.

#### [Sin publicar] - 2026-08-14 — Contratos institucionales actualizados

##### Cambiado

- **Contratos de escritorio 0.3.1:** El instalador canónico actualiza el lock al
  esquema 3 y la política `sha256-git-clean-eol-v1`. La activación queda en
  `active` con un descriptor final para `ResultEnvelopeV1`,
  `ConnectionProfileV1` y `AdminSessionV1`.
- **Contratos de base de datos 0.2.1:** El lock y el gate autocontenido fijan el
  bundle `029ecd19ada2c87c6eea086136814ff4102dfbe333e2c0920ddc003af036b83d`.
  El catálogo permanece `blocked`, `deployable=false`, sin copiar SQL ni
  autorizar despliegues.

#### [v1.6.0] - 2026-08-14

##### Seguridad

- **Recuperador administrativo distribuible:** El comando Rust existente se
  conserva sobre módulos compartidos y se compila desde un crate mínimo sin
  dependencia de la aplicación, Tauri, Wry, WebView, Tiberius u OpenSSL; el
  ejecutable tampoco expone IPC, acceso a SQL Server ni inclusión en el
  instalador de la aplicación.
- **Trazabilidad de construcción:** La evidencia del auxiliar vincula el commit,
  el árbol Git, `SOURCE_DATE_EPOCH`, el toolchain, la huella SHA-256, el lock
  auxiliar y los metadatos PE de la versión vigente. Cargo trabaja offline y
  rechaza variables heredadas que alteren compilador, flags o target. Dos
  builds limpios deben coincidir bit a bit y la evidencia omite rutas absolutas
  e identidad local del operador.
- **SBOM y recurso PE verificables:** El SBOM CycloneDX 1.6 conserva las
  relaciones exactas del grafo alcanzable resuelto por Cargo para Windows x64,
  sin publicar identificadores locales. La política del helper también exige
  que `OriginalFilename` coincida con
  `HRA-Recuperacion-Administrativa-1.6.0-x64.exe`. Los prefijos locales de
  compilación se remapean y la compuerta PE rechaza rutas del operador.
- **Promoción cerrada:** El manifiesto mantiene `productionReady=false` hasta
  completar la firma Authenticode institucional, la revisión antimalware y una
  prueba funcional con una cuenta Windows desechable.

##### Cambiado

- **Versión reproducible:** Las fuentes canónicas, los archivos de bloqueo, la
  configuración Tauri y los valores de respaldo del frontend avanzan de
  `1.5.17` a `1.6.0`.

#### [Sin publicar] - 2026-08-13 — Recuperación administrativa local cerrada

##### Seguridad

- **Exclusión entre procesos:** La aplicación y el recuperador comparten un
  mutex global de Windows que cubre sesiones RDP. El reemplazo se rechaza
  mientras otra instancia mantiene activa la credencial administrativa en
  memoria o no puede comprobarse la exclusividad.
- **Invocación consciente:** La utilidad exige exactamente `--reset`, entrada y
  salida de diagnóstico interactivas; no acepta secretos mediante argumentos,
  redirecciones ni archivos `.env`.
- **Precedencia cerrada:** La presencia de `HRA_ADMIN_PASSWORD_HASH` o
  `HRA_TAURI_ADMIN_PASSWORD_HASH`, incluso vacía o inválida, impide modificar
  el hash local.
- **Destino acotado:** Sólo se reemplaza el PHC Argon2id vigente de la cuenta
  actual de Windows. No se consulta SQL Server ni se modifican credenciales SQL
  o registros administrativos heredados.
- **Escritura no eludible:** El establecimiento inicial utiliza una función
  privada sin parámetro de sobrescritura y vuelve a rechazar cualquier
  credencial local existente. El único reemplazo público exige un
  `AdminRecoveryGuard` adquirido mediante el mutex global.

#### [Sin publicar] - 2026-08-12 — Adopción gobernada de Atomic UI 5.5.8

##### Corregido

- **Trazabilidad `ATOMIC-20260812-PROVENANCE-PORTABILITY`:** El frontend fija
  el commit `93f090aef95c30dac3ccb00a7832fa7bdc22fbaa`, versión `5.5.8`, 157
  fuentes y la huella
  `60b7ecf42ab6324664e42116273eea91c55da10dc7b323b1e6bdf3ac48ed3848`.
  `ADR-013` registra la adopción de la política 1.2.2.
- **Identidad independiente del entorno:** El gate representa el texto con LF
  mediante atributos versionados, conserva los binarios sin transformación y
  rechaza filtros, codificaciones, enlaces, atributos externos y referencias
  que no coincidan con el `HEAD` Atomic fijado.
- **Clasificación canónica:** La auditoría registra 18 componentes exactos, 47
  adaptados y cinco servicios gobernados. `surfaces/panel` pasa a `exact`
  porque sus huellas local y Atomic son iguales bajo `git-clean-eol-v1`; los
  otros 64 componentes mantienen su clasificación y no cambia interfaz
  productiva.
- **CI dedicado con frontera confiable:** El workflow descarga el repositorio
  `archware/-Atomic-UI` sin persistir credenciales y ejecuta el gate del
  checkout Atomic antes de instalar dependencias.
- **Alcance acotado:** No se modifica Rust, Tauri, IPC, contratos de dominio,
  ejecutables ni instaladores.

#### [Sin publicar] - 2026-08-11 — Adopción gobernada de Atomic UI 5.5.7

##### Cambiado

- **Trazabilidad `ATOMIC-20260811-UNIFIED-TABLE-SCROLL`:** El frontend adopta
  el commit `296363d38593bc49bec8ba8bd87bc88dfdfba61e`, versión `5.5.7`, 157
  fuentes y la huella
  `bfa959021cdc60202c700e95d6c5bc0da86928274a13e0c18b7cf1a4a12665d1`.
  `ADR-012` registra la decisión y el instalador oficial renueva la procedencia.
- **Una sola propiedad de desplazamiento:** `TableComponent` incorpora modos
  nativo y overlay, viewport accesible, altura acotada, reinicio por conjunto
  de datos y política de envoltura o truncado. En la vista adaptable, la página
  recupera el desplazamiento sin perder la semántica de tabla.
- **Rueda, rieles y overlays anidados:** `ScrollOverlayComponent` dirige cada
  eje al propietario efectivo, conserva el recorrido completo de ambos rieles
  y permite encadenar el gesto cuando un scroller descendiente llega al borde.
- **Procedencia honesta:** Las implementaciones productivas coinciden con
  Atomic. Las dos carpetas permanecen `adapted` solo por el puerto equivalente
  de sus especificaciones Jasmine al ejecutor Vitest del consumidor.
- **Alcance acotado:** No se modifica Rust, Tauri, IPC, contratos de dominio,
  ejecutables ni instaladores.

#### [Sin publicar] - 2026-08-11 — Adopción gobernada de Atomic UI 5.5.6

##### Corregido

- **Trazabilidad `ATOMIC-20260811-556-MANIFEST-EOL-TAURI`:** El frontend
  adopta el commit `feec4ddb3c2ed0fc26b654827a57b5094a5d447a`, versión
  `5.5.6`, 157 fuentes y la huella canónica
  `faaf94f6d3d7faf5066c96001fcc8846b9e44ccdd776fe6b4d248fde297d5641`.
  `ADR-011` enlaza el cambio upstream `ATOMIC-20260810-MANIFEST-EOL`.
- **Identidad reproducible:** El origen calcula los archivos textuales con LF
  mediante `git-clean-eol-v1`, conserva los binarios byte a byte y rechaza
  transformaciones `clean` ajenas a la normalización CRLF a LF.
- **Interfaz preservada:** La comparación con 5.5.5 confirma que ningún
  componente productivo cambió. No se copia ContextMenu ni otro objeto UI; el
  instalador oficial actualiza exclusivamente procedencia y gobierno.
- **Alcance acotado:** No se modifica Rust, Tauri, IPC, contratos de dominio,
  ejecutables ni instaladores.

#### [Sin publicar] - 2026-08-10 — Adopción gobernada de Atomic UI 5.5.5

##### Cambiado

- **Trazabilidad `ATOMIC-20260810-555-CONTEXT-MENU-TAURI`:** El frontend
  adopta el commit `438f379df53bfb5dd0d04d81823fb644aa0696e0`, versión
  `5.5.5`, y la huella fuente
  `81a202c0a85ab6ed84c49d5a285a4409142c5e1ac565c43d7905525302edc29b`.
  `ADR-010` registra la propagación mediante el instalador oficial.
- **Menú único y cooperativo:** El shell monta una sola instancia global de
  `ContextMenuComponent`. La molécula ofrece Cortar, Copiar, Pegar y
  Seleccionar todo, conserva foco y selección y excluye por defecto los
  comboboxes y controles que administran un popup propio.
- **Contraseñas con política estable:** `InputComponent`, `Input` y
  `FloatingInputComponent` mantienen `data-clipboard-policy="paste-only"`
  incluso cuando la contraseña se revela. El resguardo no se presenta como
  DLP y no modifica Rust, IPC, ejecutables ni instaladores.
- **Clasificación de procedencia honesta:** Los archivos productivos de
  `Input`, `FloatingInputComponent` y `ContextMenuComponent` conservan la
  identidad Atomic. `InputComponent` permanece adaptado porque la etiqueta
  local utiliza `--info-color` donde la fuente utiliza `--text-color`; el
  manifiesto fija de forma separada ambas huellas SHA-256.

#### [Sin publicar] - 2026-08-10 — Adopción gobernada de Atomic UI 5.5.4

##### Cambiado

- **Trazabilidad `ATOMIC-20260810-554-TAURI`:** El frontend adoptó el commit
  `f21b59efb59955897127eb9341fb8040beba041c`, versión `5.5.4`, y la huella
  fuente `e1241929d3fa93c097566ff897d86c95c4edf4350a76de208622a76bacbe328c`.
  `ADR-009` conserva la decisión histórica y la procedencia verificable.
- **Contraseña accesible:** `FloatingInputComponent` incorporó control de
  visibilidad enfocable, nombre dinámico, `aria-pressed`, `aria-controls`,
  icono decorativo, foco visible y supresión acotada de las acciones nativas
  duplicadas de WebView2.

#### [Sin publicar] - 2026-08-10 — Adopción gobernada de Atomic UI 5.5.3

##### Cambiado

- **Trazabilidad `ATOMIC-20260810-553-TAURI`:** El frontend adopta el commit
  `90bc6c2cbba07c18fcf6fcab139973b279615851`, versión `5.5.3`, y la huella
  fuente `e1752a598e78aed4033b33683ce2ce970ce021eb0c64a693360d1995480ca4cf`.
  `ADR-008` registra la adopción del cambio canónico
  `ATOMIC-20260810-553-ASYNC-ACTIONS` y renueva la procedencia mediante el
  instalador oficial.
- **Contrato asíncrono canónico:** `button` incorpora `loading`; `modal`
  incorpora `busy` y `focusError()` con reintento posterior al render; `toast`
  conserva la confirmación en la capa superior. Las implementaciones
  TypeScript de los tres componentes permanecen idénticas a Atomic UI y sus
  especificaciones se portan a Vitest con instantáneas adaptadas.
- **Conexión sin overlay residual:** «Guardar y conectar» bloquea el doble
  envío, desmonta el modal antes de publicar un único toast y elimina el
  temporizador de cierre. La prueba de conexión conserva el modal y muestra el
  éxito en línea; una falla conserva el diálogo y enfoca la alerta proyectada.
- **Foco y host global verificados:** La cancelación y el éxito restauran el
  foco al invocador real. Una prueba renderizada del shell recorre el CTA, el
  error y el cierre, y demuestra que existe exactamente una instancia global
  de `app-toast`.

#### [Sin publicar] - 2026-08-10 — Adopción gobernada de Atomic UI 5.5.2

##### Cambiado

- **Trazabilidad `ATOMIC-20260810-552-TAURI`:** El frontend adopta el commit
  `fb6fb4b239d72e19d996a227f7569d0c0d6caf22`, versión `5.5.2`, y la huella
  fuente `59d53f85b43a27817d094062a0568c58ba6fc8e8baf6ecd3c7e85900420536f0`.
  `ADR-007` registra la decisión y el instalador oficial renueva los artefactos
  de gobierno y las instantáneas SHA-256.
- **Siete implementaciones canónicas:** `button`, `form-error`, `card`,
  `combobox`, `modal`, `select2` y `footer` sincronizan sus archivos
  `*.component.ts` de forma exacta. Se incorporan ancho completo de botones,
  errores remotos visibles, interacción segura de tarjetas, navegación que
  omite opciones deshabilitadas, foco contenido y restaurado en diálogos,
  nombres accesibles y un pie institucional adaptable.
- **Pruebas portadas con procedencia honesta:** Los escenarios canónicos se
  ejecutan con Vitest. Las especificaciones sustituyen las primitivas Jasmine,
  modelan las diferencias de estilo de jsdom, proporcionan
  `scrollIntoView` durante la prueba y actualizan la señal local de versión del
  pie; por ello, cada directorio conserva una instantánea adaptada aunque su
  implementación productiva sea idéntica a Atomic UI.

#### [Sin publicar] - 2026-08-06 — Endurecimiento de la conexión SQL (Bloque 2)

##### Cambiado

- **Semántica unificada del campo «Base de datos»:** `DBCredentials` incorpora
  `database` con `#[serde(default)]` (conservando `deny_unknown_fields`), y el
  flujo de conexión/persistencia la respeta: si la base tecleada viene no
  vacía, `connect_db_v1`/`connect_db_stored` la usan y la persisten en el
  almacén seguro (`DB_Config_V1`); si viene vacía (perfiles antiguos o campo
  omitido) se mantiene el fallback a `HRA_DB_NAME`/`indicadores_hra`. Los JSON
  guardados sin el campo siguen deserializando por el default de serde.
  `get_connection_profile_v1` y el perfil devuelto por `connect_db_v1`
  reportan la base de datos realmente en uso, el frontend reincorpora
  `database` a la carga útil de `connect_db_v1` y precarga el campo desde el
  perfil guardado.
- **`test_connection_v1` endurecido:** adquiere el mismo
  `ConnectionOperationGate` que el connect (la prueba y la activación ya no se
  solapan), renombra el parámetro `token` → `admin_token` (paridad con el
  resto de comandos) y reutiliza `connection_profile()` para construir
  `ConnectionProfileV1`, eliminando el bloque duplicado. Emite auditoría
  espejo del connect: `database.connection_test.started/succeeded/failed`,
  `database.legacy_tls.started/succeeded/failed` cuando aplica,
  `credentials.password_reuse.succeeded/rejected` al reutilizar el secreto
  almacenado y `database.configuration.rejected`, `database.tls.failed`,
  `database.pool.failed` o `database.connection.timeout` según la falla.
- **Tiempo límite del almacén seguro:** `run_secure_operation` envuelve el
  `spawn_blocking` de keyring en `tokio::time::timeout` de 2 segundos (límite
  del estándar) y devuelve «El almacén seguro no está disponible: la
  operación excedió el tiempo límite.», mapeado al código reintentable
  `connection.store_unavailable`; el frontend reconoce el nuevo literal.
- **Límites de tiempo locales del modal:** `connectDB()` (60 s) y
  `testConnection()` (45 s) aplican el helper `withTimeout`, coherentes con
  las fases de 10 segundos del backend para no cortar antes que él.

##### Corregido

- **Mojibake del contrato administrativo:** el mensaje «La sesión
  administrativa no cumple el contrato.» recupera la codificación UTF-8
  correcta.
- **Universo evaluado sin errores silenciosos:**
  `getUniversoEvaluadoSIS240ID11` marca `isSpError`/`backendError` al fallar,
  como los demás métodos del servicio, en lugar de devolver ceros sin señal.

##### Eliminado

- **Comando `get_credentials`:** sin consumidor en el frontend, se retira de
  `tauri_cmds.rs` y del `invoke_handler`, junto con `DBCredentialSummary` y
  sus pruebas asociadas; `get_connection_profile_v1` sigue cubriendo la
  lectura de metadatos.

#### [Sin publicar] - 2026-08-06 — Adopción de Atomic 5.4.0 estable y erradicación de UI hardcodeada

##### Actualización gobernada de Atomic UI 5.4.0

- **Trazabilidad `ATOMIC-20260806-540-TAURI`:** El frontend adopta de forma
  definitiva la referencia Atomic UI
  `3e0b8c60e677f4ffc023318254303ec854c0f162`, versión estable `5.4.0`, árbol
  fuente `9401e467c55cdfed9286f82997d507965de58af1640651e3759901422a877034`,
  cerrando la adopción transitoria de la beta 1
  (`docs/decisions/ADR-005-adopcion-atomic-5-4-0.md`).
- **Copias exactas resincronizadas:** `atoms/badge`, `atoms/language-switcher`
  y `molecules/dropdown` se igualan a Atomic, junto con la hoja compartida
  `src/app/shared/ui/styles/tokens/table-tokens.css`.
- **Adaptaciones corregidas:** las copias adaptadas de floating-input,
  form-error, table, action-group, avatar-group, card, select2, user-menu,
  stepper y panel reemplazan las negaciones inválidas `-var(...)` por
  `calc(-1 * var(...))` (mismo patrón que Atomic); sus `adaptationSnapshot`
  se actualizan con los nuevos hashes locales y de fuente.
- **Política de gobierno 1.1.0:** `scripts/check-atomic-provenance.mjs` y
  `docs/ATOMIC_GOVERNANCE.md` se propagan desde Atomic; el gate ahora escanea
  las plantillas y estilos embebidos en `.ts` de features y el manifiesto
  declara `policyVersion: "1.1.0"`.

##### Erradicación de UI hardcodeada en features

- **Dashboards gerencial, operativo y descartados:** todos los `style="..."`
  inline del marcado migran a clases del arreglo `styles` del componente con
  tokens (`var(--space-*)`, `var(--text-*)`, `var(--radius-*)`); los colores
  hex de los semáforos y series Chart.js se sustituyen por tokens semánticos
  y por lectura de `--chart-color-1..10` vía `getComputedStyle` (patrón del
  organismo chart de Atomic). Se corrige la declaración CSS inválida
  `font-size: 0.9rem; 0 var(--space-4) 0;` de los subtítulos.
- **Página muerta eliminada:** `src/app/pages/login/` (sin ruta en
  `app.routes.ts` y sin importadores) se elimina junto con su directorio.

##### Contratos de escritorio (reactivación 5.4.0)

- **Reactivación canónica 5.4.0:** tras los cambios en archivos productivos
  del tablero, la adopción del contrato compartido se regeneró con el
  activador oficial (`[CONTRACT_ACTIVATION_OK]`), y los gates
  `check:contracts` y `check:database-contracts` quedan en verde.

##### Añadido

- **Prueba de conexión sin activación:** El comando `test_connection_v1` y el
  botón `Probar conexión` del modal de configuración permiten validar servidor,
  base de datos, usuario, contraseña y modo TLS contra SQL Server sin activar
  ni persistir la conexión. La sesión administrativa continúa siendo requisito
  y la contraseña no se expone al WebView.

##### Corregido

- **Carga útil de `connect_db_v1`:** El frontend dejó de enviar el campo
  `database` dentro de `creds`; el contrato Rust `DBCredentials` declara
  `deny_unknown_fields` y rechazaba toda la operación `Guardar y Conectar`. El
  campo de base de datos de la interfaz se mantiene y aplica únicamente a
  `test_connection_v1`, que sí lo acepta.
- **Suite Angular reparada:** Las pruebas del tablero se alinean con el
  renombre `legacyTls` → `legacyTLS` del componente y con la carga útil de
  `connect_db_v1` sin `database`, con lo que la suite vuelve a compilar y
  ejecutarse completa.
- **Mensajería administrativa resincronizada:** La lista de mensajes
  reconocidos del frontend se iguala a los literales actuales del backend,
  que declaran `HRA_ADMIN_PASSWORD_HASH` como variable primaria y
  `HRA_TAURI_ADMIN_PASSWORD_HASH` como fuente heredada; `.env.example`
  documenta ese mismo orden.

##### Actualización gobernada de Atomic UI 5.4.0-beta.1

- **Trazabilidad `ATOMIC-20260806-540B1-TAURI`:** El frontend adopta de forma
  transitoria la referencia Atomic UI `0f33f6aada0aeb8495aa787f559664dcaa1cd73d`,
  correspondiente a la versión `5.4.0-beta.1` y al árbol fuente
  `443cf0e0dab15d7c2913187d86cdf94afb58d2ed6d98a7eb68c34807bfa15fe0`
  (`docs/decisions/ADR-004-adopcion-transitoria-atomic-5-4-0-beta-1.md`).
- **Temas sincronizados:** `_forms.css` adopta los tokens `--space-3/4/5` en
  `.atomic-form-stack` e `index.css` corrige el selector duplicado
  `body, html, body` por `html, body`, igualando el contenido actual de Atomic.

##### Contratos de escritorio

- **Reactivación canónica:** La adopción del contrato compartido se regeneró
  mediante el activador oficial del repositorio de contratos, que reescribe el
  lock, el verificador y la documentación generada a partir de la evidencia de
  adopción, en sustitución de los valores editados manualmente.

#### [Sin publicar] - 2026-08-03

##### Evidencia de entrega

- **Conjunto Windows cerrado:** La entrega exige exactamente un ejecutable, un
  MSI y un NSIS de la versión `1.5.17`; los artefactos obsoletos o duplicados no
  se promueven.
- **Metadatos institucionales:** Cargo, Tauri y el hook NSIS declaran a
  `Hospital Regional Ayacucho` como editor del producto.
- **Política Authenticode cerrada:** `ci-unsigned` acepta exclusivamente
  `NotSigned` para validación interna. La política `institutional` exige firma
  válida, EKU de firma de código, editor autorizado y sello de tiempo.
- **Aptitud explícita:** El manifiesto de esquema 2 conserva
  `productionReady=false` hasta demostrar firma institucional e instalación y
  desinstalación en una cuenta Windows limpia.
- **Verificación:** Diez pruebas negativas y positivas cubren secretos, rutas,
  duplicados, firma, manifiesto, SBOM y sumas SHA-256.

##### Actualización de la cadena Angular

- **Línea 22.1 armonizada:** Angular, el compilador y las herramientas de construcción se actualizan dentro de la misma versión mayor del ecosistema.
- **Dependencias saneadas:** La resolución final no contiene dependencias inválidas y `npm audit` informa cero vulnerabilidades en producción y desarrollo.
- **Compatibilidad comprobada:** TypeScript, 55 pruebas Angular y el bundle de producción validan la actualización.

##### Adopción verificable de contratos de escritorio

- **Contrato común 0.3.0:** Rust y Angular consumen directamente los tipos generados de `ResultEnvelopeV1`, `ConnectionProfileV1` y `AdminSessionV1`; el lock activo fija la evidencia productiva y sus pruebas mediante SHA-256.
- **Portador administrativo no público:** El identificador UUID de `AdminSessionV1` queda separado del token de 256 bits. El backend conserva únicamente el hash SHA-256 del token, lo vincula al proceso, limita su vigencia y lo revoca al concluir la configuración.
- **Reconexión con privilegio mínimo:** La restauración inicial utiliza el comando heredado que sólo devuelve estado de conexión. El perfil público completo permanece protegido por una sesión administrativa y no transporta la contraseña SQL.
- **Fallo cerrado:** Angular valida versión, UUID, TTL, alcance, perfil y coherencia del sobre antes de usar una respuesta. Un contrato inválido no degrada TLS ni habilita una ruta alternativa.
- **Verificación:** Se aprobaron 47 pruebas Rust, 55 pruebas Angular, `clippy` sin advertencias, la compuerta Atomic, los contratos de escritorio y base de datos y el bundle de producción.

##### Actualización gobernada de Atomic UI

- **Trazabilidad `ATOMIC-20260803-530-TAURI`:** El frontend adopta la referencia Atomic UI `de026c0047d0070a9ee1f5f6e74e0c79dfdf313e`, correspondiente a la versión `5.3.0` y al árbol fuente `9e50ba997303dbf1cd5c11b505cad2bc18e383b0dc2326d92bd3d4442ccc423d`.
- **Identidad cerrada:** La compuerta verifica de forma conjunta referencia Git, versión y huella SHA-256; una sustitución de cualquiera de esos valores se rechaza.
- **Adaptaciones preservadas:** Se registran 16 componentes exactos y 47 adaptados. Las instantáneas conservan los contratos de Tauri y Rust sin efectuar una copia masiva.
- **Comprobación reproducible:** La compuerta Atomic, los contratos comunes, las 55 pruebas Angular, las diez pruebas de entrega y el bundle de producción finalizaron correctamente.

#### [v1.5.17] - 2026-07-28

##### Cambiado

- **Pie institucional uniforme:** El pie muestra exactamente `© 2026 Hospital Regional Ayacucho - Todos los derechos reservados.` y deja de incorporar el nombre de la base tecnológica.
- **Versión sin fecha:** La insignia conserva la versión y el entorno de entrega, pero omite la fecha de compilación incluso cuando el servicio mantenga ese metadato para otros contextos.
- **Contrato protegido:** La prueba del organismo compartido verifica el texto institucional, la versión visible y la ausencia de una fecha en el pie.
- **Conservación funcional:** El cambio no modifica la distribución del contenedor, los tokens visuales, la autenticación administrativa, la política TLS, el almacenamiento seguro ni los contratos SQL.
- **Validación reproducible:** Se aprobaron 34 pruebas Angular, los compiladores TypeScript y Angular, las verificaciones de tema y WebView2, el contrato de versiones y el bundle web de producción.
- **Versión reproducible:** `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, el entorno Angular y este registro declaran `1.5.17`.

##### Ajuste de compatibilidad del 3 de agosto de 2026

- **Fuente administrativa primaria:** `HRA_TAURI_ADMIN_PASSWORD_HASH` pasa a ser la fuente primaria. `HRA_ADMIN_PASSWORD_HASH` queda como compatibilidad heredada y sólo se considera, cuando la variable primaria no existe, si contiene un hash Argon2id compatible; la lectura no modifica ni elimina el valor de origen.
- **Espacio administrativo propio:** El hash local se almacena bajo `HRA_Indicadores_Tauri` / `Admin_Password_Hash_Argon2id_V1`. Ante la ausencia del destino nuevo, un hash Argon2id compatible de `HRA_Indicadores` / `Admin_Password_Hash` puede copiarse sin borrar ni sobrescribir el registro anterior.
- **Espacio SQL propio:** La configuración SQL se almacena bajo `HRA_Indicadores_Tauri` / `DB_Config_V1`. Cuando no existe, Tauri conserva la lectura compatible de `HRA_Indicadores:DB_Config` y `DB_Config.HRA_Indicadores` y copia únicamente cargas compatibles, sin eliminar ni sobrescribir los destinos anteriores.
- **Vigencia administrativa:** El TTL predeterminado de las sesiones se establece en cinco minutos y la política conserva quince minutos como máximo.

#### [v1.5.16] - 2026-07-28

##### Cambiado

- **Mensaje administrativo uniforme:** Después de comprobar una credencial local configurada, Tauri presenta `La autenticación administrativa local está configurada.`, el mismo mensaje mostrado por Wails.
- **Estado institucional explícito:** Cuando la fuente autorizada es la variable administrada, el modal presenta `La autenticación administrativa institucional está configurada.` sin revelar el hash ni su ubicación.
- **Presentación basada en tokens:** El aviso utiliza los mismos tokens de superficie, borde, texto, radio y espaciado de la tarjeta equivalente de Wails. No se incorporan colores aislados.
- **Separación de estados:** El mensaje configurado sólo aparece después de una comprobación satisfactoria. El establecimiento inicial, los errores y el indicador diferido de verificación conservan sus flujos independientes.
- **Cobertura de regresión:** Las pruebas verifican los textos local e institucional y confirman que el estado de establecimiento inicial no fabrica un mensaje configurado.
- **Validación reproducible:** Se aprobaron 33 pruebas Angular, 31 pruebas Rust, cuatro contratos SQL locales, los compiladores TypeScript y Angular, `clippy` sin advertencias, el bundle web y la compilación Tauri con instaladores NSIS y MSI.
- **Versión reproducible:** `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, el entorno Angular y este registro declaran `1.5.16`.

#### [v1.5.15] - 2026-07-28

##### Corregido

- **Actualización explícita de la vista:** Las respuestas del puente Tauri aplican el estado mediante `NgZone` y ejecutan `ChangeDetectorRef.detectChanges()` al finalizar la autenticación administrativa, la lectura de metadatos y la configuración SQL. Se elimina el estado visual detenido en `Verificando...` o `Conectando...` cuando el backend ya había respondido.
- **Comprobación administrativa anticipada:** El estado administrativo local se precarga en paralelo con la reconexión inicial, se comparte si existe una solicitud en curso y se conserva durante 30 segundos. La contraseña puede escribirse mientras concluye la comprobación; la acción de ingreso permanece bloqueada hasta disponer de un estado válido.
- **Indicador de espera no intrusivo:** El texto `Verificando la configuración local segura...` aparece únicamente si la comprobación supera 200 ms. Las respuestas rápidas no generan un parpadeo de carga y los timeouts continúan limitados a tres segundos.
- **Control único de contraseña en WebView2:** Los campos que disponen de un botón propio ocultan de forma encapsulada los controles nativos `::-ms-reveal` y `::-ms-clear`. El contrato automatizado `validate-webview-password-controls.js` evita que reaparezca el doble icono y no modifica otros campos de la aplicación.
- **Conexión SQL de un solo intento:** El pool `bb8` crea una conexión inicial, desactiva el reintento interno y queda acotado por un único límite de conexión. Se retira la adquisición redundante que generaba un viaje adicional a SQL Server.
- **Conservación de la conexión operativa:** La conexión activa no se elimina antes de validar una configuración nueva. El servicio sólo se sustituye después de comprobar la nueva conexión y guardar sus credenciales, por lo que un intento fallido no interrumpe el tablero que ya funcionaba.
- **Trazabilidad con milisegundos:** El registro de seguridad utiliza marcas RFC 3339 con precisión de milisegundos. Se preservan la rotación y la eliminación de contraseñas, tokens, búsquedas e identificadores clínicos.
- **Validación reproducible:** Se aprobaron 32 pruebas Angular, 31 pruebas Rust, cuatro contratos SQL locales, los compiladores TypeScript y Angular, `clippy` sin advertencias, el bundle web y el build Tauri aislado. El ejecutable declara versión de producto y archivo `1.5.15`.
- **Versión reproducible:** `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, el entorno Angular y este registro declaran `1.5.15`.

#### [v1.5.14] - 2026-07-28

##### Corregido

- **Comprobación administrativa acotada:** El modal limita `get_admin_auth_status` a tres segundos. Si el puente IPC o el almacén seguro no responde, el indicador `Verificando la configuración local segura...` termina, se presenta un mensaje controlado y se habilita la acción `Reintentar`.
- **Invalidación de respuestas tardías:** Cada comprobación administrativa utiliza un identificador incremental. Cerrar, destruir o volver a abrir el modal invalida la solicitud anterior, por lo que una respuesta tardía no puede modificar una sesión posterior ni mantener el formulario deshabilitado.
- **Operaciones seguras fuera del hilo de interfaz:** Los comandos de estado, autenticación, establecimiento inicial y lectura de metadatos se declararon asíncronos. Las operaciones de Windows Credential Manager y Argon2id se ejecutan mediante `spawn_blocking`; se conservan íntegramente la política Argon2id, el bloqueo por intentos fallidos y la separación entre hash administrativo y contraseña SQL.
- **Persistencia SQL no bloqueante:** La lectura y escritura de la configuración SQL protegida se desplazaron a tareas bloqueantes separadas. La persistencia continúa ejecutándose únicamente después de una conexión comprobada y no devuelve la contraseña al WebView.
- **Confirmación de conexión breve:** La retención del modal después de una conexión satisfactoria se redujo de 1 500 ms a 250 ms. La sesión administrativa continúa revocándose antes del cierre visual.
- **Tema oscuro negro neutral:** `brand-dark` conserva los acentos institucionales, pero reemplaza las superficies azul marino por una escala negra neutral: `#121212`, `#1e1e1e`, `#252525`, `#2d2d2d` y `#181818`. Los fondos, modales, tarjetas, controles y sombras dejan de utilizar matices azules estructurales.
- **Contrato automatizado del tema:** `validate-theme-tokens.js` verifica durante `prebuild` los tokens estructurales de `brand-dark` y detiene la compilación si reaparecen superficies azuladas.
- **Cobertura de regresión:** Las pruebas del tablero cubren timeout, reintento, rechazo del backend y descarte de respuestas administrativas tardías. Las validaciones Angular y Rust preservan los flujos de sesión, cifrado, contrato SQL y almacenamiento seguro existentes.
- **Versión reproducible:** `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, el entorno Angular y este registro declaran `1.5.14`.

#### [v1.5.13] - 2026-07-28

##### Corregido

- **Actualización de estado dentro de Angular:** Las respuestas asíncronas del puente Tauri se aplican mediante `NgZone`, con lo cual los pasos de autenticación y configuración actualizan la vista aunque la promesa se resuelva fuera del ciclo de detección de cambios. El indicador `Verificando` deja de depender de un evento posterior para desaparecer.
- **Consulta de credenciales con tiempo límite:** La autenticación administrativa habilita el segundo paso antes de solicitar los metadatos SQL. `get_credentials` dispone de un límite de cinco segundos; si el almacén seguro demora o falla, la sesión administrativa permanece activa y el formulario permite completar los campos manualmente sin quedar bloqueado.
- **Tema Atomic UI consistente:** La superficie de la aplicación y del tablero utiliza `--surface-ground` y los demás tokens semánticos en lugar de un token inexistente con respaldo claro. La configuración Tailwind declara `darkMode: 'class'`, `ThemeService` conserva sincronizadas la clase `dark` y `data-theme`, y el selector oscuro neutral ya no sobrescribe las superficies específicas de `brand-dark`.
- **Destino SQL histórico de `v1.5.13`:** En esta versión, la configuración SQL se escribía en `HRA_Indicadores:DB_Config` y se leía el destino anterior `DB_Config.HRA_Indicadores`. Ambos destinos quedaron como fuentes heredadas de lectura y migración no destructiva cuando se adoptó `HRA_Indicadores_Tauri` / `DB_Config_V1`.
- **Destino administrativo histórico de `v1.5.13`:** En esta versión, el hash Argon2id local se almacenaba en la cuenta `Admin_Password_Hash`. Ese destino quedó como fuente heredada compatible y no destructiva cuando se adoptó `HRA_Indicadores_Tauri` / `Admin_Password_Hash_Argon2id_V1`.
- **Reutilización restringida de la contraseña SQL:** Un envío sin contraseña sólo puede recuperar el secreto almacenado cuando servidor y usuario coinciden con los metadatos guardados después de normalizar espacios y mayúsculas. El backend rechaza la reutilización ante cualquier cambio de identidad de conexión.
- **Selección dual del proveedor TLS:** Las conexiones estrictas permanecen en `native-tls` y Schannel con TLS 1.2 o superior. Sólo una conexión aprobada con `legacy_tls` utiliza OpenSSL vendorizado y permite negociar desde TLS 1.0. La selección ocurre antes del intento y no ejecuta una reducción automática entre proveedores.
- **Compatibilidad efectiva con OpenSSL 3.6:** El proveedor heredado fija el nivel de seguridad de OpenSSL en `0` únicamente después de la aprobación administrativa de `legacy_tls`. Esta configuración permite TLS 1.0, que OpenSSL 3.6 rechaza en niveles superiores, sin modificar Schannel, el modo estricto ni `EncryptionLevel::Required`.
- **Cifrado requerido en todos los modos:** `EncryptionLevel::Required` permanece activo tanto en el canal estricto como en el heredado. No existe ruta a texto plano, `EncryptionLevel::Off` o `EncryptionLevel::NotSupported`, ni un segundo intento automático con una política más débil.
- **Estado vacío inequívoco:** Cuando las consultas terminan sin filas para el período, el tablero muestra `No hay datos para el período seleccionado.` y deja de presentar un mensaje de carga ya finalizada.
- **Grafo Rust reducido y auditado:** Se desactivó la característica `winauth` que la aplicación no utiliza, con lo cual se retiraron `winauth`, `rand` 0.7.3 y sus dependencias antiguas. `anyhow` se actualizó a 1.0.103; RustSec no detecta vulnerabilidades bloqueantes en el cierre de esta versión.
- **Versión reproducible:** `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, el entorno Angular y este registro declaran `1.5.13`.
- **Validación operativa real:** El ejecutable release `1.5.13` estableció la conexión heredada cifrada y completó las consultas de tablero, descartados y pacientes. El registro redactado contiene `database.legacy_tls.succeeded`, `database.connection.succeeded` y eventos `query.*.succeeded`.

#### [v1.5.12] - 2026-07-27

##### Corrección incremental del 28 de julio de 2026

- **Reintento SQL sin nueva autenticación:** El modal conserva la sesión administrativa vigente después de errores recuperables de red, TLS, certificado o credenciales SQL. El operador puede corregir servidor, usuario o contraseña SQL y reintentar sin volver al paso de autenticación.
- **Revocación limitada a estados terminales:** El token se revoca al cerrar o cancelar, al expirar, ante `Acceso administrativo no autorizado.` y después de guardar correctamente la conexión. Un éxito elimina el token de inmediato y mantiene el modal visible durante el breve mensaje de confirmación sin conservar capacidad administrativa.
- **Pruebas de ciclo de sesión:** Se incorporaron pruebas directas del componente para reintentos recuperables consecutivos de TLS, red y credenciales SQL, además de rechazo administrativo, expiración, cierre y éxito. Las pruebas confirman que los errores SQL no invocan `authenticate_admin` ni `revoke_admin_session`.
- **Modo administrado para servidores heredados:** Se incorporó `legacy_tls` como opción desactivada de forma predeterminada en el tablero y la pantalla de conexión. Sólo una sesión administrativa puede activarla, requiere una IP literal privada o de loopback y se guarda junto con las credenciales después de una conexión exitosa.
- **Cifrado obligatorio sin reducción silenciosa:** El modo heredado conserva `EncryptionLevel::Required`, configura TLS 1.0 como versión mínima explícita y utiliza `trust_cert` para omitir la validación del certificado. No habilita texto plano, no se combina con las excepciones por variable de entorno y no inicia un segundo intento con una política más débil.
- **Estado visible de conexión heredada:** Los comandos devuelven un estado estructurado con `connected` y `legacy_tls`. El tablero muestra un aviso persistente mientras la conexión activa utiliza la excepción de certificado.
- **Parche local de Tiberius:** La versión 0.12.3 se incorporó bajo `src-tauri/vendor/tiberius` y `[patch.crates-io]` obliga a utilizarla. `Config::allow_legacy_tls` mantiene desactivado el cambio de protocolo de forma predeterminada y sólo el flujo administrado configura `Protocol::Tlsv10` antes de delegar en Schannel. La disponibilidad final continúa sujeta a la política y a los cifrados habilitados en Windows.
- **Persistencia posterior al ping:** `connect_db` guarda las credenciales internamente sólo después de construir el pool y obtener una conexión válida. Se eliminó el comando IPC `save_credentials`, con lo cual un fallo recuperable conserva la sesión administrativa para reintentar, pero no puede escribir una configuración que nunca se conectó.
- **Cobertura de compatibilidad y seguridad:** Las pruebas validan la lectura de registros anteriores sin `legacy_tls`, el valor estricto predeterminado, la restricción de red privada, la barrera de persistencia, el mensaje específico de fallo heredado y el uso exclusivo de cifrado requerido.

##### Corregido

- **Control administrativo histórico de `v1.5.12`:** La contraseña fija del frontend fue retirada. En esta versión, `authenticate_admin` utilizaba exclusivamente `HRA_ADMIN_PASSWORD_HASH` y emitía sesiones con vigencia de quince minutos. Ese origen dejó de ser primario y esa vigencia dejó de ser el valor predeterminado con el ajuste posterior que adoptó `HRA_TAURI_ADMIN_PASSWORD_HASH` y cinco minutos, respectivamente.
- **Aislamiento de credenciales:** La contraseña SQL permanece en Windows Credential Manager. `get_credentials` exige una sesión administrativa y entrega únicamente servidor, usuario y estado de configuración; `connect_db_stored` permite la reconexión sin devolver metadatos ni el secreto al WebView.
- **Limpieza de secretos en la interfaz:** Angular elimina la contraseña administrativa y la contraseña SQL después de cada operación. El token se elimina al vencer la sesión, al cerrar la configuración, al destruir la vista, ante un rechazo administrativo o después de guardar correctamente la conexión. Los fallos recuperables de SQL conservan la sesión vigente para permitir reintentos controlados. Los botones y campos quedan bloqueados mientras existe una solicitud activa para impedir envíos duplicados.
- **Transporte SQL:** Tiberius exige `EncryptionLevel::Required` y valida el certificado contra el almacén del sistema o contra la CA configurada mediante `HRA_SQL_CA_CERT`. La excepción `HRA_DEV_ALLOW_INVALID_CERT=true` sólo funciona en una compilación `debug`; una compilación de distribución la rechaza.
- **Validación y trazabilidad:** Los comandos IPC validan periodos, paginación, filtros, ordenamiento y parámetros de conexión. Los registros se almacenan en el directorio de registros de la aplicación, se rotan y omiten búsquedas, DNI, contraseñas y tokens.
- **Contrato SQL:** Los DTO validan la presencia y el tipo de las columnas. El repositorio exige todos los result sets y el valor `TotalRecords`, permite un result set nominal presente pero vacío y rechaza un DNI nulo. Una deriva de esquema ya no queda oculta como cero, texto vacío o colección vacía.
- **Fila clínica obligatoria:** El tablero y el universo SIS 240-M exigen una fila principal válida. Las colecciones mensuales, nominales y de descartados conservan el vacío como resultado legítimo, pero Angular propaga los errores del resumen clínico y limpia sus señales sin fabricar métricas cero.
- **Consistencia asincrónica:** Las vistas gerencial, operativa y de descartados aceptan únicamente la respuesta de su solicitud más reciente. El indicador global de carga utiliza conteo de solicitudes activas para no finalizar prematuramente cuando existen operaciones concurrentes.
- **Periodos vigentes:** El título del gráfico utiliza el año seleccionado y el catálogo anual se genera desde 2024 hasta el año siguiente al actual, sin valores futuros codificados manualmente.
- **Validación SQL local:** El build valida de forma estática y de solo lectura la paridad entre llamadas Rust y procedimientos almacenados versionados. Se retiró la dependencia de `caja_herramientas` y se bloqueó el despliegue automático no supervisado.
- **Versión reproducible:** `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, el entorno Angular y este registro declaran `1.5.12`. El verificador sólo lee archivos y falla ante cualquier divergencia.
- **Dependencias Rust:** `plist` se actualizó a `1.10.0` y `quick-xml` a `0.41.0`, con lo cual se corrigieron `RUSTSEC-2026-0194` y `RUSTSEC-2026-0195`.
- **Calidad automatizada:** Se añadieron pruebas Angular y Rust, auditorías npm y RustSec, validación local de contratos SQL, compilación Tauri con `--no-bundle` y comprobación de un árbol Git sin cambios posteriores al build.

#### [v1.5.11] - 2026-07-16
##### Corregido
- **Contrato mensual vacio sin mock productivo**: `PacienteService` centraliza `emptyMonthlyData()` para devolver los doce meses en cero solo cuando no existe runtime Tauri, sin activar `isMockData`.
- **Avisos durante carga**: El banner de error SP ya no se muestra mientras la carga sigue activa, evitando estados visuales falsos durante la conexion.
- **Auditoria de graficos**: Se confirma que `Avance mensual` consume `mensual_data` desde `ind.USP_SEL_DASHBOARD_STATS_ID11` y no porcentajes fijos en TypeScript.

#### [v1.5.10] - 2026-07-16
##### Corregido
- **Nombre de obstetra en descartados**: Se amplio `PacienteDescartado` con `nombre_obstetra`, se actualizo `DescartadoRow::from_sql` y la grilla muestra nombres y apellidos con fallback al codigo tecnico.
- **Contrato SQL de descartados version 3**: `USP_SEL_DESCARTADOS_ID11` materializa `Nombre_Obstetra` desde SQL Server y conserva `Codigo_Obstetra` para auditoria.

#### [v1.5.9] - 2026-07-16
##### Corregido
- **Tabla nominal completa en el cierre inferior**: Se sincronizo `ScrollOverlayComponent` desde Atomic UI para ampliar `--so-scroll-end-space` a `calc(var(--so-track-size) + var(--space-8))`, evitando que la ultima fila quede pegada o parcialmente cubierta por la barra horizontal.
- **Bags de metodo y estado alineados**: Se propago el ajuste de `TableComponent` y `ChipComponent` para centrar celdas con un unico `app-chip` y suavizar la variante `primary` en tema oscuro.
- **Saneamiento CSS heredado**: Se sincronizaron `table-tokens.css` y `responsive-table.css` con Atomic UI para eliminar expresiones invalidas como `76var(...)` y `1var(...)`.

#### [v1.5.8] - 2026-07-15
##### Corregido
- **Caja interna de graficos estable**: La torta usa `chart-panel--center` de 260 px y barras usa `chart-panel--fill` de 320 px, evitando que el canvas desaparezca o desborde el card.
- **Altura padre conservada**: La fila mantiene 430 px en `chart-grid-compact`, pero el contenido interno ya no compite con el padding del card.

#### [v1.5.7] - 2026-07-15
##### Corregido
- **Altura fija en padre de graficos**: La fila de torta/barras usa `chart-grid-compact` con 430 px, evitando que el dashboard crezca demasiado en pantalla completa.
- **Panel interno mas contenido**: `chart-panel` baja a 240 px de alto minimo para ajustarse a la altura definida por el padre sin recortar controles o leyendas.

#### [v1.5.6] - 2026-07-15
##### Corregido
- **Altura simetrica de torta y barras**: Los dos paneles de grafico usan `chart-panel` compacto de 320 px, evitando el crecimiento vertical excesivo de la fila.
- **Torta centrada verticalmente**: El grafico de metodos modernos usa `chart-panel--center` y `height="100%"` para ocupar su zona sin quedar pegado arriba.

#### [v1.5.5] - 2026-07-15
##### Corregido
- **Alineacion uniforme de tarjetas de graficos**: Se retiro `items-start` de la fila de torta/barras para recuperar el estiramiento natural del grid y evitar tarjetas con alturas distintas.
- **Panel de grafico desde Atomic UI**: El grafico mensual usa `chart-panel`, manteniendo alto minimo estable y llenando el alto de la tarjeta estirada sin crecer por fuera del card.

#### [v1.5.4] - 2026-07-15
##### Corregido
- **Resize del grafico desde Atomic UI**: Se sincronizo `app-chart` con el ADN Atomic para que el canvas observe su contenedor y se redimensione con Chart.js sin depender de cambios agresivos en la tarjeta padre.
- **Alto estable del panel mensual**: El grafico mensual vuelve a usar el alto estable del contenedor (`h-380`) y conserva el padding compacto; la mejora visual queda en el canvas y en las opciones compactas del grafico.

#### [v1.5.3] - 2026-07-15
##### Corregido
- **Grafico mensual compacto**: Se agrego `h-300`, se redujo el padding del panel de barras y se compacto la leyenda/ejes de Chart.js para aprovechar mejor el alto disponible.
- **Tarjetas de graficos sin estiramiento cruzado**: La fila de torta y barras ahora usa `items-start`, evitando que una tarjeta herede el alto de la tarjeta hermana dentro del grid.

#### [v1.5.2] - 2026-07-15
##### Corregido
- **Alto controlado del grafico mensual**: Se retiro el crecimiento flexible global de `app-card` y el panel mensual vuelve a usar `h-380`. El canvas del grafico de barras ocupa esa zona fija sin hacer crecer la tarjeta hermana del grafico de torta.

#### [v1.5.1] - 2026-07-15
##### Corregido
- **Grafico de avance mensual**: Se elimino el espaciador superior del panel, se configuro `app-chart` con `height="100%"` y se ajusto el host del componente para ocupar todo el alto del contenedor padre.
- **Contraste visual en modo claro**: Se reforzaron los tokens de grilla y ejes de Chart.js para que las lineas del grafico permanezcan visibles al alternar entre tema claro y oscuro.

#### [v1.5.0] - 2026-07-09
##### Corregido
- **Cadena de conexión Tiberius:** En esa versión se aplicó temporalmente `encrypt=DANGER_PLAINTEXT` para diagnosticar un servidor sin TLS compatible. Esta práctica quedó obsoleta y prohibida desde 2026-07-27; el estado vigente exige TLS y validación de certificado.
- **Timeout de Conexión**: Aumentado de 3 a 10 segundos para alinear el comportamiento con Wails y evitar desconexiones prematuras en redes lentas.
- **`autoConnect()` — Retry Loop**: Se agregó un bucle de reintentos (10 × 100ms) para esperar a que `__TAURI_INTERNALS__` esté disponible antes de invocar credenciales, homologando el patrón de Wails.
- **Build de Producción**: Corregido el proceso de compilación: el ejecutable de distribución debe generarse con `tauri build --no-bundle` (CLI de Tauri) y NO con `cargo build --release` directo, ya que solo el CLI embebe correctamente el frontend en el binario.

#### [v1.4.3] - 2026-07-08
##### Añadido
- **Estado de carga UI (Angular):** Se incorporó el estado global reactivo `isLoadingData` en `PacienteService` y se visualizó en `dashboard.component.ts` para sustituir banners de alerta por un indicador durante la sincronización.
- **Registro histórico de Tauri:** Esta versión incorporó inicialmente un archivo de depuración local. Ese mecanismo quedó obsoleto en `v1.5.12`; la implementación vigente usa registros rotativos en el directorio de datos de la aplicación y excluye PII, contraseñas, tokens y cadenas de conexión.

##### Arreglado
- **Tiempos artificiales de interfaz:** Se eliminó la retención visual asíncrona de estados anteriores al seleccionar nuevos filtros.
- **Optimización histórica de SQL Server:** Se aplicó `OPTION (RECOMPILE)` para mitigar planes de ejecución inadecuados. La arquitectura vigente exige que esta cláusula resida dentro de los procedimientos almacenados versionados y no en los repositorios Go o Rust.
- **Desconexión prematura:** Se ajustó el manejo histórico del tiempo de espera. La implementación vigente aplica límites explícitos de conexión y consulta en el backend.

#### [0.9.2] - 2026-07-08

##### Added
- **Datos simulados históricos:** Esta versión restauró temporalmente datos prefabricados como respaldo visual. El comportamiento quedó obsoleto y prohibido para producción en `v1.5.12`; una falla de conexión o un contrato SQL inválido ahora se informa y no se reemplaza con información ficticia.
#### [0.9.1] - 2026-07-08

##### Fixed
- **Gráfico de Insumos (Empty State)**: Se solucionó el problema por el cual el gráfico de torta de "Insumos" no renderizaba ningún dato en absoluto. La vista SQL (VW_DASHBOARD_STATS_ID11.sql) tenía los valores hardcodeados en 0. Se alteraron las vistas VW_NOMINAL_ID11 para exportar Valor_Lab y VW_DASHBOARD_STATS_ID11 para hacer un SUM de las cantidades físicas, permitiendo a la librería gráfica Chart.js renderizar los porcentajes correctamente.
#### [0.9.0] - 2026-07-02

##### Uniformizacion UI y Chart reactivo a temas

###### Fixed
- **Input shadows uniformes**: `--input-shadow`/`--input-shadow-hover` alineados con `select2` via `var(--shadow-sm/md)`. Tokens propagados desde Atomic-UI.
- **Focus ring de `floating-input`**: Cambiado de `0 0 0 3px var(--hover-background)` a `var(--input-shadow-focus)` para ser identico al focus ring de `select2`.
- **`chart.component.ts` reactivo a temas**: `MutationObserver` detecta cambios de `data-theme`/`class` y actualiza Chart.js defaults + fuerza recreacion del canvas. Resuelve el bug donde los colores de texto/grilla del chart no cambiaban al cambiar de tema en Tauri.
- **`.gitignore` completado**: `.history/` en `src-tauri/`, `.env.local` ya cubierto.

---

#### [0.8.0] - 2026-07-01

##### Sincronizacion con Atomic-UI + Seguridad + Limpieza de Codigo

###### Added
- **5 componentes propagados desde Atomic-UI**: `language-switcher`, `table-actions` (x3 archivos) y `footer` ahora disponibles en `src/app/shared/ui/`.
- **`@ngx-translate/core@^17.0.0`**: Dependencia instalada (requerida por los nuevos componentes `language-switcher`, `table-actions` y `footer`).

###### Fixed
- **`lib.rs` — referencia huerfana eliminada**: `get_dashboard_stats` seguia listado en `use` y en `tauri::generate_handler![]` aunque la funcion fue eliminada en versiones anteriores. Causaba error de compilacion `E0432`. Removido.
- **`src/bin/test_db.rs` — structs duplicados eliminados**: `PacienteDescartado` y `PaginatedDescartados` estaban redefinidos localmente. Ahora importan desde `tauri_angular_app_lib::domain::paciente`, eliminando el import sin uso de `bb8_tiberius::ConnectionManager`.
- **`topbar` y `layout-shell`**: Actualizados para incluir `LanguageSwitcherComponent` y `FooterComponent` correctamente.

###### Security
- **`.gitignore` actualizado**: Ahora cubre `.env`, `.env.local`, `.env.*.local` en la raiz y `src-tauri/db.json`. Las credenciales de desarrollo local quedan excluidas del repositorio.

---

#### [0.7.0] - 2026-06-26
##### Changed
- **Reemplazo de Métricas de Continuidad por Grupos de Edad**: Reemplazadas las tarjetas de métricas "Próximos a Vencer", "Continuadores" y "Abandono" por el "Total Atendidas por Mes", "Menores de 15 años" y "Mayores de 49 años" (excluidos del denominador).
- **Cómputo en BD (DB-First)**: Los cálculos de rangos de edad y pacientes atendidas mensuales únicas se realizan directamente en la vista SQL Server `ind.VW_DASHBOARD_STATS_ID11`, evitando cálculos matemáticos en backend y frontend.
- **Sincronización Wails Go & Tauri Rust**: Estructuras del dominio y repositorio mapeadas en ambos backends con las nuevas columnas de la base de datos.
- **Actualización de la UI y Mock Data**: Actualizadas las tarjetas del Tablero Gerencial en Angular y los servicios de datos simulados correspondientes.
- **Rectificación de Vista Nominal (Especialidades Cruzadas)**: Corregida la vista `ind.VW_NOMINAL_ID11` para que filtre su cohorte base mediante los códigos de consejería de Planificación Familiar (`99402.04`, `99402.07`, `Z3002`) en lugar del filtro genérico `Valor_Lab = 'TA'`. Esto previene el ingreso erróneo de registros de Odontología/otros y reduce los registros nulos `"Otro"` en el gráfico circular de 195 a solo 50.
- **Inclusión de Exclusión de Menores de 15**: Se añadió la regla de exclusión `'Excluido (Edad < 15)'` a `Estado_Continuidad` para alinear los totales nominales con la cohorte del indicador.

#### [0.6.0] - 2026-06-24
##### Añadido
- **Módulo Operativo con Fila de Métricas**: Se implementaron 4 tarjetas de métricas superiores (Numerador, Denominador, Porcentaje e Indicador de Total de AT) en la vista operativa.
- **Filtro Nominal (Valor_Lab = 'TA')**: El listado de la vista nominal se restringe automáticamente a las atenciones reales que tengan `Valor_Lab = 'TA'`.

#### [0.5.0] - 2026-06-24
##### Eliminado
- **Estructura y Comando get_resultados_id11**: Se eliminó la estructura obsoleta `ResultadosID11` y su correspondiente comando Tauri `get_resultados_id11` en todas las capas del backend Rust (domain, service, repository, interfaces y lib.rs).

#### [0.4.0] - 2026-06-24
##### Arreglado
- **Autofocus Programático**: Reemplazado el atributo nativo `autofocus` (el cual falla en elementos renderizados de forma dinámica con `@if` en Angular) por un enfoque programático basado en `setTimeout` e IDs únicos (`admin-pwd-input` y `db-server-input`).
- **Toggles de Visibilidad de Contraseña**: Agregados iconos de ojo para alternar la visibilidad de la contraseña en el Paso 1 y Paso 2 de configuración.
- **Envío con Enter**: Enlazado el evento `keydown.enter` en los inputs para permitir avanzar y enviar la configuración con la tecla Enter.

#### [0.3.0] - 2026-06-23
##### Arreglado
- **Dropdown Option Click Propagation**: Solucionado el bug en Select2Component donde la selección de una opción cerraba prematuramente el menú sin actualizar Angular. Se aisló el evento `click` con `stopPropagation()` y `mousedown` con `preventDefault()`.
- **Base de Datos (Procedimiento Almacenado)**: Se actualizó la firma del SP `ind.USP_SEL_GRILLA_NOMINAL_ID11` en la base de datos para aceptar `@I_MES` e `@I_ANIO`, permitiendo que el backend Rust (Tiberius) y Angular carguen de forma exitosa los datos reales de Abril 2026.

#### [0.2.0] - 2026-06-23
##### Fixed
- **Rust Backend Crashes**: Reemplazado row.get por row.try_get() para evitar panics del driver de base de datos y caídas silenciosas.
- **Tiberius TLS:** En esa versión se desactivó temporalmente el cifrado para aislar una incompatibilidad del servidor. La decisión quedó reemplazada el 2026-07-27 por TLS obligatorio; la infraestructura debe corregir el certificado o suministrar una CA válida.
- **UI Select Dropdowns**: Sincronización del bug de Wails Select2Component reemplazando los bindings con setTimeout.

#### [0.1.0] - 2026-06-19
##### Añadido
- **UI del CRM ID 11**: Implementación de la interfaz de usuario en Angular para el CRM HRA (ID 11).
- **Tablero Gerencial**: Visualizaciones analíticas basadas en señales reactivas de Angular, empleando `chart.js` a través del wrapper `app-chart`.
- **Módulo Operativo**: Implementación de tabla (`app-table`) con filtrado por estados de alerta.
- **Mock de Datos**: Integración de `PacienteService` simulando el volumen de datos esperado para el análisis previo de la conexión con SQL Server.

##### Fixed
- Corrección visual en cuadros de mando (Gerencial y Operativo) asegurando el uso de variant="elevated" para mantener jerarquías de color consistentes.
- Alineación vertical perfecta mediante Flexbox en todas las tarjetas de estadísticas.

#### [2026-07-07] - Corrección de lógica y Mantenimiento del Indicador 11
- **Añadido:** Creación del documento analítico docs/INDICADOR_11_DESGLOSE.md para resguardar la lógica de negocio y las lecciones aprendidas sobre el cruce de variables del Indicador 11.
- **Corregido:** Se clarificó la diferenciación operativa entre el Numerador oficial (ind.resultados_indicador_11) y el Total TA operativo en VW_DASHBOARD_STATS_ID11.
- **Corregido:** Bloqueo de los botones 'Definitivos' (D) y 'Repetitivos' (R) en Angular cuando se visualiza la sección de Insumos, forzando la vista general ("Todos") para evitar inconsistencias en el desglose de Valor_Lab.

</details>


