const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');
const adminRecoveryProductPath = path.join(root, 'admin-recovery.product.json');
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');
const cargoLockPath = path.join(root, 'src-tauri', 'Cargo.lock');
const adminRecoveryCargoPath = path.join(
  root,
  'src-tauri',
  'admin-recovery',
  'Cargo.toml',
);
const adminRecoveryCargoLockPath = path.join(
  root,
  'src-tauri',
  'admin-recovery',
  'Cargo.lock',
);
const environmentPath = path.join(root, 'src', 'environments', 'environment.ts');
const versionComponentPath = path.join(
  root,
  'src',
  'app',
  'shared',
  'ui',
  'atoms',
  'version',
  'version.component.ts',
);
const appVersionServicePath = path.join(
  root,
  'src',
  'app',
  'shared',
  'ui',
  'services',
  'app-version.service.ts',
);
const changelogPath = path.join(root, 'CHANGELOG.md');
const nsisHooksPath = path.join(root, 'src-tauri', 'nsis', 'installer-hooks.nsh');
const wixShortcutPath = path.join(root, 'src-tauri', 'wix', 'admin-recovery-shortcut.wxs');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
const adminRecoveryProduct = JSON.parse(
  fs.readFileSync(adminRecoveryProductPath, 'utf8'),
);
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
const cargo = fs.readFileSync(cargoPath, 'utf8');
const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
const adminRecoveryCargo = fs.readFileSync(adminRecoveryCargoPath, 'utf8');
const adminRecoveryCargoLock = fs.readFileSync(adminRecoveryCargoLockPath, 'utf8');
const environment = fs.readFileSync(environmentPath, 'utf8');
const versionComponent = fs.readFileSync(versionComponentPath, 'utf8');
const appVersionService = fs.readFileSync(appVersionServicePath, 'utf8');
const changelog = fs.readFileSync(changelogPath, 'utf8');
const nsisHooks = fs.readFileSync(nsisHooksPath, 'utf8');
const wixShortcut = fs.readFileSync(wixShortcutPath, 'utf8');

const cargoVersion = cargo.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1];
const cargoLockVersion = cargoLock.match(
  /\[\[package\]\]\r?\nname = "tauri-angular-app"\r?\nversion = "([^"]+)"/,
)?.[1];
const adminRecoveryCargoVersion = adminRecoveryCargo.match(
  /^\s*version\s*=\s*"([^"]+)"/m,
)?.[1];
const adminRecoveryCargoLockVersion = adminRecoveryCargoLock.match(
  /\[\[package\]\]\r?\nname = "hra-tauri-admin-recovery"\r?\nversion = "([^"]+)"/,
)?.[1];
const environmentVersion = environment.match(/\bversion:\s*['"]([^'"]+)['"]/)?.[1];
const changelogVersion =
  changelog.match(/^version:\s*["']([^"']+)["']/m)?.[1] ??
  changelog.match(/^## \[v([^\]]+)\]/m)?.[1];
const versions = {
  'package.json': packageJson.version,
  'package-lock.json': packageLock.version,
  'package-lock.json#root': packageLock.packages?.['']?.version,
  'admin-recovery.product.json': adminRecoveryProduct.productVersion,
  'src-tauri/tauri.conf.json': tauriConf.version,
  'src-tauri/Cargo.toml': cargoVersion,
  'src-tauri/Cargo.lock#tauri-angular-app': cargoLockVersion,
  'src-tauri/admin-recovery/Cargo.toml': adminRecoveryCargoVersion,
  'src-tauri/admin-recovery/Cargo.lock#hra-tauri-admin-recovery':
    adminRecoveryCargoLockVersion,
  'src/environments/environment.ts': environmentVersion,
  'CHANGELOG.md': changelogVersion,
};

const frontendLiteralSources = {
  'src/app/shared/ui/atoms/version/version.component.ts': versionComponent,
  'src/app/shared/ui/services/app-version.service.ts': appVersionService,
};
for (const [source, content] of Object.entries(frontendLiteralSources)) {
  const literals = [...content.matchAll(/['"`](?:v)?(\d+\.\d+\.\d+)/g)].map(
    match => match[1],
  );
  if (literals.length === 0) {
    versions[source] = undefined;
    continue;
  }
  const distinct = [...new Set(literals)];
  versions[source] = distinct.length === 1 ? distinct[0] : distinct.join(',');
}

const missing = Object.entries(versions)
  .filter(([, version]) => !version)
  .map(([source]) => source);
if (missing.length > 0) {
  console.error(`[VersionCheck] Falta una versión explícita en: ${missing.join(', ')}.`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  console.error(`[VersionCheck] La versión ${packageJson.version} no cumple el formato mayor.menor.parche.`);
  process.exit(1);
}

const mismatches = Object.entries(versions)
  .filter(([, version]) => version !== packageJson.version)
  .map(([source, version]) => `${source}=${version}`);
if (mismatches.length > 0) {
  console.error(
    `[VersionCheck] Versiones desalineadas: package.json=${packageJson.version}; ` +
    `${mismatches.join('; ')}. Deben actualizarse explícitamente en el mismo cambio.`,
  );
  process.exit(1);
}

const recoveryArtifact =
  `HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-${packageJson.version}-Beta.exe`;
const recoverySource = `target/admin-recovery/bundle-source/${recoveryArtifact}`;
const productKeys = [
  'applicationId',
  'artifactName',
  'artifactRole',
  'cliFallback',
  'credentialTarget',
  'defaultInvocation',
  'interfaceMode',
  'mutexName',
  'productVersion',
  'schemaVersion',
].sort();
if (
  JSON.stringify(Object.keys(adminRecoveryProduct).sort()) !==
    JSON.stringify(productKeys) ||
  adminRecoveryProduct.artifactName !== recoveryArtifact ||
  adminRecoveryProduct.artifactRole !== 'administrative-recovery-utility' ||
  adminRecoveryProduct.interfaceMode !== 'native-win32-gui' ||
  adminRecoveryProduct.defaultInvocation !== 'gui' ||
  adminRecoveryProduct.cliFallback !== true ||
  tauriConf.bundle?.resources?.[recoverySource] !== recoveryArtifact ||
  !nsisHooks.includes(recoveryArtifact) ||
  !wixShortcut.includes(recoveryArtifact)
) {
  console.error('[VersionCheck] El recuperador o su distribución divergen del contrato raíz.');
  process.exit(1);
}

console.log(
  `[VersionCheck] Versión reproducible validada sin modificar archivos: ${packageJson.version}`,
);
