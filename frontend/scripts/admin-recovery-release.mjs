import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildSigningMetadata,
  institutionalPublisher,
  verifyManifestReleasePolicy,
} from './windows-release-policy.mjs';

export const helperProductName =
  'HRA - Módulo operativo Tauri - Recuperación administrativa (Beta)';
export const adminRecoveryDistributionPolicy = Object.freeze({
  accessLabel: 'Recuperar contraseña administrativa',
  signingRequiredForProduction: true,
});

const helperCargoTarget = 'configure_admin_password';
const helperCargoManifest = 'src-tauri/admin-recovery/Cargo.toml';
const helperCargoLock = 'src-tauri/admin-recovery/Cargo.lock';
export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const adminRecoveryRoot = join(repositoryRoot, 'src-tauri', 'target', 'admin-recovery');
const cargoTargetRoot = join(adminRecoveryRoot, 'cargo-target');
const cargoTargetFirst = join(cargoTargetRoot, 'independent-a');
const cargoTargetSecond = join(cargoTargetRoot, 'independent-b');
const buildOutput = join(adminRecoveryRoot, 'build-output');
const defaultReviewOutput = join(adminRecoveryRoot, 'review');
const versionGate = join(repositoryRoot, 'scripts', 'sync-version.js');
const receiptName = 'build-receipt.json';
const manifestName = 'release-manifest.json';
const sbomName = 'sbom.cdx.json';
const sumsName = 'SHA256SUMS.txt';
export const productManifestName = 'admin-recovery.product.json';
export const productManifestPath = join(repositoryRoot, productManifestName);
const sourceInputPaths = [
  productManifestName,
  'package.json',
  'package-lock.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
  helperCargoManifest,
  helperCargoLock,
  'src-tauri/admin-recovery/build.rs',
  'src-tauri/admin-recovery/src/main.rs',
  'src-tauri/admin-recovery/src/native_admin_gui.rs',
  'src-tauri/src/admin_recovery_cli.rs',
  'src-tauri/src/admin_recovery_runtime.rs',
  'src-tauri/src/security.rs',
  'scripts/admin-recovery-release.mjs',
  'scripts/admin-recovery-bundle-source.mjs',
  'scripts/sync-version.js',
  'scripts/verify-admin-recovery-installation.ps1',
  'scripts/verify-authenticode.ps1',
  'scripts/windows-release-policy.mjs',
  'src-tauri/nsis/installer-hooks.nsh',
  'src-tauri/tauri.conf.json',
  'src-tauri/wix/admin-recovery-shortcut.wxs',
];
const allowedHelperPackages = new Set([
  'aho-corasick',
  'argon2',
  'base64ct',
  'blake2',
  'block-buffer',
  'byteorder',
  'cfg-if',
  'cpufeatures',
  'crypto-common',
  'digest',
  'equivalent',
  'generic-array',
  'getrandom',
  'hashbrown',
  'hra-tauri-admin-recovery',
  'indexmap',
  'keyring-core',
  'libc',
  'log',
  'memchr',
  'password-hash',
  'proc-macro2',
  'quote',
  'rand_core',
  'regex',
  'regex-automata',
  'regex-syntax',
  'rpassword',
  'rtoolbox',
  'serde_core',
  'serde_derive',
  'serde_spanned',
  'subtle',
  'syn',
  'toml',
  'toml_datetime',
  'toml_parser',
  'toml_writer',
  'typenum',
  'unicode-ident',
  'version_check',
  'wasi',
  'windows_aarch64_gnullvm',
  'windows_aarch64_msvc',
  'windows_i686_gnu',
  'windows_i686_gnullvm',
  'windows_i686_msvc',
  'windows_x86_64_gnu',
  'windows_x86_64_gnullvm',
  'windows_x86_64_msvc',
  'windows-link',
  'windows-native-keyring-store',
  'windows-sys',
  'windows-targets',
  'winnow',
  'winresource',
  'zeroize',
]);
const inheritedBuildEnvironmentAllowlist = new Set([
  'ALLUSERSPROFILE',
  'APPDATA',
  'COMMONPROGRAMFILES',
  'COMMONPROGRAMFILES(X86)',
  'COMSPEC',
  'HOMEDRIVE',
  'HOMEPATH',
  'INCLUDE',
  'LIB',
  'LIBPATH',
  'LOCALAPPDATA',
  'NUMBER_OF_PROCESSORS',
  'OS',
  'PATH',
  'PATHEXT',
  'PROCESSOR_ARCHITECTURE',
  'PROCESSOR_IDENTIFIER',
  'PROCESSOR_LEVEL',
  'PROCESSOR_REVISION',
  'PROGRAMDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'PUBLIC',
  'SYSTEMDRIVE',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'UCRTCONTENTROOT',
  'UNIVERSALCRTSKDIR',
  'USERDOMAIN',
  'USERNAME',
  'USERPROFILE',
  'VCTOOLSINSTALLDIR',
  'VCTOOLSVERSION',
  'WINDIR',
  'WINDOWSSDKDIR',
  'WINDOWSSDKLIBVERSION',
  'WINDOWSSDKVERSION',
]);
const exactRustFlags = [
  '-Cdebuginfo=0',
  '-Cstrip=symbols',
  '-Clink-arg=/Brepro',
  '-Clink-arg=/DEBUG:NONE',
  '--remap-path-prefix=<repository-root>=/source-tree',
  '--remap-path-prefix=<user-profile>=/user-profile',
  '--remap-path-prefix=<cargo-home>=/cargo-home',
  '--remap-path-prefix=<rustup-home>=/rustup-home',
  '--remap-path-prefix=<rust-toolchain>=/rust-toolchain',
  '--remap-path-prefix=<cargo-target>=/cargo-target',
];
const independentCargoTargetPaths = [
  'src-tauri/target/admin-recovery/cargo-target/independent-a',
  'src-tauri/target/admin-recovery/cargo-target/independent-b',
];

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function environmentAllowlistDigest() {
  return sha256(Buffer.from(
    [...inheritedBuildEnvironmentAllowlist].sort().join('\n') + '\n',
    'utf8',
  ));
}

function collectStringValues(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, strings);
  } else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) {
      strings.push(name);
      collectStringValues(item, strings);
    }
  }
  return strings;
}

export function validateNoLocalIdentityDisclosure(value, label) {
  const localIdentityTokens = [process.env.USERPROFILE, process.env.USERNAME]
    .filter(token => typeof token === 'string' && token.length >= 3)
    .map(token => token.toLowerCase());
  const disclosure = collectStringValues(value).find(candidate => {
    const normalized = candidate.toLowerCase();
    return (
      /^[a-z]:[\\/]/i.test(candidate) ||
      /^\\\\/.test(candidate) ||
      /(?:^|[\\/])users[\\/][^\\/]+/i.test(candidate) ||
      /(?:^|[\\/])home[\\/][^\\/]+/i.test(candidate) ||
      /\buserprofile\b|\busername\b/i.test(candidate) ||
      localIdentityTokens.some(token => normalized.includes(token))
    );
  });
  if (disclosure !== undefined) {
    throw new Error(label + ' divulga una ruta local o identidad del operador.');
  }
  return true;
}

export function canonicalJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function writeJson(path, value) {
  writeFileSync(path, canonicalJson(value), 'utf8');
}

function runChecked(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: options.inherit ? 'inherit' : undefined,
  });
  if (result.status !== 0) {
    const detail = options.inherit
      ? 'consulte la salida anterior'
      : (result.stderr || result.stdout || 'sin diagnostico').trim();
    throw new Error(
      'Fallo el comando cerrado ' + command + ' ' + arguments_.join(' ') + ': ' + detail,
    );
  }
  return (result.stdout ?? '').trim();
}

export function validateBuildEnvironment(environment) {
  const forbiddenExact = new Set([
    'CARGO_BUILD_RUSTC',
    'CARGO_BUILD_RUSTC_WRAPPER',
    'CARGO_BUILD_RUSTC_WORKSPACE_WRAPPER',
    'CARGO_BUILD_TARGET',
    'CARGO_ENCODED_RUSTFLAGS',
    'RUSTC',
    'RUSTC_WRAPPER',
    'RUSTC_WORKSPACE_WRAPPER',
    'RUSTDOCFLAGS',
    'RUSTFLAGS',
    'RUSTUP_TOOLCHAIN',
  ]);
  const rejected = Object.keys(environment)
    .map(name => name.toUpperCase())
    .filter(
      name =>
        forbiddenExact.has(name) ||
        name.startsWith('CARGO_PROFILE_') ||
        name.startsWith('CARGO_TARGET_'),
    )
    .sort();
  if (rejected.length > 0) {
    throw new Error(
      'El entorno contiene overrides de compilación prohibidos: ' + rejected.join(', '),
    );
  }
  return true;
}

export function sanitizedCargoEnvironment(
  inherited,
  { sourceDateEpoch, targetDirectory, rustcPath },
) {
  validateBuildEnvironment(inherited);
  const userProfile = inherited.USERPROFILE;
  if (
    typeof userProfile !== 'string' ||
    !isAbsolute(userProfile) ||
    /[=\u0000-\u001f]/.test(userProfile) ||
    !isAbsolute(targetDirectory) ||
    !isAbsolute(rustcPath)
  ) {
    throw new Error('El build auxiliar no puede resolver prefijos locales seguros.');
  }
  const resolvedRustc = resolve(rustcPath);
  const toolchainRoot = dirname(dirname(resolvedRustc));
  const rustupHome = dirname(dirname(toolchainRoot));
  const remapPairs = [
    [repositoryRoot, '/source-tree'],
    [resolve(userProfile), '/user-profile'],
    [resolve(userProfile, '.cargo'), '/cargo-home'],
    [rustupHome, '/rustup-home'],
    [toolchainRoot, '/rust-toolchain'],
    [resolve(targetDirectory), '/cargo-target'],
  ];
  const resolvedRemaps = remapPairs
    .sort(([left], [right]) => left.length - right.length)
    .map(([source, destination]) => `--remap-path-prefix=${source}=${destination}`);
  const resolvedRustFlags = [
    '-Cdebuginfo=0',
    '-Cstrip=symbols',
    '-Clink-arg=/Brepro',
    '-Clink-arg=/DEBUG:NONE',
    ...resolvedRemaps,
  ];
  const environment = {};
  for (const [name, value] of Object.entries(inherited)) {
    if (
      value !== undefined &&
      inheritedBuildEnvironmentAllowlist.has(name.toUpperCase())
    ) {
      environment[name] = value;
    }
  }
  return {
    ...environment,
    CARGO_INCREMENTAL: '0',
    CARGO_ENCODED_RUSTFLAGS: resolvedRustFlags.join('\u001f'),
    CARGO_NET_OFFLINE: 'true',
    CARGO_TARGET_DIR: targetDirectory,
    RUSTC: rustcPath,
    SOURCE_DATE_EPOCH: String(sourceDateEpoch),
  };
}

function gitOutput(...arguments_) {
  return runChecked('git', arguments_);
}

function assertNoLinkedComponents(path, label) {
  const candidate = resolve(path);
  const relation = relative(repositoryRoot, candidate);
  if (relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(label + ' debe permanecer dentro del repositorio.');
  }
  let current = repositoryRoot;
  for (const segment of relation.split(/[\\/]+/).filter(Boolean)) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(label + ' no admite enlaces simbolicos ni junctions.');
    }
  }
  return candidate;
}

export function assertAdminRecoveryOutputPath(path) {
  const candidate = resolve(path);
  const relation = relative(adminRecoveryRoot, candidate);
  if (relation === '' || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(
      'La salida debe ser un subdirectorio de src-tauri/target/admin-recovery/.',
    );
  }
  return assertNoLinkedComponents(candidate, 'La salida de recuperacion administrativa');
}

function resolveOutputFile(output, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) {
    throw new Error('La entrega contiene una ruta invalida.');
  }
  const candidate = resolve(output, path);
  const relation = relative(output, candidate);
  if (relation === '' || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error('La entrega contiene una ruta fuera de su salida: ' + path);
  }
  return assertNoLinkedComponents(candidate, 'La ruta de entrega');
}

export function validateSourceDateEpoch(value, commitEpoch) {
  if (!/^[1-9]\d*$/.test(value ?? '')) {
    throw new Error('SOURCE_DATE_EPOCH debe ser un entero positivo explicito.');
  }
  const epoch = Number(value);
  if (!Number.isSafeInteger(epoch) || epoch !== commitEpoch) {
    throw new Error(
      'SOURCE_DATE_EPOCH debe coincidir exactamente con la fecha Unix del commit HEAD.',
    );
  }
  return epoch;
}

function readSourceIdentity() {
  const status = gitOutput('status', '--porcelain=v1', '--untracked-files=all');
  if (status !== '') {
    throw new Error(
      'La construccion exige un arbol de trabajo limpio; primero deben confirmarse los cambios.',
    );
  }
  const commitEpoch = Number(gitOutput('show', '-s', '--format=%ct', 'HEAD'));
  const sourceDateEpoch = validateSourceDateEpoch(
    process.env.SOURCE_DATE_EPOCH,
    commitEpoch,
  );
  return {
    commit: gitOutput('rev-parse', 'HEAD'),
    tree: gitOutput('rev-parse', 'HEAD^{tree}'),
    object_format: gitOutput('rev-parse', '--show-object-format'),
    commit_epoch: commitEpoch,
    source_date_epoch: sourceDateEpoch,
    clean: true,
  };
}

function assertSameIdentity(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error('La identidad Git cambio durante la operacion.');
  }
}

function readProjectVersion() {
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
    throw new Error('La version del proyecto no cumple mayor.menor.parche.');
  }
  return packageJson.version;
}

export function validateProductManifest(document, version) {
  const expected = {
    applicationId: 'com.havelcontreras.base-tauri-angular',
    artifactName:
      'HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-' +
      version +
      '-Beta.exe',
    artifactRole: 'administrative-recovery-utility',
    cliFallback: true,
    credentialTarget: {
      account: 'admin-password-hash-argon2id-v1',
      service: 'pe.gob.hra.modulo-operativo',
    },
    defaultInvocation: 'gui',
    interfaceMode: 'native-win32-gui',
    mutexName: 'Global\\HRA.ModuloOperativoTauri.AdminCredential.Runtime.v1',
    productVersion: version,
    schemaVersion: 2,
  };
  if (canonicalJson(document) !== canonicalJson(expected)) {
    throw new Error(
      'admin-recovery.product.json diverge del contrato común del producto Beta.',
    );
  }
  return Object.freeze({ ...document });
}

export function loadProductManifest(version) {
  const content = readFileSync(productManifestPath);
  const document = JSON.parse(content.toString('utf8'));
  if (content.toString('utf8') !== canonicalJson(document)) {
    throw new Error('admin-recovery.product.json no conserva JSON canónico.');
  }
  return Object.freeze({
    ...validateProductManifest(document, version),
    filename: productManifestName,
    sha256: sha256(content),
  });
}

function validateVersionSources() {
  runChecked(process.execPath, [versionGate, '--check']);
  const version = readProjectVersion();
  loadProductManifest(version);
  return version;
}

function sourceInputRecords() {
  return sourceInputPaths.map((path) => {
    const absolutePath = join(repositoryRoot, path);
    if (!existsSync(absolutePath)) {
      throw new Error('Falta la entrada de origen requerida: ' + path);
    }
    return { path, sha256: sha256File(absolutePath) };
  });
}

export function helperArtifactName(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('La version del helper no cumple mayor.menor.parche.');
  }
  return loadProductManifest(version).artifactName;
}

export function cargoBuildArguments() {
  return [
    'build',
    '--locked',
    '--offline',
    '--release',
    '--manifest-path',
    helperCargoManifest,
    '--bin',
    helperCargoTarget,
  ];
}

export function cargoMetadataArguments() {
  return [
    'metadata',
    '--locked',
    '--offline',
    '--filter-platform',
    'x86_64-pc-windows-msvc',
    '--manifest-path',
    helperCargoManifest,
    '--format-version',
    '1',
  ];
}

export function inspectHelperCargoLock(lockText) {
  const packages = [...lockText.matchAll(/^name = "([^"]+)"$/gm)]
    .map(match => match[1]);
  const forbidden = [
    'bb8',
    'bb8-tiberius',
    'opentls',
    'openssl',
    'openssl-sys',
    'tauri',
    'tauri-angular-app',
    'tiberius',
    'webview2-com',
    'webview2-com-sys',
    'wry',
  ].filter(name => packages.includes(name));
  if (forbidden.length > 0) {
    throw new Error(
      'El lock auxiliar contiene dependencias ajenas a la recuperación: ' +
        forbidden.join(', '),
    );
  }
  const unexpected = [...new Set(packages)]
    .filter(name => !allowedHelperPackages.has(name))
    .sort();
  if (unexpected.length > 0) {
    throw new Error(
      'El lock auxiliar contiene componentes fuera de la lista permitida: ' +
        unexpected.join(', '),
    );
  }
  if (!packages.includes('hra-tauri-admin-recovery')) {
    throw new Error('El lock auxiliar no contiene el paquete del recuperador.');
  }
  return {
    lockfile: helperCargoLock,
    component_count: new Set(packages).size,
    allowlist_count: allowedHelperPackages.size,
    forbidden_components: [],
    application_crate_dependency: false,
  };
}

function readHelperDependencyBoundary() {
  return inspectHelperCargoLock(
    readFileSync(join(repositoryRoot, helperCargoLock), 'utf8'),
  );
}

function readCString(content, offset) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= content.length) {
    throw new Error('El PE contiene una cadena importada fuera de rango.');
  }
  let end = offset;
  while (end < content.length && content[end] !== 0) end += 1;
  if (end === content.length) {
    throw new Error('El PE contiene una cadena importada sin terminador.');
  }
  return content.subarray(offset, end).toString('ascii');
}

function peImportNames(content, peOffset, sections, optionalMagic) {
  const optionalOffset = peOffset + 24;
  const optionalSize = content.readUInt16LE(peOffset + 20);
  const sectionOffset = optionalOffset + optionalSize;
  const directoriesOffset = optionalOffset + (optionalMagic === 0x020b ? 112 : 96);
  if (directoriesOffset + 8 * 14 > sectionOffset || sectionOffset + sections * 40 > content.length) {
    throw new Error('El PE no contiene directorios o secciones completas.');
  }
  const sectionRecords = [];
  for (let index = 0; index < sections; index += 1) {
    const offset = sectionOffset + index * 40;
    sectionRecords.push({
      virtualSize: content.readUInt32LE(offset + 8),
      virtualAddress: content.readUInt32LE(offset + 12),
      rawSize: content.readUInt32LE(offset + 16),
      rawOffset: content.readUInt32LE(offset + 20),
    });
  }
  const rvaToOffset = rva => {
    if (rva === 0) return undefined;
    const section = sectionRecords.find(record => {
      const span = Math.max(record.virtualSize, record.rawSize);
      return rva >= record.virtualAddress && rva < record.virtualAddress + span;
    });
    if (!section) throw new Error('El PE contiene un RVA importado fuera de secciones.');
    const offset = section.rawOffset + (rva - section.virtualAddress);
    if (offset >= content.length) {
      throw new Error('El PE contiene un RVA importado fuera del archivo.');
    }
    return offset;
  };
  const imports = new Set();
  const importRva = content.readUInt32LE(directoriesOffset + 8);
  const importSize = content.readUInt32LE(directoriesOffset + 12);
  if (importRva !== 0 && importSize !== 0) {
    const start = rvaToOffset(importRva);
    const limit = Math.min(Math.floor(importSize / 20) + 1, 4096);
    for (let index = 0; index < limit; index += 1) {
      const descriptor = start + index * 20;
      if (descriptor + 20 > content.length) {
        throw new Error('El PE contiene un descriptor de importación truncado.');
      }
      const empty = content.subarray(descriptor, descriptor + 20).every(byte => byte === 0);
      if (empty) break;
      const nameRva = content.readUInt32LE(descriptor + 12);
      imports.add(readCString(content, rvaToOffset(nameRva)));
    }
  }
  return [...imports].sort((left, right) => left.localeCompare(right, 'en', {
    sensitivity: 'base',
  }));
}

function forbiddenPeImports(imports) {
  return imports.filter(name =>
    /^(?:webview2loader|ws2_32|odbc32|sqlncli\d*|winhttp|wininet)\.dll$/i.test(name),
  );
}

function peDebugEvidence(content, peOffset, sections, optionalMagic) {
  const coffOffset = peOffset + 4;
  const symbolTableOffset = content.readUInt32LE(coffOffset + 8);
  const symbolCount = content.readUInt32LE(coffOffset + 12);
  const optionalSize = content.readUInt16LE(coffOffset + 16);
  const optionalOffset = coffOffset + 20;
  const sectionOffset = optionalOffset + optionalSize;
  const directoriesOffset = optionalOffset + (optionalMagic === 0x020b ? 112 : 96);
  const debugDirectoryOffset = directoriesOffset + 6 * 8;
  if (
    debugDirectoryOffset + 8 > sectionOffset ||
    sectionOffset + sections * 40 > content.length
  ) {
    throw new Error('El PE no contiene el directorio de depuraci\u00f3n o las secciones completas.');
  }
  const sectionRecords = [];
  for (let index = 0; index < sections; index += 1) {
    const offset = sectionOffset + index * 40;
    const rawName = content.subarray(offset, offset + 8);
    const terminator = rawName.indexOf(0);
    sectionRecords.push({
      name: rawName.subarray(0, terminator < 0 ? rawName.length : terminator).toString('ascii'),
      virtualSize: content.readUInt32LE(offset + 8),
      virtualAddress: content.readUInt32LE(offset + 12),
      rawSize: content.readUInt32LE(offset + 16),
      rawOffset: content.readUInt32LE(offset + 20),
    });
  }
  const debugRva = content.readUInt32LE(debugDirectoryOffset);
  const debugSize = content.readUInt32LE(debugDirectoryOffset + 4);
  if ((debugRva === 0) !== (debugSize === 0)) {
    throw new Error('El directorio de depuraci\u00f3n PE es inconsistente.');
  }
  const debugTypes = [];
  if (debugSize > 0) {
    if (debugSize % 28 !== 0) {
      throw new Error('El directorio de depuraci\u00f3n PE tiene un tama\u00f1o inv\u00e1lido.');
    }
    const section = sectionRecords.find(record => {
      const span = Math.max(record.virtualSize, record.rawSize);
      return debugRva >= record.virtualAddress && debugRva < record.virtualAddress + span;
    });
    if (!section) {
      throw new Error('El directorio de depuraci\u00f3n PE no pertenece a una secci\u00f3n.');
    }
    const rawOffset = section.rawOffset + (debugRva - section.virtualAddress);
    if (rawOffset + debugSize > content.length) {
      throw new Error('El directorio de depuraci\u00f3n PE est\u00e1 truncado.');
    }
    for (let offset = rawOffset; offset < rawOffset + debugSize; offset += 28) {
      debugTypes.push(content.readUInt32LE(offset + 12));
    }
  }
  return {
    codeviewEntries: debugTypes.filter(type => type === 2).length,
    debugSize,
    debugTypes,
    resourceSection: sectionRecords.some(record => record.name === '.rsrc'),
    symbolCount,
    symbolTableOffset,
  };
}

function containsLocalBuildPath(content) {
  const evenLength = content.length - (content.length % 2);
  const shiftedLength = content.length - 1 - ((content.length - 1) % 2);
  const textViews = [
    content.toString('latin1'),
    content.subarray(0, evenLength).toString('utf16le'),
    content.subarray(1, 1 + shiftedLength).toString('utf16le'),
  ];
  const localPrefixes = [repositoryRoot, process.env.USERPROFILE]
    .filter(value => typeof value === 'string' && value.length >= 3)
    .map(value => value.toLowerCase());
  return textViews.some(text => {
    const normalized = text.toLowerCase();
    return (
      /[a-z]:[\\/]users[\\/]/i.test(text) ||
      /(?:^|[\\/])home[\\/]/i.test(text) ||
      /(?:^|[\\/])\.cargo[\\/](?:git|registry)(?:[\\/]|$)/i.test(text) ||
      /(?:^|[\\/])\.rustup[\\/](?:downloads|tmp|toolchains)(?:[\\/]|$)/i.test(text) ||
      localPrefixes.some(prefix => normalized.includes(prefix))
    );
  });
}

export function inspectPeBuffer(content) {
  if (!Buffer.isBuffer(content) || content.length < 0x100) {
    throw new Error('El helper no contiene una cabecera PE completa.');
  }
  if (content[0] !== 0x4d || content[1] !== 0x5a) {
    throw new Error('El helper no contiene la firma DOS MZ.');
  }
  const peOffset = content.readUInt32LE(0x3c);
  if (peOffset < 0x40 || peOffset + 26 > content.length) {
    throw new Error('El helper contiene un desplazamiento PE invalido.');
  }
  if (
    content[peOffset] !== 0x50 ||
    content[peOffset + 1] !== 0x45 ||
    content[peOffset + 2] !== 0 ||
    content[peOffset + 3] !== 0
  ) {
    throw new Error('El helper no contiene la firma PE esperada.');
  }
  const machine = content.readUInt16LE(peOffset + 4);
  const sections = content.readUInt16LE(peOffset + 6);
  const characteristics = content.readUInt16LE(peOffset + 22);
  const optionalMagic = content.readUInt16LE(peOffset + 24);
  if (machine !== 0x8664 || optionalMagic !== 0x020b) {
    throw new Error('El helper debe ser un ejecutable PE32+ AMD64.');
  }
  if (sections < 1 || (characteristics & 0x0002) === 0) {
    throw new Error('La cabecera PE no declara un ejecutable valido.');
  }
  const optionalOffset = peOffset + 24;
  if (optionalOffset + 70 > content.length) {
    throw new Error('El helper no contiene el encabezado opcional PE completo.');
  }
  const subsystemCode = content.readUInt16LE(optionalOffset + 68);
  if (subsystemCode !== 2) {
    throw new Error('El helper debe usar el subsistema WINDOWS_GUI.');
  }
  const debug = peDebugEvidence(content, peOffset, sections, optionalMagic);
  if (debug.symbolTableOffset !== 0 || debug.symbolCount !== 0) {
    throw new Error('El PE conserva una tabla de s\u00edmbolos COFF no permitida.');
  }
  const forbiddenDebugTypes = debug.debugTypes.filter(type => type !== 13 && type !== 16);
  if (forbiddenDebugTypes.length > 0) {
    throw new Error(
      'El PE conserva registros de depuraci\u00f3n no permitidos: ' +
        forbiddenDebugTypes.join(', ') +
        '.',
    );
  }
  if (!debug.resourceSection) {
    throw new Error('El PE no contiene la secci\u00f3n de recursos requerida.');
  }
  const imports = peImportNames(content, peOffset, sections, optionalMagic);
  const forbiddenImports = forbiddenPeImports(imports);
  if (forbiddenImports.length > 0) {
    throw new Error(
      'El helper importa una superficie ajena a la recuperación: ' +
        forbiddenImports.join(', '),
    );
  }
  if (containsLocalBuildPath(content)) {
    throw new Error('El helper contiene una ruta local o identidad de compilación.');
  }
  return {
    format: 'PE32+',
    machine: 'AMD64',
    machine_code: '0x8664',
    subsystem: 'WINDOWS_GUI',
    subsystem_code: subsystemCode,
    sections,
    executable_image: true,
    codeview_debug_entries: debug.codeviewEntries,
    coff_symbol_count: debug.symbolCount,
    debug_directory_size: debug.debugSize,
    debug_directory_types: debug.debugTypes,
    imports,
    forbidden_imports: [],
    local_build_paths_absent: true,
    resource_section: '.rsrc',
    symbols_stripped: true,
  };
}

function inspectPeFile(path) {
  return inspectPeBuffer(readFileSync(path));
}

function resolveToolchain() {
  const rustcPath = runChecked('rustup', ['which', 'rustc']);
  const cargoPath = runChecked('rustup', ['which', 'cargo']);
  if (
    !isAbsolute(rustcPath) ||
    !isAbsolute(cargoPath) ||
    !existsSync(rustcPath) ||
    !existsSync(cargoPath)
  ) {
    throw new Error('Rustup no resolvió ejecutables absolutos para rustc y cargo.');
  }
  const rustcVerbose = runChecked(rustcPath, ['--version', '--verbose']);
  const host = rustcVerbose.match(/^host:\s*(.+)$/m)?.[1];
  if (host !== 'x86_64-pc-windows-msvc') {
    throw new Error(
      'El helper distribuible exige el host x86_64-pc-windows-msvc; actual=' +
        (host ?? 'desconocido') +
        '.',
    );
  }
  const cargoVersion = runChecked(cargoPath, ['--version']);
  return {
    evidence: {
      active_toolchain: runChecked('rustup', ['show', 'active-toolchain']),
      rustc_verbose: rustcVerbose.split(/\r?\n/),
      cargo_version: cargoVersion,
      host,
      resolution_policy: {
        provider: 'rustup-active-toolchain',
        absolute_paths_recorded: false,
        executables_pinned_by_sha256: true,
      },
      executables: {
        rustc: {
          name: basename(rustcPath),
          version: rustcVerbose.split(/\r?\n/)[0],
          sha256: sha256File(rustcPath),
        },
        cargo: {
          name: basename(cargoPath),
          version: cargoVersion,
          sha256: sha256File(cargoPath),
        },
      },
    },
    paths: { rustc: rustcPath, cargo: cargoPath },
  };
}

export function buildReceipt({
  version,
  identity,
  artifactName,
  artifactContent,
  pe,
  signing,
  toolchain,
  sourceInputs,
  reproducibility,
}) {
  const product = loadProductManifest(version);
  return {
    schema_version: 1,
    interface_mode: product.interfaceMode,
    cli_fallback: product.cliFallback,
    default_invocation: product.defaultInvocation,
    product_contract: {
      application_id: product.applicationId,
      artifact_name: product.artifactName,
      artifact_role: product.artifactRole,
      credential_target: product.credentialTarget,
      filename: product.filename,
      mutex_name: product.mutexName,
      sha256: product.sha256,
    },
    project: {
      identifier: 'com.havelcontreras.base-tauri-angular.admin-recovery',
      name: 'base_tauri_angular-admin-recovery',
      product_name: helperProductName,
      publisher: institutionalPublisher,
      release_channel: 'beta',
      version,
    },
    source_control: identity,
    source_inputs: sourceInputs,
    build: {
      target: 'x86_64-pc-windows-msvc',
      profile: 'release',
      cargo_target: helperCargoTarget,
      cargo_target_dir: 'src-tauri/target/admin-recovery/cargo-target',
      command: ['cargo', ...cargoBuildArguments()],
      environment: {
        CARGO_INCREMENTAL: '0',
        CARGO_ENCODED_RUSTFLAGS: exactRustFlags.join('\u001f'),
        CARGO_NET_OFFLINE: 'true',
        SOURCE_DATE_EPOCH: String(identity.source_date_epoch),
      },
      environment_policy: {
        inherited_allowlist_count: inheritedBuildEnvironmentAllowlist.size,
        inherited_allowlist_sha256: environmentAllowlistDigest(),
        local_identity_values_recorded: false,
        cargo_overrides_rejected: true,
        exact_rustflags: exactRustFlags,
        source_path_remapping: {
          enabled: true,
          absolute_prefixes_recorded: false,
          aliases: [
            '/cargo-home',
            '/cargo-target',
            '/rust-toolchain',
            '/rustup-home',
            '/source-tree',
            '/user-profile',
          ],
        },
        rustc_pinned_by_path: true,
      },
      dependency_boundary: readHelperDependencyBoundary(),
      reproducibility,
      excludes_application_binary: true,
      excludes_installers: true,
    },
    toolchain,
    artifact: {
      path: artifactName,
      size: artifactContent.length,
      sha256: sha256(artifactContent),
      media_type: 'application/vnd.microsoft.portable-executable',
    },
    pe,
    signing,
  };
}

export function validateReceiptStructure(receipt) {
  if (receipt?.schema_version !== 1) {
    throw new Error('El recibo de construccion no cumple el esquema 1.');
  }
  if (
    receipt.project?.identifier !==
      'com.havelcontreras.base-tauri-angular.admin-recovery' ||
    receipt.project?.name !== 'base_tauri_angular-admin-recovery' ||
    receipt.project?.product_name !== helperProductName ||
    receipt.project?.publisher !== institutionalPublisher ||
    receipt.project?.release_channel !== 'beta' ||
    !/^\d+\.\d+\.\d+$/.test(receipt.project?.version ?? '')
  ) {
    throw new Error('El recibo no conserva la identidad del producto auxiliar.');
  }
  const product = loadProductManifest(receipt.project.version);
  if (
    receipt.interface_mode !== product.interfaceMode ||
    receipt.cli_fallback !== product.cliFallback ||
    receipt.default_invocation !== product.defaultInvocation ||
    canonicalJson(receipt.product_contract) !== canonicalJson({
      application_id: product.applicationId,
      artifact_name: product.artifactName,
      artifact_role: product.artifactRole,
      credential_target: product.credentialTarget,
      filename: product.filename,
      mutex_name: product.mutexName,
      sha256: product.sha256,
    })
  ) {
    throw new Error('El recibo diverge del manifiesto raíz del recuperador.');
  }
  if (
    !/^[0-9a-f]{40}$/.test(receipt.source_control?.commit ?? '') ||
    !/^[0-9a-f]{40}$/.test(receipt.source_control?.tree ?? '') ||
    receipt.source_control?.object_format !== 'sha1' ||
    receipt.source_control?.clean !== true
  ) {
    throw new Error('El recibo no contiene una identidad Git SHA-1 limpia.');
  }
  validateSourceDateEpoch(
    String(receipt.source_control.source_date_epoch),
    receipt.source_control.commit_epoch,
  );
  if (
    receipt.build?.target !== 'x86_64-pc-windows-msvc' ||
    receipt.build?.profile !== 'release' ||
    receipt.build?.cargo_target !== helperCargoTarget ||
    receipt.build?.cargo_target_dir !==
      'src-tauri/target/admin-recovery/cargo-target' ||
    JSON.stringify(receipt.build?.command) !==
      JSON.stringify(['cargo', ...cargoBuildArguments()]) ||
    JSON.stringify(receipt.build?.environment) !==
      JSON.stringify({
        CARGO_INCREMENTAL: '0',
        CARGO_ENCODED_RUSTFLAGS: exactRustFlags.join('\u001f'),
        CARGO_NET_OFFLINE: 'true',
        SOURCE_DATE_EPOCH: String(receipt.source_control.source_date_epoch),
      }) ||
    receipt.build?.environment_policy?.cargo_overrides_rejected !== true ||
    JSON.stringify(receipt.build?.environment_policy?.exact_rustflags) !==
      JSON.stringify(exactRustFlags) ||
    receipt.build?.environment_policy?.source_path_remapping?.enabled !== true ||
    receipt.build?.environment_policy?.source_path_remapping
      ?.absolute_prefixes_recorded !== false ||
    JSON.stringify(
      receipt.build?.environment_policy?.source_path_remapping?.aliases,
    ) !== JSON.stringify([
      '/cargo-home',
      '/cargo-target',
      '/rust-toolchain',
      '/rustup-home',
      '/source-tree',
      '/user-profile',
    ]) ||
    receipt.build?.environment_policy?.rustc_pinned_by_path !== true ||
    receipt.build?.environment_policy?.inherited_allowlist_count !==
      inheritedBuildEnvironmentAllowlist.size ||
    receipt.build?.environment_policy?.inherited_allowlist_sha256 !==
      environmentAllowlistDigest() ||
    receipt.build?.environment_policy?.local_identity_values_recorded !== false ||
    receipt.build?.dependency_boundary?.lockfile !== helperCargoLock ||
    receipt.build?.dependency_boundary?.application_crate_dependency !== false ||
    receipt.build?.dependency_boundary?.forbidden_components?.length !== 0 ||
    !Number.isSafeInteger(receipt.build?.dependency_boundary?.component_count) ||
    receipt.build.dependency_boundary.component_count < 1 ||
    receipt.build?.dependency_boundary?.allowlist_count !== allowedHelperPackages.size ||
    receipt.build?.reproducibility?.independent_builds !== 2 ||
    receipt.build?.reproducibility?.clean_target_root !== true ||
    JSON.stringify(receipt.build?.reproducibility?.target_directories) !==
      JSON.stringify(independentCargoTargetPaths) ||
    receipt.build?.reproducibility?.bit_for_bit !== true ||
    receipt.build?.reproducibility?.sha256?.length !== 2 ||
    receipt.build.reproducibility.sha256[0] !== receipt.build.reproducibility.sha256[1] ||
    !receipt.build.reproducibility.sha256.every(digest => /^[0-9a-f]{64}$/.test(digest)) ||
    receipt.build?.excludes_application_binary !== true ||
    receipt.build?.excludes_installers !== true ||
    typeof receipt.toolchain?.active_toolchain !== 'string' ||
    receipt.toolchain.active_toolchain.length < 1 ||
    !Array.isArray(receipt.toolchain?.rustc_verbose) ||
    !receipt.toolchain.rustc_verbose.some(line => /^rustc \d+\.\d+\.\d+/.test(line)) ||
    !/^cargo \d+\.\d+\.\d+/.test(receipt.toolchain?.cargo_version ?? '') ||
    receipt.toolchain?.host !== 'x86_64-pc-windows-msvc' ||
    receipt.toolchain?.resolution_policy?.provider !== 'rustup-active-toolchain' ||
    receipt.toolchain?.resolution_policy?.absolute_paths_recorded !== false ||
    receipt.toolchain?.resolution_policy?.executables_pinned_by_sha256 !== true ||
    receipt.toolchain?.executables?.rustc?.name !== 'rustc.exe' ||
    receipt.toolchain?.executables?.cargo?.name !== 'cargo.exe' ||
    receipt.toolchain?.executables?.rustc?.version !== receipt.toolchain.rustc_verbose[0] ||
    receipt.toolchain?.executables?.cargo?.version !== receipt.toolchain.cargo_version ||
    !/^[0-9a-f]{64}$/.test(receipt.toolchain?.executables?.rustc?.sha256 ?? '') ||
    !/^[0-9a-f]{64}$/.test(receipt.toolchain?.executables?.cargo?.sha256 ?? '')
  ) {
    throw new Error('El recibo no conserva la frontera cerrada de compilacion.');
  }
  validateNoLocalIdentityDisclosure(receipt, 'El recibo');
  if (
    receipt.artifact?.path !== helperArtifactName(receipt.project.version) ||
    !/^[0-9a-f]{64}$/.test(receipt.artifact?.sha256 ?? '') ||
    !Number.isSafeInteger(receipt.artifact?.size) ||
    receipt.artifact.size <= 0 ||
    receipt.build?.reproducibility?.sha256?.[0] !== receipt.artifact.sha256
  ) {
    throw new Error('El recibo no contiene una huella de artefacto valida.');
  }
  if (
    receipt.pe?.format !== 'PE32+' ||
    receipt.pe?.machine !== 'AMD64' ||
    receipt.pe?.subsystem !== 'WINDOWS_GUI' ||
    receipt.pe?.subsystem_code !== 2 ||
    receipt.pe?.executable_image !== true ||
    receipt.pe?.codeview_debug_entries !== 0 ||
    receipt.pe?.coff_symbol_count !== 0 ||
    !Number.isSafeInteger(receipt.pe?.debug_directory_size) ||
    receipt.pe.debug_directory_size < 0 ||
    !Array.isArray(receipt.pe?.debug_directory_types) ||
    receipt.pe.debug_directory_types.some(type => type !== 13 && type !== 16) ||
    receipt.pe?.local_build_paths_absent !== true ||
    receipt.pe?.resource_section !== '.rsrc' ||
    receipt.pe?.symbols_stripped !== true ||
    !Array.isArray(receipt.pe?.imports) ||
    receipt.pe?.forbidden_imports?.length !== 0 ||
    forbiddenPeImports(receipt.pe.imports).length !== 0
  ) {
    throw new Error('El recibo no acredita un PE32+ AMD64 ejecutable.');
  }
  if (
    receipt.signing?.policy !== 'ci-unsigned' ||
    receipt.signing?.status !== 'unsigned' ||
    receipt.signing?.institutional_validation !== false ||
    receipt.signing?.verified !== true ||
    receipt.signing?.expected_publisher !== institutionalPublisher
  ) {
    throw new Error('El recibo debe acreditar un helper deliberadamente sin firma.');
  }
  const signingReport = receipt.signing.artifacts?.[0];
  if (
    receipt.signing.artifacts?.length !== 1 ||
    signingReport?.artifact !== receipt.artifact.path ||
    signingReport?.signature_status !== 'NotSigned' ||
    signingReport?.metadata?.product_name !== helperProductName ||
    signingReport?.metadata?.version !== receipt.project.version ||
    signingReport?.metadata?.original_filename !== receipt.artifact.path ||
    signingReport?.metadata?.publisher !== institutionalPublisher
  ) {
    throw new Error('El recibo no contiene la validacion PE y de version esperada.');
  }
}

function promoteTransactionally(output, staging) {
  let backup;
  if (existsSync(output)) {
    backup = output + '.backup-' + randomUUID();
    renameSync(output, backup);
  }
  try {
    renameSync(staging, output);
  } catch (error) {
    if (backup && existsSync(backup) && !existsSync(output)) {
      renameSync(backup, output);
    }
    throw error;
  }
  if (backup) {
    rmSync(backup, { force: true, recursive: true });
  }
}

function generateTransactionally(output, prefix, writer) {
  const safeOutput = assertAdminRecoveryOutputPath(output);
  mkdirSync(dirname(safeOutput), { recursive: true });
  const staging = mkdtempSync(join(dirname(safeOutput), prefix));
  try {
    writer(staging);
    promoteTransactionally(safeOutput, staging);
  } catch (error) {
    if (existsSync(staging)) {
      rmSync(staging, { force: true, recursive: true });
    }
    throw error;
  }
}

function assertApplicationWasNotBuilt(targetDirectory) {
  const forbidden = [
    join(targetDirectory, 'release', 'tauri-angular-app.exe'),
    join(targetDirectory, 'release', 'bundle'),
  ];
  for (const path of forbidden) {
    if (existsSync(path)) {
      throw new Error('La compilacion auxiliar genero una salida prohibida: ' + path);
    }
  }
}

function buildHelper() {
  if (process.platform !== 'win32') {
    throw new Error('El helper distribuible solo puede construirse en Windows.');
  }
  validateBuildEnvironment(process.env);
  const version = validateVersionSources();
  const identity = readSourceIdentity();
  const toolchain = resolveToolchain();
  assertAdminRecoveryOutputPath(cargoTargetRoot);
  assertAdminRecoveryOutputPath(cargoTargetFirst);
  assertAdminRecoveryOutputPath(cargoTargetSecond);
  rmSync(cargoTargetRoot, { force: true, recursive: true });
  mkdirSync(cargoTargetRoot, { recursive: true });

  const runIndependentBuild = targetDirectory => {
    const environment = sanitizedCargoEnvironment(process.env, {
      sourceDateEpoch: identity.source_date_epoch,
      targetDirectory,
      rustcPath: toolchain.paths.rustc,
    });
    runChecked(toolchain.paths.cargo, cargoBuildArguments(), {
      env: environment,
      inherit: true,
    });
    assertApplicationWasNotBuilt(targetDirectory);
    const artifactPath = join(
      targetDirectory,
      'release',
      helperCargoTarget + '.exe',
    );
    if (!existsSync(artifactPath)) {
      throw new Error('Cargo no genero el helper esperado: ' + artifactPath);
    }
    return {
      artifactPath,
      content: readFileSync(artifactPath),
    };
  };
  const firstBuild = runIndependentBuild(cargoTargetFirst);
  const secondBuild = runIndependentBuild(cargoTargetSecond);
  const reproducibleHashes = [
    sha256(firstBuild.content),
    sha256(secondBuild.content),
  ];
  if (reproducibleHashes[0] !== reproducibleHashes[1]) {
    throw new Error(
      'Los dos builds independientes del helper no son reproducibles bit a bit: ' +
        reproducibleHashes.join(' != '),
    );
  }
  const artifactName = helperArtifactName(version);
  assertSameIdentity(identity, readSourceIdentity());

  generateTransactionally(buildOutput, '.build-output-tmp-', staging => {
    const stagedArtifact = join(staging, artifactName);
    cpSync(firstBuild.artifactPath, stagedArtifact);
    const artifactContent = readFileSync(stagedArtifact);
    const receipt = buildReceipt({
      version,
      identity,
      artifactName,
      artifactContent,
      pe: inspectPeBuffer(artifactContent),
      signing: buildSigningMetadata({
        artifacts: [stagedArtifact],
        policy: 'ci-unsigned',
        version,
        productName: helperProductName,
        expectedOriginalFilename: artifactName,
      }),
      toolchain: toolchain.evidence,
      sourceInputs: sourceInputRecords(),
      reproducibility: {
        independent_builds: 2,
        clean_target_root: true,
        target_directories: independentCargoTargetPaths,
        bit_for_bit: true,
        sha256: reproducibleHashes,
      },
    });
    validateReceiptStructure(receipt);
    writeJson(join(staging, receiptName), receipt);
  });
  verifyBuildOutput(identity);
  console.log(
    '[AdminRecovery] Helper trazable generado en ' +
      relative(repositoryRoot, buildOutput) +
      '.',
  );
}

function readCanonicalJson(path, label) {
  const text = readFileSync(path, 'utf8');
  const parsed = JSON.parse(text);
  if (text !== canonicalJson(parsed)) {
    throw new Error(label + ' no conserva la serializacion canonica.');
  }
  return parsed;
}

function verifyBuildOutput(expectedIdentity = readSourceIdentity()) {
  validateBuildEnvironment(process.env);
  const receiptPath = join(buildOutput, receiptName);
  if (!existsSync(receiptPath)) {
    throw new Error('No existe el recibo de construccion del helper.');
  }
  const receipt = readCanonicalJson(receiptPath, 'El recibo');
  validateReceiptStructure(receipt);
  assertSameIdentity(expectedIdentity, receipt.source_control);
  if (
    JSON.stringify(resolveToolchain().evidence) !==
    JSON.stringify(receipt.toolchain)
  ) {
    throw new Error('El toolchain actual no coincide con el recibo de construcción.');
  }
  if (receipt.project.version !== readProjectVersion()) {
    throw new Error('El recibo no corresponde a la version vigente.');
  }
  if (JSON.stringify(receipt.source_inputs) !== JSON.stringify(sourceInputRecords())) {
    throw new Error('Las entradas de origen cambiaron despues de construir el helper.');
  }
  const artifactPath = resolveOutputFile(buildOutput, receipt.artifact.path);
  if (
    !existsSync(artifactPath) ||
    statSync(artifactPath).size !== receipt.artifact.size ||
    sha256File(artifactPath) !== receipt.artifact.sha256
  ) {
    throw new Error('El helper no coincide con la huella del recibo.');
  }
  if (JSON.stringify(inspectPeFile(artifactPath)) !== JSON.stringify(receipt.pe)) {
    throw new Error('La cabecera PE del helper no coincide con el recibo.');
  }
  const signing = buildSigningMetadata({
    artifacts: [artifactPath],
    policy: 'ci-unsigned',
    version: receipt.project.version,
    productName: helperProductName,
    expectedOriginalFilename: receipt.artifact.path,
  });
  if (JSON.stringify(signing) !== JSON.stringify(receipt.signing)) {
    throw new Error('Los metadatos PE o Authenticode cambiaron desde la construccion.');
  }
  return { receipt, artifactPath };
}

function cargoPackagePurl(pkg) {
  return (
    'pkg:cargo/' +
    encodeURIComponent(pkg.name) +
    '@' +
    encodeURIComponent(pkg.version)
  );
}

function cargoPackageKey(name, version) {
  return name + '\u0000' + version;
}

export function cargoLockChecksums(lockText) {
  if (typeof lockText !== 'string') {
    throw new Error('Cargo.lock no contiene texto verificable.');
  }
  const checksums = new Map();
  const blocks = lockText.split(/\r?\n(?=\[\[package\]\]\r?\n)/u);
  for (const block of blocks) {
    const name = block.match(/^name = "([^"]+)"$/m)?.[1];
    const version = block.match(/^version = "([^"]+)"$/m)?.[1];
    const checksum = block.match(/^checksum = "([0-9a-f]{64})"$/m)?.[1];
    if (!name || !version || !checksum) continue;
    const key = cargoPackageKey(name, version);
    const previous = checksums.get(key);
    if (previous !== undefined && previous !== checksum) {
      throw new Error('Cargo.lock contiene checksums ambiguos para ' + name + '@' + version + '.');
    }
    checksums.set(key, checksum);
  }
  return checksums;
}

export function validateSbomCargoHashes(sbom, lockText) {
  if (!Array.isArray(sbom?.components)) {
    throw new Error('El SBOM no contiene componentes Cargo verificables.');
  }
  const expected = cargoLockChecksums(lockText);
  for (const component of sbom.components) {
    const checksum = expected.get(cargoPackageKey(component.name, component.version));
    if (checksum === undefined) continue;
    const hashes = (component.hashes ?? []).filter(hash => hash.alg === 'SHA-256');
    if (hashes.length !== 1 || hashes[0].content !== checksum) {
      throw new Error(
        'El SBOM no conserva el checksum Cargo.lock de ' +
          component.name +
          '@' +
          component.version +
          '.',
      );
    }
  }
  return true;
}

function reachableCargoGraph(metadata, version) {
  if (
    !metadata ||
    !Array.isArray(metadata.packages) ||
    !Array.isArray(metadata.resolve?.nodes)
  ) {
    throw new Error('Cargo metadata no contiene un grafo auxiliar resoluble.');
  }
  const packages = new Map(metadata.packages.map(pkg => [pkg.id, pkg]));
  const nodes = new Map(metadata.resolve.nodes.map(node => [node.id, node]));
  const roots = metadata.packages.filter(
    pkg =>
      pkg.name === 'hra-tauri-admin-recovery' &&
      pkg.version === version,
  );
  if (roots.length !== 1) {
    throw new Error('Cargo metadata no identifica un único crate auxiliar vigente.');
  }
  const root = roots[0];
  const reachable = new Set();
  const pending = [root.id];
  while (pending.length > 0) {
    const id = pending.pop();
    if (reachable.has(id)) continue;
    const pkg = packages.get(id);
    const node = nodes.get(id);
    if (!pkg || !node || !allowedHelperPackages.has(pkg.name)) {
      throw new Error('El grafo Cargo auxiliar contiene un paquete fuera de frontera.');
    }
    reachable.add(id);
    for (const dependency of node.deps ?? []) pending.push(dependency.pkg);
  }
  const references = new Map(
    [...reachable].map(id => [id, cargoPackagePurl(packages.get(id))]),
  );
  if (new Set(references.values()).size !== references.size) {
    throw new Error('El grafo Cargo auxiliar contiene referencias PURL ambiguas.');
  }
  return { nodes, packages, reachable, references, root };
}

export function buildSbomFromMetadata(
  receipt,
  metadata,
  lockText = readFileSync(join(repositoryRoot, helperCargoLock), 'utf8'),
) {
  const graph = reachableCargoGraph(metadata, receipt.project.version);
  const lockChecksums = cargoLockChecksums(lockText);
  const components = [...graph.reachable]
    .filter(id => id !== graph.root.id)
    .map(id => {
      const pkg = graph.packages.get(id);
      const purl = graph.references.get(id);
      const component = {
        type: 'library',
        'bom-ref': purl,
        name: pkg.name,
        version: pkg.version,
        purl,
        properties: [{ name: 'hra:lockfile', value: helperCargoLock }],
      };
      const checksum = lockChecksums.get(cargoPackageKey(pkg.name, pkg.version));
      if (checksum !== undefined) {
        component.hashes = [{ alg: 'SHA-256', content: checksum }];
      }
      return component;
    })
    .sort((left, right) => left['bom-ref'].localeCompare(right['bom-ref']));
  const dependencies = [...graph.reachable]
    .map(id => ({
      ref: graph.references.get(id),
      dependsOn: [...new Set(
        (graph.nodes.get(id).deps ?? [])
          .map(dependency => graph.references.get(dependency.pkg))
          .filter(Boolean),
      )].sort(),
    }))
    .sort((left, right) => left.ref.localeCompare(right.ref));
  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': graph.references.get(graph.root.id),
        name: graph.root.name,
        version: receipt.project.version,
        properties: [
          { name: 'hra:source-commit', value: receipt.source_control.commit },
          { name: 'hra:source-tree', value: receipt.source_control.tree },
          { name: 'hra:lockfile', value: helperCargoLock },
          { name: 'hra:target', value: 'x86_64-pc-windows-msvc' },
        ],
      },
      tools: {
        components: [
          {
            type: 'application',
            name: 'scripts/admin-recovery-release.mjs',
            version: '1',
          },
        ],
      },
    },
    components,
    dependencies,
  };
  validateSbomCargoHashes(sbom, lockText);
  return sbom;
}

function readHelperCargoMetadata(receipt) {
  const toolchain = resolveToolchain();
  if (JSON.stringify(toolchain.evidence) !== JSON.stringify(receipt.toolchain)) {
    throw new Error('El toolchain de metadata no coincide con el recibo del helper.');
  }
  const environment = sanitizedCargoEnvironment(process.env, {
    sourceDateEpoch: receipt.source_control.source_date_epoch,
    targetDirectory: cargoTargetFirst,
    rustcPath: toolchain.paths.rustc,
  });
  const output = runChecked(toolchain.paths.cargo, cargoMetadataArguments(), {
    env: environment,
  });
  try {
    return JSON.parse(output);
  } catch {
    throw new Error('Cargo metadata no devolvió JSON válido para el helper.');
  }
}

function buildSbom(receipt) {
  return buildSbomFromMetadata(receipt, readHelperCargoMetadata(receipt));
}

export function buildHelperManifest({ receipt, deliverables, signing }) {
  const product = loadProductManifest(receipt.project.version);
  return {
    schema_version: 2,
    interface_mode: product.interfaceMode,
    cli_fallback: product.cliFallback,
    default_invocation: product.defaultInvocation,
    project: receipt.project,
    distribution: {
      access_label: adminRecoveryDistributionPolicy.accessLabel,
      artifact_role: product.artifactRole,
      bundle_source_prepared: false,
      format: 'portable-windows-executable',
      installation: 'beside-application-executable',
      invocation: receipt.artifact.path,
      signing_required_for_production:
        adminRecoveryDistributionPolicy.signingRequiredForProduction,
      start_menu_entry: true,
    },
    security_boundary: {
      interactive_terminal_required: false,
      cli_interactive_terminal_required: true,
      local_windows_credential_manager_only: true,
      application_crate_dependency: false,
      helper_lockfile_only: true,
      runtime_imports: receipt.pe.imports,
      forbidden_runtime_imports: receipt.pe.forbidden_imports,
      ipc_exposed: false,
      database_access: false,
      kafka_access: false,
      nexus_access: false,
    },
    source_control: receipt.source_control,
    source_inputs: receipt.source_inputs,
    build_receipt: {
      path: receiptName,
      sha256: deliverables.find(entry => entry.path === receiptName)?.sha256,
    },
    product_contract: {
      filename: product.filename,
      sha256: product.sha256,
    },
    deliverables,
    release_channel: 'beta',
    productionReady: false,
    release_validation: {
      authenticode: 'pending-institutional',
      administrative_recovery_installed_binding: 'pending',
      administrative_recovery_shortcut: 'pending',
      antimalware: 'pending',
      clean_windows_installation: 'pending',
      disposable_windows_account: 'pending',
      blocking_reasons: [
        'authenticode-institutional-validation-pending',
        'administrative-recovery-installed-binding-pending',
        'administrative-recovery-shortcut-validation-pending',
        'antimalware-validation-pending',
        'clean-windows-installation-pending',
        'disposable-windows-account-test-pending',
      ],
    },
    signing,
  };
}

export function validateHelperManifest(manifest) {
  if (
    manifest?.schema_version !== 2 ||
    manifest.productionReady !== false ||
    manifest.release_channel !== 'beta'
  ) {
    throw new Error(
      'El manifiesto auxiliar debe conservar release_channel=beta y productionReady=false.',
    );
  }
  const product = loadProductManifest(manifest.project?.version);
  if (
    manifest.interface_mode !== product.interfaceMode ||
    manifest.cli_fallback !== product.cliFallback ||
    manifest.default_invocation !== product.defaultInvocation ||
    manifest.project?.release_channel !== 'beta' ||
    manifest.distribution?.access_label !==
      adminRecoveryDistributionPolicy.accessLabel ||
    manifest.distribution?.artifact_role !== product.artifactRole ||
    manifest.distribution?.bundle_source_prepared !== false ||
    manifest.distribution?.installation !== 'beside-application-executable' ||
    manifest.distribution?.invocation !== product.artifactName ||
    manifest.distribution?.signing_required_for_production !== true ||
    manifest.distribution?.start_menu_entry !== true ||
    canonicalJson(manifest.product_contract) !== canonicalJson({
      filename: product.filename,
      sha256: product.sha256,
    })
  ) {
    throw new Error('El manifiesto diverge del contrato GUI y de distribución.');
  }
  const boundary = manifest.security_boundary;
  if (
    boundary?.interactive_terminal_required !== false ||
    boundary?.cli_interactive_terminal_required !== true ||
    boundary?.local_windows_credential_manager_only !== true ||
    boundary?.application_crate_dependency !== false ||
    boundary?.helper_lockfile_only !== true ||
    !Array.isArray(boundary?.runtime_imports) ||
    boundary?.forbidden_runtime_imports?.length !== 0 ||
    boundary?.ipc_exposed !== false ||
    boundary?.database_access !== false ||
    boundary?.kafka_access !== false ||
    boundary?.nexus_access !== false
  ) {
    throw new Error('El manifiesto amplio indebidamente la frontera del helper.');
  }
  const requiredBlockers = [
    'authenticode-institutional-validation-pending',
    'administrative-recovery-installed-binding-pending',
    'administrative-recovery-shortcut-validation-pending',
    'antimalware-validation-pending',
    'clean-windows-installation-pending',
    'disposable-windows-account-test-pending',
  ];
  if (
    manifest.release_validation?.administrative_recovery_installed_binding !== 'pending' ||
    manifest.release_validation?.administrative_recovery_shortcut !== 'pending' ||
    manifest.release_validation?.clean_windows_installation !== 'pending'
  ) {
    throw new Error('El manifiesto omite las compuertas de instalación del helper.');
  }
  for (const blocker of requiredBlockers) {
    if (!manifest.release_validation?.blocking_reasons?.includes(blocker)) {
      throw new Error('El manifiesto omite el bloqueo obligatorio: ' + blocker);
    }
  }
  if (
    !/^[0-9a-f]{64}$/.test(manifest.build_receipt?.sha256 ?? '') ||
    manifest.build_receipt?.path !== receiptName
  ) {
    throw new Error('El manifiesto no vincula el recibo de construccion.');
  }
  validateNoLocalIdentityDisclosure(manifest, 'El manifiesto');
}

function stageHelper(output) {
  const version = validateVersionSources();
  const identity = readSourceIdentity();
  const { receipt, artifactPath } = verifyBuildOutput(identity);
  if (receipt.project.version !== version) {
    throw new Error('El helper construido no corresponde a la version vigente.');
  }

  generateTransactionally(output, '.review-tmp-', staging => {
    const stagedArtifact = join(staging, receipt.artifact.path);
    cpSync(artifactPath, stagedArtifact);
    cpSync(join(buildOutput, receiptName), join(staging, receiptName));
    cpSync(productManifestPath, join(staging, productManifestName));
    writeJson(join(staging, sbomName), buildSbom(receipt));

    const deliverables = [
      {
        path: receipt.artifact.path,
        sha256: sha256File(stagedArtifact),
        type: 'application/vnd.microsoft.portable-executable',
      },
      {
        path: productManifestName,
        sha256: sha256File(join(staging, productManifestName)),
        type: 'application/json',
      },
      {
        path: receiptName,
        sha256: sha256File(join(staging, receiptName)),
        type: 'application/json',
      },
      {
        path: sbomName,
        sha256: sha256File(join(staging, sbomName)),
        type: 'application/vnd.cyclonedx+json',
      },
    ].sort((left, right) => left.path.localeCompare(right.path));
    const signing = buildSigningMetadata({
      artifacts: [stagedArtifact],
      policy: 'ci-unsigned',
      version,
      productName: helperProductName,
      expectedOriginalFilename: receipt.artifact.path,
    });
    const manifest = buildHelperManifest({ receipt, deliverables, signing });
    validateHelperManifest(manifest);
    writeJson(join(staging, manifestName), manifest);
    const checksummed = [
      ...deliverables,
      { path: manifestName, sha256: sha256File(join(staging, manifestName)) },
    ].sort((left, right) => left.path.localeCompare(right.path));
    writeFileSync(
      join(staging, sumsName),
      checksummed.map(entry => entry.sha256 + '  ' + entry.path).join('\n') + '\n',
      'ascii',
    );
  });
  assertSameIdentity(identity, readSourceIdentity());
  verifyReviewOutput(output, identity);
  console.log(
    '[AdminRecovery] Entrega de revision generada en ' +
      relative(repositoryRoot, output) +
      '.',
  );
}

function checksumEntries(output) {
  const lines = readFileSync(join(output, sumsName), 'ascii').trim().split(/\r?\n/);
  const entries = lines.map(line => {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match) {
      throw new Error('SHA256SUMS contiene una linea invalida: ' + line);
    }
    resolveOutputFile(output, match[2]);
    return [match[2], match[1]];
  });
  const result = new Map(entries);
  if (result.size !== entries.length) {
    throw new Error('SHA256SUMS contiene rutas duplicadas.');
  }
  return result;
}

function verifyReviewOutput(output, expectedIdentity = readSourceIdentity()) {
  const safeOutput = assertAdminRecoveryOutputPath(output);
  for (const name of [
    receiptName,
    manifestName,
    productManifestName,
    sbomName,
    sumsName,
  ]) {
    if (!existsSync(join(safeOutput, name))) {
      throw new Error('Falta el archivo de entrega auxiliar: ' + name);
    }
  }
  const receipt = readCanonicalJson(join(safeOutput, receiptName), 'El recibo');
  const manifest = readCanonicalJson(join(safeOutput, manifestName), 'El manifiesto');
  validateReceiptStructure(receipt);
  validateHelperManifest(manifest);
  assertSameIdentity(expectedIdentity, receipt.source_control);
  assertSameIdentity(expectedIdentity, manifest.source_control);
  if (
    JSON.stringify(receipt.source_inputs) !== JSON.stringify(sourceInputRecords()) ||
    JSON.stringify(manifest.source_inputs) !== JSON.stringify(receipt.source_inputs)
  ) {
    throw new Error('La entrega auxiliar no corresponde a las entradas vigentes.');
  }

  const expected = checksumEntries(safeOutput);
  const expectedNames = [
    ...manifest.deliverables.map(entry => entry.path),
    manifestName,
  ].sort();
  if (JSON.stringify([...expected.keys()].sort()) !== JSON.stringify(expectedNames)) {
    throw new Error('SHA256SUMS no coincide con la lista cerrada del helper.');
  }
  for (const [path, digest] of expected) {
    const absolutePath = resolveOutputFile(safeOutput, path);
    if (!existsSync(absolutePath) || sha256File(absolutePath) !== digest) {
      throw new Error('Checksum invalido en la entrega auxiliar: ' + path);
    }
  }
  const actualNames = readdirSync(safeOutput, { withFileTypes: true }).map(entry => {
    if (!entry.isFile()) {
      throw new Error('La entrega auxiliar no admite subdirectorios ni enlaces.');
    }
    return entry.name;
  }).sort();
  const closedNames = [...expectedNames, sumsName].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(closedNames)) {
    throw new Error('La entrega auxiliar contiene archivos fuera de la lista cerrada.');
  }

  const helperEntry = manifest.deliverables.find(
    entry => entry.path === receipt.artifact.path,
  );
  const receiptEntry = manifest.deliverables.find(entry => entry.path === receiptName);
  if (
    !helperEntry ||
    helperEntry.sha256 !== receipt.artifact.sha256 ||
    !receiptEntry ||
    receiptEntry.sha256 !== manifest.build_receipt.sha256
  ) {
    throw new Error('El manifiesto no conserva las huellas del helper y su recibo.');
  }
  const helperPath = resolveOutputFile(safeOutput, receipt.artifact.path);
  if (JSON.stringify(inspectPeFile(helperPath)) !== JSON.stringify(receipt.pe)) {
    throw new Error('El PE entregado no coincide con el recibo.');
  }
  verifyManifestReleasePolicy(manifest, safeOutput, {
    expectedOriginalFilename: receipt.artifact.path,
  });
  const stagedProduct = readCanonicalJson(
    join(safeOutput, productManifestName),
    'El manifiesto raíz del producto',
  );
  validateProductManifest(stagedProduct, receipt.project.version);
  if (
    sha256File(join(safeOutput, productManifestName)) !==
      receipt.product_contract.sha256 ||
    canonicalJson(stagedProduct) !==
      readFileSync(productManifestPath, 'utf8')
  ) {
    throw new Error('El manifiesto raíz staged diverge de la fuente vinculada.');
  }
  const sbom = readCanonicalJson(join(safeOutput, sbomName), 'El SBOM');
  validateNoLocalIdentityDisclosure(sbom, 'El SBOM');
  validateSbomCargoHashes(
    sbom,
    readFileSync(join(repositoryRoot, helperCargoLock), 'utf8'),
  );
  if (
    sbom.bomFormat !== 'CycloneDX' ||
    sbom.specVersion !== '1.6' ||
    sbom.metadata?.component?.version !== receipt.project.version ||
    JSON.stringify(sbom) !== JSON.stringify(buildSbom(receipt))
  ) {
    throw new Error(
      'El SBOM auxiliar no reproduce exactamente el lock CycloneDX 1.6 del helper.',
    );
  }
  console.log(
    '[AdminRecovery] Entrega auxiliar verificada (' + actualNames.length + ' archivos).',
  );
}

export function parseArguments(argv) {
  if (argv.length === 0) {
    throw new Error('Se requiere una accion: build, stage, verify-build o verify.');
  }
  const action = argv[0];
  if (!new Set(['build', 'stage', 'verify-build', 'verify']).has(action)) {
    throw new Error('Accion no reconocida: ' + action);
  }
  let output = defaultReviewOutput;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith('--output=')) {
      output = argument.slice('--output='.length);
    } else if (argument === '--output') {
      output = argv[++index];
    } else {
      throw new Error('Argumento no reconocido: ' + argument);
    }
  }
  if (!output) {
    throw new Error('La ruta de salida no puede estar vacia.');
  }
  if (action === 'build' || action === 'verify-build') {
    if (argv.length !== 1) {
      throw new Error(action + ' no admite una ruta de salida.');
    }
    output = buildOutput;
  } else {
    output = assertAdminRecoveryOutputPath(output);
  }
  return { action, output };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.action === 'build') {
    buildHelper();
  } else if (options.action === 'stage') {
    stageHelper(options.output);
  } else if (options.action === 'verify-build') {
    verifyBuildOutput();
    console.log('[AdminRecovery] Recibo y helper de construccion verificados.');
  } else {
    verifyReviewOutput(options.output);
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (entryPoint === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      '[AdminRecovery] ' + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  }
}
