# Contratos IPC de pdf-tool

Este directorio contiene los contratos formales para la comunicacion entre la interfaz de usuario Angular y el runtime nativo Rust/Tauri, en estricto cumplimiento de la doctrina de escritorio (`DOCTRINA_ESCRITORIO.md`).

## Reglas de la frontera IPC:
1. Toda invocacion nativa se canaliza a traves de `DesktopFacadeService`.
2. Toda respuesta sigue la envoltura canonica `RespuestaSistemaV1<T>` en espanol y camelCase.
3. Se garantizan tipos estrictos tanto en TypeScript (`contracts/generated/typescript/contracts.ts`) como en Rust (`contracts/generated/rust/contracts.rs`).
4. Errores estructurados con codigos predecibles (`ErrorSistemaV1`) sin convertir errores en datos vacios o nulos silenciosos.
