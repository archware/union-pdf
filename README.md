---
title: "Unión PDF — Vitrina oficial y canal de distribución de ejecutables"
subtitle: "Suite corporativa de escritorio multiplataforma (Windows, macOS y Linux) sin exposición de código fuente"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-11-21"
last_updated: "2026-11-21"
version: "1.0.0"
change_id: "DOC-20261121-001"
document_type: "escaparate público"
status: "vigente"
---

# Unión PDF (`archware/union-pdf`)

[![Release](https://img.shields.io/github/v/release/archware/union-pdf?label=Release&color=4f46e5)](https://github.com/archware/union-pdf/releases/latest)
[![Plataformas](https://img.shields.io/badge/Plataformas-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-0d9488)](https://github.com/archware/union-pdf/releases/latest)
[![Stack](https://img.shields.io/badge/Stack-Rust%20%2B%20Tauri%20%C2%B7%20Angular%2022%20%2B%20Atomic%20UI-3730a3)](https://github.com/archware/Atomic-UI)
[![Licencia: Propietaria](https://img.shields.io/badge/Licencia-Propietaria%20%C2%B7%20Todos%20los%20derechos%20reservados-b91c1c)](LICENSE)

Repositorio oficial de distribución binaria de **Unión PDF**, suite corporativa de escritorio para manipulación, unión, rotación, extracción y reordenamiento visual de documentos PDF e imágenes. Esta aplicación demuestra el acoplamiento entre el ecosistema de backend **Artifact Mangosta** (DDD, arquitectura hexagonal y frontera IPC determinista sobre Rust y Tauri v1.5) y el ecosistema de frontend **Artifact Barracuda** con **Atomic UI** sobre Angular 22 y Signals, operando íntegramente en memoria local sin telemetría ni servidores externos.

> **Nota de propiedad intelectual y distribución:** Este repositorio público actúa exclusivamente como canal oficial de entrega de binarios compilados y documentación ejecutiva. El código fuente reside en bóveda privada gobernada (`archware/union-pdf-core` y Azure DevOps) y los artefactos se publican desde Azure Pipelines con endurecimiento anti-caja blanca.

---

## Descarga directa de ejecutables compilados (`v1.0.0`)

Todos los paquetes se compilan en canalizaciones aisladas de Azure Pipelines con perfil Release endurecido (`strip = "symbols"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`) y se publican acompañados de sus sumas criptográficas SHA-256 en [GitHub Releases](https://github.com/archware/union-pdf/releases/latest):

| Plataforma y arquitectura | Descarga directa | Suma SHA-256 | Formato nativo y ejecución |
| :--- | :--- | :--- | :--- |
| **Windows (`x86_64`)** | [Descargar ejecutable Windows (.exe)](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-windows-x86_64.exe) | [Verificar SHA-256](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-windows-x86_64.exe.sha256) | Ejecutable portable PE64 (`.exe`) con iconos multirresolución y frontend embebido. Ejecución directa sin instalador. |
| **macOS Apple Silicon (`arm64` · M1/M2/M3/M4)** | [Descargar paquete macOS ARM64 (.app.tar.gz)](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-arm64.app.tar.gz) | [Verificar SHA-256](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-arm64.app.tar.gz.sha256) | Application Bundle nativo Mach-O 64-bit (`arm64`) con firma ad-hoc. Descomprimir y abrir la aplicación. |
| **macOS Intel (`x86_64`)** | [Descargar paquete macOS Intel (.app.tar.gz)](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-x86_64.app.tar.gz) | [Verificar SHA-256](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-macos-x86_64.app.tar.gz.sha256) | Application Bundle nativo Mach-O 64-bit (`x86_64`) con firma ad-hoc. Descomprimir y abrir la aplicación. |
| **Linux (`x86_64`)** | [Descargar paquete Linux (.tar.gz)](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-linux-x86_64.tar.gz) | [Verificar SHA-256](https://github.com/archware/union-pdf/releases/latest/download/union-pdf-linux-x86_64.tar.gz.sha256) | Binario ELF 64-bit auto-contenido (`ET_EXEC`, permisos `0755`) compatible con Ubuntu 22.04/24.04+, Debian, Fedora, Arch y Mint. |
| **Manifiesto consolidado de sumas** | [Descargar SHA256SUMS.txt](https://github.com/archware/union-pdf/releases/latest/download/SHA256SUMS.txt) | — | Resumen consolidado de huellas SHA-256 de los cuatro artefactos del lanzamiento. |

---

## Capacidades principales

- **Guardado nativo por puente IPC en Rust:** Diálogo nativo del sistema operativo con validación binaria de firma `%PDF`, asignación automática de extensión y apertura inmediata con el visor predeterminado del sistema.
- **Unión híbrida de documentos PDF e imágenes:** Procesamiento combinado de documentos PDF junto con imágenes (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`, `.avif`, `.ico`, `.tif`, `.tiff`), normalizadas en memoria a páginas A4 centradas con detección de orientación EXIF.
- **Organizador visual con arrastre de miniaturas y atajos de teclado:** Reordenamiento directo por arrastre, filtrado de rangos por documento, exclusión o restauración con doble clic, zoom de `50%` a `300%`, rotación en pasos de `±90°` y atajos de teclado (`←`/`→`, `R`, `Delete`, `Ctrl+S`/`Cmd+S`).
- **Modo claro y oscuro con tokens semánticos Atomic UI:** Conmutación instantánea de tema sincronizada con las preferencias del sistema operativo sobre una ventana nativa centrada de `1280×820`.
- **Privacidad local y seguridad endurecida:** Ejecución 100% en memoria local sin conexiones de red externas y con política `Content-Security-Policy` restrictiva.

---

## Documentación del escaparate

- [Licencia propietaria comercial](LICENSE)
- [Historial de lanzamientos](CHANGELOG.md)
- [Política de seguridad y verificación de binarios](SECURITY.md)
- [Vitrina del sistema de diseño Atomic UI](https://github.com/archware/Atomic-UI)
- [Portafolio de ingeniería (@archware)](https://github.com/archware)
