---
title: "Integración de Base Tauri con SQL Server"
subtitle: "Procedimientos, Tiberius, contratos, validación y despliegue"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-21"
document_type: "arquitectura de integración"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
database_contract: "@hra/database-contracts@0.2.1"
---

# Integración de Base Tauri con SQL Server

## Runtime

[`src-tauri/src/infrastructure/db/queries.rs`](../../src-tauri/src/infrastructure/db/queries.rs) contiene únicamente llamadas parametrizadas a procedimientos `ind.USP_*`. Tiberius ejecuta esas llamadas mediante un pool; `dto.rs` valida columnas y el servicio de aplicación construye el dominio.

| Operación Rust | Procedimiento | Parámetros principales |
|---|---|---|
| Tablero | `ind.USP_SEL_DASHBOARD_STATS_ID11` | `I_MES`, `I_ANIO` |
| Grilla nominal | `ind.USP_SEL_GRILLA_NOMINAL_ID11` | página, tamaño, búsqueda, estado, orden, periodo, método y estado TA |
| Descartados | `ind.USP_SEL_DESCARTADOS_ID11` | periodo, búsqueda, página y tamaño |
| Universo evaluado | `ind.USP_SEL_UNIVERSO_EVALUADO_SIS240_ID11` | `I_MES`, `I_ANIO` |

El backend no ejecuta `SELECT` directo sobre vistas durante el runtime principal. Los procedimientos sí pueden consultar `stg.his_trama` o vistas cuando la fuente SQL versionada así lo define. La guía anterior que prohibía toda consulta de tabla desde un procedimiento fue sustituida por este contrato verificable.

## Fuentes SQL

La carpeta `database/views` contiene las vistas nominal, descartados y tablero. `database/sps` contiene cinco procedimientos de consulta. `scripts/validate-sql-contracts.js` compara las constantes Rust, nombres, parámetros y fragmentos de resultado contra esas fuentes.

```powershell
npm run db:validate:sps
```

La orden no abre una conexión. `npm run db:deploy:sps` está deshabilitada y termina con error porque el despliegue requiere revisión y ejecución explícita del responsable de base de datos.

## Contrato de base de datos

`contracts/hra-database-contracts.lock.json` fija `@hra/database-contracts@0.2.1`. Su estado vigente es `release_status=blocked` y `deployable=false`, con decisiones bloqueantes `ADR-0001` y `ADR-0003`. La integridad local no autoriza desplegar.

## TLS y conexión

El modo estricto usa Schannel, TLS 1.2 o superior y certificado válido. El modo heredado usa OpenSSL vendorizado, TLS 1.0 mínimo y dirección IP privada o loopback. Ambos mantienen `EncryptionLevel::Required`. Una conexión candidata debe superar adquisición de pool y `SELECT 1` dentro de diez segundos antes de persistirse.

## Transacciones, concurrencia y reversión

El runtime no abre una transacción Rust alrededor de las consultas. La unidad de
confirmación depende, por tanto, del procedimiento almacenado. Esta conclusión
se obtiene de
[`tiberius_repository.rs`](../../src-tauri/src/infrastructure/db/tiberius_repository.rs)
y de las fuentes en [`database/sps`](../../database/sps).

| Flujo | Alcance transaccional comprobado | Concurrencia y timeout | Reversión |
|---|---|---|---|
| Tablero | `USP_SEL_DASHBOARD_STATS_ID11` es una consulta sin escritura ni transacción explícita. | Las consultas pueden compartir el pool y ejecutarse en paralelo. El comando aplica 45 segundos con `tokio::time::timeout`. | No modifica estado persistente. Un timeout descarta el futuro Rust, pero no constituye una orden pública de cancelación de SQL; operaciones de servidor posteriores al corte deben verificarse en SQL Server. |
| Grilla nominal y descartados | Los procedimientos pueden refrescar cachés con `DELETE` e `INSERT`, pero los scripts vigentes no abren una transacción que agrupe ambas sentencias. Cada sentencia conserva la atomicidad de SQL Server, no la del refresco completo. | Las invocaciones concurrentes del mismo periodo pueden competir por la caché; no existe un mutex de consulta en `AppState`. | No se debe prometer restauración automática de la caché previa. Ante fallo se repite la consulta en una ventana controlada y se validan conteos; la corrección definitiva debe incorporar una transacción en el procedimiento versionado y una prueba de concurrencia. |
| Universo SIS 240 | `USP_SEL_UNIVERSO_SIS240_ID11` abre `BEGIN TRANSACTION`, sustituye caché y metadatos, confirma con `COMMIT` y ejecuta `ROLLBACK` en `CATCH`. `USP_SEL_UNIVERSO_EVALUADO_SIS240_ID11` usa `MERGE ... WITH (HOLDLOCK)` para la referencia evaluada, sin agrupar el procedimiento completo en una transacción explícita. | `HOLDLOCK` protege la coincidencia del `MERGE`; el timeout del comando sigue siendo 45 segundos. | El bloque transaccional revierte su sustitución de caché y vuelve a lanzar el error. Las sentencias externas a ese bloque mantienen el alcance que declara el propio script. |
| Conexión candidata | `ConnectionOperationGate` serializa prueba, activación y persistencia de perfil dentro del proceso. La credencial se almacena sólo después de una conexión y un `SELECT 1` satisfactorios. | El mutex espera en lugar de ejecutar dos cambios de conexión a la vez; la prueba tiene diez segundos. | Un fallo conserva el servicio y la credencial anteriores. No se realiza una degradación automática de TLS. |
| Despliegue SQL | No existe una ruta de despliegue activa en la aplicación. `npm run db:deploy:sps` falla de forma deliberada. | La coordinación entre operadores pertenece al cambio institucional de base de datos. | Deben conservarse las definiciones aprobadas anteriores y un respaldo del esquema. La reversión se ejecuta fuera de Tauri, nunca mediante un comando IPC. |

La ausencia de transacción agrupada en los refrescos de grilla y descartados es
una limitación vigente, no una garantía implícita. Antes de habilitar un contrato
SQL bloqueado, el responsable de base de datos debe probar dos llamadas
concurrentes del mismo periodo, inyectar un fallo entre borrado e inserción y
demostrar que la versión aprobada conserva o reconstruye la caché de manera
determinista.

## Secuencia real de una consulta nominal

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#E7EFF6", "primaryTextColor": "#1B2636", "primaryBorderColor": "#3B6D8C", "lineColor": "#526777", "secondaryColor": "#F3F6F8", "tertiaryColor": "#FFFFFF", "fontFamily": "Arial"}}}%%
sequenceDiagram
    autonumber
    participant Angular as Angular
    participant Comando as Comando get_pacientes
    participant Estado as AppState
    participant Servicio as PacienteService
    participant Repositorio as TiberiusRepository
    participant Pool as Pool bb8 y Tiberius
    participant SQL as SQL Server

    Angular->>Comando: invoke con página, filtros, orden y periodo
    Comando->>Comando: valida paginación, texto, periodo y orden
    alt Solicitud inválida
        Comando-->>Angular: promesa rechazada con mensaje controlado
    else Solicitud válida
        Comando->>Estado: obtiene el servicio activo
        alt No existe conexión activa
            Estado-->>Comando: error de conexión no disponible
            Comando-->>Angular: promesa rechazada
        else Servicio disponible
            Estado-->>Comando: copia de PacienteService
            Comando->>Servicio: get_pacientes(PacientesQuery)
            Servicio->>Repositorio: get_pacientes(query)
            Note over Servicio,Repositorio: La dependencia es concreta; no existe un puerto de repositorio vigente.
            Repositorio->>Pool: obtiene cliente
            Pool->>SQL: EXEC ind.USP_SEL_GRILLA_NOMINAL_ID11 con parámetros
            Note over Repositorio,SQL: Rust no abre una transacción; el procedimiento determina la unidad de confirmación.
            SQL-->>Pool: conjunto nominal y conjunto de total
            Pool-->>Repositorio: filas Tiberius
            Repositorio->>Repositorio: valida columnas, tipos, nulabilidad y TotalRecords
            alt Error de pool, procedimiento o mapeo
                Repositorio-->>Servicio: Err interno
                Servicio-->>Comando: Err interno
                Comando-->>Angular: rechazo con mensaje redactado
            else Límite de 45 segundos vencido
                Comando-->>Angular: rechazo por tiempo de espera
            else Resultado válido
                Repositorio-->>Servicio: PaginatedPacientes del dominio
                Servicio-->>Comando: resultado del caso de consulta
                Comando->>Comando: convierte a PacientesPageViewModel
                Comando-->>Angular: promesa resuelta con página nominal
            end
        end
    end
```

La secuencia representa el comando público realmente registrado y su retorno directo `Result<PacientesPageViewModel, String>`. Los parámetros llegan a SQL Server por las posiciones `@P1` a `@P10` de la constante versionada; no se recibe SQL desde Angular. El timeout se aplica alrededor del futuro completo en el comando. Al vencer, Rust descarta ese futuro, pero el contrato vigente no promete una orden independiente de cancelación al servidor. Las escrituras de caché que pudiera realizar el procedimiento conservan el alcance transaccional definido por el propio SQL.

## Validación funcional

La liberación requiere una instancia autorizada, datos sintéticos o seudonimizados y pruebas de los cuatro procedimientos. Se verifican parámetros, result sets, primera columna `V_TABLA` en diagnósticos, tipos, nulabilidad, periodo y paginación. La evidencia no incluye filas nominales.

El [diccionario de datos](INTEGRACION_BASE_DATOS.md) define la forma esperada y [contratos API e IPC](ARQUITECTURA_BACKEND.md) define la exposición a Angular.

## Anexo consolidado: diccionario datos

> Procedencia: `docs/manuales/DICCIONARIO_DATOS.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/manuales/DICCIONARIO_DATOS.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Diccionario de datos de Base Tauri"
subtitle: "Resultados SQL, DTO Rust y modelos expuestos del indicador 11"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "diccionario de datos"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
```


### Diccionario de datos de Base Tauri

#### Autoridad

La autoridad se compone de `database/sps`, `src-tauri/src/infrastructure/db/dto.rs` y `src-tauri/src/domain/paciente.rs`. Un alias documentado pero ausente de esos archivos no forma parte del contrato.

#### Trazabilidad de extremo a extremo

| Conjunto | Fuente SQL | Constante y mapeo Rust | Dominio/IPC | Consumidor Angular |
|---|---|---|---|---|
| Tablero | `database/sps/USP_SEL_DASHBOARD_STATS_ID11.sql` | `queries::DASHBOARD_STATS` → `DashboardStatsRow::try_from_sql` | `DashboardStatsID11` → `get_dashboard_stats_id11` | `dashboard/services/paciente.service.ts::getResultadosID11` y vista gerencial |
| Grilla nominal | `database/sps/USP_SEL_GRILLA_NOMINAL_ID11.sql` | `queries::PACIENTES` → `PacienteRow::try_from_sql` | `Paciente`/`PaginatedPacientes` → `PacientesPageViewModel` → `get_pacientes` | `PacienteService.getPacientes` y `operativo/operativo.component.ts` |
| Descartados | `database/sps/USP_SEL_DESCARTADOS_ID11.sql` | `queries::DESCARTADOS` → `DescartadoRow::try_from_sql` | `PacienteDescartado`/`PaginatedDescartados` → `DescartadosPageViewModel` → `get_descartados` | `PacienteService.getDescartados` y `descartados/descartados.component.ts` |
| Universo evaluado | `database/sps/USP_SEL_UNIVERSO_EVALUADO_SIS240_ID11.sql` | `queries::UNIVERSO_EVALUADO_SIS240` → `UniversoEvaluadoSIS240Row::try_from_sql` | `UniversoEvaluadoSIS240ID11` → `get_universo_evaluado_sis240_id11` | `PacienteService.getUniversoEvaluadoSIS240ID11` y vista gerencial |

Ejemplos de linaje de campo:

| Alias SQL | Validación de infraestructura | Propiedad expuesta | Uso |
|---|---|---|---|
| `total_pacientes` | Se exige `i32` en `DashboardStatsRow` | `DashboardStatsID11.total_pacientes` | Total visible del tablero |
| `I_NUM` | Se exige `i32` en `PacienteRow` | `Paciente.i_num` | Orden de la fila nominal |
| `dni_paciente` | Se exige texto no nulo en `PacienteRow` | `Paciente.dni_paciente` | Identificador visible y búsqueda nominal |
| `Motivo_Descarte` | Se exige texto en `DescartadoRow` | `PacienteDescartado.motivo_descarte` | Etiqueta de motivo en la vista de descartados |
| `V_TABLA` | Se valida como texto y como primera columna diagnóstica | `UniversoEvaluadoSIS240ID11.v_tabla` | Discriminador de resultado SIS 240 |

La compuerta `npm run db:validate:sps` comprueba el enlace entre procedimientos
y constantes de `queries.rs`. Las pruebas Rust cubren tipos y nulabilidad; las
pruebas Angular comprueban nombres de comando y tratamiento de respuestas. Una
modificación se considera incompleta si cualquiera de esos cuatro niveles queda
sin actualizar.

#### Tablero del indicador 11

`DashboardStatsRow` exige enteros para los totales e insumos, texto para `porcentaje_aqv` y convierte el resultado en `DashboardStatsID11`.

| Grupo | Campos reales |
|---|---|
| Generales | `total_pacientes`, `total_ta`, `total_aqv`, `porcentaje_aqv`, `total_preservativos`, `total_otros_metodos`, `total_proximos_vencer`, `total_abandonos`, `total_protegidos`, `total_atendidos_mes`, `total_menores_15`, `total_mayores_49` |
| Métodos | `total_ampollas_mensual`, `total_ampollas_trimestral`, `total_ligaduras`, `total_vasectomias`, `total_preserv_varones`, `total_preserv_mujeres`, `total_diu`, `total_implantes`, `total_oral_combinado` |
| Condición de dosis | Cada total de método posee variante `_d` y `_r`; `total_otros_metodos_d` y `_r` completan la forma |
| Insumos | Prefijo `insumo_` para los nueve métodos; variantes `_d` y `_r` cuando aplica |
| Derivados Rust | `i_denominador`, `i_numerador`, `v_porcentaje`, `mensual_data` |

Los enteros ausentes no se aceptan silenciosamente como contrato válido: `try_from_sql` comprueba tipo y produce error de contrato.

#### Códigos clínicos vigentes

| Método | Código |
|---|---|
| Ampolla mensual | `99208.04` |
| Ampolla trimestral | `99208.05` |
| Preservativo masculino | `99208.02` |
| Preservativo femenino | `99208.06` |
| Ligadura | `58600`, `58605`, `58611` |
| Vasectomía | `55250` |
| DIU | `58300`, `58300.01` |
| Implante | `11975` |
| Oral combinado | `99208.13` |

#### Grilla nominal

Cada fila exige `I_NUM`, `dni_paciente`, `nombre_paciente`, `sexo`, `edad`, `metodo_administrado`, `fecha_inicio`, `fecha_ultima_dosis`, `fecha_proxima_cita`, `estado_continuidad`, `telefono`, `meta_anual`, `entregas_anuales`, `faltante_ta` y `estado_ta`. La página añade `data`, `total`, página, tamaño y total de páginas.

#### Descartados

El procedimiento devuelve `DNI_Paciente`, `Nombre_Paciente`, `Sexo`, `Edad`, `Codigo_Obstetra`, `Nombre_Obstetra`, `fecha_atencion` y `Motivo_Descarte`. Rust los transforma a propiedades del dominio sin exponer una fila incompleta.

#### Universo SIS 240

El resultado conserva la notación institucional: `V_TABLA`, `I_ANIO`, `I_MES`, `I_TOTAL_UNIVERSO_EVALUADO`, totales de orientación/consejería y método anticonceptivo, y `V_ESTADO`. Los procedimientos diagnósticos deben devolver `V_TABLA` como primera columna.

#### Evolución

Un cambio de nombre, tipo, código clínico o nulabilidad actualiza SQL, DTO, dominio, contrato compartido, frontend, pruebas y este diccionario en el mismo cambio.

</details>

## Anexo consolidado: db views guide

> Procedencia: `docs/DB_VIEWS_GUIDE.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/DB_VIEWS_GUIDE.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Arquitectura DB-first de vistas y procedimientos almacenados"
subtitle: "Contrato de acceso a datos para Wails, Tauri y servicios de escritorio"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-07-10"
last_updated: "2026-08-20"
status: "sustituido"
canonical: false
superseded_by: "manuales/INTEGRACION_BASE_DATOS.md"
```


### Arquitectura DB-first de vistas y procedimientos almacenados

> **Documento sustituido.** La fuente vigente es [Integración con base de datos](INTEGRACION_BASE_DATOS.md). El texto se conserva como antecedente del principio DB-first.

Este documento aclara el funcionamiento y la justificación técnica del uso de vistas SQL Server como fuente interna de reglas de negocio. Las vistas no constituyen el contrato público de los backends. El contrato público para Wails, Tauri y cualquier backend de escritorio queda definido por procedimientos almacenados versionados en `database/sps`.

#### 1. Naturaleza de las vistas estándar

Las vistas creadas en la base de datos, por ejemplo `ind.VW_NOMINAL_ID11` e `ind.VW_DASHBOARD_STATS_ID11`, no son tablas estáticas ni vistas materializadas.

- **No almacenan datos:** Las vistas representan consultas guardadas en el motor SQL Server.
- **No requieren tareas programadas adicionales:** Al no almacenar datos físicamente, las vistas no requieren trabajos nocturnos ni rutinas externas de actualización.
- **Conservan datos en tiempo real:** Cuando una consulta consume una vista, SQL Server traduce la definición hacia tablas base como `stg.his_maestro_paciente` y `stg.his_trama`.
- **No son llamadas por el runtime principal:** Rust invoca `EXEC ind.USP_*`. Cada procedimiento decide, en su fuente versionada, si consume una vista o consulta directamente una tabla `stg` para una responsabilidad explícita.

#### 2. Razón para usar vistas dentro de procedimientos almacenados

Los indicadores de salud dependen de reglas estrictas de las fichas técnicas del Ministerio de Salud. Entre estas reglas se encuentran el rango de edad de 15 a 49 años, la exclusión de gestantes con códigos CIE-10 como `Z349` y `Z359`, el valor de laboratorio `G`, y la inclusión de consejería en salud sexual y reproductiva mediante `Z3002`.

Si estas reglas se programaran directamente en cada procedimiento almacenado, la fórmula se duplicaría en la grilla nominal, los gráficos de torta, los gráficos de barras y cualquier nueva salida analítica. Esa duplicación elevaría el riesgo de discrepancias entre Wails y Tauri.

Cuando una regla se comparte, una vista puede encapsular la fórmula. Los procedimientos también pueden contener reglas o lecturas directas de `stg.his_trama`, como las estadísticas de edad y actividad del procedimiento de tablero. Esa excepción debe permanecer visible y versionada.

#### 3. Mantenibilidad

Cuando el Ministerio de Salud modifica una regla, por ejemplo ampliando el rango de edad hasta 59 años, el equipo de desarrollo debe cambiar la vista o el procedimiento almacenado correspondiente en un único lugar versionado. Después de aplicar el script SQL en el servidor, la grilla, los gráficos y los porcentajes gerenciales se actualizan sin modificar código fuente de frontend o backend.

#### 4. Regla operativa

El runtime principal debe consumir procedimientos almacenados y no vistas de forma directa. Las vistas y los procedimientos comparten la responsabilidad SQL conforme a sus fuentes versionadas; cualquier duplicación de una regla clínica requiere revisión y prueba de paridad. Los repositorios sólo mapean DTO y la interfaz renderiza el modelo recibido.

</details>

## Anexo consolidado: desglose y reglas de negocio

> Procedencia: `docs/DESGLOSE_Y_REGLAS_DE_NEGOCIO.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/DESGLOSE_Y_REGLAS_DE_NEGOCIO.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Desglose y reglas de negocio del indicador 11"
subtitle: "Salud reproductiva en la aplicación Tauri Angular"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-13"
last_updated: "2026-08-20"
status: "sustituido"
canonical: false
superseded_by: "manuales/INTEGRACION_BASE_DATOS.md"
```


### Desglose y reglas de negocio del indicador 11

> **Documento sustituido.** La integración vigente se documenta en [Integración con base de datos](INTEGRACION_BASE_DATOS.md) y los códigos y columnas en [Diccionario de datos](INTEGRACION_BASE_DATOS.md). El contenido restante se conserva como antecedente.

Este documento centraliza las lecciones aprendidas, la lógica de negocio y las configuraciones críticas del Indicador 11. Su propósito es servir de referencia principal al clonar, migrar o dar mantenimiento a los dashboards asociados (Tauri/Wails/Angular).

---

#### 1. Reglas y orígenes de datos (backend y base de datos)

##### Conexión a base de datos

- **Tauri (Rust):** Las credenciales SQL se almacenan en Windows Credential Manager bajo el servicio `HRA_Indicadores_Tauri` y la cuenta `DB_Config_V1`. Cuando ese destino no existe, el backend lee cargas compatibles desde `HRA_Indicadores:DB_Config` y `DB_Config.HRA_Indicadores` y procura copiarlas sin eliminar ni sobrescribir los registros anteriores. Angular sólo puede solicitar servidor, usuario y estado de configuración después de autenticar una sesión administrativa; la contraseña no regresa al WebView. La reconexión usa `connect_db_stored` sin devolver metadatos, mientras que la lectura o el cambio de configuración exige una sesión administrativa emitida por el backend.
- **Autorización:** `HRA_ADMIN_PASSWORD_HASH` es la variable primaria administrada. Sólo cuando no existe, `HRA_TAURI_ADMIN_PASSWORD_HASH` puede actuar como fuente heredada si contiene un PHC Argon2id compatible, sin modificar ni eliminar su valor. La aplicación no carga archivos `.env`. El hash local vigente se almacena bajo `pe.gob.hra.modulo-operativo` / `admin-password-hash-argon2id-v1`; cuando ese destino no existe, un hash compatible de `HRA_Indicadores_Tauri` / `Admin_Password_Hash_Argon2id_V1` puede copiarse de forma no destructiva. La recuperación sin argumentos abre una GUI Win32 nativa; `--reset` permanece como contingencia de terminal interactiva. Ambos modos exigen la aplicación cerrada, exclusión por mutex y ausencia total de variables administrativas antes de escribir. La contraseña exige al menos 12 caracteres, no supera 256 bytes en UTF-8 y no contiene caracteres de control. La sesión vigente dura cinco minutos y permanece en memoria.
- **Transporte:** La conexión exige TLS y validación de certificado. `HRA_SQL_CA_CERT` permite incorporar una CA interna. `HRA_DEV_ALLOW_INVALID_CERT=true` sólo se admite en una compilación `debug` para diagnóstico controlado.
- **Contrato de resultados:** Los result sets de resumen, detalle y conteo forman parte del contrato de cada procedimiento. Un conjunto nominal presente puede contener cero filas; un conjunto ausente, un `TotalRecords` nulo o un DNI nulo representa deriva de esquema y debe producir un error.
- **Validación de compilación:** `npm run db:validate:sps` compara de forma local y de solo lectura las firmas de `database/sps` con las llamadas parametrizadas de Rust. La compilación no se conecta a SQL Server y el despliegue de procedimientos requiere una acción explícita del responsable de base de datos.
- **Wails (Go):** La implementación de Wails mantiene su infraestructura propia y no comparte comandos Rust. La equivalencia funcional debe verificarse sin copiar contratos específicos de Tauri.

##### **Vistas y Tablas Core**
- Las reglas duras residen en la vista SQL Server: `ind.VW_DASHBOARD_STATS_ID11`
- Las consultas operativas se hacen a la base cruda: `stg.his_trama`
- El consolidador de los denominadores y numeradores oficiales es la tabla procesada: `ind.resultados_indicador_11`

---

#### 2. Diferenciación de Métricas: Numerador vs Total TA

Es una **falsa equivalencia** asumir que el Numerador oficial es el resultado de restar el Total Operativo (TA) menos los pacientes fuera de rango de edad. Sus lógicas son distintas:

- **Población Numerador (`i_numerador`):**
  Extraído estrictamente de `ind.resultados_indicador_11`. Representa a las personas del *Denominador* (aquellas que recibieron consejería específica este mes) que **han usado un método anticonceptivo moderno en los últimos 12 meses**. Una paciente puede estar en el numerador sin haber asistido a consulta el mes actual.

- **Total Actividad (TA / `Total_TA`):**
  Es una métrica de **producción del mes**. Cuenta todos los pacientes únicos del mes consultado que tuvieron un registro CIE `99208` con valor de laboratorio `TA` o que pasaron por procedimientos quirúrgicos (AQV / `55250`). No se le aplica filtro de exclusión por rango de edad (menores de 15, mayores de 49) porque busca visibilizar la carga laboral integral del servicio.

---

#### 3. Mapeo crítico de códigos CIE (insumos y métodos)

Durante las auditorías se detectaron cruces de códigos. El mapeo definitivo y oficial utilizado para el cruce es el siguiente:

- **Preservativos Masculinos:** `99208.02`
- **Preservativos Femeninos:** `99208.06`
- **Oral Combinado:** `99208.13`
- **Ampolla Mensual:** `99208.04`
- **Ampolla Trimestral:** `99208.05`
- **DIU:** `58300` y `58300.01`
- **Implantes:** `11975`

##### Regla del tablero: personas frente a insumos
Para mostrar las cantidades físicas (Insumos) en contraposición a las personas:
- La vista expone las variables con el prefijo `insumo_` (ej. `insumo_ampollas_mensual`, `insumo_preserv_varones`).
- Se debe **sumar la columna `Valor_Lab`** (casteada a entero) de la tabla `stg.his_trama` y no contar agrupaciones, ya que los insumos físicos vienen declarados numéricamente allí.

---

#### 4. Interfaz y flujo de interacción del frontend (Angular)

Para mantener la congruencia entre lo que muestra el dashboard y las reglas de negocio, se debe aplicar este candado en la UI:

- **Modo "Insumos":**
  Dado que los insumos contabilizan cantidad física (Valor_Lab) y no la clasificación poblacional de continuidad, los filtros de **Definitivos (D)** y **Repetitivos (R)** pierden sentido (generando valores en cero).
  - **Acción:** Al hacer clic en el modo "Insumos", la aplicación **debe forzar el filtro superior a "Todos"** y bloquear (deshabilitar/disable) los botones (D) y (R).

---

#### 5. Historial de Correcciones Importantes
- **[2026-07-07] Mapeo de Preservativos y Oral:** Intercambio y corrección de los códigos `99208.06` y `99208.02` en la base SQL `VW_DASHBOARD_STATS_ID11`.
- **[2026-07-07] Candados UI Insumos:** Inyección de lógica en Angular (`gerencial.component.ts`) para obligar a saltar a la vista global ("Todos") cuando se requieren ver sumatorias de Insumos.
- **[2026-07-07] Desacople de Total Atenciones:** Desvinculación de `Total_TA` del filtro estricto de edades (para reflejar trabajo real) y clarificación de la distinción contra el Numerador en Wails y Tauri.
##### Conteo de Insumos Físicos (Valor_Lab)
- **Problema Histórico:** El gráfico de insumos no se renderizaba porque la vista VW_DASHBOARD_STATS_ID11 estaba forzando estáticamente 0 para todas las categorías de Insumos.
- **Solución y Regla de Negocio:** El conteo del total de insumos entregados ya no se basa simplemente en contar los registros (COUNT), sino en extraer la cantidad física entregada utilizando el campo Valor_Lab de la tabla stg.his_trama. A nivel de Base de Datos, se aplica ISNULL(TRY_CAST(m.Valor_Lab AS INT), 1) para sumarizar de forma precisa el volumen de inventario gastado por método anticonceptivo.

</details>
