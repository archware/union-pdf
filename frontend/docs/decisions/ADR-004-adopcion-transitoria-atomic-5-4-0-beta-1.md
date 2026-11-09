---
title: "Adopción transitoria de Atomic 5.4.0-beta.1 en la base Tauri"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-06"
status: "aceptada"
decision_id: "ADR-004"
change_id: "ATOMIC-20260806-540B1-TAURI"
atomic_version: "5.4.0-beta.1"
atomic_commit: "0f33f6aada0aeb8495aa787f559664dcaa1cd73d"
atomic_source_tree_sha256: "443cf0e0dab15d7c2913187d86cdf94afb58d2ed6d98a7eb68c34807bfa15fe0"
---

# Adopción transitoria de Atomic 5.4.0-beta.1 en la base Tauri

## Contexto

Atomic cerró la release `5.4.0-beta.1` en el commit
`0f33f6aada0aeb8495aa787f559664dcaa1cd73d` con la huella de árbol declarada en
los metadatos. Respecto de las copias que este consumidor mantiene, la release
solo modificó `src/styles/themes/_forms.css` (la clase `.atomic-form-stack`
pasa a usar los tokens `--space-3/4/5` en lugar de `--spacing-6` y valores rem
fijos) y `src/styles/themes/index.css` (selector `html, body` en lugar del
duplicado `body, html, body`). El resto del ecosistema (Python, Wails) se
sincroniza contra la misma referencia, por lo que mantener este consumidor en
la referencia previa produciría divergencia de procedencia entre plataformas.

## Decisión

Se adopta de forma transitoria como fuente canónica el commit
`0f33f6aada0aeb8495aa787f559664dcaa1cd73d`, versión `5.4.0-beta.1`, con la
huella SHA-256 declarada en los metadatos, para sincronizar el ecosistema.
Los dos archivos de temas afectados se igualan al contenido actual de Atomic;
las entradas de componentes de `docs/atomic-provenance.json` no se modifican
porque ningún componente copiado cambió en esta release.

La adopción es transitoria: la versión es una beta y permanecerá en este
estado hasta que Atomic publique la `5.4.0` final, momento en el que se
emitirá un nuevo registro de decisión con la referencia definitiva.

## Consecuencias

El gate de procedencia bloquea una referencia, versión, huella o adaptación
divergente respecto de `5.4.0-beta.1`. La condición beta implica que pueden
llegar correcciones adicionales antes de la `5.4.0` final y que este
consumidor deberá resincronizarse. La adopción no equivale a una autorización
de producción: el frontend, Rust, MSI, NSIS, firma institucional e
instalación limpia mantienen sus propias compuertas antes de la promoción.
