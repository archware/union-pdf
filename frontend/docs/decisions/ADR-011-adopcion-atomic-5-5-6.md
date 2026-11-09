---
title: "Adopción controlada de la procedencia Atomic UI 5.5.6 en la base Tauri"
subtitle: "Canonicalización reproducible de finales de línea sin cambios de interfaz"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-11"
status: "aceptada"
decision_id: "ADR-011"
change_id: "ATOMIC-20260811-556-MANIFEST-EOL-TAURI"
upstream_change_id: "ATOMIC-20260810-MANIFEST-EOL"
atomic_version: "5.5.6"
atomic_commit: "feec4ddb3c2ed0fc26b654827a57b5094a5d447a"
atomic_source_tree_sha256: "faaf94f6d3d7faf5066c96001fcc8846b9e44ccdd776fe6b4d248fde297d5641"
atomic_source_count: 157
content_canonicalization: "git-clean-eol-v1"
---

# Adopción controlada de la procedencia Atomic UI 5.5.6 en la base Tauri

## Contexto

Atomic UI 5.5.6 corrige la identidad del manifiesto de fuentes para que un
checkout con LF y otro con CRLF produzcan la misma huella cuando Git clasifica
la ruta como textual. Los archivos binarios conservan sus bytes exactos y el
gate rechaza cualquier transformación `clean` que no pueda explicarse
exclusivamente por la conversión de CRLF a LF. El cambio canónico de origen se
identifica como `ATOMIC-20260810-MANIFEST-EOL`.

La publicación queda fijada al commit
`feec4ddb3c2ed0fc26b654827a57b5094a5d447a`, a 157 fuentes y a la huella
SHA-256
`faaf94f6d3d7faf5066c96001fcc8846b9e44ccdd776fe6b4d248fde297d5641`.
La huella reemplaza la identidad 5.5.5 porque se calcula con el esquema
`git-clean-eol-v1`; no representa una modificación funcional de los
componentes consumidos.

La comparación entre los commits 5.5.5
`438f379df53bfb5dd0d04d81823fb644aa0696e0` y 5.5.6 demuestra que ningún
archivo productivo de `src/app/shared/ui` cambió. Dentro de esa ruta solo se
actualizó `README.md`. El blob Git de
`molecules/context-menu/context-menu.component.ts` permanece en ambos commits
como `f6a0958a2bb7285226db45fc6ed457e742cf4790`.

## Decisión

La base Tauri adopta únicamente la procedencia reproducible de Atomic UI
5.5.6. El instalador oficial regenera el manifiesto consumidor con el
identificador `ATOMIC-20260811-556-MANIFEST-EOL-TAURI`, la referencia Git, la
versión y la nueva huella canónica del árbol fuente. Se conservan las
clasificaciones `exact` y `adapted` derivadas del árbol local existente, así
como sus registros de adaptación verificables.

No se copia `ContextMenuComponent` ni otro átomo, molécula, organismo,
superficie, plantilla, servicio o token. La interfaz, sus pruebas funcionales y
el comportamiento publicado en 5.5.5 permanecen byte a byte en el consumidor.
La nueva decisión tampoco reinterpreta una adaptación como copia exacta: el
instalador vuelve a auditar las rutas actuales y fija sus huellas reales.

## Alcance

La decisión modifica exclusivamente `docs/atomic-provenance.json`, la
documentación histórica y cualquier artefacto de gobierno que el instalador
oficial determine como canónico. No modifica Rust, comandos Tauri, contratos de
dominio, SQL, Kafka, Nexus ni el indicador 12. Tampoco autoriza `tauri build`,
ejecutables o instaladores.

## Verificación

La adopción requiere `check:atomic`, contratos de escritorio y base de datos,
control TypeScript y Angular, la suite Vitest, la compilación Angular y
`git diff --check`. La revisión final debe confirmar un índice limpio después
del commit local, ausencia de cambios en archivos UI y permanencia de la
referencia `feec4ddb3c2ed0fc26b654827a57b5094a5d447a` junto con la huella
canónica de 157 fuentes.
