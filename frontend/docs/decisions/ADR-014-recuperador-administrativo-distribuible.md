---
title: "Recuperador administrativo distribuible para la base Tauri"
subtitle: "Separación operativa, trazabilidad Git y promoción cerrada"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-14"
status: "aceptada"
decision_id: "ADR-014"
change_id: "TAURI-20260814-ADMIN-RECOVERY-DISTRIBUTION"
application_version: "1.6.0"
helper_target: "configure_admin_password"
production_ready: false
---

# Recuperador administrativo distribuible para la base Tauri

## Contexto

La recuperación local ya dispone de una frontera Rust cerrada, pero su ejecución
mediante `scripts\configure_admin_password.bat --reset` requiere Cargo, el
entorno MSVC y el código fuente completo. Esa forma resulta apropiada para
desarrollo y auditoría, no para una intervención operativa controlada en una
estación instalada.

El recuperador reemplaza exclusivamente el PHC Argon2id de
`pe.gob.hra.modulo-operativo` / `admin-password-hash-argon2id-v1` para el
usuario actual de Windows. Conserva el mutex global compartido con la
aplicación, exige exactamente `--reset`, comprueba una terminal interactiva y
falla de forma cerrada ante cualquiera de las variables administrativas. No
expone comandos IPC y no consulta SQL Server, Kafka ni Nexus.

## Decisión

Los módulos `admin_recovery_cli.rs` y `admin_recovery_runtime.rs` permanecen
como fuente compartida entre la aplicación y el recuperador. El crate mínimo
`src-tauri/admin-recovery` los incorpora directamente, sin depender del crate
principal ni resolver Tauri, Wry, WebView, Tiberius, OpenSSL o componentes SQL.
El flujo produce un ejecutable portable sin ejecutar `tauri build`, sin generar
el binario principal y sin producir MSI o NSIS. La salida queda confinada a
`src-tauri/target/admin-recovery`, ruta ignorada por Git.

El build script exclusivo del crate auxiliar incorpora los recursos PE. El
ejecutable solicita privilegios `asInvoker` para mantener la identidad del
usuario cuyo Windows Credential Manager se modifica. Sus metadatos declaran el
producto `HRA - Recuperación administrativa`, el editor `Hospital Regional
Ayacucho` y la versión canónica de Cargo. El recurso `OriginalFilename`
coincide con el nombre versionado del ejecutable entregado y la compuerta de
política Authenticode rechaza cualquier divergencia.

La construcción exige un árbol Git limpio y un `SOURCE_DATE_EPOCH` idéntico
al timestamp Unix de `HEAD`. El recibo registra el OID del commit, el OID del
árbol, el formato de objeto, el epoch, las huellas de las entradas, el
entorno de compilación, los ejecutables y versiones del toolchain, el comando
exacto, la cabecera PE y la huella SHA-256 del ejecutable. Cargo opera con
`--locked --offline`; el flujo rechaza overrides heredados de Rust, Cargo y
targets, además de validar una lista cerrada de dependencias. Dos directorios
de destino limpios e independientes deben producir un PE idéntico bit a bit.
Rust remapea los prefijos del target, del repositorio y del perfil local a
alias estables; una inspección posterior rechaza rutas locales incrustadas en
el ejecutable.

El recibo publica nombres lógicos, versiones y huellas de los ejecutables del
toolchain, pero omite sus rutas absolutas y la identidad local del operador.
Una segunda lectura de Git impide aceptar cambios concurrentes durante la
operación.

La preparación no reconstruye. Verifica el recibo y copia el mismo ejecutable a
una entrega de revisión con SBOM CycloneDX 1.6, manifiesto y `SHA256SUMS.txt`.
El SBOM se deriva del grafo alcanzable resuelto mediante `cargo metadata
--locked --offline --filter-platform x86_64-pc-windows-msvc`; conserva una
entrada `dependencies` exacta para la aplicación y cada componente, y no
publica los identificadores de ruta que Cargo utiliza internamente. El
manifiesto declara siempre `productionReady=false` y mantiene como bloqueos la
firma Authenticode institucional, la revisión antimalware, la comprobación en
Windows limpio y una prueba con cuenta desechable.

## Distribución

Se establecen dos rutas operativas y no intercambiables:

| Destinatario | Forma | Comando |
|---|---|---|
| Desarrollo y auditoría de fuente | Script que invoca Cargo con lock | `scripts\configure_admin_password.bat --reset` |
| Soporte de una instalación | Helper portable revisado | `HRA-Recuperacion-Administrativa-1.6.0-x64.exe --reset` |

El helper no se incluye automáticamente en el instalador de la aplicación. Su
entrega al personal autorizado debe conservar juntos el ejecutable, el recibo,
el manifiesto, el SBOM y `SHA256SUMS.txt`. La invocación se realiza con la
aplicación cerrada, desde una terminal interactiva de la misma cuenta Windows.

## Alcance

La decisión modifica la versión de la aplicación a 1.6.0, los metadatos PE
condicionales, el flujo auxiliar, las pruebas y la documentación. No
modifica Angular, comandos Tauri, procedimientos SQL, datos, Kafka, Nexus,
instaladores ni el ejecutable principal.

La capacidad se limita a aplicaciones que ya poseen una credencial
administrativa local real. No autoriza agregar contraseñas administrativas
artificiales a BCP ni a proyectos sin esa frontera.

## Verificación

Las pruebas puras validan el parser cerrado, la ruta de salida, la coincidencia
de `SOURCE_DATE_EPOCH`, las cabeceras PE32+ AMD64, la estructura del recibo, el
rechazo de overrides, la lista permitida y las relaciones exactas de
dependencias, el nombre original del recurso PE, los bloqueos del manifiesto y
la ausencia de IPC o acceso a datos en la frontera declarada. La compuerta de
versión incluye ambos archivos `Cargo.lock` y los valores de respaldo visibles
del frontend.

Antes de construir el helper, el cambio fuente debe superar las compuertas de
contratos, secretos, Atomic UI, TypeScript, Angular, Rust y las suites de
pruebas. La construcción del auxiliar se ejecuta sólo después del commit
selectivo para que el recibo pueda vincular una identidad Git limpia.

## Consecuencias

El personal de soporte obtiene una herramienta ejecutable sin instalar Cargo
y la aplicación conserva una sola implementación de recuperación. La
trazabilidad del binario mejora porque el recibo relaciona fuente y bytes
entregados. El artefacto no puede promocionarse a producción mientras los
bloqueos del manifiesto permanezcan pendientes.
