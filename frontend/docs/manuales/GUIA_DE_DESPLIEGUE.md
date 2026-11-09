---
title: "Guía de despliegue de Base Tauri"
subtitle: "Compilación, staging, firma, instalación y reversión"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-20"
last_updated: "2026-08-20"
document_type: "guía de despliegue"
status: "vigente"
canonical: true
application: "base_tauri_angular"
version: "1.6.1"
security_classification: "uso interno"
---

# Guía de despliegue de Base Tauri

## Unidades de entrega

La entrega contiene la aplicación Tauri y el recuperador administrativo Rust como productos relacionados pero distintos. Cada ejecutable conserva identidad, versión, rol, huella y evidencia. El recuperador no puede sustituirse por un ejecutable de Python ni por un archivo renombrado.

## Prerrequisitos

- Árbol revisado y contratos sin divergencias.
- Node.js 22, npm reproducible, Rust y herramientas de Microsoft.
- WebView2 en el equipo de destino.
- Certificado institucional de firma de código y sellado de tiempo para producción.
- Instancia SQL compatible o plan de despliegue SQL aprobado por separado.

## Validación y compilación

Todas las órdenes de esta sección se ejecutan desde
`D:\Repos2\base_tauri_angular`, donde se encuentran `package.json` y
`src-tauri`. No se ejecutan desde `src`, `src-tauri` ni `scripts`.

```powershell
Set-Location D:\Repos2\base_tauri_angular
npm ci
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:build
npm run admin-recovery:build
npm run admin-recovery:verify-build
```

`desktop:build` ejecuta `scripts/build.bat`: valida contratos de escritorio y
SQL y llama a `tauri build`. Tauri ejecuta `npm run build` como
`beforeBuildCommand`; su `prebuild` valida contratos, versión y estilos. Antes
de empaquetar, `beforeBundleCommand` exige una fuente firmada válida del
recuperador. `npm run check` se mantiene como paso explícito porque añade Atomic
UI, secretos, pruebas Angular y regresiones de entrega que `build.bat` no reúne
por sí solo.

Los resultados esperados permanecen bajo `src-tauri/target/release`:

| Artefacto | Ruta o patrón |
|---|---|
| Ejecutable | `src-tauri/target/release/tauri-angular-app.exe` |
| MSI | `src-tauri/target/release/bundle/msi/HRA Modulo Operativo Tauri Beta_1.6.1_x64_<idioma>.msi` |
| NSIS | `src-tauri/target/release/bundle/nsis/HRA Modulo Operativo Tauri Beta_1.6.1_x64-setup.exe` |
| Recuperador incluido | `src-tauri/target/admin-recovery/bundle-source/HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe` |

La compilación se detiene si falta el recuperador firmado, si su identidad no
coincide con el producto o si hay más de un MSI/NSIS candidato.

## Staging

```powershell
npm run admin-recovery:stage
npm run admin-recovery:verify
npm run release:stage
npm run release:verify
```

`release:stage` usa la política `ci-unsigned` y sólo produce evidencia de control de calidad. Para una entrega institucional se usa `npm run release:stage:institutional` después de aplicar la firma autorizada. El conjunto debe incluir exactamente cuatro binarios con roles cerrados —aplicación, recuperador, MSI y NSIS—, además de SBOM, manifiesto, sumas, metadatos y recibos. La evidencia predeterminada se genera en `src-tauri/target/release-evidence`; una ruta `--output` sólo es válida dentro de `src-tauri/target`.

La salida se acepta únicamente si `release:verify` concluye en cero, las cuatro
huellas corresponden a los archivos revisados y el manifiesto fija el mismo
commit y árbol Git que la compilación. La política `ci-unsigned` nunca se publica
como producción.

## Instalación y comprobación

Se verifica firma, huellas, versión y origen. La aplicación se instala con el recuperador que pertenece al mismo paquete. La comprobación posterior utiliza una cuenta Windows desechable y ejecuta:

```powershell
npm run release:verify-installed-recovery
```

La prueba real de WinVault no se ejecuta sobre la cuenta productiva ni desde integración continua.

## Reversión

La aplicación se cierra y se conserva la evidencia del fallo. Se restaura el último paquete firmado completo; no se mezclan la aplicación de una versión y el recuperador de otra. Una reversión de binarios no autoriza revertir SQL Server y debe detenerse cuando los contratos dejaron de ser compatibles.

## Anexo consolidado: guia de despliegue

> Procedencia: `docs/recuperacion-administrativa/GUIA_DE_DESPLIEGUE.md`. El archivo de origen se retiró después de incorporar íntegramente este contenido y recalcular sus enlaces relativos.

<details>
<summary>Contenido técnico consolidado desde <code>docs/recuperacion-administrativa/GUIA_DE_DESPLIEGUE.md</code></summary>

### Metadatos del documento de origen

```yaml
title: "Guía de despliegue del recuperador administrativo"
subtitle: "Preparación, firma, empaquetado y certificación de la entrega Windows"
author: "Ing. Havel CONTRERAS TAPAHUASCO"
date: "2026-08-15"
document_status: "active"
application_version: "1.6.1"
status: "vigente"
version: "1.6.1"
audience: "Operaciones, seguridad, QA y responsables de publicación"
production_ready: false
```


### Guía de despliegue del recuperador administrativo

#### Objetivo

Esta guía establece el procedimiento para transformar el helper de recuperación
revisado en un recurso firmado, incorporarlo a los instaladores Tauri y producir
evidencia verificable de una entrega Windows. La firma, el análisis antimalware
y las pruebas en Windows limpio son controles externos que no deberán
reemplazarse por una modificación del manifiesto.

El estado vigente de la entrega QA es `productionReady=false`. La existencia de
un EXE o de un recibo local no constituye autorización para producción.

#### Roles y segregación

| Rol | Responsabilidad |
|---|---|
| Desarrollo | Produce el commit limpio, ejecuta las compuertas y genera el helper QA reproducible. |
| Seguridad o firma institucional | Firma copias verificadas mediante un certificado de código autorizado y aplica sello de tiempo. No entrega la clave privada al repositorio. |
| QA | Verifica hashes, metadatos, instalación, acceso directo, funcionamiento en cuenta desechable y ausencia de regresiones. |
| Operaciones | Promueve únicamente la entrega aprobada, conserva la evidencia y ejecuta el procedimiento de reversión cuando corresponda. |
| Revisor independiente | Comprueba la evidencia instalada y registra la aceptación fuera del mismo proceso que generó los artefactos. |

#### Estado y ubicaciones

Después de la limpieza del espacio de trabajo, no existe actualmente un EXE
principal, un MSI, un NSIS ni `src-tauri/target` dentro del repositorio. Esas
salidas deberán regenerarse desde una identidad Git limpia.

La evidencia histórica del recuperador Tauri se preservó en:

```text
D:\Repos2\_entregables_qa\recuperacion-administrativa\base-tauri-1.6.1-93e0b22\
```

Esa carpeta contiene seis archivos y permanece vinculada al commit
`93e0b22b0a55efd9ded7abf0c433714c9aded8e2`. No deberá utilizarse como fuente
del bundle de un commit posterior. La fuente institucional del bundle siempre
se prepara en:

```text
src-tauri\target\admin-recovery\bundle-source\
```

#### Prerrequisitos de publicación

Antes de iniciar la generación se deberá confirmar lo siguiente:

- El equipo de construcción utiliza Windows x64, Node.js 22, npm, Rust estable,
  MSVC, SDK de Windows y Tauri CLI fijado por `package-lock.json`.

- Las dependencias Node.js fueron instaladas mediante `npm ci`.

- Las dependencias Rust necesarias para el helper están disponibles para Cargo
  offline.

- El repositorio se encuentra limpio y el commit que se entregará ya existe.

- No se incorporaron certificados, contraseñas, tokens o rutas privadas al
  repositorio.

- La versión 1.6.1 coincide en todas las fuentes verificadas por
  `node scripts\sync-version.js --check`.

- El responsable de firma dispone de un procedimiento institucional aprobado,
  un certificado con EKU de firma de código y un servicio de sello de tiempo.

Cuando PowerShell bloquee el cargador `npm.ps1`, todos los ejemplos `npm` podrán
ejecutarse mediante `npm.cmd` sin alterar la política del equipo; por ejemplo,
`npm.cmd run check:atomic`.

#### Fase 1: compuertas previas

Se ejecutan primero las comprobaciones independientes de `node_modules`:

```powershell
npm run check:atomic
npm run check:contracts
npm run check:database-contracts
npm run check:secrets
npm run test:admin-recovery
npm run test:release
node scripts\sync-version.js --check
```

Después de `npm ci` se ejecuta el conjunto completo:

```powershell
npm run check
```

La publicación deberá detenerse ante cualquier error o cambio producido por las
compuertas en `git status --porcelain --untracked-files=all`.

#### Fase 2: construcción y revisión del helper QA

El helper se construye después del commit y con un epoch derivado del mismo
`HEAD`:

```powershell
$env:SOURCE_DATE_EPOCH = git show -s --format=%ct HEAD
npm run admin-recovery:build
npm run admin-recovery:verify-build
npm run admin-recovery:stage
npm run admin-recovery:verify
Remove-Item Env:SOURCE_DATE_EPOCH
```

El primer par de comandos genera y valida:

```text
src-tauri\target\admin-recovery\build-output\
```

El segundo par genera y valida la entrega QA cerrada:

```text
src-tauri\target\admin-recovery\review\
```

La entrega de revisión deberá contener el helper, el contrato del producto, el
recibo de construcción, el manifiesto de release, el SBOM CycloneDX 1.6 y
`SHA256SUMS.txt`. El manifiesto deberá informar firma `NotSigned`, política
`ci-unsigned` y `productionReady=false`.

#### Fase 3: firma institucional del helper

Se deberá copiar el helper QA a un área controlada, verificar su SHA-256 contra
el recibo y aplicar la firma institucional fuera del repositorio. El nombre del
archivo no deberá cambiar:

```text
HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe
```

La firma deberá cumplir simultáneamente:

- Estado Authenticode `Valid`.

- Certificado con EKU `1.3.6.1.5.5.7.3.3` para firma de código.

- Editor autorizado `Hospital Regional Ayacucho` en el certificado.

- Sello de tiempo verificable.

- `ProductVersion` 1.6.1, `ProductName` institucional y
  `OriginalFilename` idéntico al nombre versionado.

El comando exacto de firma depende del custodio institucional y no deberá
contener secretos dentro de documentación, scripts versionados o historial de
terminal compartido.

#### Fase 4: preparación de la fuente firmada del bundle

La copia firmada se vincula con la revisión física sin firma y con el `HEAD`
limpio vigente:

```powershell
npm run admin-recovery:bundle:prepare -- "D:\ruta-controlada\HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe"
npm run admin-recovery:bundle:verify
```

El primer comando prepara transaccionalmente:

```text
src-tauri\target\admin-recovery\bundle-source\
```

La carpeta contiene el helper firmado y
`bundle-source-manifest.json`. El inventario vincula el hash del helper firmado,
el hash del helper QA de origen, el recibo, el contrato del producto, el commit,
el árbol y el epoch. La configuración Tauri ejecuta la misma verificación como
`beforeBundleCommand`, por lo que el bundle falla de forma cerrada si la fuente
falta, está sin firma o diverge.

#### Fase 5: construcción de la aplicación y los instaladores

Con la fuente firmada verificada se generan la aplicación y ambos instaladores:

```powershell
npm run tauri build -- --bundles msi,nsis --ci
```

Las salidas esperadas se ubican bajo:

| Rol | Ruta esperada |
|---|---|
| Aplicación Windows | `src-tauri/target/release/tauri-angular-app.exe` |
| Recuperador | `src-tauri/target/admin-recovery/bundle-source/HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe` |
| Instalador MSI | `src-tauri/target/release/bundle/msi/HRA Modulo Operativo Tauri Beta_1.6.1_x64_<idioma>.msi` |
| Instalador NSIS | `src-tauri/target/release/bundle/nsis/HRA Modulo Operativo Tauri Beta_1.6.1_x64-setup.exe` |

El procedimiento institucional deberá asegurar que la aplicación, el helper,
el MSI y el instalador NSIS queden firmados y sellados antes de la compuerta de
entrega institucional. Cuando Tauri no aplique la firma completa conforme a la
política local, los binarios deberán pasar por el proceso externo aprobado y
volver a verificarse sin alterar sus nombres ni versiones.

#### Fase 6: evidencia exacta de cuatro binarios

La política principal admite exactamente cuatro binarios y un único ejemplar
por rol:

| Rol cerrado | Artefacto |
|---|---|
| `windows-application` | `tauri-angular-app.exe` |
| `administrative-recovery-utility` | Helper firmado y versionado |
| `msi-installer` | MSI 1.6.1 x64 con idioma |
| `setup-installer` | NSIS 1.6.1 x64 |

La evidencia institucional se genera y verifica mediante:

```powershell
npm run release:stage:institutional
npm run release:verify
```

La salida queda en:

```text
src-tauri\target\release-evidence\
```

El directorio incluye copias de los cuatro binarios, `release-manifest.json`,
`sbom.cdx.json` y `SHA256SUMS.txt`. La generación rechaza artefactos duplicados,
versiones antiguas, rutas fuera de `src-tauri/target`, enlaces, hashes
divergentes, firmas inválidas o una fuente del helper ajena al `HEAD` vigente.

La política `ci-unsigned` se reserva para CI y utiliza:

```powershell
npm run tauri build -- --bundles msi,nsis --no-sign --ci
npm run release:stage
npm run release:verify
```

Esa variante no constituye una entrega productiva.

#### Fase 7: análisis antimalware

Los cuatro binarios y la evidencia deberán analizarse mediante la herramienta
institucional aprobada. El registro deberá identificar como mínimo producto,
versión, SHA-256, motor, versión de firmas, fecha, resultado y responsable. Un
archivo puesto en cuarentena, modificado o vuelto a firmar invalida sus hashes y
obliga a regenerar la evidencia correspondiente.

El reporte no deberá contener contraseñas, credenciales de firma ni información
de Windows Credential Manager.

#### Fase 8: instalación limpia y acceso del menú Inicio

Cada instalador deberá validarse desde una instantánea limpia de Windows o una
máquina virtual equivalente. MSI y NSIS deberán probarse por separado,
restaurando el estado limpio entre casos.

La instalación deberá colocar el helper junto a la aplicación y crear
exactamente:

```text
Recuperar contraseña administrativa.lnk
```

El acceso deberá residir en el menú Inicio del usuario o del equipo, apuntar al
helper instalado exacto y no contener argumentos. La comprobación estática se
ejecuta sin abrir el PE:

```powershell
npm run release:verify-installed-recovery -- `
  -ReleaseEvidenceDirectory "D:\evidencia\release-evidence" `
  -InstallDirectory "C:\ruta\de\instalacion" `
  -ShortcutPath "C:\ruta-oficial\Recuperar contraseña administrativa.lnk" `
  -OutputPath "D:\evidencia\installed-recovery-receipt.json"
```

El recibo no se sobrescribe, conserva `productionReady=false` y requiere
revisión independiente. La ruta del acceso sólo se admite bajo
`%APPDATA%\Microsoft\Windows\Start Menu\Programs` o
`%ProgramData%\Microsoft\Windows\Start Menu\Programs`.

#### Fase 9: prueba funcional desechable

La prueba funcional deberá ejecutarse únicamente bajo una cuenta Windows
desechable y con datos no productivos:

1. Se inicia la aplicación y se crea una credencial administrativa de prueba.

2. Se cierra la aplicación y se confirma que el mutex no permanece retenido.

3. Se abre el acceso del menú Inicio sin argumentos y se reemplaza la
   contraseña por un valor de prueba que cumpla la política.

4. Se reinicia la aplicación y se confirma la autenticación con el valor nuevo
   y el rechazo del valor anterior.

5. Se confirma que ninguna credencial SQL, destino heredado o dato remoto fue
   modificado.

6. Se desinstala el producto y se comprueba la eliminación del acceso directo y
   de los archivos instalados. La limpieza de una credencial de prueba deberá
   seguir el procedimiento específico del laboratorio y no formar parte de una
   desinstalación productiva implícita.

#### Criterios de detención

La promoción deberá detenerse cuando ocurra cualquiera de las condiciones
siguientes:

- El árbol Git está sucio o la evidencia corresponde a otro commit, árbol o
  epoch.

- Falta uno de los cuatro roles o existe más de un artefacto para el mismo rol.

- Una firma no es válida, carece de sello de tiempo o no corresponde al editor
  institucional.

- El helper instalado difiere del SHA-256 de la evidencia.

- El acceso directo tiene otro nombre, ruta, destino o argumentos.

- El análisis antimalware no está aprobado.

- No se completó la prueba de cuenta desechable o la instalación y
  desinstalación limpias.

- Cualquier manifiesto continúa declarando una compuerta pendiente que el
  expediente externo no puede cerrar.

#### Reversión y conservación

Ante un fallo posterior al despliegue se deberá retirar la versión afectada
mediante el instalador correspondiente y restaurar una entrega previamente
aprobada, completa y firmada. No se deberá reemplazar solamente el helper dentro
de un directorio instalado, porque esa acción rompe la vinculación con el
instalador y la evidencia exacta de cuatro binarios.

El expediente de release deberá conservar el commit, el manifiesto, el SBOM,
`SHA256SUMS.txt`, los cuatro binarios, los reportes Authenticode y antimalware,
el recibo de instalación, el resultado funcional, la aprobación independiente
y las fechas de instalación y reversión. Los secretos y las claves privadas no
forman parte del expediente.

#### Documentos relacionados

- [Manual de usuario](MANUAL_DE_ADMINISTRACION.md)

- [Guía de desarrollo](ARQUITECTURA_BACKEND.md)

- [Contrato del producto](../../admin-recovery.product.json)

- [Decisión sobre interfaz Win32 y distribución](../decisions/ADR-016-interfaz-win32-y-distribucion-del-recuperador-1-6-1.md)

</details>
