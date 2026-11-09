import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  adminRecoveryDistributionPolicy,
  canonicalJson,
  helperProductName,
  loadProductManifest,
  repositoryRoot,
  sha256,
  validateHelperManifest,
  validateReceiptStructure,
} from './admin-recovery-release.mjs';
import { buildSigningMetadata } from './windows-release-policy.mjs';

const require = createRequire(import.meta.url);
const sourceRoot = join(
  repositoryRoot,
  'src-tauri',
  'target',
  'admin-recovery',
  'bundle-source',
);
const inventoryName = 'bundle-source-manifest.json';
const expectedCommand =
  'node scripts/admin-recovery-bundle-source.mjs --verify-signed-source';
const sourceControlKeys = [
  'clean',
  'commit',
  'commit_epoch',
  'object_format',
  'source_date_epoch',
  'tree',
];

function fail(message) {
  throw new Error(message);
}

function gitValue(...arguments_) {
  const result = spawnSync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    fail('No se pudo resolver la identidad Git para la fuente del bundle.');
  }
  return result.stdout.trim();
}

export function currentBundleSourceIdentity() {
  if (gitValue('status', '--porcelain=v1', '--untracked-files=all') !== '') {
    fail('La fuente del bundle exige un arbol Git limpio.');
  }
  const commitEpoch = Number(gitValue('show', '-s', '--format=%ct', 'HEAD'));
  if (!Number.isSafeInteger(commitEpoch) || commitEpoch <= 0) {
    fail('La fecha Unix del commit HEAD no es valida.');
  }
  return {
    clean: true,
    commit: gitValue('rev-parse', 'HEAD'),
    commit_epoch: commitEpoch,
    object_format: gitValue('rev-parse', '--show-object-format'),
    source_date_epoch: commitEpoch,
    tree: gitValue('rev-parse', 'HEAD^{tree}'),
  };
}

export function validateBundleSourceIdentity(recorded, current) {
  const actual = current ?? currentBundleSourceIdentity();
  if (
    !recorded ||
    typeof recorded !== 'object' ||
    Array.isArray(recorded) ||
    JSON.stringify(Object.keys(recorded).sort()) !== JSON.stringify(sourceControlKeys) ||
    recorded.clean !== true ||
    recorded.source_date_epoch !== recorded.commit_epoch ||
    sourceControlKeys.some(key => recorded[key] !== actual[key])
  ) {
    fail('El recibo de la fuente del bundle no corresponde al HEAD limpio vigente.');
  }
  return actual;
}

function projectVersion() {
  return require(join(repositoryRoot, 'package.json')).version;
}

function assertRegularFile(pathname, label) {
  if (!existsSync(pathname)) fail(`${label} no existe.`);
  const status = lstatSync(pathname);
  if (!status.isFile() || status.isSymbolicLink()) {
    fail(`${label} debe ser un archivo regular sin enlaces.`);
  }
  return pathname;
}

function leerDisposicionPeAuthenticode(octetos, etiqueta) {
  if (!(octetos instanceof Uint8Array)) {
    fail(`${etiqueta} no contiene bytes PE verificables.`);
  }
  const contenido = Buffer.from(
    octetos.buffer,
    octetos.byteOffset,
    octetos.byteLength,
  );
  if (contenido.byteLength < 0x40 || contenido.readUInt16LE(0) !== 0x5a4d) {
    fail(`${etiqueta} no contiene una cabecera DOS válida.`);
  }
  const desplazamientoPe = contenido.readUInt32LE(0x3c);
  if (
    desplazamientoPe + 24 > contenido.byteLength ||
    contenido.readUInt32LE(desplazamientoPe) !== 0x00004550
  ) {
    fail(`${etiqueta} no contiene una cabecera PE válida.`);
  }
  const tamanoEncabezadoOpcional = contenido.readUInt16LE(desplazamientoPe + 20);
  const desplazamientoEncabezadoOpcional = desplazamientoPe + 24;
  const finEncabezadoOpcional =
    desplazamientoEncabezadoOpcional + tamanoEncabezadoOpcional;
  if (
    finEncabezadoOpcional > contenido.byteLength ||
    tamanoEncabezadoOpcional < 112
  ) {
    fail(`${etiqueta} contiene una cabecera opcional PE truncada.`);
  }
  const identificadorFormato = contenido.readUInt16LE(
    desplazamientoEncabezadoOpcional,
  );
  const desplazamientoDirectorioDatos = identificadorFormato === 0x010b
    ? desplazamientoEncabezadoOpcional + 96
    : identificadorFormato === 0x020b
      ? desplazamientoEncabezadoOpcional + 112
      : -1;
  const desplazamientoCantidadDirectorios = identificadorFormato === 0x010b
    ? desplazamientoEncabezadoOpcional + 92
    : identificadorFormato === 0x020b
      ? desplazamientoEncabezadoOpcional + 108
      : -1;
  if (
    desplazamientoDirectorioDatos < 0 ||
    desplazamientoCantidadDirectorios < 0
  ) {
    fail(`${etiqueta} utiliza un formato de cabecera opcional PE desconocido.`);
  }
  const desplazamientoDirectorioSeguridad =
    desplazamientoDirectorioDatos + 4 * 8;
  const desplazamientoSumaComprobacion = desplazamientoEncabezadoOpcional + 64;
  if (
    contenido.readUInt32LE(desplazamientoCantidadDirectorios) < 5 ||
    desplazamientoDirectorioSeguridad + 8 > finEncabezadoOpcional ||
    desplazamientoSumaComprobacion + 4 > finEncabezadoOpcional
  ) {
    fail(`${etiqueta} no declara el directorio de seguridad Authenticode.`);
  }
  return {
    contenido,
    desplazamientoCertificado: contenido.readUInt32LE(
      desplazamientoDirectorioSeguridad,
    ),
    desplazamientoDirectorioSeguridad,
    desplazamientoSumaComprobacion,
    tamanoCertificado: contenido.readUInt32LE(
      desplazamientoDirectorioSeguridad + 4,
    ),
  };
}

function validarTablaCertificados(contenido, desplazamiento, tamano) {
  const fin = desplazamiento + tamano;
  if (
    desplazamiento % 8 !== 0 ||
    tamano < 8 ||
    !Number.isSafeInteger(fin) ||
    fin !== contenido.byteLength
  ) {
    fail('La transformación Authenticode contiene una tabla de certificados inválida.');
  }
  let cursor = desplazamiento;
  while (cursor < fin) {
    if (cursor + 8 > fin) {
      fail('La tabla Authenticode contiene una entrada truncada.');
    }
    const longitud = contenido.readUInt32LE(cursor);
    const revision = contenido.readUInt16LE(cursor + 4);
    const tipoCertificado = contenido.readUInt16LE(cursor + 6);
    if (
      longitud < 8 ||
      cursor + longitud > fin ||
      revision !== 0x0200 ||
      tipoCertificado !== 0x0002
    ) {
      fail('La tabla Authenticode contiene una entrada WIN_CERTIFICATE inválida.');
    }
    cursor = Math.ceil((cursor + longitud) / 8) * 8;
  }
  if (cursor !== fin) {
    fail('La tabla Authenticode no respeta la alineación WIN_CERTIFICATE.');
  }
}

export function validarTransformacionAuthenticode({
  octetosArtefactoSinFirma,
  octetosArtefactoFirmado,
}) {
  const disposicionSinFirma = leerDisposicionPeAuthenticode(
    octetosArtefactoSinFirma,
    'El helper Rust revisado',
  );
  const disposicionFirmada = leerDisposicionPeAuthenticode(
    octetosArtefactoFirmado,
    'El helper institucional firmado',
  );
  if (
    disposicionSinFirma.desplazamientoCertificado !== 0 ||
    disposicionSinFirma.tamanoCertificado !== 0
  ) {
    fail('El helper Rust revisado debe permanecer deliberadamente sin firma.');
  }
  if (
    disposicionFirmada.desplazamientoSumaComprobacion !==
      disposicionSinFirma.desplazamientoSumaComprobacion ||
    disposicionFirmada.desplazamientoDirectorioSeguridad !==
      disposicionSinFirma.desplazamientoDirectorioSeguridad
  ) {
    fail('La transformación Authenticode alteró la estructura PE revisada.');
  }

  const desplazamientoEsperadoCertificado =
    Math.ceil(disposicionSinFirma.contenido.byteLength / 8) * 8;
  if (
    disposicionFirmada.desplazamientoCertificado !==
    desplazamientoEsperadoCertificado
  ) {
    fail('La firma Authenticode no fue anexada al PE Rust revisado.');
  }
  validarTablaCertificados(
    disposicionFirmada.contenido,
    disposicionFirmada.desplazamientoCertificado,
    disposicionFirmada.tamanoCertificado,
  );

  const contenidoSinFirmaNormalizado = Buffer.from(disposicionSinFirma.contenido);
  const contenidoFirmadoNormalizado = Buffer.from(
    disposicionFirmada.contenido.subarray(
      0,
      disposicionSinFirma.contenido.byteLength,
    ),
  );
  for (const { desplazamiento, tamano } of [
    {
      desplazamiento: disposicionSinFirma.desplazamientoSumaComprobacion,
      tamano: 4,
    },
    {
      desplazamiento: disposicionSinFirma.desplazamientoDirectorioSeguridad,
      tamano: 8,
    },
  ]) {
    contenidoSinFirmaNormalizado.fill(
      0,
      desplazamiento,
      desplazamiento + tamano,
    );
    contenidoFirmadoNormalizado.fill(
      0,
      desplazamiento,
      desplazamiento + tamano,
    );
  }
  if (!contenidoSinFirmaNormalizado.equals(contenidoFirmadoNormalizado)) {
    fail('La fuente firmada contiene cambios ajenos a Authenticode sobre el PE Rust revisado.');
  }
  const rellenoAlineacion = disposicionFirmada.contenido.subarray(
    disposicionSinFirma.contenido.byteLength,
    disposicionFirmada.desplazamientoCertificado,
  );
  if (rellenoAlineacion.some(octeto => octeto !== 0)) {
    fail('La transformación Authenticode contiene relleno ejecutable no autorizado.');
  }

  return {
    algorithm: 'pe-authenticode-certificate-table-v1',
    certificate_table: {
      offset: disposicionFirmada.desplazamientoCertificado,
      size: disposicionFirmada.tamanoCertificado,
    },
    signed_artifact_sha256: sha256(disposicionFirmada.contenido),
    unsigned_artifact_sha256: sha256(disposicionSinFirma.contenido),
  };
}

function assertSourceRoot(pathname) {
  const relation = relative(sourceRoot, resolve(pathname));
  if (relation.startsWith('..') || /^[A-Za-z]:/u.test(relation)) {
    fail('La fuente del bundle salió de target/admin-recovery/bundle-source.');
  }
}

function writeSourceAtomic(pathname, content) {
  assertSourceRoot(pathname);
  const temporary = `${pathname}.${process.pid}.tmp`;
  const descriptor = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(descriptor, content);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporary, pathname);
}

export function validateDistributionConfiguration(product) {
  const tauri = JSON.parse(
    readFileSync(join(repositoryRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const source = `target/admin-recovery/bundle-source/${product.artifactName}`;
  if (
    tauri.version !== product.productVersion ||
    tauri.build?.beforeBundleCommand !== expectedCommand ||
    Object.keys(tauri.bundle?.resources ?? {}).length !== 1 ||
    tauri.bundle.resources[source] !== product.artifactName ||
    !tauri.bundle?.windows?.wix?.componentRefs?.includes(
      'TauriAdminRecoveryShortcutComponent',
    ) ||
    !tauri.bundle?.windows?.wix?.fragmentPaths?.includes(
      'wix/admin-recovery-shortcut.wxs',
    )
  ) {
    fail('La configuración Tauri diverge de la fuente cerrada del recuperador.');
  }
  const sources = [
    readFileSync(
      join(repositoryRoot, 'src-tauri', 'nsis', 'installer-hooks.nsh'),
      'utf8',
    ),
    readFileSync(
      join(repositoryRoot, 'src-tauri', 'wix', 'admin-recovery-shortcut.wxs'),
      'utf8',
    ),
  ];
  for (const sourceText of sources) {
    if (
      !sourceText.includes(product.artifactName) ||
      !sourceText.includes(adminRecoveryDistributionPolicy.accessLabel)
    ) {
      fail('El acceso del recuperador diverge de la política de distribución.');
    }
  }
  if (
    !sources[0].includes('NSIS_HOOK_POSTINSTALL') ||
    !sources[0].includes('NSIS_HOOK_PREUNINSTALL') ||
    !sources[1].includes('TauriAdminRecoveryShortcutComponent') ||
    !sources[1].includes('[INSTALLDIR]')
  ) {
    fail('La instalación o desinstalación del acceso administrativo está incompleta.');
  }
  return true;
}

function signingMetadata(pathname, product) {
  return buildSigningMetadata({
    artifacts: [pathname],
    policy: 'institutional',
    productName: helperProductName,
    version: product.productVersion,
    expectedOriginalFilename: product.artifactName,
  });
}

function exactlyOne(items, predicate, label) {
  const matches = Array.isArray(items) ? items.filter(predicate) : [];
  if (matches.length !== 1) {
    fail(`La evidencia de revisión debe contener exactamente ${label}.`);
  }
  return matches[0];
}

export function validateReviewBinding({
  product,
  manifestText,
  receiptText,
  artifactBytes,
  currentIdentity,
}) {
  if (!(artifactBytes instanceof Uint8Array)) {
    fail('El helper físico de revisión no contiene bytes verificables.');
  }
  const manifest = JSON.parse(manifestText);
  const receipt = JSON.parse(receiptText);
  validateHelperManifest(manifest);
  validateReceiptStructure(receipt);
  if (
    manifestText !== canonicalJson(manifest) ||
    receiptText !== canonicalJson(receipt) ||
    manifest.productionReady !== false ||
    manifest.project?.version !== product.productVersion ||
    receipt.project?.version !== product.productVersion
  ) {
    fail('La evidencia de revisión no conserva documentos canónicos de la versión vigente.');
  }

  const identity = currentIdentity ?? currentBundleSourceIdentity();
  const manifestIdentity = validateBundleSourceIdentity(manifest.source_control, identity);
  validateBundleSourceIdentity(receipt.source_control, identity);

  const artifact = exactlyOne(
    manifest.deliverables,
    entry => entry.path === product.artifactName,
    'un helper administrativo',
  );
  const receiptEntry = exactlyOne(
    manifest.deliverables,
    entry => entry.path === 'build-receipt.json',
    'un recibo de construcción',
  );
  const receiptBytes = Buffer.from(receiptText, 'utf8');
  const receiptSha256 = sha256(receiptBytes);
  const artifactSha256 = sha256(artifactBytes);
  const expectedReceiptProduct = {
    application_id: product.applicationId,
    artifact_name: product.artifactName,
    artifact_role: product.artifactRole,
    credential_target: product.credentialTarget,
    filename: product.filename,
    mutex_name: product.mutexName,
    sha256: product.sha256,
  };
  const expectedManifestProduct = {
    filename: product.filename,
    sha256: product.sha256,
  };

  if (
    manifest.build_receipt?.path !== 'build-receipt.json' ||
    manifest.build_receipt.sha256 !== receiptSha256 ||
    receiptEntry.sha256 !== receiptSha256 ||
    receiptEntry.type !== 'application/json' ||
    receipt.artifact?.path !== product.artifactName ||
    receipt.artifact.sha256 !== artifactSha256 ||
    receipt.artifact.size !== artifactBytes.byteLength ||
    artifact.sha256 !== artifactSha256 ||
    artifact.type !== receipt.artifact.media_type ||
    canonicalJson(manifest.project) !== canonicalJson(receipt.project) ||
    canonicalJson(manifest.source_control) !== canonicalJson(receipt.source_control) ||
    canonicalJson(manifest.source_inputs) !== canonicalJson(receipt.source_inputs) ||
    canonicalJson(manifest.signing) !== canonicalJson(receipt.signing) ||
    canonicalJson(manifest.product_contract) !== canonicalJson(expectedManifestProduct) ||
    canonicalJson(receipt.product_contract) !== canonicalJson(expectedReceiptProduct)
  ) {
    fail('El manifiesto, el recibo y el helper físico de revisión no son consistentes.');
  }

  return {
    build_receipt: {
      path: 'build-receipt.json',
      sha256: receiptSha256,
    },
    source_control: manifestIdentity,
    unsigned_artifact: {
      sha256: artifactSha256,
    },
  };
}

function reviewBinding(product) {
  const reviewRoot = join(
    repositoryRoot,
    'src-tauri',
    'target',
    'admin-recovery',
    'review',
  );
  const manifestPath = assertRegularFile(
    join(reviewRoot, 'release-manifest.json'),
    'El manifiesto de revisión',
  );
  const receiptPath = assertRegularFile(
    join(reviewRoot, 'build-receipt.json'),
    'El recibo físico de revisión',
  );
  const artifactPath = assertRegularFile(
    join(reviewRoot, product.artifactName),
    'El helper físico sin firma de revisión',
  );
  const octetosArtefacto = readFileSync(artifactPath);
  return {
    octetosArtefacto,
    vinculo: validateReviewBinding({
      product,
      manifestText: readFileSync(manifestPath, 'utf8'),
      receiptText: readFileSync(receiptPath, 'utf8'),
      artifactBytes: octetosArtefacto,
    }),
  };
}

function expectedInventory(
  product,
  artifactBytes,
  signing,
  review = reviewBinding(product),
) {
  const transformacionAuthenticode = validarTransformacionAuthenticode({
    octetosArtefactoSinFirma: review.octetosArtefacto,
    octetosArtefactoFirmado: artifactBytes,
  });
  return {
    access_label: adminRecoveryDistributionPolicy.accessLabel,
    artifact: {
      filename: product.artifactName,
      sha256: sha256(artifactBytes),
      version: product.productVersion,
    },
    cli_fallback: product.cliFallback,
    default_invocation: product.defaultInvocation,
    interface_mode: product.interfaceMode,
    ...review.vinculo,
    authenticode_transformation: transformacionAuthenticode,
    product_contract: {
      filename: product.filename,
      sha256: product.sha256,
    },
    release_channel: 'beta',
    productionReady: false,
    role: product.artifactRole,
    schema_version: 2,
    signing,
    signing_required_for_production:
      adminRecoveryDistributionPolicy.signingRequiredForProduction,
  };
}

export function prepareSignedSource(pathname) {
  const product = loadProductManifest(projectVersion());
  validateDistributionConfiguration(product);
  const source = assertRegularFile(resolve(pathname), 'El helper firmado');
  if (basename(source) !== product.artifactName) {
    fail('El helper firmado debe conservar el nombre versionado exacto.');
  }
  const sourceRelation = relative(sourceRoot, source);
  if (!sourceRelation.startsWith('..') && !/^[A-Za-z]:/u.test(sourceRelation)) {
    fail('El helper de entrada no puede residir dentro de la fuente reemplazada.');
  }
  const signing = signingMetadata(source, product);
  const octetosFuente = readFileSync(source);
  const review = reviewBinding(product);
  validarTransformacionAuthenticode({
    octetosArtefactoSinFirma: review.octetosArtefacto,
    octetosArtefactoFirmado: octetosFuente,
  });
  if (existsSync(sourceRoot)) rmSync(sourceRoot, { recursive: true, force: false });
  mkdirSync(sourceRoot, { recursive: true });
  assertSourceRoot(sourceRoot);
  const destination = join(sourceRoot, product.artifactName);
  copyFileSync(source, destination, 0);
  const artifactBytes = readFileSync(destination);
  writeSourceAtomic(
    join(sourceRoot, inventoryName),
    canonicalJson(expectedInventory(product, artifactBytes, signing, review)),
  );
  return verifySignedSource();
}

export function verifySignedSource() {
  const product = loadProductManifest(projectVersion());
  validateDistributionConfiguration(product);
  const artifactPath = assertRegularFile(
    join(sourceRoot, product.artifactName),
    'La fuente firmada del bundle',
  );
  const inventoryPath = assertRegularFile(
    join(sourceRoot, inventoryName),
    'El inventario firmado del bundle',
  );
  assertSourceRoot(artifactPath);
  assertSourceRoot(inventoryPath);
  const artifactBytes = readFileSync(artifactPath);
  const signing = signingMetadata(artifactPath, product);
  const text = readFileSync(inventoryPath, 'utf8');
  const inventory = JSON.parse(text);
  if (
    text !== canonicalJson(inventory) ||
    canonicalJson(inventory) !==
      canonicalJson(expectedInventory(product, artifactBytes, signing))
  ) {
    fail('El inventario del bundle diverge del helper firmado vigente.');
  }
  return inventory;
}

export function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === '--verify-signed-source') {
    return { action: 'verify' };
  }
  if (argv.length === 2 && argv[0] === '--prepare-signed-source' && argv[1]) {
    return { action: 'prepare', pathname: argv[1] };
  }
  fail(
    'Uso: --verify-signed-source | --prepare-signed-source <helper-firmado-versionado>.',
  );
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.action === 'prepare') prepareSignedSource(options.pathname);
  else verifySignedSource();
  process.stdout.write('[AdminRecoveryBundle] Fuente firmada validada.\n');
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (entryPoint === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      `[AdminRecoveryBundle] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
