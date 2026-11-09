---
title: "Adopción gobernada de Atomic UI 5.22.0"
subtitle: "Procedencia instalada desde la revisión canónica publicada"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-23"
last_updated: "2026-08-23"
document_type: "registro de decisión arquitectónica"
status: "aceptada y verificada"
decision_id: "ADR-017"
change_id: "ATOMIC-5-22-0-SYNC-20260823"
atomic_version: "5.22.0"
atomic_ref: "67297145e2cb4bfe9ab349c471da5c3719fd1207"
atomic_source_tree_sha256: "ebd294d5e4b05bf771d96e6941a2d854faa9c28912b5c4c97c61cb45e5d28872"
related_roadmap: ".agents/roadmaps/ROADMAP_20260823_sincronizacion_atomic_5_22_previa_procedencia.md"
---

# Adopción gobernada de Atomic UI 5.22.0

## Contexto

Base Tauri conservaba procedencia Atomic UI 5.8.2. La revisión publicada 5.22.0
incorpora tokens tipográficos y de objetivo táctil, contraste sin opacidad,
reconciliación entre modelo y DOM, semántica de teclado y foco, y correcciones
de geometría. La revisión canónica se publicó antes de instalar los artefactos
de gobierno y regenerar `docs/atomic-provenance.json`, de modo que la referencia
declarada puede recuperarse desde el remoto consumido por CI.

Durante la ejecución, Atomic corrigió además el contraste de los controles
deshabilitados, la cancelación del comportamiento nativo de Button durante
`loading`, el cierre accesible de Popup y el ajuste de NumberInput cuando el
valor vacío queda fuera del intervalo. La revisión final
`67297145e2cb4bfe9ab349c471da5c3719fd1207` conserva Atomic UI 5.22.0 y fija la
huella de fuentes
`ebd294d5e4b05bf771d96e6941a2d854faa9c28912b5c4c97c61cb45e5d28872`.

## Decisión

Se adopta la fuente compatible de Atomic UI 5.22.0 y se instala su procedencia
gobernada. Los cinco archivos globales `_tokens-primitives.css`,
`_tokens-components.css`, `_forms.css`, `_buttons.css` y `_utilities.css` se
tratan como una sola unidad. Se conservan los alias `--alert-info-text` y
`--alert-danger-text` usados por la aplicación y se incorporan
`--font-weight-body`, `--font-weight-emphasis`, `--font-weight-title`,
`--font-weight-display` y `--touch-target-min`.

Se propagan las fuentes anteriormente exactas de Badge, Breadcrumb, Checkbox,
Divider, IconButton, LanguageSwitcher, Radio, Rating, Select, Text, DataState,
Dropdown y Panel. Popup se propaga como una unidad formada por el contenedor y
el servicio: el foco inicial recae en la salida segura, Escape ejecuta la
cancelación declarada y la confirmación exige un verbo explícito mediante
`confirmLabel`. No existen invocaciones locales a `PopupService.confirm`, por
lo que la API más estricta no rompe un llamador de esta aplicación.

Button, NumberInput, Toggle, Accordion y Datepicker se fusionan de forma
compatible. Button conserva el foco durante la carga y expone su API de ARIA y
foco sobre el control nativo; NumberInput reconcilia el DOM y anuncia ajustes;
Toggle usa semántica `switch`, contraste directo y geometría cerrada; Accordion
publica encabezados y devuelve el foco antes de ocultar contenido; Datepicker
interpreta una fecha ISO sin hora como fecha civil local, cancela y detiene
Escape en las vistas de día, mes y año, y elimina la opacidad del estado
deshabilitado. Combobox conserva su API adaptada y reemplaza la opacidad y los
pesos numéricos por tokens semánticos para estados, texto y énfasis.

Las especificaciones se adaptan al runner Vitest real mediante sus aserciones,
espías y temporizadores, sin introducir Jasmine. Las fuentes de implementación
permanecen iguales a Atomic bajo la canonicalización LF; las especificaciones
adaptadas constituyen la diferencia deliberada.

El instalador oficial registra 12 componentes exactos, 53 adaptados y cinco
servicios gobernados. La lista `tokens.required` permanece vacía, tal como se
encontraba antes de la instalación, y cada adaptación queda asociada a este ADR
mediante una instantánea criptográfica renovada.

## Revalidación de decisiones históricas

ADR-015 continúa explicando la adopción de Atomic UI 5.8.2 y no se reescribe.
Sus justificaciones de adaptaciones siguen siendo evidencia histórica, pero los
snapshots dejan de representar las fuentes modificadas en esta fase. ADR-016
permanece vigente para la identidad del producto y el recuperador; esta
sincronización no modifica versión, distribución, credenciales ni contratos de
negocio. La política 1.2.2 continúa siendo obligatoria.

## Consecuencias

La aplicación obtiene correcciones de accesibilidad y coherencia sin crear
primitivas visuales propias. `docs/atomic-provenance.json` declara Atomic UI
5.22.0, la revisión publicada completa, la huella agregada de fuentes y el
identificador de cambio. El workflow, la política y los scripts canónicos se
renovaron como artefactos inmutables de gobierno.

La compuerta puede reproducir la revisión
`67297145e2cb4bfe9ab349c471da5c3719fd1207` desde `archware/-Atomic-UI`. Las
adaptaciones continúan perteneciendo al consumidor y no trasladan credenciales,
IPC, SQL Server ni reglas de negocio al sistema visual.

## Verificación

La auditoría sin escritura y la instalación oficial finalizaron correctamente.
`npm run check:atomic` verificó la política 1.2.2, 65 componentes, cinco
servicios y cero violaciones. Las compuertas de contratos de escritorio y base
de datos, la comprobación de tipos, las 265 pruebas Vitest distribuidas en 31
archivos y la construcción productiva también finalizaron correctamente.

La especificación histórica del diálogo SQL se alinea con
`useStoredPassword`, la API explícita vigente desde antes de esta adopción. El
ajuste no restablece la reutilización automática retirada de producción: la
selección se invalida cuando cambia servidor, base de datos o usuario y vuelve
a comprobarse antes de cruzar la frontera IPC.
