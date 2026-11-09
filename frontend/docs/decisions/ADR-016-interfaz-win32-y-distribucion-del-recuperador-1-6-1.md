---
title: "Interfaz Win32 y distribución del recuperador administrativo 1.6.1"
subtitle: "Contrato común, contingencia CLI y empaquetado con firma obligatoria"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-15"
status: "aceptada"
decision_id: "ADR-016"
application_version: "1.6.1"
interface_mode: "native-win32-gui"
default_invocation: "gui"
cli_fallback: true
---

# Interfaz Win32 y distribución del recuperador administrativo 1.6.1

## Contexto

El recuperador 1.6.0 disponía de un crate mínimo, un núcleo de seguridad
compartido y evidencia reproducible, pero exigía una terminal y `--reset`. Esa
frontera no ofrecía un acceso ordinario para soporte y todavía no integraba el
helper separado en las fuentes de los bundles.

## Decisión

El recuperador abre sin argumentos una ventana Win32 propia, sin Tauri, Wry,
WebView ni IPC. La ventana presenta dos controles `ES_PASSWORD`, requisitos,
estado y acciones de confirmación y cancelación. `IsDialogMessageW` conserva
Tab, Shift+Tab, Enter, Escape y mnemónicos. Enter sólo confirma un formulario
que el mismo predicado de política del núcleo considera válido.

La utilidad adquiere el mutex global y comprueba las variables administrativas
antes de habilitar los campos. El guard permanece vivo durante toda la ventana.
El núcleo vuelve a comprobar el entorno inmediatamente antes de escribir el
hash Argon2id en el destino vigente de Windows Credential Manager. Los errores
de almacenamiento no afirman que exista una reversión cuando el resultado de
la escritura no puede conocerse.

El argumento exacto `--reset` permanece como contingencia de consola. Los
demás argumentos fallan antes del acceso a credenciales. La invocación GUI
presenta los bloqueos en una ventana con campos deshabilitados; el modo CLI
informa únicamente por la consola adjunta.

El manifiesto raíz `admin-recovery.product.json` usa el esquema 2 y contiene
exactamente diez claves: identidad de aplicación, nombre y rol del artefacto,
fallback CLI, destino estructurado de credencial, invocación e interfaz,
mutex, versión y esquema. El texto del acceso y la exigencia de firma se
mantienen como política de distribución separada.

La configuración Tauri declara el helper como recurso separado junto a la
aplicación. NSIS y WiX crean el acceso `Recuperar contraseña administrativa`.
El comando previo al bundle falla de forma cerrada si no encuentra un PE con
nombre, versión, `OriginalFilename`, editor, EKU, firma y sello de tiempo
institucionales válidos. El inventario de esa fuente debe conservar la
identidad completa del commit, árbol, formato de objetos y epoch, coincidir con
el `HEAD` vigente y comprobar que el repositorio permanece limpio. La
preparación QA no construye MSI ni NSIS y conserva `productionReady=false`.

La entrega principal declara exactamente cuatro binarios con roles cerrados.
Como la verificación estática no extrae de manera uniforme todos los formatos
de instalador, la promoción exige una compuerta instalada: se compara el
SHA-256 del helper instalado con el artefacto independiente del manifiesto y
se valida que el acceso directo resuelva exactamente ese archivo. El acceso
debe llamarse `Recuperar contraseña administrativa.lnk`, residir en el menú
Inicio del usuario o del equipo y carecer de argumentos. La comprobación no
ejecuta el PE y genera un recibo sujeto a revisión independiente en Windows
limpio.

## Consecuencias

El soporte obtiene una ruta gráfica sin ampliar la superficie del helper. El
crate continúa aislado de la aplicación y de SQL Server, Kafka y Nexus. La
promoción requiere una firma institucional externa, revisión antimalware y
prueba funcional bajo una cuenta Windows desechable.

## Verificación

La certificación deberá comprobar la GUI por análisis y pruebas puras, el
subsistema PE `WINDOWS_GUI`, dos builds limpios bit a bit, el SBOM CycloneDX con
relaciones exactas y las huellas SHA-256 disponibles en `Cargo.lock`, el recibo,
el manifiesto, las sumas, la ausencia de rutas e identidad local y el fallo
cerrado de la fuente del bundle. El procedimiento no ejecutará el PE ni
accederá a Windows Credential Manager durante QA estática.
