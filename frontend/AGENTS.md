---
title: "Reglas para agentes de la base Tauri y Angular"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-23"
last_updated: "2026-08-23"
document_type: "instrucción para agentes"
status: "vigente"
version: "1.0.0"
canonical_doctrine: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\DOCTRINA_MAESTRA_UNIFICADA.md"
document_standard: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\ESTANDAR_DOCUMENTAL_AGENTES.md"
---

# Contrato obligatorio para agentes

> `ATOMIC_GOVERNANCE_REQUIRED`

Antes de modificar interfaz, leer `docs/ATOMIC_GOVERNANCE.md` y
`docs/atomic-provenance.json`.

`-Atomic-UI` es la única fuente de verdad visual. No crear en esta aplicación
átomos, moléculas, organismos, superficies, plantillas, controles, diálogos,
tablas, tokens o patrones visuales reutilizables. Si falta un objeto, crearlo y
validarlo primero en Atomic; después propagarlo y registrar su procedencia.

Toda página o feature nueva debe componerse con el ADN existente. La lógica de
negocio permanece en esta aplicación. Antes de entregar cambios se debe ejecutar
`npm run check:atomic`; está prohibido omitir, debilitar o eludir esa compuerta.

## Orden obligatorio de lectura

Antes de auditar o modificar el repositorio, el agente deberá leer la doctrina
maestra en `C:\Users\cotaha\source\repos\.agent\doctrinas\DOCTRINA_MAESTRA_UNIFICADA.md`, el
estándar en
`C:\Users\cotaha\source\repos\.agent\doctrinas\ESTANDAR_DOCUMENTAL_AGENTES.md`, este archivo,
`.agents/AGENTS.md`, `docs/CONTINUIDAD_AGENTES.md`, el gobierno Atomic y los
roadmaps aplicables. Las reglas locales pueden reforzar esa jerarquía, pero no
debilitarla.

## Frontera de escritorio

`DesktopFacadeService` será el único acceso productivo de Angular a Tauri. Los
comandos Rust nuevos se expresarán en español y devolverán
`RespuestaSistemaV1<T>` con JSON `camelCase`; los comandos heredados solo se
mantendrán como alias N-1 documentados y probados. Ningún componente importará
`invoke` ni accederá directamente al sistema operativo.

## Ciclo y compuertas

Cada cambio registrará rama, OID y estado Git, abrirá primero un roadmap en
`.agents/roadmaps/`, actualizará `CHANGELOG.md`, `LESSONS_LEARNED.md` y los
manuales afectados, y cerrará el roadmap con evidencia y reversión. Se
ejecutarán `npm run check`, las compuertas `cargo fmt`, `cargo check`,
`cargo clippy` y `cargo test` declaradas en `docs/CONTINUIDAD_AGENTES.md`,
además de `git diff --check`. Se preservarán cambios locales ajenos al lote.

No se autorizan por defecto escrituras en bases reales, despliegues, commits,
push, merge, rebase ni retiro de contratos publicados.
