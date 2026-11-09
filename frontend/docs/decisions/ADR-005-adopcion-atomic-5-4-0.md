---
title: "Adopción definitiva de Atomic 5.4.0 estable en la base Tauri"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-06"
status: "aceptada"
decision_id: "ADR-005"
change_id: "ATOMIC-20260806-540-TAURI"
atomic_version: "5.4.0"
atomic_commit: "3e0b8c60e677f4ffc023318254303ec854c0f162"
atomic_source_tree_sha256: "9401e467c55cdfed9286f82997d507965de58af1640651e3759901422a877034"
policy_version: "1.1.0"
supersedes: "ADR-004"
---

# Adopción definitiva de Atomic 5.4.0 estable en la base Tauri

## Contexto

Atomic consolidó la release estable `5.4.0` en el commit
`3e0b8c60e677f4ffc023318254303ec854c0f162`, con huella de árbol fuente
`9401e467c55cdfed9286f82997d507965de58af1640651e3759901422a877034`. La release
corrigió veinte declaraciones CSS inválidas de la familia `-var(...)` —cuya
forma correcta es `calc(-1 * var(...))`— en badge, floating-input,
avatar-group, table (más `styles/tokens/table-tokens.css`), card, panel,
stepper, user-menu, select2, dropdown y language-switcher, y elevó la política
de gobierno consumidor a la versión `1.1.0`: el gate ahora escanea también las
plantillas y estilos embebidos en archivos `.ts` de features (primitivas
visuales nativas, `style=` inline en el marcado, colores fijos y negaciones
inválidas de tokens; los `*.spec.ts` quedan exentos) y exige
`policyVersion: "1.1.0"` en el manifiesto de procedencia.

## Decisión

Se adopta de forma definitiva como fuente canónica el commit
`3e0b8c60e677f4ffc023318254303ec854c0f162`, versión estable `5.4.0`, con la
huella SHA-256 declarada en los metadatos. Esta decisión reemplaza la adopción
transitoria de la `5.4.0-beta.1` registrada en
`docs/decisions/ADR-004-adopcion-transitoria-atomic-5-4-0-beta-1.md`.

Alcance aplicado en este consumidor:

- **Copias `exact` resincronizadas** desde Atomic: `atoms/badge`,
  `atoms/language-switcher` y `molecules/dropdown`, además de la hoja de
  tokens compartida `src/app/shared/ui/styles/tokens/table-tokens.css`.
- **Copias `adapted` corregidas localmente** con el mismo patrón
  `calc(-1 * var(...))`: floating-input, form-error, table, action-group,
  avatar-group, card, select2, user-menu, stepper y panel. Sus
  `adaptationSnapshot` en `docs/atomic-provenance.json` se actualizaron con
  los nuevos `localSha256` y `atomicSha256`; las justificaciones y este
  registro de decisión respaldan la vigencia de cada adaptación.
- **Gobernanza 1.1.0 propagada**: `scripts/check-atomic-provenance.mjs` y
  `docs/ATOMIC_GOVERNANCE.md` se igualan a la fuente Atomic; el workflow
  `atomic-governance.yml` no cambió (hash idéntico verificado).
- **Erradicación de UI hardcodeada en features** para cumplir la política
  1.1.0: los dashboards gerencial, operativo y descartados migran sus
  `style="..."` inline a clases con tokens (`var(--space-*)`, `var(--text-*)`,
  `var(--radius-*)`), eliminan colores hex en favor de tokens semánticos y
  leen los colores de series Chart.js con el patrón Atomic
  (`getComputedStyle(...).getPropertyValue('--chart-color-N')`). Se corrigió
  además la declaración CSS inválida `0 var(--space-4) 0;` heredada en los
  subtítulos.
- **Página muerta eliminada**: `src/app/pages/login/` no estaba enrutada
  (`app.routes.ts` vacío) ni importada por ningún módulo y concentraba
  primitivas nativas y estilos inline; se elimina del árbol.

## Consecuencias

El gate de procedencia bloquea cualquier referencia, versión, huella,
adaptación o artefacto de gobierno divergente respecto de `5.4.0` estable y
de la política `1.1.0`, incluida ahora la UI hardcodeada en features `.ts`.
La condición transitoria del ADR-004 queda cerrada. La adopción no equivale a
una autorización de producción: el frontend, Rust, MSI, NSIS, firma
institucional e instalación limpia mantienen sus propias compuertas antes de
la promoción.
