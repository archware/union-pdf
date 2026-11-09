---
title: "Manual de administración de Base Tauri"
subtitle: "Autenticación, sesión, perfil SQL y recuperación local"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "manual administrativo"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
---

# Manual de administración de Base Tauri

## Fuentes administrativas

La precedencia es `HRA_ADMIN_PASSWORD_HASH`, el alias transitorio `HRA_TAURI_ADMIN_PASSWORD_HASH`, el registro local `pe.gob.hra.modulo-operativo/admin-password-hash-argon2id-v1` y, sólo para migración, `HRA_Indicadores_Tauri/Admin_Password_Hash_Argon2id_V1`. Una variable presente e inválida bloquea el uso de la fuente local.

La sesión predeterminada dura cinco minutos, admite como máximo 32 sesiones residentes y limita los intentos fallidos. El token secreto permanece en memoria. `get_admin_session_v1` devuelve únicamente un identificador público y metadatos de expiración.

## Perfil SQL

El perfil vigente se almacena en `HRA_Indicadores_Tauri/DB_Config_V1`. `get_connection_profile_v1` devuelve servidor, puerto, base, usuario, modo TLS, revisión y referencia opaca; nunca devuelve la contraseña.

La configuración sigue esta secuencia:

1. `authenticate_admin` crea una sesión vigente.
2. `get_connection_profile_v1` recupera el perfil no secreto.
3. `test_connection_v1` valida una configuración candidata sin persistirla.
4. Rust construye un pool con timeout de diez segundos y ejecuta `SELECT 1`.
5. `connect_db_v1` persiste y activa sólo una conexión verificada.

El modo heredado se habilita explícitamente y sólo para una IP privada o loopback. No se combina con `HRA_SQL_CA_CERT` ni con `HRA_DEV_ALLOW_INVALID_CERT`.

## Recuperación local

El recuperador Rust usa GUI Win32 por defecto y `--reset` como contingencia. Comparte el mutex global con la aplicación y falla si ésta continúa abierta. Una variable administrativa presente, incluso vacía, bloquea el reemplazo local. El recuperador sólo reemplaza el hash local vigente y no toca credenciales SQL.

## Evidencia

La evidencia administrativa registra operación, versión, hora, resultado y referencia de perfil. No registra contraseña, hash, token, cadena completa ni datos de pacientes. Los incidentes se atienden mediante la [guía de seguridad](MANUAL_DE_ADMINISTRACION.md).

## Anexo consolidado: guia de seguridad

> Procedencia: `docs/manuales/GUIA_DE_SEGURIDAD.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/manuales/GUIA_DE_SEGURIDAD.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Guía de seguridad de Base Tauri"
subtitle: "Sesiones, WinVault, TLS, auditoría y cadena de entrega"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "guía de seguridad"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
```


### Guía de seguridad de Base Tauri

#### Fronteras de confianza

Angular, argumentos IPC, WinVault, red SQL, sistema de archivos y paquetes de entrega se tratan como fronteras diferenciadas. Rust valida cada entrada antes de alcanzar infraestructura y traduce los fallos a códigos seguros. No se exponen mensajes del controlador, rutas, búsquedas ni datos de pacientes.

#### Administración

Los hashes válidos usan Argon2id dentro de límites de memoria, iteraciones y paralelismo. La sesión dura cinco minutos, permanece en memoria y usa un token de 32 bytes. El identificador público de sesión es distinto del token secreto. Los intentos fallidos y sesiones activas están limitados.

La aplicación y el recuperador comparten `Global\HRA.ModuloOperativoTauri.AdminCredential.Runtime.v1`. Un error al crear o adquirir el mutex falla de forma cerrada. El recuperador revalida las variables administradas inmediatamente antes de escribir.

#### Credenciales SQL

El perfil y la contraseña se almacenan en `HRA_Indicadores_Tauri/DB_Config_V1`. La contraseña sólo puede reutilizarse cuando la identidad de conexión permanece compatible. Una nueva configuración se persiste después de construir el pool y ejecutar `SELECT 1`.

#### TLS

- Estricto: cifrado obligatorio, TLS 1.2 o superior, Schannel y certificado válido.
- Autoridad privada: `HRA_SQL_CA_CERT` aporta una autoridad para el modo estricto.
- Desarrollo: `HRA_DEV_ALLOW_INVALID_CERT=true` sólo se admite en compilaciones de depuración.
- Heredado: OpenSSL vendorizado, TLS 1.0 mínimo, destino privado/loopback y aceptación explícita del certificado.

No se combinan excepciones ni se intenta texto plano.

#### Auditoría y registros

Los eventos registran categorías como conexión iniciada, lograda o fallida y consultas logradas o fallidas. `security-audit.log` reside bajo el directorio de logs de la aplicación y rota. Se omiten token, contraseña, cadena, búsqueda y documento de paciente.

#### Cadena de entrega

La publicación exige escaneo de secretos, pruebas, SBOM, manifiesto, sumas, verificación del recuperador, firma Authenticode y evidencia posterior. Un nombre de archivo o una firma válida no prueban por sí solos la identidad funcional; el verificador vincula fuente, producto y estructura del PE.

#### Incidente

Se cierra la aplicación, se conserva la evidencia, se revocan sesiones y se registra versión, huella, etapa y código. Los secretos y datos nominales no se adjuntan. La recuperación sigue el [plan de continuidad](MANUAL_DE_ADMINISTRACION.md).

</details>

## Anexo consolidado: referencia de configuracion

> Procedencia: `docs/manuales/REFERENCIA_DE_CONFIGURACION.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/manuales/REFERENCIA_DE_CONFIGURACION.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Referencia de configuración de Base Tauri"
subtitle: "Manifiesto, desarrollo, variables y almacenamiento seguro"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "referencia técnica"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
```


### Referencia de configuración de Base Tauri

#### Manifiesto Tauri

[`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) define el producto visible `HRA Modulo Operativo Tauri Beta`, versión numérica 1.6.1, identificador `com.havelcontreras.base-tauri-angular`, URL de desarrollo `http://localhost:1420`, `npm run start` antes de desarrollo y `npm run build` antes de compilar.

#### Variables

| Variable | Predeterminado | Regla |
|---|---|---|
| `HRA_ADMIN_PASSWORD_HASH` | sin valor | Hash Argon2id administrado y autoritativo |
| `HRA_TAURI_ADMIN_PASSWORD_HASH` | sin valor | Alias Argon2id transitorio |
| `HRA_DB_NAME` | `indicadores_hra` | Base usada cuando el perfil no la especifica |
| `HRA_DB_PORT` | 1433 | Puerto entero válido |
| `HRA_SQL_CA_CERT` | sin valor | Archivo de autoridad certificadora para modo estricto |
| `HRA_DEV_ALLOW_INVALID_CERT` | `false` | Sólo disponible en compilación de desarrollo |

El servidor, usuario, contraseña y selección `legacy_tls` forman parte del perfil capturado por la interfaz. No existe una dirección fija en Angular.

#### Almacenamiento

| Propósito | Servicio/cuenta |
|---|---|
| Perfil y contraseña SQL | `HRA_Indicadores_Tauri/DB_Config_V1` |
| Compatibilidad SQL de lectura | `HRA_Indicadores/DB_Config` |
| Hash administrativo local | `pe.gob.hra.modulo-operativo/admin-password-hash-argon2id-v1` |
| Hash administrativo heredado | `HRA_Indicadores_Tauri/Admin_Password_Hash_Argon2id_V1` |

La entrada heredada no se elimina ni se sobrescribe durante una adopción. Una entrada dedicada presente pero inválida falla de forma cerrada.

#### Precedencia y adopción

La resolución no mezcla fuentes arbitrariamente. El orden siguiente se deriva
de `security.rs::load_admin_password_hash`,
`tauri_cmds.rs::load_credentials`, `resolve_connection_credentials` y
`resolved_database_endpoint`.

##### Credencial administrativa

1. `HRA_ADMIN_PASSWORD_HASH` es autoritativa. Si está presente y no cumple la
   política Argon2id, la autenticación falla; no se consulta otra fuente.
2. Si la anterior no existe, se evalúa `HRA_TAURI_ADMIN_PASSWORD_HASH`. Un hash
   Argon2id compatible se usa como fuente heredada; un hash Argon2id inválido
   falla de forma cerrada.
3. Sin variable administrada se lee
   `pe.gob.hra.modulo-operativo/admin-password-hash-argon2id-v1`.
4. Sólo cuando la entrada local dedicada no existe se consulta
   `HRA_Indicadores_Tauri/Admin_Password_Hash_Argon2id_V1`. Un valor compatible
   se copia al destino dedicado sin eliminar el original. Una entrada dedicada
   inválida no permite caer a la heredada.

##### Perfil SQL

1. Se lee `HRA_Indicadores_Tauri/DB_Config_V1`. Si existe pero su JSON, servidor,
   usuario o política no son válidos, se devuelve error y no se oculta mediante
   una fuente heredada.
2. Sólo si no existe se intenta el destino WinVault compartido
   `HRA_Indicadores:DB_Config` mediante `keyring-core`.
3. Si tampoco existe, se intenta la representación histórica de
   `HRA_Indicadores/DB_Config` mediante `keyring`. Una adopción compatible se
   copia a `DB_Config_V1`; ninguna fuente anterior se borra.
4. En una solicitud con contraseña no vacía prevalece esa contraseña. Una
   contraseña vacía sólo reutiliza la almacenada si servidor y usuario coinciden
   sin distinguir mayúsculas; de lo contrario se rechaza.

##### Endpoint y TLS

| Valor efectivo | Precedencia |
|---|---|
| Servidor y usuario | Solicitud validada; para reconexión automática, perfil dedicado o adoptado |
| Contraseña | Solicitud no vacía; en su ausencia, perfil almacenado sólo para el mismo servidor y usuario |
| Base de datos | Campo `database` no vacío del perfil/solicitud; de lo contrario `HRA_DB_NAME`; de lo contrario `indicadores_hra` |
| Puerto | `HRA_DB_PORT`; de lo contrario `1433`. El perfil no contiene un puerto configurable independiente |
| Modo TLS | `legacy_tls` de la solicitud o perfil. La ausencia histórica equivale a modo estricto |
| Autoridad certificadora | `HRA_SQL_CA_CERT` sólo en modo estricto y si apunta a un archivo existente |
| Certificado no validado | `HRA_DEV_ALLOW_INVALID_CERT=true` sólo en build de desarrollo; es incompatible con CA explícita y con `legacy_tls` |

Una prueba candidata no sustituye el servicio activo ni persiste el perfil. La
activación ocurre después de validar, obtener pool y ejecutar `SELECT 1`; los
cambios de conexión se serializan con `ConnectionOperationGate`.

#### Timeouts

La apertura y prueba de conexión usan diez segundos; las consultas usan 45 segundos; la lectura del almacén seguro usa dos segundos. Estos valores se encuentran en `src-tauri/src/interfaces/tauri_cmds.rs` y no deben duplicarse como parámetros libres en el frontend.

</details>

## Anexo consolidado: plan de continuidad

> Procedencia: `docs/manuales/PLAN_DE_CONTINUIDAD.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/manuales/PLAN_DE_CONTINUIDAD.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Plan de continuidad de Base Tauri"
subtitle: "Recuperación de aplicación, credenciales, conexión y servicio SQL"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "plan operativo"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
```


### Plan de continuidad de Base Tauri

#### Objetivos medibles

Mientras no exista un acuerdo institucional más exigente asociado a esta base,
se aplican los siguientes objetivos técnicos. El tiempo se mide desde la
declaración del incidente hasta la comprobación indicada; una prueba que exceda
el objetivo se registra como incumplimiento y genera una acción correctiva.

| Servicio o activo | RTO | RPO | Evidencia de recuperación | Responsable |
|---|---:|---:|---|---|
| Aplicación de escritorio y recuperador | 4 horas | 0 horas; el paquete aprobado es inmutable | Firma, SHA-256, versión, apertura y verificación del helper | Operaciones de escritorio |
| Perfil y credencial SQL local | 2 horas | 0 horas de datos clínicos; el perfil se vuelve a registrar y no se restaura desde archivos | `test_connection_v1` satisfactorio y perfil público sin contraseña | Administración autorizada |
| Hash administrativo local | 2 horas | 0 horas; se establece una credencial nueva | Recuperador ejecutado con la aplicación cerrada y autenticación posterior | Seguridad y soporte autorizado |
| Servicio y objetos de SQL Server | 8 horas como objetivo de dependencia | 24 horas como máximo provisional | Restauración institucional, conteos por periodo y cuatro procedimientos funcionales | Responsable institucional de base de datos |

Base Tauri no almacena filas clínicas locales, por lo que su RPO de datos
clínicos depende exclusivamente de SQL Server. Si el plan institucional de SQL
no garantiza al menos el objetivo provisional anterior, la entrega no puede
declararse recuperable: debe registrarse el RTO/RPO contractual real y aceptar
formalmente la diferencia antes del despliegue.

#### Activos y recuperación

| Activo | Autoridad | Recuperación |
|---|---|---|
| Aplicación | Paquete firmado y evidencia | Restaurar el último paquete aprobado |
| Perfil SQL | `HRA_Indicadores_Tauri/DB_Config_V1` | Volver a configurar y probar mediante sesión administrativa |
| Contraseña SQL | Windows Credential Manager | Registrar nuevamente; no copiar desde archivos |
| Hash administrativo local | `pe.gob.hra.modulo-operativo/admin-password-hash-argon2id-v1` | Recuperador Rust con aplicación cerrada |
| Variable administrativa | Gestor institucional de secretos | Rotación en el entorno administrado |
| Datos y objetos SQL | Procedimientos institucionales del servidor | Restauración por el responsable de base de datos |

La aplicación no crea respaldos clínicos locales. La continuidad de SQL Server y de los datos pertenece al procedimiento institucional del servidor.

#### Escenarios

##### Binario o instalación dañada

Se conserva huella y registro, se retira el paquete defectuoso y se restaura la última entrega completa. Después se comprueban versión, firma, apertura y estado de conexión.

##### Perfil o contraseña SQL no disponible

Se autentica la administración, se captura un perfil nuevo y se ejecuta `test_connection_v1`. Sólo una prueba satisfactoria habilita `connect_db_v1`. No se edita WinVault con herramientas genéricas.

##### Contraseña administrativa local perdida

Se cierra la aplicación y se ejecuta el recuperador sin argumentos. Si existe una variable administrada, la recuperación local se detiene y la rotación se realiza en el gestor institucional.

##### SQL Server no disponible

Se detienen reintentos, se registra la categoría y se escala. No se activa `legacy_tls` para resolver red, credenciales o certificado. La restauración o reversión de objetos SQL se ejecuta fuera de la aplicación.

#### Prueba de continuidad

La prueba trimestral usa cuenta Windows y base SQL de ensayo. Debe verificar paquete, recuperación local aislada, reconfiguración, consulta de tablero, registro seguro y reversión. No modifica WinVault real ni datos clínicos. El acta registra hora de inicio, hora de cada recuperación, RTO observado, punto de restauración, RPO observado, huellas, responsable y desviaciones.

La secuencia temporal es la siguiente:

1. En los primeros 15 minutos se clasifica si el incidente pertenece al binario,
   al almacén seguro, a red/TLS o a SQL Server.
2. En la primera hora se preservan logs y huellas, se detienen reintentos y se
   convoca al responsable del activo.
3. Antes de las dos horas se recuperan credenciales locales o se escala la
   dependencia SQL.
4. Antes de las cuatro horas se restaura el paquete completo aprobado.
5. Antes de las ocho horas se valida SQL o se declara formalmente la
   indisponibilidad de la dependencia y el incumplimiento del objetivo.

#### Cierre

El incidente concluye cuando la aplicación, el perfil, la conexión y los contratos se encuentran verificados; la evidencia registra versión, huellas, etapas y responsable sin secretos.

</details>

## Anexo consolidado: manual de usuario

> Procedencia: `docs/recuperacion-administrativa/MANUAL_DE_USUARIO.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/recuperacion-administrativa/MANUAL_DE_USUARIO.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Manual de usuario del recuperador administrativo"
subtitle: "Restablecimiento local de la credencial administrativa del módulo operativo HRA"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-15"
document_status: "active"
application_version: "1.6.1"
status: "vigente"
version: "1.6.1"
audience: "Personal autorizado de soporte y administración"
production_ready: false
```


### Manual de usuario del recuperador administrativo

#### Propósito

El recuperador administrativo permite reemplazar la contraseña administrativa
local del módulo operativo HRA cuando la contraseña anterior ya no se encuentra
disponible. La utilidad es una aplicación Win32 separada del programa Tauri y
opera únicamente sobre la credencial del usuario de Windows que la ejecuta.

El recuperador no abre el módulo principal, no expone IPC, no se conecta a SQL
Server, Kafka o Nexus y no modifica las credenciales de base de datos. Tampoco
funciona como llave maestra para otros proyectos: cada producto del ecosistema
mantiene un destino de credencial y un mutex propios.

#### Identificación del ejecutable

La versión 1.6.1 utiliza el archivo siguiente:

```text
HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe
```

Después de una instalación institucional, el archivo deberá encontrarse junto
al ejecutable de la aplicación. El instalador deberá crear además el acceso
directo siguiente, sin argumentos:

```text
Menú Inicio\Recuperar contraseña administrativa.lnk
```

Después de la limpieza de salidas regenerables, el repositorio no conserva un
EXE principal ni un directorio `src-tauri/target`. La copia preservada para QA
estático se encuentra en:

```text
D:\Repos2\_entregables_qa\recuperacion-administrativa\base-tauri-1.6.1-93e0b22\
```

Esa carpeta corresponde al commit
`93e0b22b0a55efd9ded7abf0c433714c9aded8e2`. El ejecutable conservado tiene el
SHA-256 siguiente:

```text
d9e06d795e380c30be06dc3f535e661850cec7f0db5d95353efcae6adb396c7e
```

La copia central es evidencia histórica de QA, presenta estado Authenticode
`NotSigned` y conserva `productionReady=false`. No deberá distribuirse como
entrega productiva ni mezclarse con evidencia generada desde otro commit.

#### Requisitos previos

Antes del restablecimiento se deberán cumplir todas las condiciones siguientes:

- La aplicación principal deberá encontrarse completamente cerrada.

- La operación deberá realizarse con la misma cuenta de Windows que utiliza la
  aplicación, porque Windows Credential Manager separa las credenciales por
  usuario.

- No deberá existir otra instancia del recuperador, incluso en otra sesión RDP
  del mismo equipo.

- Las variables `HRA_ADMIN_PASSWORD_HASH` y
  `HRA_TAURI_ADMIN_PASSWORD_HASH` deberán estar ausentes del entorno del
  proceso. La sola presencia de cualquiera de ellas, aun con valor vacío o
  inválido, bloquea el reemplazo local. Cuando una variable sea administrada
  institucionalmente, su retiro deberá ser autorizado por el responsable de
  configuración; el recuperador no deberá utilizarse para eludir esa fuente.

- La nueva contraseña deberá tener entre 12 y 256 caracteres, no superar 256
  bytes en UTF-8 y no contener caracteres de control.

#### Restablecimiento mediante la interfaz gráfica

El procedimiento ordinario se ejecuta sin parámetros:

1. Se cierra el módulo operativo HRA y se comprueba que no permanezca activo en
   otra sesión de Windows o RDP.

2. Se abre `Recuperar contraseña administrativa` desde el menú Inicio. En una
   revisión QA autorizada también puede abrirse directamente el ejecutable
   correspondiente a la misma versión del producto.

3. Se verifica que la ventana muestre
   `HRA Modulo Operativo - Recuperacion administrativa` y el estado listo para
   validación local.

4. Se introduce la nueva contraseña en los dos controles protegidos. El botón
   `Confirmar` permanece deshabilitado mientras los valores no coincidan o no
   satisfagan la política.

5. Se selecciona `Confirmar`. También puede utilizarse la navegación estándar
   de Windows mediante Tab, Shift+Tab, Enter, Escape y mnemónicos.

6. Se espera el mensaje que informa que la contraseña fue reemplazada y que la
   aplicación debe reiniciarse. Los campos quedan deshabilitados y el botón de
   cancelación cambia a `Cerrar`.

7. Se cierra el recuperador, se inicia nuevamente el módulo operativo y se
   valida la autenticación con la contraseña nueva.

La cancelación o el cierre de la ventana antes de una confirmación satisfactoria
no deben interpretarse como un restablecimiento.

#### Contingencia mediante terminal

La terminal constituye únicamente una alternativa de soporte. El único
argumento aceptado es el valor exacto `--reset`, y la contraseña nunca se
incluye en la línea de comandos:

```powershell
& ".\HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe" --reset
```

La entrada estándar y la salida de error deberán corresponder a una terminal
interactiva. Las variantes `-reset`, argumentos adicionales, redirecciones o
automatizaciones no interactivas se rechazan antes de solicitar el secreto.

En un entorno de desarrollo con Cargo instalado puede utilizarse la fuente del
helper:

```powershell
scripts\configure_admin_password.bat --reset
```

La invocación del script compila o ejecuta el crate auxiliar en modo offline y
no representa el procedimiento destinado a estaciones productivas.

#### Alcance exacto del cambio

El reemplazo escribe un hash PHC Argon2id nuevo en Windows Credential Manager
para el usuario actual y únicamente en el destino siguiente:

| Propiedad | Valor |
|---|---|
| Servicio | `pe.gob.hra.modulo-operativo` |
| Cuenta | `admin-password-hash-argon2id-v1` |
| Mutex | `Global\HRA.ModuloOperativoTauri.AdminCredential.Runtime.v1` |

El recuperador no lee ni modifica el destino heredado
`HRA_Indicadores_Tauri` / `Admin_Password_Hash_Argon2id_V1`. Tampoco elimina la
contraseña anterior antes de que el almacén acepte la nueva, no muestra el hash
generado y no guarda la contraseña en archivos de configuración.

#### Diagnóstico de incidencias

| Situación observada | Causa probable | Acción autorizada |
|---|---|---|
| Se solicita cerrar la aplicación Tauri | El mutex ya existe porque la aplicación o el recuperador continúa activo | Se deberán cerrar todas las instancias y revisar otras sesiones RDP antes de reintentar. |
| La recuperación local aparece bloqueada por una variable administrativa | Existe `HRA_ADMIN_PASSWORD_HASH` o `HRA_TAURI_ADMIN_PASSWORD_HASH` | Se deberá revisar la configuración con el responsable autorizado; no se deberá borrar una fuente institucional sin aprobación. |
| `Confirmar` permanece deshabilitado | Los valores no coinciden o incumplen longitud, bytes o caracteres permitidos | Se deberán introducir dos valores idénticos que satisfagan la política. |
| No se puede abrir el almacén seguro | Windows Credential Manager no está disponible para la sesión o la cuenta | Se deberá registrar el error sin incluir secretos y escalarlo al soporte de la estación. |
| La contingencia indica que requiere una terminal interactiva | La ejecución fue redirigida, automatizada o lanzada sin consola asociable | Se deberá abrir una terminal interactiva bajo la misma cuenta de Windows. |
| El acceso del menú Inicio no existe | La instalación no incorporó el componente MSI/NSIS o fue alterada | Se deberá reparar la instalación; no se deberá crear un acceso que apunte a un helper de otra versión. |
| La nueva contraseña no autentica | El helper se ejecutó con otra cuenta de Windows, la aplicación no fue reiniciada o una variable de entorno mantiene precedencia | Se deberá verificar la cuenta, reiniciar la aplicación y revisar las fuentes administrativas autorizadas. |

#### Tratamiento seguro de la incidencia

La contraseña nueva no deberá incorporarse a tickets, capturas, archivos de
texto, argumentos, correos o registros. La evidencia de soporte deberá limitarse
al nombre del producto, versión, estado, código de salida y huellas de los
artefactos. El ejecutable deberá obtenerse únicamente de una entrega cuya firma
institucional y sello de tiempo hayan sido verificados.

La copia QA central no autoriza una intervención sobre credenciales reales. La
prueba funcional previa a producción deberá realizarse en una cuenta Windows
desechable y con una instalación limpia.

#### Documentos relacionados

- [Guía de desarrollo](ARQUITECTURA_BACKEND.md)

- [Guía de despliegue](GUIA_DE_DESPLIEGUE.md)

- [Decisión sobre interfaz Win32 y distribución](../decisions/ADR-016-interfaz-win32-y-distribucion-del-recuperador-1-6-1.md)

- [Contrato del producto](../../admin-recovery.product.json)

</details>
