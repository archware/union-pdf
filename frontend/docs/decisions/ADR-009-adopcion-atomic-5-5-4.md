---
title: "Adopción controlada de Atomic UI 5.5.4 en la base Tauri"
subtitle: "Control de visibilidad de contraseñas accesible y verificable en WebView2"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-10"
status: "aceptada"
decision_id: "ADR-009"
change_id: "ATOMIC-20260810-554-TAURI"
upstream_change_id: "ATOMIC-20260810-554-FLOATING-PASSWORD-A11Y"
atomic_version: "5.5.4"
atomic_commit: "f21b59efb59955897127eb9341fb8040beba041c"
atomic_source_tree_sha256: "e1241929d3fa93c097566ff897d86c95c4edf4350a76de208622a76bacbe328c"
---

# Adopción controlada de Atomic UI 5.5.4 en la base Tauri

## Contexto

La base Tauri conservaba la implementación de `FloatingInputComponent`
procedente de Atomic UI 5.5.3. El control de visibilidad de una contraseña se
representaba mediante un elemento `button`, pero se excluía del recorrido de
teclado con `tabindex="-1"`. El control tampoco publicaba un nombre accesible,
el estado de visibilidad, la asociación con el campo ni la deshabilitación
coordinada con el `input`. El glifo de Font Awesome permanecía expuesto al
árbol de accesibilidad y WebView2 podía incorporar sus controles nativos de
revelado y limpieza junto al control Atomic.

Atomic UI 5.5.4 publica la corrección identificada en el origen como
`ATOMIC-20260810-554-FLOATING-PASSWORD-A11Y`. La versión sustituye el control
excluido del teclado por un botón nativo enfocable, conserva el foco después de
alternar la visibilidad y presenta un anillo de foco mediante el token
`--shadow-focus-primary`. El botón alterna su nombre entre `Mostrar contraseña`
y `Ocultar contraseña`, expone `aria-pressed`, referencia el identificador del
campo mediante `aria-controls`, hereda su estado deshabilitado y marca el icono
como decorativo. La supresión scoped de `::-ms-reveal` y `::-ms-clear` evita
que WebView2 presente acciones duplicadas aunque la hoja global de formularios
no se encuentre disponible.

## Decisión

Se adopta el commit `f21b59efb59955897127eb9341fb8040beba041c`, versión
`5.5.4`, con la identidad de fuentes publicada en el manifiesto canónico
`e1241929d3fa93c097566ff897d86c95c4edf4350a76de208622a76bacbe328c`.
El consumidor registra la adopción mediante el identificador exclusivo
`ATOMIC-20260810-554-TAURI`.

La implementación TypeScript de `floating-input` se copia sin modificaciones
desde la fuente Atomic. La especificación canónica se porta a Vitest sin
reducir escenarios: las expectativas `toBeTrue()` y `toBeFalse()` de Jasmine
se expresan como `toBe(true)` y `toBe(false)`, y los dobles creados con
`jasmine.createSpy()` se sustituyen por `vi.fn()`. Esta diferencia pertenece
exclusivamente al ejecutor de pruebas; por ello, el directorio permanece
clasificado como adaptado y debe registrar una instantánea verificable de la
implementación exacta y de la prueba portada.

La procedencia, las clasificaciones y todas las huellas de componentes y
servicios se regeneran mediante `governance:install`. El instalador recibe este
ADR como `adaptation-decision` y el identificador Tauri como `change-id`; no se
incorporan hashes calculados manualmente al manifiesto del consumidor.

La adopción preserva la optimización del tablero gerencial. Los imports directos
de componentes Atomic, los bloques `@defer`, los estados `@placeholder` y
`@error`, y las pruebas de transición hacia `ChartComponent` permanecen
intactos. Chart.js y ng2-charts deben continuar fuera del chunk inicial y el
presupuesto de compilación debe permanecer sin advertencias.

## Consecuencias

Los campos de contraseña administrativa y de SQL Server permitirán acceder al
control de visibilidad mediante teclado, anunciarán una acción y un estado
coherentes y evitarán controles duplicados en WebView2. La deshabilitación del
formulario durante acciones asíncronas también deshabilitará el botón de
visibilidad, sin alterar los contratos de conexión, cierre del modal, foco de
errores ni notificación posterior al cierre.

La compuerta `check:atomic` deberá fijar la versión 5.5.4, el commit canónico,
la huella del árbol y la adaptación honesta de Vitest. Los contratos de
escritorio y base de datos, la suite Angular, `tsc`, `ngc`, la compilación con
estadísticas y `git diff --check` deberán finalizar sin errores. La operación
no modifica Rust, la configuración Tauri, la seguridad del backend, los
contratos de entrega ni los instaladores existentes.
