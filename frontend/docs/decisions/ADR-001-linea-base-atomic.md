---
title: "Línea base de adaptaciones Atomic para Tauri"
subtitle: "Registro de procedencia del frontend Rust y WebView2"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-03"
status: "aceptada"
version: "1.6.1"
---

# Línea base de adaptaciones Atomic para Tauri

## Contexto

El frontend Tauri contiene ajustes previos para IPC, WebView2, configuración SQL,
tema oscuro y presentación del indicador 11. Estas diferencias deben conservarse
hasta que cada migración pueda validarse contra el backend Rust y los contratos
funcionales del tablero.

## Decisión

Se registra la implementación actual como línea base adaptada. El gobierno Atomic
almacenará hashes de los archivos locales y de su fuente correspondiente. Una
modificación posterior requerirá un nuevo registro de decisión y la actualización
del snapshot mediante el instalador institucional.

## Consecuencias

La decisión permite activar procedencia y detección de deriva sin sobrescribir
ajustes funcionales. La convergencia visual continuará por componentes, con
pruebas Angular, validación WebView2 y compilación Tauri antes de retirar cada
adaptación.
