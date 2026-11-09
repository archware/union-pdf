---
title: "Copia local de contratos compartidos"
document_type: "referencia técnica"
status: "verificable, adopción en tiempo de ejecución activa"
version: "0.3.1"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-03"
last_updated: "2026-08-14"
---

# Copia local de contratos compartidos

El directorio contiene los tipos generados para el consumidor `tauri` y su lock reproducible. El campo `runtime_adoption` se encuentra en `active`: la evidencia productiva y sus pruebas se fijan mediante hashes en el mismo lock.

La integridad se comprueba sin red mediante `node scripts/check-hra-contracts.mjs`. El lock aplica `sha256-git-clean-eol-v1`, por lo que LF y CRLF conservan una identidad común sin ejecutar filtros configurables. La regeneración se realiza únicamente desde `@hra/desktop-contracts@0.3.1` con `scripts/install-consumer.mjs`; no se editan manualmente el lock ni los archivos de `contracts/generated/`.

## Anexo consolidado: contratos compartidos generados

> Procedencia: `docs/CONTRATOS_COMPARTIDOS_GENERADOS.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/CONTRATOS_COMPARTIDOS_GENERADOS.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Contratos compartidos generados"
subtitle: "Trazabilidad de los contratos de escritorio vendorizados"
document_type: "nota técnica"
status: "vendorizado, adopción en tiempo de ejecución activa"
version: "0.3.1"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-03"
last_updated: "2026-08-14"
```


### Contratos compartidos generados

#### Estado de la integración

El repositorio conserva una copia verificable de `@hra/desktop-contracts@0.3.1` para Rust/Tauri y TypeScript. La copia se identifica mediante el SHA-256 de bundle `0c54533d135ed96128aba43be41e620c024d498cae146d2ed0ef3e93487608aa`, tomado de `contracts/hra-desktop-contracts.lock.json`, y se valida sin red ni acceso al repositorio fuente.

Los archivos ubicados en `contracts/generated/` participan en rutas productivas y pruebas registradas en `contracts/runtime-adoption.evidence.json`. El gate verifica la identidad de esa evidencia y de cada archivo adoptante.

#### Verificación local

El gate se ejecuta mediante:

```powershell
node scripts/check-hra-contracts.mjs
```

El archivo `contracts/hra-desktop-contracts.lock.json` fija la versión, el identificador del bundle y el hash individual de cada archivo generado. El gate incorpora una copia canónica de esos hashes para impedir que una modificación coordinada del lock y del archivo pase inadvertida. La validación es autocontenida y no descarga dependencias.

El lock declara la política `sha256-git-clean-eol-v1`. Antes del cálculo SHA-256 se convierten exclusivamente los pares de bytes CRLF a LF; los demás bytes se conservan. Esta normalización permite verificar checkouts gobernados por `.gitattributes` sin ejecutar Git, filtros configurables ni procesos externos.

#### Actualización controlada

Una actualización se realiza exclusivamente mediante el instalador canónico del repositorio de contratos. El cambio debe revisar el lock y ejecutar el gate del consumidor. El estado `active` sólo se genera mediante la activación canónica y evidencia verificable; una instalación posterior vuelve deliberadamente a `pending` hasta que se renueve esa evidencia.

</details>
