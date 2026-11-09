---
title: "Corrección del recuperador administrativo Rust"
subtitle: "Restablecimiento del empaquetado nativo y del cambio de contraseña local"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
status: "Completado"
---

# Corrección del recuperador administrativo Rust

El presente roadmap dirige la corrección incremental del recuperador administrativo de Base Tauri. La mejora conservará la separación entre la aplicación principal y el ejecutable nativo, mantendrá el uso de Windows Credential Manager y evitará que un artefacto de otro producto pueda sustituir al binario Rust revisado.

## Alcance de implementación

- [x] Reparar la interfaz Win32 del recuperador Rust sin eliminar las mejoras visuales válidas.
- [x] Restablecer la dependencia correcta entre la interfaz y el núcleo de recuperación de Base Tauri.
- [x] Retirar las copias Python/PyInstaller incorporadas bajo la identidad del recuperador Tauri.
- [x] Vincular criptográficamente la fuente firmada del paquete con el ejecutable Rust revisado, permitiendo únicamente las transformaciones de Authenticode.
- [x] Añadir pruebas de regresión para impedir sustituciones entre productos y validar el flujo de contraseña mediante almacenes aislados.
- [x] Ejecutar las verificaciones Rust y Node.js aplicables sin consultar ni modificar WinVault real.
- [x] Actualizar `CHANGELOG.md` y `LESSONS_LEARNED.md` con los resultados y decisiones técnicas.
- [x] Cerrar todas las tareas y conservar este archivo como evidencia auditable.

## Cierre

La implementación se completó el 2026-08-20. La suite Node.js aprobó 26 de 26 pruebas y la suite del recuperador Rust aprobó 8 de 8; `cargo check`, Clippy estricto, formato focal y el escaneo de secretos finalizaron correctamente. El PE Rust de desarrollo contiene el destino `pe.gob.hra.modulo-operativo/admin-password-hash-argon2id-v1`, no presenta marcadores PyInstaller y conserva la huella SHA-256 `DF7B90677C09B7FEB72BE7C74F706F89165E9C53DB869A2DD129F108B2C8380F`.

La evidencia regenerable anterior a las correcciones fue retirada. La preparación productiva permanece bloqueada hasta reconstruir desde un commit limpio, aplicar Authenticode institucional y generar el inventario firmado. La prueba real de Windows Credential Manager debe realizarse posteriormente en una cuenta Windows desechable; durante esta mejora no se consultó ni modificó WinVault real.
