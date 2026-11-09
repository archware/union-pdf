---
title: "Adopción controlada de Atomic 5.3.0 en la base Tauri"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-03"
status: "aceptada"
decision_id: "ADR-003"
change_id: "ATOMIC-20260803-530-TAURI"
atomic_version: "5.3.0"
atomic_commit: "de026c0047d0070a9ee1f5f6e74e0c79dfdf313e"
atomic_source_tree_sha256: "9e50ba997303dbf1cd5c11b505cad2bc18e383b0dc2326d92bd3d4442ccc423d"
---

# Adopción controlada de Atomic 5.3.0 en la base Tauri

## Contexto

La base Tauri utiliza 63 componentes de Atomic y conserva contratos propios de
escritorio, pruebas locales e integración con Rust. La auditoría contra Atomic
5.3.0 clasifica 16 componentes como copias exactas y 47 como adaptaciones que
no deben sustituirse sin una migración funcional específica.

## Decisión

Se adopta como fuente canónica el commit
`de026c0047d0070a9ee1f5f6e74e0c79dfdf313e`, versión `5.3.0`, con la huella
SHA-256 declarada en los metadatos. Se renueva la procedencia de los 63
componentes presentes y se conservan las adaptaciones mediante instantáneas
verificables de consumidor y fuente.

Los componentes no utilizados no se copian. La autenticación administrativa,
las credenciales SQL y el almacén seguro continúan aislados en el backend
Tauri; no se comparte estado de seguridad con Python o Wails.

## Consecuencias

El gate bloquea una referencia, versión, huella o adaptación divergente. La
adopción no equivale a una autorización de producción. El frontend, Rust, MSI,
NSIS, firma institucional e instalación limpia mantienen sus propias
compuertas antes de la promoción.
