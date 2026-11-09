const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  CONTENT_CANONICALIZATION,
  canonicalFileBytes,
  expectedObjectIdLength,
  repositoryIdentity,
} = require('./git-clean-eol.cjs');
const { confinedPath, relativePath } = require('./safe-paths.cjs');

const normalize = (value) => value.replaceAll('\\', '/');
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const comparePaths = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function fail(message) {
  throw new Error(message);
}

function runGit(repositoryRoot, args) {
  const commandArgs = ['--literal-pathspecs', ...args];
  const result = spawnSync('git', commandArgs, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' },
  });
  if (result.error || result.status !== 0) {
    fail(
      `No se pudo ejecutar git ${args[0]} para ${repositoryRoot}: ${
        result.error?.message || result.stderr || result.stdout
      }`,
    );
  }
  return result.stdout;
}

function exactRepositoryRoot(repositoryRoot) {
  const absoluteRoot = fs.realpathSync.native(path.resolve(repositoryRoot));
  const identity = repositoryIdentity(absoluteRoot);
  if (identity.topLevel !== absoluteRoot) {
    fail(
      `La raíz del manifiesto debe coincidir exactamente con el nivel superior Git: ${absoluteRoot}.`,
    );
  }
  return { ...identity, topLevel: absoluteRoot };
}

function statSignature(stat) {
  return [
    stat.dev,
    stat.ino,
    stat.mode,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs,
  ].map(String).join(':');
}

function lstatRegular(absolute, label) {
  let stat;
  try {
    stat = fs.lstatSync(absolute, { bigint: true });
  } catch (error) {
    if (error.code === 'ENOENT') fail(`${label} no existe: ${absolute}.`);
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(`${label} debe ser un archivo regular y no un enlace: ${absolute}.`);
  }
  return stat;
}

/**
 * Lee una ruta confinada mediante descriptor y verifica que ni su identidad ni
 * su contenido hayan cambiado entre lstat/open/read. En POSIX se añade
 * O_NOFOLLOW; en Windows se conserva la comprobación por identidad de archivo.
 */
function readStablePhysicalFile(repositoryRoot, relativeValue, label) {
  const confined = confinedPath(repositoryRoot, relativeValue, label);
  const before = lstatRegular(confined.absolute, label);
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  let descriptor;
  try {
    descriptor = fs.openSync(confined.absolute, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || statSignature(opened) !== statSignature(before)) {
      fail(`${label} cambió entre su validación y apertura: ${confined.relative}.`);
    }
    const content = fs.readFileSync(descriptor);
    const afterRead = fs.fstatSync(descriptor, { bigint: true });
    if (statSignature(afterRead) !== statSignature(opened) || BigInt(content.byteLength) !== opened.size) {
      fail(`${label} cambió durante su lectura: ${confined.relative}.`);
    }
    const finalPath = confinedPath(repositoryRoot, confined.relative, label).absolute;
    const finalStat = lstatRegular(finalPath, label);
    if (finalPath !== confined.absolute || statSignature(finalStat) !== statSignature(opened)) {
      fail(`${label} fue sustituido durante su lectura: ${confined.relative}.`);
    }
    return content;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function readConfinedFile(repositoryRoot, relativeValue, label) {
  const rootIdentity = exactRepositoryRoot(repositoryRoot);
  const confined = confinedPath(rootIdentity.topLevel, relativeValue, label);
  assertNoGitSymlink(rootIdentity, confined.relative, label);
  return readStablePhysicalFile(rootIdentity.topLevel, confined.relative, label);
}

function readConfinedJson(repositoryRoot, relativeValue, label) {
  const content = readConfinedFile(repositoryRoot, relativeValue, label);
  try {
    return JSON.parse(content.toString('utf8'));
  } catch (error) {
    fail(`${label} no contiene JSON válido: ${error.message}`);
  }
}

function parseIndexEntries(output, identity, label) {
  return output
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const match = /^(\d{6}) ([0-9a-f]+) ([0-3])\t([\s\S]+)$/i.exec(record);
      if (!match) fail(`Git devolvió una entrada de índice inválida para ${label}: ${record}.`);
      const [, mode, oid, stage, local] = match;
      if (oid.length !== expectedObjectIdLength(identity.objectFormat)) {
        fail(`Git devolvió un OID de índice inválido para ${local}: ${oid}.`);
      }
      return { mode, oid: oid.toLowerCase(), stage, path: normalize(local) };
    });
}

function parseTreeEntries(output, identity, label) {
  return output
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const match = /^(\d{6}) ([a-z]+) ([0-9a-f]+)\t([\s\S]+)$/i.exec(record);
      if (!match) fail(`Git devolvió una entrada de árbol inválida para ${label}: ${record}.`);
      const [, mode, type, oid, local] = match;
      if (oid.length !== expectedObjectIdLength(identity.objectFormat)) {
        fail(`Git devolvió un OID de árbol inválido para ${local}: ${oid}.`);
      }
      return { mode, type, oid: oid.toLowerCase(), path: normalize(local) };
    });
}

function gitEntriesBelow(identity, relativeRoot) {
  const index = parseIndexEntries(
    runGit(identity.topLevel, ['ls-files', '--stage', '-z', '--', relativeRoot]),
    identity,
    relativeRoot,
  );
  const tree = parseTreeEntries(
    runGit(identity.topLevel, ['ls-tree', '-r', '-z', 'HEAD', '--', relativeRoot]),
    identity,
    relativeRoot,
  );
  for (const entry of [...index, ...tree]) {
    if (entry.path !== relativeRoot && !entry.path.startsWith(`${relativeRoot}/`)) {
      fail(`Git devolvió una ruta fuera del pathspec literal ${relativeRoot}: ${entry.path}.`);
    }
  }
  return { index, tree };
}

function rejectNonRegularGitModes(entries, label) {
  for (const entry of [...entries.index, ...entries.tree]) {
    if (entry.mode === '120000') {
      fail(`${label} no admite enlaces Git modo 120000: ${entry.path}.`);
    }
    if (!['100644', '100755'].includes(entry.mode)) {
      fail(`${label} no admite el modo Git ${entry.mode}: ${entry.path}.`);
    }
    if ('stage' in entry && entry.stage !== '0') {
      fail(`${label} contiene un conflicto Git sin resolver: ${entry.path}.`);
    }
    if ('type' in entry && entry.type !== 'blob') {
      fail(`${label} no admite objetos Git tipo ${entry.type}: ${entry.path}.`);
    }
  }
}

function gitModeSnapshot(identity, relativeRoots) {
  const snapshots = relativeRoots.map((relativeRoot) => {
    const entries = gitEntriesBelow(identity, relativeRoot);
    rejectNonRegularGitModes(entries, `La raíz inventariada ${relativeRoot}`);
    return { relativeRoot, entries };
  });
  return stableJson(snapshots);
}

function assertNoGitSymlink(identity, relativeValue, label) {
  const relative = relativePath(identity.topLevel, relativeValue, label);
  const entries = gitEntriesBelow(identity, relative);
  const exact = {
    index: entries.index.filter((entry) => entry.path === relative),
    tree: entries.tree.filter((entry) => entry.path === relative),
  };
  rejectNonRegularGitModes(exact, label);
}

function directorySignature(absolute, label) {
  const stat = fs.lstatSync(absolute, { bigint: true });
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fail(`${label} debe ser un directorio regular y no un enlace: ${absolute}.`);
  }
  return statSignature(stat);
}

function filesBelow(repositoryRoot, relativeRoot) {
  const root = confinedPath(repositoryRoot, relativeRoot, 'raíz de inventario');

  function visit(relativeDirectory) {
    const directory = confinedPath(repositoryRoot, relativeDirectory, 'directorio inventariado');
    const before = directorySignature(directory.absolute, 'El directorio inventariado');
    const entries = fs
      .readdirSync(directory.absolute, { withFileTypes: true })
      .sort((left, right) => comparePaths(left.name, right.name));
    const files = [];
    for (const entry of entries) {
      const local = normalize(path.posix.join(normalize(relativeDirectory), entry.name));
      const current = confinedPath(repositoryRoot, local, 'ruta inventariada').absolute;
      const stat = fs.lstatSync(current, { bigint: true });
      if (entry.isSymbolicLink() || stat.isSymbolicLink()) {
        fail(`La raíz inventariada no admite enlaces simbólicos: ${local}.`);
      }
      if (entry.isDirectory() !== stat.isDirectory() || entry.isFile() !== stat.isFile()) {
        fail(`La ruta inventariada cambió durante el recorrido: ${local}.`);
      }
      if (stat.isDirectory()) {
        files.push(...visit(local));
      } else if (stat.isFile()) {
        files.push({ path: local, signature: statSignature(stat) });
      } else {
        fail(`La raíz inventariada solo admite archivos y directorios regulares: ${local}.`);
      }
    }
    const after = directorySignature(directory.absolute, 'El directorio inventariado');
    if (before !== after) {
      fail(`El directorio inventariado cambió durante el recorrido: ${relativeDirectory}.`);
    }
    return files;
  }

  directorySignature(root.absolute, 'La raíz inventariada');
  return visit(root.relative);
}

function validateInventoryContract(repositoryRoot, contract) {
  if (contract.sourceInventory?.algorithm !== 'sha256') {
    fail('El contrato debe declarar sourceInventory.algorithm=sha256.');
  }
  if (!Array.isArray(contract.sourceInventory?.roots) || contract.sourceInventory.roots.length === 0) {
    fail('El contrato debe declarar sourceInventory.roots.');
  }
  return contract.sourceInventory.roots.map((sourceRoot, index) => {
    if (!sourceRoot || typeof sourceRoot !== 'object' || Array.isArray(sourceRoot)) {
      fail(`sourceInventory.roots[${index}] debe ser un objeto.`);
    }
    if (typeof sourceRoot.path === 'string' && normalize(sourceRoot.path).includes(':')) {
      fail(`sourceInventory.roots[${index}].path debe permanecer dentro de su repositorio.`);
    }
    const root = relativePath(
      repositoryRoot,
      sourceRoot.path || '',
      `sourceInventory.roots[${index}].path`,
    );
    const extensions = sourceRoot.extensions;
    const excludeSuffixes = sourceRoot.excludeSuffixes;
    if (
      !Array.isArray(extensions) ||
      extensions.length === 0 ||
      extensions.some((extension) => typeof extension !== 'string' || !extension.startsWith('.'))
    ) {
      fail(`sourceInventory.roots[${index}].extensions debe declarar extensiones no vacías.`);
    }
    if (
      !Array.isArray(excludeSuffixes) ||
      excludeSuffixes.some((suffix) => typeof suffix !== 'string' || !suffix)
    ) {
      fail(`sourceInventory.roots[${index}].excludeSuffixes debe ser una lista de sufijos.`);
    }
    return { root, extensions: [...extensions], excludeSuffixes: [...excludeSuffixes] };
  });
}

function applicableAttributePaths(repositoryRoot, inventoryRoots, physicalFiles, identity) {
  const candidates = new Set(['.gitattributes']);
  for (const inventoryRoot of inventoryRoots) {
    const segments = inventoryRoot.root.split('/');
    for (let index = 1; index <= segments.length; index += 1) {
      candidates.add(`${segments.slice(0, index).join('/')}/.gitattributes`);
    }
  }
  for (const file of physicalFiles) {
    if (path.posix.basename(file.path) === '.gitattributes') candidates.add(file.path);
  }
  for (const inventoryRoot of inventoryRoots) {
    for (const entry of gitEntriesBelow(identity, inventoryRoot.root).index) {
      if (path.posix.basename(entry.path) === '.gitattributes') candidates.add(entry.path);
    }
  }
  return [...candidates]
    .filter((local) => fs.existsSync(confinedPath(repositoryRoot, local, 'archivo .gitattributes').absolute))
    .sort(comparePaths);
}

function infoAttributesSnapshot(identity) {
  const gitPath = runGit(identity.topLevel, ['rev-parse', '--git-path', 'info/attributes']).trim();
  const absolute = path.isAbsolute(gitPath) ? gitPath : path.resolve(identity.topLevel, gitPath);
  if (!fs.existsSync(absolute)) return 'absent';
  const stat = fs.lstatSync(absolute, { bigint: true });
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail('.git/info/attributes debe estar ausente o ser un archivo regular vacío.');
  }
  const content = fs.readFileSync(absolute);
  if (content.toString('utf8').trim()) {
    fail(`El repositorio ${identity.topLevel} declara atributos no versionados en .git/info/attributes.`);
  }
  return `${statSignature(stat)}:${sha256(content)}`;
}

function attributeSnapshot(repositoryRoot, attributePaths, identity) {
  const snapshots = [];
  for (const local of attributePaths) {
    const entries = gitEntriesBelow(identity, local).index.filter((entry) => entry.path === local);
    rejectNonRegularGitModes({ index: entries, tree: [] }, `El archivo de atributos ${local}`);
    if (entries.length !== 1 || entries[0].stage !== '0') {
      fail(`El archivo de atributos ${local} debe estar versionado y sin conflictos.`);
    }
    const diff = spawnSync(
      'git',
      [
        '-c',
        `core.attributesFile=${os.devNull}`,
        '-c',
        'core.autocrlf=false',
        '--literal-pathspecs',
        'diff',
        '--quiet',
        '--',
        local,
      ],
      {
        cwd: identity.topLevel,
        encoding: 'utf8',
        env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' },
      },
    );
    if (diff.error || ![0, 1].includes(diff.status)) {
      fail(`No se pudo comprobar el archivo de atributos ${local}: ${diff.error?.message || diff.stderr}.`);
    }
    if (diff.status === 1) {
      fail(`El archivo de atributos ${local} contiene cambios no preparados que alteran la identidad.`);
    }
    const content = readConfinedFile(repositoryRoot, local, `archivo de atributos ${local}`);
    snapshots.push({ path: local, bytes: content.byteLength, sha256: sha256(content) });
  }
  return stableJson({ info: infoAttributesSnapshot(identity), files: snapshots });
}

function prepareInventory(repositoryRoot, contract) {
  const identity = exactRepositoryRoot(repositoryRoot);
  const inventoryRoots = validateInventoryContract(identity.topLevel, contract);
  const relativeRoots = inventoryRoots.map((entry) => entry.root);
  const modes = gitModeSnapshot(identity, relativeRoots);
  const physicalFiles = inventoryRoots.flatMap((entry) => filesBelow(identity.topLevel, entry.root));
  const attributes = applicableAttributePaths(
    identity.topLevel,
    inventoryRoots,
    physicalFiles,
    identity,
  );
  const attributeState = attributeSnapshot(identity.topLevel, attributes, identity);
  return { attributeState, attributes, identity, inventoryRoots, modes, physicalFiles };
}

function selectedInventoryFiles(prepared) {
  const selected = [];
  for (const sourceRoot of prepared.inventoryRoots) {
    for (const file of prepared.physicalFiles) {
      if (file.path !== sourceRoot.root && !file.path.startsWith(`${sourceRoot.root}/`)) continue;
      if (!sourceRoot.extensions.some((extension) => file.path.endsWith(extension))) continue;
      if (sourceRoot.excludeSuffixes.some((suffix) => file.path.endsWith(suffix))) continue;
      selected.push(file.path);
    }
  }
  return [...new Set(selected)].sort(comparePaths);
}

function finalizeInventory(prepared, contract) {
  const finalModes = gitModeSnapshot(
    prepared.identity,
    prepared.inventoryRoots.map((entry) => entry.root),
  );
  if (finalModes !== prepared.modes) {
    fail('El índice o árbol Git cambió durante el cálculo del manifiesto.');
  }
  const finalPhysical = prepared.inventoryRoots.flatMap((entry) =>
    filesBelow(prepared.identity.topLevel, entry.root),
  );
  if (stableJson(finalPhysical) !== stableJson(prepared.physicalFiles)) {
    fail('El inventario físico cambió durante el cálculo del manifiesto.');
  }
  const finalAttributes = applicableAttributePaths(
    prepared.identity.topLevel,
    prepared.inventoryRoots,
    finalPhysical,
    prepared.identity,
  );
  if (stableJson(finalAttributes) !== stableJson(prepared.attributes)) {
    fail('Las fuentes de atributos Git cambiaron durante el cálculo del manifiesto.');
  }
  const finalAttributeState = attributeSnapshot(
    prepared.identity.topLevel,
    finalAttributes,
    prepared.identity,
  );
  if (finalAttributeState !== prepared.attributeState) {
    fail('Los atributos Git cambiaron durante el cálculo del manifiesto.');
  }
  validateInventoryContract(prepared.identity.topLevel, contract);
}

function inventoryFiles(repositoryRoot, contract) {
  const prepared = prepareInventory(repositoryRoot, contract);
  const files = selectedInventoryFiles(prepared);
  finalizeInventory(prepared, contract);
  return files;
}

function canonicalInventoryBytes(repositoryRoot, local) {
  const before = readStablePhysicalFile(repositoryRoot, local, `fuente inventariada ${local}`);
  const canonical = canonicalFileBytes(repositoryRoot, local);
  const after = readStablePhysicalFile(repositoryRoot, local, `fuente inventariada ${local}`);
  if (!before.equals(after)) {
    fail(`La fuente inventariada cambió durante su canonización: ${local}.`);
  }
  return canonical;
}

function expectedSourceManifest(repositoryRoot, contract, packageJson) {
  if (
    stableJson(contract.sourceInventory?.contentCanonicalization) !==
    stableJson(CONTENT_CANONICALIZATION)
  ) {
    fail('El contrato de distribución no declara git-clean-eol-v1 vigente.');
  }
  if (typeof packageJson?.version !== 'string' || !packageJson.version.trim()) {
    fail('package.json debe declarar una versión no vacía.');
  }
  const prepared = prepareInventory(repositoryRoot, contract);
  const files = selectedInventoryFiles(prepared).map((local) => {
    const content = canonicalInventoryBytes(prepared.identity.topLevel, local);
    return { path: local, bytes: content.byteLength, sha256: sha256(content) };
  });
  finalizeInventory(prepared, contract);
  const sourceTreeSha256 = sha256(
    files.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join(''),
  );
  return {
    schemaVersion: 1,
    packageName: contract.targetPackage,
    packageVersion: packageJson.version,
    distributionStatus: contract.status,
    algorithm: contract.sourceInventory.algorithm,
    contentCanonicalization: contract.sourceInventory.contentCanonicalization,
    sourceTreeSha256,
    fileCount: files.length,
    files,
  };
}

function loadSourceInputs(repositoryRoot) {
  const packageBytes = readConfinedFile(repositoryRoot, 'package.json', 'package.json Atomic');
  const contractBytes = readConfinedFile(
    repositoryRoot,
    'distribution/package-contract.json',
    'contrato de distribución Atomic',
  );
  let packageJson;
  let contract;
  try {
    packageJson = JSON.parse(packageBytes.toString('utf8'));
    contract = JSON.parse(contractBytes.toString('utf8'));
  } catch (error) {
    fail(`Los metadatos Atomic no contienen JSON válido: ${error.message}`);
  }
  return { contract, contractBytes, packageBytes, packageJson };
}

function verifySourceManifest(repositoryRoot) {
  const inputs = loadSourceInputs(repositoryRoot);
  const manifestBytes = readConfinedFile(
    repositoryRoot,
    'distribution/atomic-source-manifest.json',
    'manifiesto de fuentes Atomic',
  );
  let actual;
  try {
    actual = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    fail(`El manifiesto Atomic no contiene JSON válido: ${error.message}`);
  }
  const expected = expectedSourceManifest(repositoryRoot, inputs.contract, inputs.packageJson);
  const finalInputs = loadSourceInputs(repositoryRoot);
  if (
    !inputs.packageBytes.equals(finalInputs.packageBytes) ||
    !inputs.contractBytes.equals(finalInputs.contractBytes)
  ) {
    fail('Los metadatos Atomic cambiaron durante la verificación del manifiesto.');
  }
  const finalManifestBytes = readConfinedFile(
    repositoryRoot,
    'distribution/atomic-source-manifest.json',
    'manifiesto de fuentes Atomic',
  );
  if (!manifestBytes.equals(finalManifestBytes)) {
    fail('El manifiesto Atomic cambió durante su verificación.');
  }
  if (stableJson(actual) !== stableJson(expected)) {
    fail(
      'El manifiesto Atomic no coincide con el inventario canónico real ' +
        '(rutas, bytes, SHA-256 o huella agregada).',
    );
  }
  return { contract: inputs.contract, expected, packageJson: inputs.packageJson };
}

module.exports = {
  expectedSourceManifest,
  inventoryFiles,
  loadSourceInputs,
  readConfinedFile,
  readConfinedJson,
  stableJson,
  verifySourceManifest,
};
