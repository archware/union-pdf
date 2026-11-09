---
title: "Continuidad de desarrollo para agentes"
subtitle: "Contexto verificable de la base Tauri, Rust y Angular"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-23"
last_updated: "2026-08-23"
document_type: "guía de continuidad"
status: "vigente"
version: "1.0.0"
change_id: "ECO-20260823-003"
canonical_doctrine: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\DOCTRINA_MAESTRA_UNIFICADA.md"
document_standard: "C:\\Users\\cotaha\\source\\repos\\.agent\\doctrinas\\ESTANDAR_DOCUMENTAL_AGENTES.md"
---

# Continuidad de desarrollo para agentes

## Propósito y límites

La guía permite reanudar cambios en la aplicación Tauri con Angular sin
confundir composición, dominio, infraestructura y transporte IPC. No reemplaza
los manuales técnicos ni autoriza conexiones a SQL Server, despliegues,
publicación de instaladores u operaciones Git mutantes.

## Orden obligatorio de lectura

1. C:\Users\cotaha\source\repos\.agent\doctrinas\DOCTRINA_MAESTRA_UNIFICADA.md.
2. C:\Users\cotaha\source\repos\.agent\doctrinas\ESTANDAR_DOCUMENTAL_AGENTES.md.
3. C:\Users\cotaha\source\repos\base_tauri_angular\AGENTS.md.
4. .agents/AGENTS.md y las habilidades o flujos requeridos.
5. docs/ATOMIC_GOVERNANCE.md y docs/atomic-provenance.json.
6. docs/manuales/ARQUITECTURA_BACKEND.md y el manual especializado aplicable.
7. El roadmap activo, CHANGELOG.md y LESSONS_LEARNED.md.

## Arquitectura y frontera IPC

La ejecución de nuevos lotes también deberá leer
C:\Users\cotaha\source\repos\.agent\guias\PROMPT_MAESTRO_CONTINUIDAD_AGENTES.md y conservar
.agents/roadmaps/ROADMAP_20260823_continuidad_documental_agentes.md como
evidencia histórica de este paquete.

| Responsabilidad | Autoridad local | Regla |
| --- | --- | --- |
| Presentación | src/app | Compone Atomic UI sin importar el transporte |
| Fachada nativa | src/app/core/desktop-facade.service.ts | Único acceso Angular a Tauri |
| Comandos IPC | src-tauri/src/interfaces/tauri_cmds.rs | Valida y traduce solicitudes |
| Contrato adaptado | src-tauri/src/contract_bridge.rs | Construye el envoltorio común |
| Aplicación y dominio | src-tauri/src/application y src-tauri/src/domain | Reglas interiores |
| Infraestructura | src-tauri/src/infrastructure | SQL Server, credenciales y adaptadores |
| Composición | src-tauri/src/lib.rs | Estado y registro de comandos |

Angular invoca exclusivamente métodos en español de DesktopFacadeService. La
fachada utiliza Tauri y recibe RespuestaSistemaV1<T> con JSON camelCase. Los
comandos anteriores permanecen solo como alias N-1 de transición y deberán
mantener pruebas de equivalencia mientras estén publicados.

## Documentos prioritarios

- docs/manuales/ARQUITECTURA_BACKEND.md: arquitectura, deuda de inversión, IPC
  y recuperación administrativa.
- docs/manuales/INTEGRACION_BASE_DATOS.md: contratos SQL y paridad.
- docs/manuales/GUIA_DE_DESPLIEGUE.md: políticas de entrega.
- docs/manuales/MANUAL_DE_OPERACION.md: compuertas y diagnóstico.
- .agents/roadmaps/ROADMAP_20260823_fachada_escritorio_respuesta_sistema_v1.md:
  evidencia de adopción 0.4.2.
- docs/CONTRATOS_COMPARTIDOS_GENERADOS.md: procedencia instalada.

## Estado verificado y deuda

El lote de fachada registró 270 pruebas Angular y 60 pruebas Rust aprobadas,
además de validaciones de contratos, formato, análisis estático y compilación.
La evidencia deberá repetirse después de cualquier cambio productivo.

La arquitectura documenta una dependencia clínica directa de PacienteService
hacia TiberiusRepository; el puerto de inversión permanece pendiente. También
continúan los alias N-1, la ausencia de cancelación IPC individual y la
necesidad de certificar contratos SQL contra un entorno autorizado antes de
desplegar. Una actualización documental no cierra esa deuda.

## Comandos de validación

~~~powershell
Set-Location C:\Users\cotaha\source\repos\base_tauri_angular
npm run check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
git diff --check
~~~

npm run check incluye Atomic, contratos de base de datos, secretos, pruebas de
recuperación y entrega, pruebas Angular y compilación. Los scripts de despliegue
SQL y preparación institucional quedan fuera de una validación ordinaria.

## Protocolo de continuidad

1. Se registrarán rama, OID, estado Git y archivos preexistentes.
2. Se leerá la jerarquía documental completa.
3. Se abrirá un roadmap con identificador nuevo.
4. Se delimitarán comando, caso de uso, contrato y prueba antes de editar.
5. Se implementará una unidad pequeña sin romper N/N-1.
6. Se ejecutarán pruebas focales y compuertas completas.
7. Se actualizarán changelog, lecciones y manuales.
8. Se cerrará el roadmap con evidencia, deuda, riesgos y reversión.

## Definición de terminado

El cambio estará terminado cuando Angular no conozca invoke, la interfaz Rust
solo despache hacia aplicación, la respuesta use RespuestaSistemaV1<T> y JSON
camelCase, el dominio mantenga su independencia, Atomic conserve procedencia,
las compuertas concluyan correctamente y la documentación describa el resultado
real sin atribuir certificaciones externas no ejecutadas.

## Reversión segura

La reversión se limitará a los archivos del roadmap mediante parche inverso. No
se ejecutarán comandos Git destructivos sobre el árbol compartido. Los contratos
generados se restaurarán regenerando desde esquemas, nunca editándolos a mano.
Los alias N-1 se conservarán hasta una retirada versionada y demostrada.

## Prompt maestro para el agente siguiente

~~~text
El agente actuará como desarrollador principal del repositorio
C:\Users\cotaha\source\repos\base_tauri_angular.

Antes de cambiar archivos, deberá leer íntegramente:
1. C:\Users\cotaha\source\repos\.agent\doctrinas\DOCTRINA_MAESTRA_UNIFICADA.md
2. C:\Users\cotaha\source\repos\.agent\doctrinas\ESTANDAR_DOCUMENTAL_AGENTES.md
3. C:\Users\cotaha\source\repos\base_tauri_angular\AGENTS.md
4. C:\Users\cotaha\source\repos\base_tauri_angular\.agents\AGENTS.md
5. C:\Users\cotaha\source\repos\base_tauri_angular\docs\CONTINUIDAD_AGENTES.md

Objetivo del lote: [describir una unidad vertical concreta].

El agente registrará rama, OID y estado Git; preservará cambios preexistentes;
creará primero un roadmap; mantendrá DesktopFacadeService como única frontera
Tauri; utilizará RespuestaSistemaV1<T>, JSON camelCase y nombres españoles;
actualizará changelog, lecciones y manuales; ejecutará npm run check, las
compuertas Rust indicadas y git diff --check; y entregará evidencia, deuda y
reversión. No ejecutará bases reales, despliegues, commits, push, merge, rebase
ni retiro de contratos sin autorización explícita.
~~~
