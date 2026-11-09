import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { signingPolicies } from './windows-release-policy.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalTargetRoot = join(repositoryRoot, 'src-tauri', 'target');
const releaseScript = join(repositoryRoot, 'scripts', 'release-artifacts.mjs');
const recoveryProductPath = join(repositoryRoot, 'admin-recovery.product.json');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertInsideTarget(path) {
  const candidate = resolve(path);
  const relation = relative(canonicalTargetRoot, candidate);
  if (relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error('La búsqueda de instaladores debe permanecer bajo src-tauri/target.');
  }
  return candidate;
}

function assertArtifact(path, label) {
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) {
    throw new Error(`${label} no existe o no es un archivo regular: ${path}`);
  }
  return path;
}

function exactlyOne(directory, pattern, label) {
  if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
    throw new Error(`No existe el directorio de ${label}: ${directory}`);
  }
  const matches = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => join(directory, entry.name));
  if (matches.length !== 1) {
    throw new Error(`${label} requiere exactamente un artefacto de la versión vigente; encontrados=${matches.length}.`);
  }
  return assertArtifact(matches[0], label);
}

function exactlyOneName(names, pattern, label) {
  const matches = names.filter((name) => pattern.test(name));
  if (matches.length !== 1) {
    throw new Error(`${label} requiere exactamente un artefacto de la versión vigente; encontrados=${matches.length}.`);
  }
  return matches[0];
}

export function selectWindowsArtifactNames(config, inventory, recoveryProduct) {
  if (config.bundle?.publisher !== 'Hospital Regional Ayacucho') {
    throw new Error('tauri.conf.json no declara el editor institucional.');
  }
  const productName = config.productName;
  const version = config.version;
  if (!productName || !/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    throw new Error('tauri.conf.json no declara producto y versión semántica válidos.');
  }
  const escapedProduct = escapeRegExp(productName);
  const escapedVersion = escapeRegExp(version);
  return {
    productName,
    version,
    executable: exactlyOneName(
      inventory.release ?? [],
      /^tauri-angular-app\.exe$/u,
      'El ejecutable Tauri',
    ),
    helper: exactlyOneName(
      inventory.helper ?? [],
      new RegExp(`^${escapeRegExp(recoveryProduct.artifactName)}$`, 'u'),
      'El recuperador administrativo',
    ),
    msi: exactlyOneName(
      inventory.msi ?? [],
      new RegExp(`^${escapedProduct}_${escapedVersion}_x64_[A-Za-z]{2}-[A-Za-z]{2}\\.msi$`),
      'El instalador MSI',
    ),
    nsis: exactlyOneName(
      inventory.nsis ?? [],
      new RegExp(`^${escapedProduct}_${escapedVersion}_x64-setup\\.exe$`),
      'El instalador NSIS',
    ),
  };
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function currentGitValue(...arguments_) {
  const result = spawnSync('git', arguments_, { cwd: repositoryRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('No se pudo resolver la identidad Git vigente.');
  return result.stdout.trim();
}

function helperSource(policy, product) {
  const root = policy === 'institutional'
    ? join(canonicalTargetRoot, 'admin-recovery', 'bundle-source')
    : join(canonicalTargetRoot, 'admin-recovery', 'review');
  const artifact = assertArtifact(join(root, product.artifactName), 'El recuperador administrativo');
  const manifestName = policy === 'institutional'
    ? 'bundle-source-manifest.json'
    : 'release-manifest.json';
  const manifest = JSON.parse(readFileSync(join(root, manifestName), 'utf8'));
  const artifactRecord = policy === 'institutional'
    ? manifest.artifact
    : manifest.deliverables?.find((entry) => entry.path === product.artifactName);
  if (
    artifactRecord?.sha256 !== sha256File(artifact) ||
    (artifactRecord?.filename ?? artifactRecord?.path) !== product.artifactName ||
    (artifactRecord?.version ?? manifest.project?.version) !== product.productVersion ||
    manifest.source_control?.commit !== currentGitValue('rev-parse', 'HEAD') ||
    manifest.source_control?.tree !== currentGitValue('rev-parse', 'HEAD^{tree}')
  ) {
    throw new Error('La evidencia del recuperador no corresponde al HEAD vigente.');
  }
  return artifact;
}

export function discoverWindowsArtifacts(
  targetRoot = canonicalTargetRoot,
  policy = 'ci-unsigned',
) {
  const confinedTarget = assertInsideTarget(targetRoot);
  const config = JSON.parse(
    readFileSync(join(repositoryRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const recoveryProduct = JSON.parse(readFileSync(recoveryProductPath, 'utf8'));
  const releaseRoot = join(confinedTarget, 'release');
  const msiRoot = join(releaseRoot, 'bundle', 'msi');
  const nsisRoot = join(releaseRoot, 'bundle', 'nsis');
  const selected = selectWindowsArtifactNames(config, {
    release: existsSync(releaseRoot) ? readdirSync(releaseRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile()).map((entry) => entry.name) : [],
    helper: [recoveryProduct.artifactName],
    msi: existsSync(msiRoot) ? readdirSync(msiRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile()).map((entry) => entry.name) : [],
    nsis: existsSync(nsisRoot) ? readdirSync(nsisRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile()).map((entry) => entry.name) : [],
  }, recoveryProduct);
  const executable = assertArtifact(
    join(releaseRoot, selected.executable),
    'El ejecutable Tauri',
  );
  const msi = exactlyOne(
    msiRoot,
    new RegExp(`^${escapeRegExp(selected.msi)}$`, 'u'),
    'El instalador MSI',
  );
  const nsis = exactlyOne(
    nsisRoot,
    new RegExp(`^${escapeRegExp(selected.nsis)}$`, 'u'),
    'El instalador NSIS',
  );
  const helper = helperSource(policy, recoveryProduct);
  return {
    productName: selected.productName,
    version: selected.version,
    artifacts: [executable, helper, msi, nsis],
  };
}

function runNode(arguments_) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout).trim());
  }
  if (result.stdout.trim()) process.stdout.write(result.stdout);
}

function parseArguments(argv) {
  const options = { policy: 'ci-unsigned', output: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--policy') options.policy = argv[++index];
    else if (argument.startsWith('--policy=')) options.policy = argument.slice('--policy='.length);
    else if (argument === '--output') options.output = argv[++index];
    else if (argument.startsWith('--output=')) options.output = argument.slice('--output='.length);
    else throw new Error(`Argumento no reconocido: ${argument}`);
  }
  if (!signingPolicies.has(options.policy)) throw new Error(`Política no reconocida: ${options.policy}`);
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const discovered = discoverWindowsArtifacts(canonicalTargetRoot, options.policy);
  const generation = [releaseScript, '--signing-policy', options.policy];
  if (options.output) generation.push('--output', options.output);
  for (const artifact of discovered.artifacts) generation.push('--artifact', artifact);
  runNode(generation);
  const verification = [releaseScript, '--verify'];
  if (options.output) verification.push('--output', options.output);
  runNode(verification);
  console.log(
    `[Release] EXE, MSI y NSIS ${discovered.version} incorporados con política ${options.policy}.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[Release] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
