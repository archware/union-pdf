---
title: "Adopción controlada de Atomic 5.5.1 en la base Tauri"
subtitle: "Renovación verificable de la procedencia visual y de sus adaptaciones"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-10"
status: "aceptada"
decision_id: "ADR-006"
change_id: "ATOMIC-20260810-551-TAURI"
atomic_version: "5.5.1"
atomic_commit: "add3021e71f3429e1df2ba636a966d76a2ac9a9a"
atomic_source_tree_sha256: "14311483c1f5eb4c159facae5565d7c98b94f5b5978fe145c0640ed3a43a3f4d"
---

# Adopción controlada de Atomic 5.5.1 en la base Tauri

## Contexto

La base Tauri utiliza 63 componentes derivados de Atomic y conserva contratos
propios de escritorio, integración Rust y decisiones visuales específicas. La
auditoría contra Atomic 5.5.1 clasifica 17 componentes como copias exactas, 46
como adaptaciones y un servicio gobernado como adaptación. La fuente revisada
incluye la corrección del entorno efectivo del pie, pruebas de regresión para
los componentes visuales modificados y un manifiesto SHA-256 formal asociado a
la versión 5.5.1.

Las adaptaciones existentes no pueden reemplazarse mediante una copia masiva,
porque contienen integración local y diferencias deliberadas del consumidor.
El pie sí coincide byte a byte con Atomic 5.5.1 y se declara como copia exacta;
las demás divergencias se mantienen como instantáneas verificables.

## Decisión

Se adopta el commit `add3021e71f3429e1df2ba636a966d76a2ac9a9a`, versión
`5.5.1`, y la huella de fuentes
`14311483c1f5eb4c159facae5565d7c98b94f5b5978fe145c0640ed3a43a3f4d`.
El instalador canónico regenerará el manifiesto, los artefactos de gobierno y
los hashes de cada adaptación sin copiar componentes no utilizados. La
autenticación administrativa, las credenciales SQL y el almacén seguro de Rust
permanecerán fuera del alcance de esta adopción visual.

La integración continua deberá resolver exactamente el commit declarado desde
el remoto de Atomic. Si la referencia no está disponible o cualquiera de los
hashes cambia, la compuerta deberá fallar de forma cerrada.

## Consecuencias

La versión, el commit, la huella del árbol y las instantáneas pasan a formar un
único contrato de procedencia. Toda deriva posterior exigirá una nueva decisión
y la regeneración explícita del manifiesto. Esta adopción no autoriza MSI,
NSIS, firma institucional, instalación ni promoción a producción.
