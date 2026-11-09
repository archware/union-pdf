---
title: "Adopción controlada de Atomic UI 5.5.2 en la base Tauri"
subtitle: "Sincronización canónica de componentes y adaptación verificable de pruebas Vitest"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-10"
status: "aceptada"
decision_id: "ADR-007"
change_id: "ATOMIC-20260810-552-TAURI"
atomic_version: "5.5.2"
atomic_commit: "fb6fb4b239d72e19d996a227f7569d0c0d6caf22"
atomic_source_tree_sha256: "59d53f85b43a27817d094062a0568c58ba6fc8e8baf6ecd3c7e85900420536f0"
---

# Adopción controlada de Atomic UI 5.5.2 en la base Tauri

## Contexto

La base Tauri mantenía procedencia formal de Atomic UI 5.5.1 y conservaba
adaptaciones verificadas mediante instantáneas SHA-256. La publicación 5.5.2
incorpora al origen canónico mejoras de accesibilidad y comportamiento que
afectan a `button`, `form-error`, `card`, `combobox`, `modal`, `select2` y
`footer`. La comparación previa determinó que las implementaciones TypeScript
locales podían reemplazarse por la fuente 5.5.2 sin conservar lógica exclusiva
de la integración Tauri.

Las pruebas de Atomic UI se ejecutan con Jasmine, mientras que el frontend
Tauri usa Vitest. Además, `AppVersionService` expone localmente la señal
`versionInfo` y no el método `setVersionInfo` del proyecto canónico. Una copia
literal de las especificaciones produciría fallos del ejecutor y declararía una
procedencia que no representaría el código realmente validado.

## Decisión

Se adopta como fuente canónica el commit
`fb6fb4b239d72e19d996a227f7569d0c0d6caf22`, versión `5.5.2`, con la huella de
árbol `59d53f85b43a27817d094062a0568c58ba6fc8e8baf6ecd3c7e85900420536f0`.
Los archivos `*.component.ts` de los siete directorios indicados se mantienen
idénticos a Atomic UI. Las especificaciones preservan los mismos escenarios
funcionales, pero se adaptan de manera explícita al contrato Vitest mediante
`vi`, expectativas booleanas compatibles y declaraciones locales de las
funciones de prueba.

Las expectativas de estilo aceptan las representaciones equivalentes que
entrega jsdom para `width` y `min-width`. La prueba de `select2` instala un
doble local de `scrollIntoView`, API ausente en jsdom, sin modificar la
implementación productiva. La prueba del pie actualiza la señal
`versionInfo` del servicio Tauri para comprobar la precedencia del entorno.
Estas diferencias permanecen clasificadas como adaptaciones y se registran en
la instantánea generada por el instalador oficial con el identificador de
cambio `ATOMIC-20260810-552-TAURI`.

Las adaptaciones de componentes no incluidas en esta sincronización conservan
la decisión previa y reciben nuevas huellas contra la fuente 5.5.2. No se
autoriza ningún cambio en Rust, comandos Tauri, seguridad, contratos de
entrega, indicadores ni documentación ajena a esta decisión.

## Consecuencias

El gate `check:atomic` verificará la versión, el commit, la huella del árbol,
los archivos exactos y cada instantánea adaptada. Las pruebas canónicas
portadas, el typecheck, la compilación del frontend, los contratos de
escritorio y `git diff --check` deberán completarse antes de considerar válida
la sincronización. Una modificación posterior de cualquiera de estas huellas
exigirá una nueva decisión y otra ejecución formal del instalador.
