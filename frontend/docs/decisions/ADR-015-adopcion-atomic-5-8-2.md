---
title: "Adopción gobernada de Atomic UI 5.8.2 en la base Tauri"
subtitle: "Procedencia actualizada con preservación de adaptaciones funcionales"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-14"
status: "aceptada"
decision_id: "ADR-015"
change_id: "ATOMIC-20260814-582-TAURI-ADOPTION"
atomic_version: "5.8.2"
atomic_commit: "1987ef4ac992e9296c9a053b21efb324796016eb"
atomic_source_tree_sha256: "56f436acb2df6ca9d277942d91248cebc33987a6c10c8b364212c0d5acac66e4"
atomic_source_count: 158
policy_version: "1.2.2"
content_canonicalization: "git-clean-eol-v1"
---

# Adopción gobernada de Atomic UI 5.8.2 en la base Tauri

## Contexto

La base Tauri fijaba Atomic UI 5.5.8 y la política 1.2.2. Atomic UI 5.8.2
publica 158 fuentes con la huella
`56f436acb2df6ca9d277942d91248cebc33987a6c10c8b364212c0d5acac66e4`
y el commit
`1987ef4ac992e9296c9a053b21efb324796016eb`. Entre las versiones intermedias
se incorporaron correcciones de accesibilidad y robustez, tokens semánticos de
contención y el modo móvil acotado optativo de `TableComponent`.

El consumidor conserva adaptaciones funcionales y pruebas Vitest que no deben
ser reemplazadas por copias Jasmine. La actualización de procedencia tampoco
autoriza a adoptar automáticamente APIs nuevas ni a sobrescribir componentes
que divergen de forma deliberada.

## Decisión

Se ejecuta el instalador oficial de gobierno contra un checkout limpio del
commit fijado, con
`--adaptation-decision=docs/decisions/ADR-015-adopcion-atomic-5-8-2.md` y el
identificador `ATOMIC-20260814-582-TAURI-ADOPTION`. El instalador actualiza los
artefactos canónicos de gobierno y `docs/atomic-provenance.json`; no copia el
árbol completo de componentes.

La auditoría previa clasifica 16 componentes como exactos y 49 como adaptados.
Los cinco servicios obligatorios permanecen gobernados: `modal.service.ts` y
`popup.service.ts` son exactos; `theme.service.ts`,
`app-version.service.ts` y `toast.service.ts` son adaptados. Cada adaptación
renueva su snapshot canónico y enlaza esta decisión.

La disminución de 18 a 16 componentes exactos no representa una regresión ni
una copia parcial. Atomic modificó fuentes que el consumidor conserva con su
comportamiento local; por ello, la clasificación honesta pasa a `adapted` hasta
una migración funcional posterior y específica.

## Fuente verificada

El checkout de trabajo habitual de Atomic contenía una carpeta `dist`
ignorada. El instalador la rechazó conforme a su política de fuente limpia.
Para no borrar ni alterar esa salida, la adopción utiliza un clon local temporal
y limpio del mismo OID bajo `src-tauri/target`, cambia su remoto declarado al
origen canónico `archware/-Atomic-UI` y ejecuta desde allí el instalador. La
carpeta temporal permanece fuera de Git y no forma parte del cambio.

## Alcance

La adopción modifica solamente procedencia, política, gate, workflow, registro
de cambios y esta decisión. No modifica componentes UI productivos, servicios
productivos, Rust, IPC, SQL Server, Kafka, Nexus, ejecutables o instaladores.
Tampoco regenera ni versiona `.hra/generated/platform-state.json`.

El nuevo `mobileScrollMode='bounded'` queda disponible como capacidad de la
fuente Atomic, pero esta adopción de gobierno no lo activa en la aplicación.
Cualquier uso posterior requerirá una migración funcional con pruebas
responsivas propias.

## Verificación

La verificación exige:

1. Ejecutar `npm run check:atomic` contra el checkout fijado.
2. Confirmar 16 componentes exactos, 49 adaptados y cinco servicios gobernados.
3. Comprobar que cada adaptación referencia `ADR-015` y conserva hashes
   canónicos coincidentes con los archivos reales.
4. Confirmar que la versión, el commit, las 158 fuentes y la huella agregada
   corresponden a Atomic UI 5.8.2.
5. Verificar que no existan cambios en `src/app/shared/ui` como consecuencia
   del instalador y que `platform-state.json` permanezca fuera del commit.
