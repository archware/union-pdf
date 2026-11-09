import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildReleaseReadiness,
  buildSigningMetadata,
  signingPolicies,
  verifyManifestReleasePolicy,
} from './windows-release-policy.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowedOutputRoot = join(repositoryRoot, 'src-tauri', 'target');
const defaultOutput = join(repositoryRoot, 'src-tauri', 'target', 'release-evidence');
const sourcePaths = [
  'package.json',
  'package-lock.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
  'src-tauri/tauri.conf.json',
  'src-tauri/nsis/installer-hooks.nsh',
  'src-tauri/wix/admin-recovery-shortcut.wxs',
  'admin-recovery.product.json',
  'scripts/admin-recovery-bundle-source.mjs',
  'scripts/stage-windows-release.mjs',
  'scripts/verify-admin-recovery-installation.ps1',
  'scripts/verify-authenticode.ps1',
  'scripts/windows-release-policy.mjs',
];
const helperProductName =
  'HRA - Módulo operativo Tauri - Recuperación administrativa (Beta)';
const internalApplicationArtifactName = 'tauri-angular-app.exe';
const releaseChannel = 'beta';
const requiredWindowsRoles = [
  'administrative-recovery-utility',
  'msi-installer',
  'setup-installer',
  'windows-application',
];

export function artifactContract(name, version, productName, recoveryProduct) {
  const common = { product_name: productName, release_channel: releaseChannel, version };
  if (name === recoveryProduct.artifactName) {
    return {
      ...common,
      original_filename: recoveryProduct.artifactName,
      product_name: helperProductName,
      role: recoveryProduct.artifactRole,
    };
  }
  if (name === applicationArtifactName(version)) {
    return {
      ...common,
      original_filename: internalApplicationArtifactName,
      role: 'windows-application',
    };
  }
  if (name.toLowerCase().endsWith('.msi')) {
    return { ...common, role: 'msi-installer' };
  }
  if (name.toLowerCase().endsWith('-setup.exe')) {
    return { ...common, role: 'setup-installer' };
  }
  return {};
}

export function applicationArtifactName(version) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    throw new Error('La versión de la aplicación no cumple mayor.menor.parche.');
  }
  return `HRA-Modulo-Operativo-Tauri-Aplicacion-${version}-Beta.exe`;
}

function promotedArtifactName(sourceName, version) {
  return sourceName === internalApplicationArtifactName
    ? applicationArtifactName(version)
    : sourceName;
}

export function windowsBinaryInventory(deliverables) {
  const binaries = deliverables.filter((entry) => entry.role);
  const roles = binaries.map((entry) => entry.role).sort();
  const expected = [...requiredWindowsRoles].sort();
  if (binaries.length === 0) return undefined;
  if (binaries.length !== 4 || JSON.stringify(roles) !== JSON.stringify(expected)) {
    throw new Error('La entrega Windows debe incorporar exactamente cuatro binarios con roles cerrados.');
  }
  return {
    exact_artifact_count: 4,
    required_roles: expected,
  };
}

function gitValue(...arguments_) {
  const result = spawnSync('git', arguments_, { cwd: repositoryRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('No se pudo resolver la identidad Git vigente.');
  return result.stdout.trim();
}

function administrativeRecoverySourceBinding(artifact, signingPolicy, recoveryProduct) {
  const artifactSha256 = sha256File(artifact);
  let record;
  let buildReceiptSha256;
  let unsignedArtifactSha256;
  if (signingPolicy === 'institutional') {
    record = JSON.parse(readFileSync(
      join(dirname(artifact), 'bundle-source-manifest.json'),
      'utf8',
    ));
    buildReceiptSha256 = record.build_receipt?.sha256;
    unsignedArtifactSha256 = record.unsigned_artifact?.sha256;
    if (record.artifact?.sha256 !== artifactSha256) {
      throw new Error('El helper firmado diverge de su inventario de bundle.');
    }
  } else {
    const receiptPath = join(dirname(artifact), 'build-receipt.json');
    const receiptBytes = readFileSync(receiptPath);
    record = JSON.parse(receiptBytes.toString('utf8'));
    buildReceiptSha256 = sha256(receiptBytes);
    unsignedArtifactSha256 = record.artifact?.sha256;
    if (unsignedArtifactSha256 !== artifactSha256) {
      throw new Error('El helper QA diverge de su recibo de construcción.');
    }
  }
  const control = record.source_control;
  const commit = gitValue('rev-parse', 'HEAD');
  const tree = gitValue('rev-parse', 'HEAD^{tree}');
  const recordArtifactName = record.artifact?.filename ?? record.artifact?.path;
  const recordVersion = record.artifact?.version ?? record.project?.version;
  const productContractSha256 = record.product_contract?.sha256;
  if (
    control?.commit !== commit ||
    control?.tree !== tree ||
    recordArtifactName !== recoveryProduct.artifactName ||
    recordVersion !== recoveryProduct.productVersion ||
    productContractSha256 !== sha256File(join(repositoryRoot, 'admin-recovery.product.json')) ||
    !/^[0-9a-f]{64}$/u.test(buildReceiptSha256 ?? '') ||
    !/^[0-9a-f]{64}$/u.test(unsignedArtifactSha256 ?? '')
  ) {
    throw new Error('El helper administrativo no está vinculado al HEAD vigente.');
  }
  return {
    build_receipt_sha256: buildReceiptSha256,
    commit,
    product_contract_sha256: productContractSha256,
    tree,
    unsigned_artifact_sha256: unsignedArtifactSha256,
  };
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertInsideRepository(path, label) {
  const candidate = resolve(path);
  const relation = relative(repositoryRoot, candidate);
  if (relation === '' || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(`${label} debe permanecer dentro del repositorio.`);
  }
  return candidate;
}

function assertNoLinkedComponents(path, label) {
  const candidate = resolve(path);
  const relation = relative(repositoryRoot, candidate);
  if (relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(`${label} debe permanecer dentro del repositorio.`);
  }
  let current = repositoryRoot;
  for (const segment of relation.split(/[\\/]+/).filter(Boolean)) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`${label} no admite enlaces simbólicos ni junctions.`);
    }
  }
  return candidate;
}

function assertOutputPath(path) {
  const candidate = resolve(path);
  const relation = relative(allowedOutputRoot, candidate);
  if (relation === '' || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(
      'La salida de entrega debe ser un subdirectorio de src-tauri/target/.',
    );
  }
  return assertNoLinkedComponents(candidate, 'La salida de entrega');
}

function resolveOutputFile(output, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) {
    throw new Error('La entrega contiene una ruta de archivo inválida.');
  }
  const absolutePath = resolve(output, path);
  const relation = relative(output, absolutePath);
  if (relation === '' || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(`La entrega contiene una ruta fuera de la salida: ${path}`);
  }
  return assertNoLinkedComponents(absolutePath, 'La ruta de entrega');
}

function parseArguments(argv) {
  const options = {
    artifacts: [],
    output: defaultOutput,
    verify: false,
    signingPolicy: 'ci-unsigned',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--verify') {
      options.verify = true;
    } else if (argument.startsWith('--output=')) {
      options.output = argument.slice('--output='.length);
    } else if (argument === '--output') {
      options.output = argv[++index];
    } else if (argument.startsWith('--artifact=')) {
      options.artifacts.push(argument.slice('--artifact='.length));
    } else if (argument === '--artifact') {
      options.artifacts.push(argv[++index]);
    } else if (argument.startsWith('--signing-policy=')) {
      options.signingPolicy = argument.slice('--signing-policy='.length);
    } else if (argument === '--signing-policy') {
      options.signingPolicy = argv[++index];
    } else {
      throw new Error(`Argumento no reconocido: ${argument}`);
    }
  }
  if (!options.output) {
    throw new Error('La ruta de salida no puede estar vacía.');
  }
  if (!signingPolicies.has(options.signingPolicy)) {
    throw new Error(`Política de firma no reconocida: ${options.signingPolicy}`);
  }
  options.output = assertOutputPath(options.output);
  options.artifacts = options.artifacts.map((path) =>
    assertNoLinkedComponents(
      assertInsideRepository(path, 'El artefacto'),
      'El artefacto',
    ),
  );
  for (const artifact of options.artifacts) {
    const relation = relative(options.output, artifact);
    if (relation === '' || (!relation.startsWith('..') && !isAbsolute(relation))) {
      throw new Error('Los artefactos de origen deben permanecer fuera de la salida.');
    }
  }
  return options;
}

function npmPackageName(packagePath, entry) {
  if (entry.name) return entry.name;
  const marker = 'node_modules/';
  const position = packagePath.lastIndexOf(marker);
  if (position < 0) return undefined;
  return packagePath.slice(position + marker.length);
}

function npmComponents(lock) {
  const components = new Map();
  for (const [packagePath, entry] of Object.entries(lock.packages ?? {})) {
    if (!packagePath || !entry.version) continue;
    const name = npmPackageName(packagePath.replaceAll('\\', '/'), entry);
    if (!name) continue;
    const encodedName = name.startsWith('@')
      ? `${encodeURIComponent(name.split('/')[0])}/${encodeURIComponent(name.split('/').slice(1).join('/'))}`
      : encodeURIComponent(name);
    const purl = `pkg:npm/${encodedName}@${encodeURIComponent(entry.version)}`;
    const component = {
      type: 'library',
      'bom-ref': purl,
      name,
      version: entry.version,
      purl,
      properties: [{ name: 'hra:lockfile', value: 'package-lock.json' }],
    };
    if (entry.integrity?.startsWith('sha512-')) {
      component.hashes = [
        {
          alg: 'SHA-512',
          content: Buffer.from(entry.integrity.slice('sha512-'.length), 'base64').toString(
            'hex',
          ),
        },
      ];
    }
    components.set(purl, component);
  }
  return [...components.values()];
}

function cargoComponents(lockText) {
  const components = new Map();
  for (const block of lockText.split(/\r?\n\[\[package\]\]\r?\n/).slice(1)) {
    const name = block.match(/^name = "([^"]+)"/m)?.[1];
    const version = block.match(/^version = "([^"]+)"/m)?.[1];
    if (!name || !version) continue;
    const purl = `pkg:cargo/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
    const component = {
      type: 'library',
      'bom-ref': purl,
      name,
      version,
      purl,
      properties: [{ name: 'hra:lockfile', value: 'src-tauri/Cargo.lock' }],
    };
    const checksum = block.match(/^checksum = "([0-9a-f]{64})"/m)?.[1];
    if (checksum) component.hashes = [{ alg: 'SHA-256', content: checksum }];
    components.set(purl, component);
  }
  return [...components.values()];
}

function buildSbom(packageJson, packageLock, cargoLock, tauriConfig) {
  const components = [
    ...npmComponents(packageLock),
    ...cargoComponents(cargoLock),
  ].sort((left, right) => left['bom-ref'].localeCompare(right['bom-ref']));
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': `pkg:generic/${encodeURIComponent(packageJson.name)}@${packageJson.version}`,
        name: packageJson.name,
        version: packageJson.version,
        properties: [
          { name: 'hra:tauri-identifier', value: tauriConfig.identifier },
        ],
      },
      tools: {
        components: [
          {
            type: 'application',
            name: 'scripts/release-artifacts.mjs',
            version: '1',
          },
        ],
      },
    },
    components,
  };
}

function validateVersions(packageJson, packageLock, cargoToml, tauriConfig) {
  const versions = new Map([
    ['package-lock.json', packageLock.version],
    ['package-lock.json#root', packageLock.packages?.['']?.version],
    ['src-tauri/Cargo.toml', cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1]],
    ['src-tauri/tauri.conf.json', tauriConfig.version],
  ]);
  for (const [source, version] of versions) {
    if (version !== packageJson.version) {
      throw new Error(
        `Versión desalineada: package.json=${packageJson.version}; ${source}=${version ?? 'ausente'}.`,
      );
    }
  }
}

function sourceInputRecords() {
  return sourcePaths.map((path) => {
    const absolutePath = join(repositoryRoot, path);
    if (!existsSync(absolutePath)) throw new Error(`Falta la entrada requerida: ${path}`);
    return { path, sha256: sha256File(absolutePath) };
  });
}

function generateInto(output, artifacts, signingPolicy) {
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
  const packageLock = JSON.parse(
    readFileSync(join(repositoryRoot, 'package-lock.json'), 'utf8'),
  );
  const cargoToml = readFileSync(join(repositoryRoot, 'src-tauri', 'Cargo.toml'), 'utf8');
  const cargoLock = readFileSync(join(repositoryRoot, 'src-tauri', 'Cargo.lock'), 'utf8');
  const tauriConfig = JSON.parse(
    readFileSync(join(repositoryRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const recoveryProduct = JSON.parse(
    readFileSync(join(repositoryRoot, 'admin-recovery.product.json'), 'utf8'),
  );
  validateVersions(packageJson, packageLock, cargoToml, tauriConfig);
  if (recoveryProduct.productVersion !== packageJson.version) {
    throw new Error('El contrato del recuperador no comparte la versión principal.');
  }

  mkdirSync(output, { recursive: true });
  const sbomPath = join(output, 'sbom.cdx.json');
  writeJson(sbomPath, buildSbom(packageJson, packageLock, cargoLock, tauriConfig));

  const deliverables = [
    {
      path: 'sbom.cdx.json',
      sha256: sha256File(sbomPath),
      type: 'application/vnd.cyclonedx+json',
    },
  ];
  for (const artifact of artifacts.sort()) {
    if (!existsSync(artifact)) throw new Error(`No existe el artefacto: ${artifact}`);
    const stagedName = promotedArtifactName(basename(artifact), packageJson.version);
    const stagedPath = join(output, stagedName);
    if (
      ['release-manifest.json', 'SHA256SUMS.txt'].includes(stagedName) ||
      deliverables.some((entry) => entry.path === stagedName)
    ) {
      throw new Error(`Nombre de artefacto duplicado: ${stagedName}`);
    }
    cpSync(artifact, stagedPath);
    const contract = artifactContract(
      stagedName,
      packageJson.version,
      tauriConfig.productName,
      recoveryProduct,
    );
    deliverables.push({
      ...contract,
      ...(contract.role === 'administrative-recovery-utility'
        ? {
            source_binding: administrativeRecoverySourceBinding(
              artifact,
              signingPolicy,
              recoveryProduct,
            ),
          }
        : {}),
      path: stagedName,
      sha256: sha256File(stagedPath),
      type: 'application/octet-stream',
    });
  }
  deliverables.sort((left, right) => left.path.localeCompare(right.path));
  const artifactExpectations = Object.fromEntries(deliverables
    .filter((entry) => entry.product_name)
    .map((entry) => [entry.path, {
      expectedOriginalFilename: entry.original_filename,
      productName: entry.product_name,
      version: entry.version,
    }]));
  const signing = buildSigningMetadata({
    artifacts: deliverables
      .filter((entry) => entry.type === 'application/octet-stream')
      .map((entry) => join(output, entry.path)),
    policy: signingPolicy,
    version: packageJson.version,
    productName: tauriConfig.productName,
    artifactExpectations,
  });
  const readiness = buildReleaseReadiness(signing);
  const binaryInventory = windowsBinaryInventory(deliverables);
  const sourceControl = {
    commit: gitValue('rev-parse', 'HEAD'),
    tree: gitValue('rev-parse', 'HEAD^{tree}'),
  };

  const manifestPath = join(output, 'release-manifest.json');
  writeJson(manifestPath, {
    schema_version: 2,
    project: {
      identifier: tauriConfig.identifier,
      name: packageJson.name,
      product_name: tauriConfig.productName,
      publisher: tauriConfig.bundle.publisher,
      release_channel: releaseChannel,
      version: packageJson.version,
    },
    release_channel: releaseChannel,
    source_control: sourceControl,
    source_inputs: sourceInputRecords(),
    deliverables,
    ...(binaryInventory ? { windows_binary_inventory: binaryInventory } : {}),
    ...readiness,
    signing,
  });
  const checksummed = [
    ...deliverables,
    {
      path: 'release-manifest.json',
      sha256: sha256File(manifestPath),
    },
  ].sort((left, right) => left.path.localeCompare(right.path));
  writeFileSync(
    join(output, 'SHA256SUMS.txt'),
    `${checksummed.map((entry) => `${entry.sha256}  ${entry.path}`).join('\n')}\n`,
    'ascii',
  );
}

function promoteTransactionally(output, staging) {
  let backup;
  if (existsSync(output)) {
    backup = `${output}.backup-${randomUUID()}`;
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
  if (backup) rmSync(backup, { force: true, recursive: true });
}

function generate(output, artifacts, signingPolicy) {
  mkdirSync(dirname(output), { recursive: true });
  assertOutputPath(output);
  const staging = mkdtempSync(join(dirname(output), '.release-tmp-'));
  try {
    generateInto(staging, artifacts, signingPolicy);
    promoteTransactionally(output, staging);
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, { force: true, recursive: true });
    throw error;
  }
  console.log(`[Release] Metadatos reproducibles generados en ${relative(repositoryRoot, output)}.`);
}

function verify(output) {
  const manifestPath = join(output, 'release-manifest.json');
  const sumsPath = join(output, 'SHA256SUMS.txt');
  const sbomPath = join(output, 'sbom.cdx.json');
  for (const path of [manifestPath, sumsPath, sbomPath]) {
    if (!existsSync(path)) throw new Error(`Falta el archivo de entrega: ${basename(path)}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (
    manifest.productionReady !== false ||
    manifest.release_channel !== releaseChannel ||
    manifest.project?.release_channel !== releaseChannel
  ) {
    throw new Error(
      'productionReady debe permanecer en false y release_channel debe permanecer en beta.',
    );
  }
  const expectedSourceControl = {
    commit: gitValue('rev-parse', 'HEAD'),
    tree: gitValue('rev-parse', 'HEAD^{tree}'),
  };
  if (JSON.stringify(manifest.source_control) !== JSON.stringify(expectedSourceControl)) {
    throw new Error('La identidad Git cambió después de generar la entrega.');
  }
  const expectedSources = sourceInputRecords();
  if (JSON.stringify(manifest.source_inputs) !== JSON.stringify(expectedSources)) {
    throw new Error('Las entradas de origen cambiaron después de generar la entrega.');
  }
  if (!Array.isArray(manifest.deliverables)) {
    throw new Error('El manifiesto no contiene una lista de entregables válida.');
  }
  const checksumEntries = readFileSync(sumsPath, 'ascii')
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/);
      if (!match) throw new Error(`Línea SHA-256 inválida: ${line}`);
      resolveOutputFile(output, match[2]);
      return [match[2], match[1]];
    });
  const expected = new Map(checksumEntries);
  if (expected.size !== checksumEntries.length) {
    throw new Error('SHA256SUMS.txt contiene rutas duplicadas.');
  }
  const expectedNames = [
    ...manifest.deliverables.map((entry) => {
      resolveOutputFile(output, entry.path);
      if (!/^[0-9a-f]{64}$/.test(entry.sha256)) {
        throw new Error(`Hash inválido en el manifiesto: ${entry.path}`);
      }
      if (expected.get(entry.path) !== entry.sha256) {
        throw new Error(`El manifiesto y SHA256SUMS difieren: ${entry.path}`);
      }
      return entry.path;
    }),
    'release-manifest.json',
  ].sort();
  if (JSON.stringify([...expected.keys()].sort()) !== JSON.stringify(expectedNames)) {
    throw new Error('SHA256SUMS.txt no coincide con la lista cerrada de entrega.');
  }
  for (const [path, digest] of expected) {
    const absolutePath = resolveOutputFile(output, path);
    if (!existsSync(absolutePath) || sha256File(absolutePath) !== digest) {
      throw new Error(`Checksum inválido: ${path}`);
    }
  }
  verifyManifestReleasePolicy(manifest, output);
  const sbom = JSON.parse(readFileSync(sbomPath, 'utf8'));
  if (sbom.bomFormat !== 'CycloneDX' || sbom.specVersion !== '1.6') {
    throw new Error('El SBOM no cumple CycloneDX 1.6.');
  }
  console.log(`[Release] Entrega reproducible verificada (${expected.size} archivos).`);
}

export function isDirectExecution(metaUrl, argvEntry = process.argv[1]) {
  return (
    typeof argvEntry === 'string' &&
    argvEntry.length > 0 &&
    metaUrl === pathToFileURL(resolve(argvEntry)).href
  );
}

if (isDirectExecution(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.verify) verify(options.output);
    else generate(options.output, options.artifacts, options.signingPolicy);
  } catch (error) {
    console.error(`[Release] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
