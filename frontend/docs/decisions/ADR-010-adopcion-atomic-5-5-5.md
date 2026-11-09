---
title: "Adopción controlada de Atomic UI 5.5.5 en la base Tauri"
subtitle: "Menú contextual de texto y política de portapapeles verificable"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-10"
status: "aceptada"
decision_id: "ADR-010"
change_id: "ATOMIC-20260810-555-CONTEXT-MENU-TAURI"
upstream_change_id: "ATOMIC-20260810-CONTEXT-MENU"
atomic_version: "5.5.5"
atomic_commit: "438f379df53bfb5dd0d04d81823fb644aa0696e0"
atomic_source_tree_sha256: "81a202c0a85ab6ed84c49d5a285a4409142c5e1ac565c43d7905525302edc29b"
---

# Adopción controlada de Atomic UI 5.5.5 en la base Tauri

## Contexto

Los hosts WebView pueden desactivar o presentar de forma desigual el menú
contextual nativo. La aplicación requería un contrato uniforme para Cortar,
Copiar, Pegar y Seleccionar todo sin duplicar la semántica de los controles
que ya administran un popup propio. Los campos de contraseña también debían
conservar una política de interacción estable cuando su valor se revela como
texto.

Atomic UI 5.5.5 publica `ContextMenuComponent` y actualiza `InputComponent`,
`Input`, y `FloatingInputComponent` mediante el cambio
`ATOMIC-20260810-CONTEXT-MENU`. La publicación queda fijada al commit
`438f379df53bfb5dd0d04d81823fb644aa0696e0` y a la huella de fuentes
`81a202c0a85ab6ed84c49d5a285a4409142c5e1ac565c43d7905525302edc29b`.

## Decisión

La base Tauri incorpora la molécula canónica y monta exactamente una instancia
`app-context-menu` como hermana del shell y del host global de notificaciones.
La instancia observa el `Document` sin envolver el contenido de la aplicación.
Los controles `textarea` e `input` de texto compatibles reciben el menú; las
regiones `contenteditable` requieren
`data-context-menu-policy="text-edit"`. Los controles con `role="combobox"`,
`aria-controls` o `aria-haspopup` conservan su popup propio, y
`data-context-menu-policy="native"` fuerza la exclusión.

Las tres familias de entrada adoptan el contrato
`data-clipboard-policy="paste-only"` a partir del tipo lógico `password`. La
marca permanece cuando se alterna la representación nativa a `text`; por ello,
el resguardo bloquea los eventos de copia, corte y arrastre gestionados por la
molécula sin impedir Pegar ni Seleccionar todo.

Los archivos productivos de `Input` (`form-input`), `FloatingInputComponent` y
`ContextMenuComponent` conservan identidad byte a byte con la fuente Atomic
5.5.5. `InputComponent`, en cambio, permanece clasificado como `adapted`: la
implementación local conserva intencionalmente `color: var(--info-color)` para
la etiqueta, mientras la fuente utiliza `color: var(--text-color)`. Esta
divergencia visual preexistente no altera la nueva política de portapapeles y
queda fijada por el manifiesto con SHA-256 local
`aee70c35b35b3bd9c481da2bba46f2515f2728da6d8c9a6c3cfd00b6f452b39a`
frente al SHA-256 Atomic
`6b70846ee5d2b03710d87835c8a1e400918930b89faad5b975bf3bd6502ef1fa`.

Las especificaciones de Atomic se conservan completas y se portan al ejecutor
Vitest del consumidor mediante imports explícitos, dobles `vi.fn` y matchers
equivalentes. Las diferencias de prueba se registran como adaptaciones. El
manifiesto distingue esas adaptaciones del ejecutor y la divergencia visual
de `InputComponent` de los archivos productivos que sí permanecen exactos.

## Límites de seguridad y alcance

La política `paste-only` constituye un resguardo de interacción y no un
mecanismo DLP. No protege frente a scripts con acceso al DOM, XSS, extensiones
del navegador ni un host comprometido. El componente utiliza exclusivamente
las API del navegador, no persiste el contenido del portapapeles y no incorpora
IPC hacia Rust.

La decisión no modifica Rust, comandos Tauri, contratos SQL, Kafka, Nexus ni el
indicador 12. Tampoco autoriza `tauri build`, ejecutables o instaladores.

## Verificación

La procedencia se regenera mediante el instalador oficial con el identificador
`ATOMIC-20260810-555-CONTEXT-MENU-TAURI`. La adopción exige la compuerta
`check:atomic`, contratos de escritorio y base de datos, control TypeScript y
Angular, la suite Vitest, la compilación Angular y `git diff --check`.
