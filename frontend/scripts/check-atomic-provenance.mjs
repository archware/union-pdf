import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalization from './git-clean-eol.cjs';
import safePaths from './safe-paths.cjs';
import sourceManifest from './source-manifest.cjs';

const {
  CONTENT_CANONICALIZATION,
  canonicalFileObjectId,
  canonicalFileSha256,
  expectedObjectIdLength,
  repositoryIdentity,
} = canonicalization;
const { confinedPath, relativePath } = safePaths;
const { verifySourceManifest } = sourceManifest;
const POLICY_VERSION = '1.2.3';
const REQUIRED_MARKER = 'ATOMIC_GOVERNANCE_REQUIRED';
/*
HTML no distingue mayusculas, por lo que el archivo `.html` se comprueba con
`i`: `<BUTTON>` es la misma primitiva que `<button>` y no puede convertirse en
una via de elusion. En TypeScript la comprobacion permanece sensible a
mayusculas para no confundir un generico como `viewChild<Button>('x')` con una
etiqueta embebida; las etiquetas de una plantilla Angular se escriben en
minuscula.
*/
const NATIVE_VISUAL_TAGS_HTML = /<(?:button|dialog|input|select|table|textarea)\b/i;
const NATIVE_VISUAL_TAGS_TYPESCRIPT = /<(?:button|dialog|input|select|table|textarea)\b/;
const NATIVE_VISUAL_SELECTORS =
  /(?<![-\w])(?:button|dialog|input|select|table|textarea)(?=\s*(?:\[|:|\.|#|\{|,|>|\+|~))/im;
// Arriba del todo, con el resto de constantes del modulo: stripComments() se
// llama desde funciones declaradas antes que ella, y un `const` a media altura
// las dejaba en zona muerta temporal.
const BACKSLASH = String.fromCharCode(92);
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const NEWLINE = String.fromCharCode(10);
const FIXED_COLOR = /(?<!&)#[0-9a-f]{3,8}\b/i;
const INVALID_NUMERIC_TOKEN = /\d+(?:\.\d+)?var\s*\(/i;
const INVALID_NEGATED_TOKEN = /(?<![\w-])-var\s*\(/i;
const INLINE_STYLE_IN_MARKUP = /<[a-z][^<>]*\sstyle\s*=/is;
const REQUIRED_GOVERNED_SERVICES = [
  'theme.service.ts',
  'app-version.service.ts',
  'modal.service.ts',
  'popup.service.ts',
  'toast.service.ts',
];
const ATOMIC_SERVICES_ROOT = 'src/app/shared/ui/services';
const ALLOWED_LAYERS = ['atoms', 'molecules', 'organisms', 'surfaces', 'templates'];
const REQUIRED_GOVERNANCE_ARTIFACTS = [
  {
    local: 'docs/ATOMIC_GOVERNANCE.md',
    atomic: 'governance/consumer/ATOMIC_GOVERNANCE.md',
  },
  {
    local: 'scripts/check-atomic-provenance.mjs',
    atomic: 'governance/consumer/check-atomic-provenance.mjs',
  },
  {
    local: 'scripts/git-clean-eol.cjs',
    atomic: 'governance/consumer/git-clean-eol.cjs',
  },
  {
    local: 'scripts/safe-paths.cjs',
    atomic: 'governance/consumer/safe-paths.cjs',
  },
  {
    local: 'scripts/read-atomic-contract.cjs',
    atomic: 'governance/consumer/read-atomic-contract.cjs',
  },
  {
    local: 'scripts/source-manifest.cjs',
    atomic: 'governance/consumer/source-manifest.cjs',
  },
  {
    local: '.github/workflows/atomic-governance.yml',
    atomic: 'governance/consumer/atomic-governance.yml',
  },
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const option = (name) => {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
};
const failures = [];
const normalize = (path) => path.replaceAll('\\', '/');
const stableJson = (value) => JSON.stringify(value);
let consumerRoot;
let manifestPath;
try {
  consumerRoot = realpathSync.native(resolve(option('--consumer-root') || join(scriptDirectory, '..')));
  const manifestLocation = confinedPath(
    consumerRoot,
    option('--manifest') || 'docs/atomic-provenance.json',
    'manifest',
  );
  manifestPath = manifestLocation.absolute;
} catch (error) {
  console.error(`- ${error.message}`);
  process.exit(1);
}
const digestFailures = new Set();
const digest = (repositoryRoot, path) => {
  try {
    return canonicalFileSha256(repositoryRoot, path);
  } catch (error) {
    const message = `No se pudo verificar ${normalize(relative(repositoryRoot, path))}: ${error.message}`;
    if (!digestFailures.has(message)) {
      digestFailures.add(message);
      failures.push(message);
    }
    return null;
  }
};

function git(repositoryRoot, args) {
  const result = spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    failures.push(
      `No se pudo verificar el repositorio Git ${repositoryRoot}: ${
        result.error?.message || result.stderr || result.stdout
      }`,
    );
    return null;
  }
  return result.stdout;
}

function gitPathspecBatches(repositoryRoot, baseArgs, paths, maximumArgumentLength = 8192) {
  const sorted = [...new Set(paths)].sort();
  if (sorted.length === 0) return [];
  const batches = [];
  let batch = [];
  let argumentLength = baseArgs.reduce((total, value) => total + value.length + 1, 4);
  for (const item of sorted) {
    const itemLength = item.length + 1;
    if (batch.length > 0 && argumentLength + itemLength > maximumArgumentLength) {
      batches.push(batch);
      batch = [];
      argumentLength = baseArgs.reduce((total, value) => total + value.length + 1, 4);
    }
    if (argumentLength + itemLength > maximumArgumentLength) {
      failures.push(`La ruta gobernada excede el límite seguro de argumentos Git: ${item}.`);
      return null;
    }
    batch.push(item);
    argumentLength += itemLength;
  }
  if (batch.length > 0) batches.push(batch);
  const outputs = [];
  for (const pathBatch of batches) {
    const output = git(repositoryRoot, ['--literal-pathspecs', ...baseArgs, '--', ...pathBatch]);
    if (output === null) return null;
    outputs.push(output);
  }
  return outputs;
}

function filesBelow(root, extensions = null, base = root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(root, entry.name);
    if (entry.isSymbolicLink()) {
      failures.push(`La superficie gobernada no admite enlaces simbólicos: ${entryPath}.`);
      return [];
    }
    if (entry.isDirectory()) return filesBelow(entryPath, extensions, base);
    if (extensions && !extensions.some((extension) => entry.name.endsWith(extension))) return [];
    return [normalize(relative(base, entryPath))];
  });
}

function requireFile(path, message) {
  if (!existsSync(path)) {
    failures.push(message);
    return false;
  }
  return true;
}

if (!requireFile(manifestPath, `No existe el manifiesto obligatorio: ${manifestPath}`)) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const configuredAtomicRoot =
  process.env.ATOMIC_UI_ROOT || manifest.atomicRepository || '';
let atomicRoot;
try {
  const resolvedAtomicRoot = isAbsolute(configuredAtomicRoot)
    ? resolve(configuredAtomicRoot)
    : resolve(consumerRoot, configuredAtomicRoot);
  atomicRoot = realpathSync.native(resolvedAtomicRoot);
} catch (error) {
  failures.push(`No existe el repositorio fuente Atomic: ${configuredAtomicRoot || '(vacío)'}.`);
  atomicRoot = resolve(consumerRoot, '__atomic-source-invalid__');
}

function safeRelative(root, value, label, options = {}) {
  try {
    return confinedPath(root, value, label, options).relative;
  } catch (error) {
    failures.push(error.message);
    return null;
  }
}

function safeJoin(root, value, label, options = {}) {
  try {
    return confinedPath(root, value, label, options).absolute;
  } catch (error) {
    failures.push(error.message);
    return null;
  }
}
const atomicProtectedFiles = new Set([
  '.gitattributes',
  'package.json',
  'distribution/package-contract.json',
  'distribution/atomic-source-manifest.json',
]);
const atomicProtectedPathspecs = new Set(atomicProtectedFiles);
for (const artifact of REQUIRED_GOVERNANCE_ARTIFACTS) {
  atomicProtectedFiles.add(artifact.atomic);
  atomicProtectedPathspecs.add(artifact.atomic);
}

if (manifest.schemaVersion !== 1) failures.push('schemaVersion debe ser 1.');
if (manifest.policyVersion !== POLICY_VERSION) {
  failures.push(`policyVersion debe ser ${POLICY_VERSION}.`);
}
if (stableJson(manifest.contentCanonicalization) !== stableJson(CONTENT_CANONICALIZATION)) {
  failures.push(
    'contentCanonicalization debe declarar git-clean-eol-v1, LF para texto, ' +
      'identidad para binarios y rechazo de otros filtros clean.',
  );
}
if (!manifest.changeId?.trim()) failures.push('changeId es obligatorio.');
if (manifest.atomicRemote !== 'archware/-Atomic-UI') {
  failures.push('atomicRemote debe ser la fuente canónica archware/-Atomic-UI.');
}
if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(manifest.atomicRef || '')) {
  failures.push('atomicRef debe ser un commit Git completo de 40 o 64 caracteres hexadecimales.');
}
if (!manifest.atomicVersion?.trim()) {
  failures.push('atomicVersion es obligatorio para fijar la versi\u00f3n consumida.');
}
if (!/^[0-9a-f]{64}$/i.test(manifest.atomicSourceTreeSha256 || '')) {
  failures.push('atomicSourceTreeSha256 debe ser una huella SHA-256 v\u00e1lida.');
}
if (!Array.isArray(manifest.uiRoots) || manifest.uiRoots.length === 0) {
  failures.push('uiRoots debe declarar al menos una raíz UI consumidora.');
}
if (!Array.isArray(manifest.featureRoots) || manifest.featureRoots.length === 0) {
  failures.push('featureRoots debe declarar al menos una raíz de features o páginas.');
}
if (!Array.isArray(manifest.layers) || manifest.layers.length === 0) {
  failures.push('layers debe declarar las capas Atomic inventariadas.');
} else if (
  manifest.layers.length !== ALLOWED_LAYERS.length ||
  !ALLOWED_LAYERS.every((layer, index) => manifest.layers[index] === layer)
) {
  failures.push(`layers debe coincidir exactamente con ${ALLOWED_LAYERS.join(', ')}.`);
}
if (!Array.isArray(manifest.components)) failures.push('components debe ser un arreglo.');
if (!existsSync(atomicRoot)) failures.push(`No existe el repositorio fuente Atomic: ${atomicRoot}`);

let atomicHead = null;
let atomicObjectIdLength = null;
if (existsSync(atomicRoot)) {
  const topLevel = git(atomicRoot, ['rev-parse', '--show-toplevel']);
  if (
    topLevel &&
    realpathSync.native(resolve(topLevel.trim())) !== realpathSync.native(atomicRoot)
  ) {
    failures.push('atomicRepository debe resolver exactamente a la raíz del repositorio Git Atomic.');
  }
  atomicHead = git(atomicRoot, ['rev-parse', 'HEAD'])?.trim() || null;
  try {
    atomicObjectIdLength = expectedObjectIdLength(repositoryIdentity(atomicRoot).objectFormat);
  } catch (error) {
    failures.push(error.message);
  }
  if (
    atomicObjectIdLength &&
    !new RegExp(`^[0-9a-f]{${atomicObjectIdLength}}$`, 'i').test(manifest.atomicRef || '')
  ) {
    failures.push(`atomicRef no coincide con el formato de objetos Git del repositorio Atomic.`);
  }
  if (
    atomicHead &&
    new RegExp(`^[0-9a-f]{${atomicObjectIdLength || 40}}$`, 'i').test(manifest.atomicRef || '') &&
    atomicHead !== manifest.atomicRef
  ) {
    failures.push(
      `La fuente Atomic disponible está en ${atomicHead}, pero atomicRef fija ${manifest.atomicRef}.`,
    );
  }
}

const consumerAttributesPath = safeJoin(
  consumerRoot,
  '.gitattributes',
  '.gitattributes consumidor',
);
if (consumerAttributesPath && requireFile(
  consumerAttributesPath,
  '.gitattributes es obligatorio en todo consumidor.',
)) {
  const firstRule = readFileSync(consumerAttributesPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));
  if (firstRule !== '* text=auto eol=crlf') {
    failures.push('.gitattributes debe iniciar con "* text=auto eol=crlf".');
  }
  const stage = git(consumerRoot, [
    '--literal-pathspecs',
    'ls-files',
    '--stage',
    '--',
    '.gitattributes',
  ]);
  if (!stage?.trim() || stage.split(/\r?\n/).some((entry) => entry.startsWith('120000 '))) {
    failures.push('.gitattributes debe estar versionado como archivo Git regular.');
  }
  const attributeStatus = git(consumerRoot, [
    '--literal-pathspecs',
    'status',
    '--porcelain=v1',
    '--',
    '.gitattributes',
  ]);
  if (attributeStatus?.trim()) {
    failures.push('.gitattributes debe permanecer limpio respecto del índice Git.');
  }
}

if (existsSync(atomicRoot)) {
  const atomicPackagePath = join(atomicRoot, 'package.json');
  const atomicSourceManifestPath = join(
    atomicRoot,
    'distribution',
    'atomic-source-manifest.json',
  );
  if (
    requireFile(atomicPackagePath, 'package.json de Atomic es obligatorio.') &&
    requireFile(
      atomicSourceManifestPath,
      'distribution/atomic-source-manifest.json de Atomic es obligatorio.',
    )
  ) {
    const atomicPackage = JSON.parse(readFileSync(atomicPackagePath, 'utf8'));
    const atomicSourceManifest = JSON.parse(readFileSync(atomicSourceManifestPath, 'utf8'));
    try {
      verifySourceManifest(atomicRoot);
    } catch (error) {
      failures.push(error.message);
    }
    for (const file of atomicSourceManifest.files || []) {
      if (file.path) {
        const protectedFile = safeRelative(atomicRoot, file.path, 'archivo del manifiesto Atomic');
        if (protectedFile) {
          atomicProtectedFiles.add(protectedFile);
          atomicProtectedPathspecs.add(protectedFile);
        }
      }
    }
    if (manifest.atomicVersion !== atomicPackage.version) {
      failures.push(
        `Versi\u00f3n Atomic divergente: se declar\u00f3 ${manifest.atomicVersion || '(vac\u00eda)'} ` +
          `y la fuente disponible es ${atomicPackage.version || '(vac\u00eda)'}.`,
      );
    }
    if (atomicSourceManifest.packageVersion !== atomicPackage.version) {
      failures.push('El manifiesto de fuentes Atomic no coincide con la versi\u00f3n del paquete.');
    }
    if (manifest.atomicSourceTreeSha256 !== atomicSourceManifest.sourceTreeSha256) {
      failures.push('La huella de fuentes Atomic no coincide con la referencia disponible.');
    }
  }
}

const agentsPath = safeJoin(consumerRoot, 'AGENTS.md', 'AGENTS.md');
if (
  !agentsPath ||
  !requireFile(agentsPath, 'AGENTS.md es obligatorio en todo consumidor.') ||
  !readFileSync(agentsPath, 'utf8').includes(REQUIRED_MARKER)
) {
  failures.push(`AGENTS.md debe contener el marcador ${REQUIRED_MARKER}.`);
}

const packageRoot = safeRelative(consumerRoot, manifest.packageRoot || '.', 'packageRoot', {
  allowDot: true,
});
const packagePath = packageRoot
  ? safeJoin(
      consumerRoot,
      `${packageRoot === '.' ? '' : `${packageRoot}/`}package.json`,
      'package.json',
    )
  : null;
if (packagePath && requireFile(packagePath, 'package.json es obligatorio.')) {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const packageDirectory = dirname(packagePath);
  const gateRelative = normalize(
    relative(packageDirectory, join(consumerRoot, 'scripts', 'check-atomic-provenance.mjs')),
  );
  const consumerRelative = normalize(relative(packageDirectory, consumerRoot)) || '.';
  const expectedCommand =
    packageRoot === '.'
      ? 'node scripts/check-atomic-provenance.mjs'
      : `node ${gateRelative} --consumer-root=${consumerRelative}`;
  if (packageJson.scripts?.['check:atomic'] !== expectedCommand) {
    failures.push('package.json debe declarar check:atomic con el gate canónico.');
  }
}

for (const requiredArtifact of REQUIRED_GOVERNANCE_ARTIFACTS) {
  const declaredArtifact = (manifest.governanceArtifacts || []).find(
    (artifact) =>
      artifact.local === requiredArtifact.local && artifact.atomic === requiredArtifact.atomic,
  );
  if (!declaredArtifact) {
    failures.push(`Artefacto de gobierno no declarado: ${requiredArtifact.local}`);
  }
}

for (const artifact of REQUIRED_GOVERNANCE_ARTIFACTS) {
  const localPath = safeJoin(consumerRoot, artifact.local, `artefacto ${artifact.local}`);
  const atomicPath = safeJoin(atomicRoot, artifact.atomic, `fuente ${artifact.atomic}`);
  if (!localPath || !atomicPath) continue;
  if (!requireFile(localPath, `Artefacto de gobierno ausente: ${artifact.local}`)) continue;
  if (!requireFile(atomicPath, `Fuente de gobierno Atomic ausente: ${artifact.atomic}`)) continue;
  if (digest(consumerRoot, localPath) !== digest(atomicRoot, atomicPath)) {
    failures.push(`Artefacto de gobierno modificado fuera de Atomic: ${artifact.local}`);
  }
}

const governedServices = Array.isArray(manifest.governedServices) ? manifest.governedServices : [];
if (!Array.isArray(manifest.governedServices)) {
  failures.push('governedServices debe declarar los servicios de presentación gobernados.');
}
const primaryUiRoot =
  Array.isArray(manifest.uiRoots) && manifest.uiRoots.length > 0
    ? safeRelative(consumerRoot, manifest.uiRoots[0], 'uiRoots[0]')
    : null;
const declaredServices = new Map();
for (const service of governedServices) {
  let file = (service.file || '').trim();
  if (!file) {
    failures.push('Todo servicio gobernado debe declarar file.');
    continue;
  }
  file = safeRelative(consumerRoot, file, `servicio ${file}`);
  if (!file || file.includes('/')) {
    failures.push('Todo servicio gobernado debe declarar solo un nombre de archivo.');
    continue;
  }
  if (declaredServices.has(file)) {
    failures.push(`Servicio gobernado duplicado en manifiesto: ${file}`);
    continue;
  }
  declaredServices.set(file, service);
}
for (const requiredService of REQUIRED_GOVERNED_SERVICES) {
  if (!declaredServices.has(requiredService)) {
    failures.push(`Servicio gobernado no declarado: ${requiredService}`);
  }
}
if (primaryUiRoot) {
  for (const [file, service] of declaredServices) {
    const localRelative = `${normalize(primaryUiRoot)}/services/${file}`;
    const localPath = safeJoin(
      consumerRoot,
      `${primaryUiRoot}/services/${file}`,
      `servicio consumidor ${file}`,
    );
    const atomicPath = safeJoin(
      atomicRoot,
      `${ATOMIC_SERVICES_ROOT}/${file}`,
      `servicio Atomic ${file}`,
    );
    if (!localPath || !atomicPath) continue;
    atomicProtectedFiles.add(`${ATOMIC_SERVICES_ROOT}/${file}`);
    atomicProtectedPathspecs.add(`${ATOMIC_SERVICES_ROOT}/${file}`);
    if (!['exact', 'adapted'].includes(service.mode)) {
      failures.push(`Modo inválido para servicio ${file}: use exact o adapted.`);
      continue;
    }
    const localExists = requireFile(localPath, `Servicio gobernado ausente en el consumidor: ${localRelative}`);
    const atomicExists = requireFile(atomicPath, `Fuente Atomic del servicio ausente: ${ATOMIC_SERVICES_ROOT}/${file}`);
    if (!localExists || !atomicExists) continue;
    if (service.mode === 'exact') {
      if (digest(consumerRoot, localPath) !== digest(atomicRoot, atomicPath)) {
        failures.push(`Propagación exacta divergente en servicio: ${localRelative}`);
      }
      continue;
    }
    if (!service.localSha256?.trim() || !service.atomicSha256?.trim()) {
      failures.push(`Servicio adaptado sin snapshot verificable: ${file}`);
      continue;
    }
    if (digest(consumerRoot, localPath) !== service.localSha256) {
      failures.push(`Adaptación de servicio modificada sin nueva decisión: ${localRelative}`);
    }
    if (digest(atomicRoot, atomicPath) !== service.atomicSha256) {
      failures.push(`Fuente Atomic del servicio cambió respecto al snapshot: ${ATOMIC_SERVICES_ROOT}/${file}`);
    }
  }
}

const components = Array.isArray(manifest.components) ? manifest.components : [];
const declared = new Set();
for (const component of components) {
  const local = safeRelative(consumerRoot, component.local || '', 'component.local');
  if (!local) {
    failures.push('Todo componente debe declarar local.');
    continue;
  }
  const atomic = safeRelative(atomicRoot, component.atomic || '', `component.atomic de ${local}`);
  if (!atomic) continue;
  if (declared.has(local)) failures.push(`Componente duplicado en manifiesto: ${local}`);
  declared.add(local);
  atomicProtectedPathspecs.add(atomic);

  if (!['exact', 'adapted'].includes(component.mode)) {
    failures.push(`Modo inválido para ${local}: use exact o adapted.`);
  }
  const localRoot = safeJoin(consumerRoot, local, `componente consumidor ${local}`);
  const sourceRoot = safeJoin(atomicRoot, atomic, `componente Atomic ${atomic}`);
  if (!localRoot || !sourceRoot) continue;
  if (!requireFile(localRoot, `No existe el componente consumidor: ${local}`)) continue;
  if (!requireFile(sourceRoot, `No existe la fuente Atomic: ${atomic}`)) continue;

  const localFiles = filesBelow(localRoot).sort();
  const atomicFiles = filesBelow(sourceRoot).sort();

  if (component.mode === 'adapted') {
    if (!component.justification?.trim()) {
      failures.push(`Adaptación sin justificación: ${local}`);
    }
    if (!component.decisionRecord?.trim()) {
      failures.push(`Adaptación sin decisionRecord: ${local}`);
    } else {
      const decisionRecord = safeJoin(
        consumerRoot,
        component.decisionRecord,
        `decisionRecord de ${local}`,
      );
      if (decisionRecord && !existsSync(decisionRecord)) {
        failures.push(`No existe decisionRecord para ${local}: ${component.decisionRecord}`);
      }
    }
    if (!Array.isArray(component.adaptationSnapshot) || component.adaptationSnapshot.length === 0) {
      failures.push(`Adaptación sin snapshot verificable: ${local}`);
    } else {
      const snapshotFiles = [];
      const snapshotSet = new Set();
      for (const snapshot of component.adaptationSnapshot) {
        const snapshotFile = safeRelative(localRoot, snapshot.file || '', `snapshot de ${local}`);
        if (!snapshotFile) continue;
        if (snapshotSet.has(snapshotFile)) {
          failures.push(`Snapshot duplicado en adaptación: ${local}/${snapshotFile}`);
          continue;
        }
        snapshotSet.add(snapshotFile);
        snapshotFiles.push(snapshotFile);
        if (snapshot.atomicSha256 !== null && snapshot.atomicSha256 !== undefined) {
          atomicProtectedFiles.add(`${atomic}/${snapshotFile}`);
        }
        const localFile = safeJoin(
          consumerRoot,
          `${local}/${snapshotFile}`,
          `snapshot consumidor ${local}`,
        );
        const atomicFile = safeJoin(
          atomicRoot,
          `${atomic}/${snapshotFile}`,
          `snapshot Atomic ${atomic}`,
        );
        if (!localFile || !atomicFile) continue;
        const actualLocal = existsSync(localFile) ? digest(consumerRoot, localFile) : null;
        const actualAtomic = existsSync(atomicFile) ? digest(atomicRoot, atomicFile) : null;
        if (actualLocal !== (snapshot.localSha256 ?? null)) {
          failures.push(`Adaptación modificada sin nueva decisión: ${local}/${snapshot.file}`);
        }
        if (actualAtomic !== (snapshot.atomicSha256 ?? null)) {
          failures.push(`Fuente Atomic cambió respecto al snapshot: ${atomic}/${snapshot.file}`);
        }
      }
      const expectedFiles = [...new Set([...localFiles, ...atomicFiles])].sort();
      if (stableJson(snapshotFiles.sort()) !== stableJson(expectedFiles)) {
        failures.push(`El conjunto de archivos adaptados cambió: ${local}.`);
      }
    }
  }

  if (component.mode === 'exact') {
    if (!Array.isArray(component.files) || component.files.length === 0) {
      failures.push(`La copia exacta debe declarar files: ${local}`);
      continue;
    }
    const declaredFiles = [];
    const declaredFileSet = new Set();
    for (const file of component.files) {
      const componentFile = safeRelative(localRoot, file, `archivo exacto de ${local}`);
      if (!componentFile) continue;
      if (declaredFileSet.has(componentFile)) {
        failures.push(`Archivo exacto duplicado en manifiesto: ${local}/${componentFile}`);
        continue;
      }
      declaredFileSet.add(componentFile);
      declaredFiles.push(componentFile);
      atomicProtectedFiles.add(`${atomic}/${componentFile}`);
      const localFile = safeJoin(localRoot, componentFile, `archivo consumidor ${local}`);
      const sourceFile = safeJoin(sourceRoot, componentFile, `archivo Atomic ${atomic}`);
      if (!localFile || !sourceFile) continue;
      if (!existsSync(localFile) || !existsSync(sourceFile)) {
        failures.push(`Archivo exacto ausente: ${local}/${file}`);
      } else if (digest(consumerRoot, localFile) !== digest(atomicRoot, sourceFile)) {
        failures.push(`Propagación exacta divergente: ${local}/${file}`);
      }
    }
    const sortedDeclaredFiles = declaredFiles.sort();
    if (
      stableJson(sortedDeclaredFiles) !== stableJson(localFiles) ||
      stableJson(sortedDeclaredFiles) !== stableJson(atomicFiles)
    ) {
      failures.push(`El conjunto de archivos exactos cambió: ${local}.`);
    }
  }
}

const governedComponentRoots = components
  .filter((component) => component.local)
  .map((component) => safeJoin(consumerRoot, component.local, 'component.local'))
  .filter(Boolean);
const belongsToGovernedComponent = (file) => {
  const absolute = resolve(file);
  return governedComponentRoots.some(
    (root) => absolute === root || absolute.startsWith(`${root}${sep}`),
  );
};

for (const uiRoot of manifest.uiRoots || []) {
  const absoluteUiRoot = safeJoin(consumerRoot, uiRoot, 'uiRoot');
  if (!absoluteUiRoot) continue;
  if (!requireFile(absoluteUiRoot, `Raíz UI consumidora ausente: ${uiRoot}`)) continue;
  for (const layer of manifest.layers || []) {
    const layerRoot = join(absoluteUiRoot, layer);
    if (!existsSync(layerRoot)) continue;
    for (const entry of readdirSync(layerRoot, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) {
        failures.push(`La capa gobernada no admite enlaces simbólicos: ${join(layerRoot, entry.name)}.`);
        continue;
      }
      if (!entry.isDirectory()) continue;
      const local = normalize(relative(consumerRoot, join(layerRoot, entry.name)));
      if (!declared.has(local)) failures.push(`Componente sin procedencia Atomic: ${local}`);
    }
  }

  for (const localFile of filesBelow(absoluteUiRoot, ['.html', '.scss', '.css', '.ts'])) {
    const file = join(absoluteUiRoot, localFile);
    const local = normalize(relative(consumerRoot, file));
    if (local.includes('/styles/tokens/')) continue;
    const source = readFileSync(file, 'utf8');
    const executableSource = stripComments(source, { lineComments: file.endsWith('.ts') });
    if (!belongsToGovernedComponent(file) && FIXED_COLOR.test(executableSource)) {
      failures.push(`Color fijo fuera de tokens: ${local}`);
    }
    if (INVALID_NUMERIC_TOKEN.test(executableSource)) {
      failures.push(`Valor CSS dañado por sustitución mecánica: ${local}`);
    }
    if (INVALID_NEGATED_TOKEN.test(executableSource)) {
      failures.push(`Negación inválida de token (use calc(-1 * var(...))): ${local}`);
    }
  }
}

/*
Deja el codigo sin comentarios, para que las comprobaciones de color y de
tokens miren solo lo que se ejecuta.

DOS PASADAS, Y CADA UNA CON UNA REGLA DISTINTA. No es simetria mal resuelta:
los dos tipos de comentario tienen problemas opuestos.

1) BLOQUE, `/* … *\/`: se retiran EN TODAS PARTES, tambien dentro de las
   plantillas literales. Es lo que hacia la version original con una regex, y
   hay que conservarlo: en este repositorio las plantillas literales llevan CSS
   dentro, y un `/* 4var(--space-2) → var(--space-8) *\/` que documenta el valor
   ANTERIOR es un comentario, no codigo. Respetar ahi el estado de comillas
   —como intente en una primera version— hace que sobrevivan y se denuncien
   como valores danados: paso en toggle, button, floating-input, action-group y
   avatar-group.

2) LINEA, `//`: se retiran solo FUERA de las cadenas, y solo en TypeScript. Un
   `//` aparece dentro de 'https://…', y cortar la linea ahi mutila la cadena y
   esconde lo que venga despues. En CSS y HTML no abre nada.

El orden tambien importa: la pasada de bloque va primero, y de paso se lleva
los apostrofos que viajen dentro de un comentario —«don't»— que si no
descuadrarian el seguimiento de comillas de la segunda.
*/
function stripComments(source, { lineComments }) {
  const withoutBlocks = source.replace(BLOCK_COMMENT, '');
  if (!lineComments) {
    return withoutBlocks;
  }

  let out = '';
  let quote = null;
  for (let i = 0; i < withoutBlocks.length; i += 1) {
    const c = withoutBlocks[i];
    const next = withoutBlocks[i + 1];
    if (quote) {
      out += c;
      if (c === BACKSLASH) { out += next ?? ''; i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') {
      const end = withoutBlocks.indexOf(NEWLINE, i);
      if (end === -1) break;
      i = end - 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; out += c; continue; }
    out += c;
  }
  return out;
}

function checkGovernedSurfaceFile(file) {
  const source = readFileSync(file, 'utf8');
  const executableSource = stripComments(source, { lineComments: file.endsWith('.ts') });
  const local = normalize(relative(consumerRoot, file));
  if (local.endsWith('.spec.ts')) return;
  const isHtml = file.endsWith('.html');
  const isTs = file.endsWith('.ts');
  const nativeVisualTags = isHtml ? NATIVE_VISUAL_TAGS_HTML : NATIVE_VISUAL_TAGS_TYPESCRIPT;
  if ((isHtml || isTs) && nativeVisualTags.test(source)) {
    failures.push(`Primitiva visual nativa fuera del ADN: ${local}`);
  }
  if (!isHtml && !isTs && NATIVE_VISUAL_SELECTORS.test(source)) {
    failures.push(`Selector visual nativo desde feature: ${local}`);
  }
  if (isHtml && /\sstyle\s*=/i.test(source)) {
    failures.push(`Estilo inline prohibido: ${local}`);
  }
  if (isTs && INLINE_STYLE_IN_MARKUP.test(source)) {
    failures.push(`Estilo inline prohibido en plantilla TS: ${local}`);
  }
  if (FIXED_COLOR.test(executableSource)) failures.push(`Color fijo fuera de tokens: ${local}`);
  if (INVALID_NUMERIC_TOKEN.test(executableSource)) {
    failures.push(`Valor CSS dañado por sustitución mecánica: ${local}`);
  }
  if (INVALID_NEGATED_TOKEN.test(executableSource)) {
    failures.push(`Negación inválida de token (use calc(-1 * var(...))): ${local}`);
  }
}

for (const featureRoot of manifest.featureRoots || []) {
  const absoluteFeatureRoot = safeJoin(consumerRoot, featureRoot, 'featureRoot');
  if (!absoluteFeatureRoot) continue;
  if (!existsSync(absoluteFeatureRoot)) continue;
  for (const localFile of filesBelow(absoluteFeatureRoot, ['.html', '.scss', '.css', '.ts'])) {
    checkGovernedSurfaceFile(join(absoluteFeatureRoot, localFile));
  }
}

const shellRoot =
  typeof manifest.shellRoot === 'string' ? normalize(manifest.shellRoot).trim() : '';
if (!shellRoot) {
  failures.push(
    'shellRoot es obligatorio: el shell de la aplicación es superficie gobernada (política 1.2.3).',
  );
} else {
  const absoluteShellRoot = safeJoin(consumerRoot, shellRoot, 'shellRoot');
  if (
    absoluteShellRoot &&
    requireFile(absoluteShellRoot, `Raíz del shell ausente: ${shellRoot}`)
  ) {
    for (const entry of readdirSync(absoluteShellRoot, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) {
        failures.push(`El shell gobernado no admite enlaces simbólicos: ${entry.name}.`);
        continue;
      }
      if (entry.isDirectory()) continue;
      if (!['.html', '.scss', '.css', '.ts'].some((extension) => entry.name.endsWith(extension))) {
        continue;
      }
      checkGovernedSurfaceFile(join(absoluteShellRoot, entry.name));
    }
  }
}

const tokens = manifest.tokens;
if (tokens) {
  if (tokens.atomic) {
    const protectedToken = safeRelative(atomicRoot, tokens.atomic, 'tokens.atomic');
    if (protectedToken) {
      atomicProtectedFiles.add(protectedToken);
      atomicProtectedPathspecs.add(protectedToken);
    }
  }
  const atomicTokensPath = safeJoin(atomicRoot, tokens.atomic || '', 'tokens.atomic');
  const consumerTokensPath = safeJoin(consumerRoot, tokens.consumer || '', 'tokens.consumer');
  if (
    atomicTokensPath &&
    consumerTokensPath &&
    requireFile(atomicTokensPath, `Archivo de tokens Atomic ausente: ${tokens.atomic}`) &&
    requireFile(consumerTokensPath, `Archivo de tokens consumidor ausente: ${tokens.consumer}`)
  ) {
    const atomicTokens = readFileSync(atomicTokensPath, 'utf8');
    const consumerTokens = readFileSync(consumerTokensPath, 'utf8');
    for (const token of tokens.required || []) {
      if (!atomicTokens.includes(token)) failures.push(`Token ausente en Atomic: ${token}`);
      if (!consumerTokens.includes(token)) failures.push(`Token no propagado: ${token}`);
    }
  }
}

if (atomicHead && atomicHead === manifest.atomicRef) {
  const protectedFiles = [...atomicProtectedFiles].sort();
  const protectedPathspecs = [...atomicProtectedPathspecs].sort();
  const trackedOutputs = gitPathspecBatches(
    atomicRoot,
    ['ls-tree', '-r', '-z', '--full-tree', manifest.atomicRef],
    protectedFiles,
  );
  if (trackedOutputs !== null) {
    const tracked = new Map();
    for (const entry of trackedOutputs.flatMap((output) => output.split('\0')).filter(Boolean)) {
      const match = /^(\d{6})\s+blob\s+([0-9a-f]+)\t(.+)$/.exec(entry);
      if (match) tracked.set(normalize(match[3]), { mode: match[1], oid: match[2] });
    }
    for (const file of protectedFiles) {
      const treeEntry = tracked.get(file);
      if (!treeEntry || !['100644', '100755'].includes(treeEntry.mode)) {
        failures.push(`La ruta Atomic gobernada no es un archivo regular en atomicRef: ${file}.`);
        continue;
      }
      try {
        const physicalOid = canonicalFileObjectId(atomicRoot, file);
        if (physicalOid !== treeEntry.oid) {
          failures.push(
            `Los bytes físicos Atomic no coinciden con atomicRef para ${file}: ` +
              `${physicalOid} != ${treeEntry.oid}.`,
          );
        }
      } catch (error) {
        failures.push(`No se pudo comparar ${file} con atomicRef: ${error.message}`);
      }
    }
  }

  const dirtyOutputs = gitPathspecBatches(
    atomicRoot,
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    protectedPathspecs,
  );
  const dirtyEntries = (dirtyOutputs || []).flatMap((output) => output.split('\0').filter(Boolean));
  if (dirtyEntries.length > 0) {
    failures.push(
      'La fuente Atomic contiene cambios sin confirmar en rutas gobernadas por atomicRef: ' +
        dirtyEntries.join(', '),
    );
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(
  `Ley Atomic verificada: política ${POLICY_VERSION}, ${components.length} componentes ` +
    `y ${governedServices.length} servicios con procedencia y cero violaciones detectadas por el gate.`,
);
