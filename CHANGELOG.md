---
title: "Historial de lanzamientos de Unión PDF"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-11-21"
last_updated: "2026-11-21"
version: "1.0.0"
change_id: "DOC-20261121-001"
document_type: "registro de cambios"
status: "vigente"
---

# Historial de lanzamientos de Unión PDF

## Versión 1.0.0 (2026-11-21)

- Publicación de ejecutables nativos multiplataforma (Windows `x86_64`, macOS `arm64`, macOS `x86_64` y Linux `x86_64`) compilados desde Azure Pipelines con endurecimiento binario Release (`strip = "symbols"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`).
- Guardado nativo real («Guardar como…») por puente IPC en Rust con verificación de cabecera `%PDF` y acción directa de apertura del documento resultante.
- Unión híbrida de archivos PDF e imágenes con normalización automática a formato A4 y lectura de orientación EXIF.
- Reordenación interactiva por arrastre de miniaturas, atajos de teclado y conmutador de tema claro/oscuro gobernado por tokens semánticos de Atomic UI.
