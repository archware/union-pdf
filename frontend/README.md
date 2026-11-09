---
title: "Aplicación Tauri con Angular"
subtitle: "Estructura principal del proyecto de escritorio"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-15"
last_updated: "2026-08-21"
document_type: "guía principal"
status: "vigente"
canonical: true
version: "1.6.1"
---

# Aplicación Tauri con Angular

El proyecto define una aplicación de escritorio basada en Angular y Tauri. La raíz se mantiene reservada para archivos de configuración requeridos por Angular, Node.js, Tailwind CSS y Tauri.

## Índice documental canónico

| Documento | Autoridad |
|---|---|
| [Manual de usuario](docs/manuales/MANUAL_DE_USUARIO.md) | Recorridos, estados visibles, privacidad y límites de uso. |
| [Manual de operación](docs/manuales/MANUAL_DE_OPERACION.md) | Inicio y cierre de jornada, diagnóstico, incidentes y recuperación operativa. |
| [Manual de administración](docs/manuales/MANUAL_DE_ADMINISTRACION.md) | Seguridad, configuración, continuidad, sesiones y recuperación administrativa. |
| [Arquitectura del backend](docs/manuales/ARQUITECTURA_BACKEND.md) | Desarrollo, capas hexagonales, entidades, puertos, contratos públicos y pruebas. |
| [Guía de despliegue](docs/manuales/GUIA_DE_DESPLIEGUE.md) | Construcción, evidencia, firma, promoción, actualización y reversión. |
| [Integración de base de datos](docs/manuales/INTEGRACION_BASE_DATOS.md) | SQL Server, transacciones, diccionario real, procedimientos, DTO y trazabilidad. |

El presente README constituye la entrada canónica. El [registro de cambios](CHANGELOG.md), las [lecciones aprendidas](LESSONS_LEARNED.md), el [índice de evidencia contractual](contracts/README.md) y el [gobierno Atomic](docs/ATOMIC_GOVERNANCE.md) conservan funciones independientes y no amplían el conjunto de manuales técnicos.


## Estructura de trabajo

| Ruta | Propósito |
|---|---|
| `src` | Codigo fuente del frontend Angular. |
| `src-tauri` | Código Rust, configuración Tauri y acceso a SQL Server. |
| `docs` | Documentacion tecnica, reglas de negocio, guias de base de datos y lecciones aprendidas. |
| `scripts` | Comandos auxiliares para desarrollo y compilación en Windows. |

## Documentación de recuperación administrativa

La operación, el mantenimiento y la publicación del recuperador separado se
describen en documentos específicos:

- [Manual de usuario](docs/manuales/MANUAL_DE_ADMINISTRACION.md)

- [Guía de desarrollo](docs/manuales/ARQUITECTURA_BACKEND.md)

- [Guía de despliegue](docs/manuales/GUIA_DE_DESPLIEGUE.md)

Después de la limpieza de salidas regenerables no existe un EXE principal ni
un directorio `src-tauri/target` dentro del repositorio. El recuperador Tauri
preservado para QA estático se encuentra en
`D:\Repos2\_entregables_qa\recuperacion-administrativa\base-tauri-1.6.1-93e0b22`.
Esa copia está vinculada al commit `93e0b22`, no tiene firma Authenticode y no
es una entrega productiva.

Las construcciones nuevas regeneran las ubicaciones siguientes:

| Salida | Ruta |
|---|---|
| Helper y recibo de build | `src-tauri/target/admin-recovery/build-output` |
| Entrega QA del recuperador | `src-tauri/target/admin-recovery/review` |
| Fuente firmada de los bundles | `src-tauri/target/admin-recovery/bundle-source` |
| Aplicación principal | `src-tauri/target/release/tauri-angular-app.exe` |
| Instaladores | `src-tauri/target/release/bundle/msi` y `src-tauri/target/release/bundle/nsis` |
| Evidencia exacta de cuatro binarios | `src-tauri/target/release-evidence` |

`tauri-angular-app.exe` permanece como basename interno de Cargo. Durante la
promoción, el mismo contenido se publica como
`HRA-Modulo-Operativo-Tauri-Aplicacion-1.6.1-Beta.exe`. El recuperador se
publica como
`HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe`.
Ambos nombres identifican la función, conservan la versión PE numérica y
declaran el canal `beta`; ningún manifiesto puede cambiar
`productionReady=false`.

## Comandos operativos

Los scripts de escritorio se ejecutan desde `npm` o directamente desde la carpeta `scripts`.

```bash
npm run desktop:dev
npm run desktop:build
npm run desktop:build:debug
```

## Evidencia de entrega Windows

El flujo de entrega genera y verifica exactamente cuatro binarios: la
aplicación, el recuperador administrativo, un MSI y un NSIS, todos con rol
explícito, firma verificada y versión vigente. El staging rechaza versiones
antiguas, rutas fuera de la raíz,
duplicados, secretos y hashes divergentes:

```powershell
npm run release:stage
npm run release:verify
```

La certificación ejecuta `npm run release:verify-installed-recovery --` con las
rutas de la evidencia, la instalación, el acceso directo y un recibo nuevo. La
compuerta compara el SHA-256 instalado con el cuarto artefacto y valida el
destino del acceso sin ejecutar el PE. El recibo requiere revisión
independiente y no cambia `productionReady=false`.

La política `ci-unsigned` permite únicamente artefactos `NotSigned` para la
comprobación interna. `npm run release:stage:institutional` exige una firma
Authenticode válida, EKU de firma de código, editor
`Hospital Regional Ayacucho` y sello de tiempo. El manifiesto mantiene
`productionReady=false` hasta completar además una instalación y desinstalación
en una cuenta Windows limpia.

## Configuración segura

La aplicación no incluye credenciales predeterminadas ni carga archivos `.env` desde el directorio de ejecución. `.env.example` funciona solamente como inventario; el entorno del proceso o el gestor institucional entrega los valores. `HRA_ADMIN_PASSWORD_HASH` constituye la fuente primaria y debe contener un PHC Argon2id. Sólo cuando esa variable no existe, `HRA_TAURI_ADMIN_PASSWORD_HASH` se considera como compatibilidad heredada si contiene un hash Argon2id compatible. La lectura heredada no modifica ni elimina su valor de origen. El hash puede generarse sin pasar la contraseña por argumentos de línea de comandos:

```powershell
cargo run --example hash_admin_password --manifest-path src-tauri/Cargo.toml
```

El auxiliar solicita una contraseña administrativa de 12 a 256 caracteres, con un máximo adicional de 256 bytes en UTF-8 y sin caracteres de control, sin mostrarla y sólo imprime el hash. La contraseña no se incluye en argumentos ni se persiste en el historial. El flujo de primer inicio crea la contraseña administrativa local y almacena únicamente su hash Argon2id para el usuario actual en Windows Credential Manager, bajo el servicio `pe.gob.hra.modulo-operativo` y la cuenta `admin-password-hash-argon2id-v1`. Cuando el destino vigente no existe, Tauri puede leer el destino heredado `HRA_Indicadores_Tauri` / `Admin_Password_Hash_Argon2id_V1`; sólo un hash Argon2id compatible puede copiarse al destino nuevo y el registro anterior permanece intacto. Este bootstrap local funciona aunque SQL Server no esté disponible.

Una contraseña local olvidada puede reemplazarse desde la interfaz Win32 nativa del helper, ejecutada por el mismo usuario de Windows. La aplicación deberá encontrarse cerrada: ambos procesos comparten el mutex `Global\HRA.ModuloOperativoTauri.AdminCredential.Runtime.v1`, por lo que otra instancia de la aplicación o del recuperador, incluso desde otra sesión RDP, bloquea la operación. La DACL predeterminada procede del token que crea el objeto y un acceso denegado falla de forma cerrada. La invocación sin argumentos abre dos controles protegidos y mantiene deshabilitada la confirmación hasta que ambos valores iguales cumplen la política. El argumento exacto `--reset` se conserva como contingencia de consola; cualquier otro argumento se rechaza antes de consultar el almacén seguro:

```powershell
scripts\configure_admin_password.bat --reset
```

### Helper de recuperación para soporte

El script anterior permanece como comando de fuente para desarrollo y
auditoría. La versión 1.6.1 incorpora un crate Rust mínimo que reutiliza
los módulos compartidos de invocación y recuperación sin depender del crate de
la aplicación. El flujo no compila Tauri, Wry, WebView, Tiberius u OpenSSL, no
ejecuta `tauri build`, no produce el ejecutable principal y no genera
instaladores.

La construcción debe realizarse después de confirmar todos los cambios. El
árbol Git debe estar limpio y `SOURCE_DATE_EPOCH` debe coincidir con el
la marca de tiempo Unix del commit:

```powershell
$env:SOURCE_DATE_EPOCH = git show -s --format=%ct HEAD
npm run admin-recovery:build
npm run admin-recovery:verify-build
npm run admin-recovery:stage
npm run admin-recovery:verify
Remove-Item Env:SOURCE_DATE_EPOCH
```

La construcción queda bajo `src-tauri/target/admin-recovery/build-output`. La
preparación de revisión queda bajo `src-tauri/target/admin-recovery/review` y
contiene el ejecutable versionado, el recibo de construcción, el manifiesto,
un SBOM CycloneDX 1.6 específico del helper y `SHA256SUMS.txt`. El SBOM se
deriva del grafo alcanzable que devuelve Cargo para el lock, el target Windows
x64 y el modo offline; registra una relación `dependencies` exacta para cada
componente y la huella SHA-256 declarada por `Cargo.lock` cuando existe. El
recibo vincula el commit, el árbol Git, el epoch, el toolchain y la huella
SHA-256 del PE. La construcción utiliza Cargo offline, rechaza
overrides del compilador, valida una lista cerrada de dependencias auxiliares y
exige que dos builds limpios e independientes produzcan el mismo SHA-256. La
evidencia solo publica nombres lógicos, versiones y huellas del toolchain; no
conserva rutas absolutas ni la identidad local del operador. El recurso PE
`OriginalFilename` debe coincidir con el nombre versionado del ejecutable
distribuido. Los prefijos locales de las fuentes Rust se remapean antes de
compilar y la inspección del PE rechaza rutas del perfil o del repositorio.

El personal de soporte abre el helper revisado sin argumentos para utilizar la
ventana nativa. La contingencia de consola permanece disponible mediante
`--reset` desde una terminal interactiva de la misma cuenta Windows:

```powershell
src-tauri\target\admin-recovery\review\HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe
src-tauri\target\admin-recovery\review\HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe --reset
```

El manifiesto mantiene `productionReady=false` mientras permanezcan pendientes
la firma Authenticode institucional, la revisión antimalware, la comprobación
en Windows limpio y la prueba funcional con una cuenta desechable. El helper
se incorpora como recurso separado únicamente cuando la fuente del bundle
contiene el PE con firma Authenticode institucional, nombre y versión exactos.
Su inventario también debe coincidir con el commit, árbol, formato de objetos y
epoch del `HEAD` limpio vigente.
Los instaladores MSI y NSIS deberán ubicarlo junto a la aplicación y crear el
acceso `Recuperar contraseña administrativa`; la operación falla de forma
cerrada si la fuente firmada falta o diverge. La verificación instalada admite
únicamente el acceso `Recuperar contraseña administrativa.lnk` dentro del menú
Inicio del usuario o del equipo, apuntando al helper exacto y sin argumentos.
La preparación QA no construye esos instaladores. El helper no expone IPC ni
acceso a SQL Server, Kafka o Nexus.

La utilidad solicita la contraseña y su confirmación de forma interactiva; no acepta la contraseña como argumento y no imprime la contraseña ni el hash. La mera presencia de `HRA_ADMIN_PASSWORD_HASH` o `HRA_TAURI_ADMIN_PASSWORD_HASH`, incluso con un valor vacío o inválido, bloquea el reemplazo local para impedir una derivación de la fuente autoritativa. La utilidad tampoco carga `.env`; por ello, un archivo situado en el directorio actual no puede cambiar la fuente administrativa. El reemplazo sólo escribe `pe.gob.hra.modulo-operativo` / `admin-password-hash-argon2id-v1`; no lee ni modifica espacios heredados, credenciales SQL o tablas de SQL Server. La aplicación deberá iniciarse nuevamente después de completar la operación.

El backend limita los parámetros Argon2id aceptados, aplica bloqueo temporal después de intentos fallidos reiterados y restringe el número de sesiones activas. La autenticación administrativa continúa siendo local e independiente de SQL Server: la cuenta `Admin_Password_Hash_Argon2id_V1` sólo almacena el hash Argon2id y no comparte el secreto ni el ciclo de vida de las credenciales SQL. Las credenciales SQL se almacenan por separado en Windows Credential Manager y nunca se devuelven al WebView. La ausencia de credenciales SQL, la ausencia o invalidez del hash administrativo, la configuración TLS inválida, la incompatibilidad de protocolo TLS y el fallo general de conexión producen estados diferenciados sin revelar servidores, usuarios, contraseñas ni cadenas de conexión.

En Windows, la configuración SQL utiliza el servicio `HRA_Indicadores_Tauri` y la cuenta `DB_Config_V1`. Cuando este destino no existe, Tauri consulta de forma compatible los destinos anteriores `HRA_Indicadores:DB_Config` y `DB_Config.HRA_Indicadores`, acepta únicamente una carga de credenciales compatible y trata de copiarla al destino nuevo. La migración es no destructiva: los registros anteriores no se eliminan ni se sobrescriben y continúan disponibles si la copia no puede completarse.

El formulario puede omitir la contraseña SQL cuando existe un registro almacenado, pero el backend sólo la reutiliza si el servidor y el usuario solicitados coinciden con los metadatos guardados después de normalizar espacios y mayúsculas. Un cambio de servidor o usuario exige introducir nuevamente la contraseña; la decisión se valida también en Rust y no depende únicamente del estado visual de Angular.

La sesión administrativa se emite con un TTL predeterminado de cinco minutos; la política establece un máximo de quince minutos. Mientras el modal de configuración permanezca abierto y la sesión conserve vigencia, los fallos recuperables de red, TLS, certificado o credenciales SQL mantienen el mismo token y permiten corregir los campos y reintentar sin solicitar nuevamente la contraseña administrativa. La sesión se revoca al cerrar o cancelar el modal, al expirar, cuando el backend devuelve un rechazo administrativo o inmediatamente después de guardar una conexión válida. El cierre automático posterior al éxito sólo conserva visible la confirmación y ya no mantiene un token utilizable.

El modo estricto del canal SQL utiliza TLS obligatorio y requiere TLS 1.2 o superior. Los certificados internos deben validarse con el almacén de confianza de Windows o con `HRA_SQL_CA_CERT`. La variable `HRA_DEV_ALLOW_INVALID_CERT=true` se reserva para compilaciones `debug`; una compilación de distribución la rechaza. El modo estricto nunca reduce el protocolo de forma automática cuando una negociación falla.

El modo administrado `legacy_tls` constituye una excepción explícita para servidores heredados. Se encuentra desactivado de forma predeterminada, requiere una sesión administrativa y sólo admite una dirección IP literal privada o de loopback. Cuando el ping de conexión finaliza correctamente, el backend guarda las credenciales y el indicador en Windows Credential Manager mediante la misma operación; un fallo no puede invocar un comando IPC separado para persistirlos. El tablero mantiene un aviso visible durante toda la conexión heredada.

El backend conserva `EncryptionLevel::Required` en ambos modos y selecciona el proveedor TLS antes de abrir el canal. El modo estricto utiliza `native-tls` 0.2.18 y Schannel, conserva TLS 1.2 o superior y valida el certificado con la política configurada. Sólo cuando `legacy_tls` está activo, `allow_legacy_tls` dirige la negociación al OpenSSL 3.6.3 vendorizado, establece TLS 1.0 como versión mínima, fija el nivel de seguridad de OpenSSL en `0` y combina esa excepción con `trust_cert`. El nivel `0` es necesario porque OpenSSL 3.6 rechaza TLS 1.0 en sus niveles superiores; nunca se aplica al modo estricto. Tiberius 0.12.3 y OpenTLS 0.2.1 se encuentran versionados bajo `src-tauri/vendor` y sustituyen las dependencias de crates.io mediante `[patch.crates-io]`.

La selección dual no constituye un mecanismo de reducción automática. Un fallo del modo estricto no provoca un segundo intento con OpenSSL; un fallo del modo heredado tampoco cambia a texto plano, `EncryptionLevel::Off` ni `EncryptionLevel::NotSupported`. El backend devuelve el error del canal seleccionado y mantiene la configuración sin guardar hasta que una conexión sea válida. La configuración heredada tampoco puede combinarse con `HRA_SQL_CA_CERT` ni con `HRA_DEV_ALLOW_INVALID_CERT`.

La validación operativa de `v1.5.13` confirmó el 28 de julio de 2026 una conexión heredada cifrada y la ejecución satisfactoria de las consultas de tablero, descartados y pacientes. El registro de auditoría contiene `database.legacy_tls.succeeded`, `database.connection.succeeded` y los eventos `query.*.succeeded`; no contiene contraseñas, cadenas de conexión ni parámetros clínicos.

## Consistencia de interfaz y tema

Las respuestas asíncronas del puente Tauri actualizan el estado de Angular dentro de `NgZone`. La autenticación administrativa finaliza su indicador visual antes de solicitar los metadatos SQL y esa consulta dispone de un límite de cinco segundos. Si Windows Credential Manager no responde dentro del límite, la sesión administrativa permanece activa, el formulario se habilita para captura manual y se presenta un mensaje controlado; la interfaz no queda detenida en el estado `Verificando`.

La superficie principal y el tablero consumen los tokens semánticos de Atomic UI, incluido `--surface-ground`, para mantener una sola jerarquía de color en modo claro, oscuro y `brand-dark`. Tailwind utiliza `darkMode: 'class'`, mientras `ThemeService` sincroniza la clase `dark` con `data-theme`. El selector neutral excluye `data-theme="brand-dark"`, por lo que la variante institucional conserva sus superficies propias y no recibe sobrescrituras del tema oscuro neutral.

Cuando el período consultado no contiene filas, el tablero presenta `No hay datos para el período seleccionado.`. Este estado se diferencia de la carga activa y evita mantener el mensaje `Cargando la data...` después de concluir las consultas.

## Compatibilidad ante cambios en SQL Server

La aplicación presenta un desacoplamiento parcial. La capa Rust no consulta tablas físicas de forma directa; todos los casos de uso se ejecutan mediante cuatro procedimientos del esquema `ind`:

| Caso de uso | Contrato SQL estable requerido |
|---|---|
| Tablero | `ind.USP_SEL_DASHBOARD_STATS_ID11(@I_MES, @I_ANIO)`; deberá conservar un primer result set principal y un segundo result set mensual. |
| Nominal | `ind.USP_SEL_GRILLA_NOMINAL_ID11(...)`; deberá conservar el result set nominal y un segundo result set con `TotalRecords` entero. |
| Descartados | `ind.USP_SEL_DESCARTADOS_ID11(...)`; deberá conservar el result set de descartados y un segundo result set con `TotalRecords` entero. |
| Universo evaluado | `ind.USP_SEL_UNIVERSO_EVALUADO_SIS240_ID11(@I_MES, @I_ANIO)`; deberá conservar una fila diagnóstica con `V_TABLA`, periodo, totales y `V_ESTADO`. |

Los cambios internos en tablas, índices, particiones o planes de ejecución no romperán el ejecutable cuando las vistas y los procedimientos adapten esas modificaciones y preserven nombres, tipos, nulabilidad semántica, cantidad y orden de los result sets. La incorporación de columnas adicionales tampoco afecta a los DTO mientras las columnas requeridas continúen presentes.

El ejecutable sí rechazará cambios incompatibles en nombres de procedimientos, parámetros, columnas, tipos SQL o result sets. El repositorio Rust exige nombres concretos, entre ellos `dni_paciente`, `I_NUM`, `TotalRecords`, `DNI_Paciente`, `I_MES`, `V_TABLA` y las columnas agregadas del tablero. También se romperá la conexión si la base deja de llamarse `indicadores_hra` y `HRA_DB_NAME` no se actualiza.

El aislamiento respecto de tablas físicas se concentra en `ind.VW_NOMINAL_ID11`, `ind.VW_DESCARTADOS_ID11` y los procedimientos versionados. Esa capa depende a su vez de objetos como `stg.his_trama`, `stg.his_maestro_paciente`, `stg.his_maestro_personal`, `ind.resultados_indicador_11` e `ind.SIS240_UNIVERSO_EVALUADO_ID11`. Por tanto, las migraciones de esos objetos deberán actualizar primero las vistas y procedimientos compatibles.

Los procedimientos nominales y de descartados mantienen cachés mediante operaciones `INSERT` y `DELETE`; el usuario SQL de la aplicación requiere permisos de ejecución que cubran esos efectos internos, aunque la capa Rust sólo emita `EXEC`. La comprobación `npm run db:validate:sps` valida nombres, parámetros, placeholders y presencia de versiones SQL locales. No inspecciona el esquema desplegado ni demuestra compatibilidad de columnas en una base remota. Una entrega deberá ejecutar pruebas de contrato contra una base no productiva antes de desplegar cambios estructurales.

Los builds de escritorio ejecutan `npm run db:validate:sps` antes de empaquetar. La comprobación lee las llamadas `EXEC ind.USP_*` de Rust y las firmas versionadas en `database/sps`; no se conecta a SQL Server ni modifica objetos remotos. Cualquier parámetro ausente, placeholder fuera de secuencia, procedimiento sin versión local o consulta SQL directa detiene el build. El despliegue automático desde este repositorio permanece deshabilitado y requiere revisión del responsable de base de datos.

La compilación Angular se mantiene con:

```bash
npm run build
```

La verificación local se ejecuta con:

```bash
npm run check:types
npm run check:angular
npm test
npm audit
npm run db:validate:sps
npm run tauri build -- --no-bundle
cd src-tauri
cargo fmt --check
cargo check --locked
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
```

La integración continua ejecuta las mismas comprobaciones, incorpora RustSec y confirma mediante `git status --porcelain --untracked-files=all` que la compilación no modifique archivos versionables.

## Evidencia local de entrega

El flujo de entrega genera un SBOM CycloneDX 1.6 combinado para Node.js y
Rust, un manifiesto determinista de entradas y artefactos, y un archivo
`SHA256SUMS.txt`. La salida permanece ignorada bajo
`src-tauri/target/release-evidence` y no requiere credenciales, certificados ni
acceso a SQL Server.
La promoción se realiza mediante un directorio temporal y conserva la evidencia
anterior ante fallos. La ruta de salida queda limitada a
`src-tauri/target/`; se rechazan rutas absolutas, segmentos ascendentes,
enlaces simbólicos y `junctions`, y cada hash del manifiesto debe coincidir con
`SHA256SUMS.txt`.

```bash
npm run release:metadata
npm run release:verify
npm run release:stage
```

`release:stage` incorpora el ejecutable Tauri ya compilado a la lista cerrada
de entrega. La firma Authenticode, el sellado de tiempo y la publicación se
mantienen como controles externos porque requieren un certificado
institucional y secretos administrados. Las acciones reutilizables de GitHub
conservan etiquetas versionadas hasta que sus SHA sean verificados y aprobados
por el responsable de la plataforma.

## Anexo consolidado: readme

> Procedencia: `docs/manuales/README.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/manuales/README.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Índice canónico de manuales de Base Tauri"
subtitle: "Cobertura funcional, operativa, administrativa y técnica"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "índice documental"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
```


### Índice canónico de manuales de Base Tauri

#### Cobertura obligatoria

| Responsabilidad | Documento | Fuente ejecutable principal |
|---|---|---|
| Uso funcional | [Manual de usuario](docs/manuales/MANUAL_DE_USUARIO.md) | `src/app`, comandos registrados en `src-tauri/src/lib.rs` |
| Desarrollo | [Guía de desarrollo](docs/manuales/ARQUITECTURA_BACKEND.md) | `package.json`, `src-tauri/Cargo.toml` y pruebas |
| Arquitectura | [Arquitectura del backend](docs/manuales/ARQUITECTURA_BACKEND.md) | `src-tauri/src/{domain,application,infrastructure,interfaces}` |
| Operación | [Manual de operación](docs/manuales/MANUAL_DE_OPERACION.md) | estados de conexión, consultas y registros |
| Administración | [Manual de administración](docs/manuales/MANUAL_DE_ADMINISTRACION.md) | seguridad, sesiones, WinVault y recuperador |
| Seguridad | [Guía de seguridad](docs/manuales/MANUAL_DE_ADMINISTRACION.md) | `security.rs`, `audit.rs` y selección TLS |
| Configuración | [Referencia de configuración](docs/manuales/MANUAL_DE_ADMINISTRACION.md) | `tauri.conf.json`, variables y perfil SQL |
| Despliegue | [Guía de despliegue](docs/manuales/GUIA_DE_DESPLIEGUE.md) | scripts de staging, manifiestos y firma |
| Continuidad | [Plan de continuidad](docs/manuales/MANUAL_DE_ADMINISTRACION.md) | recuperación, reversión y evidencia |
| Soporte | [Guía de solución de problemas](docs/manuales/MANUAL_DE_OPERACION.md) | errores controlados y etapas |
| SQL Server | [Integración con base de datos](docs/manuales/INTEGRACION_BASE_DATOS.md) | `database`, Tiberius y contratos |
| Datos | [Diccionario de datos](docs/manuales/INTEGRACION_BASE_DATOS.md) | procedimientos SQL, DTO Rust y dominio |
| Backend | [Contratos del backend](docs/manuales/ARQUITECTURA_BACKEND.md) | puertos, servicio y repositorio |
| API/IPC | [Contratos API e IPC](docs/manuales/ARQUITECTURA_BACKEND.md) | `generate_handler!` y contratos generados |

#### Recuperación administrativa

El recuperador es un ejecutable separado. Sus documentos especializados continúan vigentes y complementan esta suite:

- [Manual de usuario del recuperador](docs/manuales/MANUAL_DE_ADMINISTRACION.md)
- [Guía de desarrollo del recuperador](docs/manuales/ARQUITECTURA_BACKEND.md)
- [Guía de despliegue del recuperador](docs/manuales/GUIA_DE_DESPLIEGUE.md)

#### Autoridad y actualización

El código y los contratos del mismo commit prevalecen sobre los manuales; los manuales vigentes prevalecen sobre changelogs, lecciones y registros sustituidos. Cada cambio funcional debe actualizar el documento afectado, `CHANGELOG.md` y `LESSONS_LEARNED.md`. No se incorporan contraseñas, direcciones internas, tokens, cadenas de conexión ni datos nominales.

</details>
