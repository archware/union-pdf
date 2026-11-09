---
title: "Adopción gobernada de Atomic UI 5.22.0"
subtitle: "Base Tauri y Angular con procedencia reproducible"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-23"
last_updated: "2026-08-23"
document_type: "roadmap técnico"
status: "completado"
version: "1.0.0"
change_id: "ATOMIC-5-22-0-SYNC-20260823"
---

# Adopción gobernada de Atomic UI 5.22.0

Este roadmap controla la adopción de los cambios compatibles de Atomic UI
5.22.0, la publicación de la revisión canónica y la instalación de procedencia
gobernada en Base Tauri.

## Alcance de implementación

- [x] Leer el contrato de agentes, el gobierno Atomic y la procedencia vigente.
- [x] Auditar los componentes locales frente a la revisión canónica
  `67297145e2cb4bfe9ab349c471da5c3719fd1207`.
- [x] Preservar fuera del artefacto gobernado el frontmatter y la trazabilidad
  histórica de `docs/ATOMIC_GOVERNANCE.md`.
- [x] Integrar como una unidad los cinco archivos globales de temas y conservar
  los alias de tokens consumidos por la aplicación.
- [x] Propagar los componentes anteriormente exactos cuyo único desfase procede
  de Atomic UI 5.22.0, incluido el diálogo emergente como unidad de servicio y
  presentación.
- [x] Fusionar de forma focalizada Datepicker, Button, NumberInput, Toggle,
  Accordion y el contrato visual de Combobox sin romper las API públicas ni las
  pruebas compatibles con Vitest.
- [x] Registrar la decisión, el cambio y las lecciones técnicas.
- [x] Verificar que la revisión Atomic sea recuperable desde `origin/main`.
- [x] Ejecutar el instalador oficial con ADR-017 y el identificador
  `ATOMIC-5-22-0-SYNC-20260823`.
- [x] Confirmar que `tokens.required` conserve el valor esperado de cero
  elementos.
- [x] Ejecutar `check:atomic`, contratos, contratos de base de datos,
  comprobación de tipos, pruebas, construcción y revisión del diff.
- [x] Actualizar la decisión, el registro de cambios y las lecciones aprendidas.

## Criterios de cierre

La implementación se considera completa cuando las fuentes locales usan los
tokens y correcciones compatibles de Atomic UI 5.22.0, las adaptaciones de la
aplicación permanecen identificables, la revisión declarada puede recuperarse
desde el remoto y todas las compuertas concluyen con procedencia instalada.

## Cierre

Las fuentes compatibles se sincronizaron con Atomic UI 5.22.0 en la revisión
`67297145e2cb4bfe9ab349c471da5c3719fd1207`. La comprobación de tipos y la
construcción productiva finalizaron correctamente. La suite completa volvió a
compilar después de alinear tres expectativas históricas con la selección
explícita `useStoredPassword`; ese ajuste se limitó a la especificación y no
reintrodujo la reutilización automática retirada de producción. Vitest aprobó
265 pruebas distribuidas en 31 archivos.

La revisión Atomic se publicó y el instalador oficial registró 12 componentes
exactos, 53 adaptados y cinco servicios gobernados. La procedencia fija la
huella `ebd294d5e4b05bf771d96e6941a2d854faa9c28912b5c4c97c61cb45e5d28872`
y conserva `tokens.required` vacío.

La compuerta `check:atomic` aprobó la política 1.2.2, 65 componentes, cinco
servicios y cero violaciones. Los contratos de escritorio y base de datos, la
comprobación de tipos, las 265 pruebas Vitest y la construcción productiva
finalizaron correctamente. La construcción conserva dos advertencias no
bloqueantes de presupuesto CSS en ScrollOverlay y Table, que quedan como
oportunidad de optimización sin afectar la adopción ni el artefacto generado.
