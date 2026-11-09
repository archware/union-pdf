---
title: "Manual de usuario de Base Tauri"
subtitle: "Inicio, conexión, tablero, grillas y solicitudes administrativas"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "manual de usuario"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
---

# Manual de usuario de Base Tauri

## Prerrequisitos

Se requiere Windows, una entrega autorizada y acceso de red a la instancia SQL configurada. La persona usuaria no necesita instalar Node.js, Rust ni dependencias de desarrollo. La configuración inicial requiere autorización administrativa.

## Inicio y estados

Al iniciar, la aplicación intenta leer `HRA_Indicadores_Tauri/DB_Config_V1`. Si no existe, puede adoptar una configuración compatible desde `HRA_Indicadores/DB_Config` sin borrar la entrada anterior. El estado visible diferencia:

- conexión no configurada;
- acceso al almacén seguro no disponible;
- credencial SQL rechazada;
- red o servidor no disponible;
- timeout de conexión;
- certificado no confiable;
- protocolo TLS no compatible;
- contrato SQL o dato inválido.

Una dirección o contraseña no está fijada en Angular. La conexión se resuelve desde el perfil almacenado o desde la pantalla administrativa.

## Recorrido funcional

1. Se inicia el ejecutable y se espera el estado de conexión.
2. Se seleccionan mes y año dentro de los límites de la interfaz.
3. El tablero consulta `get_dashboard_stats_id11` y presenta totales, métodos, insumos y condición de dosis.
4. La grilla nominal consulta `get_pacientes` con página, búsqueda, filtros y orden permitido.
5. La vista de descartados consulta `get_descartados` y muestra el motivo de exclusión.
6. El universo SIS 240 se consulta mediante `get_universo_evaluado_sis240_id11` cuando corresponde.

El cambio de filtro cancela o sustituye la solicitud visual anterior. La interfaz no calcula totales clínicos; renderiza los resultados proporcionados por SQL y mapeados por Rust.

## Configuración administrativa

La configuración exige autenticación. Después de obtener una sesión, la pantalla consulta el perfil no secreto, permite probar una conexión candidata y sólo guarda después de una prueba satisfactoria. Una contraseña nunca se muestra nuevamente. La sesión dura cinco minutos y permanece vinculada al proceso.

## Privacidad y tratamiento de datos

La grilla nominal y la vista de descartados muestran datos personales: DNI,
nombre, sexo, edad, teléfono, método, fechas y personal obstetra. El acceso se
limita al uso asistencial u operativo autorizado para el periodo seleccionado.
La aplicación no incorpora una función canónica de exportación; por ello una
captura de pantalla, copia manual o grabación de la ventana constituye una
extracción externa y debe seguir el procedimiento institucional de protección
de datos.

Durante el uso se aplican estas reglas:

1. Se verifica que no haya personas no autorizadas ni una sesión de pantalla
   compartida antes de abrir una grilla nominal.
2. Se utiliza búsqueda por DNI sólo para el caso autorizado y se limpia el
   filtro al terminar. No se copia el criterio a tickets, chats o registros.
3. No se fotografían ni imprimen filas desde herramientas del sistema. Cuando
   se requiere evidencia, se registran código de error, periodo, versión y hora,
   sin nombres, DNI, teléfonos, métodos ni credenciales.
4. Se cierra la ventana al abandonar el puesto. La sesión administrativa se
   revoca al cerrar el diálogo o al finalizar la tarea; su expiración automática
   no sustituye el cierre manual.
5. La contraseña SQL y el hash Argon2id permanecen en el almacén seguro o en el
   entorno administrado. No se pegan en formularios de soporte ni se guardan en
   archivos de texto.

Los logs rotativos registran categorías y etapas, no búsquedas, DNI, tokens,
contraseñas ni cadenas de conexión. Si una evidencia accidental contiene datos
personales, se detiene su distribución y se comunica el incidente por el canal
institucional de seguridad.

## Recuperación de contraseña

La aplicación principal no restablece una credencial local perdida. Se debe cerrar y utilizar el recuperador separado. La ejecución sin argumentos abre la interfaz Win32; `--reset` constituye la contingencia CLI. El [manual del recuperador](MANUAL_DE_ADMINISTRACION.md) define los bloqueos de entorno y mutex.

## Errores

Ante un error se conserva el código o la categoría visible, sin copiar información clínica ni credenciales. La [guía de solución de problemas](MANUAL_DE_OPERACION.md) indica las comprobaciones permitidas y el [manual de operación](MANUAL_DE_OPERACION.md) define la evidencia.
