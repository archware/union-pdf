---
title: "Lecciones aprendidas de Base Tauri"
subtitle: "Decisiones técnicas y preventivas del proyecto"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-23"
document_type: "registro técnico"
status: "vigente"
canonical: true
version: "1.6.1"
---

# Lecciones aprendidas

El documento registra las decisiones arquitectónicas, los problemas encontrados y las soluciones aplicadas durante el desarrollo del proyecto.

## El transporte asíncrono y la respuesta de negocio son contratos distintos

- **Fecha:** 2026-08-23
- **Problema:** Tauri exige que los comandos asíncronos que reciben `State`
  devuelvan un `Result` de transporte. Devolver directamente
  `RespuestaSistemaV1<T>` impide que la macro del comando garantice la vida
  útil y el envío seguro del futuro, aunque el envoltorio ya represente los
  errores de negocio.
- **Solución:** Los comandos canónicos devuelven
  `Result<RespuestaSistemaV1<T>, String>` en la frontera técnica y construyen
  siempre un valor `Ok` para los resultados controlados. Las fallas de
  validación, administración, conexión y TLS se representan exclusivamente en
  `RespuestaSistemaV1.error`; el canal `Err` queda reservado para una falla del
  transporte que impida producir el contrato.
- **Lección:** Un envoltorio funcional no sustituye las obligaciones del
  marco IPC. La separación explícita evita mezclar una indisponibilidad del
  canal con una respuesta válida que informa un error recuperable.
- **Recomendación:** Todo comando Tauri asíncrono futuro deberá conservar ambos
  niveles, probar la serialización `camelCase` y demostrar que no incorpora
  detalles internos en `RespuestaSistemaV1`.

## La fachada permite migrar canales sin acoplar la interfaz

- **Fecha:** 2026-08-23
- **Problema:** El componente principal y el servicio clínico importaban
  `invoke`, conocían nombres de comandos y construían cargas específicas del
  sistema de escritorio. Cada cambio del puente obligaba a modificar lógica de
  presentación y pruebas extensas.
- **Solución:** Se concentró el acceso IPC en `DesktopFacadeService`. La
  fachada adapta los DTO canónicos de administración y conexión al modelo
  interno compatible, mientras mantiene temporalmente las consultas clínicas
  detrás de métodos en español hasta que sus respuestas dispongan de DTO
  `camelCase` propios.
- **Lección:** Una frontera única permite una migración incremental verificable
  y evita que los componentes conozcan detalles de Tauri, sin exigir una
  sustitución simultánea de todos los contratos existentes.
- **Recomendación:** Ningún componente o servicio funcional nuevo deberá
  importar `@tauri-apps/api/core`; todo canal adicional se incorporará primero
  al backend, después a la fachada y finalmente a su consumidor.

## La reutilización explícita de una credencial depende de su identidad

- **Fecha:** 2026-08-23
- **Problema:** La interfaz exigía seleccionar de forma explícita la
  reutilización de la contraseña SQL, pero la selección podía conservarse al
  cambiar servidor, base de datos o usuario y no se limpiaba en todos los
  cierres del cuadro.
- **Solución:** La opción se habilita únicamente cuando la identidad escrita
  coincide con los metadatos protegidos, se invalida en cada edición y se
  restablece al revocar la sesión. La suite reproduce primero una selección
  válida y después el cambio de identidad.
- **Lección:** Una autorización explícita sobre un secreto almacenado no es un
  booleano aislado; queda vinculada a la identidad exacta para la cual se
  concedió.
- **Recomendación:** Toda reutilización de credenciales deberá comprobar la
  identidad tanto al habilitar la opción como antes de cruzar la frontera IPC,
  con una prueba que demuestre la transición de habilitado a bloqueado.

## La procedencia exige publicación, instalación y verificación

- **Fecha:** 2026-08-23
- **Problema:** Las correcciones de Atomic UI 5.22.0 debían probarse en el
  consumidor, pero actualizar el manifiesto antes de publicar el commit remoto
  habría producido una procedencia que CI no puede reproducir.
- **Solución:** Se sincronizaron y validaron las fuentes compatibles, se
  conservaron fuera del archivo gobernado los metadatos históricos y se mantuvo
  la procedencia anterior hasta publicar el OID canónico. Después de comprobar
  su recuperación desde el remoto se ejecutó el instalador oficial, se
  renovaron las instantáneas adaptadas y se obtuvo una compuerta verde.
- **Lección:** La igualdad de contenido, la publicación remota y la instalación
  de procedencia son evidencias distintas. Ninguna sustituye a las otras.
- **Recomendación:** Toda adopción futura deberá respetar el orden auditoría,
  publicación, instalación, revisión de instantáneas y `check:atomic`; ningún
  paso deberá atribuir evidencia correspondiente a una etapa posterior.

## Los tests del runner consumidor forman parte de la adaptación

- **Fecha:** 2026-08-23
- **Problema:** Las especificaciones canónicas usan utilidades Jasmine que el
  runner Vitest del consumidor no ofrece, aunque la lógica probada sí sea
  portable.
- **Solución:** Se preservaron los escenarios y se tradujeron únicamente
  espías, temporizadores y aserciones al API de Vitest. Las fuentes de
  implementación permanecen exactas bajo canonicalización LF.
- **Lección:** Una especificación adaptada no implica una implementación
  divergente; la procedencia debe distinguir ambas clases de archivo.
- **Recomendación:** Las futuras propagaciones deberán revisar el runner antes
  de copiar una especificación y conservar el escenario, no la sintaxis de una
  biblioteca incompatible.

## El nombre distribuido no debe cambiar la identidad interna del compilador

- **Fecha:** 2026-08-22
- **Problema:** El basename `tauri-angular-app.exe` es una identidad técnica de Cargo y no explica al personal de QA qué función cumple el ejecutable ni que la versión sigue en Beta.
- **Solución:** La salida interna se conserva para no romper Cargo, Tauri ni los metadatos PE. La promoción copia los mismos bytes con un nombre descriptivo que incorpora producto, función, versión y canal; el manifiesto registra tanto el nombre promovido como `original_filename=tauri-angular-app.exe`.
- **Lección:** La identidad técnica de construcción y la identidad operativa de distribución son contratos diferentes y ambos deben quedar verificables.
- **Recomendación:** Ningún script deberá renombrar el binario dentro de `target`; el cambio de nombre se efectuará exclusivamente durante la promoción transaccional.

## La condición de sustituido requiere migración completa

- **Fecha:** 2026-08-21
- **Problema:** Varios documentos se declaraban sustituidos aunque el changelog histórico, las decisiones sobre vistas y procedimientos y dieciocho categorías de lecciones todavía no aparecían en los destinos indicados.
- **Solución:** El contenido íntegro se trasladó a los registros y manuales canónicos como anexos con procedencia. El retiro se realizó únicamente después de preservar metadatos, ejemplos, vínculos y contexto de versión.
- **Lección:** El campo `superseded_by` expresa una garantía de conservación, no solo una preferencia de navegación. El destino debe contener todo el conocimiento único antes de retirar la fuente.
- **Recomendación:** Toda sustitución futura deberá comparar secciones, verificar enlaces entrantes y conservar como histórica cualquier recomendación cuya vigencia dependa de una versión anterior.

## Diagramación honesta de una inversión parcial

- **Fecha:** 2026-08-21
- **Problema:** Una representación hexagonal genérica podía sugerir que `TiberiusRepository` implementaba un puerto, aunque `PacienteService` importa y almacena directamente ese tipo concreto.
- **Solución:** Los diagramas muestran la dependencia implementada con una flecha directa y representan el puerto únicamente como ausencia registrada para una evolución posterior. La secuencia pública también distingue los modelos clínicos directos de los sobres administrativos V1.
- **Lección:** Un diagrama arquitectónico debe describir el código ejecutable, incluso cuando revela una deuda. Dibujar una abstracción inexistente impide valorar el acoplamiento y crea expectativas de pruebas que el diseño actual no soporta.
- **Recomendación:** La incorporación futura del trait de repositorio será aditiva, mantendrá los casos y DTO compatibles y actualizará simultáneamente código, pruebas y los cuatro diagramas canónicos.

## Documentación derivada de fuentes verificables

- **Fecha:** 2026-08-20
- **Problema:** Varias guías copiadas entre bases mezclaban nombres de módulos, rutas, códigos clínicos, mecanismos TLS y afirmaciones de despliegue que no coincidían con el código vigente.
- **Solución:** La suite canónica se derivó de `package.json`, `Cargo.toml`, `tauri.conf.json`, `lib.rs`, módulos de infraestructura, contratos de base de datos, scripts locales y archivos de bloqueo. Las fuentes anteriores quedaron conservadas y marcadas como sustituidas.
- **Lección:** Un manual operativo debe declarar su fuente exacta y distinguir configuración, validación local y despliegue. La similitud entre bases no autoriza copiar contratos ni mecanismos de seguridad.
- **Recomendación:** Toda modificación de comandos, credenciales, SQL, DTO o IPC debe actualizar el manual canónico, el registro de cambios y la prueba estática correspondiente en la misma entrega.

## Vinculación del recuperador con su producto

- **Fecha:** 2026-08-20
- **Problema:** Una copia Python/PyInstaller perteneciente al Acopiador de Indicadores había sido almacenada con el nombre del recuperador de Base Tauri. El ejecutable escribía en un servicio de credenciales distinto y, por ello, el cambio de contraseña no podía ser consumido por la aplicación.
- **Solución:** Se restauró el recuperador Rust compilable, se eliminaron las copias contaminantes y se fortaleció el verificador de paquete para comparar la estructura del PE firmado con el PE Rust revisado. La comparación solo tolera el checksum, el directorio de seguridad, el relleno de alineación y la tabla `WIN_CERTIFICATE` que Authenticode modifica o añade.
- **Lección:** El nombre de archivo y una firma válida no prueban la identidad funcional de un ejecutable. La cadena de entrega debe vincular producto, fuente revisada, destino de credenciales y transformación de firma.
- **Recomendación:** La firma institucional debe aplicarse al PE Rust revisado y el inventario resultante debe conservar ambas huellas SHA-256. Las pruebas automatizadas deben seguir utilizando almacenes aislados y nunca la bóveda real del usuario.

## Ciclo de vida documental

- **Fecha:** 2026-08-20
- **Problema:** El proyecto requería estandarizar la trazabilidad de las mejoras.
- **Solución:** Se adoptó el flujo de roadmap, ejecución, cierre, registro de cambios y lecciones aprendidas.

## Anexo consolidado: lessons learned

> Procedencia: `docs/LESSONS_LEARNED.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/LESSONS_LEARNED.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Lecciones aprendidas de Tauri Angular"
subtitle: "Reglas operativas de arquitectura, base de datos y frontend"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-07-27"
last_updated: "2026-08-20"
document_type: "registro histórico"
status: "sustituido"
canonical: false
superseded_by: "../LESSONS_LEARNED.md"
```


> Documento histórico conservado por trazabilidad. El registro vigente es
> [`../LESSONS_LEARNED.md`](LESSONS_LEARNED.md).

#### 23. Optimización de consultas SQL, parameter sniffing y sincronización de UI
- **Contexto:** Se experimentaba una falsa sensación de lentitud (tiempos de respuesta mayores a 3s y fallas de timeout) al cambiar de mes en los Dashboards de Wails y Tauri. Los banners de advertencia amarillos se mantenían en pantalla mientras se procesaba la carga de la base de datos.
- **Problema:** Existían dos cuellos de botella críticos. 1) En el backend de Wails y Tauri (Rust y Go), los repositorios ejecutaban llamadas al servidor SQL con parámetros nulos condicionales, provocando un efecto conocido como *Parameter Sniffing*, donde el motor de base de datos reciclaba un plan de ejecución ineficiente para esos parámetros (forzando Timeouts de conexión). 2) En el frontend (Angular), la UI no poseía un estado intermedio explícito para la 'Sincronización de Datos', causando que los componentes mantuvieran visualizados los banners de *Mock Data* mientras esperaban la respuesta de red, lo que el usuario percibía como *lentitud artificial*.
- **Lección Aprendida:**
  - **DB-first / rendimiento:** No se deben enviar consultas complejas con filtros opcionales dinámicos (`IS NULL`) desde Go, Rust o cualquier backend de escritorio. La capa backend debe ejecutar únicamente procedimientos almacenados parametrizados mediante `EXEC ind.USP_*`. La cláusula `OPTION (RECOMPILE)`, las referencias a vistas, los CTE, los `JOIN`, los filtros, el ordenamiento y la paginación deben residir dentro de los scripts versionados de base de datos (`database/sps` y `database/views`). De esta manera, SQL Server mantiene la responsabilidad de optimización y los repositorios se limitan a abrir conexión, enviar parámetros, leer result sets y mapear DTOs.
  - **UX-First:** Nunca se debe superponer el estado anterior (Ej. Banners de Error o Mocks) con una petición de red en curso. Se debe implementar obligatoriamente un estado global reactivo \isLoadingData\ que limpie los banners instantáneamente y presente un *Spinner* o *Loader*. La UI debe mostrar respuestas e interacciones de microsegundos incluso si el servidor subyacente es lento.
  - **Trazabilidad nativa por entorno:** Tauri y Wails deben ofrecer categorías de auditoría funcionalmente equivalentes sin copiar implementaciones entre lenguajes. Tauri utiliza un registrador rotativo en el directorio de registros de la aplicación; no se escribe `tauri_debug.log` en la carpeta del ejecutable y no se registran búsquedas, DNI, contraseñas, tokens ni cadenas de conexión.

#### [2026-07-16] - Reserva inferior en tablas nominales con barra horizontal
- **Contexto:** El modulo operativo de Tauri renderiza la misma grilla nominal Angular que Wails, pero ejecutada dentro del WebView de Tauri. La ultima fila podia quedar visualmente incompleta cuando el cuerpo de tabla tenia scroll vertical y la tabla tambien requeria desplazamiento horizontal.
- **Problema:** La primera correccion intento crear espacio final mediante un pseudo-elemento asociado al `tbody`. En una tabla sincronizada con grid y `tbody[data-so-vertical]`, ese enfoque no garantiza que el cierre inferior forme parte del area scrolleable real.
- **Leccion aprendida:** La reserva visual de cierre debe vivir en el scroller real (`tbody[data-so-vertical]`) mediante `padding-bottom` y `scroll-padding-bottom`, activada solo cuando el host tiene `so-has-overflow-x`. El valor homologado desde Atomic UI es `calc(var(--so-track-size) + var(--space-8))`.
- **Criterio de validacion:** La ultima fila debe mostrar completo el chip de estado, el chip de `Estado TA` y el detalle `Meta / Entregas` sin quedar debajo de la barra horizontal. Cualquier ajuste futuro debe realizarse primero en Atomic UI y luego propagarse a Tauri.

#### [2026-07-10] - Contrato obligatorio de acceso a datos por procedimientos almacenados
**Contexto**: Se detectó SQL embebido en repositorios de infraestructura, principalmente consultas contra vistas analíticas para dashboard y descartados. Aunque parte del flujo nominal ya consumía procedimientos almacenados, el contrato DB-first estaba incompleto y permitía que Tauri ejecutara consultas compuestas desde Rust.
**Regla operativa**: Los repositorios Go y Rust no deben contener SQL de negocio ni construir sentencias con `SELECT`, `FROM`, `WHERE`, `JOIN`, `ORDER BY`, `OFFSET` o `FETCH NEXT`. La única sentencia permitida en código de infraestructura es una llamada parametrizada a procedimientos almacenados del esquema `ind`, por ejemplo `EXEC ind.USP_SEL_DASHBOARD_STATS_ID11`. Toda lógica SQL debe quedar versionada en `database/sps` o `database/views`, con nombres homologados entre Wails y Tauri.
**Criterio de revisión**: Antes de cerrar una corrección de datos, debe ejecutarse un barrido con `rg` sobre `internal/infrastructure/db` y `src-tauri/src/infrastructure/db`. El resultado esperado es que solo aparezcan constantes `EXEC ind.USP_*`, comentarios o nombres de funciones; cualquier consulta directa se considera deuda crítica y debe migrarse a un procedimiento almacenado.

#### [2026-07-01] - Referencias Huerfanas en lib.rs y Structs Duplicados en Binarios

##### 1. Referencias Huerfanas en lib.rs tras Eliminar Funciones
**Contexto**: Al eliminar la funcion `get_dashboard_stats` y la estructura `DashboardStats` (con `#[serde(rename_all = "camelCase")]`) en versiones anteriores, se omitio limpiar las referencias en `lib.rs`: el `use` del modulo y la entrada en `tauri::generate_handler![]`. Esto genero un error `E0432: unresolved import` que impedia la compilacion completa del crate.
**La Leccion**: En Tauri (y Rust en general), cada funcion marcada con `#[tauri::command]` debe estar registrada en `generate_handler![]` en `lib.rs`. Al eliminar una funcion, se deben limpiar simultaneamente: (1) la definicion en `tauri_cmds.rs`, (2) el `use` en `lib.rs`, y (3) la entrada en `generate_handler![]`. Ejecutar `cargo check` despues de cada eliminacion es obligatorio.

##### 2. Structs Duplicados en Binarios de Desarrollo (`src/bin/`)
**Contexto**: `src/bin/test_db.rs` redefinia localmente `PacienteDescartado` y `PaginatedDescartados`, que ya existian identicos en `domain/paciente.rs`. Esto introducia deuda tecnica y riesgo de divergencia silenciosa si el struct del dominio se actualizaba.
**La Leccion**: Los binarios en `src/bin/` pueden acceder al lib crate del mismo package usando `use <lib_name>::...`. Con `[lib] name = "tauri_angular_app_lib"` declarado en `Cargo.toml` y `crate-type = ["rlib"]`, el import correcto es `use tauri_angular_app_lib::domain::paciente::{PacienteDescartado, PaginatedDescartados}`. Los binarios de desarrollo nunca deben redefinir tipos que ya existen en el dominio.

---

#### [2026-06-26] - Regla DB-First para Métricas Complejas y Desglose por Edad
**Contexto**: El cliente solicitó desglosar métricas complejas (Total de atendidos mensuales, menores de 15 años y mayores de 49 años excluidos del denominador por edad) de forma reactiva y sincrónica en el backend y frontend.
**La Lección**: De acuerdo con la arquitectura HRA del proyecto, ningún backend (Go/Rust) ni frontend (Angular) debe realizar operaciones aritméticas complejas o cálculos de agrupamiento de edad. Resolver estas agrupaciones en el servidor SQL Server (usando subconsultas y CTEs optimizadas en la vista `ind.VW_DASHBOARD_STATS_ID11`) garantiza una única fuente de verdad. El backend y frontend se limitan únicamente a escanear, mapear y renderizar las columnas tal cual las provee la base de datos, manteniendo el sistema libre de discrepancias lógicas entre sus diferentes plataformas (Wails vs. Tauri).

#### [2026-06-24] - Alineación de Vista de Detalle y Métricas Macro (Valor_Lab = 'TA')
**Contexto**: El listado nominal (`ind.VW_NOMINAL_ID11`) no coincidía con las métricas del indicador al incluir registros que carecían del registro de planificación familiar `Valor_Lab = 'TA'` en la cita respectiva.
**La Lección**: En arquitecturas de dashboards de indicadores de salud, la granularidad nominal del CRM debe responder de forma estricta y transparente a las reglas de negocio del indicador principal. Redefinir la vista de base de datos nominal para filtrar en cascada sobre los códigos base (`Valor_Lab = 'TA'`) alinea de forma transparente el total nominal mostrado con el numerador y denominador históricos, eliminando discrepancias e incrementando la confianza del usuario final.

#### [2026-06-24] - Limpieza de Estructuras y Comandos Obsoletos en Backend Rust
**Contexto**: Se requería remover la estructura `ResultadosID11` y su comando Tauri `get_resultados_id11`, los cuales quedaron obsoletos tras la integración de dashboards unificados.
**La Lección**: Al eliminar estructuras de dominio y comandos asociados en una aplicación Tauri multipartes, se debe seguir una depuración secuencial a través de todas las capas:
1. Remover la definición del tipo en la capa de Dominio (`paciente.rs`).
2. Limpiar las firmas y llamadas en la capa de Aplicación/Servicio (`paciente_service.rs`).
3. Retirar las consultas SQL y el mapeo en el Repositorio de Infraestructura (`tiberius_repository.rs`).
4. Quitar la definición de comando expuesta en la interfaz de Tauri (`tauri_cmds.rs`).
5. Quitar el comando de la macro `generate_handler!` en `lib.rs` para prevenir errores de compilación por símbolos faltantes.

#### [2026-06-24] - Limitación de Autofocus en Elementos Dinámicos de Angular
**Contexto**: El atributo HTML nativo `autofocus` no funciona en modales o secciones que se muestran dinámicamente mediante `@if` o `*ngIf` en Angular.
**La Lección**: Debido a que Angular inyecta estos elementos en el DOM después del ciclo de carga de la página, el navegador no vuelve a evaluar el atributo `autofocus`. La solución recomendada consiste en asignar un ID único al input y usar `setTimeout(() => document.getElementById(...).focus(), 100)` tras modificar la variable de control de renderizado, garantizando que el elemento exista y reciba el foco inmediatamente.

#### [2026-06-23] - Tiberius Panics & TLS Fallbacks
##### 1. Tiberius Data Panics
**Contexto**: El dashboard mostraba Datos de prueba a pesar de que el ping a DB funcionaba.
**Lección vigente:** En Rust, `row.get` puede ocultar una suposición infalible sobre el tipo SQL. El repositorio debe usar `try_get`, propagar errores de tipo o de columna y rechazar valores nulos en campos contractualmente obligatorios. No se permite convertir fallas de lectura en `0`, texto vacío, `None` o colecciones vacías, porque esa conversión oculta la deriva del esquema.

##### 2. Excepción TLS en SQL Server antiguo

**Contexto:** La negociación fallaba cuando el servidor no presentaba una cadena de confianza compatible. En una etapa histórica se utilizó `encrypt=DANGER_PLAINTEXT` como mecanismo de diagnóstico.

**Lección vigente:** Una incompatibilidad criptográfica no autoriza el transporte de datos clínicos sin cifrado. La infraestructura debe instalar un certificado válido, actualizar SQL Server o proporcionar una CA mediante `HRA_SQL_CA_CERT`. Tiberius debe mantener `EncryptionLevel::Required`. La aceptación de un certificado sin validación queda limitada a compilaciones `debug` con `HRA_DEV_ALLOW_INVALID_CERT=true` y no constituye una configuración de distribución.

#### [2026-07-09] - Proceso Correcto de Build en Tauri para Producción
**Contexto**: Al compilar con `cargo build --release` directamente, el ejecutable resultante no embebe el frontend Angular y muestra `ERR_CONNECTION_REFUSED` al intentar conectarse al `devUrl` (localhost).
**La Lección**: En Tauri v2, el único proceso que embebe correctamente el frontend en el binario es el CLI de Tauri: `npm run tauri build` o `tauri build --no-bundle`. `cargo build --release` compila el Rust pero no llama al pipeline de bundling del CLI. El tamaño del binario aumenta en ~1 MB cuando el frontend es correctamente embebido.

#### [2026-07-09] - Configuración de conexión para Tiberius

**Contexto:** El backend Tauri utilizaba un parámetro perteneciente a ADO.NET, por lo que la configuración no representaba el contrato real de Tiberius.

**Lección vigente:** La conexión debe construirse mediante `tiberius::Config`, `AuthMethod::sql_server` y `EncryptionLevel::Required`, sin concatenar una cadena que contenga la contraseña. La validación se realiza contra el almacén de confianza del sistema o contra `HRA_SQL_CA_CERT`. El valor histórico `encrypt=DANGER_PLAINTEXT` queda documentado únicamente como antecedente y no debe volver a producción.

#### [2026-07-06] - Uso Correcto de Variantes de Tarjeta y Alineación (Atomic-UI)
- **Problema:** Al utilizar <app-card variant="filled"> en contenedores grid, los fondos se veían planos sin profundidad, y el texto interior no se alineaba verticalmente causando desbalances estéticos. Inicialmente se intentó "hackear" el CSS agregando bordes y sombras al variant filled.
- **Solución y Regla de Oro:** NO hackear los estilos base. El sistema Atomic-UI contiene la variante elevated que utiliza el color de fondo --surface-elevated y aplica las sombras predefinidas según el tema claro/oscuro. Además, para las cuadrículas (CSS Grid), el contenedor interno de la tarjeta debe utilizar class="text-center h-full d-flex flex-col justify-center" para alinear los elementos dinámicamente y centrar de forma perfecta.

##### [2026-07-08] Desarrollo Independiente y Sintaxis Nativa (Arquitectura Desacoplada)
- **Contexto:** Al abordar problemas en el mapeo de variables desde bases de datos, se intentó replicar (hacer análoga) la lógica del ecosistema de Wails (Go) directamente al ecosistema de Tauri (Rust).
- **Problema:** Wails (Go) y Tauri (Rust) manejan el acceso a base de datos, mapeo JSON, y serialización de formas muy distintas (ej. `row.Scan` vs `tiberius` y `serde`). Tratar de forzar que Tauri funcionara exactamente con las convenciones, nombres de variables o estructuras parciales copiadas de Wails ocasionó roturas críticas en el frontend al intentar pintar la data.
- **Lección Aprendida:** **NUNCA se debe asumir que una mejora en Wails es análoga a Tauri.** Queda estrictamente prohibido desarrollar mezclando o copiando sintaxis entre ecosistemas. A partir de ahora, cada ecosistema (Python, Wails, Tauri) debe ser desarrollado **de forma individual con su sintaxis nativa** y respetando sus propios paradigmas y librerías. Cualquier nueva característica o corrección requiere una auditoría profunda e independiente en su respectivo entorno para solucionar el problema de raíz, sin asumir paridad automática con los otros frameworks.

</details>

## Anexo consolidado: lecciones aprendidas

> Procedencia: `docs/LECCIONES_APRENDIDAS.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/LECCIONES_APRENDIDAS.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Lecciones aprendidas de Tauri y Angular"
subtitle: "Criterios operativos para compilación, datos e interfaz"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-07-27"
last_updated: "2026-08-20"
document_type: "registro histórico"
status: "sustituido"
canonical: false
superseded_by: "../LESSONS_LEARNED.md"
```


### Lecciones aprendidas de Tauri y Angular

> Documento histórico conservado por trazabilidad. El registro vigente es
> [`../LESSONS_LEARNED.md`](LESSONS_LEARNED.md).

#### 1. Rutas del compilador de Rust en scripts
**Problema:** Al ejecutar comandos como `npm run tauri build` desde entornos automatizados o ciertos terminales en Windows, el sistema no lograba encontrar los binarios de Rust (`cargo`), causando que el proceso de compilación nativa se estancara o fallara.
**Solución:** Se creó un script dedicado (`scripts/build_debug.bat`) que inyecta explícitamente la ruta de Cargo al entorno antes de invocar a Tauri:
```bat
@echo off
set PATH=%PATH%;%USERPROFILE%\.cargo\bin
call npm.cmd run tauri build -- --debug
```

#### 2. Comportamiento de `npm.cmd` en scripts batch
**Problema:** Inicialmente, el script de compilación utilizaba `npm.cmd run...` sin el comando `call`. En Windows, invocar un `.cmd` desde un `.bat` transfiere el control de forma permanente, por lo que comandos subsecuentes (como `start` para abrir el ejecutable) nunca se ejecutaban.
**Solución:** Utilizar siempre `call npm.cmd` para asegurar que el control regrese al script original tras finalizar la tarea de Node.

#### 3. Tipado estricto en gráficos de Chart.js
**Problema:** Al utilizar señales (`computed()`) en Angular 18 para procesar la data simulada que se inyecta en los componentes de gráficos de `Atomic-UI`, el retornar `null` cuando no hay datos generaba errores de tipado estricto (`ChartData`) durante la compilación AOT (`ng build`).
**Solución:** En lugar de devolver `null`, es mejor retornar una estructura vacía válida: `{ labels: [], datasets: [] }` para que la plantilla la consuma de forma segura.

#### 4. Cierre inferior de tablas con desplazamiento horizontal
**Problema:** En grillas nominales con scroll vertical y horizontal simultaneo, la ultima fila puede quedar demasiado cerca de la barra horizontal aunque la tabla compile sin errores.
**Solucion:** La reserva inferior debe venir desde Atomic UI en `ScrollOverlayComponent`, aplicando `padding-bottom` y `scroll-padding-bottom` al scroller real (`tbody[data-so-vertical]`) cuando existe `so-has-overflow-x`. No se deben usar parches locales ni pseudo-elementos en el consumidor Tauri.

#### 5. Desplazamiento nativo y desplazamiento de interfaz
**Problema:** El dashboard original de Tauri mostraba barras de desplazamiento dobles o comportamientos extraños en el scroll de la ventana principal.
**Solución:** Se empaquetó el layout principal dentro del componente `app-scroll-overlay` de Atomic UI, forzando un límite de altura `100vh` y delegando el comportamiento al sistema de scroll interno de la librería de componentes.

#### 6. Validación reproducible sin efectos laterales

**Problema:** El proceso de compilación dependía de un script externo que podía conectarse a SQL Server y alterar procedimientos almacenados incluso cuando se solicitaba una validación. Esa dependencia impedía demostrar que el build fuera de solo lectura y reproducible.

**Solución:** `npm run db:validate:sps` verifica localmente las firmas versionadas en `database/sps` y su correspondencia exacta con los placeholders de `src-tauri/src/infrastructure/db/queries.rs`. La comprobación no abre conexiones, no despliega objetos y falla si aparece SQL directo o una llamada sin contrato. El despliegue queda separado del build y requiere ejecución explícita por el responsable de base de datos.

</details>

## La continuidad exige autoridad central y contexto local

- **Identificador:** ECO-20260823-003.
- **Evidencia observada:** El gobierno Atomic y la guía interna cubrían reglas
  especializadas, pero no componían una ruta única desde la doctrina hasta la
  frontera Tauri, la deuda y los comandos reales.
- **Decisión generalizable:** La fuente doctrinal permanece central; AGENTS.md y
  docs/CONTINUIDAD_AGENTES.md aportan el contexto específico sin duplicar o
  reducir los manuales existentes.
- **Mecanismo preventivo:** Cada cambio deberá abrir roadmap, validar enlaces
  absolutos, actualizar changelog y lecciones, ejecutar las compuertas locales y
  registrar reversión.
- **Alcance:** El índice guía a los agentes, pero no sustituye pruebas Rust,
  pruebas Angular, certificación SQL o promoción de artefactos.
