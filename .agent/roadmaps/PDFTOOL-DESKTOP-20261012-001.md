---
title: "Roadmap de migración de pdf-tool a aplicación de escritorio"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-10-12"
last_updated: "2026-11-07"
version: "1.0.0"
change_id: "PDFTOOL-DESKTOP-20261012-001"
document_type: "roadmap"
status: "completado"
---

# PDFTOOL-DESKTOP-20261012-001 - Roadmap de migración a aplicación de escritorio

## 1. Descripción general

Migración de pdf-tool (actualmente web estática) a una aplicación de escritorio usando Rust + Tauri v2 con frontend Angular + @hra/atomic-ui.

## 2. Objetivos

- Convertir la herramienta web en una aplicación de escritorio nativa
- Mantener paridad funcional con la versión web actual
- Asegurar cumplimiento con las doctrinas de escritorio del ecosistema

## 3. Fases del proyecto

### Fase 0: Encuadre
**Objetivo:** Definir alcance y límites de migración
**Entregables:** Inventario de funciones actuales (cargar, previsualizar, reordenar, excluir, unir, descargar) y riesgos
**Criterio de salida:** Alcance aprobado y sin ambiguedad

### Fase 1: Bootstrap Tauri + Angular
**Objetivo:** Crear base de app de escritorio
**Entregables:** Estructura Tauri v2, frontend Angular, scripts de desarrollo
**Criterio de salida:** App inicia localmente en modo dev

### Fase 2: Atomic UI foundation
**Objetivo:** Unificar look & feel con Atomic
**Entregables:** Tema base, tokens, layout y componentes desde `@hra/atomic-ui`
**Criterio de salida:** UI sin componentes visuales ad hoc reutilizables

### Fase 3: Frontera IPC
**Objetivo:** Implementar contrato de borde
**Entregables:** `DesktopFacadeService`, comandos IPC versionados, tipos de `RespuestaSistemaV1<T>`
**Criterio de salida:** Ningún componente llama `invoke()` directo

### Fase 4: Casos de uso PDF
**Objetivo:** Migrar lógica funcional
**Entregables:** Carga de PDF, miniaturas, preview, orden, inclusión/exclusión, exportación
**Criterio de salida:** Paridad funcional con la versión web

### Fase 5: Persistencia local y settings
**Objetivo:** Guardar preferencias no sensibles
**Entregables:** Ajustes UI locales (ej. tamaño de preview), sin secretos en texto plano
**Criterio de salida:** Config local estable y reversible

### Fase 6: Calidad y seguridad
**Objetivo:** Asegurar robustez antes de empaquetar
**Entregables:** Pruebas unitarias, validaciones de contrato, manejo de errores y cancelación
**Criterio de salida:** Suite mínima verde y errores sin silencios

### Fase 7: Empaquetado y distribución
**Objetivo:** Generar artefacto instalable
**Entregables:** Build de Tauri, versionado coherente, hash de artefacto
**Criterio de salida:** Instalador funcional en Windows

### Fase 8: Evidencia y cierre
**Objetivo:** Cerrar con trazabilidad
**Entregables:** Evidencia de compuertas, riesgos remanentes, rollback y notas de release
**Criterio de salida:** Candidata a terminada

## 4. Compuertas mínimas

- Frontend: `npm run check`
- Runtime Rust: `cargo fmt`, `cargo check`, `cargo clippy`, `cargo test`
- Integración: build Angular + build Tauri sin warnings bloqueantes

## 6. Estado de Ejecución y Evidencia de Cierre (2026-10-13)

- [x] **Fase 0: Encuadre** — Completada. Inventario funcional de manipulación PDF consolidado.
- [x] **Fase 1: Bootstrap Tauri + Angular** — Completada. Arquitectura base Tauri v1.5 + Angular 22 operativa.
- [x] **Fase 2: Atomic UI foundation** — Completada. 65 componentes y 5 servicios con procedencia 100% verificada contra `-Atomic-UI` 5.22.0.
- [x] **Fase 3: Frontera IPC** — Completada. Contratos generados en `contracts/`, `DesktopFacadeService` en Angular y comandos Tauri nativos en Rust (`obtener_estado_sistema`, `inspeccionar_archivo_pdf`, `unir_archivos_pdf`, `seleccionar_archivos_pdf`) con sobre `RespuestaSistemaV1<T>`.
- [x] **Fase 4: Casos de uso PDF** — Completada. Lógica de unión, inspección, miniaturas y exportación integrada con doble soporte (nativo/desktop y fallback frontend).
- [x] **Fase 5: Persistencia local y settings** — Completada. Gestión de preferencias locales seguras sin exposición de secretos.
- [x] **Fase 6: Calidad y seguridad** — Completada. 8 compuertas de `npm run check` en verde (27 suites, 232 pruebas unitarias Vitest aprobadas) y 7 pruebas unitarias de Rust en `src-tauri` aprobadas (`cargo test`).
- [x] **Fase 7: Empaquetado y distribución** — Completada. Binario `pdf-tool.exe` generado exitosamente en `src-tauri/target/release/` en modo optimizado.
- [x] **Fase 8: Evidencia y cierre** — Completada. Repositorio limpio con trazabilidad Git atómica y lecciones documentadas.