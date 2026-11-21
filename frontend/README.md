---
title: "Módulo frontend de Unión PDF"
subtitle: "Interfaz Angular 22 gobernada por Atomic UI y DesktopFacadeService"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-10-12"
last_updated: "2026-11-20"
document_type: "guía técnica"
status: "vigente"
version: "1.0.0"
---

# Módulo frontend de Unión PDF

Este directorio contiene la aplicación frontend en **Angular 22 + Signals + `@atomic-ui/core` (`v5.22.0`)** de **Unión PDF (`v1.0.0`)**, incrustada en el binario nativo multiplataforma de Rust + Tauri v1.5 desde `dist/pdf-tool/browser`.

La portada principal del producto, los enlaces de descarga y el flujo integral de compilación residen en el [`README.md` raíz](../README.md).

## Estructura del módulo

| Ruta | Propósito |
|---|---|
| `src/app/app.component.*` | Organizador visual de hojas PDF e imágenes, zoom, rotación, arrastre de miniaturas, atajos de teclado y selector de tema claro/oscuro. |
| `src/app/core/desktop-facade.service.ts` | Frontera única tipada hacia comandos IPC de Tauri bajo `RespuestaSistemaV1<T>` (`obtenerEstadoSistema`, `guardarArchivoPdf`, `abrirArchivoPdf`, `seleccionarArchivosPdf`, `unirArchivosPdf`). |
| `src/app/shared/ui/` | Átomos, moléculas, organismos, superficies y servicios gobernados por procedencia de `-Atomic-UI`. |
| `contracts/generated/typescript/contracts.ts` | Contratos TypeScript en ASCII y español sincronizados con [`../contracts/`](../contracts/README.md). |
| `docs/ATOMIC_GOVERNANCE.md` | Política obligatoria Atomic-first sincronizada desde `-Atomic-UI`. |
| `docs/atomic-provenance.json` | Manifiesto verificable de procedencia y snapshots SHA-256 de componentes y servicios. |

## Compuertas locales

```bash
npm run check:atomic:pin
npm run check:types
npm run check:angular
npm run check:theme
npm run check:css
npm run check:secrets
npm test -- --watch=false
npm run build
```

Para la verificación integral y empaquetado del binario nativo, ejecutar desde la raíz del repositorio [`../scripts/probar-compilacion.ps1`](../scripts/probar-compilacion.ps1).
