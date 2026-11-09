import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = async path => readFile(resolve(root, path), 'utf8');

test('la GUI nativa es predeterminada y el fallback CLI permanece ligado al guard', async () => {
  const [cli, helper, nativeGui, runtime, helperManifest, product] = await Promise.all([
    source('src-tauri/src/admin_recovery_cli.rs'),
    source('src-tauri/admin-recovery/src/main.rs'),
    source('src-tauri/admin-recovery/src/native_admin_gui.rs'),
    source('src-tauri/src/admin_recovery_runtime.rs'),
    source('src-tauri/admin-recovery/Cargo.toml'),
    source('admin-recovery.product.json'),
  ]);

  assert.match(cli, /\[\] => Ok\(RecoveryInvocation::Gui\)/);
  assert.match(cli, /OsStr::new\("--reset"\)/);
  assert.match(cli, /!input_is_terminal \|\| !error_is_terminal/);
  assert.match(helper, /acquire_admin_recovery_guard\(\)/);
  assert.match(helper, /reset_local_admin_password\(&recovery_guard,/);
  assert.match(helper, /native_admin_gui::run/);
  assert.match(nativeGui, /CreateWindowExW/);
  assert.match(nativeGui, /ES_PASSWORD/);
  assert.match(nativeGui, /IsDialogMessageW/);
  assert.match(nativeGui, /EN_CHANGE/);
  assert.match(nativeGui, /&Cancelar/);
  assert.doesNotMatch(`${helper}\n${nativeGui}`, /invoke\(|tauri::command|webview|ipc|\bwry\b/i);
  assert.match(helper, /Reinicie la aplicación\./);
  assert.match(runtime, /Global\\\\HRA\.ModuloOperativoTauri\.AdminCredential\.Runtime\.v1/);
  assert.match(
    runtime,
    /pub fn reset_local_admin_password\(\s*_guard: &AdminRecoveryGuard,/,
  );
  assert.doesNotMatch(helperManifest, /tauri-angular-app|tiberius|bb8|webview|wry/i);
  assert.equal(Object.keys(JSON.parse(product)).length, 10);
});

test('application startup fails nonzero when exclusive access is unavailable', async () => {
  const library = await source('src-tauri/src/lib.rs');

  assert.match(library, /acquire_admin_application_guard\(\)/);
  assert.match(library, /unwrap_or_else\(\|error\| panic!\("\{error\}"\)\)/);
});

test('first-run bootstrap cannot overwrite and exposes no unguarded writer', async () => {
  const security = await source('src-tauri/src/security.rs');

  assert.match(
    security,
    /fn configure_new_local_admin_password\(password: &str, confirmation: &str\)/,
  );
  assert.match(security, /configure_new_local_admin_password\(&password, &confirmation\)/);
  assert.match(security, /Ok\(_\) => return Err\(ADMIN_ALREADY_CONFIGURED\.to_string\(\)\)/);
  assert.doesNotMatch(security, /pub fn configure_(?:new_)?local_admin_password/);
  assert.doesNotMatch(security, /overwrite\s*:\s*bool/);
});

test('documented source priority and credential namespaces match runtime constants', async () => {
  const [runtime, rules, readme] = await Promise.all([
    source('src-tauri/src/admin_recovery_runtime.rs'),
    source('docs/manuales/INTEGRACION_BASE_DATOS.md'),
    source('README.md'),
  ]);

  assert.match(runtime, /ADMIN_ENV_HASH: &str = "HRA_ADMIN_PASSWORD_HASH"/);
  assert.match(runtime, /LEGACY_ADMIN_ENV_HASH: &str = "HRA_TAURI_ADMIN_PASSWORD_HASH"/);
  assert.match(runtime, /ADMIN_KEYRING_SERVICE: &str = "pe\.gob\.hra\.modulo-operativo"/);
  assert.match(rules, /`HRA_ADMIN_PASSWORD_HASH` es la variable primaria/);
  assert.match(rules, /`pe\.gob\.hra\.modulo-operativo` \/ `admin-password-hash-argon2id-v1`/);
  assert.match(rules, /no supera 256 bytes en UTF-8/);
  assert.match(readme, /máximo adicional de 256 bytes en UTF-8/);
});
