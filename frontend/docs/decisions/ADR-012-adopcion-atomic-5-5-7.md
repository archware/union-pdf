---
title: "Adopción controlada de Atomic UI 5.5.7 en la base Tauri"
subtitle: "Propiedad unificada del desplazamiento y procedencia verificable de tablas"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-11"
status: "aceptada"
decision_id: "ADR-012"
change_id: "ATOMIC-20260811-UNIFIED-TABLE-SCROLL"
atomic_version: "5.5.7"
atomic_commit: "296363d38593bc49bec8ba8bd87bc88dfdfba61e"
atomic_source_tree_sha256: "bfa959021cdc60202c700e95d6c5bc0da86928274a13e0c18b7cf1a4a12665d1"
atomic_source_count: 157
content_canonicalization: "git-clean-eol-v1"
---

# Adopción controlada de Atomic UI 5.5.7 en la base Tauri

## Contexto

Atomic UI 5.5.7 establece una sola propiedad de desplazamiento para las tablas
de escritorio y evita que el documento, el contenedor, el cuerpo de la tabla y
las barras decorativas compitan por el mismo gesto. La publicación queda fijada
al commit `296363d38593bc49bec8ba8bd87bc88dfdfba61e`, a 157 fuentes y a la
huella SHA-256
`bfa959021cdc60202c700e95d6c5bc0da86928274a13e0c18b7cf1a4a12665d1`.
El identificador compartido `ATOMIC-20260811-UNIFIED-TABLE-SCROLL` enlaza la
fuente, este registro, el changelog y el manifiesto consumidor.

La línea base 5.5.6 mantenía `TableComponent` y `ScrollOverlayComponent` como
adaptaciones. La auditoría de tres vías demostró que la fuente 5.5.7 incorpora
y amplía las correcciones relevantes: el contenedor interno conserva la
propiedad vertical cuando existe altura acotada, los marcadores de barras
administradas respetan overlays anidados y el cálculo de ambos rieles utiliza
el recorrido visual real. Por tanto, las implementaciones productivas pueden
volver a coincidir con la fuente sin perder funcionalidad local.

## Decisión

La base Tauri adopta las implementaciones canónicas de `TableComponent`,
`TableCellComponent` y `ScrollOverlayComponent`, junto con la plantilla, los
estilos y los tokens de tabla asociados. `TableComponent` incorpora los modos
`overlay` y `native`, desplazamiento unificado, altura acotada, nombre
accesible del viewport, restablecimiento por identidad de datos y política de
envoltura o truncado de celdas. `TableCellComponent` permite liberar de forma
explícita una celda del truncado global.

`ScrollOverlayComponent` conserva un único propietario por eje, ofrece barras
nativas temáticas o rieles Atomic, reinicia ambos ejes cuando cambia
`resetKey`, dirige la rueda hacia el viewport administrado y respeta un
scroller descendiente mientras este pueda consumir el gesto. En el punto de
corte adaptable, la página recupera la propiedad del desplazamiento sin
eliminar semántica de encabezados ni atributos de celdas.

Las implementaciones productivas se clasifican como copias exactas. Las
carpetas `atoms/table` y `organisms/scroll-overlay` permanecen clasificadas
como `adapted` únicamente porque sus especificaciones sustituyen las utilidades
Jasmine de la fuente por equivalentes Vitest. Los escenarios, las aserciones y
el comportamiento comprobado se conservan; el instalador oficial registra las
huellas locales y Atomic de cada especificación.

## Alcance

La decisión modifica exclusivamente el frontend Angular, su documentación y
los artefactos de gobierno. No modifica Rust, comandos Tauri, IPC, contratos de
dominio, procedimientos SQL, Kafka, Nexus ni el indicador 12. Tampoco autoriza
la ejecución de `tauri build`, la generación de ejecutables o la creación de
instaladores.

## Verificación

La adopción requiere la compuerta `check:atomic`, los contratos de escritorio
y base de datos, los controles TypeScript y Angular, la suite Vitest y
`ng build` del frontend. La verificación final debe confirmar que el manifiesto
fija Atomic UI 5.5.7 y que las únicas divergencias de las dos carpetas
sincronizadas corresponden a la adaptación explícita del ejecutor de pruebas.
