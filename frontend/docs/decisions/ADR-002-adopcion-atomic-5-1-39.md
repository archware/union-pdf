---
title: "Adopción controlada de Atomic 5.1.39 en la base Tauri"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-03"
status: "aceptada"
decision_id: "ADR-002"
change_id: "ATOMIC-5.1.39-TAURI-20260803"
atomic_version: "5.1.39"
atomic_commit: "ee329cb43990d18cc24c71b638d752d6db212c1b"
---

# Adopción controlada de Atomic 5.1.39 en la base Tauri

## Contexto

La base Tauri conservaba su procedencia en la revisión `4c81705` de Atomic.
La revisión `5.1.39` incorpora mejoras de accesibilidad, interacción y pruebas
en componentes compartidos, sin modificar los comandos Rust, la sesión
administrativa, el gestor seguro de credenciales ni la conexión con SQL Server.

## Decisión

Se adopta como fuente canónica el commit
`ee329cb43990d18cc24c71b638d752d6db212c1b`. El componente `accordion` se
actualiza como copia exacta junto con su prueba. Las mejoras compatibles de
`file-input`, `card`, `toast`, `metrics-grid` y `scroll-overlay` se integran
conservando sus contratos locales y se registran como adaptaciones verificables.

Los componentes sin uso real no se incorporan por lote. La base Tauri conserva
su propio aislamiento de credenciales y no comparte sesiones administrativas
con Python, Wails ni el tablero de resultados.

## Consecuencias

El manifiesto renueva las instantáneas SHA-256 y la compuerta bloquea cualquier
divergencia posterior no documentada. La versión de Atomic no sustituye la
versión propia del aplicativo. La adopción debe aprobar las pruebas Angular,
los controles Rust y el build de escritorio sin paquete instalable.
