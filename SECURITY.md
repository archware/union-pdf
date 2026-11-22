---
title: "Política de seguridad y verificación de integridad de Unión PDF"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-11-21"
last_updated: "2026-11-21"
version: "1.0.0"
change_id: "DOC-20261121-001"
document_type: "política de seguridad"
status: "vigente"
---

# Política de seguridad y verificación de integridad

## 1. Modelo de privacidad y ejecución local

Unión PDF procesa la totalidad de los documentos PDF e imágenes en la memoria local del dispositivo del usuario. La aplicación no realiza conexiones salientes a Internet, no transmite telemetría y no almacena copias de los documentos en servidores externos.

## 2. Verificación criptográfica de ejecutables

Cada binario publicado en [GitHub Releases](https://github.com/archware/union-pdf/releases) incluye su archivo individual `.sha256` y el manifiesto consolidado **SHA256SUMS.txt** generado por la canalización de compilación en Azure Pipelines. Antes de ejecutar el binario descargado, se recomienda comprobar su huella SHA-256:

- **En Windows (PowerShell):** `Get-FileHash .\union-pdf-windows-x86_64.exe -Algorithm SHA256`
- **En macOS y Linux:** `shasum -a 256 union-pdf-*` o `sha256sum -c SHA256SUMS.txt`

## 3. Reporte de vulnerabilidades

Cualquier hallazgo o consulta de seguridad debe notificarse directamente a `havel363@gmail.com` indicando la versión del ejecutable, el sistema operativo y los pasos para reproducir el comportamiento observado.
