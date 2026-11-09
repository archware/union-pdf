---
title: "Adopción controlada de Atomic UI 5.5.8 en la base Tauri"
subtitle: "Procedencia portable y verificación independiente de finales de línea"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-12"
status: "aceptada"
decision_id: "ADR-013"
change_id: "ATOMIC-20260812-PROVENANCE-PORTABILITY"
atomic_version: "5.5.8"
atomic_commit: "93f090aef95c30dac3ccb00a7832fa7bdc22fbaa"
atomic_source_tree_sha256: "60b7ecf42ab6324664e42116273eea91c55da10dc7b323b1e6bdf3ac48ed3848"
atomic_source_count: 157
policy_version: "1.2.2"
content_canonicalization: "git-clean-eol-v1"
---

# Adopción controlada de Atomic UI 5.5.8 en la base Tauri

## Contexto

Atomic UI 5.5.8 corrige la dependencia que la procedencia 1.2.1 mantenía con
los finales de línea físicos, `core.autocrlf` y los atributos Git externos al
repositorio. La publicación queda fijada al commit
`93f090aef95c30dac3ccb00a7832fa7bdc22fbaa`, a 157 fuentes y a la huella
SHA-256
`60b7ecf42ab6324664e42116273eea91c55da10dc7b323b1e6bdf3ac48ed3848`.
El identificador `ATOMIC-20260812-PROVENANCE-PORTABILITY` enlaza la fuente, el
presente registro, el manifiesto consumidor y el registro de cambios.

La política 1.2.2 representa el texto gobernado con LF después de comprobar
los atributos versionados, conserva los binarios sin transformación y rechaza
filtros, codificaciones, enlaces, atributos no versionados y rutas externas.
El OID completo debe coincidir con `HEAD`, el remoto queda limitado a
`archware/-Atomic-UI` y el manifiesto de fuentes se recalcula en lugar de
confiar únicamente en sus valores declarados.

## Decisión

La base Tauri adopta la política 1.2.2, el gate y los cuatro auxiliares
canónicos de rutas, atributos, contrato y manifiesto de fuentes. El workflow
dedicado obtiene la referencia como un dato no confiable, descarga la fuente
canónica sin persistir credenciales y ejecuta el verificador procedente del
checkout Atomic antes de instalar dependencias. La regla
`* text=auto eol=crlf` establece la forma de trabajo sin alterar la identidad
portable de los archivos gobernados.

No se copian componentes ni servicios de interfaz. La auditoría canónica
clasifica 18 componentes como exactos, 47 como adaptados y mantiene cinco
servicios gobernados. `surfaces/panel` pasa de `adapted` a `exact` porque sus
archivos locales y Atomic producen las mismas huellas canónicas; la diferencia
registrada por 1.2.1 correspondía exclusivamente a la representación física
de finales de línea. Los otros 64 componentes conservan su clasificación y
ningún byte productivo de interfaz se modifica.

## Alcance

La decisión modifica exclusivamente documentos, manifiestos, auxiliares de
gobierno, atributos Git y el workflow dedicado. No modifica Rust, comandos
Tauri, IPC, contratos de dominio, procedimientos SQL, Kafka, Nexus ni el
indicador 12. Tampoco autoriza `tauri build`, ejecutables o instaladores.

## Verificación

La adopción requiere la compuerta canónica `check:atomic`, los contratos del
frontend y de base de datos, los controles TypeScript y Angular, la suite
Vitest y la compilación Angular. La verificación final debe fijar el
localizador portable `../-Atomic-UI`, mantener la identidad 5.5.8 completa,
confirmar la igualdad canónica de `surfaces/panel` y comprobar que el árbol Git
queda limpio después del commit. El gate dedicado constituye el control
automatizado versionado; el ruleset externo de la rama protegida debe exigirlo
como comprobación requerida, puesto que un workflow modificado por la misma
solicitud no puede demostrar por sí solo que su política no fue degradada.
