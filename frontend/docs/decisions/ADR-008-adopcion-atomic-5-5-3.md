---
title: "Adopción controlada de Atomic UI 5.5.3 en la base Tauri"
subtitle: "Acciones asíncronas accesibles y confirmación posterior al cierre del modal"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-10"
status: "aceptada"
decision_id: "ADR-008"
change_id: "ATOMIC-20260810-553-TAURI"
upstream_change_id: "ATOMIC-20260810-553-ASYNC-ACTIONS"
atomic_version: "5.5.3"
atomic_commit: "90bc6c2cbba07c18fcf6fcab139973b279615851"
atomic_source_tree_sha256: "e1752a598e78aed4033b33683ce2ce970ce021eb0c64a693360d1995480ca4cf"
---

# Adopción controlada de Atomic UI 5.5.3 en la base Tauri

## Contexto

La base Tauri conservaba Atomic UI 5.5.2 y mantenía el modal de configuración
visible durante 250 milisegundos después de activar una conexión. En ese
intervalo, el tablero ya mostraba el estado conectado detrás del overlay. La
confirmación se presentaba dentro del modal y el cierre dependía de un
temporizador local que no formaba parte del contrato del componente.

Atomic UI 5.5.3 publica el contrato de acciones asíncronas identificado en el
origen como `ATOMIC-20260810-553-ASYNC-ACTIONS`. El componente `button`
incorpora el estado `loading`; el componente `modal` incorpora el estado
`busy` y el método `focusError()`; el componente `toast` mantiene las
notificaciones en la capa superior del navegador. El método `focusError()`
intenta enfocar inmediatamente el error proyectado y, cuando Angular todavía
no lo ha renderizado, programa un único reintento en la fase de escritura de
`afterNextRender`. El reintento se cancela durante la destrucción del modal.

## Decisión

Se adopta el commit `90bc6c2cbba07c18fcf6fcab139973b279615851`, versión
`5.5.3`, con la huella de árbol fuente
`e1752a598e78aed4033b33683ce2ce970ce021eb0c64a693360d1995480ca4cf`.
El consumidor registra la adopción mediante
`ATOMIC-20260810-553-TAURI`. Las implementaciones TypeScript de `button`,
`modal` y `toast` se copian de forma exacta desde el repositorio canónico.

El flujo «Guardar y conectar» bloquea activaciones duplicadas mediante
`app-button[loading]` y bloquea el cierre por botón, Escape y backdrop mediante
`app-modal[busy]`. Después de que `connect_db_v1` confirma el perfil activo,
el modal se desmonta, la sesión administrativa se limpia, el foco regresa al
elemento que abrió el diálogo y sólo entonces se publica una notificación
global de éxito. El temporizador de cierre se elimina por completo.

La prueba de conexión conserva el modal abierto y presenta un estado de éxito
en línea sin publicar un toast. Una falla conserva el modal, presenta un
elemento `role="alert"` enfocable e invoca directamente `focusError()`. La
cancelación en estado inactivo limpia la sesión y restaura el foco al invocador
real. El shell monta una única instancia de `app-toast` fuera del árbol del
modal.

Las especificaciones canónicas se portan a Vitest. Las expectativas booleanas
de Jasmine se expresan mediante `toBe(true)` y `toBe(false)`, y los dobles se
implementan con `vi`. Esta diferencia del ejecutor mantiene los directorios de
prueba clasificados como adaptados, con instantáneas SHA-256 renovadas por el
instalador oficial. Las pruebas de integración renderizan el shell real y
verifican el error proyectado, el foco efectivo, la restauración al CTA y la
existencia de un único host global de toast.

## Consecuencias

El gate `check:atomic` fijará la versión, el commit, la huella fuente, las
implementaciones exactas y cada adaptación de prueba. Las pruebas de Angular,
el typecheck, la compilación, los contratos de escritorio y
`git diff --check` deberán finalizar sin errores. Esta decisión no modifica
Rust, la configuración de seguridad, los contratos de entrega ni el indicador
12.
