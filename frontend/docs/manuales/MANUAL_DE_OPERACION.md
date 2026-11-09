---
title: "Manual de operación de Base Tauri"
subtitle: "Controles de apertura, consulta mensual, evidencia y cierre"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "manual operativo"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
---

# Manual de operación de Base Tauri

## Apertura

La operación verifica nombre del producto, versión 1.6.1, firma y origen del paquete. Se confirma que no exista una instancia concurrente del recuperador y que el estado de conexión se encuentre disponible. No se modifica WinVault ni se ejecutan scripts SQL como parte de la apertura ordinaria.

## Ciclo de consulta

1. Se registra el periodo solicitado y la fuente institucional que lo autoriza.
2. Se consulta el tablero y se comprueba que `I_MES` e `I_ANIO` correspondan al periodo resuelto.
3. Se revisan los totales generales y los métodos sin recalcularlos en una hoja local.
4. Se abre la grilla nominal y se aplican paginación, búsqueda y filtros permitidos.
5. Se revisan descartados y universo evaluado cuando forman parte del control.
6. Se registra el resultado operativo sin copiar DNI, nombres ni filtros de búsqueda.

Las consultas poseen timeout de 45 segundos. Un timeout no autoriza reintentos ilimitados ni cambio automático a `legacy_tls`.

## Registros

Tauri escribe registros rotativos bajo el directorio de logs de la aplicación obtenido mediante `app_log_dir()`. La auditoría de seguridad utiliza `security-audit.log`. No se escribe `tauri_debug.log` junto al ejecutable. Los registros omiten búsquedas, documentos, contraseñas, tokens y cadenas de conexión.

## Cierre

Se cierra cualquier diálogo administrativo para revocar la sesión. Después se cierra la aplicación y se confirma que no exista una operación pendiente. No se eliminan logs, configuración ni credenciales como parte del cierre.

## Escalamiento

Se registran versión, fecha, etapa, categoría, modo TLS y resultado. El caso se remite a la [guía de solución de problemas](MANUAL_DE_OPERACION.md). La pérdida de disponibilidad sigue el [plan de continuidad](MANUAL_DE_ADMINISTRACION.md).

## Anexo consolidado: guia de solucion de problemas

> Procedencia: `docs/manuales/GUIA_DE_SOLUCION_DE_PROBLEMAS.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/manuales/GUIA_DE_SOLUCION_DE_PROBLEMAS.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Guía de solución de problemas de Base Tauri"
subtitle: "Diagnóstico seguro de administración, TLS, SQL, IPC y entrega"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "guía operativa"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
```


### Guía de solución de problemas de Base Tauri

#### Diagnóstico

Se registra versión, etapa, categoría, modo TLS y acción previa. No se copian tokens, contraseñas, cadenas, búsquedas ni filas clínicas. Dos intentos idénticos sin cambio de condición obligan a detener el reintento.

| Síntoma | Comprobación | Acción permitida |
|---|---|---|
| Aplicación no inicia | Firma, WebView2, versión y logs de aplicación | Restaurar paquete completo aprobado |
| Configuración ausente | Estado del perfil dedicado y compatibilidad heredada | Autenticar y registrar mediante interfaz |
| Almacén seguro no disponible | Acceso de la cuenta Windows y timeout de dos segundos | Escalar al soporte del sistema operativo |
| Credencial SQL rechazada | Servidor, base y usuario no secretos | Registrar nuevamente la contraseña |
| Timeout de conexión | Red, puerto y disponibilidad | Escalar; no repetir indefinidamente |
| Certificado rechazado | Cadena, nombre, fecha y `HRA_SQL_CA_CERT` | Corregir confianza; no usar modo heredado automáticamente |
| Protocolo TLS no compatible | Política del servidor | Modernizar TLS o autorizar temporalmente `legacy_tls` para IP privada |
| `legacy_tls` rechazado | Confirmar IP privada/loopback y ausencia de otras excepciones | Corregir la configuración o retirar la excepción |
| Contrato SQL no coincide | Columnas, tipos, nulabilidad y versión del procedimiento | Detener la consulta y coordinar despliegue SQL |
| Sesión expirada | Hora de emisión y expiración pública | Autenticar nuevamente |
| Recuperador informa aplicación activa | Proceso principal y sesiones RDP | Cerrar la aplicación; no forzar el mutex |
| Verificación de paquete falla | Identidad, recibo, huella y transformación Authenticode | Rechazar el artefacto |

#### Comprobaciones de desarrollo

```powershell
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
npm run release:verify
```

Estas órdenes se ejecutan en el repositorio, no dentro de una instalación productiva. La prueba SQL real requiere una instancia autorizada.

#### Escalamiento

Los casos de posible exposición, firma inválida, corrupción de contrato, fallo de WinVault o necesidad de modificar SQL se escalan con evidencia mínima. El [plan de continuidad](MANUAL_DE_ADMINISTRACION.md) rige la recuperación y la [guía de seguridad](MANUAL_DE_ADMINISTRACION.md) rige el tratamiento de incidentes.

</details>
