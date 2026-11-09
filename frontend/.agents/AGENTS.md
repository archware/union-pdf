---
title: "Guía de arquitectura y reglas de trabajo para Tauri y Angular"
subtitle: "Restricciones obligatorias de seguridad, datos, interfaz y compilación"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
status: "Vigente"
version: "2.1.0"
date: "2026-08-13"
---

# Guía de arquitectura y reglas de trabajo para Tauri y Angular

El presente documento establece las reglas obligatorias para cualquier cambio en este proyecto. Las reglas de seguridad prevalecen sobre las facilidades de desarrollo y deberán conservarse en código, pruebas, documentación y procesos de compilación.

## 1. Frontera de seguridad

- La aplicación deberá fallar de forma segura cuando el backend Tauri, la conexión SQL o la configuración administrativa no estén disponibles. No se deberán devolver datos simulados desde flujos productivos.
- Ninguna contraseña, cadena de conexión o token deberá incorporarse al repositorio, al paquete de distribución ni al directorio del ejecutable.
- La contraseña SQL deberá permanecer en Windows Credential Manager bajo `HRA_Indicadores_Tauri` / `DB_Config_V1`. Si este destino no existe, sólo se deberán leer y copiar cargas compatibles desde `HRA_Indicadores:DB_Config` y `DB_Config.HRA_Indicadores`; la migración no deberá eliminar ni sobrescribir los registros anteriores. El renderer solo podrá recibir servidor, usuario y estado de configuración después de validar una sesión administrativa.
- `HRA_ADMIN_PASSWORD_HASH` deberá constituir la fuente primaria para los despliegues administrados. Sólo cuando esa variable no exista, `HRA_TAURI_ADMIN_PASSWORD_HASH` podrá utilizarse como fuente heredada si contiene un hash Argon2id compatible; su lectura no deberá modificar ni eliminar el valor de origen. El hash local deberá almacenarse bajo `pe.gob.hra.modulo-operativo` / `admin-password-hash-argon2id-v1`. Cuando este destino no exista, un hash Argon2id compatible de `HRA_Indicadores_Tauri` / `Admin_Password_Hash_Argon2id_V1` podrá copiarse sin borrar ni sobrescribir el registro anterior.
- Las sesiones administrativas deberán utilizar un TTL predeterminado de cinco minutos y no deberán superar el máximo de quince minutos.
- La recuperación de una contraseña administrativa local deberá operar sin SQL Server y con la aplicación cerrada. La invocación sin argumentos abrirá la GUI Win32 nativa; el argumento exacto `--reset` será la única contingencia CLI y exigirá terminal interactiva. La aplicación y el recuperador deberán compartir un mutex global de Windows que cubra sesiones RDP; cualquier error de acceso al mutex deberá fallar de forma cerrada. Cualquier variable administrativa primaria o heredada presente, incluso vacía o inválida, deberá bloquear el reemplazo local. La operación reemplazará únicamente el hash vigente protegido por el usuario actual y no mostrará contraseñas ni hashes.
- El modo estricto de SQL Server deberá utilizar cifrado obligatorio, TLS 1.2 o superior y validación del certificado. `HRA_DEV_ALLOW_INVALID_CERT=true` solo podrá utilizarse en una compilación de depuración y nunca en una entrega. No se deberá reducir el protocolo TLS mediante un fallback automático; la única excepción será el modo `legacy_tls` explícito definido en la regla siguiente.
- `legacy_tls` sólo podrá operar como excepción administrativa explícita, deberá permanecer desactivado de forma predeterminada y se limitará a una dirección IP literal privada o de loopback. El backend conservará `EncryptionLevel::Required`, seleccionará OpenSSL vendorizado antes de conectar, configurará TLS 1.0 como versión mínima, no permitirá su combinación con otras excepciones TLS y no ejecutará una degradación automática. Schannel se utilizará exclusivamente en el modo estricto.
- Las credenciales SQL nuevas sólo podrán persistirse después de que el backend haya construido el pool y comprobado una conexión válida. No se deberá exponer un comando IPC independiente que permita guardar una configuración no verificada.
- Los comandos Tauri deberán validar tipos, longitudes, periodos, paginación y listas permitidas antes de alcanzar la infraestructura.
- Los logs deberán contener únicamente eventos operativos; no deberán registrar DNI, nombres, búsquedas, contraseñas, cadenas de conexión ni tokens.

## 2. Arquitectura de datos

- Los porcentajes, totales, promedios y agregaciones deberán resolverse en SQL Server mediante vistas o procedimientos almacenados.
- Los modelos TypeScript y Rust deberán reflejar explícitamente el contrato SQL. Los campos anulables deberán mantenerse como tales hasta su normalización controlada.
- La aplicación deberá rechazar una deriva del contrato SQL. No deberá convertir errores de mapeo o resultados parciales en respuestas exitosas.
- Las consultas dinámicas solo podrán utilizar identificadores incluidos en listas permitidas del backend.

## 3. Interfaz basada en Atomic UI

- Se deberán reutilizar los componentes de `src/app/shared/ui/`.
- Las tablas construidas con `<app-table>` deberán conservar la clase `rtc-table` en `<table class="atomic-table rtc-table">` y las clases responsivas correspondientes.
- Los colores deberán proceder de los tokens CSS del sistema de diseño; no se deberán incorporar valores hexadecimales aislados.
- Los componentes compartidos sincronizados desde Atomic UI deberán acompañarse de pruebas que protejan su contrato público.

## 4. Incorporación de indicadores

1. La capa de datos deberá crear la tabla de resultados y la vista nominal del indicador.
2. La capa Rust deberá incorporar los modelos y comandos asíncronos, registrar los comandos en `tauri::generate_handler!` y propagar errores controlados.
3. La capa Angular deberá consumir los comandos mediante `@tauri-apps/api/core` y deberá tratar la ausencia del backend como error.
4. La integración deberá utilizar los componentes gerenciales, operativos, gráficos y tablas estandarizadas.
5. La entrega deberá añadir pruebas del contrato SQL, validación IPC, error de conexión y comportamiento del frontend.

## 5. Compilación y entrega

- La configuración local se deberá proporcionar mediante variables de entorno no versionadas y ejemplos sin secretos.
- `npm run build`, `cargo check --locked`, `cargo clippy --locked --all-targets -- -D warnings` y `cargo test --locked` deberán finalizar correctamente.
- La compilación no deberá reescribir archivos fuente, manifiestos ni marcas de tiempo versionadas.
- El paquete deberá generarse desde un árbol revisado y no deberá contener `.env`, `db.json`, logs, credenciales ni datos simulados.

## Lenguaje ubicuo (Español)
- Se aplica la doctrina documentada en `C:/Users/cotaha/source/repos/.agents/skills/ubiquitous-language/SKILL.md`. Los identificadores públicos heredados se documentan como compatibilidad; los contratos nuevos usan `PeticionDto`, `RespuestaDto` o `VistaModelo`.

## Arquitectura hexagonal y DDD (estricto)
- Las capas permitidas son: `domain`, `application`, `infrastructure` e `interfaces`. Ninguna capa interior puede depender de una exterior.

## Flujo de mejora documentado
- ANTES de iniciar cualquier mejora, generar un roadmap en `.agent/roadmaps/`. Al terminar, actualizar `CHANGELOG.md` y `LESSONS_LEARNED.md`.
