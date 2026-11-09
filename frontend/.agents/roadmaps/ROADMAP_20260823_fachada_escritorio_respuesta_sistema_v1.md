---
title: "Roadmap de fachada de escritorio y RespuestaSistemaV1"
subtitle: "Migración incremental del puente Tauri y Angular al contrato de escritorio 0.4.2"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-23"
status: "Completado"
version: "1.0.0"
---

# Roadmap de fachada de escritorio y RespuestaSistemaV1

## Propósito

El lote consolida el acceso al sistema operativo y al canal IPC de Tauri detrás de un único `DesktopFacadeService`. La interfaz Angular dejará de conocer la función `invoke` y consumirá métodos explícitos en español. El backend expondrá comandos canónicos en español que devolverán `RespuestaSistemaV1<T>` con propiedades JSON en `camelCase`; los comandos anteriores permanecerán registrados únicamente como alias de transición para no interrumpir instalaciones existentes.

## Línea base comprobada

- [x] Se verificó que el árbol Git se encontraba limpio antes del lote.
- [x] Se leyeron `AGENTS.md`, `.agents/AGENTS.md`, `docs/ATOMIC_GOVERNANCE.md` y `docs/atomic-provenance.json`.
- [x] Se comprobó que el consumidor utilizaba `@hra/desktop-contracts` 0.3.1 y `ResultEnvelopeV1`.
- [x] Se localizaron invocaciones directas en `dashboard.component.ts` y `paciente.service.ts`.
- [x] Se confirmó que el lote no requiere crear ni modificar componentes visuales gobernados por Atomic UI.

## Alcance de implementación

- [x] Instalar de forma canónica `@hra/desktop-contracts` 0.4.2 para el consumidor Tauri.
- [x] Adoptar `RespuestaSistemaV1<T>` en el adaptador Rust y en la capa de contratos TypeScript.
- [x] Incorporar comandos Tauri canónicos en español con parámetros serializados en `camelCase`.
- [x] Mantener los comandos heredados como alias explícitos y comprobables.
- [x] Crear `DesktopFacadeService` como único punto de acceso IPC de la aplicación Angular a `@tauri-apps/api/core`.
- [x] Migrar `DashboardComponent` y `PacienteService` para consumir la fachada inyectable.
- [x] Añadir pruebas unitarias de comandos, parámetros, envoltorio, traducción de errores y compatibilidad.
- [x] Actualizar la evidencia de adopción en tiempo de ejecución y verificar sus huellas.

## Compuertas de cierre

- [x] Ejecutar la validación del paquete compartido con `npm run check:contracts`.
- [x] Ejecutar la compuerta Atomic con `npm run check:atomic`.
- [x] Ejecutar las pruebas Angular relacionadas y el conjunto completo permitido.
- [x] Ejecutar `npm run check:types`, `npm run check:angular` y `npm run build`.
- [x] Ejecutar `cargo fmt --check`, `cargo check --locked`, `cargo clippy --locked --all-targets -- -D warnings` y `cargo test --locked`.
- [x] Verificar formato de diferencias con `git diff --check` y ausencia de acceso IPC directo fuera de la fachada.
- [x] Actualizar `CHANGELOG.md` y `LESSONS_LEARNED.md` con el resultado comprobado.
- [x] Marcar todas las tareas como completadas y conservar este roadmap como evidencia histórica.

## Evidencia de cierre

- `@hra/desktop-contracts` quedó activo en la versión 0.4.2 con SHA-256 de bundle `0073842768ffcd8cfbb33659ad5156aea93d42394a74077a1712feeae49897e1` y cuatro modelos respaldados por evidencia de ejecución.
- `npm run check:contracts`, `npm run check:types`, `npm run check:angular`, `npm run check:secrets`, `npm run build` y `npm run test:admin-recovery` terminaron correctamente. El build conserva dos advertencias de presupuesto CSS preexistentes en superficies gobernadas por Atomic UI.
- El conjunto Angular terminó con 32 archivos y 270 pruebas correctas. Rust terminó con 60 pruebas correctas; `cargo fmt --all -- --check`, `cargo check --locked` y `cargo clippy --locked --all-targets -- -D warnings` finalizaron sin errores.
- La verificación Rust se ejecutó con empaquetado y recursos Tauri desactivados mediante configuración temporal. No se generó ningún instalador ni se inició un binario gráfico. El enlazador emitió las advertencias `LNK4099` preexistentes de OpenSSL por archivos PDB ausentes, sin afectar el resultado.
- La compuerta Atomic se ejecutó contra una copia Git limpia fijada a `67297145e2cb4bfe9ab349c471da5c3719fd1207`, referencia inmutable declarada por el consumidor. La política 1.2.2 validó 65 componentes y 5 servicios sin violaciones. El sibling disponible se encontraba adelantado en `00f440bfdfb7fcf660d08d6a55efffc080cc8e57`; no se alteraron su contenido ni la procedencia del consumidor.
- La política local impidió eliminar automáticamente la copia temporal Atomic aun después de comprobar su confinamiento. La copia permanece fuera del repositorio consumidor y no forma parte del cambio.
- `git diff --check` no detectó errores de espacios; únicamente informó la conversión futura de LF a CRLF definida por el entorno. La búsqueda estática confirmó que no existe ningún import de `@tauri-apps/api/core` ni llamada a `invoke` fuera de `DesktopFacadeService` en código productivo.

## Restricciones operativas

No se ejecutarán conexiones de base de datos, despliegues, instaladores, binarios gráficos, confirmaciones Git ni publicaciones remotas. Los cambios se limitarán a este repositorio y conservarán el comportamiento de seguridad cerrado documentado por la aplicación.
