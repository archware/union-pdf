---
title: "Reglas para agentes del frontend de Unión PDF"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-23"
last_updated: "2026-11-20"
document_type: "instrucción para agentes"
status: "vigente"
version: "1.0.0"
canonical_doctrine: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\DOCTRINA_MAESTRA_UNIFICADA.md"
document_standard: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\ESTANDAR_DOCUMENTAL_AGENTES.md"
---

# Contrato obligatorio para agentes

> `ATOMIC_GOVERNANCE_REQUIRED`

Antes de modificar interfaz, leer [`docs/ATOMIC_GOVERNANCE.md`](docs/ATOMIC_GOVERNANCE.md) y
[`docs/atomic-provenance.json`](docs/atomic-provenance.json), además de [`../AGENTS.md`](../AGENTS.md)
y [`../docs/CONTINUIDAD_AGENTES.md`](../docs/CONTINUIDAD_AGENTES.md).

`-Atomic-UI` es la única fuente de verdad visual. No crear en esta aplicación
átomos, moléculas, organismos, superficies, plantillas, controles, diálogos,
tablas, tokens o patrones visuales reutilizables. Si falta un objeto, crearlo y
validarlo primero en Atomic; después propagarlo y registrar su procedencia.

Toda página o feature nueva debe componerse con el ADN existente. La lógica de
negocio permanece en esta aplicación. Antes de entregar cambios se debe ejecutar
`npm run check:atomic:pin` (y `npm run check:atomic` cuando corresponda al pin activo);
está prohibido omitir, debilitar o eludir esa compuerta.

## Frontera de escritorio

`DesktopFacadeService` es el único acceso productivo de Angular a Tauri. Los
comandos Rust se expresan en español y devuelven `RespuestaSistemaV1<T>` con JSON
`camelCase`. Ningún componente importa `invoke` ni accede directamente al sistema operativo.

## Ciclo y compuertas

Cada cambio registra rama, OID y estado Git, actualiza el roadmap activo en
[`../.agent/roadmaps/`](../.agent/roadmaps/PDFTOOL-20261018-001.md), [`../CHANGELOG.md`](../CHANGELOG.md),
[`../LESSONS_LEARNED.md`](../LESSONS_LEARNED.md) y [`../docs/CONTINUIDAD_AGENTES.md`](../docs/CONTINUIDAD_AGENTES.md),
y ejecuta `npm run check`, las compuertas Rust de la raíz y `git diff --check`.
