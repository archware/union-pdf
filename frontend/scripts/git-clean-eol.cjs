const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCHEME = 'git-clean-eol-v1';
const CONTENT_CANONICALIZATION = Object.freeze({
  scheme: SCHEME,
  textLineEnding: 'lf',
  binary: 'identity',
  unsupportedCleanTransform: 'reject',
});
const UNSUPPORTED_CLEAN_ATTRIBUTES = new Set([
  'filter',
  'ident',
  'working-tree-encoding',
]);

const normalize = (value) => value.replaceAll('\\', '/');
const repositoryIdentityCache = new Map();

function fail(message) {
  throw new Error(message);
}

function runGit(repositoryRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
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

function runCanonicalGit(repositoryRoot, args, attributesFile = os.devNull) {
  const result = spawnSync(
    'git',
    ['-c', `core.attributesFile=${attributesFile}`, '-c', 'core.autocrlf=false', ...args],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' },
    },
  );
  if (result.error || result.status !== 0) {
    fail(
      `No se pudo obtener la representación Git canónica para ${repositoryRoot}: ${
        result.error?.message || result.stderr || result.stdout
      }`,
    );
  }
  return result.stdout;
}

function rejectUnversionedAttributeSources(topLevel) {
  const gitDirectory = runGit(topLevel, ['rev-parse', '--git-dir']).trim();
  const absoluteGitDirectory = path.resolve(topLevel, gitDirectory);
  const infoAttributes = path.join(absoluteGitDirectory, 'info', 'attributes');
  if (fs.existsSync(infoAttributes) && fs.readFileSync(infoAttributes, 'utf8').trim()) {
    fail(`El repositorio ${topLevel} declara atributos no versionados en .git/info/attributes.`);
  }
}

function repositoryIdentity(repositoryRoot) {
  const cacheKey = fs.realpathSync.native(repositoryRoot);
  if (repositoryIdentityCache.has(cacheKey)) return repositoryIdentityCache.get(cacheKey);
  const topLevel = fs.realpathSync.native(
    path.resolve(runGit(repositoryRoot, ['rev-parse', '--show-toplevel']).trim()),
  );
  const objectFormat = runGit(topLevel, ['rev-parse', '--show-object-format']).trim();
  if (!['sha1', 'sha256'].includes(objectFormat)) {
    fail(`Formato de objetos Git no admitido en ${topLevel}: ${objectFormat || '(vacío)'}.`);
  }
  const identity = { topLevel, objectFormat };
  repositoryIdentityCache.set(cacheKey, identity);
  return identity;
}

function expectedObjectIdLength(objectFormat) {
  return objectFormat === 'sha1' ? 40 : 64;
}

function gitBlobOid(content, algorithm) {
  return createHash(algorithm)
    .update(`blob ${content.byteLength}\0`)
    .update(content)
    .digest('hex');
}

function normalizeCrlfToLf(content) {
  if (!content.includes(13)) return content;

  const normalized = Buffer.allocUnsafe(content.byteLength);
  let readOffset = 0;
  let writeOffset = 0;
  while (readOffset < content.byteLength) {
    if (
      content[readOffset] === 13 &&
      readOffset + 1 < content.byteLength &&
      content[readOffset + 1] === 10
    ) {
      normalized[writeOffset] = 10;
      writeOffset += 1;
      readOffset += 2;
      continue;
    }
    normalized[writeOffset] = content[readOffset];
    writeOffset += 1;
    readOffset += 1;
  }
  return normalized.subarray(0, writeOffset);
}

function attributesFor(topLevel, local, attributesFile) {
  const output = runCanonicalGit(topLevel, [
    '--literal-pathspecs',
    'check-attr',
    '-z',
    '--all',
    '--',
    local,
  ], attributesFile);
  const fields = output.split('\0');
  const attributes = new Map();
  for (let index = 0; index + 2 < fields.length; index += 3) {
    if (!fields[index] || !fields[index + 1]) continue;
    attributes.set(fields[index + 1], fields[index + 2]);
  }
  return attributes;
}

function rejectUnsupportedCleanAttributes(topLevel, local, attributesFile) {
  const attributes = attributesFor(topLevel, local, attributesFile);
  for (const attribute of UNSUPPORTED_CLEAN_ATTRIBUTES) {
    const value = attributes.get(attribute);
    if (value === undefined || value === 'unset' || value === 'unspecified') continue;
    fail(
      `${local} declara el atributo Git clean no admitido ${attribute}=${value} bajo ${SCHEME}. ` +
      'Solo se permite la normalización CRLF a LF; filtros y conversiones de codificación se rechazan.',
    );
  }
  const text = attributes.get('text');
  const eol = attributes.get('eol');
  const binary = text === 'unset';
  const canonicalText = ['auto', 'set'].includes(text) && eol === 'crlf';
  if (!binary && !canonicalText) {
    fail(
      `${local} debe declarar texto canónico (text=auto|set, eol=crlf) o binario exacto ` +
        `(-text) bajo ${SCHEME}; se obtuvo text=${text || 'unspecified'}, ` +
        `eol=${eol || 'unspecified'}.`,
    );
  }
}

/**
 * Obtiene los bytes canónicos de un archivo según la configuración `clean`
 * del repositorio que lo contiene. El archivo debe pertenecer a un repositorio
 * Git: sin esa evidencia no es posible distinguir texto normalizable de bytes
 * binarios y la verificación se detiene de forma cerrada.
 */
function canonicalFileBytes(repositoryRoot, file, options = {}) {
  const { topLevel, objectFormat } = repositoryIdentity(repositoryRoot);
  rejectUnversionedAttributeSources(topLevel);
  const attributesPath = path.join(topLevel, '.gitattributes');
  if (!options.plannedAttributesFile) {
    if (!fs.existsSync(attributesPath) || fs.lstatSync(attributesPath).isSymbolicLink()) {
      fail(`El repositorio ${topLevel} debe contener .gitattributes versionado y regular.`);
    }
    const firstRule = fs
      .readFileSync(attributesPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));
    if (firstRule !== '* text=auto eol=crlf') {
      fail(`.gitattributes debe iniciar con la regla canónica "* text=auto eol=crlf".`);
    }
  }
  const lexical = path.resolve(path.isAbsolute(file) ? file : path.join(repositoryRoot, file));
  const lexicalStat = fs.lstatSync(lexical);
  if (!lexicalStat.isFile() || lexicalStat.isSymbolicLink()) {
    fail(`La ruta gobernada debe ser un archivo regular y no un enlace: ${lexical}.`);
  }
  const absolute = fs.realpathSync.native(lexical);
  const relative = path.relative(topLevel, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`La ruta gobernada debe ser un archivo dentro del repositorio Git: ${absolute}.`);
  }
  const local = normalize(relative);

  const stage = runGit(topLevel, ['--literal-pathspecs', 'ls-files', '--stage', '--', local])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (stage.some((entry) => entry.startsWith('120000 '))) {
    fail(`La ruta gobernada no puede ser un enlace Git modo 120000: ${local}.`);
  }

  rejectUnsupportedCleanAttributes(topLevel, local, options.plannedAttributesFile);
  const physical = fs.readFileSync(absolute);
  const rawOid = gitBlobOid(physical, objectFormat);
  const cleanOid = runCanonicalGit(topLevel, [
    '--literal-pathspecs',
    'hash-object',
    `--path=${local}`,
    '--',
    absolute,
  ], options.plannedAttributesFile).trim();
  if (!new RegExp(`^[0-9a-f]{${expectedObjectIdLength(objectFormat)}}$`, 'i').test(cleanOid)) {
    fail(`Git devolvió una identidad clean inválida para ${local}: ${cleanOid || '(vacía)'}.`);
  }
  if (cleanOid === rawOid) return physical;

  const canonical = normalizeCrlfToLf(physical);
  if (gitBlobOid(canonical, objectFormat) !== cleanOid) {
    fail(
      `${local} usa una transformación clean de Git no admitida por ${SCHEME}. ` +
        'El contrato solo canoniza EOL de texto y nunca acepta filtros que alteren contenido.',
    );
  }
  return canonical;
}

function canonicalFileSha256(repositoryRoot, file, options = {}) {
  return createHash('sha256')
    .update(canonicalFileBytes(repositoryRoot, file, options))
    .digest('hex');
}

function canonicalFileObjectId(repositoryRoot, file, options = {}) {
  const { objectFormat } = repositoryIdentity(repositoryRoot);
  return gitBlobOid(canonicalFileBytes(repositoryRoot, file, options), objectFormat);
}

module.exports = {
  CONTENT_CANONICALIZATION,
  SCHEME,
  canonicalFileBytes,
  canonicalFileObjectId,
  canonicalFileSha256,
  expectedObjectIdLength,
  normalizeCrlfToLf,
  repositoryIdentity,
};
