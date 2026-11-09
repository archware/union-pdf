const fs = require('node:fs');
const path = require('node:path');

const normalize = (value) => value.replaceAll('\\', '/');

function fail(message) {
  throw new Error(message);
}

function lstatIfPresent(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function relativePath(root, candidate, label, options = {}) {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    fail(`${label} debe ser una ruta relativa no vacía.`);
  }
  const normalized = normalize(candidate.trim());
  if (
    candidate !== candidate.trim() ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized) ||
    normalized.includes('*') ||
    normalized.includes('?') ||
    normalized.includes('[') ||
    normalized.includes(']') ||
    normalized.startsWith(':') ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.split('/').includes('..')
  ) {
    fail(`${label} debe permanecer dentro de su repositorio: ${candidate}.`);
  }
  if (!options.allowDot && (normalized === '.' || normalized === './')) {
    fail(`${label} no puede apuntar a la raíz completa del repositorio.`);
  }
  return normalized.replace(/^\.\//, '').replace(/\/$/, '') || '.';
}

function lexicalInside(root, relativeValue, label, options = {}) {
  const relative = relativePath(root, relativeValue, label, options);
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, relative);
  if (absolute !== absoluteRoot && !absolute.startsWith(`${absoluteRoot}${path.sep}`)) {
    fail(`${label} sale de su repositorio: ${relativeValue}.`);
  }
  return { absolute, relative };
}

function existingAncestor(target) {
  let current = target;
  while (!lstatIfPresent(current)) {
    const parent = path.dirname(current);
    if (parent === current) fail(`No existe un ancestro verificable para ${target}.`);
    current = parent;
  }
  return current;
}

function assertNoSymlinkAncestors(root, target, label, includeFinal = true) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`${label} sale de su repositorio: ${target}.`);
  }
  const segments = relative ? relative.split(path.sep) : [];
  let current = absoluteRoot;
  const limit = includeFinal ? segments.length : Math.max(segments.length - 1, 0);
  for (let index = 0; index < limit; index += 1) {
    current = path.join(current, segments[index]);
    const stat = lstatIfPresent(current);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      fail(`${label} atraviesa un enlace simbólico: ${current}.`);
    }
  }
}

function confinedPath(root, relativeValue, label, options = {}) {
  const { absolute, relative } = lexicalInside(root, relativeValue, label, options);
  assertNoSymlinkAncestors(root, absolute, label, options.includeFinal !== false);
  const ancestor = existingAncestor(absolute);
  const realRoot = fs.realpathSync.native(path.resolve(root));
  const realAncestor = fs.realpathSync.native(ancestor);
  if (realAncestor !== realRoot && !realAncestor.startsWith(`${realRoot}${path.sep}`)) {
    fail(`${label} resuelve fuera de su repositorio: ${relativeValue}.`);
  }
  return { absolute, relative };
}

module.exports = {
  assertNoSymlinkAncestors,
  confinedPath,
  lexicalInside,
  relativePath,
};
